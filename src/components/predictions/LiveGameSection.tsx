import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import LiveGameCard from './LiveGameCard';
import type { LiveMatch, PredictionGame } from '../../types';

interface Props {
  games: PredictionGame[];
  liveByGameId: Map<number, LiveMatch>;
  currentName: string | null;
  fetchedAt: number | null;
  stale: boolean;
}

/** "updated 12s ago" / "updated 3m ago" — concise relative age. */
function formatAgo(epochMs: number): string {
  const s = Math.max(0, Math.round((Date.now() - epochMs) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

export default function LiveGameSection({ games, liveByGameId, currentName, fetchedAt, stale }: Props) {
  const { t } = useLanguage();
  const liveGames = games.filter((g) => g.started && liveByGameId.has(g.id));

  // Re-render every 15s so the "updated Xs ago" label stays fresh without polling.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (liveGames.length === 0) return null;

  return (
    <section className="predictions-section pred-live-section">
      <h2 className="section-title pred-live-title">
        <span className="pred-live-dot" aria-hidden="true" />
        {t('predLiveTitle')}
      </h2>
      <p className="section-desc pred-live-subtitle">
        {t('predLiveAsItStands')}
        {fetchedAt !== null && (
          <span className="pred-live-updated">
            {' · '}
            {stale ? t('predLiveStale') : t('predLiveUpdatedAgo', { x: formatAgo(fetchedAt) })}
          </span>
        )}
      </p>
      <div className="predictions-games">
        {liveGames.map((g) => (
          <LiveGameCard key={g.id} game={g} live={liveByGameId.get(g.id)!} currentName={currentName} />
        ))}
      </div>
    </section>
  );
}
