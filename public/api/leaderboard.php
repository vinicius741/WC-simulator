<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');
require_auth();

// Rank by total points from scored games (SUM ignores NULL/un-scored picks),
// then by how many games were scored, then by closeness (total goal-margin
// error across scored games; lower is closer/better), then alphabetically.
//
// margin_error sums |predicted margin − actual margin| over scored picks.
// CAST(... AS SIGNED) is required: predicted_home/away and result_home/away
// are UNSIGNED, so a raw subtraction overflows (error 1690) when the margin
// is negative — see the same note in admin/scoring.php.
$rows = $pdo->query(
    "SELECT p.player_name,
            COALESCE(SUM(p.points), 0) AS total,
            COUNT(*)                 AS predictions,
            COUNT(p.points)          AS games_scored,
            COALESCE(SUM(
                CASE WHEN p.points IS NOT NULL AND g.result_home IS NOT NULL
                     THEN ABS( (CAST(p.predicted_home AS SIGNED) - CAST(p.predicted_away AS SIGNED))
                             - (CAST(g.result_home  AS SIGNED) - CAST(g.result_away  AS SIGNED)) )
                     ELSE 0
                END
            ), 0) AS margin_error
     FROM predictions p
     LEFT JOIN games g ON g.id = p.game_id
     GROUP BY p.player_name
     ORDER BY total DESC, games_scored DESC, margin_error ASC, player_name ASC"
)->fetchAll();

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'player_name'  => (string) $r['player_name'],
        'total'        => (int) $r['total'],
        'predictions'  => (int) $r['predictions'],
        'games_scored' => (int) $r['games_scored'],
        'margin_error' => (int) $r['margin_error'],
    ];
}

json_out(['leaderboard' => $out]);
