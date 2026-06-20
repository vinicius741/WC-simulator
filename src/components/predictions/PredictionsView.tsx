import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { usePredictionsAuth } from '../../hooks/usePredictionsAuth';
import { usePredictions } from '../../hooks/usePredictions';
import { useLiveGames } from '../../hooks/useLiveGames';
import PredictionsLogin from './PredictionsLogin';
import InviteLogin from './InviteLogin';
import UpcomingGameCard from './UpcomingGameCard';
import LockedGameCard from './LockedGameCard';
import Leaderboard from './Leaderboard';
import LiveGameSection from './LiveGameSection';
import { adminHref } from '../../utils/routes';
import ChangeNameModal from './ChangeNameModal';
import TeamHistoryModal from './TeamHistoryModal';
import type { PredictionGame } from '../../types';

interface Props {
  inviteToken?: string | null;
}

export default function PredictionsView({ inviteToken }: Props) {
  const { t } = useLanguage();
  const auth = usePredictionsAuth();
  const data = usePredictions(auth.authenticated);
  const [editingName, setEditingName] = useState(false);
  const [historyGame, setHistoryGame] = useState<PredictionGame | null>(null);
  // Live scoreboard: poll only while signed in AND a game could be in play.
  const hasLiveWindow = data.games.some((g) => g.started && g.result_home === null);
  const live = useLiveGames(auth.authenticated && hasLiveWindow);

  if (auth.loading) {
    return <div className="font-serif italic text-text-muted py-3">{t('predLoading')}</div>;
  }

  if (!auth.authenticated) {
    // An invite link takes the visitor straight to a name-only join form;
    // otherwise show the usual password login.
    return inviteToken ? <InviteLogin auth={auth} token={inviteToken} /> : <PredictionsLogin auth={auth} />;
  }

  const upcoming = data.games.filter((g) => !g.started && g.is_open);
  const locked = data.games.filter((g) => g.started);
  const displayName = auth.isAdmin ? t('predAdmin') : auth.playerName ?? '';

  return (
    <div className="mb-[60px] phone:!mb-[calc(60px+env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border pb-3 mb-[25px]">
        <span className="font-serif italic text-text-secondary text-sm">
          {t('predSignedInAs', { name: displayName })}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {!auth.isAdmin && (
            <button className="btn min-w-40 whitespace-nowrap" onClick={() => setEditingName(true)}>
              {t('predChangeName')}
            </button>
          )}
          <button className="btn min-w-40 whitespace-nowrap" onClick={auth.logout}>
            {t('predLogout')}
          </button>
        </div>
      </div>

      {auth.isAdmin && (
        <a
          className="group flex items-center justify-between gap-3.5 mt-2 mb-6 p-4 px-[18px] bg-bg-tertiary border border-border border-l-4 border-l-gold no-underline text-inherit transition-[border-color,transform] duration-200 ease-out hover:!border-l-crimson hover:translate-x-0.5"
          href={adminHref()}
        >
          <span className="flex flex-col gap-[3px]">
            <span className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px]">{t('predAdminTitle')}</span>
            <span className="font-sans text-[13px] text-text-secondary">{t('adminGoToDesc')}</span>
          </span>
          <span className="text-xl text-navy font-bold group-hover:!text-crimson" aria-hidden="true">→</span>
        </a>
      )}

      {editingName && (
        <ChangeNameModal
          auth={auth}
          onClose={() => setEditingName(false)}
          onSaved={data.refresh}
        />
      )}

      {historyGame && (
        <TeamHistoryModal
          game={historyGame}
          games={data.games}
          onClose={() => setHistoryGame(null)}
        />
      )}

      {data.error && (
        <div
          className="text-[13px] mb-5 py-2.5 px-3.5"
          style={{ background: 'rgba(176, 0, 0, 0.08)', borderLeft: '4px solid var(--accent-red)', color: 'var(--accent-red)' }}
        >
          {data.error}{' '}
          <button className="btn" onClick={data.refresh}>
            {t('predRetry')}
          </button>
        </div>
      )}

      <LiveGameSection
        games={data.games}
        liveByGameId={live.liveByGameId}
        currentName={auth.playerName}
        fetchedAt={live.fetchedAt}
        stale={live.stale}
      />

      <Leaderboard
        rows={data.leaderboard}
        scope={data.scope}
        onScopeChange={data.setScope}
        loading={data.loading}
      />

      <section className="mb-10">
        <h2 className="section-title">{t('predUpcomingTitle')}</h2>
        <p className="section-desc">{t('predUpcomingDesc')}</p>
        {data.loading && upcoming.length === 0 ? (
          <p className="font-serif italic text-text-muted py-3">{t('predLoading')}</p>
        ) : upcoming.length === 0 ? (
          <p className="font-serif italic text-text-muted py-3">{t('predNoUpcoming')}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4 phone:!grid-cols-1 phone:!gap-3.5">
            {upcoming.map((g) => (
              <UpcomingGameCard
                key={g.id}
                game={g}
                playerName={auth.playerName}
                onSave={data.save}
                onOpenHistory={() => setHistoryGame(g)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="section-title">{t('predLockedTitle')}</h2>
        <p className="section-desc">{t('predLockedDesc')}</p>
        {locked.length === 0 ? (
          <p className="font-serif italic text-text-muted py-3">{t('predNoLocked')}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4 phone:!grid-cols-1 phone:!gap-3.5">
            {locked.map((g) => (
              <LockedGameCard key={g.id} game={g} currentName={auth.playerName} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
