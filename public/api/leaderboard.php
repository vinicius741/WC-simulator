<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');
require_auth();

// Optional ?scope=overall|week (default overall, so the original behaviour is
// unchanged when no scope is passed).
//
//   overall → every scored game, ranked by total points (cumulative).
//   week    → only games kicking off in the current Brazilian week
//             (Sunday 00:00:00 → Saturday 23:59:59, America/Sao_Paulo),
//             same ranking basis. Boundaries are converted to UTC before
//             filtering so the stored `kickoff_utc` column is compared
//             apples-to-apples.
$scope = $_GET['scope'] ?? 'overall';
$scope = in_array($scope, ['overall', 'week'], true) ? $scope : 'overall';

// Brazilian weekly window: Sun 00:00 → Sat 23:59:59 in America/Sao_Paulo,
// then converted to UTC for the WHERE clause (kickoff_utc is stored in UTC).
//
// We compute in America/Sao_Paulo directly rather than hard-coding -3, so the
// window stays correct even if Brazil ever reintroduces DST — and it needs no
// MySQL timezone tables (Hostinger may not load them). Using PHP's named
// timezone handles the offset math for us.
//
// ISO N is 1=Mon..7=Sun. Days-back-to-Sunday = N % 7:
//   Sun(7)→0, Mon(1)→1, Tue(2)→2, ... Sat(6)→6.
$brTz   = new DateTimeZone('America/Sao_Paulo');
$nowBR  = new DateTimeImmutable('now', $brTz);
$dow    = (int) $nowBR->format('N');                 // 1 (Mon) – 7 (Sun)
$sunday = $nowBR->setTime(0, 0, 0)->modify('-' . ($dow % 7) . ' days');
$sat    = $sunday->modify('+6 days')->setTime(23, 59, 59);

// Convert the local boundaries to UTC strings for the SQL bind. The two
// timezones share the same clock instant; only the rendered string differs.
$utcTz      = new DateTimeZone('UTC');
$weekStart  = $sunday->setTimezone($utcTz)->format('Y-m-d H:i:s');
$weekEnd    = $sat->setTimezone($utcTz)->format('Y-m-d H:i:s');

// One shared query body; only WHERE / ORDER BY change with scope.
//
// margin_error sums |predicted margin − actual margin| over scored picks.
// CAST(... AS SIGNED) is required: predicted_home/away and result_home/away
// are UNSIGNED, so a raw subtraction overflows (error 1690) when the margin
// is negative — see the same note in admin/scoring.php.
//
// Tie-break ordering: total first; within a week the volume is naturally even,
// so closeness (margin_error) is the more meaningful decider. Overall keeps
// games_scored ahead of margin_error to reward having played more.
$where = $scope === 'week' ? 'WHERE g.kickoff_utc BETWEEN :ws AND :we' : '';
$order = [
    'overall' => 'total DESC, games_scored DESC, margin_error ASC, player_name ASC',
    'week'    => 'total DESC, margin_error ASC, games_scored DESC, player_name ASC',
][$scope];

$sql = "SELECT p.player_name,
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
        $where
        GROUP BY p.player_name
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
        'margin_error'    => (int) $r['margin_error'],
    ];
}

json_out(['leaderboard' => $out]);
