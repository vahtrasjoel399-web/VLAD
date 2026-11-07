import 'server-only';
import { cookies } from 'next/headers';
import { adminCookieValid } from './links';

export const ADMIN_COOKIE = 'sf_admin';

export async function isAdmin() {
  return adminCookieValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

// Admin forms only work from this site (on top of the SameSite=Strict cookie).
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === new URL(request.url).origin;
}

// Checks login and origin for an admin POST. Returns an error response or null.
export async function guard(request: Request) {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  if (!(await isAdmin())) return new Response('Log in first', { status: 401 });
  return null;
}
