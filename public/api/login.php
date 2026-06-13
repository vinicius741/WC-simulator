<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');

$body       = read_json_body();
$password   = is_string($body['password'] ?? null) ? (string) $body['password'] : '';
$playerName = is_string($body['player_name'] ?? null) ? trim($body['player_name']) : '';

if ($password === '') {
    json_error(400, 'Password is required.');
}
if ($playerName === '') {
    json_error(400, 'Please enter your name.');
}
if (mb_strlen($playerName) > 40) {
    json_error(400, 'Name is too long.');
}

// Verify the shared family password.
$hash = get_config($pdo, 'shared_password_hash');
if (!$hash || !password_verify($password, $hash)) {
    json_error(401, 'Incorrect password.');
}

issue_session($pdo, false, $playerName);

json_out(['ok' => true, 'player_name' => $playerName]);
