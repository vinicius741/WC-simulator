/**
 * Lightweight pathname-based routing for the SPA's "pages".
 *
 * There is no client-side router; the root `.htaccess` falls any unknown path
 * back to `/index.html`, so distinct URL paths can render distinct top-level
 * views. `isAdminRoute()` decides whether to render the dedicated admin page
 * instead of the normal app shell — mirroring how `/invite/<token>` is handled
 * in `inviteRoute.ts`.
 *
 * `import.meta.env.BASE_URL` is `/` in this project (served at the subdomain
 * root), but the helpers account for a non-root base just in case.
 */

const BASE = import.meta.env.BASE_URL; // e.g. '/'
const ADMIN_RE = new RegExp(`^${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}admin/?$`);

/** True when the current URL is the dedicated `/admin` page. */
export function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return ADMIN_RE.test(window.location.pathname);
}

/** Absolute href for the admin page. */
export function adminHref(): string {
  return `${BASE}admin`;
}

/** Absolute href for the main app (root). */
export function appHref(): string {
  return BASE;
}
