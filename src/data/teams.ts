import type { Team } from '../types';

export const TEAMS: Team[] = [
  // Group A
  { id: 'mex', name: 'Mexico', code: 'MEX', flag: '🇲🇽', group: 'A', rating: 81 },
  { id: 'rsa', name: 'South Africa', code: 'RSA', flag: '🇿🇦', group: 'A', rating: 75 },
  { id: 'kor', name: 'Korea Republic', code: 'KOR', flag: '🇰🇷', group: 'A', rating: 80 },
  { id: 'cze', name: 'Czechia', code: 'CZE', flag: '🇨🇿', group: 'A', rating: 80 },

  // Group B
  { id: 'can', name: 'Canada', code: 'CAN', flag: '🇨🇦', group: 'B', rating: 80 },
  { id: 'bih', name: 'Bosnia & Herzegovina', code: 'BIH', flag: '🇧🇦', group: 'B', rating: 77 },
  { id: 'qat', name: 'Qatar', code: 'QAT', flag: '🇶🇦', group: 'B', rating: 73 },
  { id: 'sui', name: 'Switzerland', code: 'SUI', flag: '🇨🇭', group: 'B', rating: 83 },

  // Group C
  { id: 'bra', name: 'Brazil', code: 'BRA', flag: '🇧🇷', group: 'C', rating: 92 },
  { id: 'mar', name: 'Morocco', code: 'MAR', flag: '🇲🇦', group: 'C', rating: 86 },
  { id: 'hai', name: 'Haiti', code: 'HAI', flag: '🇭🇹', group: 'C', rating: 70 },
  { id: 'sco', name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', rating: 79 },

  // Group D
  { id: 'usa', name: 'United States', code: 'USA', flag: '🇺🇸', group: 'D', rating: 83 },
  { id: 'par', name: 'Paraguay', code: 'PAR', flag: '🇵🇾', group: 'D', rating: 79 },
  { id: 'aus', name: 'Australia', code: 'AUS', flag: '🇦🇺', group: 'D', rating: 79 },
  { id: 'tur', name: 'Türkiye', code: 'TUR', flag: '🇹🇷', group: 'D', rating: 81 },

  // Group E
  { id: 'ger', name: 'Germany', code: 'GER', flag: '🇩🇪', group: 'E', rating: 89 },
  { id: 'cuw', name: 'Curaçao', code: 'CUW', flag: '🇨🇼', group: 'E', rating: 71 },
  { id: 'civ', name: "Côte d'Ivoire", code: 'CIV', flag: '🇨🇮', group: 'E', rating: 82 },
  { id: 'ecu', name: 'Ecuador', code: 'ECU', flag: '🇪🇨', group: 'E', rating: 82 },

  // Group F
  { id: 'ned', name: 'Netherlands', code: 'NED', flag: '🇳🇱', group: 'F', rating: 88 },
  { id: 'jpn', name: 'Japan', code: 'JPN', flag: '🇯🇵', group: 'F', rating: 83 },
  { id: 'pol', name: 'Poland', code: 'POL', flag: '🇵🇱', group: 'F', rating: 81 },
  { id: 'tun', name: 'Tunisia', code: 'TUN', flag: '🇹🇳', group: 'F', rating: 76 },

  // Group G
  { id: 'bel', name: 'Belgium', code: 'BEL', flag: '🇧🇪', group: 'G', rating: 88 },
  { id: 'egy', name: 'Egypt', code: 'EGY', flag: '🇪🇬', group: 'G', rating: 80 },
  { id: 'irn', name: 'IR Iran', code: 'IRN', flag: '🇮🇷', group: 'G', rating: 79 },
  { id: 'nzl', name: 'New Zealand', code: 'NZL', flag: '🇳🇿', group: 'G', rating: 70 },

  // Group H
  { id: 'esp', name: 'Spain', code: 'ESP', flag: '🇪🇸', group: 'H', rating: 91 },
  { id: 'cpv', name: 'Cabo Verde', code: 'CPV', flag: '🇨🇻', group: 'H', rating: 75 },
  { id: 'ksa', name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', group: 'H', rating: 77 },
  { id: 'uru', name: 'Uruguay', code: 'URU', flag: '🇺🇾', group: 'H', rating: 87 },

  // Group I
  { id: 'fra', name: 'France', code: 'FRA', flag: '🇫🇷', group: 'I', rating: 93 },
  { id: 'sen', name: 'Senegal', code: 'SEN', flag: '🇸🇳', group: 'I', rating: 84 },
  { id: 'nor', name: 'Norway', code: 'NOR', flag: '🇳🇴', group: 'I', rating: 81 },
  { id: 'irq', name: 'Iraq', code: 'IRQ', flag: '🇮🇶', group: 'I', rating: 73 },

  // Group J
  { id: 'arg', name: 'Argentina', code: 'ARG', flag: '🇦🇷', group: 'J', rating: 94 },
  { id: 'alg', name: 'Algeria', code: 'ALG', flag: '🇩🇿', group: 'J', rating: 78 },
  { id: 'aut', name: 'Austria', code: 'AUT', flag: '🇦🇹', group: 'J', rating: 82 },
  { id: 'jor', name: 'Jordan', code: 'JOR', flag: '🇯🇴', group: 'J', rating: 72 },

  // Group K
  { id: 'por', name: 'Portugal', code: 'POR', flag: '🇵🇹', group: 'K', rating: 90 },
  { id: 'col', name: 'Colombia', code: 'COL', flag: '🇨🇴', group: 'K', rating: 85 },
  { id: 'uzb', name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', group: 'K', rating: 75 },
  { id: 'cod', name: 'DR Congo', code: 'COD', flag: '🇨🇩', group: 'K', rating: 76 },

  // Group L
  { id: 'eng', name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', rating: 92 },
  { id: 'cro', name: 'Croatia', code: 'CRO', flag: '🇭🇷', group: 'L', rating: 86 },
  { id: 'gha', name: 'Ghana', code: 'GHA', flag: '🇬🇭', group: 'L', rating: 78 },
  { id: 'pan', name: 'Panama', code: 'PAN', flag: '🇵🇦', group: 'L', rating: 74 }
];
