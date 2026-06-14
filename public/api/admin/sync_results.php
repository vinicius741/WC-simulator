<?php
// Auto-fetch finished WC2026 results, write them into `games`, and re-score.
//
// This replaces manual result entry. A scheduled run pulls every finished match
// from an official/public JSON feed, matches it to a seeded `games` row by the
// official FIFA 3-letter team codes, fills any result still missing, and re-scores
// the family predictions with the shared 3/1/0 rule (see scoring.php).
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

    // 2. Load every game whose teams are known (group stage today; the matcher
    //    is pair-based & stage-agnostic so it will keep working for knockouts
    //    once those rows are seeded).
    $rows = $pdo->query(
        "SELECT id, external_id, home_code, away_code, kickoff_utc, result_home, result_away
         FROM games
         WHERE home_code IS NOT NULL AND away_code IS NOT NULL"
    )->fetchAll();

    // Index by sorted code-pair → list of games (expect exactly 1; >1 only once a
    // pair can meet twice, e.g. a future knockout rematch — disambiguated by kickoff).
    $index = [];
    foreach ($rows as $g) {
        $index[pair_key($g['home_code'], $g['away_code'])][] = $g;
    }

    // 3. Match each finished source game to ours and act.
    foreach ($matches as $m) {
        $key        = pair_key($m['home_code'], $m['away_code']);
        $candidates = $index[$key] ?? null;

        if (!$candidates) {
            log_action($s, $runId, null, 'unmatched',
                "{$m['home_code']}-{$m['away_code']} {$m['home_score']}-{$m['away_score']} (no seeded game)");
            continue;
        }

        $game   = count($candidates) === 1 ? $candidates[0] : pick_by_kickoff($candidates, $m['kickoff_iso']);
        $drift  = kickoff_drift_hours($game['kickoff_utc'], $m['kickoff_iso']);
        $driftN = ($drift !== null && abs($drift) > 3) ? " \xE2\x9A\xA0 kickoff drift {$drift}h" : '';

        // Align the score to OUR home/away order (sources may swap sides).
        [$h, $a] = align_score($game, $m);

        $hasResult = $game['result_home'] !== null && $game['result_away'] !== null;

        if (!$hasResult) {
            if (!$dryRun) {
                apply_result((int) $game['id'], $h, $a);
            }
            log_action($s, $runId, $game['external_id'], 'filled',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']}{$driftN}");
        } elseif ((int) $game['result_home'] === $h && (int) $game['result_away'] === $a) {
            log_action($s, $runId, $game['external_id'], 'already_set',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']}");
        } elseif ($force) {
            if (!$dryRun) {
                apply_result((int) $game['id'], $h, $a);
            }
            log_action($s, $runId, $game['external_id'], 'corrected',
                "{$game['home_code']} {$h}-{$a} {$game['away_code']} (was {$game['result_home']}-{$game['result_away']}){$driftN}");
        } else {
            log_action($s, $runId, $game['external_id'], 'skipped',
                "db {$game['result_home']}-{$game['result_away']} vs src {$h}-{$a} (force off){$driftN}");
        }
    }

    finalize_sync($s);
    return $s;
}

/** Persist the result for one game inside a transaction, then re-score it. */
function apply_result(int $gameId, int $home, int $away): void
{
    global $pdo;
    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE games
                SET result_home = :h, result_away = :a, result_entered_at = UTC_TIMESTAMP()
              WHERE id = :id'
        );
        $upd->execute([':h' => $home, ':a' => $away, ':id' => $gameId]);
        rescore_game($pdo, $gameId, $home, $away);
        $pdo->commit();
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
        // Scope to the group stage: seeded games carry a group; knockouts (not yet
        // seeded) would otherwise spam the log as 'unmatched'.
        if (empty($r['GroupName'])) {
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
            'kickoff_iso' => (string) ($r['Date'] ?? ''),
        ];
    }
    return $out;
}

function fetch_espn_finished(): array
{
    $url  = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260627';
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
            'kickoff_iso' => (string) ($comp['date'] ?? $ev['date'] ?? ''),
        ];
    }
    return $out;
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
    $counters = ['filled' => 'filled', 'already_set' => 'already_set', 'corrected' => 'corrected',
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
        "  filled={$s['filled']} already_set={$s['already_set']} corrected={$s['corrected']}"
        . " unmatched={$s['unmatched']} skipped={$s['skipped']} errors={$s['errors']}",
    ];
    foreach ($s['actions'] as $a) {
        $lines[] = '  - ' . $a;
    }
    return implode("\n", $lines);
}
