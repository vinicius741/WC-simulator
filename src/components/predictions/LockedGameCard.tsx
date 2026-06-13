import { useLanguage } from '../../hooks/useLanguage';
import { formatKickoff, teamDisplayName } from './format';
import type { PredictionGame, RevealedPrediction } from '../../types';

interface Props {
  game: PredictionGame;
  currentName: string | null;
}

function pointsClass(p: number | null): string {
  if (p === null) return 'pending';
  if (p >= 3) return 'gold';
  if (p >= 1) return 'navy';
  return 'gray';
}

export default function LockedGameCard({ game, currentName }: Props) {
  const { t, language } = useLanguage();
  const hasResult = game.result_home !== null && game.result_away !== null;
  const predictions: RevealedPrediction[] = game.predictions ?? [];
  const homeDisplay = teamDisplayName(game.home_team_id, game.home_team_name, t);
  const awayDisplay = teamDisplayName(game.away_team_id, game.away_team_name, t);

  return (
    <div className="pred-game-card pred-locked">
      <div className="pred-game-meta">
        <span className="pred-game-group">
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="pred-game-kickoff">{formatKickoff(game.kickoff_utc, language)}</span>
      </div>

      <div className="pred-game-match pred-result-row">
        <div className="pred-team">
          <span className="pred-flag">{game.home_flag ?? ''}</span>
          <span className="pred-team-name">{homeDisplay}</span>
        </div>
        <div className="pred-result-score">
          {hasResult ? `${game.result_home} – ${game.result_away}` : t('predResultPending')}
        </div>
        <div className="pred-team">
          <span className="pred-flag">{game.away_flag ?? ''}</span>
          <span className="pred-team-name">{awayDisplay}</span>
        </div>
      </div>

      {predictions.length > 0 && (
        <table className="pred-reveal-table">
          <thead>
            <tr>
              <th>{t('predPlayerCol')}</th>
              <th>{t('predPickCol')}</th>
              <th>{t('predPointsCol')}</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => {
              const me = p.player_name === currentName;
              return (
                <tr key={`${p.player_name}-${i}`} className={me ? 'me' : ''}>
                  <td className="pred-reveal-name">
                    {p.player_name}
                    {me ? <span className="pred-you-tag"> ({t('predYou')})</span> : null}
                  </td>
                  <td className="pred-reveal-pick">
                    {p.predicted_home} – {p.predicted_away}
                  </td>
                  <td>
                    <span className={`pred-points-pill ${pointsClass(p.points)}`}>
                      {p.points === null ? '–' : p.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
