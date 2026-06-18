import { useEffect, useMemo } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { PredictionGame } from '../../types';
import { teamHistory, type TeamSide } from '../../utils/teamHistory';
import { formatKickoff, teamDisplayName } from './format';

interface Props {
  game: PredictionGame;
  games: PredictionGame[];
  onClose: () => void;
}

export default function TeamHistoryModal({ game, games, onClose }: Props) {
  const { t } = useLanguage();
  const homeGames = useMemo(() => teamHistory(games, game, 'home'), [games, game]);
  const awayGames = useMemo(() => teamHistory(games, game, 'away'), [games, game]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pred-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pred-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose} aria-label={t('predHistoryClose')}>
            ×
          </button>
          <h2 id="pred-history-title">{t('predHistoryTitle')}</h2>
          <p className="pred-history-subtitle">{t('predHistoryDesc')}</p>
        </div>

        <div className="modal-body pred-history-body">
          <HistorySection side="home" selectedGame={game} games={homeGames} />
          <HistorySection side="away" selectedGame={game} games={awayGames} />
        </div>
      </div>
    </div>
  );
}

interface HistorySectionProps {
  side: TeamSide;
  selectedGame: PredictionGame;
  games: PredictionGame[];
}

function HistorySection({ side, selectedGame, games }: HistorySectionProps) {
  const { t, language } = useLanguage();
  const teamId = side === 'home' ? selectedGame.home_team_id : selectedGame.away_team_id;
  const teamName = side === 'home' ? selectedGame.home_team_name : selectedGame.away_team_name;
  const flag = side === 'home' ? selectedGame.home_flag : selectedGame.away_flag;
  const displayName = teamDisplayName(teamId, teamName, t);

  return (
    <section className="pred-history-team">
      <h3>
        <span className="pred-history-flag" aria-hidden="true">{flag ?? ''}</span>
        {displayName}
      </h3>
      {games.length === 0 ? (
        <p className="pred-history-empty">{t('predHistoryEmpty')}</p>
      ) : (
        <ol className="pred-history-list">
          {games.map((pastGame) => (
            <li key={pastGame.id} className="pred-history-game">
              <div className="pred-history-game-meta">
                <span>
                  {pastGame.group_letter
                    ? t('groupLetter', { letter: pastGame.group_letter })
                    : pastGame.stage}
                </span>
                <time>{formatKickoff(pastGame.kickoff_utc, language)}</time>
              </div>
              <div className="pred-history-scoreline">
                <span>{pastGame.home_flag ?? ''} {teamDisplayName(pastGame.home_team_id, pastGame.home_team_name, t)}</span>
                <strong>{pastGame.result_home} – {pastGame.result_away}</strong>
                <span>{pastGame.away_flag ?? ''} {teamDisplayName(pastGame.away_team_id, pastGame.away_team_name, t)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
