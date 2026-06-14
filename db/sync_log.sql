-- WC 2026 Family Predictions — auto-sync audit log.
-- Records every action taken by api/admin/sync_results.php (the daily auto-fetch).
-- The sync script also self-creates this table (CREATE TABLE IF NOT EXISTS) on
-- first run, so importing this file is OPTIONAL — it exists to document the shape
-- and to let you create it explicitly if you prefer.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS sync_log (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id      CHAR(12)     NOT NULL,                -- groups all rows from one sync run
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external_id VARCHAR(40)  NULL,                    -- games.external_id, e.g. wc2026-06
  action      VARCHAR(20)  NOT NULL,                -- filled | already_set | corrected | unmatched | skipped | error
  detail      VARCHAR(255) NULL,                    -- human-readable, e.g. "BRA 2-0 MAR"
  PRIMARY KEY (id),
  KEY idx_run (run_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
