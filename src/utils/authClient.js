/**
 * Cookie-backed session storage for the Supabase Auth client, plus the
 * synthetic-email helper that lets this app keep its existing username-based
 * identity while Supabase Auth (which requires an email-shaped identifier)
 * owns real credentials and issues the actual session token.
 */

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches Supabase's default refresh-token lifetime window

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') return;
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  // `Secure` only works on a real HTTPS origin - guard it so the cookie still
  // gets set during local http:// development instead of silently failing.
  if (isHttps) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Implements the minimal storage interface Supabase's client `auth.storage`
 * option expects (getItem/setItem/removeItem), backed by document.cookie
 * instead of the default localStorage.
 */
export const cookieAuthStorage = {
  getItem(key) {
    return readCookie(key);
  },
  setItem(key, value) {
    writeCookie(key, value, COOKIE_MAX_AGE_SECONDS);
  },
  removeItem(key) {
    deleteCookie(key);
  },
};

const AUTH_EMAIL_DOMAIN = 'tesslo-pos.internal';

/**
 * Supabase Auth requires an email-shaped identifier. This app's identity is
 * a bare username, so every account gets a synthetic, non-deliverable email
 * derived from it purely to satisfy that format requirement - nothing is
 * ever sent to these addresses, and the app never shows them to the user.
 */
export function toAuthEmail(username) {
  const slug = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@${AUTH_EMAIL_DOMAIN}`;
}
