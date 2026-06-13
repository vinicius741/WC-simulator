import { useLanguage } from '../../hooks/useLanguage';
import { usePredictionsAuth } from '../../hooks/usePredictionsAuth';
import { usePredictions } from '../../hooks/usePredictions';
import PredictionsLogin from './PredictionsLogin';
import UpcomingGameCard from './UpcomingGameCard';
import LockedGameCard from './LockedGameCard';
import Leaderboard from './Leaderboard';
import AdminPanel from './AdminPanel';

export default function PredictionsView() {
  const { t } = useLanguage();
  const auth = usePredictionsAuth();
  const data = usePredictions(auth.authenticated);

  if (auth.loading) {
    return <div className="predictions-loading">{t('predLoading')}</div>;
  }

  if (!auth.authenticated) {
    return <PredictionsLogin auth={auth} />;
  }

  const upcoming = data.games.filter((g) => !g.started && g.is_open);
  const locked = data.games.filter((g) => g.started);
  const displayName = auth.isAdmin ? t('predAdmin') : auth.playerName ?? '';

  return (
    <div className="predictions-container">
      <div className="predictions-session-bar">
        <span className="predictions-session-name">
          {t('predSignedInAs', { name: displayName })}
        </span>
        <button className="btn" onClick={auth.logout}>
          {t('predLogout')}
        </button>
      </div>

      {data.error && (
        <div className="predictions-error">
          {data.error}{' '}
          <button className="btn" onClick={data.refresh}>
            {t('predRetry')}
          </button>
        </div>
      )}

      <Leaderboard rows={data.leaderboard} loading={data.loading} />

      <section className="predictions-section">
        <h2 className="section-title">{t('predUpcomingTitle')}</h2>
        <p className="section-desc">{t('predUpcomingDesc')}</p>
        {data.loading && upcoming.length === 0 ? (
          <p className="predictions-empty">{t('predLoading')}</p>
        ) : upcoming.length === 0 ? (
          <p className="predictions-empty">{t('predNoUpcoming')}</p>
        ) : (
          <div className="predictions-games">
            {upcoming.map((g) => (
              <UpcomingGameCard
                key={g.id}
                game={g}
                playerName={auth.playerName}
                onSave={data.save}
              />
            ))}
          </div>
        )}
      </section>

      <section className="predictions-section">
        <h2 className="section-title">{t('predLockedTitle')}</h2>
        <p className="section-desc">{t('predLockedDesc')}</p>
        {locked.length === 0 ? (
          <p className="predictions-empty">{t('predNoLocked')}</p>
        ) : (
          <div className="predictions-games">
            {locked.map((g) => (
              <LockedGameCard key={g.id} game={g} currentName={auth.playerName} />
            ))}
          </div>
        )}
      </section>

      {auth.isAdmin && (
        <section className="predictions-section">
          <h2 className="section-title">{t('predAdminTitle')}</h2>
          <p className="section-desc">{t('predAdminDesc')}</p>
          <AdminPanel games={data.games} onChanged={data.refresh} />
        </section>
      )}
    </div>
  );
}
