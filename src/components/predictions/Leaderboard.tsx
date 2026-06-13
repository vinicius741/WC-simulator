import { useLanguage } from '../../hooks/useLanguage';
import type { LeaderboardRow } from '../../types';

interface Props {
  rows: LeaderboardRow[];
  loading: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ rows, loading }: Props) {
  const { t } = useLanguage();

  if ((loading && rows.length === 0) || rows.length === 0) return null;

  return (
    <section className="predictions-leaderboard">
      <h2 className="section-title">{t('predLeaderboardTitle')}</h2>
      <p className="section-desc">{t('predLeaderboardDesc')}</p>
      <table className="large-table pred-leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('predPlayerCol')}</th>
            <th>{t('predPointsCol')}</th>
            <th>{t('predGamesCol')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player_name} className={i < 3 ? 'pred-podium' : ''}>
              <td className="pred-rank">{i < 3 ? MEDALS[i] : i + 1}</td>
              <td className="pred-player-name">{r.player_name}</td>
              <td className="pred-points-total">{r.total}</td>
              <td className="pred-games-count">{r.games_scored}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
