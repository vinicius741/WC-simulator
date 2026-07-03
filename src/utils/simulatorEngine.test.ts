import { describe, expect, it } from 'vitest';
import { KNOCKOUT_MATCH_SCHEMA, THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';
import { TEAMS } from '../data/teams';
import { ELIMINATED_TEAM_IDS, FINALIZED_GROUPS, LOCKED_QUALIFIED_THIRD_PLACE_IDS } from '../data/currentTournamentState';
import { THIRD_PLACE_ALLOCATION_TABLE } from '../data/thirdPlaceAllocations';
import type { KnockoutMatch, RealKnockoutResult } from '../types';
import { getInitialGroupTeams, getInitialSelectedThirdPlaceIds, getTopRatedThirdPlaceIds } from './initializers';
import { allocateThirdPlaces, applyRealKnockoutResults, clearDownstreamMatches } from './simulatorEngine';

describe('finalized World Cup 2026 simulator data', () => {
  it('contains the official 48-team group roster', () => {
    const expectedByGroup = {
      A: 'mex rsa kor cze', B: 'can bih qat sui', C: 'bra mar hai sco',
      D: 'usa par aus tur', E: 'ger cuw civ ecu', F: 'ned jpn swe tun',
      G: 'bel egy irn nzl', H: 'esp cpv ksa uru', I: 'fra sen nor irq',
      J: 'arg alg aut jor', K: 'por col uzb cod', L: 'eng cro gha pan'
    };

    expect(TEAMS).toHaveLength(48);
    expect(new Set(TEAMS.map(team => team.id)).size).toBe(48);
    for (const [group, ids] of Object.entries(expectedByGroup)) {
      expect(TEAMS.filter(team => team.group === group).map(team => team.id).join(' ')).toBe(ids);
    }
    expect(TEAMS.some(team => team.id === 'pol')).toBe(false);
  });

  it('starts from the current standings and locked official outcomes', () => {
    const groups = getInitialGroupTeams();

    expect(groups.B!.map(team => team.id)).toEqual(['sui', 'can', 'bih', 'qat']);
    expect(groups.H!.map(team => team.id)).toEqual(['esp', 'cpv', 'uru', 'ksa']);
    expect(groups.I!.map(team => team.id)).toEqual(['fra', 'nor', 'sen', 'irq']);
    expect(groups.J!.map(team => team.id)).toEqual(['arg', 'aut', 'alg', 'jor']);
    expect(groups.K!.map(team => team.id)).toEqual(['col', 'por', 'cod', 'uzb']);
    expect(groups.L!.map(team => team.id)).toEqual(['eng', 'cro', 'gha', 'pan']);
    expect(FINALIZED_GROUPS.size).toBe(12);
    expect(FINALIZED_GROUPS.has('L')).toBe(true);
    expect(ELIMINATED_TEAM_IDS.has('uru')).toBe(true);
    expect(ELIMINATED_TEAM_IDS.has('uzb')).toBe(true);
  });

  it('preselects only official qualified thirds and never auto-selects eliminated thirds', () => {
    const groups = getInitialGroupTeams();
    const initialThirds = getInitialSelectedThirdPlaceIds();
    const autoThirds = getTopRatedThirdPlaceIds(groups);

    expect(new Set(initialThirds)).toEqual(LOCKED_QUALIFIED_THIRD_PLACE_IDS);
    expect(initialThirds).toEqual(['bih', 'par', 'ecu', 'swe', 'sen', 'alg', 'cod', 'gha']);
    expect(autoThirds).toEqual(expect.arrayContaining(initialThirds));
    expect(autoThirds).toHaveLength(8);
    expect(autoThirds).not.toContain('uru');
    expect(autoThirds).not.toContain('uzb');
  });
});

describe('FIFA Annex C third-place allocation', () => {
  it('contains all 495 combinations and returns the prescribed allocation', () => {
    expect(Object.keys(THIRD_PLACE_ALLOCATION_TABLE)).toHaveLength(495);
    expect(allocateThirdPlaces(['L', 'E', 'K', 'F', 'J', 'H', 'G', 'I'])).toEqual({
      A: 'E', B: 'J', D: 'I', E: 'F', G: 'H', I: 'G', K: 'L', L: 'K'
    });
    expect(allocateThirdPlaces(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])).toEqual({
      A: 'H', B: 'G', D: 'B', E: 'C', G: 'A', I: 'F', K: 'D', L: 'E'
    });
  });

  it('only assigns qualified groups to permitted winner slots', () => {
    for (const [combination, allocation] of Object.entries(THIRD_PLACE_ALLOCATION_TABLE)) {
      expect(new Set(Object.values(allocation))).toEqual(new Set(combination));
      for (const slot of THIRD_PLACE_ALLOCATION_SLOTS) {
        expect(slot.allowed).toContain(allocation[slot.winner]);
      }
    }
  });

  it('rejects an incomplete or duplicate group combination', () => {
    expect(allocateThirdPlaces(['A', 'B', 'C'])).toEqual({});
    expect(allocateThirdPlaces(['A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual({});
  });
});

describe('official knockout path', () => {
  it.each([
    ['Match 89', ['Match 74', 'Match 77']],
    ['Match 90', ['Match 73', 'Match 75']],
    ['Match 91', ['Match 76', 'Match 78']],
    ['Match 92', ['Match 79', 'Match 80']],
    ['Match 93', ['Match 83', 'Match 84']],
    ['Match 94', ['Match 81', 'Match 82']],
    ['Match 95', ['Match 86', 'Match 88']],
    ['Match 96', ['Match 85', 'Match 87']],
    ['Match 97', ['Match 89', 'Match 90']],
    ['Match 98', ['Match 93', 'Match 94']],
    ['Match 99', ['Match 91', 'Match 92']],
    ['Match 100', ['Match 95', 'Match 96']]
  ])('%s receives the correct winners', (targetLabel, feederLabels) => {
    const target = KNOCKOUT_MATCH_SCHEMA.find(match => match.label === targetLabel)!;
    const actual = KNOCKOUT_MATCH_SCHEMA
      .filter(match => match.nextMatchId === target.id)
      .sort((a, b) => (a.nextSide === 'home' ? -1 : b.nextSide === 'home' ? 1 : 0))
      .map(match => match.label);
    expect(actual).toEqual(feederLabels);
  });

  it('clears stale penalty state when an upstream winner changes', () => {
    const matches: KnockoutMatch[] = [
      { id: 'one', stage: 'R32', label: 'Match 1', home: 'a', away: 'b', nextMatchId: 'two', nextSide: 'home', homeScore: 1, awayScore: 1, penaltyWinner: 'home', winner: 'a' },
      { id: 'two', stage: 'R16', label: 'Match 2', home: 'a', away: 'c', nextMatchId: '', nextSide: '', homeScore: 0, awayScore: 0, penaltyWinner: 'away', winner: 'c' }
    ];

    expect(clearDownstreamMatches('one', matches)[1]).toMatchObject({
      home: '', homeScore: null, penaltyWinner: null, winner: ''
    });
  });
});

// ─── applyRealKnockoutResults ────────────────────────────────────────────

/** Build a fresh empty bracket (all teams/scores cleared) from the schema. */
function emptyBracket(): KnockoutMatch[] {
  return KNOCKOUT_MATCH_SCHEMA.map(m => ({
    ...m,
    home: m.home || '',
    away: m.away || '',
    homeScore: null,
    awayScore: null,
    penaltyWinner: null,
    winner: '',
  }));
}

const find = (matches: KnockoutMatch[], id: string) => matches.find(m => m.id === id)!;

describe('applyRealKnockoutResults — folding real results into the bracket', () => {
  it('returns the input untouched when there are no real results', () => {
    const bracket = emptyBracket();
    expect(applyRealKnockoutResults(bracket, [])).toBe(bracket);
  });

  it('overrides teams/score/winner for a decided R32 match and locks it', () => {
    // R32_2 = Match 74. Schema feeds R16_1 home.
    const results: RealKnockoutResult[] = [{
      external_id: 'wc2026-r32-74', stage: 'r32',
      home_team_id: 'ger', away_team_id: 'bih',
      result_home: 2, result_away: 0, penalty_winner: null,
    }];
    const out = applyRealKnockoutResults(emptyBracket(), results);
    const m = find(out, 'R32_2');
    expect(m).toMatchObject({
      home: 'ger', away: 'bih', homeScore: 2, awayScore: 0,
      winner: 'ger', penaltyWinner: null, locked: true,
    });
  });

  it('records a penalty shootout winner for a drawn, locked match', () => {
    const results: RealKnockoutResult[] = [{
      external_id: 'wc2026-r32-74', stage: 'r32',
      home_team_id: 'ger', away_team_id: 'bih',
      result_home: 1, result_away: 1, penalty_winner: 'away',
    }];
    const out = applyRealKnockoutResults(emptyBracket(), results);
    const m = find(out, 'R32_2');
    expect(m.winner).toBe('bih');          // away won the shootout
    expect(m.penaltyWinner).toBe('away');
    expect(m.locked).toBe(true);
  });

  it('reseeds the downstream R16 matchup from real R32 winners', () => {
    // R16_1 (Match 89) is fed by R32_2 (home side) and R32_5 (away side).
    // Real results decide both feeders → the R16 matchup becomes those winners.
    const results: RealKnockoutResult[] = [
      { external_id: 'wc2026-r32-74', stage: 'r32', home_team_id: 'ger', away_team_id: 'bih', result_home: 2, result_away: 0, penalty_winner: null },
      { external_id: 'wc2026-r32-77', stage: 'r32', home_team_id: 'fra', away_team_id: 'sen', result_home: 3, result_away: 1, penalty_winner: null },
    ];
    const out = applyRealKnockoutResults(emptyBracket(), results);
    const r16 = find(out, 'R16_1');
    expect(r16.home).toBe('ger');   // winner of R32_2
    expect(r16.away).toBe('fra');   // winner of R32_5
    expect(r16.locked).toBeUndefined(); // R16 game itself hasn't been played
  });

  it('preserves an undecided R16 winner pick when its teams are unchanged', () => {
    // Bracket already has R16_1 = GER vs FRA with the user picking GER, and the
    // two feeder R32 results arrive consistent with that (GER and FRA advance).
    const bracket = emptyBracket();
    const r16 = find(bracket, 'R16_1');
    r16.home = 'ger'; r16.away = 'fra'; r16.winner = 'ger'; r16.homeScore = 2; r16.awayScore = 1;

    const results: RealKnockoutResult[] = [
      { external_id: 'wc2026-r32-74', stage: 'r32', home_team_id: 'ger', away_team_id: 'bih', result_home: 2, result_away: 0, penalty_winner: null },
      { external_id: 'wc2026-r32-77', stage: 'r32', home_team_id: 'fra', away_team_id: 'sen', result_home: 1, result_away: 0, penalty_winner: null },
    ];
    const out = applyRealKnockoutResults(bracket, results);
    const m = find(out, 'R16_1');
    expect(m.winner).toBe('ger');       // user pick preserved
    expect(m.homeScore).toBe(2);        // user scores preserved
    expect(m.locked).toBeUndefined();
  });

  it('clears a stale winner pick when the advancing team changes', () => {
    // User had picked a FRA-vs-POR R16 with FRA winning, but the real R32 feeders
    // send through different teams → the stale pick and scores are wiped.
    const bracket = emptyBracket();
    const r16 = find(bracket, 'R16_1');
    r16.home = 'fra'; r16.away = 'por'; r16.winner = 'fra'; r16.homeScore = 1; r16.awayScore = 0;

    const results: RealKnockoutResult[] = [
      // GER (not FRA) advances from R32_2; SEN (not POR) from R32_5.
      { external_id: 'wc2026-r32-74', stage: 'r32', home_team_id: 'ger', away_team_id: 'bih', result_home: 2, result_away: 0, penalty_winner: null },
      { external_id: 'wc2026-r32-77', stage: 'r32', home_team_id: 'fra', away_team_id: 'sen', result_home: 0, result_away: 1, penalty_winner: null },
    ];
    const out = applyRealKnockoutResults(bracket, results);
    const m = find(out, 'R16_1');
    expect(m.home).toBe('ger');
    expect(m.away).toBe('sen');
    expect(m.winner).toBe('');          // stale pick cleared
    expect(m.homeScore).toBeNull();
    expect(m.awayScore).toBeNull();
  });

  it('reseeds the 3rd-place play-off from the semi-final losers', () => {
    // PLAYOFF_3RD home ← SF_1 loser, away ← SF_2 loser.
    const results: RealKnockoutResult[] = [
      { external_id: 'wc2026-sf-101', stage: 'sf', home_team_id: 'bra', away_team_id: 'fra', result_home: 2, result_away: 1, penalty_winner: null }, // FRA loses
      { external_id: 'wc2026-sf-102', stage: 'sf', home_team_id: 'arg', away_team_id: 'ger', result_home: 0, result_away: 1, penalty_winner: null }, // ARG loses
    ];
    const out = applyRealKnockoutResults(emptyBracket(), results);
    const playoff = find(out, 'PLAYOFF_3RD');
    expect(playoff.home).toBe('fra');   // SF_1 loser
    expect(playoff.away).toBe('arg');   // SF_2 loser
  });

  it('is idempotent: applying the same results twice yields the same state', () => {
    const results: RealKnockoutResult[] = [
      { external_id: 'wc2026-r32-74', stage: 'r32', home_team_id: 'ger', away_team_id: 'bih', result_home: 2, result_away: 0, penalty_winner: null },
      { external_id: 'wc2026-r32-77', stage: 'r32', home_team_id: 'fra', away_team_id: 'sen', result_home: 1, result_away: 0, penalty_winner: null },
    ];
    const once = applyRealKnockoutResults(emptyBracket(), results);
    const twice = applyRealKnockoutResults(once, results);
    expect(twice).toEqual(once);
  });
});
