import { describe, expect, it } from 'vitest';
import { TEAMS } from '../data/teams';
import { SCHEMA_ID_TO_MATCH_NO } from '../data/knockoutSchedule';
import {
  generateRoundOf32,
  generateNextRound,
  matchWinner,
  matchLoser,
  resultsBySchemaId,
  type StandingsByGroup,
} from './knockoutGenerator';
import { computeGroupStandings, rankThirdPlaceTeams, type GroupResultMatch } from './standings';
import type { PredictionGame, Team } from '../types';

const teamById: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

// Build deterministic standings: rank 1..4 = the seeded order in teams.ts.
function standingsFromOrder(group: string, ids: string[]) {
  const teams = ids.map((id) => teamById[id]).filter((x): x is Team => !!x);
  // 6 synthetic results that produce the exact ranking 1>2>3>4.
  const results: Record<string, [number, number]> = {
    [`${ids[0]}-${ids[1]}`]: [1, 0], [`${ids[0]}-${ids[2]}`]: [1, 0], [`${ids[0]}-${ids[3]}`]: [1, 0],
    [`${ids[1]}-${ids[2]}`]: [1, 0], [`${ids[1]}-${ids[3]}`]: [1, 0], [`${ids[2]}-${ids[3]}`]: [1, 0],
  };
  const matches: GroupResultMatch[] = Object.entries(results).map(([k, [h, a]]) => {
    const [hid, aid] = k.split('-');
    return { home_team_id: hid!, away_team_id: aid!, result_home: h, result_away: a };
  });
  return computeGroupStandings(matches, teams);
}

describe('generateRoundOf32 — slot resolution', () => {
  it('places the group winner and runner-up in the correct slots', () => {
    // Give every group a clean 1>2>3>4 ordering using its first four teams.
    const byGroup: StandingsByGroup = {};
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      const ids = TEAMS.filter((t) => t.group === g).map((t) => t.id);
      byGroup[g] = standingsFromOrder(g, ids);
    }
    const thirds = rankThirdPlaceTeams(byGroup);
    const r32 = generateRoundOf32(byGroup, thirds);

    expect(r32).toHaveLength(16);

    // R32_1 = Match 73 = 2A vs 2B (schema). Verify the runner-ups land there.
    const m73 = r32.find((m) => m.schemaId === 'R32_1')!;
    const runnerUpA = byGroup.A![1]!.team.id;
    const runnerUpB = byGroup.B![1]!.team.id;
    expect([m73.home?.id, m73.away?.id].sort()).toEqual([runnerUpA, runnerUpB].sort());
  });

  it('fills all 16 matches and assigns ascending FIFA match numbers 73..88', () => {
    const byGroup: StandingsByGroup = {};
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      const ids = TEAMS.filter((t) => t.group === g).map((t) => t.id);
      byGroup[g] = standingsFromOrder(g, ids);
    }
    const r32 = generateRoundOf32(byGroup, rankThirdPlaceTeams(byGroup));
    const matchNos = r32.map((m) => m.matchNo).sort((a, b) => a - b);
    expect(matchNos).toEqual(Array.from({ length: 16 }, (_, i) => 73 + i));
    // Every game has both teams resolved.
    expect(r32.every((m) => m.home && m.away)).toBe(true);
  });
});

describe('matchWinner / matchLoser', () => {
  const base = {
    home_team_id: 'bra', away_team_id: 'arg',
    result_home: null as number | null, result_away: null as number | null,
    penalty_winner: null as 'home' | 'away' | null,
  };
  it('picks the higher score', () => {
    expect(matchWinner({ ...base, result_home: 2, result_away: 1 })).toBe('bra');
    expect(matchWinner({ ...base, result_home: 0, result_away: 3 })).toBe('arg');
  });
  it('uses penalty_winner on a draw', () => {
    expect(matchWinner({ ...base, result_home: 1, result_away: 1, penalty_winner: 'home' })).toBe('bra');
    expect(matchWinner({ ...base, result_home: 1, result_away: 1, penalty_winner: 'away' })).toBe('arg');
  });
  it('is unresolved on a draw without a recorded shootout', () => {
    expect(matchWinner({ ...base, result_home: 1, result_away: 1 })).toBeNull();
  });
  it('loser is the opposite side of the winner', () => {
    expect(matchLoser({ ...base, result_home: 2, result_away: 1 })).toBe('arg');
    expect(matchLoser({ ...base, result_home: 1, result_away: 1, penalty_winner: 'home' })).toBe('arg');
  });
});

describe('generateNextRound — bracket wiring', () => {
  // Feed synthetic winners for the previous round and assert the next round's
  // home/away are the correct feeder winners. This validates nextMatchId wiring.
  it('R16_1 (Match 89) is fed by R32_2 (winner) and R32_5 (winner)', () => {
    const prevResults: Record<string, string | null> = {};
    // Schema says R32_2 → R16_1 home, R32_5 → R16_1 away.
    prevResults.R32_2 = 'bra';
    prevResults.R32_5 = 'arg';
    const r16 = generateNextRound('R16', teamById, prevResults, {});
    const m89 = r16.find((m) => m.schemaId === 'R16_1')!;
    expect(m89.home?.id).toBe('bra');
    expect(m89.away?.id).toBe('arg');
  });

  it('QF_1 is fed by R16_1 and R16_2 winners', () => {
    const prevResults: Record<string, string | null> = { R16_1: 'fra', R16_2: 'esp' };
    const qf = generateNextRound('QF', teamById, prevResults, {});
    const m97 = qf.find((m) => m.schemaId === 'QF_1')!;
    expect(m97.home?.id).toBe('fra');
    expect(m97.away?.id).toBe('esp');
  });

  it('FINAL is fed by SF_1 and SF_2 winners', () => {
    const prevResults: Record<string, string | null> = { SF_1: 'bra', SF_2: 'ger' };
    const final = generateNextRound('FINAL', teamById, prevResults, {});
    const m = final[0]!;
    expect(m.schemaId).toBe('FINAL');
    expect(m.home?.id).toBe('bra');
    expect(m.away?.id).toBe('ger');
  });

  it('the 3rd-place play-off is fed by the two semi-final losers', () => {
    const prevResults: Record<string, string | null> = { SF_1: 'bra', SF_2: 'ger' };
    const prevLosers: Record<string, string | null> = { SF_1: 'fra', SF_2: 'esp' };
    const playoff = generateNextRound('3RD', teamById, prevResults, prevLosers);
    const m = playoff[0]!;
    expect(m.schemaId).toBe('PLAYOFF_3RD');
    // SF_1 loser → home side, SF_2 loser → away side (per nextSide wiring).
    expect([m.home?.id, m.away?.id].sort()).toEqual(['fra', 'esp'].sort());
  });
});

describe('resultsBySchemaId — external_id parsing', () => {
  it('maps a DB game with external_id wc2026-r32-74 back to schema id R32_2', () => {
    const game: PredictionGame = {
      id: 1, external_id: 'wc2026-r32-74', stage: 'r32', group_letter: null,
      home_team_id: 'bra', away_team_id: 'arg', home_team_name: 'Brazil', away_team_name: 'Argentina',
      home_code: 'BRA', away_code: 'ARG', home_flag: '🇧🇷', away_flag: '🇦🇷',
      kickoff_utc: '2026-06-29 20:30:00', venue: 'X', is_open: true, started: true,
      result_home: 2, result_away: 1, penalty_winner: null,
      my_prediction: null, predictions: null,
    };
    const mapped = resultsBySchemaId([game]);
    expect(mapped.R32_2!.winner).toBe('bra');
    expect(mapped.R32_2!.loser).toBe('arg');
  });
});

describe('SCHEMA_ID_TO_MATCH_NO — coverage', () => {
  it('covers all 32 knockout schema ids', () => {
    expect(Object.keys(SCHEMA_ID_TO_MATCH_NO)).toHaveLength(32);
  });
});
