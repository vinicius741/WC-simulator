import type { Team } from '../types';
import { GROUPS } from '../data/constants';

/**
 * Group standings computed from real match scores.
 *
 * This is the bridge between the predictions backend (which stores real
 * `result_home`/`result_away` per group game) and the simulator's bracket
 * engine (which needs ranked 1st/2nd/3rd teams per group to fill the Round of
 * 32). The simulator itself ranks groups by drag-and-drop or random noise; it
 * never computes standings from scorelines — so this is the one missing piece.
 *
 * Ranking order follows the FIFA World Cup regulations:
 *   1. Points (W=3, D=1)
 *   2. Goal Difference
 *   3. Goals For
 *   4. Head-to-Head among the tied teams (mini-table: points → GD → GF)
 *   5. Team Rating (deterministic fallback for fair play / drawing of lots)
 */

export interface Standing {
  team: Team;
  rank: number; // 1-based within the group
  played: number;
  points: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
}

/** A played group fixture, in prediction-backend terms. */
export interface GroupResultMatch {
  home_team_id: string;
  away_team_id: string;
  result_home: number | null;
  result_away: number | null;
}

interface RawTally {
  team: Team;
  played: number;
  points: number;
  gf: number;
  ga: number;
}

/** Tally points/goals for each team from the finished matches in a group. */
function tally(matches: GroupResultMatch[], teams: Team[]): RawTally[] {
  const byId = new Map<string, RawTally>();
  teams.forEach((t) => {
    byId.set(t.id, { team: t, played: 0, points: 0, gf: 0, ga: 0 });
  });

  for (const m of matches) {
    if (m.result_home === null || m.result_away === null) continue;
    const home = byId.get(m.home_team_id);
    const away = byId.get(m.away_team_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += m.result_home;
    home.ga += m.result_away;
    away.gf += m.result_away;
    away.ga += m.result_home;

    if (m.result_home > m.result_away) {
      home.points += 3;
    } else if (m.result_home < m.result_away) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...byId.values()];
}

/**
 * Re-tally only the matches between the given subset of teams (the head-to-head
 * mini-table), returning the same RawTally shape so the same comparators apply.
 */
function tallyHeadToHead(matches: GroupResultMatch[], group: Team[]): RawTally[] {
  const ids = new Set(group.map((t) => t.id));
  const subset = matches.filter(
    (m) => ids.has(m.home_team_id) && ids.has(m.away_team_id),
  );
  return tally(subset, group);
}

/** Sort comparator for Points → GD → GF, applied to tallies. */
function comparePrimary(a: RawTally, b: RawTally): number {
  return b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
}

/**
 * Rank the teams in one group from its finished matches.
 *
 * Ties on Points→GD→GF are broken by a head-to-head mini-table (points, then
 * GD, then GF among just the tied teams); anything still level falls back to
 * team rating, which is deterministic and stands in for the fair-play / drawing
 * of lots steps we have no data for.
 */
export function computeGroupStandings(matches: GroupResultMatch[], teams: Team[]): Standing[] {
  const tallies = tally(matches, teams);

  // First pass: sort by the primary (P→GD→GF) keys.
  const ordered = [...tallies].sort(comparePrimary);

  // Resolve ties block-by-block via head-to-head, then rating.
  const resolved: RawTally[] = [];
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (
      j < ordered.length &&
      ordered[j]!.points === ordered[i]!.points &&
      ordered[j]!.gf - ordered[j]!.ga === ordered[i]!.gf - ordered[i]!.ga &&
      ordered[j]!.gf === ordered[i]!.gf
    ) {
      j++;
    }

    const tied = ordered.slice(i, j);
    if (tied.length > 1) {
      const h2h = tallyHeadToHead(matches, tied.map((t) => t.team));
      const byTeam = new Map(h2h.map((t) => [t.team.id, t]));
      tied.sort(
        (a, b) =>
          comparePrimary(byTeam.get(a.team.id)!, byTeam.get(b.team.id)!) ||
          b.team.rating - a.team.rating,
      );
    }
    resolved.push(...tied);
    i = j;
  }

  return resolved.map((t, idx) => ({
    team: t.team,
    rank: idx + 1,
    played: t.played,
    points: t.points,
    gf: t.gf,
    ga: t.ga,
    gd: t.gf - t.ga,
  }));
}

/**
 * Rank every group's 3rd-placed team against each other and mark the best 8 as
 * qualified. Falls back to team rating for any remaining tie (matching the
 * simulator's `getTopRatedThirdPlaceIds` behaviour).
 */
export interface ThirdPlaceStanding extends Standing {
  group: string;
  qualified: boolean;
}

export function rankThirdPlaceTeams(
  standingsByGroup: Record<string, Standing[]>,
): ThirdPlaceStanding[] {
  const thirds = GROUPS.map((g) => {
    const list = standingsByGroup[g] || [];
    const third = list.find((s) => s.rank === 3) ?? list[2];
    return { ...(third as Standing), group: g, qualified: false };
  }).filter((s) => s && s.team);

  thirds.sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      b.team.rating - a.team.rating,
  );

  thirds.forEach((s, idx) => {
    s.qualified = idx < 8;
  });

  return thirds;
}

/** `true` only when all 6 matches in every group have a recorded result. */
export function isGroupStageComplete(
  matchesByGroup: Record<string, GroupResultMatch[]>,
): boolean {
  return GROUPS.every((g) => {
    const list = matchesByGroup[g] || [];
    const played = list.filter(
      (m) => m.result_home !== null && m.result_away !== null,
    ).length;
    return played >= 6;
  });
}
