import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import type { LeaderboardRow, LeaderboardScope, PredictionGame } from '../types';

export interface PredictionsData {
  games: PredictionGame[];
  leaderboard: LeaderboardRow[];
  scope: LeaderboardScope;
  setScope: (scope: LeaderboardScope) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (
    gameId: number,
    predictedHome: number,
    predictedAway: number,
    playerName: string,
    predictedPenaltyWinner?: 'home' | 'away' | null,
  ) => Promise<void>;
}

/**
 * Loads games + leaderboard for the Predictions tab and exposes a save()
 * that upserts a prediction then refreshes both.
 *
 * The leaderboard supports two scopes (overall / week); only the leaderboard is
 * re-fetched when the scope changes — the game list is scope-independent, so
 * we avoid a redundant round-trip.
 */
export function usePredictions(enabled: boolean): PredictionsData {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [scope, setScope] = useState<LeaderboardScope>('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Full refresh: both games and the leaderboard for the active scope.
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [g, l] = await Promise.all([api.getGames(), api.getLeaderboard(scope)]);
      setGames(g);
      setLeaderboard(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  // Scope change: only the leaderboard depends on it, so fetch games once and
  // swap the leaderboard without a second getGames() call.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .getLeaderboard(scope)
      .then((l) => {
        if (!cancelled) setLeaderboard(l);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, scope]);

  const save = useCallback(
    async (
      gameId: number,
      predictedHome: number,
      predictedAway: number,
      playerName: string,
      predictedPenaltyWinner?: 'home' | 'away' | null,
    ) => {
      await api.savePrediction(gameId, predictedHome, predictedAway, playerName, predictedPenaltyWinner);
      await refresh();
    },
    [refresh],
  );

  return { games, leaderboard, scope, setScope, loading, error, refresh, save };
}
