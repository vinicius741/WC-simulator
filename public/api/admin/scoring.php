<?php
// Shared prediction-scoring logic — the single source of truth for the 3/1/0 rule.
//
// Used by both:
//   - admin/result.php   (manual entry via the /admin panel)
//   - admin/sync_results.php (automatic pull of real results)
//
//   rescore_game(PDO $pdo, int $gameId, int $home, int $away): int
//     Re-derives every prediction's `points` for one game against the given final
//     score and returns the number of prediction rows touched. Idempotent:
//     re-running with the same score leaves points unchanged. Reads
//     points_exact / points_result from `config` (default 3 / 1).
//
// Note: predicted_home/predicted_away are TINYINT UNSIGNED, so a raw
// `predicted_home - predicted_away` is evaluated as BIGINT UNSIGNED and throws
// error 1690 ("out of range") whenever the difference is negative (any pick
// where home < away). CAST(... AS SIGNED) makes the subtraction signed.

declare(strict_types=1);

function rescore_game(PDO $pdo, int $gameId, int $home, int $away): int
{
    $exact  = (int) (get_config($pdo, 'points_exact')  ?? 3);
    $result = (int) (get_config($pdo, 'points_result') ?? 1);

    $gameStmt = $pdo->prepare('SELECT stage, penalty_winner FROM games WHERE id = :id LIMIT 1');
    $gameStmt->execute([':id' => $gameId]);
    $game = $gameStmt->fetch();
    $isKnockout = $game && $game['stage'] !== 'group';
    $actualPenalty = $game && $home === $away ? ($game['penalty_winner'] ?? null) : null;

    if ($isKnockout && $home === $away && $actualPenalty !== 'home' && $actualPenalty !== 'away') {
        $pending = $pdo->prepare('UPDATE predictions SET points = NULL WHERE game_id = :id');
        $pending->execute([':id' => $gameId]);
        return $pending->rowCount();
    }

    if ($actualPenalty === 'home' || $actualPenalty === 'away') {
        $score = $pdo->prepare(
            'UPDATE predictions
                SET points = CASE
                    WHEN predicted_home = :h
                     AND predicted_away = :a
                     AND predicted_penalty_winner = :actual_winner
                    THEN :ex
                    WHEN (
                        CASE
                            WHEN predicted_home > predicted_away THEN \'home\'
                            WHEN predicted_home < predicted_away THEN \'away\'
                            ELSE predicted_penalty_winner
                        END
                    ) = :actual_winner2
                    THEN :rs
                    ELSE 0
                END
              WHERE game_id = :id'
        );
        $score->execute([
            ':h'              => $home,
            ':a'              => $away,
            ':actual_winner'  => $actualPenalty,
            ':ex'             => $exact,
            ':actual_winner2' => $actualPenalty,
            ':rs'             => $result,
            ':id'             => $gameId,
        ]);
    } else {
        $score = $pdo->prepare(
            'UPDATE predictions
                SET points = CASE
                    WHEN predicted_home = :h AND predicted_away = :a THEN :ex
                    WHEN SIGN(CAST(predicted_home AS SIGNED) - CAST(predicted_away AS SIGNED)) = SIGN(:h2 - :a2) THEN :rs
                    ELSE 0
                END
              WHERE game_id = :id'
        );
        $score->execute([
            ':h'  => $home,
            ':a'  => $away,
            ':ex' => $exact,
            ':h2' => $home,
            ':a2' => $away,
            ':rs' => $result,
            ':id' => $gameId,
        ]);
    }

    return $score->rowCount();
}
