import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { usePredictionsAuth, type PredictionsAuth } from '../../hooks/usePredictionsAuth';
import { usePredictions } from '../../hooks/usePredictions';
import { api, ApiError } from '../../utils/apiClient';
import { appHref } from '../../utils/routes';
import type { LeaderboardRow, SyncStatusResponse } from '../../types';
import AdminPanel from './AdminPanel';

/**
 * The dedicated `/admin` page — fully separate from the family predictions view.
 *
 * Admin-gated: visitors who aren't signed in as admin see a compact password
 * form. Once admin, the page shows the existing {@link AdminPanel} (results,
 * games, invite link, passwords) plus a new "Manage players" panel that can
 * delete a player and all their picks.
 */
export default function AdminPage() {
  const { t } = useLanguage();
  const auth = usePredictionsAuth();
  const data = usePredictions(auth.authenticated);

  if (auth.loading) {
    return (
      <div className="admin-page">
        <div className="predictions-loading">{t('predLoading')}</div>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="admin-page">
        <AdminLogin auth={auth} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <a className="admin-back-link" href={appHref()}>
          ← {t('adminBackToApp')}
        </a>
        <h1 className="admin-page-title">{t('adminPageTitle')}</h1>
        <button className="btn" onClick={auth.logout}>
          {t('predLogout')}
        </button>
      </header>

      <AutoSync />
      <AdminPanel games={data.games} onChanged={data.refresh} />
      <DeletePlayer rows={data.leaderboard} loading={data.loading} onChanged={data.refresh} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin-only sign-in gate (password only — no family/admin tabs here) */
/* ------------------------------------------------------------------ */
function AdminLogin({ auth }: { auth: PredictionsAuth }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password === '') {
      setError(t('predPasswordRequired'));
      return;
    }
    setBusy(true);
    try {
      await auth.adminLogin(password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('predLoginError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <a className="admin-back-link" href={appHref()}>
        ← {t('adminBackToApp')}
      </a>
      <h2 className="section-title">{t('adminLoginTitle')}</h2>
      <p className="section-desc">{t('adminLoginDesc')}</p>
      <form className="predictions-login-form" onSubmit={submit}>
        <label className="predictions-field">
          <span>{t('predAdminPassword')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="predictions-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('predSigningIn') : t('predSignIn')}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delete a player — removes their picks (off the leaderboard) and     */
/* ends their sessions (signs them out). Re-join stays possible.       */
/* ------------------------------------------------------------------ */
function DeletePlayer({
  rows,
  loading,
  onChanged,
}: {
  rows: LeaderboardRow[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [busyName, setBusyName] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Busiest accounts first (most picks), then alphabetical.
  const sorted = [...rows].sort(
    (a, b) => b.predictions - a.predictions || a.player_name.localeCompare(b.player_name),
  );

  async function remove(row: LeaderboardRow) {
    const confirmed = window.confirm(t('adminDeleteConfirm', { name: row.player_name, n: row.predictions }));
    if (!confirmed) return;
    setBusyName(row.player_name);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.adminDeletePlayer(row.player_name);
      await onChanged();
      setMsg(t('adminPlayerDeleted', { name: res.player_name, n: res.deleted_predictions }));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusyName(null);
    }
  }

  return (
    <div className="admin-panel admin-players">
      <div className="admin-subpanel">
        <h3 className="admin-subpanel-title">{t('adminPlayersTitle')}</h3>
        <p className="section-desc">{t('adminPlayersDesc')}</p>

        {loading && sorted.length === 0 ? (
          <p className="predictions-empty">{t('predLoading')}</p>
        ) : sorted.length === 0 ? (
          <p className="predictions-empty">{t('adminPlayersNone')}</p>
        ) : (
          <ul className="admin-players-list">
            {sorted.map((row) => (
              <li key={row.player_name} className="admin-player-row">
                <span className="admin-player-name">{row.player_name}</span>
                <span className="admin-player-meta">
                  {t('adminPlayerPicks', { n: row.predictions, pts: row.total })}
                </span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => remove(row)}
                  disabled={busyName !== null}
                >
                  {busyName === row.player_name ? t('predSaving') : t('adminPlayerDelete')}
                </button>
              </li>
            ))}
          </ul>
        )}

        {msg && <div className="predictions-success">{msg}</div>}
        {err && <div className="predictions-error">{err}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auto-sync — shows the last FIFA results pull and a "Sync now"       */
/* button so you can score finished games immediately instead of       */
/* waiting for the daily cron.                                         */
/* ------------------------------------------------------------------ */
function AutoSync() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api.adminSyncStatus());
    } catch {
      /* non-fatal — the panel just shows the "never" state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runNow() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await api.adminSyncNow();
      setMsg(
        t('adminSyncSummary', {
          filled: r.filled,
          already: r.already_set,
          corrected: r.corrected,
          unmatched: r.unmatched,
        }),
      );
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('adminSyncError'));
    } finally {
      setBusy(false);
    }
  }

  const last = status?.last_summary ?? null;
  const lastRun = status?.last_sync_at
    ? new Date(status.last_sync_at.replace(' ', 'T') + 'Z').toLocaleString()
    : t('adminSyncNever');

  return (
    <div className="admin-panel admin-sync">
      <div className="admin-subpanel">
        <h3 className="admin-subpanel-title">{t('adminSyncTitle')}</h3>
        <p className="section-desc">{t('adminSyncDesc')}</p>

        <dl className="admin-sync-meta">
          <div>
            <dt>{t('adminSyncSource')}</dt>
            <dd>{status ? status.source.toUpperCase() : '—'}</dd>
          </div>
          <div>
            <dt>{t('adminSyncLastRun')}</dt>
            <dd>{loading ? t('predLoading') : lastRun}</dd>
          </div>
        </dl>

        {last && (
          <p className="admin-sync-summary">
            {t('adminSyncSummary', {
              filled: last.filled ?? 0,
              already: last.already_set ?? 0,
              corrected: last.corrected ?? 0,
              unmatched: last.unmatched ?? 0,
            })}
          </p>
        )}

        {status && status.recent_log.length > 0 ? (
          <ul className="admin-sync-log">
            {status.recent_log.slice(0, 6).map((row, i) => (
              <li key={i} className={`sync-action sync-action-${row.action}`}>
                <span className="sync-action-tag">{row.action}</span>
                <span className="sync-action-detail">{row.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <p className="predictions-empty">{t('adminSyncNoLog')}</p>
        )}

        <button type="button" className="btn btn-primary" onClick={runNow} disabled={busy}>
          {busy ? t('adminSyncRunning') : t('adminSyncNow')}
        </button>

        {msg && <div className="predictions-success">{msg}</div>}
        {err && <div className="predictions-error">{err}</div>}
      </div>
    </div>
  );
}
