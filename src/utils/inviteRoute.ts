/**
 * Detects a family invite token in the current URL (`/invite/<token>`) and,
 * once read, clears it from the address bar. The token's only job is to route
 * the visitor into the name-only invite screen; afterwards the session lives in
 * the cookie, not the URL, so we don't want the token lingering in history or
 * being re-shared accidentally.
 */
const INVITE_RE = /^\/invite\/([a-f0-9]{16,128})\/?$/;

export function readInviteToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(INVITE_RE);
  if (!match) return null;

  const token = match[1];
  if (!token) return null;
  // Drop the token from the URL without adding a history entry.
  window.history.replaceState(null, '', '/');
  return token;
}

/** Builds the full public invite URL for a given token. */
export function buildInviteUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}invite/${token}`;
}
