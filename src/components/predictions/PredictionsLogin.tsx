import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { PredictionsAuth } from '../../hooks/usePredictionsAuth';
import { ApiError } from '../../utils/apiClient';

interface Props {
  auth: PredictionsAuth;
}

const fieldInputClass =
  'p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary phone:!text-base phone:!min-h-11 focus:outline-none focus:border-navy';

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
    <div className="max-w-[420px] mx-auto">
      <h2 className="section-title">{t('predLoginTitle')}</h2>
      <p className="section-desc">{t('predLoginDesc')}</p>

      <div className="flex gap-1.5 mb-[18px] overflow-x-auto [scrollbar-width:none] phone:phone-no-scrollbar">
        <button
          type="button"
          className={`stage-tab-btn bg-bg-secondary border border-border text-text-secondary text-[11px] font-bold px-3.5 py-1.5 rounded-sm cursor-pointer whitespace-nowrap uppercase transition-all duration-150 ease-out ${mode === 'family' ? '!bg-navy !text-white !border-navy' : ''}`}
          onClick={() => setMode('family')}
        >
          {t('predFamily')}
        </button>
        <button
          type="button"
          className={`stage-tab-btn bg-bg-secondary border border-border text-text-secondary text-[11px] font-bold px-3.5 py-1.5 rounded-sm cursor-pointer whitespace-nowrap uppercase transition-all duration-150 ease-out ${mode === 'admin' ? '!bg-navy !text-white !border-navy' : ''}`}
          onClick={() => setMode('admin')}
        >
          {t('predAdmin')}
        </button>
      </div>

      <form className="flex flex-col gap-3.5" onSubmit={submit}>
        {mode === 'family' && (
          <label className="flex flex-col gap-[5px]">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">{t('predYourName')}</span>
            <input
              type="text"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              placeholder={t('predYourNamePlaceholder')}
            />
          </label>
        )}
        <label className="flex flex-col gap-[5px]">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">
            {mode === 'admin' ? t('predAdminPassword') : t('predSharedPassword')}
          </span>
          <input
            type="password"
            className={fieldInputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <div className="text-[13px] mb-5 py-2.5 px-3.5 bg-crimson/[0.08] border-l-4 border-crimson text-crimson">
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('predSigningIn') : t('predSignIn')}
        </button>
      </form>
    </div>
  );
}
