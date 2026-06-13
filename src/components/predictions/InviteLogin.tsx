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
    <div className="predictions-login">
      <h2 className="section-title">{t('predInviteTitle')}</h2>
      <p className="section-desc">{t('predInviteDesc')}</p>

      <form className="predictions-login-form" onSubmit={submit}>
        <label className="predictions-field">
          <span>{t('predInviteName')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="name"
            placeholder={t('predYourNamePlaceholder')}
            autoFocus
          />
        </label>
        {error && <div className="predictions-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('predInviteJoining') : t('predInviteJoin')}
        </button>
      </form>

      <button type="button" className="predictions-invite-fallback" onClick={() => setUsePassword(true)}>
        {t('predInviteUsePassword')}
      </button>
    </div>
  );
}
