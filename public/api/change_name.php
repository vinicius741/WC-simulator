<?php
// Self-service rename for a signed-in family member.
//
// `player_name` is this system's only identity (there is no users table), so a
// rename must move the player's whole footprint — their session(s) and every
// prediction they have made — to the new name atomically. Otherwise the old
// typo'd name would linger on past picks and split them on the leaderboard.
//
// A name already used by a different player is rejected (409) so two people
// can't be merged by accident.

define('APP_RUNNING', true);
require __DIR__ . '/bootstrap.php';
require_method('POST');
require_auth();

$old = current_name();
// Admin sessions carry no player name, so there is nothing for them to rename.
if ($old === null) {
    json_error(400, 'Only players with a name can change it.');
}

$body = read_json_body();
$new = is_string($body['new_name'] ?? null) ? trim($body['new_name']) : '';

// Validate the new name with the same rules as login.php / invite_login.php.
if ($new === '') {
    json_error(400, 'Please enter your name.');
}
if (mb_strlen($new) > 40) {
    json_error(400, 'Name is too long.');
}

// Nothing to do if the name is unchanged (exact, case-sensitive match).
if ($new !== $old) {
    // Reject if a DIFFERENT player already uses this name. The default collation
    // is case-insensitive, so `= :new` catches "Dad"/"dad"; `<> :old` exempts a
    // pure case-only change of the renamer's own identity.
    $taken = $pdo->prepare(
        'SELECT 1 FROM predictions WHERE player_name = :new AND player_name <> :old LIMIT 1'
    );
    $taken->execute([':new' => $new, ':old' => $old]);
    $collision = $taken->fetch() !== false;

    if (!$collision) {
        $taken = $pdo->prepare(
            'SELECT 1 FROM sessions
             WHERE player_name = :new AND player_name <> :old AND expires_at > UTC_TIMESTAMP()
             LIMIT 1'
        );
        $taken->execute([':new' => $new, ':old' => $old]);
        $collision = $taken->fetch() !== false;
    }

    if ($collision) {
        json_error(409, 'That name is already taken.');
    }

    // Atomically rename across the player's sessions and all of their predictions.
    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare('UPDATE sessions SET player_name = :new WHERE player_name = :old');
        $upd->execute([':new' => $new, ':old' => $old]);

        $upd = $pdo->prepare('UPDATE predictions SET player_name = :new WHERE player_name = :old');
        $upd->execute([':new' => $new, ':old' => $old]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        // 23000 = integrity constraint (e.g. a concurrent rename hit the
        // UNIQUE(game_id, player_name)). Surface that as a friendly collision.
        if ((string) $e->getCode() === '23000') {
            json_error(409, 'That name is already taken.');
        }
        throw $e;
    }
}

json_out(['ok' => true, 'player_name' => $new]);
