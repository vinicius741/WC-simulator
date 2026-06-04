import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface ControlsBarProps {
  activeTab: string;
  allGroupsCompleted: boolean;
  selectedCount: number;
  champion: string;
  onSimulateAllGroups: () => void;
  onSimulateKnockouts: () => void;
  onReset: () => void;
  onShowRecap: () => void;
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  activeTab,
  allGroupsCompleted,
  selectedCount,
  champion,
  onSimulateAllGroups,
  onSimulateKnockouts,
  onReset,
  onShowRecap
}) => {
  const { t } = useLanguage();

  return (
    <div className="controls-bar">
      <div className="action-group">
        {activeTab === 'groups' && (
          <>
            <button className="btn btn-primary" onClick={onSimulateAllGroups}>
              {t('btnSimulateAllGroups')}
            </button>
            <button className="btn" onClick={onReset}>
              {t('btnResetRankings')}
            </button>
          </>
        )}
        {activeTab === 'third-place' && (
          <button className="btn" onClick={onReset}>
            {t('btnResetSelections')}
          </button>
        )}
        {activeTab === 'knockout' && (
          <>
            <button className="btn btn-secondary" onClick={onSimulateKnockouts}>
              {t('btnSimulateKnockouts')}
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

      <div className="group-status-info" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
        {allGroupsCompleted ? (
          <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
            {t('thirdsChosenSuccess')}
          </span>
        ) : (
          <span>
            {t('thirdsChosenInfo', { selected: selectedCount })}
          </span>
        )}
      </div>
    </div>
  );
};

export default ControlsBar;
