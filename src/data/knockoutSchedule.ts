/**
 * Official fixed schedule for World Cup 2026 knockout matches (73–104).
 *
 * Match numbers and slots are fixed by FIFA regardless of which teams
 * advance — only the *team identities* depend on group results. So every
 * kickoff time and venue is known now, which lets the auto-fill feature
 * upsert complete prediction games the moment teams are decided.
 *
 * Source: FIFA World Cup 2026 match schedule (via Wikipedia, cross-checked
 * against the official FIFA schedule PDF). Kickoff times converted from the
 * listed local time + UTC offset to UTC. Times are in the DB format
 * 'YYYY-MM-DD HH:MM:SS'.
 */

export interface KnockoutScheduleEntry {
  /** FIFA match number, e.g. 73 for the first Round-of-32 game. */
  matchNo: number;
  /** Kickoff in UTC, 'YYYY-MM-DD HH:MM:SS' (matches the `games` DB column). */
  kickoffUtc: string;
  /** Venue name as FIFA publishes it. */
  venue: string;
  /** Simulator schema stage id (R32_1, R16_2, QF_1, SF_1, PLAYOFF_3RD, FINAL). */
  schemaId: string;
}

/** Maps the simulator's bracket schema id → official FIFA match number. */
export const SCHEMA_ID_TO_MATCH_NO: Record<string, number> = {
  // Round of 32 — Matches 73–88
  R32_1: 73, R32_2: 74, R32_3: 75, R32_4: 76,
  R32_5: 77, R32_6: 78, R32_7: 79, R32_8: 80,
  R32_9: 81, R32_10: 82, R32_11: 83, R32_12: 84,
  R32_13: 85, R32_14: 86, R32_15: 87, R32_16: 88,
  // Round of 16 — Matches 89–96
  R16_1: 89, R16_2: 90, R16_3: 91, R16_4: 92,
  R16_5: 93, R16_6: 94, R16_7: 95, R16_8: 96,
  // Quarter-finals — Matches 97–100
  QF_1: 97, QF_2: 98, QF_3: 99, QF_4: 100,
  // Semi-finals — Matches 101–102
  SF_1: 101, SF_2: 102,
  // Third-place play-off — Match 103
  PLAYOFF_3RD: 103,
  // Final — Match 104
  FINAL: 104,
};

const RAW: Array<[string, string, string]> = [
  // [schemaId, kickoffUtc, venue]
  // Round of 32
  ['R32_1', '2026-06-28 19:00:00', 'SoFi Stadium, Inglewood'],
  ['R32_4', '2026-06-29 17:00:00', 'NRG Stadium, Houston'],
  ['R32_2', '2026-06-29 20:30:00', 'Gillette Stadium, Foxborough'],
  ['R32_3', '2026-06-30 01:00:00', 'Estadio BBVA, Guadalupe'],
  ['R32_6', '2026-06-30 17:00:00', 'AT&T Stadium, Arlington'],
  ['R32_5', '2026-06-30 21:00:00', 'MetLife Stadium, East Rutherford'],
  ['R32_7', '2026-07-01 01:00:00', 'Estadio Azteca, Mexico City'],
  ['R32_8', '2026-07-01 16:00:00', 'Mercedes-Benz Stadium, Atlanta'],
  ['R32_10', '2026-07-01 20:00:00', "Lumen Field, Seattle"],
  ['R32_9', '2026-07-02 00:00:00', "Levi's Stadium, Santa Clara"],
  ['R32_12', '2026-07-02 19:00:00', 'SoFi Stadium, Inglewood'],
  ['R32_11', '2026-07-02 23:00:00', 'BMO Field, Toronto'],
  ['R32_13', '2026-07-03 03:00:00', 'BC Place, Vancouver'],
  ['R32_16', '2026-07-03 18:00:00', 'AT&T Stadium, Arlington'],
  ['R32_14', '2026-07-03 22:00:00', 'Hard Rock Stadium, Miami Gardens'],
  ['R32_15', '2026-07-04 01:30:00', 'Arrowhead Stadium, Kansas City'],
  // Round of 16
  ['R16_2', '2026-07-04 17:00:00', 'NRG Stadium, Houston'],
  ['R16_1', '2026-07-04 21:00:00', 'Lincoln Financial Field, Philadelphia'],
  ['R16_3', '2026-07-05 20:00:00', 'MetLife Stadium, East Rutherford'],
  ['R16_4', '2026-07-06 00:00:00', 'Estadio Azteca, Mexico City'],
  ['R16_5', '2026-07-06 19:00:00', 'AT&T Stadium, Arlington'],
  ['R16_6', '2026-07-07 00:00:00', 'Lumen Field, Seattle'],
  ['R16_7', '2026-07-07 16:00:00', 'Mercedes-Benz Stadium, Atlanta'],
  ['R16_8', '2026-07-07 20:00:00', 'BC Place, Vancouver'],
  // Quarter-finals
  ['QF_1', '2026-07-09 20:00:00', 'Gillette Stadium, Foxborough'],
  ['QF_2', '2026-07-10 19:00:00', 'SoFi Stadium, Inglewood'],
  ['QF_3', '2026-07-11 21:00:00', 'Hard Rock Stadium, Miami Gardens'],
  ['QF_4', '2026-07-12 01:00:00', 'Arrowhead Stadium, Kansas City'],
  // Semi-finals
  ['SF_1', '2026-07-14 19:00:00', 'AT&T Stadium, Arlington'],
  ['SF_2', '2026-07-15 19:00:00', 'Mercedes-Benz Stadium, Atlanta'],
  // Third-place play-off
  ['PLAYOFF_3RD', '2026-07-18 21:00:00', 'Hard Rock Stadium, Miami Gardens'],
  // Final
  ['FINAL', '2026-07-19 19:00:00', 'MetLife Stadium, East Rutherford'],
];

/** Schedule entries keyed by FIFA match number (73–104). */
export const KNOCKOUT_SCHEDULE: Record<number, KnockoutScheduleEntry> = Object.fromEntries(
  RAW.map(([schemaId, kickoffUtc, venue]) => {
    const matchNo = SCHEMA_ID_TO_MATCH_NO[schemaId]!;
    return [matchNo, { matchNo, kickoffUtc, venue, schemaId }];
  }),
);

/** Schedule entry for a given simulator schema id (e.g. 'R32_2'). */
export function scheduleForSchema(schemaId: string): KnockoutScheduleEntry | undefined {
  const matchNo = SCHEMA_ID_TO_MATCH_NO[schemaId];
  return matchNo !== undefined ? KNOCKOUT_SCHEDULE[matchNo] : undefined;
}
