import type { Language } from '../../hooks/useLanguage';

/** Server returns 'YYYY-MM-DD HH:MM:SS' in UTC; parse it as a real UTC instant. */
export function parseKickoff(kickoffUtc: string): Date {
  return new Date(kickoffUtc.replace(' ', 'T') + 'Z');
}

/** Human-friendly local kick-off time, e.g. "Sat 13 Jun, 19:00". */
export function formatKickoff(kickoffUtc: string, language: Language): string {
  const d = parseKickoff(kickoffUtc);
  const locale = language === 'pt-BR' ? 'pt-BR' : 'en-US';
  return d.toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short relative hint, e.g. "in 2d" / "12h ago". Falls back to '' for the present moment. */
export function relativeKickoff(kickoffUtc: string): { dir: 'future' | 'past'; text: string } | null {
  const ms = parseKickoff(kickoffUtc).getTime() - Date.now();
  const absMin = Math.abs(ms) / 60000;
  let text: string;
  if (absMin < 60) text = `${Math.max(1, Math.round(absMin))}m`;
  else if (absMin < 60 * 24) text = `${Math.round(absMin / 60)}h`;
  else text = `${Math.round(absMin / 60 / 24)}d`;
  return { dir: ms >= 0 ? 'future' : 'past', text };
}

/**
 * Prefer the localized team name from the i18n dictionary (translations.ts keys
 * team names by id, e.g. t('bra') -> "Brazil"/"Brasil"). Falls back to the
 * name stored on the game when no translation exists.
 */
export function teamDisplayName(
  teamId: string | null,
  fallback: string,
  t: (key: string) => string,
): string {
  if (!teamId) return fallback;
  const localized = t(teamId);
  return localized && localized !== teamId ? localized : fallback;
}

/**
 * Maps a points value to the pill colour class shared by the locked-game reveal
 * table and the live fate board. 3 pts → gold, 1 → navy, 0 → gray, unknown → pending.
 */
export function pointsClass(p: number | null): 'gold' | 'navy' | 'gray' | 'pending' {
  if (p === null) return 'pending';
  if (p >= 3) return 'gold';
  if (p >= 1) return 'navy';
  return 'gray';
}

