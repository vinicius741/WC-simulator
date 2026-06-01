export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Mapping of which Round of 32 slot faces a third-place team
export const THIRD_PLACE_ALLOCATION_SLOTS = [
  { winner: 'A', allowed: ['C', 'E', 'F', 'H', 'I'], matchId: 'R32_7', teamSide: 'away' },
  { winner: 'B', allowed: ['E', 'F', 'G', 'I', 'J'], matchId: 'R32_13', teamSide: 'away' },
  { winner: 'D', allowed: ['B', 'E', 'F', 'I', 'J'], matchId: 'R32_10', teamSide: 'away' },
  { winner: 'E', allowed: ['A', 'B', 'C', 'D', 'F'], matchId: 'R32_2', teamSide: 'away' },
  { winner: 'G', allowed: ['A', 'E', 'H', 'I', 'J'], matchId: 'R32_9', teamSide: 'away' },
  { winner: 'I', allowed: ['C', 'D', 'F', 'G', 'H'], matchId: 'R32_6', teamSide: 'away' },
  { winner: 'K', allowed: ['D', 'E', 'I', 'J', 'L'], matchId: 'R32_16', teamSide: 'away' },
  { winner: 'L', allowed: ['E', 'H', 'I', 'J', 'K'], matchId: 'R32_8', teamSide: 'away' }
];

// Bracket match schema from Round of 32 onwards
export const KNOCKOUT_MATCH_SCHEMA = [
  // Round of 32 (Matches R32_1 to R32_16)
  { id: 'R32_1', stage: 'R32', label: 'Match 73', home: '2A', away: '2B', nextMatchId: 'R16_1', nextSide: 'home' },
  { id: 'R32_2', stage: 'R32', label: 'Match 74', home: '1E', away: '3rd', nextMatchId: 'R16_2', nextSide: 'home' },
  { id: 'R32_3', stage: 'R32', label: 'Match 75', home: '1F', away: '2C', nextMatchId: 'R16_1', nextSide: 'away' },
  { id: 'R32_4', stage: 'R32', label: 'Match 76', home: '1C', away: '2F', nextMatchId: 'R16_3', nextSide: 'home' },
  { id: 'R32_5', stage: 'R32', label: 'Match 77', home: '2E', away: '2I', nextMatchId: 'R16_2', nextSide: 'away' },
  { id: 'R32_6', stage: 'R32', label: 'Match 78', home: '1I', away: '3rd', nextMatchId: 'R16_3', nextSide: 'away' },
  { id: 'R32_7', stage: 'R32', label: 'Match 79', home: '1A', away: '3rd', nextMatchId: 'R16_4', nextSide: 'home' },
  { id: 'R32_8', stage: 'R32', label: 'Match 80', home: '1L', away: '3rd', nextMatchId: 'R16_4', nextSide: 'away' },
  { id: 'R32_9', stage: 'R32', label: 'Match 81', home: '1G', away: '3rd', nextMatchId: 'R16_5', nextSide: 'home' },
  { id: 'R32_10', stage: 'R32', label: 'Match 82', home: '1D', away: '3rd', nextMatchId: 'R16_5', nextSide: 'away' },
  { id: 'R32_11', stage: 'R32', label: 'Match 83', home: '1H', away: '2J', nextMatchId: 'R16_6', nextSide: 'home' },
  { id: 'R32_12', stage: 'R32', label: 'Match 84', home: '2K', away: '2L', nextMatchId: 'R16_6', nextSide: 'away' },
  { id: 'R32_13', stage: 'R32', label: 'Match 85', home: '1B', away: '3rd', nextMatchId: 'R16_7', nextSide: 'home' },
  { id: 'R32_14', stage: 'R32', label: 'Match 86', home: '2D', away: '2G', nextMatchId: 'R16_8', nextSide: 'home' },
  { id: 'R32_15', stage: 'R32', label: 'Match 87', home: '1J', away: '2H', nextMatchId: 'R16_7', nextSide: 'away' },
  { id: 'R32_16', stage: 'R32', label: 'Match 88', home: '1K', away: '3rd', nextMatchId: 'R16_8', nextSide: 'away' },

  // Round of 16 (Matches R16_1 to R16_8)
  { id: 'R16_1', stage: 'R16', label: 'Match 89', home: '', away: '', nextMatchId: 'QF_1', nextSide: 'home' },
  { id: 'R16_2', stage: 'R16', label: 'Match 90', home: '', away: '', nextMatchId: 'QF_1', nextSide: 'away' },
  { id: 'R16_3', stage: 'R16', label: 'Match 91', home: '', away: '', nextMatchId: 'QF_2', nextSide: 'home' },
  { id: 'R16_4', stage: 'R16', label: 'Match 92', home: '', away: '', nextMatchId: 'QF_2', nextSide: 'away' },
  { id: 'R16_5', stage: 'R16', label: 'Match 93', home: '', away: '', nextMatchId: 'QF_3', nextSide: 'home' },
  { id: 'R16_6', stage: 'R16', label: 'Match 94', home: '', away: '', nextMatchId: 'QF_3', nextSide: 'away' },
  { id: 'R16_7', stage: 'R16', label: 'Match 95', home: '', away: '', nextMatchId: 'QF_4', nextSide: 'home' },
  { id: 'R16_8', stage: 'R16', label: 'Match 96', home: '', away: '', nextMatchId: 'QF_4', nextSide: 'away' },

  // Quarter-Finals (Matches QF_1 to QF_4)
  { id: 'QF_1', stage: 'QF', label: 'Match 97', home: '', away: '', nextMatchId: 'SF_1', nextSide: 'home' },
  { id: 'QF_2', stage: 'QF', label: 'Match 98', home: '', away: '', nextMatchId: 'SF_1', nextSide: 'away' },
  { id: 'QF_3', stage: 'QF', label: 'Match 99', home: '', away: '', nextMatchId: 'SF_2', nextSide: 'home' },
  { id: 'QF_4', stage: 'QF', label: 'Match 100', home: '', away: '', nextMatchId: 'SF_2', nextSide: 'away' },

  // Semi-Finals (Matches SF_1 to SF_2)
  { id: 'SF_1', stage: 'SF', label: 'Match 101', home: '', away: '', nextMatchId: 'FINAL', nextSide: 'home' },
  { id: 'SF_2', stage: 'SF', label: 'Match 102', home: '', away: '', nextMatchId: 'FINAL', nextSide: 'away' },

  // Third Place Play-off
  { id: 'PLAYOFF_3RD', stage: '3RD', label: '3rd Place', home: '', away: '', nextMatchId: '', nextSide: '' },

  // Final
  { id: 'FINAL', stage: 'FINAL', label: 'Final', home: '', away: '', nextMatchId: '', nextSide: '' }
];
