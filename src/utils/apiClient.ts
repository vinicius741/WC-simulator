import type {
  InviteActionResponse,
  InviteLoginResponse,
  InviteStatusResponse,
  LeaderboardRow,
  MeResponse,
  PredictionGame,
} from '../types';
import { MOCK_GAMES, MOCK_LEADERBOARD } from './predictionsMock';

/**
 * Set VITE_PRED_MOCK=true in a local `.env.local` file to drive the UI with
 * mock data (no PHP backend required). Defaults to the real API in production.
 * Example .env.local:
 *   VITE_PRED_MOCK=true
 */
const USE_MOCK = import.meta.env.VITE_PRED_MOCK === 'true';
const BASE = `${import.meta.env.BASE_URL}api/`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(init ?? {}),
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      /* ignore non-JSON responses */
    }
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${res.status}).`;
    throw new ApiError(res.status, msg);
  }

  return body as T;
}

export const api = {
  async me(): Promise<MeResponse> {
    if (USE_MOCK) return { authenticated: true, is_admin: false, player_name: 'You' };
    return request<MeResponse>('me.php');
  },

  async login(password: string, playerName: string): Promise<void> {
    if (USE_MOCK) {
      await wait(200);
      return;
    }
    await request('login.php', {
      method: 'POST',
      body: JSON.stringify({ password, player_name: playerName }),
    });
  },

  async adminLogin(password: string): Promise<void> {
    if (USE_MOCK) {
      await wait(200);
      return;
    }
    await request('admin/login.php', { method: 'POST', body: JSON.stringify({ password }) });
  },

  async inviteLogin(token: string, playerName: string): Promise<void> {
    if (USE_MOCK) {
      await wait(200);
      return;
    }
    await request<InviteLoginResponse>('invite_login.php', {
      method: 'POST',
      body: JSON.stringify({ token, player_name: playerName }),
    });
  },

  async logout(): Promise<void> {
    if (USE_MOCK) return;
    await request('logout.php', { method: 'POST' });
  },

  async getGames(): Promise<PredictionGame[]> {
    if (USE_MOCK) {
      await wait(150);
      return MOCK_GAMES;
    }
    const data = await request<{ games: PredictionGame[] }>('games.php');
    return data.games;
  },

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    if (USE_MOCK) {
      await wait(150);
      return MOCK_LEADERBOARD;
    }
    const data = await request<{ leaderboard: LeaderboardRow[] }>('leaderboard.php');
    return data.leaderboard;
  },

  async savePrediction(
    gameId: number,
    predictedHome: number,
    predictedAway: number,
    playerName: string,
  ): Promise<void> {
    if (USE_MOCK) {
      await wait(150);
      return;
    }
    await request('save_prediction.php', {
      method: 'POST',
      body: JSON.stringify({
        game_id: gameId,
        predicted_home: predictedHome,
        predicted_away: predictedAway,
        player_name: playerName,
      }),
    });
  },

  async adminSetResult(gameId: number, resultHome: number, resultAway: number): Promise<void> {
    if (USE_MOCK) {
      await wait(150);
      return;
    }
    await request('admin/result.php', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, result_home: resultHome, result_away: resultAway }),
    });
  },

  async adminAddGame(payload: Record<string, unknown>): Promise<void> {
    if (USE_MOCK) {
      await wait(150);
      return;
    }
    await request('admin/game.php', { method: 'POST', body: JSON.stringify(payload) });
  },

  async adminChangePassword(type: 'shared' | 'admin', newPassword: string): Promise<void> {
    if (USE_MOCK) {
      await wait(150);
      return;
    }
    await request('admin/password.php', {
      method: 'POST',
      body: JSON.stringify({ type, new_password: newPassword }),
    });
  },

  async adminInviteStatus(): Promise<InviteStatusResponse> {
    if (USE_MOCK) {
      await wait(150);
      return { enabled: true, has_token: false, token: null };
    }
    return request<InviteStatusResponse>('admin/invite.php');
  },

  async adminInviteAction(action: 'generate' | 'disable' | 'enable'): Promise<InviteActionResponse> {
    if (USE_MOCK) {
      await wait(150);
      return action === 'generate' ? { ok: true, token: 'mock-invite-token' } : { ok: true };
    }
    return request<InviteActionResponse>('admin/invite.php', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
};
