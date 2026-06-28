import { KNOCKOUT_MATCH_SCHEMA, THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';
import { scheduleForSchema, SCHEMA_ID_TO_MATCH_NO } from '../data/knockoutSchedule';
import { allocateThirdPlaces } from './simulatorEngine';
import type { PredictionGame, Team } from '../types';
import type { Standing, ThirdPlaceStanding } from './standings';

/**
 * Bridges real group results → the simulator's bracket engine → concrete
 * knockout games that can be upserted into the predictions backend.
 *
 * It reuses, verbatim, the slot-resolution logic from
 * `useTournamentEngine`'s R32-sync effect (Annex C allocation, 1E/2A/3rd slot
 * decoding) and the `nextMatchId`/`nextSide` wiring for round advancement.
 * No bracket math is reimplemented here.
 */

export type Side = 'home' | 'away';

export interface GeneratedKnockoutGame {
  /** Stable id: `wc2026-<stage>-<matchNo>` (e.g. wc2026-r32-74). */
  externalId: string;
  /** DB stage vocabulary: r32 | r16 | qf | sf | 3rd | final. */
  stage: string;
  matchNo: number;
  schemaId: string;
  label: string;
  kickoffUtc: string;
  venue: string;
  home: Team | null;
  away: Team | null;
}

/** Ranked teams per group letter, keyed by group (A..L). */
export type StandingsByGroup = Record<string, Standing[]>;

const DB_STAGE_BY_SCHEMA_STAGE: Record<string, string> = {
  R32: 'r32',
  R16: 'r16',
  QF: 'qf',
  SF: 'sf',
  '3RD': '3rd',
  FINAL: 'final',
};

function dbStageFor(schemaStage: string): string {
  return DB_STAGE_BY_SCHEMA_STAGE[schemaStage] ?? schemaStage.toLowerCase();
}

/**
 * Generate the 16 Round-of-32 games from ranked groups + the 8 qualified
 * third-place teams. Returns games whose slots are resolved; any unresolved
 * team is `null` (e.g. when a group winner can't yet be determined).
 */
export function generateRoundOf32(
  standingsByGroup: StandingsByGroup,
  qualifiedThirds: ThirdPlaceStanding[],
  completeGroups?: Set<string> | string[],
): GeneratedKnockoutGame[] {
  const completeGroupSet = completeGroups instanceof Set
    ? completeGroups
    : new Set(completeGroups ?? Object.keys(standingsByGroup));
  const allGroupsComplete = completeGroupSet.size >= 12;

  // Which 8 third-place groups qualified, sorted — the Annex C lookup key.
  const qualifiedGroups = qualifiedThirds
    .filter((t) => t.qualified)
    .map((t) => t.group)
    .sort();
  const allocation = allocateThirdPlaces(qualifiedGroups);

  // Map group letter → the 3rd-placed team id (for resolving '3rd' slots).
  const thirdByGroup: Record<string, Team> = {};
  qualifiedThirds.forEach((t) => {
    thirdByGroup[t.group] = t.team;
  });

  const rankedById = (group: string, idx: number): Team | null => {
    return standingsByGroup[group]?.[idx]?.team ?? null;
  };

  const resolveSlot = (slot: string, matchId: string, side: Side): Team | null => {
    if (!slot) return null;
    if (slot === '3rd') {
      // Annex C third-place allocation is only certain once every group's
      // third-place comparison is settled.
      if (!allGroupsComplete) return null;
      const slotDef = THIRD_PLACE_ALLOCATION_SLOTS.find(
        (s) => s.matchId === matchId && s.teamSide === side,
      );
      if (!slotDef) return null;
      const allocatedGroup = allocation[slotDef.winner];
      if (!allocatedGroup) return null;
      return thirdByGroup[allocatedGroup] ?? null;
    }
    // '1E', '2A', etc. → position (1|2) + group letter.
    const num = slot.charAt(0);
    const grp = slot.substring(1);
    if (!completeGroupSet.has(grp)) return null;
    const idx = num === '1' ? 0 : 1;
    return rankedById(grp, idx);
  };

  return KNOCKOUT_MATCH_SCHEMA.filter((m) => m.stage === 'R32').map((schema) => {
    const sched = scheduleForSchema(schema.id)!;
    return {
      externalId: `wc2026-r32-${sched.matchNo}`,
      stage: 'r32',
      matchNo: sched.matchNo,
      schemaId: schema.id,
      label: schema.label,
      kickoffUtc: sched.kickoffUtc,
      venue: sched.venue,
      home: resolveSlot(schema.home, schema.id, 'home'),
      away: resolveSlot(schema.away, schema.id, 'away'),
    };
  });
}

/**
 * Resolve a single match's winner from its recorded result. For a draw, the
 * `penalty_winner` column decides it; otherwise the higher score wins.
 */
export function matchWinner(
  game: Pick<PredictionGame, 'result_home' | 'result_away' | 'penalty_winner' | 'home_team_id' | 'away_team_id'>,
): string | null {
  if (game.result_home === null || game.result_away === null) return null;
  if (game.result_home > game.result_away) return game.home_team_id ?? null;
  if (game.result_home < game.result_away) return game.away_team_id ?? null;
  // Draw → shootout winner.
  if (game.penalty_winner === 'home') return game.home_team_id ?? null;
  if (game.penalty_winner === 'away') return game.away_team_id ?? null;
  return null; // drawn but no penalty recorded yet → unresolved
}

/** A finished game, indexed for winner lookup by simulator schema id. */
export interface ResultBySchemaId {
  schemaId: string;
  winnerTeamId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/**
 * Generate the next knockout round from the previous round's results.
 *
 * Walks each schema match in the target stage, pulls the two feeders
 * (`nextMatchId`/`nextSide` of the *previous* matches), and resolves them to
 * the winners of those previous matches. The 3rd-place play-off is fed by the
 * two semi-final losers.
 *
 * @param teamById  all 48 teams by id (for display data)
 * @param prevResults  winners keyed by the previous round's schema ids
 * @param prevLosers   semi-final losers keyed by schema id (for the 3rd-place game)
 */
export function generateNextRound(
  targetStage: 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL',
  teamById: Record<string, Team>,
  prevResults: Record<string, string | null>,
  prevLosers: Record<string, string | null>,
): GeneratedKnockoutGame[] {
  // Build a reverse map: for each match in the target stage, which previous
  // matches feed its home/away slots?
  const feeders = new Map<string, { home: string; away: string }>();
  for (const prev of KNOCKOUT_MATCH_SCHEMA) {
    if (!prev.nextMatchId || !prev.nextSide) continue;
    const target = prev.nextMatchId;
    const slot = feeders.get(target) ?? { home: '', away: '' };
    if (prev.nextSide === 'home') slot.home = prev.id;
    else slot.away = prev.id;
    feeders.set(target, slot);
  }

  return KNOCKOUT_MATCH_SCHEMA.filter((m) => m.stage === targetStage).map((schema) => {
    const sched = scheduleForSchema(schema.id)!;
    const dbStage = dbStageFor(schema.stage);
    const feeds = feeders.get(schema.id);

    let home: Team | null = null;
    let away: Team | null = null;

    if (schema.id === 'PLAYOFF_3RD') {
      // The play-off is fed by the two semi-final losers. The schema doesn't
      // wire this via nextMatchId (no match points at PLAYOFF_3RD); the
      // simulator special-cases it using each SF's nextSide convention, so we
      // mirror that: SF_1 loser → home, SF_2 loser → away.
      const sf1Loser = prevLosers.SF_1 ?? null;
      const sf2Loser = prevLosers.SF_2 ?? null;
      home = sf1Loser ? teamById[sf1Loser] ?? null : null;
      away = sf2Loser ? teamById[sf2Loser] ?? null : null;
    } else if (feeds) {
      const homeWinner = feeds.home ? prevResults[feeds.home] : null;
      const awayWinner = feeds.away ? prevResults[feeds.away] : null;
      home = homeWinner ? teamById[homeWinner] ?? null : null;
      away = awayWinner ? teamById[awayWinner] ?? null : null;
    }

    return {
      externalId: `wc2026-${dbStage}-${sched.matchNo}`,
      stage: dbStage,
      matchNo: sched.matchNo,
      schemaId: schema.id,
      label: schema.label,
      kickoffUtc: sched.kickoffUtc,
      venue: sched.venue,
      home,
      away,
    };
  });
}

/**
 * Compute the loser of a match (used to feed the 3rd-place play-off from the
 * semi-finals). Returns null until the match is decided.
 */
export function matchLoser(
  game: Pick<PredictionGame, 'result_home' | 'result_away' | 'penalty_winner' | 'home_team_id' | 'away_team_id'>,
): string | null {
  const winner = matchWinner(game);
  if (!winner) return null;
  if (winner === game.home_team_id) return game.away_team_id ?? null;
  return game.home_team_id ?? null;
}

/** Convert a list of prediction games (the DB rows) into winners keyed by their
 *  simulator schema id, by joining on FIFA match number. */
export function resultsBySchemaId(
  games: PredictionGame[],
): Record<string, { winner: string | null; loser: string | null }> {
  const out: Record<string, { winner: string | null; loser: string | null }> = {};
  for (const g of games) {
    // Match the external_id convention wc2026-<stage>-<matchNo>.
    const m = g.external_id.match(/-(\d+)$/);
    if (!m) continue;
    const matchNo = Number(m[1]);
    const schemaId = Object.keys(SCHEMA_ID_TO_MATCH_NO).find(
      (k) => SCHEMA_ID_TO_MATCH_NO[k] === matchNo,
    );
    if (!schemaId) continue;
    out[schemaId] = { winner: matchWinner(g), loser: matchLoser(g) };
  }
  return out;
}
