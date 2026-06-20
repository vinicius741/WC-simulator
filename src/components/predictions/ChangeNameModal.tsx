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
    <div
      className="
        modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-[15px]
        phone:!items-start phone:!p-[calc(env(safe-area-inset-top)+8px)_max(12px,env(safe-area-inset-right))_calc(env(safe-area-inset-bottom)+12px)_max(12px,env(safe-area-inset-left))]
      "
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="
          modal-content bg-bg-secondary border-t-4 border-t-crimson w-full max-w-[500px] overflow-hidden relative
          flex flex-col
          phone:!max-h-[calc(100dvh-20px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]
        "
        style={{ boxShadow: '0 4px 25px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header p-[25px_20px_10px] text-center border-b border-border phone:!pt-[calc(env(safe-area-inset-top)+16px)] phone:!px-4 phone:!pb-2">
          <button
            className="
              modal-close-btn absolute top-3 right-[15px] bg-transparent border-none text-text-muted text-2xl cursor-pointer
              w-11 h-11 min-h-11 flex items-center justify-center
              phone:!top-[calc(env(safe-area-inset-top)+6px)] phone:!right-[calc(env(safe-area-inset-right)+8px)]
            "
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="font-serif text-2xl font-bold text-ink phone:text-xl">{t('predChangeNameTitle')}</h2>
        </div>

        <div className="modal-body p-[15px_20px_25px] phone:!overflow-y-auto phone:!overscroll-contain phone:!flex-1">
          <p className="section-desc">{t('predChangeNameDesc')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <label className="flex flex-col gap-[5px]">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.5px] text-text-secondary">{t('predNewNameLabel')}</span>
              <input
                type="text"
                className="p-[9px_10px] border border-border rounded-sm font-sans text-sm text-text-primary bg-bg-secondary focus:outline-none focus:border-navy phone:!text-base phone:!min-h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                placeholder={t('predYourNamePlaceholder')}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </label>
            {err && (
              <div className="text-[13px] mb-5 py-2.5 px-3.5" style={{ background: 'rgba(176, 0, 0, 0.08)', borderLeft: '4px solid var(--accent-red)', color: 'var(--accent-red)' }}>
                {err}
              </div>
            )}
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
