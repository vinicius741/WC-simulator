-- WC 2026 Family Predictions — migration: add penalty winner to predictions.
--
-- Knockout predictions can include a tied score after extra time. In that
-- case, store which side the player thinks advances on penalties.
--
-- Idempotent: safe to run more than once.

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS predicted_penalty_winner ENUM('home','away') NULL AFTER predicted_away;
