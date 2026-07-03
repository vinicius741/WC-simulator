import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface ControlsBarProps {
  activeTab: string;
  champion: string;
  onSimulateKnockouts: () => void;
  onReset: () => void;
  onShowRecap: () => void;
  onRefreshResults: () => void;
  resultsLoading: boolean;
  resultsAt: string | null;
  resultsError: string | null;
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  activeTab,
  champion,
  onSimulateKnockouts,
  onReset,
  onShowRecap,
  onRefreshResults,
  resultsLoading,
  resultsAt,
  resultsError
}) => {
  const { t } = useLanguage();

  return (
    <div className="controls-bar">
      <div className="action-group">
        {activeTab === 'knockout' && (
          <>
            <button className="btn btn-secondary" onClick={onSimulateKnockouts}>
              {t('btnSimulateKnockouts')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onRefreshResults}
              disabled={resultsLoading}
              title={resultsAt ? t('bracketSyncedAt', { when: resultsAt as string }) : ''}
            >
              {resultsLoading ? t('bracketSyncing') : t('btnRefreshResults')}
            </button>
            <button className="btn" onClick={onReset}>
              {t('btnResetBracket')}
            </button>
            {champion && (
              <button
                className="btn btn-primary"
                style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: '#fff' }}
                onClick={onShowRecap}
              >
                {t('btnPathToGlory')}
              </button>
            )}
          </>
        )}
      </div>
      {activeTab === 'knockout' && (resultsAt || resultsError) && (
        <div className="results-status">
          {resultsError ? (
            <span className="results-status-error">{t('bracketSyncFailed')}</span>
          ) : (
            <span className="results-status-ok">{t('bracketSyncedAt', { when: resultsAt ?? '' })}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlsBar;
