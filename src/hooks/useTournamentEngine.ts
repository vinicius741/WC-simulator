import { useMemo, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { TEAMS } from '../data/teams';
import { GROUPS, KNOCKOUT_MATCH_SCHEMA, THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';
import {
  simulateMatch,
  allocateThirdPlaces,
  clearDownstreamMatches,
  simulateGroupRanking
} from '../utils/simulatorEngine';
import useLocalStorage from './useLocalStorage';
import {
  getInitialGroupTeams,
  getInitialKnockoutMatches,
  getThirdPlaceTeamsFromGroups,
  getTopRatedThirdPlaceIds
} from '../utils/initializers';
import type { Team, KnockoutMatch, GroupTeamsMap } from '../types';

export interface TournamentEngineAPI {
  // State
  groupTeams: GroupTeamsMap;
  knockoutMatches: KnockoutMatch[];
  champion: string;
  showRecap: boolean;
  setShowRecap: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Derived
  teamMap: Record<string, Team>;
  thirdPlaceTeams: (Team & { group: string })[];
  selectedCurrentThirds: Set<string>;
  allGroupsCompleted: boolean;

  // Group stage handlers
  handleReorderTeams: (groupLetter: string, startIndex: number, endIndex: number, position: 'before' | 'after') => void;
  handleMoveTeam: (groupLetter: string, index: number, direction: 'up' | 'down') => void;
  handleSimulateGroup: (groupLetter: string) => void;
  handleSimulateAllGroups: () => void;

  // Third-place handlers
  handleToggleSelectThird: (teamId: string) => void;
  handleSimulateThirds: () => void;

  // Knockout handlers
  handleSelectWinner: (matchId: string, side: 'home' | 'away', isPenalty?: boolean) => void;
  handleSimulateAllKnockouts: () => void;

  // Reset
  handleReset: () => void;
}

export function useTournamentEngine(): TournamentEngineAPI {
  // Predictions is the primary tab (it's listed first in NavTabs), so the app
  // lands there on a fresh load instead of the group rankings.
  const [activeTab, setActiveTab] = useState<string>('predictions');
  // v3 resets stale pre-final-draw rosters (notably Poland in Group F) and
  // knockout paths saved before the official bracket mapping was corrected.
  const [groupTeams, setGroupTeams] = useLocalStorage<GroupTeamsMap>('wc2026_group_teams_v3', getInitialGroupTeams());
  const [selectedThirdsArray, setSelectedThirdsArray] = useLocalStorage<string[]>('wc2026_selected_thirds_v3', []);
  const [knockoutMatches, setKnockoutMatches] = useLocalStorage<KnockoutMatch[]>('wc2026_knockout_matches_v3', getInitialKnockoutMatches());
  const [champion, setChampion] = useLocalStorage<string>('wc2026_champion_v3', '');
  const [showRecap, setShowRecap] = useState<boolean>(false);

  // ── Derived State ──────────────────────────────────────────────────────

  const teamMap = useMemo<Record<string, Team>>(() => {
    const map: Record<string, Team> = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  const thirdPlaceTeams = useMemo(() => {
    return getThirdPlaceTeamsFromGroups(groupTeams);
  }, [groupTeams]);

  const currentThirdIds = useMemo(() => {
    return new Set(thirdPlaceTeams.map(t => t.id).filter((id): id is string => !!id));
  }, [thirdPlaceTeams]);

  const selectedCurrentThirds = useMemo(() => {
    return new Set(selectedThirdsArray.filter(id => currentThirdIds.has(id)));
  }, [selectedThirdsArray, currentThirdIds]);

  const allGroupsCompleted = selectedCurrentThirds.size === 8;

  // ── Effects ────────────────────────────────────────────────────────────

  // Clean stale third-place selections when group rankings change
  useEffect(() => {
    setSelectedThirdsArray(prev => {
      const next = prev.filter(id => currentThirdIds.has(id));
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      return unchanged ? prev : next;
    });
  }, [currentThirdIds, setSelectedThirdsArray]);

  // Sync R32 slots when group results or third-place selections change
  useEffect(() => {
    if (selectedCurrentThirds.size !== 8) {
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

    const qualifiedThirdGroups = thirdPlaceTeams
      .filter(t => t.id && selectedCurrentThirds.has(t.id))
      .map(t => t.group)
      .sort();

    const allocation = allocateThirdPlaces(qualifiedThirdGroups);

    let updatedKO: KnockoutMatch[] = knockoutMatches.map(m => {
      if (m.stage !== 'R32') return m;

      const schemaMatch = KNOCKOUT_MATCH_SCHEMA.find(x => x.id === m.id);
      const origHome = schemaMatch!.home;
      const origAway = schemaMatch!.away;

      let newHome = '';
      let newAway = '';

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

      const homeChanged = m.home !== newHome;
      const awayChanged = m.away !== newAway;

      if (homeChanged || awayChanged) {
        return { ...m, home: newHome, away: newAway, homeScore: null, awayScore: null, winner: '', penaltyWinner: null };
      }
      return { ...m, home: newHome, away: newAway };
    });

    knockoutMatches.forEach((m, idx) => {
      if (m.stage === 'R32') {
        const newM = updatedKO[idx]!;
        if (newM.winner === '' && m.winner !== '') {
          updatedKO = clearDownstreamMatches(m.id, updatedKO);
        }
      }
    });

    const finalMatch = updatedKO.find(x => x.id === 'FINAL');
    if (finalMatch && finalMatch.winner !== champion) {
      setChampion(finalMatch.winner || '');
    }

    setKnockoutMatches(updatedKO);
    // Deps are intentionally minimal: this effect re-syncs the R32 bracket only
    // when group rankings or third-place selections change. It deliberately
    // reads current champion/knockoutMatches values, so exhaustive-deps is off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupTeams, selectedThirdsArray]);

  // ── Knockout Helpers ───────────────────────────────────────────────────

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

  // ── Group Stage Handlers ──────────────────────────────────────────────

  const handleReorderTeams = (groupLetter: string, startIndex: number, endIndex: number, position: 'before' | 'after') => {
    setGroupTeams(prev => {
      const list = [...(prev[groupLetter] || [])];
      const [removed] = list.splice(startIndex, 1) as [Team];
      const adjustedEndIndex = startIndex < endIndex ? endIndex - 1 : endIndex;
      const insertIndex = position === 'after' ? adjustedEndIndex + 1 : adjustedEndIndex;
      list.splice(insertIndex, 0, removed);
      return { ...prev, [groupLetter]: list };
    });
  };

  const handleMoveTeam = (groupLetter: string, index: number, direction: 'up' | 'down') => {
    setGroupTeams(prev => {
      const list = [...(prev[groupLetter] || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < 4) {
        const temp = list[index]!;
        list[index] = list[targetIndex]!;
        list[targetIndex] = temp;
      }
      return { ...prev, [groupLetter]: list };
    });
  };

  const handleSimulateGroup = (groupLetter: string) => {
    setGroupTeams(prev => {
      const current = prev[groupLetter] || [];
      const ranked = simulateGroupRanking(current as Team[]);
      return { ...prev, [groupLetter]: ranked };
    });
  };

  const handleSimulateAllGroups = () => {
    const next: GroupTeamsMap = {};
    GROUPS.forEach(g => {
      next[g] = simulateGroupRanking(groupTeams[g] || []);
    });
    setGroupTeams(next);
    setSelectedThirdsArray(getTopRatedThirdPlaceIds(next));
  };

  // ── Third Place Handlers ──────────────────────────────────────────────

  const handleToggleSelectThird = (teamId: string) => {
    if (!currentThirdIds.has(teamId)) return;
    setSelectedThirdsArray(prev => {
      const set = new Set(prev.filter(id => currentThirdIds.has(id)));
      if (set.has(teamId)) {
        set.delete(teamId);
      } else if (set.size < 8) {
        set.add(teamId);
      }
      return Array.from(set);
    });
  };

  const handleSimulateThirds = () => {
    setSelectedThirdsArray(getTopRatedThirdPlaceIds(groupTeams));
  };

  // ── Knockout Handlers ─────────────────────────────────────────────────

  const handleSelectWinner = (matchId: string, side: 'home' | 'away', isPenalty: boolean = false) => {
    let updated: KnockoutMatch[] = knockoutMatches.map(m => {
      if (m.id === matchId) {
        const winTeam = side === 'home' ? m.home : m.away;
        const currentPenalty = m.penaltyWinner;
        let newPenalty: 'home' | 'away' | null = isPenalty ? side : null;
        if (isPenalty && currentPenalty === side) {
          newPenalty = null;
        }
        return { ...m, winner: winTeam, penaltyWinner: newPenalty };
      }
      return m;
    });

    const targetMatch = updated.find(x => x.id === matchId);
    if (targetMatch) {
      updated = propagateWinner(targetMatch, updated);
    }

    setKnockoutMatches(updated);
  };

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

            let winTeam: string;
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

  // ── Reset ──────────────────────────────────────────────────────────────

  const handleReset = () => {
    setGroupTeams(getInitialGroupTeams());
    setSelectedThirdsArray([]);
    setKnockoutMatches(getInitialKnockoutMatches());
    setChampion('');
    setShowRecap(false);
  };

  return {
    // State
    groupTeams,
    knockoutMatches,
    champion,
    showRecap,
    setShowRecap,
    activeTab,
    setActiveTab,

    // Derived
    teamMap,
    thirdPlaceTeams,
    selectedCurrentThirds,
    allGroupsCompleted,

    // Group stage
    handleReorderTeams,
    handleMoveTeam,
    handleSimulateGroup,
    handleSimulateAllGroups,

    // Third place
    handleToggleSelectThird,
    handleSimulateThirds,

    // Knockout
    handleSelectWinner,
    handleSimulateAllKnockouts,

    // Reset
    handleReset
  };
}
