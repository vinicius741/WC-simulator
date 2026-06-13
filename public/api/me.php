<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');

// Tells the SPA whether the current cookie is a valid session (and which name/admin state).
json_out([
    'authenticated' => $CURRENT_SESSION['authenticated'],
    'is_admin'      => $CURRENT_SESSION['is_admin'],
    'player_name'   => $CURRENT_SESSION['player_name'],
]);
