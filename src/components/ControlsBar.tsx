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
    <div
      className="
        controls-bar flex justify-between items-center mb-[25px] border-b border-border pb-[15px] flex-wrap gap-[15px]
        tablet:flex-col tablet:items-stretch
        phone:gap-2.5 phone:pb-[15px]
      "
    >
      <div
        className="
          action-group flex gap-2.5 flex-wrap
          tablet:justify-between
          phone:justify-stretch phone:gap-2 phone:w-full
        "
      >
        {activeTab === 'groups' && (
          <>
            <button className="btn btn-primary phone:flex-1 phone:flex-auto" onClick={onSimulateAllGroups}>
              {t('btnSimulateAllGroups')}
            </button>
            <button className="btn phone:flex-1 phone:flex-auto" onClick={onReset}>
              {t('btnResetRankings')}
            </button>
          </>
        )}
        {activeTab === 'third-place' && (
          <button className="btn phone:flex-1 phone:flex-auto" onClick={onReset}>
            {t('btnResetSelections')}
          </button>
        )}
        {activeTab === 'knockout' && (
          <>
            <button className="btn btn-secondary phone:flex-1 phone:flex-auto" onClick={onSimulateKnockouts}>
              {t('btnSimulateKnockouts')}
            </button>
            <button className="btn phone:flex-1 phone:flex-auto" onClick={onReset}>
              {t('btnResetBracket')}
            </button>
            {champion && (
              <button
                className="btn btn-primary phone:flex-1 phone:flex-auto"
                style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: '#fff' }}
                onClick={onShowRecap}
              >
                {t('btnPathToGlory')}
              </button>
            )}
          </>
        )}
      </div>

      <div
        className="group-status-info font-serif italic text-[13px] text-text-secondary phone:text-[13px] phone:leading-relaxed phone:text-center"
      >
        {allGroupsCompleted ? (
          <span className="text-accent-green font-bold">
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
