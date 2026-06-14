import { useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import type { LiveMatch } from '../types';

const POLL_MS = 60_000; // gentle cadence; the proxy's 45s cache bounds upstream load

export interface LiveGamesData {
  liveByGameId: Map<number, LiveMatch>;
  fetchedAt: number | null; // epoch ms of the last successful poll
  stale: boolean; // true when the last poll failed (last-good data still shown)
}

/**
 * Polls the live scoreboard while a game could plausibly be in play.
 *
 * Polling runs only when `active` (= authenticated AND at least one game is in
 * the live window: kicked off but not yet finalized). When nothing could be live
 * the interval is never set — zero requests. It also pauses whenever the tab is
 * hidden (Page Visibility API) and refetches immediately on return.
 *
 * On error it keeps the last-good data and flags `stale`, so a transient blip
 * never blanks the board or crashes the page.
 */
export function useLiveGames(active: boolean): LiveGamesData {
  const [liveByGameId, setMap] = useState<Map<number, LiveMatch>>(() => new Map());
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!active) {
      // No game could be live → stop polling entirely (and clear stale state).
      setMap(new Map());
      setStale(false);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (document.hidden) return; // don't burn requests on a backgrounded tab
      try {
        const res = await api.getLive();
        if (cancelled) return;
        const next = new Map<number, LiveMatch>();
        for (const lm of res.live) next.set(lm.game_id, lm);
        setMap(next);
        setFetchedAt(Date.now());
        setStale(false);
      } catch {
        if (cancelled) return;
        setStale(true); // keep the last-good map; just flag it
      }
    };

    void poll(); // immediate first fetch on activation
    const id = window.setInterval(() => void poll(), POLL_MS);

    const onVisibility = () => {
      if (!document.hidden) void poll(); // refetch when the tab comes back
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active]);

  return { liveByGameId, fetchedAt, stale };
}
