-- WC 2026 Family Predictions — migration: add penalty_winner to games.
--
-- Knockout matches can end in a draw after extra time and be decided on
-- penalties. To advance teams round-to-round (and to know the true winner),
-- we record which side won the shootout alongside the 90/120-min score.
--
-- `penalty_winner` is 'home' | 'away' | NULL. NULL means the game was decided
-- in regular/extra time (result_home != result_away). For group games it is
-- always NULL.
--
-- Idempotent: safe to run more than once.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS penalty_winner ENUM('home','away') NULL AFTER result_away;
