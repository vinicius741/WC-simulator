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
    <div className="pred-game-card pred-live">
      <div className="pred-live-head">
        <span className="pred-live-group">
          {game.group_letter ? t('groupLetter', { letter: game.group_letter }) : t('predMatch')}
        </span>
        <span className="pred-live-clock">
          <span className="pred-live-dot" aria-hidden="true" />
          <span className="pred-live-minute">{clock.minute}</span>
          {clock.phase && <span className="pred-live-phase">{clock.phase}</span>}
        </span>
      </div>

      <div className="pred-game-match pred-live-score-row">
        <div className="pred-team">
          <span className="pred-flag">{game.home_flag ?? ''}</span>
          <span className="pred-team-name">{homeDisplay}</span>
        </div>
        <div key={bump} className="pred-result-score pred-live-score pred-live-score-bump">
          {live.home_score} – {live.away_score}
        </div>
        <div className="pred-team">
          <span className="pred-flag">{game.away_flag ?? ''}</span>
          <span className="pred-team-name">{awayDisplay}</span>
        </div>
      </div>

      {progressPct !== null && (
        <div className="pred-live-progress" aria-hidden="true">
          <div className="pred-live-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <p className="pred-live-summary">{summaryParts.join(' · ')}</p>

      <ul className="pred-fate-board">
        {fates.map((f, i) => {
          const me = f.player_name === currentName;
          return (
            <li key={`${f.player_name}-${i}`} className={`pred-fate-row pred-fate-${f.status}${me ? ' me' : ''}`}>
              <span className={`pred-points-pill ${pointsClass(f.projectedPoints)}`}>{f.projectedPoints}</span>
              <span className="pred-fate-name">
                {f.player_name}
                {me ? <span className="pred-you-tag"> ({t('predYou')})</span> : null}
              </span>
              <span className="pred-fate-pick">
                {f.predicted_home}–{f.predicted_away}
              </span>
              <span className="pred-fate-status">{t(STATUS_KEY[f.status])}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
