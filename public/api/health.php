<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';

// No auth: lets the front end (and ops) confirm DB + secrets are wired up.
$gameCount = (int) $pdo->query('SELECT COUNT(*) FROM games')->fetchColumn();

json_out([
    'ok'         => true,
    'php'        => PHP_VERSION,
    'db'         => 'connected',
    'game_count' => $gameCount,
    'time_utc'   => gmdate('c'),
]);
