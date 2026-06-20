import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { api, ApiError } from '../../utils/apiClient';
import { buildInviteUrl } from '../../utils/inviteRoute';
import type { PredictionGame } from '../../types';

interface Props {
  games: PredictionGame[];
  onChanged: () => Promise<void>;
}

const fieldInputClass =
  'p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary focus:outline-none focus:border-navy phone:!text-base phone:!min-h-11';
const fieldSpanClass =
  'font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary';
const errorBanner = 'text-[13px] mb-5 py-2.5 px-3.5';
const errorBannerStyle = { background: 'rgba(176, 0, 0, 0.08)', borderLeft: '4px solid var(--accent-red)', color: 'var(--accent-red)' };
const successBanner = 'text-[13px] font-semibold mb-3 py-2 px-3';
const successBannerStyle = { background: 'rgba(46, 125, 50, 0.08)', borderLeft: '4px solid var(--accent-green)', color: 'var(--accent-green)' };

export default function AdminPanel({ games, onChanged }: Props) {
  return (
    <div className="flex flex-col gap-6 mb-6">
      <ResultEntry games={games} onChanged={onChanged} />
      <AddGame onChanged={onChanged} />
      <ShareLink />
      <ChangePassword />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Enter an actual result (re-scores every prediction for that game) */
/* ------------------------------------------------------------------ */
function ResultEntry({ games, onChanged }: { games: PredictionGame[]; onChanged: () => Promise<void> }) {
  const { t } = useLanguage();
  const candidates = useMemo(() => games.filter((g) => g.started), [games]);

  const [gameId, setGameId] = useState<string>('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const id = Number(gameId);
    const h = Number(home);
    const a = Number(away);
    if (!id || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setErr(t('predAdminInvalid'));
      return;
    }
    setBusy(true);
    try {
      await api.adminSetResult(id, h, a);
      await onChanged();
      setMsg(t('predAdminResultSaved'));
      setHome('');
      setAway('');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusy(false);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
        <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('predAdminResultTitle')}</h3>
        <p className="font-serif italic text-text-muted py-3">{t('predAdminNoStarted')}</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
      <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('predAdminResultTitle')}</h3>
      <p className="section-desc">{t('predAdminResultDesc')}</p>
      <form className="flex flex-col gap-3 mt-3" onSubmit={submit}>
        <label className="flex flex-col gap-[5px]">
          <span className={fieldSpanClass}>{t('predAdminSelectGame')}</span>
          <select className={fieldInputClass} value={gameId} onChange={(e) => setGameId(e.target.value)}>
            <option value="">—</option>
            {candidates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.home_team_name} vs {g.away_team_name}
                {g.result_home !== null && g.result_away !== null ? ` (${g.result_home}-${g.result_away})` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-score-row grid grid-cols-2 gap-3 phone:!grid-cols-1">
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminHome')}</span>
            <input className={fieldInputClass} type="number" min={0} max={30} value={home} onChange={(e) => setHome(e.target.value)} inputMode="numeric" />
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminAway')}</span>
            <input className={fieldInputClass} type="number" min={0} max={30} value={away} onChange={(e) => setAway(e.target.value)} inputMode="numeric" />
          </label>
        </div>
        {msg && <div className={successBanner} style={successBannerStyle}>{msg}</div>}
        {err && <div className={errorBanner} style={errorBannerStyle}>{err}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy || !gameId || home === '' || away === ''}>
          {busy ? t('predSaving') : t('predAdminSubmitResult')}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Add / edit a game (e.g. a knockout game once teams are known)    */
/* ------------------------------------------------------------------ */
function AddGame({ onChanged }: { onChanged: () => Promise<void> }) {
  const { t } = useLanguage();
  const [externalId, setExternalId] = useState('');
  const [stage, setStage] = useState('group');
  const [groupLetter, setGroupLetter] = useState('');
  const [homeName, setHomeName] = useState('');
  const [awayName, setAwayName] = useState('');
  const [homeCode, setHomeCode] = useState('');
  const [awayCode, setAwayCode] = useState('');
  const [homeFlag, setHomeFlag] = useState('');
  const [awayFlag, setAwayFlag] = useState('');
  const [kickoff, setKickoff] = useState(''); // datetime-local (browser local)
  const [venue, setVenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const ext = externalId.trim() || `manual-${Date.now()}`;
    if (!homeName.trim() || !awayName.trim()) {
      setErr(t('predAdminTeamNamesRequired'));
      return;
    }
    const d = new Date(kickoff);
    if (!kickoff || isNaN(d.getTime())) {
      setErr(t('predAdminKickoffRequired'));
      return;
    }
    const kickoffUtc = d.toISOString().slice(0, 19).replace('T', ' ');

    setBusy(true);
    try {
      await api.adminAddGame({
        external_id: ext,
        stage,
        group_letter: groupLetter.trim() || null,
        home_team_name: homeName.trim(),
        away_team_name: awayName.trim(),
        home_code: homeCode.trim() || null,
        away_code: awayCode.trim() || null,
        home_flag: homeFlag.trim() || null,
        away_flag: awayFlag.trim() || null,
        kickoff_utc: kickoffUtc,
        venue: venue.trim() || null,
        is_open: true,
      });
      await onChanged();
      setMsg(t('predAdminGameAdded'));
      setExternalId(''); setHomeName(''); setAwayName(''); setHomeCode(''); setAwayCode('');
      setHomeFlag(''); setAwayFlag(''); setKickoff(''); setVenue('');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
      <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('predAdminAddGameTitle')}</h3>
      <p className="section-desc">{t('predAdminAddGameDesc')}</p>
      <form className="flex flex-col gap-3 mt-3" onSubmit={submit}>
        <div className="admin-grid-2 grid grid-cols-2 gap-3 phone:!grid-cols-1">
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminExternalId')}</span>
            <input className={fieldInputClass} value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="group-A-2" />
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminStage')}</span>
            <select className={fieldInputClass} value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="group">Group</option>
              <option value="r32">R32</option>
              <option value="r16">R16</option>
              <option value="qf">QF</option>
              <option value="sf">SF</option>
              <option value="final">Final</option>
            </select>
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminGroup')}</span>
            <input className={fieldInputClass} value={groupLetter} onChange={(e) => setGroupLetter(e.target.value)} maxLength={1} placeholder="C" />
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminKickoff')}</span>
            <input className={fieldInputClass} type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
          </label>
        </div>

        <div className="admin-team-grid grid grid-cols-2 gap-4 phone:!grid-cols-1">
          <div className="admin-team-col flex flex-col gap-2">
            <label className="flex flex-col gap-[5px] flex-1">
              <span className={fieldSpanClass}>{t('predAdminHome')}</span>
              <input className={fieldInputClass} value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder={t('predAdminTeamName')} />
            </label>
            <div className="admin-grid-2 grid grid-cols-2 gap-3 phone:!grid-cols-1">
              <input className={fieldInputClass} value={homeCode} onChange={(e) => setHomeCode(e.target.value)} maxLength={6} placeholder={t('predAdminCode')} />
              <input className={fieldInputClass} value={homeFlag} onChange={(e) => setHomeFlag(e.target.value)} placeholder={t('predAdminFlag')} />
            </div>
          </div>
          <div className="admin-team-col flex flex-col gap-2">
            <label className="flex flex-col gap-[5px] flex-1">
              <span className={fieldSpanClass}>{t('predAdminAway')}</span>
              <input className={fieldInputClass} value={awayName} onChange={(e) => setAwayName(e.target.value)} placeholder={t('predAdminTeamName')} />
            </label>
            <div className="admin-grid-2 grid grid-cols-2 gap-3 phone:!grid-cols-1">
              <input className={fieldInputClass} value={awayCode} onChange={(e) => setAwayCode(e.target.value)} maxLength={6} placeholder={t('predAdminCode')} />
              <input className={fieldInputClass} value={awayFlag} onChange={(e) => setAwayFlag(e.target.value)} placeholder={t('predAdminFlag')} />
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-[5px]">
          <span className={fieldSpanClass}>{t('predAdminVenue')}</span>
          <input className={fieldInputClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>

        {msg && <div className={successBanner} style={successBannerStyle}>{msg}</div>}
        {err && <div className={errorBanner} style={errorBannerStyle}>{err}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('predSaving') : t('predAdminAddGameBtn')}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Change the shared / admin password                               */
/* ------------------------------------------------------------------ */
function ChangePassword() {
  const { t } = useLanguage();
  const [type, setType] = useState<'shared' | 'admin'>('shared');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (pw.length < 6) {
      setErr(t('predAdminPwTooShort'));
      return;
    }
    setBusy(true);
    try {
      await api.adminChangePassword(type, pw);
      setMsg(t('predAdminPwChanged'));
      setPw('');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
      <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('predAdminPwTitle')}</h3>
      <form className="flex flex-col gap-3 mt-3" onSubmit={submit}>
        <div className="admin-grid-2 grid grid-cols-2 gap-3 phone:!grid-cols-1">
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminPwType')}</span>
            <select className={fieldInputClass} value={type} onChange={(e) => setType(e.target.value as 'shared' | 'admin')}>
              <option value="shared">{t('predAdminShared')}</option>
              <option value="admin">{t('predAdmin')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className={fieldSpanClass}>{t('predAdminNewPassword')}</span>
            <input className={fieldInputClass} type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
        </div>
        {msg && <div className={successBanner} style={successBannerStyle}>{msg}</div>}
        {err && <div className={errorBanner} style={errorBannerStyle}>{err}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy || pw === ''}>
          {busy ? t('predSaving') : t('predAdminChangePwBtn')}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Generate / manage the passwordless family invite link           */
/* ------------------------------------------------------------------ */
function ShareLink() {
  const { t } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .adminInviteStatus()
      .then((status) => {
        if (!active) return;
        setToken(status.token);
        setEnabled(status.enabled);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const url = token ? buildInviteUrl(token) : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr(t('predAdminShareCopyFailed'));
      setTimeout(() => setErr(null), 3000);
    }
  }

  async function generate(regenerate: boolean) {
    if (regenerate && !window.confirm(t('predAdminShareRegenerateConfirm'))) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.adminInviteAction('generate');
      setToken(res.token ?? null);
      setEnabled(true);
      setMsg(t('predAdminShareSaved'));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.adminInviteAction(enabled ? 'disable' : 'enable');
      setEnabled(res.enabled ?? !enabled);
      setMsg(t('predAdminShareSaved'));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t('predSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-tertiary border border-border border-l-4 border-l-gold p-4 px-[18px]">
      <h3 className="font-serif text-base font-bold text-navy uppercase tracking-[0.5px] mb-1">{t('predAdminShareTitle')}</h3>
      <p className="section-desc">{t('predAdminShareDesc')}</p>

      {loading ? (
        <p className="font-serif italic text-text-muted py-3">{t('predLoading')}</p>
      ) : url ? (
        <>
          <label className="flex flex-col gap-[5px] mt-3.5">
            <span className={fieldSpanClass}>{t('predAdminShareUrl')}</span>
            <input
              className="w-full p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary focus:outline-none focus:border-navy phone:!text-base phone:!min-h-11"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12.5px', wordBreak: 'break-all' }}
              value={url}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className="btn" onClick={copy}>
              {copied ? t('predAdminShareCopied') : t('predAdminShareCopy')}
            </button>
            <button type="button" className="btn" onClick={() => generate(true)} disabled={busy}>
              {t('predAdminShareRegenerate')}
            </button>
            <button type="button" className="btn" onClick={toggle} disabled={busy}>
              {enabled ? t('predAdminShareDisable') : t('predAdminShareEnable')}
            </button>
          </div>
          <p className="mt-2.5 m-0 font-sans text-xs font-bold uppercase tracking-[0.5px] text-text-secondary">
            {enabled ? t('predAdminShareEnabled') : t('predAdminShareDisabled')}
          </p>
        </>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary" onClick={() => generate(false)} disabled={busy}>
            {busy ? t('predSaving') : t('predAdminShareGenerate')}
          </button>
        </div>
      )}

      {msg && <div className={successBanner} style={successBannerStyle}>{msg}</div>}
      {err && <div className={errorBanner} style={errorBannerStyle}>{err}</div>}
    </div>
  );
}
