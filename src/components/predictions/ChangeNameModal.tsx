import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { ApiError } from '../../utils/apiClient';
import type { PredictionsAuth } from '../../hooks/usePredictionsAuth';

interface Props {
  auth: PredictionsAuth;
  onClose: () => void;
  /** Runs after a successful rename — lets the parent refetch leaderboard/picks. */
  onSaved: () => Promise<void>;
}

/**
 * Self-service rename for a signed-in family member. Mirrors the modal overlay
 * used by RecapModal and the inline form pattern from AdminPanel's ChangePassword.
 */
export default function ChangeNameModal({ auth, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(auth.playerName ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lock background scroll while the modal is open (prevents iOS rubber-banding
  // behind the overlay). Restored on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = name.trim();
    if (trimmed === '') {
      setErr(t('predNameRequired'));
      return;
    }
    setBusy(true);
    try {
      await auth.changeName(trimmed);
      await onSaved();
      onClose();
    } catch (e2) {
      if (e2 instanceof ApiError) {
        if (e2.status === 409) setErr(t('predChangeNameTaken'));
        else if (e2.status === 400) setErr(t('predNameRequired'));
        else setErr(t('predChangeNameError'));
      } else {
        setErr(t('predChangeNameError'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2>{t('predChangeNameTitle')}</h2>
        </div>

        <div className="modal-body">
          <p className="section-desc">{t('predChangeNameDesc')}</p>
          <form className="admin-form" onSubmit={submit}>
            <label className="predictions-field">
              <span>{t('predNewNameLabel')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                placeholder={t('predYourNamePlaceholder')}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </label>
            {err && <div className="predictions-error">{err}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || name.trim() === ''}
            >
              {busy ? t('predSaving') : t('predChangeNameSave')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
