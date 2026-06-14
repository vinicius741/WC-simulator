import type { LiveMatch, RevealedPrediction } from '../types';

/**
 * Live "fate" projection — given an in-play score and everyone's revealed
 * predictions, compute what each player is on track to earn if the match ended
 * right now, plus a status capturing whether they're cruising / on track /
 * need a comeback / are almost certainly out.
 *
 * Pure and deterministic (no React, no network) so it is trivially unit-testable.
 * Driven entirely by the live score (from api.getLive) and the predictions that
 * games.php already reveals for any kicked-off game.
 */

export type FateStatus = 'exact' | 'result' | 'level' | 'behind' | 'almost_out';

export interface PlayerFate {
  player_name: string;
  predicted_home: number;
  predicted_away: number;
  projectedPoints: 0 | 1 | 3; // what they'd earn if the match ended NOW
  status: FateStatus;
  exactStillPossible: boolean; // score can still climb to exactly their pick
}

export interface FateSummary {
  onTrack: number; // exact + result (projectedPoints >= 1)
  inPlay: number; // level — game tied, a win/loss pick not realized yet
  comeback: number; // behind
  almostOut: number; // almost_out
}

/**
 * Tunable "is hope basically gone?" thresholds. A result that's currently wrong
 * is flagged almost_out only when the deficit is large or the clock is against
 * them — otherwise it's a live 'behind' (a comeback is plausible).
 */
const ALMOST_OUT = {
  deficitAnyTime: 3, // ≥3 goals down at any point
  deficitLate: 2, // ≥2 down…
  minuteLate: 75, // …past this minute
  deficitDying: 1, // ≥1 down…
  minuteDying: 88, // …past this minute
};
// When the source gives no minute (FIFA calendar), only flag almost_out for big holes.
const ALMOST_OUT_NO_MINUTE_DEFICIT = 3;

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Points a prediction would earn if the match ended at the given score (3/1/0). */
export function projectedPointsFor(
  predictedHome: number,
  predictedAway: number,
  home: number,
  away: number,
): 0 | 1 | 3 {
  if (predictedHome === home && predictedAway === away) return 3;
  if (sign(predictedHome - predictedAway) === sign(home - away)) return 1;
  return 0;
}

export function projectLiveFate(live: LiveMatch, predictions: RevealedPrediction[]): PlayerFate[] {
  const { home_score: H, away_score: A, minute } = live;
  return predictions.map((p) => {
    const pts = projectedPointsFor(p.predicted_home, p.predicted_away, H, A);
    const resultCorrect = pts >= 1;
    // The exact score is still reachable only while the live score hasn't
    // overshot either side (e.g. predicted 2-0 but it's already 2-1 → exact dead).
    const exactStillPossible = p.predicted_home >= H && p.predicted_away >= A;

    let status: FateStatus;
    if (pts === 3) {
      status = 'exact';
    } else if (resultCorrect) {
      status = 'result';
    } else if (sign(H - A) === 0) {
      // Game is level — a win/loss pick hasn't materialized but isn't beaten:
      // nobody is behind, so "needs a comeback" would be misleading.
      status = 'level';
    } else {
      status = isAlmostOut(H, A, minute) ? 'almost_out' : 'behind';
    }

    return {
      player_name: p.player_name,
      predicted_home: p.predicted_home,
      predicted_away: p.predicted_away,
      projectedPoints: pts,
      status,
      exactStillPossible,
    };
  });
}

function isAlmostOut(home: number, away: number, minute: number | null): boolean {
  const deficit = Math.abs(home - away);
  if (minute === null) {
    return deficit >= ALMOST_OUT_NO_MINUTE_DEFICIT;
  }
  if (deficit >= ALMOST_OUT.deficitAnyTime) return true;
  if (deficit >= ALMOST_OUT.deficitLate && minute >= ALMOST_OUT.minuteLate) return true;
  if (deficit >= ALMOST_OUT.deficitDying && minute >= ALMOST_OUT.minuteDying) return true;
  return false;
}

/** Rank best fate first: exact > result > level > behind > almost_out; ties by name. */
export function rankFates(fates: PlayerFate[]): PlayerFate[] {
  const weight: Record<FateStatus, number> = {
    exact: 0,
    result: 1,
    level: 2,
    behind: 3,
    almost_out: 4,
  };
  return [...fates].sort((a, b) => {
    const d = weight[a.status] - weight[b.status];
    return d !== 0 ? d : a.player_name.localeCompare(b.player_name);
  });
}

export function summarizeFates(fates: PlayerFate[]): FateSummary {
  let onTrack = 0;
  let inPlay = 0;
  let comeback = 0;
  let almostOut = 0;
  for (const f of fates) {
    if (f.status === 'exact' || f.status === 'result') onTrack++;
    else if (f.status === 'level') inPlay++;
    else if (f.status === 'behind') comeback++;
    else almostOut++;
  }
  return { onTrack, inPlay, comeback, almostOut };
}
