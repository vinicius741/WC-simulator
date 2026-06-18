import { describe, expect, it } from 'vitest';
import type { PredictionGame } from '../types';
import { teamHistory } from './teamHistory';

function game(overrides: Partial<PredictionGame>): PredictionGame {
  return {
    id: 1,
    external_id: 'game-1',
    stage: 'group',
    group_letter: 'A',
    home_team_id: 'bra',
    away_team_id: 'arg',
    home_team_name: 'Brazil',
    away_team_name: 'Argentina',
    home_code: 'BRA',
    away_code: 'ARG',
    home_flag: '🇧🇷',
    away_flag: '🇦🇷',
    kickoff_utc: '2026-07-01 20:00:00',
    venue: null,
    is_open: true,
    started: false,
    result_home: null,
    result_away: null,
    my_prediction: null,
    predictions: null,
    ...overrides,
  };
}

describe('teamHistory', () => {
  const selected = game({ id: 10 });

  it('returns only earlier finished games involving the selected team', () => {
    const earlier = game({
      id: 2,
      home_team_id: 'mex',
      home_code: 'MEX',
      home_team_name: 'Mexico',
      away_team_id: 'bra',
      away_code: 'BRA',
      away_team_name: 'Brazil',
      kickoff_utc: '2026-06-20 20:00:00',
      result_home: 1,
      result_away: 2,
    });
    const pending = game({ id: 3, kickoff_utc: '2026-06-25 20:00:00' });
    const unrelated = game({
      id: 4,
      home_team_id: 'mex',
      away_team_id: 'usa',
      home_code: 'MEX',
      away_code: 'USA',
      result_home: 1,
      result_away: 1,
    });

    expect(teamHistory([selected, earlier, pending, unrelated], selected, 'home')).toEqual([earlier]);
  });

  it('uses the team code when an older game has no team id', () => {
    const older = game({
      id: 5,
      home_team_id: null,
      kickoff_utc: '2026-06-15 20:00:00',
      result_home: 3,
      result_away: 0,
    });

    expect(teamHistory([older], selected, 'home')).toEqual([older]);
  });
});
