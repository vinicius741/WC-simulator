import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { formatKickoff, relativeKickoff, teamDisplayName } from './format';
import type { PredictionGame } from '../../types';
import { ApiError } from '../../utils/apiClient';

interface Props {
  game: PredictionGame;
  playerName: string | null;
  onSave: (gameId: number, predictedHome: number, predictedAway: number, playerName: string) => Promise<void>;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

export default function UpcomingGameCard({ game, playerName, onSave }: Props) {
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
    <div className="pred-game-card">
      <div className="pred-game-meta">
        <span className="pred-game-group">
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="pred-game-kickoff">
          {formatKickoff(game.kickoff_utc, language)}
          {rel && (
            <span className={`pred-rel pred-rel-${rel.dir}`}>
              {' '}· {rel.dir === 'future' ? t('predStartsIn', { x: rel.text }) : t('predStartedAgo', { x: rel.text })}
            </span>
          )}
        </span>
      </div>

      <div className="pred-game-match">
        <div className="pred-team">
          <span className="pred-flag">{game.home_flag ?? ''}</span>
          <span className="pred-team-name">{homeDisplay}</span>
        </div>
        <div className="pred-score-inputs">
          <input
            className="pred-score-input"
            type="number"
            min={0}
            max={30}
            value={home}
            onChange={(e) => setHome(e.target.value)}
            inputMode="numeric"
            aria-label={homeDisplay}
          />
          <span className="pred-score-sep">–</span>
          <input
            className="pred-score-input"
            type="number"
            min={0}
            max={30}
            value={away}
            onChange={(e) => setAway(e.target.value)}
            inputMode="numeric"
            aria-label={awayDisplay}
          />
        </div>
        <div className="pred-team">
          <span className="pred-flag">{game.away_flag ?? ''}</span>
          <span className="pred-team-name">{awayDisplay}</span>
        </div>
      </div>

      <div className="pred-game-actions">
        <span className="pred-status-text">
          {hasPick && status !== 'saved' && <span className="pred-saved-tag">{t('predPickSaved')}</span>}
          {status === 'saved' && <span className="pred-inline-ok">✓ {t('predSaved')}</span>}
          {err && <span className="pred-inline-error">{err}</span>}
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
