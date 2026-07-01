<?php
// Auto-fetch finished WC2026 results, write them into `games`, and re-score.
//
// This replaces manual result entry. A scheduled run pulls every finished match
// from an official/public JSON feed, matches it to a seeded `games` row by the
// official FIFA 3-letter team codes, creates missing knockout-stage rows from
// FIFA match metadata, fills any result still missing, and re-scores the family
// predictions with the shared 3/1/0 rule (see scoring.php).
//
// Sources (config.sync_source, default 'fifa'):
//   fifa : https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&from=&to=&count=200
//          (official; MatchStatus 0 = finished; Home/Away.Abbreviation = FIFA code)
//   espn : https://site.api.espn.com/.../soccer/fifa.world/scoreboard?dates=
//          (fallback; status.type.completed = finished; team.abbreviation = FIFA code)
// Both expose the FIFA trigramme directly, so matching is a sorted code-pair join —
// no fuzzy name table needed.
//
// Two invocation modes:
//   CLI  : php sync_results.php [--dry-run]   ← Hostinger cron (ungated).
//          --dry-run fetches + matches and prints the plan, writing NOTHING.
//   HTTP : GET  → status {source, force_overwrite, last_sync_at, last_summary,
//                         recent_log[]}                         (admin-gated)
//          POST → run a sync now, returning the summary.
//                 Authorised by an admin session OR ?token=<cron_token>
//                 (the latter lets an optional GitHub Action trigger it).
//
// Safety: by default only games whose result_home IS NULL are filled — a result
// entered by hand is never silently overwritten. Set config.sync_force_overwrite=1
// to let the source correct a divergent stored result.

define('APP_RUNNING', true);
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/scoring.php';
require_once __DIR__ . '/../lib/knockout.php';

$IS_CLI  = php_sapi_name() === 'cli';
$DRY_RUN = false;

if ($IS_CLI) {
    $opts    = getopt('', ['dry-run']);
    $DRY_RUN = isset($opts['dry-run']);
} else {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET') {
        require_admin();
        json_out(sync_status()); // exits
    }
    // POST: admin cookie, or a constant-time cron token (for an external trigger).
    if (!is_admin_request() && !cron_token_ok()) {
        json_error(401, 'Not authenticated.');
    }
}

// Ensure the audit log exists (idempotent; mirrors db/sync_log.sql).
ensure_sync_log_table();

$summary = run_sync($DRY_RUN);

if ($IS_CLI) {
    echo render_cli_summary($summary, $DRY_RUN) . "\n";
    exit($summary['errors'] > 0 ? 1 : 0);
}
json_out($summary);

/* ====================================================================== */
/* Orchestration                                                           */
/* ====================================================================== */

function run_sync(bool $dryRun): array
{
    global $pdo;

    $source = get_config($pdo, 'sync_source');
    if ($source !== 'espn') {
        $source = 'fifa'; // default + whitelist
    }
    $force = get_config($pdo, 'sync_force_overwrite') === '1';

    // run_id = 12 hex chars; cheap correlation key for one invocation's log rows.
    $runId = bin2hex(random_bytes(6));

    $s = [
        'run_id'      => $runId,
        'dry_run'     => $dryRun,
        'source'      => $source,
        'fetched'     => 0,
        'finished'    => 0,
        'filled'      => 0,
        'already_set' => 0,
        'created'     => 0,
        'corrected'   => 0,
        'unmatched'   => 0,
        'skipped'     => 0,
        'errors'      => 0,
        'actions'     => [],
    ];

    // 1. Fetch + normalize finished matches.
    try {
        $matches = $source === 'espn' ? fetch_espn_finished() : fetch_fifa_finished();
    } catch (Throwable $e) {
        log_action($s, $runId, null, 'error', 'fetch failed: ' . $e->getMessage());
        finalize_sync($s);
        return $s;
    }
    $s['fetched']  = count($matches);
    $s['finished'] = count($matches);

    // 2. Load every game. Pair matching only uses rows whose teams are known,
    //    while external_id matching lets us fill TBD knockout rows once FIFA
    //    publishes concrete teams.
    $rows = $pdo->query(
        "SELECT id, external_id, stage, home_team_id, away_team_id, home_team_name, away_team_name,
                home_code, away_code, kickoff_utc, result_home, result_away, penalty_winner
         FROM games"
    )->fetchAll();

    // Index by sorted code-pair → list of games (expect exactly 1; >1 only once a
    // pair can meet twice, e.g. a future knockout rematch — disambiguated by kickoff).
    $index = [];
    $byExternalId = [];
    foreach ($rows as $g) {
        $byExternalId[$g['external_id']] = $g;
        if ($g['home_code'] !== null && $g['away_code'] !== null) {
            $index[pair_key($g['home_code'], $g['away_code'])][] = $g;
        }
    }

    // 3. Match each finished source game to ours and act.
    foreach ($matches as $m) {
        $game = null;
        $sourceExtId = source_is_knockout($m) ? source_external_id($m) : null;

        if ($sourceExtId !== null && isset($byExternalId[$sourceExtId])) {
            $game = $byExternalId[$sourceExtId];
            if (source_is_knockout($m) && game_needs_source_teams($game, $m)) {
                $game = $dryRun ? source_game_row($m, $game) : upsert_source_game($m);
                if (!$dryRun) {
                    $byExternalId[$game['external_id']] = $game;
                    $index[pair_key($game['home_code'], $game['away_code'])][] = $game;
                }
            }
        } else {
            if ($sourceExtId !== null && !$dryRun) {
                $fresh = load_game_by_external_id($sourceExtId);
                if ($fresh !== null) {
                    $game = $fresh;
                    $byExternalId[$game['external_id']] = $game;
                    if ($game['home_code'] !== null && $game['away_code'] !== null) {
                        $index[pair_key($game['home_code'], $game['away_code'])][] = $game;
                    }
                }
            }
            $key = pair_key($m['home_code'], $m['away_code']);
            $candidates = $index[$key] ?? null;
            if ($game === null && $candidates) {
                $sameStage = array_values(array_filter($candidates, function (array $g) use ($m): bool {
                    return ($m['stage'] ?? null) === null || $g['stage'] === $m['stage'];
                }));
                if ($sameStage) {
                    $game = count($sameStage) === 1 ? $sameStage[0] : pick_by_kickoff($sameStage, $m['kickoff_iso']);
                } elseif (!source_is_knockout($m)) {
                    $game = count($candidates) === 1 ? $candidates[0] : pick_by_kickoff($candidates, $m['kickoff_iso']);
                }
            }
        }

        if ($game === null && source_is_knockout($m)) {
            $game = $dryRun ? source_game_row($m) : upsert_source_game($m);
            if (!$dryRun) {
                $byExternalId[$game['external_id']] = $game;
                $index[pair_key($game['home_code'], $game['away_code'])][] = $game;
            }
            log_action($s, $runId, $game['external_id'], 'created',
                "{$game['stage']} {$game['home_code']}-{$game['away_code']} from FIFA match {$m['match_number']}");
        }

        if ($game === null) {
            log_action($s, $runId, null, 'unmatched',
                "{$m['home_code']}-{$m['away_code']} {$m['home_score']}-{$m['away_score']} (no seeded game)");
            continue;
        }

        $drift  = kickoff_drift_hours($game['kickoff_utc'], $m['kickoff_iso']);
        $driftN = ($drift !== null && abs($drift) > 3) ? " \xE2\x9A\xA0 kickoff drift {$drift}h" : '';

        // Align the score to OUR home/away order (sources may swap sides).
        [$h, $a] = align_score($game, $m);
        $penaltyWinner = align_penalty_winner($game, $m);

        $hasResult = $game['result_home'] !== null && $game['result_away'] !== null;
        $penaltyMatches = !needs_penalty_winner($game, $h, $a, $penaltyWinner)
            || (($game['penalty_winner'] ?? null) === $penaltyWinner);

        if (!$hasResult) {
            $generated = ['created' => [], 'updated' => []];
            if (!$dryRun) {
                $generated = apply_result((int) $game['id'], $h, $a, $penaltyWinner);
            }
            log_action($s, $runId, $game['external_id'], 'filled',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']}" . penalty_note($penaltyWinner) . $driftN);
            log_generated_knockout_games($s, $runId, $generated);
        } elseif ((int) $game['result_home'] === $h && (int) $game['result_away'] === $a && $penaltyMatches) {
            log_action($s, $runId, $game['external_id'], 'already_set',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']}" . penalty_note($game['penalty_winner'] ?? null));
        } elseif ($force || ((int) $game['result_home'] === $h && (int) $game['result_away'] === $a && $penaltyWinner !== null)) {
            $generated = ['created' => [], 'updated' => []];
            if (!$dryRun) {
                $generated = apply_result((int) $game['id'], $h, $a, $penaltyWinner);
            }
            log_action($s, $runId, $game['external_id'], 'corrected',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']}" . penalty_note($penaltyWinner)
                . " (was {$game['result_home']}-{$game['result_away']}" . penalty_note($game['penalty_winner'] ?? null) . "){$driftN}");
            log_generated_knockout_games($s, $runId, $generated);
        } else {
            log_action($s, $runId, $game['external_id'], 'skipped',
                "db {$game['result_home']}-{$game['result_away']}" . penalty_note($game['penalty_winner'] ?? null)
                . " vs src {$h}-{$a}" . penalty_note($penaltyWinner) . " (force off){$driftN}");
        }
    }

    finalize_sync($s);
    return $s;
}

/** Persist the result for one game inside a transaction, then re-score it. */
function apply_result(int $gameId, int $home, int $away, ?string $penaltyWinner): array
{
    global $pdo;
    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE games
                SET result_home = :h, result_away = :a, penalty_winner = :pw, result_entered_at = UTC_TIMESTAMP()
              WHERE id = :id'
        );
        $upd->execute([':h' => $home, ':a' => $away, ':pw' => $penaltyWinner, ':id' => $gameId]);
        rescore_game($pdo, $gameId, $home, $away);
        $generated = auto_fill_next_knockout_games($pdo);
        $pdo->commit();
        return $generated;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/* ====================================================================== */
/* Source fetchers — each returns a list of FINISHED, normalized matches  */
/* ====================================================================== */

function fetch_fifa_finished(): array
{
    $url = 'https://api.fifa.com/api/v3/calendar/matches'
        . '?idCompetition=17&count=200&language=en'
        . '&from=2026-06-11T00:00:00Z&to=2026-07-20T23:59:59Z';
    $json = http_get_json($url);

    $out = [];
    foreach ($json['Results'] ?? [] as $r) {
        // MatchStatus: 0 = finished, 1 = scheduled, 3 = live. Only finished.
        if ((int) ($r['MatchStatus'] ?? -1) !== 0) {
            continue;
        }
        $home = $r['Home']['Abbreviation'] ?? null;
        $away = $r['Away']['Abbreviation'] ?? null;
        $hs   = $r['HomeTeamScore'] ?? null;
        $as   = $r['AwayTeamScore'] ?? null;
        if ($home === null || $away === null || $hs === null || $as === null) {
            continue;
        }
        $out[] = [
            'home_code'   => strtoupper((string) $home),
            'away_code'   => strtoupper((string) $away),
            'home_score'  => (int) $hs,
            'away_score'  => (int) $as,
            'home_penalty_score' => isset($r['HomeTeamPenaltyScore']) ? (int) $r['HomeTeamPenaltyScore'] : null,
            'away_penalty_score' => isset($r['AwayTeamPenaltyScore']) ? (int) $r['AwayTeamPenaltyScore'] : null,
            'winner_code'  => source_winner_code($r),
            'kickoff_iso' => (string) ($r['Date'] ?? ''),
            'stage'       => source_stage($r),
            'stage_name'  => localized_description($r['StageName'] ?? []),
            'group_name'  => localized_description($r['GroupName'] ?? []),
            'match_number' => isset($r['MatchNumber']) ? (int) $r['MatchNumber'] : null,
            'home_name'   => source_team_name($r['Home'] ?? [], (string) $home),
            'away_name'   => source_team_name($r['Away'] ?? [], (string) $away),
            'venue'       => localized_description($r['Stadium']['Name'] ?? []),
        ];
    }
    return $out;
}

function fetch_espn_finished(): array
{
    $url  = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720';
    $json = http_get_json($url);

    $out = [];
    foreach ($json['events'] ?? [] as $ev) {
        $comp = $ev['competitions'][0] ?? null;
        if (!$comp) {
            continue;
        }
        if (!($comp['status']['type']['completed'] ?? false)) {
            continue;
        }
        $comps = $comp['competitors'] ?? [];
        if (count($comps) < 2) {
            continue;
        }
        $byHA = [];
        foreach ($comps as $c) {
            $byHA[$c['homeAway'] ?? ''] = $c;
        }
        $home = $byHA['home'] ?? null;
        $away = $byHA['away'] ?? null;
        if (!$home || !$away) {
            continue;
        }
        $hs = $home['score'] ?? null;
        $as = $away['score'] ?? null;
        // abbreviation may sit under .team or directly on the competitor.
        $hc = $home['team']['abbreviation'] ?? $home['abbrev'] ?? $home['abbreviation'] ?? null;
        $ac = $away['team']['abbreviation'] ?? $away['abbrev'] ?? $away['abbreviation'] ?? null;
        if ($hs === null || $as === null || $hc === null || $ac === null) {
            continue;
        }
        $out[] = [
            'home_code'   => strtoupper((string) $hc),
            'away_code'   => strtoupper((string) $ac),
            'home_score'  => (int) $hs,
            'away_score'  => (int) $as,
            'home_penalty_score' => null,
            'away_penalty_score' => null,
            'winner_code'  => null,
            'kickoff_iso' => (string) ($comp['date'] ?? $ev['date'] ?? ''),
            'stage'       => null,
            'stage_name'  => null,
            'group_name'  => null,
            'match_number' => null,
            'home_name'   => (string) ($home['team']['displayName'] ?? $home['team']['name'] ?? $hc),
            'away_name'   => (string) ($away['team']['displayName'] ?? $away['team']['name'] ?? $ac),
            'venue'       => null,
        ];
    }
    return $out;
}

/* ====================================================================== */
/* Source normalization + knockout row upserts                             */
/* ====================================================================== */

function localized_description($items): ?string
{
    if (!is_array($items)) {
        return null;
    }
    foreach ($items as $item) {
        if (($item['Locale'] ?? null) === 'en-GB' && isset($item['Description'])) {
            return (string) $item['Description'];
        }
    }
    foreach ($items as $item) {
        if (isset($item['Description'])) {
            return (string) $item['Description'];
        }
    }
    return null;
}

function source_team_name($team, string $fallbackCode): string
{
    if (is_array($team)) {
        $name = localized_description($team['TeamName'] ?? []);
        if ($name !== null && $name !== '') {
            return $name;
        }
        foreach (['ShortClubName', 'Abbreviation'] as $key) {
            if (!empty($team[$key])) {
                return (string) $team[$key];
            }
        }
    }
    return strtoupper($fallbackCode);
}

function source_winner_code(array $row): ?string
{
    $winner = $row['Winner'] ?? null;
    if ($winner === null || $winner === '') {
        return null;
    }
    foreach (['Home', 'Away'] as $side) {
        $team = $row[$side] ?? [];
        if (is_array($team) && (string) ($team['IdTeam'] ?? '') === (string) $winner) {
            return isset($team['Abbreviation']) ? strtoupper((string) $team['Abbreviation']) : null;
        }
    }
    return null;
}

function source_stage(array $row): ?string
{
    $matchNo = isset($row['MatchNumber']) ? (int) $row['MatchNumber'] : null;
    if ($matchNo !== null) {
        if ($matchNo >= 1 && $matchNo <= 72) return 'group';
        if ($matchNo >= 73 && $matchNo <= 88) return 'r32';
        if ($matchNo >= 89 && $matchNo <= 96) return 'r16';
        if ($matchNo >= 97 && $matchNo <= 100) return 'qf';
        if ($matchNo >= 101 && $matchNo <= 102) return 'sf';
        if ($matchNo === 103) return '3rd';
        if ($matchNo === 104) return 'final';
    }

    $stage = strtolower((string) (localized_description($row['StageName'] ?? []) ?? ''));
    if ($stage === '') return null;
    if (strpos($stage, 'first') !== false) return 'group';
    if (strpos($stage, 'round of 32') !== false) return 'r32';
    if (strpos($stage, 'round of 16') !== false) return 'r16';
    if (strpos($stage, 'quarter') !== false) return 'qf';
    if (strpos($stage, 'semi') !== false) return 'sf';
    if (strpos($stage, 'third') !== false) return '3rd';
    if (strpos($stage, 'final') !== false) return 'final';
    return null;
}

function source_external_id(array $m): ?string
{
    $matchNo = $m['match_number'] ?? null;
    if (!is_int($matchNo) || $matchNo <= 0) {
        return null;
    }
    $stage = $m['stage'] ?? null;
    if (source_is_knockout($m)) {
        return "wc2026-{$stage}-{$matchNo}";
    }
    return null;
}

function source_is_knockout(array $m): bool
{
    $stage = $m['stage'] ?? null;
    return is_string($stage) && $stage !== '' && $stage !== 'group';
}

function source_kickoff_utc(array $m): string
{
    $ts = strtotime((string) ($m['kickoff_iso'] ?? ''));
    return $ts === false ? gmdate('Y-m-d H:i:s') : gmdate('Y-m-d H:i:s', $ts);
}

function source_team_id(string $code): string
{
    return strtolower(trim($code));
}

function game_needs_source_teams(array $game, array $m): bool
{
    return $game['home_code'] === null
        || $game['away_code'] === null
        || strtoupper((string) $game['home_code']) !== strtoupper((string) $m['home_code'])
        || strtoupper((string) $game['away_code']) !== strtoupper((string) $m['away_code']);
}

function source_game_row(array $m, ?array $existing = null): array
{
    $externalId = source_external_id($m);
    if ($externalId === null) {
        throw new RuntimeException('cannot shape source game without external_id');
    }
    return [
        'id' => $existing['id'] ?? 0,
        'external_id' => $externalId,
        'stage' => $m['stage'],
        'home_team_id' => source_team_id($m['home_code']),
        'away_team_id' => source_team_id($m['away_code']),
        'home_team_name' => $m['home_name'] ?: $m['home_code'],
        'away_team_name' => $m['away_name'] ?: $m['away_code'],
        'home_code' => $m['home_code'],
        'away_code' => $m['away_code'],
        'kickoff_utc' => source_kickoff_utc($m),
        'result_home' => $existing['result_home'] ?? null,
        'result_away' => $existing['result_away'] ?? null,
        'penalty_winner' => $existing['penalty_winner'] ?? null,
    ];
}

function upsert_source_game(array $m): array
{
    global $pdo;
    $externalId = source_external_id($m);
    if ($externalId === null || !source_is_knockout($m)) {
        throw new RuntimeException('cannot create game for source match without knockout stage and match number');
    }

    $sql = 'INSERT INTO games
        (external_id, stage, group_letter, home_team_id, away_team_id,
         home_team_name, away_team_name, home_code, away_code, home_flag, away_flag,
         kickoff_utc, venue, is_open)
        VALUES
        (:external_id, :stage, NULL, :home_team_id, :away_team_id,
         :home_team_name, :away_team_name, :home_code, :away_code, NULL, NULL,
         :kickoff_utc, :venue, 1)
        ON DUPLICATE KEY UPDATE
         stage = VALUES(stage), group_letter = VALUES(group_letter),
         home_team_id = VALUES(home_team_id), away_team_id = VALUES(away_team_id),
         home_team_name = VALUES(home_team_name), away_team_name = VALUES(away_team_name),
         home_code = VALUES(home_code), away_code = VALUES(away_code),
         kickoff_utc = VALUES(kickoff_utc), venue = VALUES(venue)';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':external_id'    => $externalId,
        ':stage'          => $m['stage'],
        ':home_team_id'   => source_team_id($m['home_code']),
        ':away_team_id'   => source_team_id($m['away_code']),
        ':home_team_name' => $m['home_name'] ?: $m['home_code'],
        ':away_team_name' => $m['away_name'] ?: $m['away_code'],
        ':home_code'      => $m['home_code'],
        ':away_code'      => $m['away_code'],
        ':kickoff_utc'    => source_kickoff_utc($m),
        ':venue'          => $m['venue'],
    ]);

    $get = $pdo->prepare(
        'SELECT id, external_id, stage, home_team_id, away_team_id, home_team_name, away_team_name,
                home_code, away_code, kickoff_utc, result_home, result_away, penalty_winner
         FROM games WHERE external_id = :external_id LIMIT 1'
    );
    $get->execute([':external_id' => $externalId]);
    $row = $get->fetch();
    if (!$row) {
        throw new RuntimeException("failed to load upserted game {$externalId}");
    }
    return $row;
}

function load_game_by_external_id(string $externalId): ?array
{
    global $pdo;
    $get = $pdo->prepare(
        'SELECT id, external_id, stage, home_team_id, away_team_id, home_team_name, away_team_name,
                home_code, away_code, kickoff_utc, result_home, result_away, penalty_winner
         FROM games WHERE external_id = :external_id LIMIT 1'
    );
    $get->execute([':external_id' => $externalId]);
    $row = $get->fetch();
    return $row ?: null;
}

function http_get_json(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT      => 'wc-sim-sync/1.0 (family predictions)',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($body === false || $code >= 400) {
        throw new RuntimeException("HTTP {$code}" . ($err !== '' ? " ({$err})" : '') . " for {$url}");
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        throw new RuntimeException("non-JSON response from {$url}");
    }
    return $data;
}

/* ====================================================================== */
/* Matching helpers                                                        */
/* ====================================================================== */

/** Sorted "CODEA|CODEB" key — order-independent team-pair identity. */
function pair_key(string $a, string $b): string
{
    $x = strtoupper(trim($a));
    $y = strtoupper(trim($b));
    $pair = [$x, $y];
    sort($pair);
    return implode('|', $pair);
}

/** Map the source's [home,away] score onto OUR row's home/away ordering. */
function align_score(array $game, array $m): array
{
    if (strtoupper((string) $m['home_code']) === strtoupper((string) $game['home_code'])) {
        return [$m['home_score'], $m['away_score']];
    }
    // Source lists our away team first → swap so the score follows our columns.
    return [$m['away_score'], $m['home_score']];
}

function align_penalty_winner(array $game, array $m): ?string
{
    if ((int) $m['home_score'] !== (int) $m['away_score']) {
        return null;
    }

    $sourceWinner = null;
    if (isset($m['home_penalty_score'], $m['away_penalty_score'])
        && $m['home_penalty_score'] !== null
        && $m['away_penalty_score'] !== null
        && (int) $m['home_penalty_score'] !== (int) $m['away_penalty_score']) {
        $sourceWinner = (int) $m['home_penalty_score'] > (int) $m['away_penalty_score'] ? 'home' : 'away';
    } elseif (($m['winner_code'] ?? null) !== null) {
        $winnerCode = strtoupper((string) $m['winner_code']);
        if ($winnerCode === strtoupper((string) $m['home_code'])) {
            $sourceWinner = 'home';
        } elseif ($winnerCode === strtoupper((string) $m['away_code'])) {
            $sourceWinner = 'away';
        }
    }

    if ($sourceWinner !== 'home' && $sourceWinner !== 'away') {
        return null;
    }

    $sourceHomeIsOurHome = strtoupper((string) $m['home_code']) === strtoupper((string) $game['home_code']);
    if ($sourceHomeIsOurHome) {
        return $sourceWinner;
    }
    return $sourceWinner === 'home' ? 'away' : 'home';
}

function needs_penalty_winner(array $game, int $home, int $away, ?string $sourcePenaltyWinner): bool
{
    return ($game['stage'] ?? 'group') !== 'group'
        && $home === $away
        && $sourcePenaltyWinner !== null;
}

function penalty_note(?string $penaltyWinner): string
{
    return $penaltyWinner === 'home' || $penaltyWinner === 'away'
        ? " pens {$penaltyWinner}"
        : '';
}

/** Hours between our stored kickoff (UTC DATETIME) and the source ISO time. */
function kickoff_drift_hours(string $dbKickoffUtc, string $iso): ?float
{
    if ($iso === '') {
        return null;
    }
    $t1 = @strtotime(str_replace(' ', 'T', $dbKickoffUtc) . 'Z');
    $t2 = @strtotime($iso);
    if ($t1 === false || $t2 === false) {
        return null;
    }
    return round(($t2 - $t1) / 3600, 1);
}

function pick_by_kickoff(array $games, string $iso): array
{
    $best = $games[0];
    $bestDrift = PHP_FLOAT_MAX;
    foreach ($games as $g) {
        $d = kickoff_drift_hours($g['kickoff_utc'], $iso);
        $d = $d === null ? PHP_FLOAT_MAX : abs($d);
        if ($d < $bestDrift) {
            $bestDrift = $d;
            $best      = $g;
        }
    }
    return $best;
}

/* ====================================================================== */
/* Logging + status                                                        */
/* ====================================================================== */

function log_action(array &$s, string $runId, ?string $extId, string $action, string $detail): void
{
    $counters = ['filled' => 'filled', 'already_set' => 'already_set', 'created' => 'created', 'corrected' => 'corrected',
                 'unmatched' => 'unmatched', 'skipped' => 'skipped', 'error' => 'errors'];
    if (isset($counters[$action])) {
        $s[$counters[$action]]++;
    }
    $s['actions'][] = strtoupper($action) . ($extId !== null ? " {$extId}" : '') . ": {$detail}";
    if (!$s['dry_run']) {
        insert_sync_log($runId, $extId, $action, $detail);
    }
}

function insert_sync_log(string $runId, ?string $extId, string $action, string $detail): void
{
    global $pdo;
    $stmt = $pdo->prepare(
        'INSERT INTO sync_log (run_id, external_id, action, detail)
         VALUES (:r, :e, :a, :d)'
    );
    $stmt->execute([
        ':r' => $runId,
        ':e' => $extId,
        ':a' => $action,
        ':d' => mb_substr($detail, 0, 250),
    ]);
}

function log_generated_knockout_games(array &$s, string $runId, array $generated): void
{
    foreach ($generated['created'] ?? [] as $externalId) {
        log_action($s, $runId, $externalId, 'created', 'auto-generated next knockout prediction game');
    }
    foreach ($generated['updated'] ?? [] as $externalId) {
        log_action($s, $runId, $externalId, 'corrected', 'updated unplayed next knockout prediction game');
    }
}

function finalize_sync(array $s): void
{
    if ($s['dry_run']) {
        return;
    }
    global $pdo;
    set_config($pdo, 'last_sync_at', gmdate('Y-m-d H:i:s'));
    set_config($pdo, 'last_sync_summary', json_encode([
        'source'      => $s['source'],
        'fetched'     => $s['fetched'],
        'finished'    => $s['finished'],
        'filled'      => $s['filled'],
        'already_set' => $s['already_set'],
        'created'     => $s['created'],
        'corrected'   => $s['corrected'],
        'unmatched'   => $s['unmatched'],
        'skipped'     => $s['skipped'],
        'errors'      => $s['errors'],
        'at'          => gmdate('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE));
}

function sync_status(): array
{
    global $pdo;
    $last = get_config($pdo, 'last_sync_summary');
    $rows = $pdo->query(
        'SELECT created_at, external_id, action, detail
         FROM sync_log ORDER BY id DESC LIMIT 12'
    )->fetchAll();

    return [
        'source'          => get_config($pdo, 'sync_source') ?? 'fifa',
        'force_overwrite' => get_config($pdo, 'sync_force_overwrite') === '1',
        'last_sync_at'    => get_config($pdo, 'last_sync_at'),
        'last_summary'    => $last ? json_decode($last, true) : null,
        'recent_log'      => $rows,
    ];
}

/* ====================================================================== */
/* Auth helpers (HTTP mode) + table bootstrap + CLI rendering              */
/* ====================================================================== */

function is_admin_request(): bool
{
    global $CURRENT_SESSION;
    return !empty($CURRENT_SESSION['authenticated']) && !empty($CURRENT_SESSION['is_admin']);
}

function cron_token_ok(): bool
{
    global $pdo;
    $stored = get_config($pdo, 'cron_token');
    if ($stored === null || $stored === '') {
        return false; // no external trigger configured
    }
    $given = $_SERVER['HTTP_X_CRON_TOKEN'] ?? ($_GET['token'] ?? '');
    if (!is_string($given) || $given === '') {
        return false;
    }
    return hash_equals($stored, (string) $given);
}

function ensure_sync_log_table(): void
{
    global $pdo;
    $pdo->exec("CREATE TABLE IF NOT EXISTS sync_log (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id      CHAR(12)     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external_id VARCHAR(40)  NULL,
  action      VARCHAR(20)  NOT NULL,
  detail      VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_run (run_id),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function render_cli_summary(array $s, bool $dryRun): string
{
    $tag = $dryRun ? '[DRY RUN] ' : '';
    $lines = [
        "{$tag}sync source={$s['source']} fetched={$s['fetched']} finished={$s['finished']}",
        "  filled={$s['filled']} already_set={$s['already_set']} created={$s['created']} corrected={$s['corrected']}"
        . " unmatched={$s['unmatched']} skipped={$s['skipped']} errors={$s['errors']}",
    ];
    foreach ($s['actions'] as $a) {
        $lines[] = '  - ' . $a;
    }
    return implode("\n", $lines);
}
