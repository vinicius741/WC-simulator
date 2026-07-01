<?php
define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_admin();

$body   = read_json_body();
$gameId = isset($body['game_id']) ? (int) $body['game_id'] : 0;
$home   = isset($body['result_home']) ? filter_var($body['result_home'], FILTER_VALIDATE_INT) : false;
$away   = isset($body['result_away']) ? filter_var($body['result_away'], FILTER_VALIDATE_INT) : false;

// Optional shootout winner, only meaningful for drawn knockout games.
$penalty = $body['penalty_winner'] ?? null;
if ($penalty !== null && $penalty !== 'home' && $penalty !== 'away') {
    json_error(400, "penalty_winner must be 'home' or 'away'.");
}
// A shootout winner only makes sense when the score is level.
if ($penalty !== null && $home !== false && $away !== false && (int) $home !== (int) $away) {
    $penalty = null;
}

if ($gameId <= 0) {
    json_error(400, 'Invalid game.');
}
if ($home === false || $away === false || $home < 0 || $home > 30 || $away < 0 || $away > 30) {
    json_error(400, 'Invalid score.');
}

// Record the actual result.
$update = $pdo->prepare(
    'UPDATE games
        SET result_home = :h, result_away = :a, penalty_winner = :pw, result_entered_at = UTC_TIMESTAMP()
      WHERE id = :id'
);
$update->execute([':h' => $home, ':a' => $away, ':pw' => $penalty, ':id' => $gameId]);

// Confirm the game exists (rowCount is 0 if the row was missing OR unchanged).
$chk = $pdo->prepare('SELECT 1 FROM games WHERE id = :id');
$chk->execute([':id' => $gameId]);
if (!$chk->fetchColumn()) {
    json_error(404, 'Game not found.');
}

// Re-score every prediction for this game (idempotent — safe to re-run on correction).
require __DIR__ . '/scoring.php';
require_once __DIR__ . '/../lib/knockout.php';
rescore_game($pdo, $gameId, $home, $away);
$generated = auto_fill_next_knockout_games($pdo);

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM predictions WHERE game_id = :id');
$countStmt->execute([':id' => $gameId]);
$scored = (int) $countStmt->fetchColumn();

json_out([
    'ok' => true,
    'game_id' => $gameId,
    'scored_predictions' => $scored,
    'generated_knockout_games' => $generated,
]);
