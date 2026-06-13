export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  group: string;
  rating: number;
}

export interface ThirdPlaceAllocationSlot {
  winner: string;
  allowed: string[];
  matchId: string;
  teamSide: 'home' | 'away';
}

export interface KnockoutMatchSchema {
  id: string;
  stage: string;
  label: string;
  home: string;
  away: string;
  nextMatchId: string;
  nextSide: 'home' | 'away' | '';
}

export interface KnockoutMatch extends KnockoutMatchSchema {
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: 'home' | 'away' | null;
  winner: string;
}

export type GroupTeamsMap = Record<string, Team[]>;

/* ---- Family Predictions feature ---- */

export interface MyPrediction {
  predicted_home: number;
  predicted_away: number;
  points: number | null;
}

export interface RevealedPrediction {
  player_name: string;
  predicted_home: number;
  predicted_away: number;
  points: number | null;
}

export interface PredictionGame {
  id: number;
  external_id: string;
  stage: string;
  group_letter: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
  home_code: string | null;
  away_code: string | null;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_utc: string; // 'YYYY-MM-DD HH:MM:SS' in UTC
  venue: string | null;
  is_open: boolean;
  started: boolean;
  result_home: number | null;
  result_away: number | null;
  my_prediction: MyPrediction | null;
  predictions: RevealedPrediction[] | null; // present only once kickoff has passed
}

export interface LeaderboardRow {
  player_name: string;
  total: number;
  predictions: number;
  games_scored: number;
}

export interface MeResponse {
  authenticated: boolean;
  is_admin: boolean;
  player_name: string | null;
}

export interface InviteLoginResponse {
  ok: boolean;
  player_name: string;
}

export interface InviteStatusResponse {
  enabled: boolean;
  has_token: boolean;
  token: string | null;
}

export interface InviteActionResponse {
  ok: boolean;
  token?: string;
  enabled?: boolean;
}

export interface AdminDeletePlayerResponse {
  ok: boolean;
  player_name: string;
  deleted_predictions: number;
  deleted_sessions: number;
}
