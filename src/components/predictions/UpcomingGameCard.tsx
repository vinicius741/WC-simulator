import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { formatKickoff, relativeKickoff, teamDisplayName } from './format';
import type { PredictionGame } from '../../types';
import { ApiError } from '../../utils/apiClient';

interface Props {
  game: PredictionGame;
  playerName: string | null;
  onSave: (gameId: number, predictedHome: number, predictedAway: number, playerName: string) => Promise<void>;
  onOpenHistory: () => void;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

export default function UpcomingGameCard({ game, playerName, onSave, onOpenHistory }: Props) {
  const { t, language } = useLanguage();

  const [home, setHome] = useState<string>(
    game.my_prediction ? String(game.my_prediction.predicted_home) : '',
  );
  const [away, setAway] = useState<string>(
    game.my_prediction ? String(game.my_prediction.predicted_away) : '',
  );
  const [status, setStatus] = useState<Status>('idle');
  const [err, setErr] = useState<string | null>(null);

  // Re-sync inputs if the persisted prediction changes after a refresh.
  useEffect(() => {
    setHome(game.my_prediction ? String(game.my_prediction.predicted_home) : '');
    setAway(game.my_prediction ? String(game.my_prediction.predicted_away) : '');
  }, [game.my_prediction]);

  const rel = relativeKickoff(game.kickoff_utc);
  const hasPick = !!game.my_prediction;
  const homeDisplay = teamDisplayName(game.home_team_id, game.home_team_name, t);
  const awayDisplay = teamDisplayName(game.away_team_id, game.away_team_name, t);

  async function save() {
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setErr(t('predInvalidScore'));
      setStatus('error');
      return;
    }
    if (!playerName) {
      setErr(t('predNameRequired'));
      setStatus('error');
      return;
    }
    setStatus('saving');
    setErr(null);
    try {
      await onSave(game.id, h, a, playerName);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('predSaveError'));
      setStatus('error');
    }
  }

  return (
    <div className="pred-game-card bg-card border border-border flex flex-col gap-3 border-t-[3px] border-t-navy p-3.5 phone:!p-3">
      <div className="pred-game-meta flex justify-between items-baseline gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border pb-2 phone:!flex-wrap phone:!row-gap-1">
        <span>
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="text-right font-semibold tracking-normal normal-case phone:!block phone:!w-full phone:!text-right">
          {formatKickoff(game.kickoff_utc, language)}
          {rel && (
            <span className={`text-[10px] phone:!block phone:!w-full phone:!text-right ${rel.dir === 'future' ? 'text-accent-green' : 'text-accent-gray'}`}>
              {' '}· {rel.dir === 'future' ? t('predStartsIn', { x: rel.text }) : t('predStartedAgo', { x: rel.text })}
            </span>
          )}
        </span>
      </div>

      <div className="pred-game-match flex items-center justify-between gap-2.5 phone:!gap-1.5">
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-end phone:!justify-end">
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{homeDisplay}</span>
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.home_flag ?? ''}</span>
        </div>
        <div className="pred-score-inputs flex items-center gap-2 flex-shrink-0">
          <input
            className="pred-score-input w-12 text-center font-sans font-bold text-base p-[7px_4px] border border-border rounded-sm bg-bg-secondary text-ink tabular-nums focus:outline-none focus:border-crimson phone:!w-[52px] phone:!min-h-11 phone:!p-[10px_4px]"
            type="number"
            min={0}
            max={30}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            inputMode="numeric"
            aria-label={homeDisplay}
          />
          <span className="pred-score-sep text-text-muted font-bold">–</span>
          <input
            className="pred-score-input w-12 text-center font-sans font-bold text-base p-[7px_4px] border border-border rounded-sm bg-bg-secondary text-ink tabular-nums focus:outline-none focus:border-crimson phone:!w-[52px] phone:!min-h-11 phone:!p-[10px_4px]"
            type="number"
            min={0}
            max={30}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            inputMode="numeric"
            aria-label={awayDisplay}
          />
        </div>
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-start phone:!justify-start">
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.away_flag ?? ''}</span>
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{awayDisplay}</span>
        </div>
      </div>

      <button
        type="button"
        className="pred-history-open self-center inline-flex items-center gap-1.5 p-[3px_2px] border-0 border-b border-transparent bg-transparent text-navy font-sans text-xs font-bold cursor-pointer hover:border-current focus:border-current focus:outline-none phone:!min-h-11 phone:!p-2"
        onClick={onOpenHistory}
      >
        <span aria-hidden="true">◷</span>
        {t('predHistoryOpen')}
      </button>

      <div className="pred-game-actions flex justify-between items-center gap-2.5">
        <span className="text-xs min-h-4">
          {hasPick && status !== 'saved' && <span className="font-serif italic text-navy">{t('predPickSaved')}</span>}
          {status === 'saved' && <span className="text-accent-green font-semibold">✓ {t('predSaved')}</span>}
          {err && <span className="text-crimson font-semibold">{err}</span>}
        </span>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={status === 'saving' || home === '' || away === ''}
        >
          {status === 'saving' ? t('predSaving') : hasPick ? t('predUpdate') : t('predSave')}
        </button>
      </div>
    </div>
  );
}
