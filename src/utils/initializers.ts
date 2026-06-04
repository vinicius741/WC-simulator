import { TEAMS } from '../data/teams';
import { GROUPS, KNOCKOUT_MATCH_SCHEMA } from '../data/constants';
import type { Team, KnockoutMatch, GroupTeamsMap } from '../types';

export const getInitialGroupTeams = (): GroupTeamsMap => {
  const obj: GroupTeamsMap = {};
  GROUPS.forEach(g => {
    obj[g] = TEAMS.filter(t => t.group === g);
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

export const getTopRatedThirdPlaceIds = (groups: GroupTeamsMap): string[] => {
  return getThirdPlaceTeamsFromGroups(groups)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 8)
    .map(t => t.id)
    .filter((id): id is string => !!id);
};
