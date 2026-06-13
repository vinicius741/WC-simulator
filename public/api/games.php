<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');
require_auth();

$me = current_name();

// All games, soonest first. `started` flags whether kickoff has passed.
$games = $pdo->query(
    'SELECT id, external_id, stage, group_letter, home_team_id, away_team_id,
            home_team_name, away_team_name, home_code, away_code, home_flag, away_flag,
            kickoff_utc, venue, result_home, result_away, is_open,
            (kickoff_utc <= UTC_TIMESTAMP()) AS started
     FROM games
     ORDER BY kickoff_utc ASC, id ASC'
)->fetchAll();

// My own predictions across all games (so upcoming games show "your pick").
$myPredictions = [];
if ($me !== null) {
    $stmt = $pdo->prepare(
        'SELECT game_id, predicted_home, predicted_away, points
         FROM predictions WHERE player_name = :me'
    );
    $stmt->execute([':me' => $me]);
    foreach ($stmt->fetchAll() as $row) {
        $myPredictions[(int) $row['game_id']] = [
            'predicted_home' => (int) $row['predicted_home'],
            'predicted_away' => (int) $row['predicted_away'],
            'points'         => $row['points'] !== null ? (int) $row['points'] : null,
        ];
    }
}

// Everyone's predictions — but ONLY for games that have already kicked off (anti-cheat).
$revealedByGame = [];
$rows = $pdo->query(
    "SELECT p.game_id, p.player_name, p.predicted_home, p.predicted_away, p.points
     FROM predictions p
     JOIN games g ON g.id = p.game_id
     WHERE g.kickoff_utc <= UTC_TIMESTAMP()
     ORDER BY p.game_id, p.player_name"
)->fetchAll();
foreach ($rows as $row) {
    $gid = (int) $row['game_id'];
    $revealedByGame[$gid][] = [
        'player_name'    => (string) $row['player_name'],
        'predicted_home' => (int) $row['predicted_home'],
        'predicted_away' => (int) $row['predicted_away'],
        'points'         => $row['points'] !== null ? (int) $row['points'] : null,
    ];
}

$out = [];
foreach ($games as $g) {
    $id      = (int) $g['id'];
    $started = (int) $g['started'] === 1;
    $out[] = [
        'id'             => $id,
        'external_id'    => $g['external_id'],
        'stage'          => $g['stage'],
        'group_letter'   => $g['group_letter'],
        'home_team_id'   => $g['home_team_id'],
        'away_team_id'   => $g['away_team_id'],
        'home_team_name' => $g['home_team_name'],
        'away_team_name' => $g['away_team_name'],
        'home_code'      => $g['home_code'],
        'away_code'      => $g['away_code'],
        'home_flag'      => $g['home_flag'],
        'away_flag'      => $g['away_flag'],
        // MySQL DATETIME in UTC, e.g. "2026-06-13 22:00:00". Client parses with a trailing 'Z'.
        'kickoff_utc'    => $g['kickoff_utc'],
        'venue'          => $g['venue'],
        'is_open'        => (int) $g['is_open'] === 1,
        'started'        => $started,
        'result_home'    => $g['result_home'] !== null ? (int) $g['result_home'] : null,
        'result_away'    => $g['result_away'] !== null ? (int) $g['result_away'] : null,
        'my_prediction'  => $myPredictions[$id] ?? null,
        'predictions'    => $started ? ($revealedByGame[$id] ?? []) : null,
    ];
}

json_out(['games' => $out]);
