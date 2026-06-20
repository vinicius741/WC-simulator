import React from 'react';
import type { Team } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface ThirdPlaceStandingsProps {
  thirdPlaceTeams: (Team & { group: string })[];
  selectedThirds: Set<string>;
  onToggleSelect: (teamId: string) => void;
  onSimulateThirds: () => void;
}

export function ThirdPlaceStandings({ thirdPlaceTeams, selectedThirds, onToggleSelect, onSimulateThirds }: ThirdPlaceStandingsProps) {
  const { t } = useLanguage();
  const selectedCount = selectedThirds.size;

  return (
    <div className="bg-bg-secondary border border-border p-[25px] mb-[50px] phone:p-3.5 phone:mb-10">
      <h2 className="section-title">{t('selectBestThirdsTitle')}</h2>
      <p className="section-desc">
        {t('selectBestThirdsDesc')}
      </p>

      {/* Progress / Status Header */}
      <div
        className="
          thirds-status-header flex justify-between items-center bg-bg-tertiary p-[15px_20px] mb-5
          phone:!flex-col phone:!items-stretch phone:!gap-2.5 phone:!p-3.5
        "
        style={{
          borderLeft: `4px solid ${selectedCount === 8 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
        }}
      >
        <div className="font-serif text-[15px] font-bold">
          {selectedCount === 8 ? (
            <span className="text-accent-green">
              {t('thirdsSelectedSuccessBanner')}
            </span>
          ) : (
            <span className="text-crimson">
              {t('thirdsSelectedInfoBanner', { selected: selectedCount })}
            </span>
          )}
        </div>
        <button className="btn btn-secondary phone:!w-full phone:!min-h-11 phone:!self-stretch" onClick={onSimulateThirds}>
          {t('btnAutoSelectTop8')}
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[15px]">
        {thirdPlaceTeams.map(team => {
          const isSelected = selectedThirds.has(team.id);
          const isDisabled = !isSelected && selectedCount >= 8;

          return (
            <div
              key={team.id}
              onClick={() => !isDisabled && onToggleSelect(team.id)}
              className="
                ko-match-card bg-card border flex justify-between items-center transition-all duration-150 ease-out
                border-l-[3px] border-l-navy
                phone:!flex-wrap phone:!gap-2 phone:!p-3 phone:!min-w-0
              "
              style={{
                background: isSelected ? 'rgba(46, 125, 50, 0.04)' : 'var(--bg-secondary)',
                border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                borderLeft: isSelected ? '2px solid var(--accent-green)' : '3px solid var(--accent-navy)',
                padding: '16px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
                boxShadow: isSelected ? '0 2px 8px rgba(46, 125, 50, 0.1)' : 'none',
              }}
            >
              <div className="flex items-center gap-2.5 phone:!min-w-0 phone:!flex-1 phone:!flex-auto">
                <span className="font-serif font-bold text-[18px] text-navy">
                  {team.group}
                </span>
                <span className="team-flag text-2xl">{team.flag}</span>
                <div className="phone:!min-w-0">
                  <div className="font-bold text-[13px]">{t(team.id)}</div>
                  <div className="text-[11px] text-text-muted">{t('ratingLabel')}: {team.rating}</div>
                </div>
              </div>

              <div>
                <span
                  className={`status-badge px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.5px] rounded-sm cursor-pointer phone:text-[11px] phone:px-2.5 phone:py-1 ${isSelected ? 'is-qualified' : 'is-eliminated'}`}
                  style={isSelected ? {
                    background: 'rgba(46, 125, 50, 0.1)',
                    color: 'var(--accent-green)',
                    border: '1px solid rgba(46, 125, 50, 0.2)',
                  } : {
                    background: 'rgba(176, 0, 0, 0.1)',
                    color: 'var(--accent-red)',
                    border: '1px solid rgba(176, 0, 0, 0.2)',
                  }}
                >
                  {isSelected ? t('qualifiedLabel') : t('selectLabel')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ThirdPlaceStandings;
