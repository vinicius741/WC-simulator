import React, { useState } from 'react';
import { TEAMS } from '../data/teams';

export function KnockoutBracket({
  knockoutMatches,
  onSelectWinner,
  champion
}) {
  const [activeStageFilter, setActiveStageFilter] = useState('ALL');

  // Map of teamId to team object for easy lookup
  const teamMap = React.useMemo(() => {
    const map = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  // Helper to render team name/flag or placeholder
  const renderTeamName = (teamId, placeholderText) => {
    if (!teamId) {
      return <span className="ko-team-placeholder">{placeholderText}</span>;
    }
    const team = teamMap[teamId];
    return (
      <div className="ko-team-info">
        <span className="team-flag">{team?.flag}</span>
        <span className="team-name" title={team?.name}>{team?.name}</span>
      </div>
    );
  };

  const getPlaceholderText = (placeholderCode) => {
    if (placeholderCode === '3rd') return 'Best 3rd Place';
    const num = placeholderCode.charAt(0);
    const grp = placeholderCode.substring(1);
    const prefix = num === '1' ? 'Winner' : 'Runner-up';
    return `${prefix} Grp ${grp}`;
  };

  // Group matches by stage
  const stages = {
    R32: { label: 'Round of 32', matches: [] },
    R16: { label: 'Round of 16', matches: [] },
    QF: { label: 'Quarter-finals', matches: [] },
    SF: { label: 'Semi-finals', matches: [] },
    FINALS: { label: 'Finals', matches: [] } // Final & 3rd Place
  };

  knockoutMatches.forEach(m => {
    if (m.stage === 'R32') stages.R32.matches.push(m);
    else if (m.stage === 'R16') stages.R16.matches.push(m);
    else if (m.stage === 'QF') stages.QF.matches.push(m);
    else if (m.stage === 'SF') stages.SF.matches.push(m);
    else if (m.stage === 'FINAL' || m.stage === '3RD') stages.FINALS.matches.push(m);
  });

  const handlePenaltyToggle = (matchId, side, e) => {
    e.stopPropagation();
    onSelectWinner(matchId, side, true);
  };

  const renderMatchCard = (match) => {
    const isHomeWinner = match.winner === match.home && match.winner !== '';
    const isAwayWinner = match.winner === match.away && match.winner !== '';

    return (
      <div className="ko-match-card" key={match.id}>
        <div className="ko-match-header">
          <span>{match.label}</span>
          <span style={{ textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>{match.stage}</span>
        </div>
        <div className="ko-match-teams">
          {/* Home Team */}
          <div 
            className={`ko-team-row ${!match.home ? 'placeholder' : ''} ${isHomeWinner ? 'winner' : ''}`}
            onClick={() => match.home && onSelectWinner(match.id, 'home')}
          >
            {renderTeamName(match.home, getPlaceholderText(match.home || '1A'))}
            {match.home && isHomeWinner && (
              <button
                className={`penalty-btn ${match.penaltyWinner === 'home' ? 'active' : ''}`}
                onClick={(e) => handlePenaltyToggle(match.id, 'home', e)}
                title="Toggle Penalty Win"
              >
                PK
              </button>
            )}
          </div>

          {/* Away Team */}
          <div 
            className={`ko-team-row ${!match.away ? 'placeholder' : ''} ${isAwayWinner ? 'winner' : ''}`}
            onClick={() => match.away && onSelectWinner(match.id, 'away')}
          >
            {renderTeamName(match.away, getPlaceholderText(match.away || '2B'))}
            {match.away && isAwayWinner && (
              <button
                className={`penalty-btn ${match.penaltyWinner === 'away' ? 'active' : ''}`}
                onClick={(e) => handlePenaltyToggle(match.id, 'away', e)}
                title="Toggle Penalty Win"
              >
                PK
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (stageKey, title) => {
    const stage = stages[stageKey];
    const isFilteredOut = activeStageFilter !== 'ALL' && activeStageFilter !== stageKey;

    if (isFilteredOut) return null;

    return (
      <div className="bracket-column" key={stageKey}>
        <h4 className="column-header">{title}</h4>
        {stage.matches.map(m => renderMatchCard(m))}
      </div>
    );
  };

  const champTeam = champion ? teamMap[champion] : null;

  return (
    <div>
      <div className="info-banner">
        <span>ℹ️</span>
        <span>
          Click on a team to select them as the winner and advance them to the next round.
          Toggle the <strong>"PK"</strong> badge on the winner if the match went to penalties.
        </span>
      </div>

      {/* Mobile Stage Selector */}
      <div className="bracket-stage-tabs">
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('ALL')}
        >
          All Stages
        </button>
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'R32' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('R32')}
        >
          Round of 32
        </button>
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'R16' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('R16')}
        >
          Round of 16
        </button>
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'QF' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('QF')}
        >
          Quarter-finals
        </button>
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'SF' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('SF')}
        >
          Semi-finals
        </button>
        <button 
          className={`stage-tab-btn ${activeStageFilter === 'FINALS' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('FINALS')}
        >
          Finals
        </button>
      </div>

      <div className="bracket-wrapper">
        <div className="bracket-grid">
          {renderColumn('R32', 'Round of 32')}
          {renderColumn('R16', 'Round of 16')}
          {renderColumn('QF', 'Quarter-finals')}
          {renderColumn('SF', 'Semi-finals')}
          {renderColumn('FINALS', 'Finals')}

          {/* Winner Display Column */}
          {(activeStageFilter === 'ALL' || activeStageFilter === 'FINALS') && (
            <div className="final-winner-column">
              <h4 className="column-header">Champion</h4>
              {champTeam ? (
                <div className="champion-display-card">
                  <h3>🏆 World Champion 🏆</h3>
                  <span className="champion-flag">{champTeam.flag}</span>
                  <div className="champion-name">{champTeam.name}</div>
                  <div className="champion-code">{champTeam.code}</div>
                </div>
              ) : (
                <div className="champion-empty">
                  <span>🏆</span>
                  <span>Predict the champion!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KnockoutBracket;
