import { describe, expect, it } from 'vitest';
import {
  computeGroupStandings,
  isGroupStageComplete,
  rankThirdPlaceTeams,
  type GroupResultMatch,
} from './standings';
import type { Team } from '../types';

const team = (id: string, rating = 80, group = 'A'): Team => ({
  id,
  name: id.toUpperCase(),
  code: id.toUpperCase(),
  flag: '🏳️',
  group,
  rating,
});

// Helper: build the 6 round-robin matches for 4 teams, from a result map.
// `results` keys are "H-A" (team ids), values are [homeGoals, awayGoals].
function groupMatches(
  ids: [string, string, string, string],
  results: Record<string, [number, number]>,
): GroupResultMatch[] {
  const [a, b, c, d] = ids;
  const pairs: [string, string][] = [
    [a, b], [a, c], [a, d], [b, c], [b, d], [c, d],
  ];
  return pairs.map(([h, aw]) => {
    const [rh, ra] = results[`${h}-${aw}`] ?? [0, 0];
    return { home_team_id: h, away_team_id: aw, result_home: rh, result_away: ra };
  });
}

describe('computeGroupStandings — basic ordering', () => {
  it('ranks by points first', () => {
    // A beats B,C,D → 9pts; everyone else draws → 2pts each.
    const matches = groupMatches(
      ['a', 'b', 'c', 'd'],
      { 'a-b': [1, 0], 'a-c': [1, 0], 'a-d': [1, 0], 'b-c': [0, 0], 'b-d': [0, 0], 'c-d': [0, 0] },
    );
    const standings = computeGroupStandings(matches, ['a', 'b', 'c', 'd'].map((id) => team(id)));
    expect(standings[0]!.team.id).toBe('a');
    expect(standings[0]!.points).toBe(9);
  });

  it('breaks a points tie by goal difference', () => {
    // a & b both finish on 5 points, but a has better GD.
    const matches = groupMatches(
      ['a', 'b', 'c', 'd'],
      { 'a-b': [0, 0], 'a-c': [3, 0], 'a-d': [1, 1], 'b-c': [1, 0], 'b-d': [1, 1], 'c-d': [0, 0] },
    );
    const standings = computeGroupStandings(matches, ['a', 'b', 'c', 'd'].map((id) => team(id)));
    const a = standings.find((s) => s.team.id === 'a')!;
    const b = standings.find((s) => s.team.id === 'b')!;
    expect(a.points).toBe(b.points);
    expect(a.gd).toBeGreaterThan(b.gd);
    expect(standings[0]!.team.id).toBe('a');
  });

  it('breaks a GD tie by goals for', () => {
    // Two teams level on points and GD; the one that scored more ranks higher.
    const matches = groupMatches(
      ['a', 'b', 'c', 'd'],
      { 'a-b': [0, 0], 'a-c': [3, 1], 'a-d': [0, 0], 'b-c': [4, 2], 'b-d': [0, 0], 'c-d': [0, 0] },
    );
    const standings = computeGroupStandings(matches, ['a', 'b', 'c', 'd'].map((id) => team(id)));
    const a = standings.find((s) => s.team.id === 'a')!;
    const b = standings.find((s) => s.team.id === 'b')!;
    expect(a.points).toBe(b.points); // both 4
    expect(a.gd).toBe(b.gd); // both +2
    expect(b.gf).toBeGreaterThan(a.gf); // b scored 4, a scored 3
    expect(standings[0]!.team.id).toBe('b');
  });
});

describe('computeGroupStandings — head-to-head tiebreak', () => {
  it('ranks the head-to-head winner above a tied rival', () => {
    // a and b are identical on P/GD/GF, but a beat b in their direct match.
    // a: beats b 1-0, loses to c 0-1, beats d 1-0  → 6pts GF2 GA1 GD+1
    // b: loses to a 0-1, beats c 1-0, beats d 1-0   → 6pts GF2 GA1 GD+1
    // Head-to-head: a beat b, so a ranks above b.
    const matches = groupMatches(
      ['a', 'b', 'c', 'd'],
      { 'a-b': [1, 0], 'a-c': [0, 1], 'a-d': [1, 0], 'b-c': [1, 0], 'b-d': [1, 0], 'c-d': [0, 0] },
    );
    const standings = computeGroupStandings(matches, ['a', 'b', 'c', 'd'].map((id) => team(id)));
    const aIdx = standings.findIndex((s) => s.team.id === 'a');
    const bIdx = standings.findIndex((s) => s.team.id === 'b');
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('falls back to rating when everything else is level', () => {
    // a and b draw with each other AND have identical records otherwise.
    // a-b draw, a-c 1-1, a-d 1-1, b-c 1-1, b-d 1-1, c-d 0-0
    // a: 3 draws, GF2 GA2 ; b: 3 draws, GF2 GA2 ; head-to-head is a draw too.
    const matches = groupMatches(
      ['a', 'b', 'c', 'd'],
      { 'a-b': [0, 0], 'a-c': [1, 1], 'a-d': [1, 1], 'b-c': [1, 1], 'b-d': [1, 1], 'c-d': [0, 0] },
    );
    const teams = [
      team('a', 85),
      team('b', 90),
      team('c', 70),
      team('d', 70),
    ];
    const standings = computeGroupStandings(matches, teams);
    // a & b are fully level except rating; higher rating (b) ranks first.
    expect(standings[0]!.team.id).toBe('b');
    expect(standings[1]!.team.id).toBe('a');
  });
});

describe('rankThirdPlaceTeams', () => {
  it('marks exactly the top 8 of 12 third-placed teams as qualified', () => {
    const byGroup: Record<string, ReturnType<typeof computeGroupStandings>> = {};
    'ABCDEFGHIJKL'.split('').forEach((g, i) => {
      byGroup[g] = [
        { team: team(`w${g}`, 90, g), rank: 1, played: 3, points: 9, gf: 5, ga: 1, gd: 4 },
        { team: team(`r${g}`, 85, g), rank: 2, played: 3, points: 6, gf: 4, ga: 2, gd: 2 },
        // Vary the third-place points so there's a clear cutoff.
        { team: team(`t${g}`, 80 - i, g), rank: 3, played: 3, points: 4 - (i % 3), gf: 3, ga: 3, gd: 0 },
        { team: team(`l${g}`, 70, g), rank: 4, played: 3, points: 0, gf: 1, ga: 6, gd: -5 },
      ];
    });

    const thirds = rankThirdPlaceTeams(byGroup);
    expect(thirds).toHaveLength(12);
    expect(thirds.filter((t) => t.qualified)).toHaveLength(8);
    // Qualification is monotonic by the ranking.
    const pts = thirds.map((t) => t.qualified);
    expect(pts).toEqual([...Array(8).fill(true), ...Array(4).fill(false)]);
  });
});

describe('isGroupStageComplete', () => {
  it('is false when any group has fewer than 6 results', () => {
    const five: GroupResultMatch[] = Array.from({ length: 5 }, () => ({
      home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0,
    }));
    expect(isGroupStageComplete({ A: five })).toBe(false);
  });

  it('is true when every group has 6 results', () => {
    const six: GroupResultMatch[] = Array.from({ length: 6 }, () => ({
      home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0,
    }));
    const all: Record<string, GroupResultMatch[]> = {};
    'ABCDEFGHIJKL'.split('').forEach((g) => { all[g] = six; });
    expect(isGroupStageComplete(all)).toBe(true);
  });

  it('treats a pending (null) result as not played', () => {
    const matches: GroupResultMatch[] = [
      { home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0 },
      { home_team_id: 'a', away_team_id: 'b', result_home: null, result_away: null },
      { home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0 },
      { home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0 },
      { home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0 },
      { home_team_id: 'a', away_team_id: 'b', result_home: 1, result_away: 0 },
    ];
    expect(isGroupStageComplete({ A: matches })).toBe(false);
  });
});
