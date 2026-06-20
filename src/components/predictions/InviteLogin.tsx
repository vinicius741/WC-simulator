import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { PredictionsAuth } from '../../hooks/usePredictionsAuth';
import { ApiError } from '../../utils/apiClient';
import PredictionsLogin from './PredictionsLogin';

interface Props {
  auth: PredictionsAuth;
  token: string;
}

/**
 * Name-only join form shown when a visitor opens an admin-generated
 * `/invite/<token>` link. No password is required — just a name so picks can be
 * attributed. If the token is invalid/disabled (or the visitor prefers), they
 * can fall back to the normal password login.
 */
export default function InviteLogin({ auth, token }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(auth.rememberedName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  // Graceful fallback to the password login (e.g. an expired/disabled invite).
  if (usePassword) {
    return <PredictionsLogin auth={auth} />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName === '') {
      setError(t('predNameRequired'));
      return;
    }
    setBusy(true);
    try {
      await auth.inviteLogin(token, trimmedName);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('predInviteInvalid') : t('predLoginError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[420px] mx-auto">
      <h2 className="section-title">{t('predInviteTitle')}</h2>
      <p className="section-desc">{t('predInviteDesc')}</p>

      <form className="flex flex-col gap-3.5" onSubmit={submit}>
        <label className="flex flex-col gap-[5px]">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">{t('predInviteName')}</span>
          <input
            type="text"
            className="p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary focus:outline-none focus:border-navy phone:!text-base phone:!min-h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="name"
            placeholder={t('predYourNamePlaceholder')}
            autoFocus
          />
        </label>
        {error && (
          <div className="text-[13px] mb-5 py-2.5 px-3.5 bg-crimson/[0.08] border-l-4 border-crimson text-crimson">
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('predInviteJoining') : t('predInviteJoin')}
        </button>
      </form>

      <button
        type="button"
        className="block mx-auto mt-[18px] p-0 border-none bg-none font-sans text-[13px] text-navy underline cursor-pointer hover:text-gold"
        onClick={() => setUsePassword(true)}
      >
        {t('predInviteUsePassword')}
      </button>
    </div>
  );
}
