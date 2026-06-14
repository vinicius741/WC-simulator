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

    return $score->rowCount();
}
