<?php
// One-time password installer for the Family Predictions feature.
//   GET  -> shows a small HTML form.
//   POST -> stores bcrypt hashes for the shared + admin passwords.
//
// SECURITY: it refuses to run once both password hashes already exist, so it
// becomes inert after first use. For extra safety you may define $SETUP_TOKEN
// in wc-sim-secrets.php (see db/SETUP.md); the form then requires that token.
// You can safely delete this file after setup.

define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';

header('Content-Type: text/html; charset=utf-8');

function render_page(string $body): void
{
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>World Cup Predictions — setup</title>'
        . '<style>'
        . 'body{font-family:Georgia,"Times New Roman",serif;max-width:460px;margin:60px auto;padding:0 16px;color:#1a1a1a;line-height:1.5}'
        . 'h1{font-size:22px;color:#b00000}label{display:block;margin:16px 0 4px;font-weight:bold;font-family:Inter,sans-serif}'
        . 'input{width:100%;padding:10px;font-size:15px;box-sizing:border-box;border:1px solid #ccc;border-radius:2px}'
        . 'button{margin-top:20px;padding:11px 20px;background:#b00000;color:#fff;border:0;font-weight:bold;font-size:15px;cursor:pointer;border-radius:2px}'
        . '.ok{color:#2e7d32}.err{color:#b00000}code{background:#f5f3ef;padding:2px 5px}'
        . '</style></head><body>' . $body . '</body></html>';
}

$hasShared = (bool) get_config($pdo, 'shared_password_hash');
$hasAdmin  = (bool) get_config($pdo, 'admin_password_hash');

if ($hasShared && $hasAdmin) {
    render_page(
        '<h1>Already configured</h1>'
        . '<p>Passwords are already set. Change them from the <b>Admin</b> panel inside the app.</p>'
    );
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $token = is_string($_POST['token'] ?? null) ? (string) $_POST['token'] : '';
    if (isset($SETUP_TOKEN) && is_string($SETUP_TOKEN) && $SETUP_TOKEN !== '') {
        if ($token === '' || !hash_equals($SETUP_TOKEN, $token)) {
            render_page('<h1 class="err">Wrong or missing setup token.</h1>');
            exit;
        }
    }
    $shared = is_string($_POST['shared_password'] ?? null) ? (string) $_POST['shared_password'] : '';
    $admin  = is_string($_POST['admin_password']  ?? null) ? (string) $_POST['admin_password']  : '';
    if (strlen($shared) < 6 || strlen($admin) < 6) {
        render_page('<h1 class="err">Both passwords must be at least 6 characters.</h1>');
        exit;
    }
    set_config($pdo, 'shared_password_hash', password_hash($shared, PASSWORD_DEFAULT));
    set_config($pdo, 'admin_password_hash',  password_hash($admin,  PASSWORD_DEFAULT));
    render_page(
        '<h1 class="ok">✓ All set!</h1>'
        . '<p>The passwords are configured. Open the site, go to the <b>Predictions</b> tab, and log in.</p>'
        . '<p>You can now delete <code>api/setup.php</code> from the server for extra safety.</p>'
    );
    exit;
}

$tokenField = (isset($SETUP_TOKEN) && is_string($SETUP_TOKEN) && $SETUP_TOKEN !== '')
    ? '<label>Setup token</label><input name="token" autocomplete="off">'
    : '';

render_page(
    '<h1>Predictions — one-time setup</h1>'
    . '<p>Choose the shared family password and your admin password. '
    . 'You can change them later from the admin panel.</p>'
    . '<form method="post">'
    . $tokenField
    . '<label>Family (shared) password</label>'
    . '<input type="password" name="shared_password" minlength="6" required>'
    . '<label>Admin password</label>'
    . '<input type="password" name="admin_password" minlength="6" required>'
    . '<button type="submit">Set passwords</button>'
    . '</form>'
);
