import { useLanguage } from '../../hooks/useLanguage';
import { formatKickoff, pointsClass, teamDisplayName } from './format';
import type { PredictionGame, RevealedPrediction } from '../../types';

interface Props {
  game: PredictionGame;
  currentName: string | null;
}

const pillClass: Record<string, string> = {
  gold: 'bg-[rgba(197,160,89,0.2)] text-gold-dark',
  navy: 'bg-[rgba(13,30,54,0.1)] text-navy',
  gray: 'bg-bg-tertiary text-text-muted',
  pending: 'bg-transparent text-text-muted',
};

export default function LockedGameCard({ game, currentName }: Props) {
  const { t, language } = useLanguage();
  const hasResult = game.result_home !== null && game.result_away !== null;
  const predictions: RevealedPrediction[] = game.predictions ?? [];
  const homeDisplay = teamDisplayName(game.home_team_id, game.home_team_name, t);
  const awayDisplay = teamDisplayName(game.away_team_id, game.away_team_name, t);

  return (
    <div className="pred-game-card pred-locked bg-card border border-border flex flex-col gap-3 border-t-[3px] border-t-gold p-3.5 phone:!p-3">
      <div className="pred-game-meta flex justify-between items-baseline gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border pb-2">
        <span>
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="text-right font-semibold tracking-normal normal-case">
          {formatKickoff(game.kickoff_utc, language)}
        </span>
      </div>

      <div className="pred-game-match pred-result-row flex items-center justify-between gap-2.5 py-1">
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{homeDisplay}</span>
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.home_flag ?? ''}</span>
        </div>
        <div className="pred-result-score font-serif font-bold text-lg text-crimson whitespace-nowrap tabular-nums">
          {hasResult ? `${game.result_home} – ${game.result_away}` : t('predResultPending')}
        </div>
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-start">
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.away_flag ?? ''}</span>
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{awayDisplay}</span>
        </div>
      </div>

      {predictions.length > 0 && (
        <table className="pred-reveal-table w-full border-collapse text-xs phone:!text-[11px] phone:!table-fixed">
          <thead>
            <tr>
              <th className="text-left font-sans text-[10px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border p-1.5 px-1.5">{t('predPlayerCol')}</th>
              <th className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border p-1.5 px-1.5">{t('predPickCol')}</th>
              <th className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border p-1.5 px-1.5">{t('predPointsCol')}</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p, i) => {
              const me = p.player_name === currentName;
              return (
                <tr key={`${p.player_name}-${i}`} className={me ? '[&_td]:bg-[rgba(176,0,0,0.04)] [&_td]:font-semibold' : ''}>
                  <td className="pred-reveal-name p-1.5 border-b border-border-soft tabular-nums phone:!w-1/2">
                    {p.player_name}
                    {me ? <span className="text-crimson font-bold"> ({t('predYou')})</span> : null}
                  </td>
                  <td className="pred-reveal-pick p-1.5 text-center border-b border-border-soft tabular-nums phone:!w-[26%]">
                    {p.predicted_home} – {p.predicted_away}
                  </td>
                  <td className="p-1.5 text-center border-b border-border-soft tabular-nums phone:!w-[24%]">
                    <span className={`pred-points-pill inline-block min-w-[22px] px-2 py-0.5 rounded-[10px] font-sans font-bold text-[11px] text-center ${pillClass[pointsClass(p.points)]}`}>
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
