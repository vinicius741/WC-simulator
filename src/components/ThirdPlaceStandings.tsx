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
    <div className="third-place-container">
      <h2 className="section-title">{t('selectBestThirdsTitle')}</h2>
      <p className="section-desc">
        {t('selectBestThirdsDesc')}
      </p>

      {/* Progress / Status Header */}
      <div
        className="thirds-status-header"
        style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'var(--bg-tertiary)', 
          padding: '15px 20px', 
          borderLeft: `4px solid ${selectedCount === 8 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 'bold' }}>
          {selectedCount === 8 ? (
            <span style={{ color: 'var(--accent-green)' }}>
              {t('thirdsSelectedSuccessBanner')}
            </span>
          ) : (
            <span style={{ color: 'var(--accent-red)' }}>
              {t('thirdsSelectedInfoBanner', { selected: selectedCount })}
            </span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={onSimulateThirds}>
          {t('btnAutoSelectTop8')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
        {thirdPlaceTeams.map(team => {
          const isSelected = selectedThirds.has(team.id);
          const isDisabled = !isSelected && selectedCount >= 8;

          return (
            <div
              key={team.id}
              onClick={() => !isDisabled && onToggleSelect(team.id)}
              style={{
                background: isSelected ? 'rgba(46, 125, 50, 0.04)' : 'var(--bg-secondary)',
                border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                padding: '16px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(46, 125, 50, 0.1)' : 'none'
              }}
              className="ko-match-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  fontFamily: 'var(--serif)', 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  color: 'var(--accent-navy)'
                }}>
                  {team.group}
                </span>
                <span className="team-flag" style={{ fontSize: '24px' }}>{team.flag}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{t(team.id)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('ratingLabel')}: {team.rating}</div>
                </div>
              </div>

              <div>
                <span className={`status-badge ${isSelected ? 'qualified' : 'eliminated'}`} style={{ cursor: 'pointer' }}>
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

