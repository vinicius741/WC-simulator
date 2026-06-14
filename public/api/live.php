<?php
// In-play (LIVE) matches for the Predictions scoreboard.
//
// A thin, read-only, file-cached proxy to the same fixtures feed that
// admin/sync_results.php uses for FINAL results — but here we read the live
// status (ESPN status.state === 'in' / FIFA MatchStatus 3) instead of finished.
//
// Why a server-side proxy (not a browser fetch): CORS on api.fifa.com /
// site.api.espn.com is unreliable from the browser, and this keeps the live
// source identical to the finals source (same feed, same team-code matching in
// lib/fixtures.php), so a live score maps to the same `games` row its final
// result will.
//
// Caching: the upstream response is cached to a temp file for LIVE_CACHE_TTL
// seconds, so any number of family members polling share ONE upstream fetch per
// window — shared-hosting load stays tiny regardless of client count.
//
//   GET  → { fetched_at, source, live: [ { game_id, home_score, away_score,
//                                          minute, phase } ] }   (auth-gated)
//   CLI  → `php live.php [espn|fifa]` prints the raw normalized LIVE feed
//          (no DB/auth) — a quick "what is the source saying right now?" check.
//
// No DB writes, no schema change. When a match finishes it drops out of `live`,
// and the daily cron / admin "Sync now" writes the final result as usual.

define('APP_RUNNING', true);

const LIVE_CACHE_TTL = 45; // seconds — bounds upstream fetches to ~1.3/min globally

// ---------------------------------------------------------------------------
// CLI demo mode — raw normalized live feed, no DB/auth required.
// ---------------------------------------------------------------------------
if (php_sapi_name() === 'cli') {
    require __DIR__ . '/lib/fixtures.php';
    $src = isset($argv[1]) ? (string) $argv[1] : 'espn';
    if ($src !== 'fifa') {
        $src = 'espn';
    }
    try {
        $matches = fetch_source_matches($src, 'live');
    } catch (Throwable $e) {
        fwrite(STDERR, 'fetch failed: ' . $e->getMessage() . "\n");
        exit(1);
    }
    echo json_encode(
        ['source' => $src, 'count' => count($matches), 'live' => $matches],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE,
    ) . "\n";
    exit(0);
}

// ---------------------------------------------------------------------------
// HTTP mode
// ---------------------------------------------------------------------------
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/fixtures.php';
require_method('GET');
require_auth();

json_out(build_live_response());

/* ====================================================================== */
/* Build the response                                                      */
/* ====================================================================== */

function build_live_response(): array
{
    global $pdo;

    // Default to ESPN for live: it exposes a match minute (FIFA's calendar
    // endpoint does not reliably). config.live_source overrides to 'fifa'.
    $src = get_config($pdo, 'live_source');
    if ($src !== 'fifa') {
        $src = 'espn';
    }

    $matches = live_matches_cached($src);

    // Match live source games to ours. Only games not yet finalized can be live.
    $rows = $pdo->query(
        'SELECT id, home_code, away_code, kickoff_utc
         FROM games
         WHERE result_home IS NULL
           AND home_code IS NOT NULL AND away_code IS NOT NULL'
    )->fetchAll();

    // Index by sorted code-pair → list of games (>1 only if a pair can meet
    // twice; disambiguated by kickoff, same as sync_results.php).
    $index = [];
    foreach ($rows as $g) {
        $index[pair_key($g['home_code'], $g['away_code'])][] = $g;
    }

    $live = [];
    foreach ($matches as $m) {
        $candidates = $index[pair_key($m['home_code'], $m['away_code'])] ?? null;
        if (!$candidates) {
            continue; // live match we haven't seeded (e.g. a knockout not yet drawn)
        }
        $game = count($candidates) === 1 ? $candidates[0] : pick_by_kickoff($candidates, $m['kickoff_iso']);
        [$h, $a] = align_score($game, $m);

        $live[] = [
            'game_id'    => (int) $game['id'],
            'home_score' => $h,
            'away_score' => $a,
            'minute'     => $m['minute'],
            'phase'      => $m['phase'],
        ];
    }

    return [
        'fetched_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'source'     => $src,
        'live'       => $live,
    ];
}

/**
 * Fetch the normalized LIVE match list, served from a temp-file cache so
 * concurrent clients share one upstream fetch per LIVE_CACHE_TTL window.
 * On a fresh upstream failure, a stale cache (if any) is returned so a
 * transient blip doesn't blank the board; otherwise an empty list.
 */
function live_matches_cached(string $src): array
{
    $file = sys_get_temp_dir() . '/wc-sim-live-' . $src . '.json';

    $fresh = false;
    if (is_file($file) && (time() - (int) filemtime($file)) < LIVE_CACHE_TTL) {
        $cached = @json_decode((string) file_get_contents($file), true);
        if (is_array($cached) && isset($cached['matches']) && is_array($cached['matches'])) {
            return $cached['matches'];
        }
    }

    try {
        $matches = fetch_source_matches($src, 'live');
        $fresh = true;
        // Persist best-effort (temp dir is private, not web-served).
        @file_put_contents(
            $file,
            json_encode(['fetched_at' => gmdate('Y-m-d\TH:i:s\Z'), 'matches' => $matches], JSON_UNESCAPED_UNICODE),
        );
        return $matches;
    } catch (Throwable $e) {
        // Upstream failed. Serve stale cache if we have one; else empty.
        if (is_file($file)) {
            $cached = @json_decode((string) file_get_contents($file), true);
            if (is_array($cached) && isset($cached['matches']) && is_array($cached['matches'])) {
                return $cached['matches'];
            }
        }
        return [];
    }
}
