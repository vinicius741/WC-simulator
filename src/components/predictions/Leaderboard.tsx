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
    <section className="predictions-leaderboard mb-10">
      <div className="pred-leaderboard-header flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="section-title">{scopeTitle[scope]}</h2>
          <p className="section-desc !mb-0">{scopeDesc[scope]}</p>
        </div>
        <div
          className="pred-scope-toggle inline-flex border border-border rounded overflow-hidden flex-shrink-0"
          role="tablist"
          aria-label={t('predLeaderboardTitle')}
        >
          {SCOPES.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === scope}
              className={`pred-scope-btn bg-bg-secondary border-none border-r border-border text-text-secondary px-3.5 py-[7px] font-sans text-xs font-bold uppercase tracking-[0.4px] cursor-pointer transition-[background,color] duration-150 ease-out last:border-r-0 hover:bg-bg-tertiary hover:text-ink ${s === scope ? '!bg-navy !text-white' : ''}`}
              onClick={() => onScopeChange(s)}
            >
              {scopeLabel[s]}
            </button>
          ))}
        </div>
      </div>
      <table className="pred-leaderboard-table large-table w-full border-collapse text-center mt-2.5 tablet:!table tablet:!table-fixed tablet:!w-full phone:!w-full">
        <thead>
          <tr>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2">#</th>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2">{t('predPlayerCol')}</th>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2">{t('predPointsCol')}</th>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2">{t('predGamesCol')}</th>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2" title={t('predPpgHint')}>{t('predPpgCol')}</th>
            <th className="bg-bg-tertiary text-ink font-bold p-2.5 border-b border-border text-xs uppercase tracking-[0.5px] phone:!px-1.5 phone:!py-2" title={t('predAccuracyHint')}>{t('predAccuracyCol')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player_name} className={i < 3 ? '[&_.pred-player-name]:font-bold hover:bg-[#fafaf9]' : 'hover:bg-[#fafaf9]'}>
              <td className="pred-rank p-3 px-2.5 border-b border-border-soft text-sm phone:!px-1.5 phone:!py-2">{i < 3 ? MEDALS[i] : i + 1}</td>
              <td className="pred-player-name p-3 px-2.5 border-b border-border-soft text-left phone:!px-1.5 phone:!py-2">{r.player_name}</td>
              <td className="pred-points-total p-3 px-2.5 border-b border-border-soft font-serif font-bold text-base text-crimson phone:!px-1.5 phone:!py-2">
                {isEfficiency ? r.points_per_game.toFixed(2) : r.total}
              </td>
              <td className="pred-games-count p-3 px-2.5 border-b border-border-soft phone:!px-1.5 phone:!py-2">{r.games_scored}</td>
              <td className="pred-ppg p-3 px-2.5 border-b border-border-soft font-serif font-semibold text-sm text-navy tabular-nums phone:!px-1.5 phone:!py-2">{r.points_per_game.toFixed(2)}</td>
              <td className="pred-margin-error p-3 px-2.5 border-b border-border-soft phone:!px-1.5 phone:!py-2">{r.margin_error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
