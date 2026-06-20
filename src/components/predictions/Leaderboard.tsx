import { useLanguage } from '../../hooks/useLanguage';
import type { LeaderboardRow, LeaderboardScope } from '../../types';

interface Props {
  rows: LeaderboardRow[];
  scope: LeaderboardScope;
  onScopeChange: (scope: LeaderboardScope) => void;
  loading: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

const SCOPES: LeaderboardScope[] = ['overall', 'week', 'efficiency'];

export default function Leaderboard({ rows, scope, onScopeChange, loading }: Props) {
  const { t } = useLanguage();

  if ((loading && rows.length === 0) || rows.length === 0) return null;

  const scopeLabel: Record<LeaderboardScope, string> = {
    overall: t('predScopeOverall'),
    week: t('predScopeWeek'),
    efficiency: t('predScopeEfficiency'),
  };
  const scopeTitle: Record<LeaderboardScope, string> = {
    overall: t('predScopeOverallTitle'),
    week: t('predScopeWeekTitle'),
    efficiency: t('predScopeEfficiencyTitle'),
  };
  const scopeDesc: Record<LeaderboardScope, string> = {
    overall: t('predScopeOverallDesc'),
    week: t('predScopeWeekDesc'),
    efficiency: t('predScopeEfficiencyDesc'),
  };

  // Efficiency is ranked by average, so the headline number is points-per-game;
  // the other two views still show the cumulative total as the main number, with
  // points-per-game as a supporting column.
  const isEfficiency = scope === 'efficiency';

  return (
    <section className="predictions-leaderboard">
      <div className="pred-leaderboard-header">
        <div>
          <h2 className="section-title">{scopeTitle[scope]}</h2>
          <p className="section-desc">{scopeDesc[scope]}</p>
        </div>
        <div className="pred-scope-toggle" role="tablist" aria-label={t('predLeaderboardTitle')}>
          {SCOPES.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === scope}
              className={`pred-scope-btn ${s === scope ? 'active' : ''}`}
              onClick={() => onScopeChange(s)}
            >
              {scopeLabel[s]}
            </button>
          ))}
        </div>
      </div>
      <table className="large-table pred-leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('predPlayerCol')}</th>
            <th>{t('predPointsCol')}</th>
            <th>{t('predGamesCol')}</th>
            <th title={t('predPpgHint')}>{t('predPpgCol')}</th>
            <th title={t('predAccuracyHint')}>{t('predAccuracyCol')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player_name} className={i < 3 ? 'pred-podium' : ''}>
              <td className="pred-rank">{i < 3 ? MEDALS[i] : i + 1}</td>
              <td className="pred-player-name">{r.player_name}</td>
              <td className="pred-points-total">
                {isEfficiency ? r.points_per_game.toFixed(2) : r.total}
              </td>
              <td className="pred-games-count">{r.games_scored}</td>
              <td className="pred-ppg">{r.points_per_game.toFixed(2)}</td>
              <td className="pred-margin-error">{r.margin_error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
