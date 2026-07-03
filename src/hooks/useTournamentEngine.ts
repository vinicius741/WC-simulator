import { useMemo, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { TEAMS } from '../data/teams';
import { KNOCKOUT_MATCH_SCHEMA, THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';
import {
  ELIMINATED_TEAM_IDS,
} from '../data/currentTournamentState';
import {
  simulateMatch,
  allocateThirdPlaces,
  clearDownstreamMatches,
  applyRealKnockoutResults,
} from '../utils/simulatorEngine';
import { api } from '../utils/apiClient';
import useLocalStorage from './useLocalStorage';
import {
  getInitialGroupTeams,
  getInitialKnockoutMatches,
  getInitialSelectedThirdPlaceIds,
  getThirdPlaceTeamsFromGroups,
} from '../utils/initializers';
import type { Team, KnockoutMatch, GroupTeamsMap, RealKnockoutResult } from '../types';

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
  knockoutAvailable: boolean;
  eliminatedTeamIds: Set<string>;

  // Knockout handlers
  handleSelectWinner: (matchId: string, side: 'home' | 'away', isPenalty?: boolean) => void;
  handleSimulateAllKnockouts: () => void;

  // Real results (pre-fill the bracket from the predictions backend)
  realResultsLoading: boolean;
  realResultsError: string | null;
  realResultsAt: string | null;
  refreshRealResults: () => Promise<void>;

  // Reset
  handleReset: () => void;
}

export function useTournamentEngine(): TournamentEngineAPI {
  // Predictions is the primary tab (it's listed first in NavTabs), so the app
  // lands there on a fresh load instead of the group rankings.
  const [activeTab, setActiveTab] = useState<string>('predictions');
  // v5 resets stale pre-knockout simulations now that all group standings,
  // qualified third-place teams, and eliminations are official.
  const [groupTeams, setGroupTeams] = useLocalStorage<GroupTeamsMap>('wc2026_group_teams_v5', getInitialGroupTeams());
  const [selectedThirdsArray, setSelectedThirdsArray] = useLocalStorage<string[]>('wc2026_selected_thirds_v5', getInitialSelectedThirdPlaceIds());
  const [knockoutMatches, setKnockoutMatches] = useLocalStorage<KnockoutMatch[]>('wc2026_knockout_matches_v5', getInitialKnockoutMatches());
  const [champion, setChampion] = useLocalStorage<string>('wc2026_champion_v5', '');
  const [showRecap, setShowRecap] = useState<boolean>(false);
  // Real (played) knockout results pulled from the predictions backend. Fetched
  // on mount, when the user opens the Knockout tab, and via a manual refresh.
  const [realResultsLoading, setRealResultsLoading] = useState(false);
  const [realResultsError, setRealResultsError] = useState<string | null>(null);
  const [realResultsAt, setRealResultsAt] = useState<string | null>(null);

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
  const knockoutAvailable = true;

  // ── Effects ────────────────────────────────────────────────────────────

  // Clean stale third-place selections when group rankings change
  useEffect(() => {
    setSelectedThirdsArray(prev => {
      const next = prev.filter(id => currentThirdIds.has(id) && !ELIMINATED_TEAM_IDS.has(id));
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      return unchanged ? prev : next;
    });
  }, [currentThirdIds, setSelectedThirdsArray]);

  // Sync R32 slots when group results or third-place selections change
  useEffect(() => {
    const qualifiedThirdGroups = thirdPlaceTeams
      .filter(t => t.id && selectedCurrentThirds.has(t.id))
      .map(t => t.group)
      .sort();

    const allocation = allocateThirdPlaces(qualifiedThirdGroups);
    const canAllocateThirds = selectedCurrentThirds.size === 8 && Object.keys(allocation).length === 8;

    let updatedKO: KnockoutMatch[] = knockoutMatches.map(m => {
      if (m.stage !== 'R32') return m;

      const schemaMatch = KNOCKOUT_MATCH_SCHEMA.find(x => x.id === m.id);
      const origHome = schemaMatch!.home;
      const origAway = schemaMatch!.away;

      let newHome = '';
      let newAway = '';

      if (origHome === '3rd') {
        const slotDef = canAllocateThirds
          ? THIRD_PLACE_ALLOCATION_SLOTS.find(s => s.matchId === m.id && s.teamSide === 'home')
          : undefined;
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
        const slotDef = canAllocateThirds
          ? THIRD_PLACE_ALLOCATION_SLOTS.find(s => s.matchId === m.id && s.teamSide === 'away')
          : undefined;
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

  // ── Real Knockout Results (pre-fill the bracket) ──────────────────────

  // Fold real, decided knockout results into the bracket. Idempotent, so it's
  // safe to run on every fetch. The champion is re-derived from the (possibly
  // newly locked) Final afterward.
  const applyRealResults = useCallback((fetchedAt: string, results: RealKnockoutResult[]) => {
    setKnockoutMatches(prev => {
      const next = applyRealKnockoutResults(prev, results);
      if (next === prev) return prev;
      // If the real Final has been decided, that's the champion — lock it in.
      const finalMatch = next.find(m => m.id === 'FINAL');
      const realChampion = finalMatch?.locked ? finalMatch.winner : '';
      if (realChampion && realChampion !== champion) setChampion(realChampion);
      return next;
    });
    setRealResultsAt(fetchedAt);
    setRealResultsError(null);
  }, [setKnockoutMatches, setChampion, champion]);

  const refreshRealResults = useCallback(async () => {
    setRealResultsLoading(true);
    setRealResultsError(null);
    try {
      const data = await api.getResults();
      applyRealResults(data.fetched_at, data.results);
    } catch (e) {
      // Degrade gracefully: a fetch failure leaves the bracket manual.
      setRealResultsError(e instanceof Error ? e.message : 'Failed to load results.');
    } finally {
      setRealResultsLoading(false);
    }
  }, [applyRealResults]);

  // Fetch on mount, and again whenever the user opens the Knockout tab (so the
  // bracket is fresh when they actually look at it).
  useEffect(() => {
    void refreshRealResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (activeTab === 'knockout') void refreshRealResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab === 'knockout']);

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
        // A locked downstream match holds a real, decided result — never let a
        // pick on its feeder overwrite its teams or clear its winner.
        if (!nextM.locked) {
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
    }

    if (match.stage === 'SF') {
      const playoffIdx = updated.findIndex(x => x.id === 'PLAYOFF_3RD');
      if (playoffIdx !== -1) {
        const playoffM = updated[playoffIdx]!;
        // Same guard: don't overwrite a real, decided 3rd-place result.
        if (!playoffM.locked) {
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
    }

    return updated;
  };

  // ── Knockout Handlers ─────────────────────────────────────────────────

  const handleSelectWinner = (matchId: string, side: 'home' | 'away', isPenalty: boolean = false) => {
    // Locked matches reflect real, decided results — ignore user picks on them.
    const target = knockoutMatches.find(m => m.id === matchId);
    if (target?.locked) return;

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
          // Skip matches already decided by a real result.
          if (m.locked) return;
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
    setSelectedThirdsArray(getInitialSelectedThirdPlaceIds());
    setKnockoutMatches(getInitialKnockoutMatches());
    setChampion('');
    setShowRecap(false);
    // Re-apply real results so the bracket reflects reality after a reset.
    void refreshRealResults();
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
    knockoutAvailable,
    eliminatedTeamIds: ELIMINATED_TEAM_IDS,

    // Knockout
    handleSelectWinner,
    handleSimulateAllKnockouts,

    // Real results
    realResultsLoading,
    realResultsError,
    realResultsAt,
    refreshRealResults,

    // Reset
    handleReset
  };
}
