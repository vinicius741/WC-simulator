<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');
require_auth();

$body       = read_json_body();
$gameId     = isset($body['game_id']) ? (int) $body['game_id'] : 0;
$home       = isset($body['predicted_home']) ? filter_var($body['predicted_home'], FILTER_VALIDATE_INT) : false;
$away       = isset($body['predicted_away']) ? filter_var($body['predicted_away'], FILTER_VALIDATE_INT) : false;
$penalty    = $body['predicted_penalty_winner'] ?? null;
$playerName = is_string($body['player_name'] ?? null) ? trim($body['player_name']) : '';

if ($gameId <= 0) {
    json_error(400, 'Invalid game.');
}
if ($home === false || $away === false || $home < 0 || $home > 30 || $away < 0 || $away > 30) {
    json_error(400, 'Invalid score.');
}
if ($playerName === '') {
    json_error(400, 'Please enter your name.');
}
if (mb_strlen($playerName) > 40) {
    json_error(400, 'Name is too long.');
}
if ($penalty !== null && $penalty !== 'home' && $penalty !== 'away') {
    json_error(400, "predicted_penalty_winner must be 'home' or 'away'.");
}

// Anti-cheat + sanity checks against the game itself.
$stmt = $pdo->prepare(
    'SELECT id, stage, kickoff_utc, is_open, home_team_id, away_team_id FROM games WHERE id = :id LIMIT 1'
);
$stmt->execute([':id' => $gameId]);
$game = $stmt->fetch();
if (!$game) {
    json_error(404, 'Game not found.');
}
if ((int) $game['is_open'] !== 1) {
    json_error(403, 'Predictions are closed for this game.');
}
if ($game['home_team_id'] === null || $game['away_team_id'] === null) {
    json_error(403, 'Teams for this game are not set yet.');
}
$isKnockout = $game['stage'] !== 'group';
if (!$isKnockout || $home !== $away) {
    $penalty = null;
} elseif ($penalty === null) {
    json_error(400, 'Pick who goes through on penalties.');
}
$kickoffEpoch = strtotime((string) $game['kickoff_utc'] . ' UTC');
if ($kickoffEpoch <= time()) {
    json_error(403, 'This game has already started — predictions are locked.');
}

// Upsert: one prediction per game per player (UNIQUE(game_id, player_name)).
$upsert = $pdo->prepare(
    'INSERT INTO predictions (game_id, player_name, predicted_home, predicted_away, predicted_penalty_winner, points)
     VALUES (:g, :n, :h, :a, :pw, NULL)
     ON DUPLICATE KEY UPDATE
        predicted_home = VALUES(predicted_home),
        predicted_away = VALUES(predicted_away),
        predicted_penalty_winner = VALUES(predicted_penalty_winner),
        points = NULL'
);
$upsert->execute([
    ':g' => $gameId,
    ':n' => $playerName,
    ':h' => $home,
    ':a' => $away,
    ':pw' => $penalty,
]);

// Remember the name on the session so me.php reflects the last-used identity.
$cookie = $_COOKIE['wcpred_sess'] ?? '';
if (is_string($cookie) && ctype_xdigit($cookie) && strlen($cookie) === 64) {
    $upd = $pdo->prepare('UPDATE sessions SET player_name = :n WHERE token = :t');
    $upd->execute([':n' => $playerName, ':t' => $cookie]);
}

json_out(['ok' => true, 'player_name' => $playerName]);
