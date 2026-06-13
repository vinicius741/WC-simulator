<?php
define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_admin();

$body = read_json_body();

$externalId = is_string($body['external_id'] ?? null) ? trim($body['external_id']) : '';
if ($externalId === '' || strlen($externalId) > 40) {
    json_error(400, 'A valid external_id is required (e.g. "group-A-1").');
}

$strField = function (string $key, ?string $default, int $max) use ($body): ?string {
    $val = $body[$key] ?? $default;
    if ($val === null) {
        return null;
    }
    $val = is_string($val) ? trim($val) : '';
    if ($val === '') {
        return $default;
    }
    if (mb_strlen($val) > $max) {
        json_error(400, "Field $key is too long.");
    }
    return $val;
};

$stage        = $strField('stage', 'group', 20);
$groupLetter  = $strField('group_letter', null, 1);
$homeTeamId   = $strField('home_team_id', null, 16);
$awayTeamId   = $strField('away_team_id', null, 16);
$homeTeamName = $strField('home_team_name', '', 80);
$awayTeamName = $strField('away_team_name', '', 80);
$homeCode     = $strField('home_code', null, 6);
$awayCode     = $strField('away_code', null, 6);
$homeFlag     = $strField('home_flag', null, 16);
$awayFlag     = $strField('away_flag', null, 16);
$venue        = $strField('venue', null, 120);

if ($homeTeamName === '' || $awayTeamName === '') {
    json_error(400, 'Both team names are required.');
}

$kickoffIn = is_string($body['kickoff_utc'] ?? null) ? trim($body['kickoff_utc']) : '';
$ts = strtotime($kickoffIn . ' UTC');
if ($ts === false) {
    json_error(400, 'Invalid kickoff_utc (use YYYY-MM-DD HH:MM:SS, UTC).');
}
$kickoffUtc = gmdate('Y-m-d H:i:s', $ts);

$isOpen = isset($body['is_open']) ? (((bool) $body['is_open']) ? 1 : 0) : 1;

// Upsert by external_id.
$sql = 'INSERT INTO games
    (external_id, stage, group_letter, home_team_id, away_team_id,
     home_team_name, away_team_name, home_code, away_code, home_flag, away_flag,
     kickoff_utc, venue, is_open)
    VALUES
    (:external_id, :stage, :group_letter, :home_team_id, :away_team_id,
     :home_team_name, :away_team_name, :home_code, :away_code, :home_flag, :away_flag,
     :kickoff_utc, :venue, :is_open)
    ON DUPLICATE KEY UPDATE
     stage = :stage, group_letter = :group_letter, home_team_id = :home_team_id, away_team_id = :away_team_id,
     home_team_name = :home_team_name, away_team_name = :away_team_name, home_code = :home_code, away_code = :away_code,
     home_flag = :home_flag, away_flag = :away_flag, kickoff_utc = :kickoff_utc, venue = :venue, is_open = :is_open';

$stmt = $pdo->prepare($sql);
$params = [
    ':external_id'    => $externalId,
    ':stage'          => $stage,
    ':group_letter'   => $groupLetter,
    ':home_team_id'   => $homeTeamId,
    ':away_team_id'   => $awayTeamId,
    ':home_team_name' => $homeTeamName,
    ':away_team_name' => $awayTeamName,
    ':home_code'      => $homeCode,
    ':away_code'      => $awayCode,
    ':home_flag'      => $homeFlag,
    ':away_flag'      => $awayFlag,
    ':kickoff_utc'    => $kickoffUtc,
    ':venue'          => $venue,
    ':is_open'        => $isOpen,
];
foreach ($params as $k => $v) {
    $stmt->bindValue($k, $v, $v === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
}
$stmt->execute();

$getId = $pdo->prepare('SELECT id FROM games WHERE external_id = :e');
$getId->execute([':e' => $externalId]);
$id = (int) $getId->fetchColumn();

json_out(['ok' => true, 'id' => $id, 'external_id' => $externalId]);
