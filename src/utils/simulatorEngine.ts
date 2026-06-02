import { THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';
import type { Team, KnockoutMatch } from '../types';

interface SimulateMatchResult {
  homeScore: number;
  awayScore: number;
}

// Helper to simulate a match score using Poisson distribution (used in knockouts)
export function simulateMatch(ratingA: number, ratingB: number): SimulateMatchResult {
  const diff = ratingA - ratingB;

  // Base lambda (expected goals) modified by rating difference
  const lambdaA = Math.max(0.4, 1.35 + diff * 0.05);
  const lambdaB = Math.max(0.4, 1.35 - diff * 0.05);

  const poisson = (lambda: number): number => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  };

  return {
    homeScore: poisson(lambdaA),
    awayScore: poisson(lambdaB)
  };
}

// Backtracking solver to match the 8 third-place groups to the 8 group winner slots
export function allocateThirdPlaces(qualifiedGroups: string[]): Record<string, string> {
  const slots = THIRD_PLACE_ALLOCATION_SLOTS;
  const result: Record<string, string> = {};
  const used = new Set<string>();

  function backtrack(slotIndex: number): boolean {
    if (slotIndex === slots.length) {
      return true;
    }
    const slot = slots[slotIndex]!;
    for (const groupLetter of qualifiedGroups) {
      // Must not be used already, and must be in the slot's allowed list
      if (!used.has(groupLetter) && slot.allowed.includes(groupLetter)) {
        used.add(groupLetter);
        result[slot.winner] = groupLetter;
        if (backtrack(slotIndex + 1)) {
          return true;
        }
        used.delete(groupLetter);
        delete result[slot.winner];
      }
    }
    return false;
  }

  // Run the backtrack search
  if (backtrack(0)) {
    return result; // e.g. { A: 'C', B: 'E', D: 'B', ... }
  }

  // Fallback: If backtracking fails, pair them directly
  const fallback: Record<string, string> = {};
  slots.forEach((slot, index) => {
    fallback[slot.winner] = qualifiedGroups[index % qualifiedGroups.length]!;
  });
  return fallback;
}

// Clears the winner chain of knockout matches if a dependent match changes
export function clearDownstreamMatches(matchId: string, knockoutMatchesArr: KnockoutMatch[]): KnockoutMatch[] {
  const updated = [...knockoutMatchesArr];
  const queue: string[] = [matchId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentIdx = updated.findIndex(m => m.id === currentId);
    if (currentIdx === -1) continue;
    const currentMatch = updated[currentIdx]!;
    if (!currentMatch.nextMatchId) continue;

    const nextIdx = updated.findIndex(m => m.id === currentMatch.nextMatchId);
    if (nextIdx !== -1) {
      const side = currentMatch.nextSide as 'home' | 'away';

      updated[nextIdx] = {
        ...updated[nextIdx]!,
        [side]: '',
        [`${side}Score`]: null,
        winner: ''
      };

      queue.push(currentMatch.nextMatchId);
    }
  }

  return updated;
}

// Simulate group rankings based on team ratings with some random variance (noise)
export function simulateGroupRanking(teamsInGroup: Team[]): Team[] {
  const scoredTeams = teamsInGroup.map(t => {
    // rating + random noise from -10 to +10
    const variance = (Math.random() - 0.5) * 20;
    return {
      team: t,
      score: t.rating + variance
    };
  });

  // Sort descending by simulated score
  scoredTeams.sort((a, b) => b.score - a.score);

  return scoredTeams.map(st => st.team);
}
