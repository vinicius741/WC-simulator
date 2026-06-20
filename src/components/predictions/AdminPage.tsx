import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { usePredictionsAuth, type PredictionsAuth } from '../../hooks/usePredictionsAuth';
import { usePredictions } from '../../hooks/usePredictions';
import { api, ApiError } from '../../utils/apiClient';
import { appHref } from '../../utils/routes';
import type { LeaderboardRow, SyncStatusResponse } from '../../types';
import AdminPanel from './AdminPanel';

const errorBanner = 'text-[13px] mb-5 py-2.5 px-3.5 bg-crimson/[0.08] border-l-4 border-crimson text-crimson';
const successBanner = 'text-[13px] font-semibold mb-3 py-2 px-3 bg-accent-green/[0.08] border-l-4 border-accent-green text-accent-green';

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
      <div className="max-w-[760px] mx-auto py-6 pb-[60px]">
        <div className="font-serif italic text-text-muted py-3">{t('predLoading')}</div>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="max-w-[760px] mx-auto py-6 pb-[60px]">
        <AdminLogin auth={auth} />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto py-6 pb-[60px]">
      <header className="admin-page-header flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5 mb-7">
        <a className="font-sans text-[13px] font-bold uppercase tracking-[0.5px] text-navy no-underline whitespace-nowrap hover:text-crimson" href={appHref()}>
          ← {t('adminBackToApp')}
        </a>
        <h1 className="font-serif text-[22px] font-bold text-navy m-0">{t('adminPageTitle')}</h1>
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
    <div className="max-w-[420px] mx-auto my-10">
      <a className="admin-back-link inline-block mb-[18px] font-sans text-[13px] font-bold uppercase tracking-[0.5px] text-navy no-underline whitespace-nowrap hover:text-crimson" href={appHref()}>
        ← {t('adminBackToApp')}
      </a>
      <h2 className="section-title">{t('adminLoginTitle')}</h2>
      <p className="section-desc">{t('adminLoginDesc')}</p>
      <form className="flex flex-col gap-3.5" onSubmit={submit}>
        <label className="flex flex-col gap-[5px]">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">{t('predAdminPassword')}</span>
          <input
            type="password"
            className="p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary focus:outline-none focus:border-navy phone:!text-base phone:!min-h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className={errorBanner}>{error}</div>}
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
    <div className="flex flex-col gap-6">
      <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
        <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('adminPlayersTitle')}</h3>
        <p className="section-desc">{t('adminPlayersDesc')}</p>

        {loading && sorted.length === 0 ? (
          <p className="font-serif italic text-text-muted py-3">{t('predLoading')}</p>
        ) : sorted.length === 0 ? (
          <p className="font-serif italic text-text-muted py-3">{t('adminPlayersNone')}</p>
        ) : (
          <ul className="admin-players-list list-none m-0 mt-3.5 p-0 flex flex-col gap-2">
            {sorted.map((row) => (
              <li key={row.player_name} className="admin-player-row flex flex-wrap items-center gap-2.5 p-2.5 px-3 bg-bg-secondary border border-border">
                <span className="font-serif font-bold text-[15px] text-text-primary basis-[160px] grow shrink-0">{row.player_name}</span>
                <span className="font-sans text-[12.5px] text-text-secondary basis-[120px] grow shrink-0">
                  {t('adminPlayerPicks', { n: row.predictions, pts: row.total })}
                </span>
                <button
                  type="button"
                  className="btn btn-danger ml-auto"
                  onClick={() => remove(row)}
                  disabled={busyName !== null}
                >
                  {busyName === row.player_name ? t('predSaving') : t('adminPlayerDelete')}
                </button>
              </li>
            ))}
          </ul>
        )}

        {msg && <div className={successBanner}>{msg}</div>}
        {err && <div className={errorBanner}>{err}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auto-sync — shows the last FIFA results pull and a "Sync now"       */
/* button so you can score finished games immediately instead of       */
/* waiting for the daily cron.                                         */
/* ------------------------------------------------------------------ */
const SYNC_TAG_STYLE: Record<string, { background: string; color: string }> = {
  filled: { background: 'var(--accent-green)', color: '#fff' },
  corrected: { background: 'var(--accent-green)', color: '#fff' },
  unmatched: { background: 'var(--accent-red)', color: '#fff' },
  error: { background: 'var(--accent-red)', color: '#fff' },
  skipped: { background: 'var(--accent-red)', color: '#fff' },
  already_set: { background: 'var(--accent-gray)', color: '#fff' },
};

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
    <div className="admin-sync flex flex-col gap-6 mb-6">
      <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
        <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('adminSyncTitle')}</h3>
        <p className="section-desc">{t('adminSyncDesc')}</p>

        <dl className="admin-sync-meta flex flex-wrap gap-5 mt-3 mb-1">
          <div>
            <dt className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-0.5">{t('adminSyncSource')}</dt>
            <dd className="m-0 font-serif font-bold text-sm text-text-primary">{status ? status.source.toUpperCase() : '—'}</dd>
          </div>
          <div>
            <dt className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary mb-0.5">{t('adminSyncLastRun')}</dt>
            <dd className="m-0 font-serif font-bold text-sm text-text-primary">{loading ? t('predLoading') : lastRun}</dd>
          </div>
        </dl>

        {last && (
          <p className="admin-sync-summary mt-2 m-0 font-sans text-[13px] text-text-secondary">
            {t('adminSyncSummary', {
              filled: last.filled ?? 0,
              already: last.already_set ?? 0,
              corrected: last.corrected ?? 0,
              unmatched: last.unmatched ?? 0,
            })}
          </p>
        )}

        {status && status.recent_log.length > 0 ? (
          <ul className="admin-sync-log list-none m-3 p-0 flex flex-col gap-1.5">
            {status.recent_log.slice(0, 6).map((row, i) => (
              <li key={i} className="sync-action flex items-baseline gap-2 font-sans text-[12.5px]">
                <span
                  className="sync-action-tag font-bold text-[10.5px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                  style={SYNC_TAG_STYLE[row.action] ?? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  {row.action}
                </span>
                <span className="sync-action-detail text-text-secondary break-words">{row.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <p className="font-serif italic text-text-muted py-3">{t('adminSyncNoLog')}</p>
        )}

        <button type="button" className="btn btn-primary mt-1" onClick={runNow} disabled={busy}>
          {busy ? t('adminSyncRunning') : t('adminSyncNow')}
        </button>

        {msg && <div className={successBanner}>{msg}</div>}
        {err && <div className={errorBanner}>{err}</div>}
      </div>
    </div>
  );
}
