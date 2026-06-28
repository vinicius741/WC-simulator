import { TEAMS } from '../data/teams';
import { GROUPS, KNOCKOUT_MATCH_SCHEMA } from '../data/constants';
import {
  CURRENT_GROUP_ORDERS,
  ELIMINATED_TEAM_IDS,
  LOCKED_QUALIFIED_THIRD_PLACE_IDS,
} from '../data/currentTournamentState';
import type { Team, KnockoutMatch, GroupTeamsMap } from '../types';

const teamById = new Map(TEAMS.map(team => [team.id, team]));

const teamsFromOrder = (ids: string[], fallbackGroup: string): Team[] => {
  const ordered = ids.map(id => teamById.get(id)).filter((team): team is Team => !!team);
  return ordered.length === 4 ? ordered : TEAMS.filter(t => t.group === fallbackGroup);
};

export const getInitialGroupTeams = (): GroupTeamsMap => {
  const obj: GroupTeamsMap = {};
  GROUPS.forEach(g => {
    obj[g] = teamsFromOrder(CURRENT_GROUP_ORDERS[g] || [], g);
  });
  return obj;
};

export const getInitialKnockoutMatches = (): KnockoutMatch[] => {
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

export const getThirdPlaceTeamsFromGroups = (groups: GroupTeamsMap): (Team & { group: string })[] => {
  return GROUPS.map(g => {
    const teams = groups[g] || [];
    const thirdTeam = teams[2];
    return {
      ...(thirdTeam || { id: '', name: '', code: '', flag: '', group: g, rating: 0 }),
      group: g
    };
  });
};

export const getInitialSelectedThirdPlaceIds = (): string[] => {
  return Array.from(LOCKED_QUALIFIED_THIRD_PLACE_IDS);
};

export const getTopRatedThirdPlaceIds = (groups: GroupTeamsMap, excludedIds: Set<string> = ELIMINATED_TEAM_IDS): string[] => {
  const thirdPlaceTeams = getThirdPlaceTeamsFromGroups(groups)
    .filter(t => !excludedIds.has(t.id));
  const lockedQualified = thirdPlaceTeams
    .filter(t => LOCKED_QUALIFIED_THIRD_PLACE_IDS.has(t.id))
    .map(t => t.id)
    .filter((id): id is string => !!id);
  const lockedSet = new Set(lockedQualified);
  const simulated = thirdPlaceTeams
    .filter(t => !lockedSet.has(t.id))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 8 - lockedQualified.length)
    .map(t => t.id)
    .filter((id): id is string => !!id);

  return [...lockedQualified, ...simulated];
};
