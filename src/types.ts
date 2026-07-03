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
  /**
   * True when this match reflects a real, decided result pulled from the
   * predictions backend. Locked matches render as read-only in the bracket.
   * Optional so older persisted localStorage state still loads.
   */
  locked?: boolean;
}

/**
 * A decided knockout result from the public results.php endpoint. Joined to the
 * bracket via `external_id` → simulator schema id (see SCHEMA_ID_TO_MATCH_NO).
 */
export interface RealKnockoutResult {
  external_id: string;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  result_home: number | null;
  result_away: number | null;
  penalty_winner: 'home' | 'away' | null;
}

export interface ResultsResponse {
  fetched_at: string;
  results: RealKnockoutResult[];
}

export type GroupTeamsMap = Record<string, Team[]>;

/* ---- Family Predictions feature ---- */

export interface MyPrediction {
  predicted_home: number;
  predicted_away: number;
  predicted_penalty_winner: 'home' | 'away' | null;
  points: number | null;
}

export interface RevealedPrediction {
  player_name: string;
  predicted_home: number;
  predicted_away: number;
  predicted_penalty_winner: 'home' | 'away' | null;
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
  penalty_winner: 'home' | 'away' | null; // shootout winner for drawn knockout games
  my_prediction: MyPrediction | null;
  predictions: RevealedPrediction[] | null; // present only once kickoff has passed
}

/* ---- Live (in-play) scoreboard ---- */

export interface LiveMatch {
  game_id: number;
  home_score: number;
  away_score: number;
  minute: number | null; // best-effort current minute; null when the source has none
  phase: string | null; // e.g. "2nd half", "Half-time"
}

export interface LiveResponse {
  fetched_at: string; // ISO UTC
  source: string;
  live: LiveMatch[];
}

export type LeaderboardScope = 'overall' | 'week';

export interface LeaderboardRow {
  player_name: string;
  total: number;
  predictions: number;
  games_scored: number;
  margin_error: number; // Σ |pred margin − actual margin| over scored games (lower = closer)
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

/* ---- Auto-sync (results pulled from FIFA) ---- */

export interface SyncLogEntry {
  created_at: string; // 'YYYY-MM-DD HH:MM:SS' UTC
  external_id: string | null;
  action: string; // filled | already_set | created | corrected | unmatched | skipped | error
  detail: string | null;
}

export interface SyncRunSummary {
  source?: string;
  fetched?: number;
  finished?: number;
  filled?: number;
  already_set?: number;
  created?: number;
  corrected?: number;
  unmatched?: number;
  skipped?: number;
  errors?: number;
  at?: string;
}

export interface SyncStatusResponse {
  source: string;
  force_overwrite: boolean;
  last_sync_at: string | null;
  last_summary: SyncRunSummary | null;
  recent_log: SyncLogEntry[];
}

export interface SyncNowResponse {
  run_id: string;
  dry_run: boolean;
  source: string;
  fetched: number;
  finished: number;
  filled: number;
  already_set: number;
  created: number;
  corrected: number;
  unmatched: number;
  skipped: number;
  errors: number;
  actions: string[];
}
