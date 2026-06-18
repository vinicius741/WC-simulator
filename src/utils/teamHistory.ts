import type { PredictionGame } from '../types';

export type TeamSide = 'home' | 'away';

interface TeamIdentity {
  id: string | null;
  code: string | null;
  name: string;
}

function identity(game: PredictionGame, side: TeamSide): TeamIdentity {
  return {
    id: side === 'home' ? game.home_team_id : game.away_team_id,
    code: side === 'home' ? game.home_code : game.away_code,
    name: side === 'home' ? game.home_team_name : game.away_team_name,
  };
}

function sameTeam(a: TeamIdentity, b: TeamIdentity): boolean {
  if (a.id && b.id) return a.id === b.id;
  if (a.code && b.code) return a.code.toUpperCase() === b.code.toUpperCase();
  return a.name.trim().toLocaleLowerCase() === b.name.trim().toLocaleLowerCase();
}

/** Finished matches played by one side before the selected prediction game. */
export function teamHistory(
  games: PredictionGame[],
  selectedGame: PredictionGame,
  side: TeamSide,
): PredictionGame[] {
  const team = identity(selectedGame, side);
  const selectedKickoff = Date.parse(selectedGame.kickoff_utc.replace(' ', 'T') + 'Z');

  return games
    .filter((game) => {
      if (game.id === selectedGame.id) return false;
      if (game.result_home === null || game.result_away === null) return false;

      const kickoff = Date.parse(game.kickoff_utc.replace(' ', 'T') + 'Z');
      if (kickoff >= selectedKickoff) return false;

      return sameTeam(team, identity(game, 'home')) || sameTeam(team, identity(game, 'away'));
    })
    .sort((a, b) => b.kickoff_utc.localeCompare(a.kickoff_utc));
}
