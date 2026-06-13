<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');

destroy_session_cookie($pdo);

json_out(['ok' => true]);
