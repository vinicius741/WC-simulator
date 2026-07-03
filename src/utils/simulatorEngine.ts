import { THIRD_PLACE_ALLOCATION_TABLE } from '../data/thirdPlaceAllocations';
import { KNOCKOUT_MATCH_SCHEMA } from '../data/constants';
import { SCHEMA_ID_TO_MATCH_NO } from '../data/knockoutSchedule';
import type { KnockoutMatch, RealKnockoutResult, Team } from '../types';

interface SimulateMatchResult {
  homeScore: number;
  awayScore: number;
}

// Helper to simulate a match score using Poisson distribution (used in knockouts)
export function simulateMatch(ratingA: number, ratingB: number): SimulateMatchResult {
  const diff = ratingA - ratingB;

  // Base lambda (expected goals) modified by rating difference
  const lambdaA = Math.max(0.4, 1.35 + diff * 0.05);
  const lambdaB = Math.max(0.4, 1.35 - diff * 0.05);

  const poisson = (lambda: number): number => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  };

  return {
    homeScore: poisson(lambdaA),
    awayScore: poisson(lambdaB)
  };
}

// FIFA Annex C prescribes one exact allocation for each of the 495 possible
// combinations of eight qualifying third-place groups.
export function allocateThirdPlaces(qualifiedGroups: string[]): Record<string, string> {
  const key = [...new Set(qualifiedGroups)].sort().join('');
  const allocation = THIRD_PLACE_ALLOCATION_TABLE[key];
  return allocation ? { ...allocation } : {};
}

// Clears the winner chain of knockout matches if a dependent match changes
export function clearDownstreamMatches(matchId: string, knockoutMatchesArr: KnockoutMatch[]): KnockoutMatch[] {
  const updated = [...knockoutMatchesArr];
  const queue: string[] = [matchId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentIdx = updated.findIndex(m => m.id === currentId);
    if (currentIdx === -1) continue;
    const currentMatch = updated[currentIdx]!;
    if (!currentMatch.nextMatchId) continue;

    const nextIdx = updated.findIndex(m => m.id === currentMatch.nextMatchId);
    if (nextIdx !== -1) {
      const side = currentMatch.nextSide as 'home' | 'away';

      updated[nextIdx] = {
        ...updated[nextIdx]!,
        [side]: '',
        [`${side}Score`]: null,
        penaltyWinner: null,
        winner: ''
      };

      queue.push(currentMatch.nextMatchId);
    }
  }

  return updated;
}

// Simulate group rankings based on team ratings with some random variance (noise)
export function simulateGroupRanking(teamsInGroup: Team[]): Team[] {
  const scoredTeams = teamsInGroup.map(t => {
    // rating + random noise from -10 to +10
    const variance = (Math.random() - 0.5) * 20;
    return {
      team: t,
      score: t.rating + variance
    };
  });

  // Sort descending by simulated score
  scoredTeams.sort((a, b) => b.score - a.score);

  return scoredTeams.map(st => st.team);
}

// ─── Real-result bridge ───────────────────────────────────────────────────
//
// Fold real, decided knockout results (pulled from the predictions backend via
// the public results.php endpoint) into the simulator's bracket state. Real
// results override everything for that match (teams, score, winner) and mark it
// `locked` so the bracket renders them read-only. Downstream undecided matches
// are reseeded from the real advancing winners so the bracket reflects who's
// actually through, while the user's own winner/score picks on undecided games
// are preserved unless the team they picked is no longer in the matchup.

/** Match number → schema id (reverse of SCHEMA_ID_TO_MATCH_NO). */
const MATCH_NO_TO_SCHEMA_ID: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const [schemaId, matchNo] of Object.entries(SCHEMA_ID_TO_MATCH_NO)) {
    out[matchNo] = schemaId;
  }
  return out;
})();

/** Parse the FIFA match number from a DB external_id like "wc2026-r32-74". */
function matchNoFromExternalId(externalId: string): number | null {
  const m = externalId.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}

/** Winner side of a result, accounting for penalty shootouts on a draw. */
function winnerSideForResult(r: RealKnockoutResult): 'home' | 'away' | null {
  if (r.result_home === null || r.result_away === null) return null;
  if (r.result_home > r.result_away) return 'home';
  if (r.result_home < r.result_away) return 'away';
  return r.penalty_winner; // draw → shootout winner decides
}

/** Loser side (for the 3rd-place play-off, fed by SF losers). */
function loserSideForResult(r: RealKnockoutResult): 'home' | 'away' | null {
  const w = winnerSideForResult(r);
  if (!w) return null;
  return w === 'home' ? 'away' : 'home';
}

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const;

/**
 * Apply real knockout results to the bracket. Pure and idempotent: re-applying
 * the same results yields the same state, so it's safe to run on every fetch.
 */
export function applyRealKnockoutResults(
  matches: KnockoutMatch[],
  results: RealKnockoutResult[],
): KnockoutMatch[] {
  if (results.length === 0) return matches;

  // Index real results by schema id for O(1) lookup.
  const resultBySchemaId = new Map<string, RealKnockoutResult>();
  for (const r of results) {
    const matchNo = matchNoFromExternalId(r.external_id);
    if (matchNo === null) continue;
    const schemaId = MATCH_NO_TO_SCHEMA_ID[matchNo];
    if (!schemaId) continue;
    resultBySchemaId.set(schemaId, r);
  }

  const updated = matches.map(m => ({ ...m }));
  const byId = new Map(updated.map(m => [m.id, m]));

  // Build a feeder map: for each match id, which schema matches feed its
  // home/away slots via nextMatchId/nextSide. (Mirrors generateNextRound.)
  const feeders = new Map<string, { home: string; away: string }>();
  for (const prev of KNOCKOUT_MATCH_SCHEMA) {
    if (!prev.nextMatchId || !prev.nextSide) continue;
    const slot = feeders.get(prev.nextMatchId) ?? { home: '', away: '' };
    if (prev.nextSide === 'home') slot.home = prev.id;
    else slot.away = prev.id;
    feeders.set(prev.nextMatchId, slot);
  }

  // Helper: winner team id of a match (from a real result, else the user's pick).
  const winnerTeamOf = (m: KnockoutMatch): string => {
    const r = resultBySchemaId.get(m.id);
    if (r) {
      const side = winnerSideForResult(r);
      if (side === 'home') return r.home_team_id ?? '';
      if (side === 'away') return r.away_team_id ?? '';
    }
    return m.winner;
  };

  // Helper: loser team id of a match (only meaningful for SF → 3rd-place).
  const loserTeamOf = (m: KnockoutMatch): string => {
    const r = resultBySchemaId.get(m.id);
    if (r) {
      const side = loserSideForResult(r);
      if (side === 'home') return r.home_team_id ?? '';
      if (side === 'away') return r.away_team_id ?? '';
    }
    // Fall back to the user's recorded winner/teams.
    if (m.winner) return m.winner === m.home ? m.away : m.home;
    return '';
  };

  const replaceMatch = (id: string, patch: Partial<KnockoutMatch>) => {
    const idx = updated.findIndex(m => m.id === id);
    if (idx !== -1) {
      updated[idx] = { ...updated[idx]!, ...patch };
      byId.set(id, updated[idx]!);
    }
  };

  // Pass 1 — apply real results (override teams/score/winner, mark locked).
  for (const m of updated) {
    const r = resultBySchemaId.get(m.id);
    if (!r) continue;
    const home = r.home_team_id ?? '';
    const away = r.away_team_id ?? '';
    const side = winnerSideForResult(r);
    const winner = side === 'home' ? home : side === 'away' ? away : '';
    const patch: Partial<KnockoutMatch> = {
      home,
      away,
      homeScore: r.result_home,
      awayScore: r.result_away,
      penaltyWinner: r.penalty_winner,
      winner,
      locked: true,
    };
    const idx = updated.findIndex(x => x.id === m.id);
    updated[idx!] = { ...updated[idx!]!, ...patch };
    byId.set(m.id, updated[idx!]!);
  }

  // Pass 2 — reseed downstream undecided matches stage by stage, in bracket
  // order, so each pass sees the previous round's settled winners. Real results
  // (locked matches) are left untouched here; they already carry their teams.
  for (const stage of STAGE_ORDER) {
    for (const m of updated) {
      if (m.stage !== stage) continue;
      if (m.locked) continue; // real result already applied

      let newHome = m.home;
      let newAway = m.away;

      if (m.id === 'PLAYOFF_3RD') {
        // Fed by the two semi-final losers: SF_1 loser → home, SF_2 loser → away
        // (mirrors the simulator's propagateWinner convention).
        const sf1 = byId.get('SF_1');
        const sf2 = byId.get('SF_2');
        newHome = sf1 ? loserTeamOf(sf1) : '';
        newAway = sf2 ? loserTeamOf(sf2) : '';
      } else {
        const feeds = feeders.get(m.id);
        if (feeds) {
          const homeFeeder = feeds.home ? byId.get(feeds.home) : undefined;
          const awayFeeder = feeds.away ? byId.get(feeds.away) : undefined;
          newHome = homeFeeder ? winnerTeamOf(homeFeeder) : '';
          newAway = awayFeeder ? winnerTeamOf(awayFeeder) : '';
        }
      }

      const homeChanged = newHome !== m.home;
      const awayChanged = newAway !== m.away;
      if (!homeChanged && !awayChanged) continue;

      // Preserve the user's winner pick only if that team is still in the
      // reseeded matchup; otherwise the pick is stale and must be cleared,
      // along with any score/penalty state tied to the old matchup.
      const winnerStillValid = m.winner === '' || m.winner === newHome || m.winner === newAway;
      const patch: Partial<KnockoutMatch> = { home: newHome, away: newAway };
      if (!winnerStillValid) {
        patch.winner = '';
        patch.homeScore = null;
        patch.awayScore = null;
        patch.penaltyWinner = null;
      }
      replaceMatch(m.id, patch);
    }
  }

  return updated;
}
