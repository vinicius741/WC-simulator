import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import { useLocalStorage } from './useLocalStorage';

export interface PredictionsAuth {
  authenticated: boolean;
  isAdmin: boolean;
  playerName: string | null;
  rememberedName: string;
  loading: boolean;
  login: (password: string, playerName: string) => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Manages the family/admin session for the Predictions tab.
 * The bearer is a same-origin HttpOnly cookie, so there is no token in JS —
 * we only track whether `me.php` reports a valid session plus the player's name.
 */
export function usePredictionsAuth(): PredictionsAuth {
  const [state, setState] = useState({
    authenticated: false,
    isAdmin: false,
    playerName: null as string | null,
    loading: true,
  });
  const [rememberedName, setRememberedName] = useLocalStorage<string>('wc2026_pred_name', '');

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((me) => {
        if (!active) return;
        setState({
          authenticated: me.authenticated,
          isAdmin: me.is_admin,
          playerName: me.authenticated ? (me.player_name ?? rememberedName) : null,
          loading: false,
        });
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [rememberedName]);

  const login = useCallback(
    async (password: string, playerName: string) => {
      await api.login(password, playerName);
      setRememberedName(playerName);
      setState({ authenticated: true, isAdmin: false, playerName, loading: false });
    },
    [setRememberedName],
  );

  const adminLogin = useCallback(async (password: string) => {
    await api.adminLogin(password);
    setState((s) => ({ ...s, authenticated: true, isAdmin: true, loading: false }));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ authenticated: false, isAdmin: false, playerName: null, loading: false });
  }, []);

  return {
    authenticated: state.authenticated,
    isAdmin: state.isAdmin,
    playerName: state.playerName,
    rememberedName,
    loading: state.loading,
    login,
    adminLogin,
    logout,
  };
}
