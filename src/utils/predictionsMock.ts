import type { LeaderboardRow, LeaderboardScope, LiveResponse, PredictionGame } from '../types';

// Local-dev mock data so the Predictions UI can be developed without a backend.
// Games are generated relative to the current time so some are upcoming and
// some have already kicked off. Enable with VITE_PRED_MOCK=true.

function isoOffset(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export const MOCK_GAMES: PredictionGame[] = [
  {
    id: 1,
    external_id: 'mock-1',
    stage: 'group',
    group_letter: 'C',
    home_team_id: 'bra',
    away_team_id: 'mar',
    home_team_name: 'Brazil',
    away_team_name: 'Morocco',
    home_code: 'BRA',
    away_code: 'MAR',
    home_flag: '🇧🇷',
    away_flag: '🇲🇦',
    kickoff_utc: isoOffset(60 * 24),
    venue: 'Maracanã, Rio de Janeiro',
    is_open: true,
    started: false,
    result_home: null,
    result_away: null,
    penalty_winner: null,
    my_prediction: { predicted_home: 2, predicted_away: 1, points: null },
    predictions: null,
  },
  {
    id: 2,
    external_id: 'mock-2',
    stage: 'group',
    group_letter: 'J',
    home_team_id: 'arg',
    away_team_id: 'aut',
    home_team_name: 'Argentina',
    away_team_name: 'Austria',
    home_code: 'ARG',
    away_code: 'AUT',
    home_flag: '🇦🇷',
    away_flag: '🇦🇹',
    kickoff_utc: isoOffset(60 * 48),
    venue: 'MetLife Stadium, New York',
    is_open: true,
    started: false,
    result_home: null,
    result_away: null,
    penalty_winner: null,
    my_prediction: null,
    predictions: null,
  },
  {
    id: 3,
    external_id: 'mock-3',
    stage: 'group',
    group_letter: 'H',
    home_team_id: 'esp',
    away_team_id: 'uru',
    home_team_name: 'Spain',
    away_team_name: 'Uruguay',
    home_code: 'ESP',
    away_code: 'URU',
    home_flag: '🇪🇸',
    away_flag: '🇺🇾',
    kickoff_utc: isoOffset(-60 * 26),
    venue: 'AT&T Stadium, Dallas',
    is_open: true,
    started: true,
    result_home: 2,
    result_away: 0,
    penalty_winner: null,
    my_prediction: { predicted_home: 2, predicted_away: 0, points: 3 },
    predictions: [
      { player_name: 'You', predicted_home: 2, predicted_away: 0, points: 3 },
      { player_name: 'Dad', predicted_home: 1, predicted_away: 1, points: 0 },
      { player_name: 'Mom', predicted_home: 2, predicted_away: 1, points: 1 },
    ],
  },
  {
    id: 4,
    external_id: 'mock-4',
    stage: 'group',
    group_letter: 'F',
    home_team_id: 'ned',
    away_team_id: 'jpn',
    home_team_name: 'Netherlands',
    away_team_name: 'Japan',
    home_code: 'NED',
    away_code: 'JPN',
    home_flag: '🇳🇱',
    away_flag: '🇯🇵',
    kickoff_utc: isoOffset(-60 * 2),
    venue: 'Mercedes-Benz Stadium, Atlanta',
    is_open: true,
    started: true,
    result_home: null,
    result_away: null,
    penalty_winner: null,
    my_prediction: { predicted_home: 1, predicted_away: 1, points: null },
    predictions: [
      { player_name: 'You', predicted_home: 1, predicted_away: 1, points: null },
      { player_name: 'Dad', predicted_home: 2, predicted_away: 0, points: null },
      { player_name: 'Mom', predicted_home: 2, predicted_away: 1, points: null },
      { player_name: 'Sister', predicted_home: 1, predicted_away: 2, points: null },
    ],
  },
];

// Mock leaderboards keyed by scope, so the Overall/This Week toggle is fully
// exercisable in mock mode (VITE_PRED_MOCK=true) without a backend.
//   overall → cumulative totals (who joined early still leads here).
//   week    → this ISO week only — a fresh, winnable race every week.
export const MOCK_LEADERBOARD: Record<LeaderboardScope, LeaderboardRow[]> = {
  overall: [
    // margin_error: Spain 2-0 (margin +2) → You 2-0 (0), Mom 2-1 (1), Dad 1-1 (2).
    { player_name: 'You', total: 3, predictions: 2, games_scored: 1, margin_error: 0 },
    { player_name: 'Mom', total: 1, predictions: 1, games_scored: 1, margin_error: 1 },
    { player_name: 'Dad', total: 0, predictions: 2, games_scored: 1, margin_error: 2 },
  ],
  week: [
    // Same scored game but framed as the weekly race: closeness breaks the tie.
    { player_name: 'You', total: 3, predictions: 2, games_scored: 1, margin_error: 0 },
    { player_name: 'Mom', total: 1, predictions: 1, games_scored: 1, margin_error: 1 },
    { player_name: 'Dad', total: 0, predictions: 2, games_scored: 1, margin_error: 2 },
  ],
};

// A fake in-play match keyed to MOCK_GAMES id 4 (NED-JPN, started, not yet
// final), so the Live section renders in mock mode without a real game. At
// 2-1 in the 62nd minute this showcases every fate state: exact / result /
// behind (Mom / Dad / You+Sister).
export const MOCK_LIVE: LiveResponse = {
  fetched_at: new Date().toISOString(),
  source: 'espn',
  live: [{ game_id: 4, home_score: 2, away_score: 1, minute: 62, phase: '2nd half' }],
};
