import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { pointsClass, teamDisplayName } from './format';
import { projectLiveFate, rankFates, summarizeFates, type FateStatus } from '../../utils/liveFate';
import type { LiveMatch, PredictionGame } from '../../types';

interface Props {
  game: PredictionGame;
  live: LiveMatch;
  currentName: string | null;
}

const STATUS_KEY: Record<FateStatus, string> = {
  exact: 'predLiveExact',
  result: 'predLiveOnTrack',
  level: 'predLiveLevel',
  behind: 'predLiveComeback',
  almost_out: 'predLiveAlmostOut',
};

const FATE_STATUS_COLOR: Record<FateStatus, string> = {
  exact: 'text-gold-dark',
  result: 'text-navy',
  level: 'text-[#5b7a99]',
  behind: 'text-[#b8731a]',
  almost_out: 'text-text-muted',
};

const pillClass: Record<string, string> = {
  gold: 'bg-[rgba(197,160,89,0.2)] text-gold-dark',
  navy: 'bg-[rgba(13,30,54,0.1)] text-navy',
  gray: 'bg-bg-tertiary text-text-muted',
  pending: 'bg-transparent text-text-muted',
};

/** Minute + phase → a compact in-play label, localized. */
function minuteLabel(live: LiveMatch, t: (k: string, r?: Record<string, string | number>) => string): {
  minute: string;
  phase: string;
} {
  const phase = live.phase ?? '';
  if (phase.toLowerCase().includes('half-time') || phase.toLowerCase().includes('halftime')) {
    return { minute: t('predLiveHalfTime'), phase: '' };
  }
  return {
    minute: live.minute !== null ? t('predLiveMinute', { minute: live.minute }) : t('predLiveNoMinute'),
    phase,
  };
}

export default function LiveGameCard({ game, live, currentName }: Props) {
  const { t } = useLanguage();
  const predictions = game.predictions ?? [];
  const fates = rankFates(projectLiveFate(live, predictions));
  const summary = summarizeFates(fates);

  const homeDisplay = teamDisplayName(game.home_team_id, game.home_team_name, t);
  const awayDisplay = teamDisplayName(game.away_team_id, game.away_team_name, t);
  const clock = minuteLabel(live, t);

  // Re-trigger the score-change animation whenever the live score moves.
  const prevScore = useRef(`${live.home_score}-${live.away_score}`);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const cur = `${live.home_score}-${live.away_score}`;
    if (cur !== prevScore.current) {
      prevScore.current = cur;
      setBump((b) => b + 1);
    }
  }, [live.home_score, live.away_score]);

  const progressPct = live.minute !== null ? Math.min(100, Math.round((live.minute / 90) * 100)) : null;

  const summaryParts: string[] = [];
  if (summary.onTrack > 0) summaryParts.push(t('predLiveSummaryOnTrack', { n: summary.onTrack }));
  if (summary.inPlay > 0) summaryParts.push(t('predLiveSummaryInPlay', { n: summary.inPlay }));
  if (summary.comeback > 0) summaryParts.push(t('predLiveSummaryComeback', { n: summary.comeback }));
  if (summary.almostOut > 0) summaryParts.push(t('predLiveSummaryOut', { n: summary.almostOut }));

  return (
    <div
      className="pred-game-card pred-live bg-card border border-border flex flex-col gap-3 border-t-[3px] border-t-crimson p-3.5 phone:!p-3 shadow-[0_2px_10px_rgba(176,0,0,0.06)]"
    >
      <div className="pred-live-head flex justify-between items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary border-b border-border pb-2">
        <span>
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="pred-live-clock inline-flex items-center gap-1.5">
          <span className="pred-live-dot" aria-hidden="true" />
          <span className="pred-live-minute text-crimson tracking-normal normal-case tabular-nums">{clock.minute}</span>
          {clock.phase && <span className="pred-live-phase text-text-muted font-medium tracking-normal normal-case">{clock.phase}</span>}
        </span>
      </div>

      <div className="pred-game-match pred-live-score-row flex items-center justify-between gap-2.5 phone:!gap-1.5">
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-end phone:!justify-end">
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{homeDisplay}</span>
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.home_flag ?? ''}</span>
        </div>
        <div key={bump} className="pred-result-score pred-live-score pred-live-score-bump font-serif font-bold text-2xl text-crimson whitespace-nowrap tabular-nums">
          {live.home_score} – {live.away_score}
        </div>
        <div className="pred-team flex items-center gap-2 flex-1 min-w-0 justify-start phone:!justify-start">
          <span className="pred-flag text-[22px] flex-shrink-0 phone:!text-[18px]">{game.away_flag ?? ''}</span>
          <span className="pred-team-name font-serif font-bold text-sm text-ink overflow-hidden text-ellipsis whitespace-nowrap phone:!text-xs phone:!whitespace-normal phone:!leading-tight">{awayDisplay}</span>
        </div>
      </div>

      {progressPct !== null && (
        <div className="pred-live-progress h-[3px] bg-bg-tertiary rounded-sm overflow-hidden" aria-hidden="true">
          <div className="pred-live-progress-bar h-full bg-crimson transition-[width] duration-600 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <p className="pred-live-summary m-0 font-serif italic text-[13px] text-text-secondary">{summaryParts.join(' · ')}</p>

      <ul className="pred-fate-board list-none m-0 p-0 flex flex-col">
        {fates.map((f, i) => {
          const me = f.player_name === currentName;
          return (
            <li
              key={`${f.player_name}-${i}`}
              className={`pred-fate-row grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 py-[7px] px-1 border-b border-border-soft text-xs last:border-b-0 ${me ? '!bg-[rgba(176,0,0,0.05)] !rounded-sm !font-semibold' : ''} pred-fate-${f.status}`}
            >
              <span className={`pred-points-pill inline-block min-w-[22px] px-2 py-0.5 rounded-[10px] font-sans font-bold text-[11px] text-center ${pillClass[pointsClass(f.projectedPoints)]}`}>
                {f.projectedPoints}
              </span>
              <span className="pred-fate-name overflow-hidden text-ellipsis whitespace-nowrap text-ink">
                {f.player_name}
                {me ? <span className="text-crimson font-bold"> ({t('predYou')})</span> : null}
              </span>
              <span className="pred-fate-pick tabular-nums text-text-secondary">
                {f.predicted_home}–{f.predicted_away}
              </span>
              <span className={`pred-fate-status text-[11px] font-bold whitespace-nowrap ${FATE_STATUS_COLOR[f.status]}`}>
                {t(STATUS_KEY[f.status])}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
