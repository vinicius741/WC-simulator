<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');

$body     = read_json_body();
$password = is_string($body['password'] ?? null) ? (string) $body['password'] : '';

if ($password === '') {
    json_error(400, 'Password is required.');
}

$hash = get_config($pdo, 'admin_password_hash');
if (!$hash || !password_verify($password, $hash)) {
    json_error(401, 'Incorrect admin password.');
}

issue_session($pdo, true, null);

json_out(['ok' => true, 'is_admin' => true]);
