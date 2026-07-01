<?php
// Fetch + matching helpers for the World Cup fixtures feed, used by live.php to
// pull LIVE matches for the in-play scoreboard.
//
// The pure matching helpers (pair_key / align_score / pick_by_kickoff /
// kickoff_drift_hours) and http_get_json deliberately MIRROR the equivalents in
// admin/sync_results.php, so a live score and its later final result map to the
// SAME `games` row. The two files are never loaded in the same request (sync
// runs via cron/admin; live via the scoreboard), so there is no redeclaration
// conflict. If you change the matching logic, update BOTH to keep live and
// final results consistent.
//
// The fetchers here are generalized over a status: 'finished' (MatchStatus 0 /
// ESPN completed) or 'live' (MatchStatus 3 / ESPN status.state === 'in').
//
// Sources (both public, no key, both expose the FIFA trigramme directly):
//   fifa : https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&...
//          MatchStatus 0 = finished, 3 = live; Home/Away.Abbreviation = FIFA code.
//   espn : https://site.api.espn.com/.../soccer/fifa.world/scoreboard?dates=
//          status.type.completed = finished; status.state = 'in'; team.abbreviation = code.

// Direct-access guard: this file is require'd by an endpoint that defines
// APP_RUNNING first, never hit directly.
if (!defined('APP_RUNNING')) {
    http_response_code(403);
    exit('Forbidden');
}

/* ====================================================================== */
/* HTTP                                                                   */
/* ====================================================================== */

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
/* Matching helpers (pure)                                                */
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
/* Source fetchers — each returns normalized matches for the given status */
/* Shape per match: [home_code, away_code, home_score, away_score,        */
/*                   kickoff_iso, minute, phase]                           */
/* minute/phase are best-effort (ESPN only); null when unknown.            */
/* ====================================================================== */

function fetch_source_matches(string $source, string $status): array
{
    if ($status !== 'live') {
        $status = 'finished'; // whitelist
    }
    return $source === 'espn' ? fetch_espn_matches($status) : fetch_fifa_matches($status);
}

function fetch_fifa_matches(string $status): array
{
    if ($status === 'live') {
        // Rolling ±2 day window — always brackets today's in-play fixtures,
        // robust to whatever stage the tournament is in.
        $from = gmdate('Y-m-d\T00:00:00\Z', time() - 2 * 86400);
        $to   = gmdate('Y-m-d\T23:59:59\Z', time() + 2 * 86400);
    } else {
        // Fixed full-tournament window (preserves historical sync behaviour).
        $from = '2026-06-11T00:00:00Z';
        $to   = '2026-07-20T23:59:59Z';
    }
    $url  = 'https://api.fifa.com/api/v3/calendar/matches'
          . '?idCompetition=17&count=200&language=en'
          . '&from=' . $from . '&to=' . $to;
    $json = http_get_json($url);

    $want = $status === 'live' ? 3 : 0; // MatchStatus: 0 finished, 3 live
    $out  = [];
    foreach ($json['Results'] ?? [] as $r) {
        if ((int) ($r['MatchStatus'] ?? -1) !== $want) {
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
            // FIFA's calendar endpoint does not expose a reliable live minute.
            'minute'      => null,
            'phase'       => $status === 'live' ? 'Live' : null,
        ];
    }
    return $out;
}

function fetch_espn_matches(string $status): array
{
    if ($status === 'live') {
        // Rolling ±1 day window (ESPN date granularity is whole days).
        $dates = gmdate('Ymd', time() - 86400) . '-' . gmdate('Ymd', time() + 86400);
    } else {
        $dates = '20260611-20260720'; // full tournament window
    }
    $url  = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=' . $dates;
    $json = http_get_json($url);

    $out = [];
    foreach ($json['events'] ?? [] as $ev) {
        $comp = $ev['competitions'][0] ?? null;
        if (!$comp) {
            continue;
        }
        $st = $comp['status'] ?? [];
        $isFinished = (bool) ($st['type']['completed'] ?? false);
        $isLive     = ($st['type']['state'] ?? '') === 'in';
        if ($status === 'finished' && !$isFinished) {
            continue;
        }
        if ($status === 'live' && !$isLive) {
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
            'minute'      => parse_espn_minute($st),
            'phase'       => parse_espn_phase($st),
        ];
    }
    return $out;
}

/**
 * Best-effort current match minute from ESPN status. ESPN exposes
 * status.clock as cumulative match SECONDS (0–5400+), so floor(/60) is the
 * minute; falls back to parsing status.type.shortDetail ("3'", "90'+6'").
 */
function parse_espn_minute(array $status): ?int
{
    $clock = $status['clock'] ?? null;
    if (is_numeric($clock) && (float) $clock > 0) {
        return (int) floor((float) $clock / 60);
    }
    $type = $status['type'] ?? [];
    foreach (['shortDetail', 'detail'] as $k) {
        if (preg_match('/(\d{1,3})/', (string) ($type[$k] ?? ''), $m)) {
            $n = (int) $m[1];
            if ($n >= 0 && $n <= 130) {
                return $n;
            }
        }
    }
    return null;
}

/** Best-effort phase label from ESPN status (1st/2nd half, half-time, …). */
function parse_espn_phase(array $status): ?string
{
    $type = $status['type'] ?? [];
    $desc = strtolower((string) ($type['description'] ?? '') . ' ' . (string) ($type['name'] ?? ''));
    if (strpos($desc, 'half-time') !== false || strpos($desc, 'halftime') !== false) {
        return 'Half-time';
    }
    $period = (int) ($status['period'] ?? 0);
    if ($period === 1) {
        return '1st half';
    }
    if ($period === 2) {
        return '2nd half';
    }
    if (strpos($desc, 'extra') !== false) {
        return 'Extra time';
    }
    return ((string) ($type['state'] ?? '')) === 'in' ? 'Live' : null;
}
