import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import type { LeaderboardRow, PredictionGame } from '../types';

export interface PredictionsData {
  games: PredictionGame[];
  leaderboard: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (gameId: number, predictedHome: number, predictedAway: number, playerName: string) => Promise<void>;
}

/**
 * Loads games + leaderboard for the Predictions tab and exposes a save()
 * that upserts a prediction then refreshes both.
 */
export function usePredictions(enabled: boolean): PredictionsData {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [g, l] = await Promise.all([api.getGames(), api.getLeaderboard()]);
      setGames(g);
      setLeaderboard(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  const save = useCallback(
    async (gameId: number, predictedHome: number, predictedAway: number, playerName: string) => {
      await api.savePrediction(gameId, predictedHome, predictedAway, playerName);
      await refresh();
    },
    [refresh],
  );

  return { games, leaderboard, loading, error, refresh, save };
}
