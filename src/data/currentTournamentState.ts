export const CURRENT_GROUP_ORDERS: Record<string, string[]> = {
  A: ['mex', 'rsa', 'kor', 'cze'],
  B: ['sui', 'can', 'bih', 'qat'],
  C: ['bra', 'mar', 'sco', 'hai'],
  D: ['usa', 'aus', 'par', 'tur'],
  E: ['ger', 'civ', 'ecu', 'cuw'],
  F: ['ned', 'jpn', 'swe', 'tun'],
  G: ['bel', 'egy', 'irn', 'nzl'],
  H: ['esp', 'cpv', 'uru', 'ksa'],
  I: ['fra', 'nor', 'sen', 'irq'],
  J: ['arg', 'aut', 'alg', 'jor'],
  K: ['col', 'por', 'cod', 'uzb'],
  L: ['eng', 'cro', 'gha', 'pan'],
};

export const FINALIZED_GROUPS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

export const LOCKED_QUALIFIED_THIRD_PLACE_IDS = new Set(['bih', 'par', 'ecu', 'swe', 'sen', 'alg', 'cod', 'gha']);

export const ELIMINATED_TEAM_IDS = new Set([
  'cze',
  'qat',
  'hai',
  'tur',
  'cuw',
  'tun',
  'nzl',
  'uru',
  'ksa',
  'irq',
  'jor',
  'uzb',
  'pan',
]);
