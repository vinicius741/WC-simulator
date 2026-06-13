import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { PredictionsAuth } from '../../hooks/usePredictionsAuth';
import { ApiError } from '../../utils/apiClient';

interface Props {
  auth: PredictionsAuth;
}

export default function PredictionsLogin({ auth }: Props) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'family' | 'admin'>('family');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(auth.rememberedName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (mode === 'family' && trimmedName === '') {
      setError(t('predNameRequired'));
      return;
    }
    if (password === '') {
      setError(t('predPasswordRequired'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'admin') {
        await auth.adminLogin(password);
      } else {
        await auth.login(password, trimmedName);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('predLoginError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="predictions-login">
      <h2 className="section-title">{t('predLoginTitle')}</h2>
      <p className="section-desc">{t('predLoginDesc')}</p>

      <div className="predictions-login-tabs">
        <button
          type="button"
          className={`stage-tab-btn ${mode === 'family' ? 'active' : ''}`}
          onClick={() => setMode('family')}
        >
          {t('predFamily')}
        </button>
        <button
          type="button"
          className={`stage-tab-btn ${mode === 'admin' ? 'active' : ''}`}
          onClick={() => setMode('admin')}
        >
          {t('predAdmin')}
        </button>
      </div>

      <form className="predictions-login-form" onSubmit={submit}>
        {mode === 'family' && (
          <label className="predictions-field">
            <span>{t('predYourName')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              placeholder={t('predYourNamePlaceholder')}
            />
          </label>
        )}
        <label className="predictions-field">
          <span>{mode === 'admin' ? t('predAdminPassword') : t('predSharedPassword')}</span>
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
