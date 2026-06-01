import { THIRD_PLACE_ALLOCATION_SLOTS } from '../data/constants';

// Helper to simulate a match score using Poisson distribution (used in knockouts)
export function simulateMatch(ratingA, ratingB) {
  const diff = ratingA - ratingB;
  
  // Base lambda (expected goals) modified by rating difference
  const lambdaA = Math.max(0.4, 1.35 + diff * 0.05);
  const lambdaB = Math.max(0.4, 1.35 - diff * 0.05);

  const poisson = (lambda) => {
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
export function allocateThirdPlaces(qualifiedGroups) {
  // qualifiedGroups is an array of 8 letters of the advancing 3rd-place groups, sorted alphabetically
  const slots = THIRD_PLACE_ALLOCATION_SLOTS;
  const result = {};
  const used = new Set();

  function backtrack(slotIndex) {
    if (slotIndex === slots.length) {
      return true;
    }
    const slot = slots[slotIndex];
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
  const fallback = {};
  slots.forEach((slot, index) => {
    fallback[slot.winner] = qualifiedGroups[index % qualifiedGroups.length];
  });
  return fallback;
}

// Clears the winner chain of knockout matches if a dependent match changes
export function clearDownstreamMatches(matchId, knockoutMatchesArr) {
  let updated = [...knockoutMatchesArr];
  const queue = [matchId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentIdx = updated.findIndex(m => m.id === currentId);
    if (currentIdx === -1) continue;
    const currentMatch = updated[currentIdx];
    if (!currentMatch.nextMatchId) continue;

    const nextIdx = updated.findIndex(m => m.id === currentMatch.nextMatchId);
    if (nextIdx !== -1) {
      const side = currentMatch.nextSide; // 'home' or 'away'

      updated[nextIdx] = {
        ...updated[nextIdx],
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
export function simulateGroupRanking(teamsInGroup) {
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
