<?php
// Admin management of the shared family invite link.
//
//   GET                                → { enabled, has_token }
//   POST { action: 'generate' }        → { ok, token }        (creates/rotates + enables)
//   POST { action: 'disable' }         → { ok, enabled: false }
//   POST { action: 'enable' }          → { ok, enabled: true }   (400 if no token yet)
//
// The token is stored in plaintext in `config` under `invite_token` — it is
// deliberately shared in cleartext (the URL), so unlike a password it needs no
// hashing. The access boundary for *managing* it is this admin endpoint.

define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require_admin();

// GET → current status, including the token value (admin-gated; the token is
// deliberately shareable, so the admin can re-copy the link at any time).
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $token = get_config($pdo, 'invite_token');
    json_out([
        'enabled'   => get_config($pdo, 'invite_enabled') === '1',
        'has_token' => $token !== null && $token !== '',
        'token'     => ($token !== null && $token !== '') ? $token : null,
    ]);
}

require_method('POST');

$body   = read_json_body();
$action = is_string($body['action'] ?? null) ? (string) $body['action'] : '';

switch ($action) {
    case 'generate':
        // bin2hex(random_bytes(24)) → 48 hex chars, plenty of entropy for a URL.
        $token = bin2hex(random_bytes(24));
        set_config($pdo, 'invite_token', $token);
        set_config($pdo, 'invite_enabled', '1');
        json_out(['ok' => true, 'token' => $token]);

    case 'disable':
        set_config($pdo, 'invite_enabled', '0');
        json_out(['ok' => true, 'enabled' => false]);

    case 'enable':
        $existing = get_config($pdo, 'invite_token');
        if ($existing === null || $existing === '') {
            json_error(400, 'Generate a link first.');
        }
        set_config($pdo, 'invite_enabled', '1');
        json_out(['ok' => true, 'enabled' => true]);

    default:
        json_error(400, 'Unknown action.');
}
