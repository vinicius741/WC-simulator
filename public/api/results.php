<?php
define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('GET');

// Public (unauthenticated) feed of DECIDED knockout results only.
//
// The simulator's Knockout Bracket tab is a public view, so it can't call the
// auth-gated games.php. This endpoint exposes just enough to pre-fill played
// knockout games: stage, team ids, final score, and shootout winner. No
// predictions, player names, or other private data are returned.
//
// A knockout game is "decided" once it has a recorded score and — for a draw —
// a recorded penalty-shootout winner.

$results = $pdo->query(
    "SELECT external_id, stage, home_team_id, away_team_id,
            result_home, result_away, penalty_winner
     FROM games
     WHERE stage IN ('r32','r16','qf','sf','3rd','final')
       AND result_home IS NOT NULL
       AND result_away IS NOT NULL
       AND (result_home <> result_away OR penalty_winner IS NOT NULL)
     ORDER BY kickoff_utc ASC, id ASC"
)->fetchAll();

$out = [];
foreach ($results as $r) {
    $out[] = [
        'external_id'    => (string) $r['external_id'],
        'stage'          => (string) $r['stage'],
        'home_team_id'   => $r['home_team_id'] !== null ? (string) $r['home_team_id'] : null,
        'away_team_id'   => $r['away_team_id'] !== null ? (string) $r['away_team_id'] : null,
        'result_home'    => $r['result_home'] !== null ? (int) $r['result_home'] : null,
        'result_away'    => $r['result_away'] !== null ? (int) $r['result_away'] : null,
        'penalty_winner' => $r['penalty_winner'] !== null ? (string) $r['penalty_winner'] : null,
    ];
}

json_out([
    'fetched_at' => gmdate('Y-m-d H:i:s'),
    'results'    => $out,
]);
