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
    <div
      className="
        modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-[15px]
        phone:!items-start phone:!p-[calc(env(safe-area-inset-top)+8px)_max(12px,env(safe-area-inset-right))_calc(env(safe-area-inset-bottom)+12px)_max(12px,env(safe-area-inset-left))]
      "
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="
          modal-content pred-history-modal bg-bg-secondary border-t-4 border-t-crimson w-full max-w-[720px] overflow-hidden relative
          flex flex-col
          phone:!max-h-[calc(100dvh-20px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]
          shadow-[0_4px_25px_rgba(0,0,0,0.15)]
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="pred-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header p-[25px_20px_10px] text-center border-b border-border phone:!pt-[calc(env(safe-area-inset-top)+16px)] phone:!px-4 phone:!pb-2">
          <button
            className="
              modal-close-btn absolute top-3 right-[15px] bg-transparent border-none text-text-muted text-2xl cursor-pointer
              w-11 h-11 min-h-11 flex items-center justify-center
              phone:!top-[calc(env(safe-area-inset-top)+6px)] phone:!right-[calc(env(safe-area-inset-right)+8px)]
            "
            onClick={onClose}
            aria-label={t('predHistoryClose')}
          >
            ×
          </button>
          <h2 id="pred-history-title" className="font-serif text-2xl font-bold text-ink phone:text-xl">{t('predHistoryTitle')}</h2>
          <p className="pred-history-subtitle m-[6px_28px_2px] text-text-secondary font-serif text-[13px] italic">{t('predHistoryDesc')}</p>
        </div>

        <div className="modal-body pred-history-body p-[15px_20px_25px] grid grid-cols-2 gap-5 max-h-[min(65vh,560px)] overflow-y-auto phone:!overflow-visible phone:!flex phone:!flex-col phone:!gap-6 phone:!max-h-none phone:!flex-1">
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
      <h3 className="flex items-center gap-2 m-0 mb-2.5 pb-2 border-b-2 border-navy text-ink font-serif text-lg">
        <span className="pred-history-flag text-2xl" aria-hidden="true">{flag ?? ''}</span>
        {displayName}
      </h3>
      {games.length === 0 ? (
        <p className="pred-history-empty m-0 text-text-muted font-serif text-[13px] italic">{t('predHistoryEmpty')}</p>
      ) : (
        <ol className="pred-history-list flex flex-col gap-2 m-0 p-0 list-none">
          {games.map((pastGame) => (
            <li key={pastGame.id} className="pred-history-game p-[9px_10px] border border-border bg-bg-tertiary">
              <div className="pred-history-game-meta flex justify-between gap-2 mb-[7px] text-text-muted text-[9px] font-bold tracking-[0.35px] uppercase">
                <span>
                  {pastGame.group_letter
                    ? t('groupLetter', { letter: pastGame.group_letter })
                    : pastGame.stage}
                </span>
                <time className="text-right normal-case">{formatKickoff(pastGame.kickoff_utc, language)}</time>
              </div>
              <div className="pred-history-scoreline grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[7px] text-ink text-[11px] phone:!text-xs">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right">
                  {pastGame.home_flag ?? ''} {teamDisplayName(pastGame.home_team_id, pastGame.home_team_name, t)}
                </span>
                <strong className="text-crimson font-serif text-base tabular-nums whitespace-nowrap">
                  {pastGame.result_home} – {pastGame.result_away}
                </strong>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {pastGame.away_flag ?? ''} {teamDisplayName(pastGame.away_team_id, pastGame.away_team_name, t)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
