import React, { useMemo, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { TEAMS } from './data/teams';
import { GROUPS, KNOCKOUT_MATCH_SCHEMA, THIRD_PLACE_ALLOCATION_SLOTS } from './data/constants';
import {
  simulateMatch,
  allocateThirdPlaces,
  clearDownstreamMatches,
  simulateGroupRanking
} from './utils/simulatorEngine';
import useLocalStorage from './hooks/useLocalStorage';
import GroupCard from './components/GroupCard';
import ThirdPlaceStandings from './components/ThirdPlaceStandings';
import KnockoutBracket from './components/KnockoutBracket';
import RecapModal from './components/RecapModal';
import type { Team, KnockoutMatch, GroupTeamsMap } from './types';
import { useLanguage } from './hooks/useLanguage';

// Initialize Group Teams
const getInitialGroupTeams = (): GroupTeamsMap => {
  const obj: GroupTeamsMap = {};
  GROUPS.forEach(g => {
    obj[g] = TEAMS.filter(t => t.group === g);
  });
  return obj;
};

// Initialize Knockout matches
const getInitialKnockoutMatches = (): KnockoutMatch[] => {
  return KNOCKOUT_MATCH_SCHEMA.map(m => ({
    ...m,
    home: m.home || '',
    away: m.away || '',
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    winner: ''
  }));
};

const getThirdPlaceTeamsFromGroups = (groups: GroupTeamsMap): (Team & { group: string })[] => {
  return GROUPS.map(g => {
    const teams = groups[g] || [];
    const thirdTeam = teams[2];
    return {
      ...(thirdTeam || { id: '', name: '', code: '', flag: '', group: g, rating: 0 }),
      group: g
    };
  });
};

const getTopRatedThirdPlaceIds = (groups: GroupTeamsMap): string[] => {
  return getThirdPlaceTeamsFromGroups(groups)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 8)
    .map(t => t.id)
    .filter((id): id is string => !!id);
};

function App() {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('groups');
  const [groupTeams, setGroupTeams] = useLocalStorage<GroupTeamsMap>('wc2026_group_teams_v2', getInitialGroupTeams());
  const [selectedThirdsArray, setSelectedThirdsArray] = useLocalStorage<string[]>('wc2026_selected_thirds_v2', []);
  const [knockoutMatches, setKnockoutMatches] = useLocalStorage<KnockoutMatch[]>('wc2026_knockout_matches_v2', getInitialKnockoutMatches());
  const [champion, setChampion] = useLocalStorage<string>('wc2026_champion_v2', '');
  const [showRecap, setShowRecap] = useState<boolean>(false);

  // Map of teamId to team object for easy lookup
  const teamMap = useMemo<Record<string, Team>>(() => {
    const map: Record<string, Team> = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  // Set of selected 3rd-place team IDs for fast lookup
  const selectedThirds = useMemo(() => new Set(selectedThirdsArray), [selectedThirdsArray]);

  // Derived list of the 12 third-placed teams (index 2 in each group)
  const thirdPlaceTeams = useMemo(() => {
    return getThirdPlaceTeamsFromGroups(groupTeams);
  }, [groupTeams]);

  const currentThirdIds = useMemo(() => {
    return new Set(thirdPlaceTeams.map(t => t.id).filter((id): id is string => !!id));
  }, [thirdPlaceTeams]);

  const selectedCurrentThirds = useMemo(() => {
    return new Set(selectedThirdsArray.filter(id => currentThirdIds.has(id)));
  }, [selectedThirdsArray, currentThirdIds]);

  // Check if exactly 8 current third-place teams are selected
  const allGroupsCompleted = selectedCurrentThirds.size === 8;

  useEffect(() => {
    setSelectedThirdsArray(prev => {
      const next = prev.filter(id => currentThirdIds.has(id));
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      return unchanged ? prev : next;
    });
  }, [currentThirdIds, setSelectedThirdsArray]);

  // Drag and drop reordering of team position in a group
  const handleReorderTeams = (groupLetter: string, startIndex: number, endIndex: number, position: 'before' | 'after') => {
    setGroupTeams(prev => {
      const list = [...(prev[groupLetter] || [])];
      const [removed] = list.splice(startIndex, 1) as [Team];
      const adjustedEndIndex = startIndex < endIndex ? endIndex - 1 : endIndex;
      const insertIndex = position === 'after' ? adjustedEndIndex + 1 : adjustedEndIndex;
      list.splice(insertIndex, 0, removed);
      return {
        ...prev,
        [groupLetter]: list
      };
    });
  };

  // Reorder team position in a group using arrow keys/buttons (swap index with index - 1 or index + 1)
  const handleMoveTeam = (groupLetter: string, index: number, direction: 'up' | 'down') => {
    setGroupTeams(prev => {
      const list = [...(prev[groupLetter] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex >= 0 && targetIndex < 4) {
        const temp = list[index]!;
        list[index] = list[targetIndex]!;
        list[targetIndex] = temp;
      }
      return {
        ...prev,
        [groupLetter]: list
      };
    });
  };

  // Simulate a single group ranking
  const handleSimulateGroup = (groupLetter: string) => {
    setGroupTeams(prev => {
      const current = prev[groupLetter] || [];
      const ranked = simulateGroupRanking(current as Team[]);
      return {
        ...prev,
        [groupLetter]: ranked
      };
    });
  };

  // Simulate all group rankings
  const handleSimulateAllGroups = () => {
    const next: GroupTeamsMap = {};
    GROUPS.forEach(g => {
      next[g] = simulateGroupRanking(groupTeams[g] || []);
    });
    setGroupTeams(next);
    setSelectedThirdsArray(getTopRatedThirdPlaceIds(next));
  };

  // Toggle selection of a third place team
  const handleToggleSelectThird = (teamId: string) => {
    if (!currentThirdIds.has(teamId)) return;

    setSelectedThirdsArray(prev => {
      const set = new Set(prev.filter(id => currentThirdIds.has(id)));
      if (set.has(teamId)) {
        set.delete(teamId);
      } else {
        if (set.size < 8) {
          set.add(teamId);
        }
      }
      return Array.from(set);
    });
  };

  // Auto-simulate third place selection (takes top 8 rated third-placed teams)
  const handleSimulateThirds = () => {
    setSelectedThirdsArray(getTopRatedThirdPlaceIds(groupTeams));
  };

  // Update R32 slots dynamically when group stage results or 3rd place selections change
  useEffect(() => {
    if (selectedCurrentThirds.size !== 8) {
      // Clear knockout bracket if 3rd place selection is incomplete
      setKnockoutMatches(prev => prev.map(m => ({
        ...m,
        home: m.stage === 'R32' ? '' : m.home,
        away: m.stage === 'R32' ? '' : m.away,
        homeScore: null,
        awayScore: null,
        penaltyWinner: null,
        winner: ''
      })));
      setChampion('');
      return;
    }

    // 1. Gather qualified third-place groups
    const qualifiedThirdGroups = thirdPlaceTeams.filter(t => t.id && selectedCurrentThirds.has(t.id)).map(t => t.group).sort();

    // 2. Solve third place allocation using backtracking matching
    const allocation = allocateThirdPlaces(qualifiedThirdGroups);

    // 3. Map teams to R32 matches
    let updatedKO: KnockoutMatch[] = knockoutMatches.map(m => {
      if (m.stage !== 'R32') return m;

      // Find schema placeholders
      const schemaMatch = KNOCKOUT_MATCH_SCHEMA.find(x => x.id === m.id);
      const origHome = schemaMatch!.home;
      const origAway = schemaMatch!.away;

      let newHome = '';
      let newAway = '';

      // Resolve home team
      if (origHome === '3rd') {
        const slotDef = THIRD_PLACE_ALLOCATION_SLOTS.find(s => s.matchId === m.id && s.teamSide === 'home');
        if (slotDef) {
          const allocatedGroup = allocation[slotDef.winner]!;
          newHome = groupTeams[allocatedGroup]?.[2]?.id || '';
        }
      } else if (origHome) {
        const num = origHome.charAt(0);
        const grp = origHome.substring(1);
        const idx = num === '1' ? 0 : 1;
        newHome = groupTeams[grp]?.[idx]?.id || '';
      }

      // Resolve away team
      if (origAway === '3rd') {
        const slotDef = THIRD_PLACE_ALLOCATION_SLOTS.find(s => s.matchId === m.id && s.teamSide === 'away');
        if (slotDef) {
          const allocatedGroup = allocation[slotDef.winner]!;
          newAway = groupTeams[allocatedGroup]?.[2]?.id || '';
        }
      } else if (origAway) {
        const num = origAway.charAt(0);
        const grp = origAway.substring(1);
        const idx = num === '1' ? 0 : 1;
        newAway = groupTeams[grp]?.[idx]?.id || '';
      }

      // Check if home or away has changed
      const homeChanged = m.home !== newHome;
      const awayChanged = m.away !== newAway;

      if (homeChanged || awayChanged) {
        return {
          ...m,
          home: newHome,
          away: newAway,
          homeScore: null,
          awayScore: null,
          winner: '',
          penaltyWinner: null
        };
      }

      return {
        ...m,
        home: newHome,
        away: newAway
      };
    });

    // Clean downstream matches of changed R32 matches
    knockoutMatches.forEach((m, idx) => {
      if (m.stage === 'R32') {
        const newM = updatedKO[idx]!;
        if (newM.winner === '' && m.winner !== '') {
          updatedKO = clearDownstreamMatches(m.id, updatedKO);
        }
      }
    });

    // Check if champion is still valid
    const finalMatch = updatedKO.find(x => x.id === 'FINAL');
    if (finalMatch && finalMatch.winner !== champion) {
      setChampion(finalMatch.winner || '');
    }

    setKnockoutMatches(updatedKO);
  }, [groupTeams, selectedThirdsArray]);

  // Select knockout winner directly (clicking team card or setting penalty winner)
  const handleSelectWinner = (matchId: string, side: 'home' | 'away', isPenalty: boolean = false) => {
    let updated: KnockoutMatch[] = knockoutMatches.map(m => {
      if (m.id === matchId) {
        const winTeam = side === 'home' ? m.home : m.away;

        // If clicking same winner again and toggling PK
        const currentPenalty = m.penaltyWinner;
        let newPenalty: 'home' | 'away' | null = isPenalty ? side : null;

        // If PK is already set to this side and user clicks PK again, toggle it off
        if (isPenalty && currentPenalty === side) {
          newPenalty = null;
        }

        return {
          ...m,
          winner: winTeam,
          penaltyWinner: newPenalty
        };
      }
      return m;
    });

    // Propagate winner
    const targetMatch = updated.find(x => x.id === matchId);
    if (targetMatch) {
      updated = propagateWinner(targetMatch, updated);
    }

    setKnockoutMatches(updated);
  };

  // Propagates winner to the next match slot or sets champion
  const propagateWinner = (match: KnockoutMatch, matchesList: KnockoutMatch[]): KnockoutMatch[] => {
    let updated = [...matchesList];
    const hasWinner = match.winner !== '';

    if (match.id === 'FINAL') {
      setChampion(match.winner || '');
      if (hasWinner) {
        confetti({
          particleCount: 180,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#b00000', '#0d1e36', '#c5a059', '#2e7d32', '#71767a']
        });
        setShowRecap(true);
      }
      return updated;
    }

    // Normal propagation
    if (match.nextMatchId) {
      const nextIdx = updated.findIndex(x => x.id === match.nextMatchId);
      if (nextIdx !== -1) {
        const nextM = updated[nextIdx]!;
        const side = match.nextSide as 'home' | 'away';
        const prevWinner = nextM[side];
        const newWinner = match.winner;

        if (prevWinner !== newWinner) {
          updated[nextIdx] = {
            ...nextM,
            [side]: newWinner,
            [`${side}Score`]: null,
            winner: ''
          };
          updated = clearDownstreamMatches(nextM.id, updated);
        }
      }
    }

    // Semifinals losers play in PLAYOFF_3RD
    if (match.stage === 'SF') {
      const playoffIdx = updated.findIndex(x => x.id === 'PLAYOFF_3RD');
      if (playoffIdx !== -1) {
        const playoffM = updated[playoffIdx]!;
        const side = match.nextSide as 'home' | 'away';
        const loser = match.winner === match.home ? match.away : match.home;

        if (playoffM[side] !== loser) {
          updated[playoffIdx] = {
            ...playoffM,
            [side]: loser || '',
            [`${side}Score`]: null,
            winner: ''
          };
          updated = clearDownstreamMatches('PLAYOFF_3RD', updated);
        }
      }
    }

    return updated;
  };

  // Automatically simulates the remaining knockout matches
  const handleSimulateAllKnockouts = () => {
    if (!allGroupsCompleted) return;

    let updated = [...knockoutMatches];
    const stages = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];

    stages.forEach(stage => {
      updated.forEach((m, idx) => {
        if (m.stage === stage || (stage === '3RD' && m.stage === '3RD') || (stage === 'FINAL' && m.stage === 'FINAL')) {
          if (m.home && m.away) {
            const homeRating = teamMap[m.home]?.rating || 80;
            const awayRating = teamMap[m.away]?.rating || 80;
            const res = simulateMatch(homeRating, awayRating);
            
            let winTeam = '';
            let penWin: 'home' | 'away' | null = null;

            if (res.homeScore > res.awayScore) {
              winTeam = m.home;
            } else if (res.homeScore < res.awayScore) {
              winTeam = m.away;
            } else {
              const totalRating = homeRating + awayRating;
              penWin = Math.random() < (homeRating / totalRating) ? 'home' : 'away';
              winTeam = penWin === 'home' ? m.home : m.away;
            }

            const updatedMatch: KnockoutMatch = {
              ...m,
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              winner: winTeam,
              penaltyWinner: penWin
            };

            updated[idx] = updatedMatch;
            updated = propagateWinner(updatedMatch, updated);
          }
        }
      });
    });

    setKnockoutMatches(updated);
  };

  // Reset simulator
  const handleReset = () => {
    setGroupTeams(getInitialGroupTeams());
    setSelectedThirdsArray([]);
    setKnockoutMatches(getInitialKnockoutMatches());
    setChampion('');
    setShowRecap(false);
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <header className="app-header">
        <div className="lang-switcher">
          <button 
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            🇺🇸 EN
          </button>
          <button 
            className={`lang-btn ${language === 'pt-BR' ? 'active' : ''}`}
            onClick={() => setLanguage('pt-BR')}
          >
            🇧🇷 PT-BR
          </button>
        </div>
        <div className="app-title-container">
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubTitle')}</p>
        </div>
      </header>

      {/* Nav Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          {t('tabGroups')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'third-place' ? 'active' : ''}`}
          onClick={() => setActiveTab('third-place')}
        >
          {t('tabThirdPlace')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'knockout' ? 'active' : ''} ${!allGroupsCompleted ? 'disabled' : ''}`}
          onClick={() => allGroupsCompleted && setActiveTab('knockout')}
          title={!allGroupsCompleted ? t('tabKnockoutTooltip') : ''}
          style={{ opacity: !allGroupsCompleted ? 0.5 : 1, cursor: !allGroupsCompleted ? 'not-allowed' : 'pointer' }}
        >
          {t('tabKnockout')}
        </button>
      </nav>

      {/* Control Actions Bar */}
      <div className="controls-bar">
        <div className="action-group">
          {activeTab === 'groups' && (
            <>
              <button className="btn btn-primary" onClick={handleSimulateAllGroups}>
                {t('btnSimulateAllGroups')}
              </button>
              <button className="btn" onClick={handleReset}>
                {t('btnResetRankings')}
              </button>
            </>
          )}
          {activeTab === 'third-place' && (
            <button className="btn" onClick={handleReset}>
              {t('btnResetSelections')}
            </button>
          )}
          {activeTab === 'knockout' && (
            <>
              <button className="btn btn-secondary" onClick={handleSimulateAllKnockouts}>
                {t('btnSimulateKnockouts')}
              </button>
              <button className="btn" onClick={handleReset}>
                {t('btnResetBracket')}
              </button>
              {champion && (
                <button className="btn btn-primary" style={{ background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', color: '#fff' }} onClick={() => setShowRecap(true)}>
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
              {t('thirdsChosenInfo', { selected: selectedThirds.size })}
            </span>
          )}
        </div>
      </div>

      {/* Main Pages Content */}
      <main>
        {activeTab === 'groups' && (
          <div className="groups-grid">
            {GROUPS.map(g => (
              <GroupCard
                key={g}
                groupLetter={g}
                teams={groupTeams[g] || []}
                onReorderTeams={handleReorderTeams}
                onMoveTeam={handleMoveTeam}
                onSimulateGroup={handleSimulateGroup}
              />
            ))}
          </div>
        )}

        {activeTab === 'third-place' && (
          <ThirdPlaceStandings 
            thirdPlaceTeams={thirdPlaceTeams} 
            selectedThirds={selectedCurrentThirds}
            onToggleSelect={handleToggleSelectThird}
            onSimulateThirds={handleSimulateThirds}
          />
        )}

        {activeTab === 'knockout' && allGroupsCompleted && (
          <KnockoutBracket
            knockoutMatches={knockoutMatches}
            onSelectWinner={handleSelectWinner}
            champion={champion}
          />
        )}
      </main>

      {/* Champion path to glory recap modal */}
      {showRecap && champion && (
        <RecapModal
          championId={champion}
          groupTeams={groupTeams}
          knockoutMatches={knockoutMatches}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}

export default App;
