export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  group: string;
  rating: number;
}

export interface ThirdPlaceAllocationSlot {
  winner: string;
  allowed: string[];
  matchId: string;
  teamSide: 'home' | 'away';
}

export interface KnockoutMatchSchema {
  id: string;
  stage: string;
  label: string;
  home: string;
  away: string;
  nextMatchId: string;
  nextSide: 'home' | 'away' | '';
}

export interface KnockoutMatch extends KnockoutMatchSchema {
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: 'home' | 'away' | null;
  winner: string;
}

export type GroupTeamsMap = Record<string, Team[]>;
