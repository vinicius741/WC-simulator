<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');
require_auth();

// Optional ?scope=overall|week|efficiency (default overall, so the original
// behaviour is unchanged when no scope is passed).
//
//   overall     → every scored game, ranked by total points (cumulative).
//   week        → only games kicking off in the current ISO week
//                 (Monday 00:00:00 → Sunday 23:59:59 UTC), same ranking basis.
//   efficiency  → every scored game, but ranked by points-per-game average.
//                 A player needs ≥ efficiency_min_games scored games (default 3,
//                 from `config`) to appear, so a 1-game cherry-picker can't
//                 camp at a perfect average.
$scope = $_GET['scope'] ?? 'overall';
$scope = in_array($scope, ['overall', 'week', 'efficiency'], true) ? $scope : 'overall';

// ISO week window in UTC. We anchor to UTC explicitly so the weekly board isn't
// shifted by the server's local timezone. day-of-week N (1=Mon..7=Sun); walk
// back to Monday, then forward 6 days to Sunday. Robust across PHP versions,
// unlike the string form 'monday this week'.
$nowUTC    = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$dow       = (int) $nowUTC->format('N');                 // 1 (Mon) – 7 (Sun)
$monday    = $nowUTC->setTime(0, 0, 0)->modify('-' . ($dow - 1) . ' days');
$sunday    = $monday->modify('+6 days')->setTime(23, 59, 59);
$weekStart = $monday->format('Y-m-d H:i:s');
$weekEnd   = $sunday->format('Y-m-d H:i:s');

$effMin = (int) (get_config($pdo, 'efficiency_min_games') ?? 3);

// One shared query body; only WHERE / HAVING / ORDER BY change with scope.
//
// points_per_game = total / games_scored (2 dp), 0 when no games are scored yet.
//
// margin_error sums |predicted margin − actual margin| over scored picks.
// CAST(... AS SIGNED) is required: predicted_home/away and result_home/away
// are UNSIGNED, so a raw subtraction overflows (error 1690) when the margin
// is negative — see the same note in admin/scoring.php.
//
// Tie-break ordering per scope:
//   overall/week  → total first; within a week the volume is naturally even, so
//                   closeness (margin_error) is the more meaningful decider.
//   efficiency    → average first, then rewards having played more games.
$where  = $scope === 'week' ? 'WHERE g.kickoff_utc BETWEEN :ws AND :we' : '';
$having = $scope === 'efficiency' ? "HAVING games_scored >= $effMin" : '';
$order  = [
    'overall'    => 'total DESC, games_scored DESC, margin_error ASC, player_name ASC',
    'week'       => 'total DESC, margin_error ASC, games_scored DESC, player_name ASC',
    'efficiency' => 'points_per_game DESC, games_scored DESC, margin_error ASC, player_name ASC',
][$scope];

$sql = "SELECT p.player_name,
               COALESCE(SUM(p.points), 0) AS total,
               COUNT(*)                 AS predictions,
               COUNT(p.points)          AS games_scored,
               COALESCE(ROUND(
                   COALESCE(SUM(p.points), 0) / NULLIF(COUNT(p.points), 0), 2
               ), 0) AS points_per_game,
               COALESCE(SUM(
                   CASE WHEN p.points IS NOT NULL AND g.result_home IS NOT NULL
                        THEN ABS( (CAST(p.predicted_home AS SIGNED) - CAST(p.predicted_away AS SIGNED))
                                - (CAST(g.result_home  AS SIGNED) - CAST(g.result_away  AS SIGNED)) )
                        ELSE 0
                   END
               ), 0) AS margin_error
        FROM predictions p
        LEFT JOIN games g ON g.id = p.game_id
        $where
        GROUP BY p.player_name
        $having
        ORDER BY $order";

$stmt = $pdo->prepare($sql);
if ($scope === 'week') {
    $stmt->bindValue(':ws', $weekStart);
    $stmt->bindValue(':we', $weekEnd);
}
$stmt->execute();
$rows = $stmt->fetchAll();

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'player_name'     => (string) $r['player_name'],
        'total'           => (int) $r['total'],
        'predictions'     => (int) $r['predictions'],
        'games_scored'    => (int) $r['games_scored'],
        'points_per_game' => (float) $r['points_per_game'],
        'margin_error'    => (int) $r['margin_error'],
    ];
}

json_out(['leaderboard' => $out]);
