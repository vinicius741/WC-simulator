<?php
// Backend knockout propagation for prediction games.
//
// When a knockout result is entered or synced, this helper creates the next
// prediction game as soon as both feeder matches are decided. It mirrors the
// frontend bracket schema and official match schedule, but derives team display
// data from the stored feeder rows so it preserves ids, codes, names, and flags.

if (!defined('APP_RUNNING')) {
    http_response_code(403);
    exit('Forbidden');
}

const KO_MATCHES = [
    'R32_1' => ['stage' => 'R32', 'next' => 'R16_2', 'side' => 'home'],
    'R32_2' => ['stage' => 'R32', 'next' => 'R16_1', 'side' => 'home'],
    'R32_3' => ['stage' => 'R32', 'next' => 'R16_2', 'side' => 'away'],
    'R32_4' => ['stage' => 'R32', 'next' => 'R16_3', 'side' => 'home'],
    'R32_5' => ['stage' => 'R32', 'next' => 'R16_1', 'side' => 'away'],
    'R32_6' => ['stage' => 'R32', 'next' => 'R16_3', 'side' => 'away'],
    'R32_7' => ['stage' => 'R32', 'next' => 'R16_4', 'side' => 'home'],
    'R32_8' => ['stage' => 'R32', 'next' => 'R16_4', 'side' => 'away'],
    'R32_9' => ['stage' => 'R32', 'next' => 'R16_6', 'side' => 'home'],
    'R32_10' => ['stage' => 'R32', 'next' => 'R16_6', 'side' => 'away'],
    'R32_11' => ['stage' => 'R32', 'next' => 'R16_5', 'side' => 'home'],
    'R32_12' => ['stage' => 'R32', 'next' => 'R16_5', 'side' => 'away'],
    'R32_13' => ['stage' => 'R32', 'next' => 'R16_8', 'side' => 'home'],
    'R32_14' => ['stage' => 'R32', 'next' => 'R16_7', 'side' => 'home'],
    'R32_15' => ['stage' => 'R32', 'next' => 'R16_8', 'side' => 'away'],
    'R32_16' => ['stage' => 'R32', 'next' => 'R16_7', 'side' => 'away'],

    'R16_1' => ['stage' => 'R16', 'next' => 'QF_1', 'side' => 'home'],
    'R16_2' => ['stage' => 'R16', 'next' => 'QF_1', 'side' => 'away'],
    'R16_3' => ['stage' => 'R16', 'next' => 'QF_3', 'side' => 'home'],
    'R16_4' => ['stage' => 'R16', 'next' => 'QF_3', 'side' => 'away'],
    'R16_5' => ['stage' => 'R16', 'next' => 'QF_2', 'side' => 'home'],
    'R16_6' => ['stage' => 'R16', 'next' => 'QF_2', 'side' => 'away'],
    'R16_7' => ['stage' => 'R16', 'next' => 'QF_4', 'side' => 'home'],
    'R16_8' => ['stage' => 'R16', 'next' => 'QF_4', 'side' => 'away'],

    'QF_1' => ['stage' => 'QF', 'next' => 'SF_1', 'side' => 'home'],
    'QF_2' => ['stage' => 'QF', 'next' => 'SF_1', 'side' => 'away'],
    'QF_3' => ['stage' => 'QF', 'next' => 'SF_2', 'side' => 'home'],
    'QF_4' => ['stage' => 'QF', 'next' => 'SF_2', 'side' => 'away'],

    'SF_1' => ['stage' => 'SF', 'next' => 'FINAL', 'side' => 'home'],
    'SF_2' => ['stage' => 'SF', 'next' => 'FINAL', 'side' => 'away'],

    'PLAYOFF_3RD' => ['stage' => '3RD', 'next' => '', 'side' => ''],
    'FINAL' => ['stage' => 'FINAL', 'next' => '', 'side' => ''],
];

const KO_MATCH_NO = [
    'R32_1' => 73, 'R32_2' => 74, 'R32_3' => 75, 'R32_4' => 76,
    'R32_5' => 77, 'R32_6' => 78, 'R32_7' => 79, 'R32_8' => 80,
    'R32_9' => 81, 'R32_10' => 82, 'R32_11' => 83, 'R32_12' => 84,
    'R32_13' => 85, 'R32_14' => 86, 'R32_15' => 87, 'R32_16' => 88,
    'R16_1' => 89, 'R16_2' => 90, 'R16_3' => 91, 'R16_4' => 92,
    'R16_5' => 93, 'R16_6' => 94, 'R16_7' => 95, 'R16_8' => 96,
    'QF_1' => 97, 'QF_2' => 98, 'QF_3' => 99, 'QF_4' => 100,
    'SF_1' => 101, 'SF_2' => 102, 'PLAYOFF_3RD' => 103, 'FINAL' => 104,
];

const KO_SCHEDULE = [
    'R16_1' => ['kickoff' => '2026-07-04 21:00:00', 'venue' => 'Lincoln Financial Field, Philadelphia'],
    'R16_2' => ['kickoff' => '2026-07-04 17:00:00', 'venue' => 'NRG Stadium, Houston'],
    'R16_3' => ['kickoff' => '2026-07-05 20:00:00', 'venue' => 'MetLife Stadium, East Rutherford'],
    'R16_4' => ['kickoff' => '2026-07-06 00:00:00', 'venue' => 'Estadio Azteca, Mexico City'],
    'R16_5' => ['kickoff' => '2026-07-06 19:00:00', 'venue' => 'AT&T Stadium, Arlington'],
    'R16_6' => ['kickoff' => '2026-07-07 00:00:00', 'venue' => 'Lumen Field, Seattle'],
    'R16_7' => ['kickoff' => '2026-07-07 16:00:00', 'venue' => 'Mercedes-Benz Stadium, Atlanta'],
    'R16_8' => ['kickoff' => '2026-07-07 20:00:00', 'venue' => 'BC Place, Vancouver'],
    'QF_1' => ['kickoff' => '2026-07-09 20:00:00', 'venue' => 'Gillette Stadium, Foxborough'],
    'QF_2' => ['kickoff' => '2026-07-10 19:00:00', 'venue' => 'SoFi Stadium, Inglewood'],
    'QF_3' => ['kickoff' => '2026-07-11 21:00:00', 'venue' => 'Hard Rock Stadium, Miami Gardens'],
    'QF_4' => ['kickoff' => '2026-07-12 01:00:00', 'venue' => 'Arrowhead Stadium, Kansas City'],
    'SF_1' => ['kickoff' => '2026-07-14 19:00:00', 'venue' => 'AT&T Stadium, Arlington'],
    'SF_2' => ['kickoff' => '2026-07-15 19:00:00', 'venue' => 'Mercedes-Benz Stadium, Atlanta'],
    'PLAYOFF_3RD' => ['kickoff' => '2026-07-18 21:00:00', 'venue' => 'Hard Rock Stadium, Miami Gardens'],
    'FINAL' => ['kickoff' => '2026-07-19 19:00:00', 'venue' => 'MetLife Stadium, East Rutherford'],
];

const KO_DB_STAGE = [
    'R16' => 'r16',
    'QF' => 'qf',
    'SF' => 'sf',
    '3RD' => '3rd',
    'FINAL' => 'final',
];

function auto_fill_next_knockout_games(PDO $pdo): array
{
    $created = [];
    $updated = [];

    // Iterate to allow one call to catch up after multiple results were already
    // stored, without relying on the caller to know which target round changed.
    do {
        $changed = false;
        $gamesBySchema = knockout_games_by_schema($pdo);
        $feeders = knockout_feeders();

        foreach (['R16_1', 'R16_2', 'R16_3', 'R16_4', 'R16_5', 'R16_6', 'R16_7', 'R16_8',
                  'QF_1', 'QF_2', 'QF_3', 'QF_4', 'SF_1', 'SF_2', 'FINAL'] as $target) {
            $feeds = $feeders[$target] ?? null;
            if ($feeds === null || $feeds['home'] === '' || $feeds['away'] === '') {
                continue;
            }
            $home = knockout_winner_team($gamesBySchema[$feeds['home']] ?? null);
            $away = knockout_winner_team($gamesBySchema[$feeds['away']] ?? null);
            if ($home === null || $away === null) {
                continue;
            }
            $result = upsert_knockout_prediction_game($pdo, $target, $home, $away);
            if ($result === 'created') {
                $created[] = knockout_external_id_for_schema($target);
                $changed = true;
            } elseif ($result === 'updated') {
                $updated[] = knockout_external_id_for_schema($target);
                $changed = true;
            }
        }

        $sf1Loser = knockout_loser_team($gamesBySchema['SF_1'] ?? null);
        $sf2Loser = knockout_loser_team($gamesBySchema['SF_2'] ?? null);
        if ($sf1Loser !== null && $sf2Loser !== null) {
            $result = upsert_knockout_prediction_game($pdo, 'PLAYOFF_3RD', $sf1Loser, $sf2Loser);
            if ($result === 'created') {
                $created[] = knockout_external_id_for_schema('PLAYOFF_3RD');
                $changed = true;
            } elseif ($result === 'updated') {
                $updated[] = knockout_external_id_for_schema('PLAYOFF_3RD');
                $changed = true;
            }
        }
    } while ($changed);

    return [
        'created' => array_values(array_unique($created)),
        'updated' => array_values(array_unique($updated)),
    ];
}

function knockout_games_by_schema(PDO $pdo): array
{
    $rows = $pdo->query(
        "SELECT id, external_id, stage, home_team_id, away_team_id,
                home_team_name, away_team_name, home_code, away_code,
                home_flag, away_flag, kickoff_utc, result_home, result_away,
                penalty_winner
           FROM games
          WHERE stage <> 'group'"
    )->fetchAll();

    $byMatchNo = array_flip(KO_MATCH_NO);
    $out = [];
    foreach ($rows as $row) {
        if (!preg_match('/-(\d+)$/', (string) $row['external_id'], $m)) {
            continue;
        }
        $schemaId = $byMatchNo[(int) $m[1]] ?? null;
        if ($schemaId !== null) {
            $out[$schemaId] = $row;
        }
    }
    return $out;
}

function knockout_feeders(): array
{
    $feeders = [];
    foreach (KO_MATCHES as $schemaId => $match) {
        if ($match['next'] === '' || $match['side'] === '') {
            continue;
        }
        $target = $match['next'];
        if (!isset($feeders[$target])) {
            $feeders[$target] = ['home' => '', 'away' => ''];
        }
        $feeders[$target][$match['side']] = $schemaId;
    }
    return $feeders;
}

function knockout_winner_side(?array $game): ?string
{
    if ($game === null || $game['result_home'] === null || $game['result_away'] === null) {
        return null;
    }
    $home = (int) $game['result_home'];
    $away = (int) $game['result_away'];
    if ($home > $away) {
        return 'home';
    }
    if ($away > $home) {
        return 'away';
    }
    return ($game['penalty_winner'] === 'home' || $game['penalty_winner'] === 'away')
        ? $game['penalty_winner']
        : null;
}

function knockout_winner_team(?array $game): ?array
{
    $side = knockout_winner_side($game);
    return $side === null ? null : knockout_team_from_side($game, $side);
}

function knockout_loser_team(?array $game): ?array
{
    $winner = knockout_winner_side($game);
    if ($winner === null) {
        return null;
    }
    return knockout_team_from_side($game, $winner === 'home' ? 'away' : 'home');
}

function knockout_team_from_side(array $game, string $side): ?array
{
    $prefix = $side === 'home' ? 'home' : 'away';
    $id = $game["{$prefix}_team_id"] ?? null;
    $name = $game["{$prefix}_team_name"] ?? null;
    if ($id === null || $id === '' || $name === null || $name === '') {
        return null;
    }
    return [
        'id' => (string) $id,
        'name' => (string) $name,
        'code' => $game["{$prefix}_code"] !== null ? (string) $game["{$prefix}_code"] : null,
        'flag' => $game["{$prefix}_flag"] !== null ? (string) $game["{$prefix}_flag"] : null,
    ];
}

function upsert_knockout_prediction_game(PDO $pdo, string $schemaId, array $home, array $away): ?string
{
    $existing = knockout_existing_game($pdo, knockout_external_id_for_schema($schemaId));
    if ($existing !== null && $existing['result_home'] !== null && $existing['result_away'] !== null) {
        return null;
    }

    $sameTeams = $existing !== null
        && (string) $existing['home_team_id'] === $home['id']
        && (string) $existing['away_team_id'] === $away['id'];

    $stage = KO_DB_STAGE[KO_MATCHES[$schemaId]['stage']];
    $schedule = KO_SCHEDULE[$schemaId];
    $stmt = $pdo->prepare(
        'INSERT INTO games
            (external_id, stage, group_letter, home_team_id, away_team_id,
             home_team_name, away_team_name, home_code, away_code, home_flag, away_flag,
             kickoff_utc, venue, is_open)
         VALUES
            (:external_id, :stage, NULL, :home_team_id, :away_team_id,
             :home_team_name, :away_team_name, :home_code, :away_code, :home_flag, :away_flag,
             :kickoff_utc, :venue, 1)
         ON DUPLICATE KEY UPDATE
             stage = VALUES(stage),
             group_letter = VALUES(group_letter),
             home_team_id = VALUES(home_team_id),
             away_team_id = VALUES(away_team_id),
             home_team_name = VALUES(home_team_name),
             away_team_name = VALUES(away_team_name),
             home_code = VALUES(home_code),
             away_code = VALUES(away_code),
             home_flag = VALUES(home_flag),
             away_flag = VALUES(away_flag),
             kickoff_utc = VALUES(kickoff_utc),
             venue = VALUES(venue),
             is_open = VALUES(is_open)'
    );
    $stmt->execute([
        ':external_id' => knockout_external_id_for_schema($schemaId),
        ':stage' => $stage,
        ':home_team_id' => $home['id'],
        ':away_team_id' => $away['id'],
        ':home_team_name' => $home['name'],
        ':away_team_name' => $away['name'],
        ':home_code' => $home['code'],
        ':away_code' => $away['code'],
        ':home_flag' => $home['flag'],
        ':away_flag' => $away['flag'],
        ':kickoff_utc' => $schedule['kickoff'],
        ':venue' => $schedule['venue'],
    ]);

    if ($existing === null) {
        return 'created';
    }
    return $sameTeams ? null : 'updated';
}

function knockout_existing_game(PDO $pdo, string $externalId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT external_id, home_team_id, away_team_id, result_home, result_away
           FROM games
          WHERE external_id = :external_id
          LIMIT 1'
    );
    $stmt->execute([':external_id' => $externalId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function knockout_external_id_for_schema(string $schemaId): string
{
    $stage = KO_DB_STAGE[KO_MATCHES[$schemaId]['stage']];
    return "wc2026-{$stage}-" . KO_MATCH_NO[$schemaId];
}
