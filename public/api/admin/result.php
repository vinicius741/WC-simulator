<?php
define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_admin();

$body   = read_json_body();
$gameId = isset($body['game_id']) ? (int) $body['game_id'] : 0;
$home   = isset($body['result_home']) ? filter_var($body['result_home'], FILTER_VALIDATE_INT) : false;
$away   = isset($body['result_away']) ? filter_var($body['result_away'], FILTER_VALIDATE_INT) : false;

if ($gameId <= 0) {
    json_error(400, 'Invalid game.');
}
if ($home === false || $away === false || $home < 0 || $home > 30 || $away < 0 || $away > 30) {
    json_error(400, 'Invalid score.');
}

// Record the actual result.
$update = $pdo->prepare(
    'UPDATE games
        SET result_home = :h, result_away = :a, result_entered_at = UTC_TIMESTAMP()
      WHERE id = :id'
);
$update->execute([':h' => $home, ':a' => $away, ':id' => $gameId]);

// Confirm the game exists (rowCount is 0 if the row was missing OR unchanged).
$chk = $pdo->prepare('SELECT 1 FROM games WHERE id = :id');
$chk->execute([':id' => $gameId]);
if (!$chk->fetchColumn()) {
    json_error(404, 'Game not found.');
}

// Re-score every prediction for this game (idempotent — safe to re-run on correction).
$exact  = (int) (get_config($pdo, 'points_exact')  ?? 3);
$result = (int) (get_config($pdo, 'points_result') ?? 1);

$score = $pdo->prepare(
    'UPDATE predictions
        SET points = CASE
            WHEN predicted_home = :h AND predicted_away = :a THEN :ex
            WHEN SIGN(predicted_home - predicted_away) = SIGN(:h2 - :a2) THEN :rs
            ELSE 0
        END
      WHERE game_id = :id'
);
$score->execute([
    ':h'  => $home, ':a'  => $away,
    ':ex' => $exact,
    ':h2' => $home, ':a2' => $away,
    ':rs' => $result,
    ':id' => $gameId,
]);

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM predictions WHERE game_id = :id');
$countStmt->execute([':id' => $gameId]);
$scored = (int) $countStmt->fetchColumn();

json_out(['ok' => true, 'game_id' => $gameId, 'scored_predictions' => $scored]);
