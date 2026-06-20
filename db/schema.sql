-- WC 2026 Family Predictions — database schema
-- Target: MariaDB / MySQL, charset utf8mb4.
-- Import once via phpMyAdmin (or `mysql` CLI) against the predictions database.
-- All kick-off times are stored in UTC; the front end renders them in the
-- visitor's local timezone.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS games (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  external_id       VARCHAR(40)  NOT NULL,
  stage             VARCHAR(20)  NOT NULL DEFAULT 'group',   -- group | r32 | r16 | qf | sf | 3rd | final
  group_letter      CHAR(1)      NULL,                        -- A..L for group games
  home_team_id      VARCHAR(16)  NULL,                        -- references src/data/teams.ts ids; NULL for TBD knockout
  away_team_id      VARCHAR(16)  NULL,
  home_team_name    VARCHAR(80)  NOT NULL,                    -- denormalised display name
  away_team_name    VARCHAR(80)  NOT NULL,
  home_code         VARCHAR(6)   NULL,                        -- 'BRA' etc.
  away_code         VARCHAR(6)   NULL,
  home_flag         VARCHAR(16)  NULL,                        -- emoji flag
  away_flag         VARCHAR(16)  NULL,
  kickoff_utc       DATETIME     NOT NULL,
  venue             VARCHAR(120) NULL,
  result_home       TINYINT UNSIGNED NULL,                    -- actual final score (after extra time, NOT penalties)
  result_away       TINYINT UNSIGNED NULL,
  result_entered_at DATETIME     NULL,
  is_open           TINYINT(1)   NOT NULL DEFAULT 1,          -- admin can close a game to predictions early
  PRIMARY KEY (id),
  UNIQUE KEY uq_external (external_id),
  KEY idx_kickoff (kickoff_utc),
  KEY idx_stage (stage),
  KEY idx_open_kickoff (is_open, kickoff_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS predictions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_id        INT UNSIGNED NOT NULL,
  player_name    VARCHAR(40)  NOT NULL,
  predicted_home TINYINT UNSIGNED NOT NULL,
  predicted_away TINYINT UNSIGNED NOT NULL,
  points         TINYINT NULL,                               -- 3/1/0, set when the actual result is entered
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_player (game_id, player_name),           -- one prediction per person per game
  KEY idx_player (player_name),
  CONSTRAINT fk_pred_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token       CHAR(64) NOT NULL,                              -- 32 random bytes, hex-encoded
  player_name VARCHAR(40) NULL,
  is_admin    TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  PRIMARY KEY (token),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS config (
  config_key   VARCHAR(40) NOT NULL,
  config_value TEXT NOT NULL,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default scoring values (tweakable later via the admin panel).
-- efficiency_min_games: minimum scored games a player needs to appear on the
-- Efficiency (points-per-game) leaderboard, so a 1-game cherry-picker can't
-- camp at a perfect average. Defaults to 3.
INSERT INTO config (config_key, config_value) VALUES
  ('points_exact', '3'),
  ('points_result', '1'),
  ('efficiency_min_games', '3')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- NOTE: shared_password_hash and admin_password_hash must be inserted separately
-- (bcrypt hashes — see the setup guide). They are intentionally NOT shipped here.
