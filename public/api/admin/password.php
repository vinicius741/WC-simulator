<?php
define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_admin();

$body = read_json_body();
$type = is_string($body['type'] ?? null) ? $body['type'] : '';
$new  = is_string($body['new_password'] ?? null) ? $body['new_password'] : '';

if (!in_array($type, ['shared', 'admin'], true)) {
    json_error(400, 'Invalid type.');
}
if (strlen($new) < 6 || strlen($new) > 200) {
    json_error(400, 'Password must be 6–200 characters.');
}

$key  = $type === 'shared' ? 'shared_password_hash' : 'admin_password_hash';
$hash = password_hash($new, PASSWORD_DEFAULT);
set_config($pdo, $key, $hash);

json_out(['ok' => true]);
