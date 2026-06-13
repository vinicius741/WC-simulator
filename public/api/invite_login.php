<?php
// Passwordless family invite login.
//
// A visitor opening an admin-generated /invite/<token> link POSTs the token
// plus their player name here. If the token matches the shared family invite
// token stored in `config` (and the invite is enabled), we issue exactly the
// same family session the password login would — no password required.

define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');

$body       = read_json_body();
$token      = is_string($body['token'] ?? null) ? (string) $body['token'] : '';
$playerName = is_string($body['player_name'] ?? null) ? trim($body['player_name']) : '';

// Validate the player name (same rules as login.php).
if ($playerName === '') {
    json_error(400, 'Please enter your name.');
}
if (mb_strlen($playerName) > 40) {
    json_error(400, 'Name is too long.');
}

// Validate the token format before touching the DB (hex, sensible length).
if ($token === '' || !ctype_xdigit($token) || strlen($token) < 16 || strlen($token) > 128) {
    json_error(401, 'This invite link is invalid or has been disabled.');
}

// Look up the shared family invite token + enabled flag from config.
$stored  = get_config($pdo, 'invite_token');
$enabled = get_config($pdo, 'invite_enabled');

// Reject if no token is configured, the invite is disabled, or it doesn't
// match (constant-time compare to avoid a timing side-channel).
if ($stored === null || $stored === '' || $enabled === '0' || !hash_equals((string) $stored, (string) $token)) {
    json_error(401, 'This invite link is invalid or has been disabled.');
}

// Grant the same family session the password login would.
issue_session($pdo, false, $playerName);

json_out(['ok' => true, 'player_name' => $playerName]);
