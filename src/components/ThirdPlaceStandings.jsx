import React from 'react';

export function ThirdPlaceStandings({ thirdPlaceTeams, selectedThirds, onToggleSelect, onSimulateThirds }) {
  const selectedCount = selectedThirds.size;

  return (
    <div className="third-place-container">
      <h2 className="section-title">Select the 8 Best Third-Place Teams</h2>
      <p className="section-desc">
        Since the World Cup 2026 format features 12 groups, only 8 of the 12 third-placed teams qualify for the Round of 32. 
        Select the <strong>8 teams</strong> you want to advance by clicking on their cards.
      </p>

      {/* Progress / Status Header */}
      <div 
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
              ✓ Exactly 8 teams selected! The knockout bracket is unlocked.
            </span>
          ) : (
            <span style={{ color: 'var(--accent-red)' }}>
              Please select exactly 8 teams to advance (Currently selected: {selectedCount} / 8)
            </span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={onSimulateThirds}>
          Auto-Select Top 8
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
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{team.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating: {team.rating}</div>
                </div>
              </div>

              <div>
                <span className={`status-badge ${isSelected ? 'qualified' : 'eliminated'}`} style={{ cursor: 'pointer' }}>
                  {isSelected ? 'Qualified' : 'Select'}
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
