<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');
require_auth();

// Rank by total points from scored games (SUM ignores NULL/un-scored picks),
// then by how many games were scored, then alphabetically.
$rows = $pdo->query(
    "SELECT player_name,
            COALESCE(SUM(points), 0) AS total,
            COUNT(*)                 AS predictions,
            COUNT(points)            AS games_scored
     FROM predictions
     GROUP BY player_name
     ORDER BY total DESC, games_scored DESC, player_name ASC"
)->fetchAll();

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'player_name'  => (string) $r['player_name'],
        'total'        => (int) $r['total'],
        'predictions'  => (int) $r['predictions'],
        'games_scored' => (int) $r['games_scored'],
    ];
}

json_out(['leaderboard' => $out]);
