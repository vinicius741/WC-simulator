<?php
// Shared bootstrap for every predictions API endpoint.
//
// Responsibilities:
//   1. Guard against direct web access (each endpoint defines APP_RUNNING first).
//   2. Load secrets from above the web root (never shipped, never in git).
//   3. Emit JSON/security headers.
//   4. Open a PDO connection (prepared statements, exceptions on).
//   5. Resolve the bearer's session from the cookie.
//   6. Expose small helpers used by every endpoint.

// Direct-access guard: bootstrap must be require'd by an endpoint, not hit directly.
if (!defined('APP_RUNNING')) {
    http_response_code(403);
    exit('Forbidden');
}

// ---------------------------------------------------------------------------
// 1. Secrets: live at domains/<domain>/wc-sim-secrets.php, ABOVE public_html.
//    From public_html/wc-sim/api/ three '..' lands at domains/<domain>/.
//    That file is therefore outside the rsync target and not web-accessible.
// ---------------------------------------------------------------------------
$secretsPath = __DIR__ . '/../../../wc-sim-secrets.php';
if (!is_file($secretsPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server is not configured (missing secrets file).']);
    exit;
}
require $secretsPath;

// ---------------------------------------------------------------------------
// 2. Headers
// ---------------------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
// SPA and API are same-origin; credentials allowed defensively for any edge cases.
header('Access-Control-Allow-Credentials: true');

// ---------------------------------------------------------------------------
// 3. Error handling — never leak internals to the client.
// ---------------------------------------------------------------------------
set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
set_exception_handler(function (Throwable $e): void {
    http_response_code(500);
    echo json_encode(['error' => 'Server error.']);
    error_log('[wcpred] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    exit;
});

// ---------------------------------------------------------------------------
// 4. PDO
// ---------------------------------------------------------------------------
$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
$pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]);

// ---------------------------------------------------------------------------
// 5. Helpers
// ---------------------------------------------------------------------------
function json_out($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(int $code, string $message): void
{
    json_out(['error' => $message], $code);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) {
        json_error(405, 'Method not allowed.');
    }
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
        return true;
    }
    if (($_SERVER['REQUEST_SCHEME'] ?? '') === 'https') {
        return true;
    }
    return false;
}

function get_config(PDO $pdo, string $key): ?string
{
    $stmt = $pdo->prepare('SELECT config_value FROM config WHERE config_key = :k');
    $stmt->execute([':k' => $key]);
    $val = $stmt->fetchColumn();
    return $val === false ? null : (string) $val;
}

function set_config(PDO $pdo, string $key, string $value): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO config (config_key, config_value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)'
    );
    $stmt->execute([':k' => $key, ':v' => $value]);
}

/** Issue a 30-day session cookie backed by a random token in the `sessions` table. */
function issue_session(PDO $pdo, bool $isAdmin, ?string $playerName): string
{
    $token  = bin2hex(random_bytes(32));
    $ttlSec = 30 * 86400;
    $expires = gmdate('Y-m-d H:i:s', time() + $ttlSec);

    $stmt = $pdo->prepare(
        'INSERT INTO sessions (token, player_name, is_admin, expires_at) VALUES (:t, :n, :a, :e)'
    );
    $stmt->execute([
        ':t' => $token,
        ':n' => $playerName,
        ':a' => $isAdmin ? 1 : 0,
        ':e' => $expires,
    ]);

    setcookie('wcpred_sess', $token, [
        'expires'  => time() + $ttlSec,
        'path'     => '/',
        'secure'   => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    return $token;
}

function destroy_session_cookie(PDO $pdo): void
{
    $cookie = $_COOKIE['wcpred_sess'] ?? '';
    if (is_string($cookie) && ctype_xdigit($cookie) && strlen($cookie) === 64) {
        $stmt = $pdo->prepare('DELETE FROM sessions WHERE token = :t');
        $stmt->execute([':t' => $cookie]);
    }
    setcookie('wcpred_sess', '', [
        'expires'  => 1,
        'path'     => '/',
        'secure'   => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

// ---------------------------------------------------------------------------
// 6. Session resolution
// ---------------------------------------------------------------------------
$CURRENT_SESSION = ['authenticated' => false, 'is_admin' => false, 'player_name' => null];

// Opportunistic cleanup of expired sessions (cheap; avoids needing a cron).
$pdo->exec('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');

$cookie = $_COOKIE['wcpred_sess'] ?? '';
if (is_string($cookie) && ctype_xdigit($cookie) && strlen($cookie) === 64) {
    $stmt = $pdo->prepare(
        'SELECT player_name, is_admin FROM sessions
         WHERE token = :t AND expires_at > UTC_TIMESTAMP() LIMIT 1'
    );
    $stmt->execute([':t' => $cookie]);
    $row = $stmt->fetch();
    if ($row) {
        $CURRENT_SESSION['authenticated'] = true;
        $CURRENT_SESSION['is_admin']      = (int) $row['is_admin'] === 1;
        $CURRENT_SESSION['player_name']   = $row['player_name'] !== null ? (string) $row['player_name'] : null;
    }
}

function require_auth(): void
{
    global $CURRENT_SESSION;
    if (!$CURRENT_SESSION['authenticated']) {
        json_error(401, 'Not authenticated.');
    }
}

function require_admin(): void
{
    global $CURRENT_SESSION;
    require_auth();
    if (!$CURRENT_SESSION['is_admin']) {
        json_error(403, 'Admin only.');
    }
}

function current_name(): ?string
{
    global $CURRENT_SESSION;
    return $CURRENT_SESSION['player_name'];
}
