import { describe, expect, it } from 'vitest';
import { projectLiveFate, projectedPointsFor, rankFates, summarizeFates } from './liveFate';
import type { LiveMatch, RevealedPrediction } from '../types';

const live = (home: number, away: number, minute: number | null): LiveMatch => ({
  game_id: 1,
  home_score: home,
  away_score: away,
  minute,
  phase: minute === null ? null : '2nd half',
});

const pred = (name: string, h: number, a: number): RevealedPrediction => ({
  player_name: name,
  predicted_home: h,
  predicted_away: a,
  points: null,
});

const fate = (l: LiveMatch, p: RevealedPrediction) => projectLiveFate(l, [p])[0]!;

describe('projectedPointsFor', () => {
  it('3 for an exact score', () => {
    expect(projectedPointsFor(2, 1, 2, 1)).toBe(3);
  });
  it('1 for the correct result only', () => {
    expect(projectedPointsFor(3, 0, 1, 0)).toBe(1);
  });
  it('0 for the wrong result', () => {
    expect(projectedPointsFor(0, 0, 1, 0)).toBe(0);
  });
  it('1 for a non-exact draw', () => {
    expect(projectedPointsFor(1, 1, 2, 2)).toBe(1);
  });
});

describe('projectLiveFate statuses', () => {
  it('flags exact when the live score equals the pick', () => {
    const f = fate(live(2, 1, 60), pred('Mom', 2, 1));
    expect(f.status).toBe('exact');
    expect(f.projectedPoints).toBe(3);
  });
  it('flags result when the result is right but the score is not', () => {
    const f = fate(live(2, 1, 60), pred('Dad', 2, 0));
    expect(f.status).toBe('result');
    expect(f.projectedPoints).toBe(1);
  });
  it('flags behind when the result is wrong but a comeback is plausible', () => {
    expect(fate(live(2, 1, 60), pred('You', 1, 1)).status).toBe('behind');
    expect(fate(live(1, 0, 30), pred('Sis', 0, 1)).status).toBe('behind');
  });
  it('flags almost_out on a 3-goal deficit at any time', () => {
    expect(fate(live(3, 0, 10), pred('X', 0, 0)).status).toBe('almost_out');
  });
  it('flags almost_out on a 2-goal deficit late', () => {
    expect(fate(live(2, 0, 80), pred('X', 0, 0)).status).toBe('almost_out');
  });
  it('flags almost_out down 1 at the death', () => {
    expect(fate(live(1, 0, 89), pred('X', 0, 0)).status).toBe('almost_out');
  });
  it('keeps a 1-goal deficit mid-game as behind, not almost_out', () => {
    expect(fate(live(1, 0, 60), pred('X', 0, 0)).status).toBe('behind');
  });
});

describe('level (game tied — a win/loss pick is pending, not losing)', () => {
  it('flags level for a win/loss pick while the game is 0-0', () => {
    expect(fate(live(0, 0, 7), pred('X', 2, 1)).status).toBe('level');
    expect(fate(live(0, 0, 7), pred('X', 0, 2)).status).toBe('level');
  });
  it('keeps a draw pick on track (not level) at 0-0', () => {
    expect(fate(live(0, 0, 7), pred('X', 1, 1)).status).toBe('result');
  });
  it('stays level even late — a goal can still arrive, nobody is behind', () => {
    expect(fate(live(0, 0, 89), pred('X', 2, 1)).status).toBe('level');
  });
  it('does NOT flag level once the game stops being level', () => {
    expect(fate(live(1, 0, 60), pred('X', 2, 1)).status).toBe('result'); // home winning → on track
    expect(fate(live(0, 1, 60), pred('X', 2, 1)).status).toBe('behind'); // home losing → comeback
  });
});

describe('exactStillPossible', () => {
  it('is true while the score can still climb to the pick', () => {
    expect(fate(live(1, 0, 30), pred('X', 2, 0)).exactStillPossible).toBe(true);
  });
  it('is false once either side overshoots', () => {
    expect(fate(live(2, 1, 60), pred('X', 2, 0)).exactStillPossible).toBe(false); // away overshot
    expect(fate(live(3, 0, 60), pred('X', 2, 0)).exactStillPossible).toBe(false); // home overshot
  });
});

describe('unknown minute (FIFA calendar has none)', () => {
  it('only flags almost_out for big deficits', () => {
    expect(fate(live(3, 0, null), pred('X', 0, 0)).status).toBe('almost_out');
    expect(fate(live(1, 0, null), pred('X', 0, 0)).status).toBe('behind');
  });
});

describe('rankFates + summarizeFates', () => {
  const fates = projectLiveFate(live(2, 1, 60), [
    pred('Sister', 1, 2),
    pred('Mom', 2, 1),
    pred('Dad', 2, 0),
    pred('You', 1, 1),
  ]);
  it('ranks exact > result > behind (ties by name)', () => {
    expect(rankFates(fates).map((f) => f.player_name)).toEqual(['Mom', 'Dad', 'Sister', 'You']);
  });
  it('summarizes counts', () => {
    expect(summarizeFates(fates)).toEqual({ onTrack: 2, inPlay: 0, comeback: 2, almostOut: 0 });
  });
});
