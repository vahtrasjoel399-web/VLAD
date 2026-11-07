import { cookies } from 'next/headers';
import { ADMIN_COOKIE, sameOrigin } from '@/lib/store/admin';
import { adminCookie, passwordMatches } from '@/lib/store/links';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  const form = await request.formData();
  const value = form.get('password');
  const password = typeof value === 'string' ? value : '';
  if (!passwordMatches(password)) {
    // Slows down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return Response.redirect(new URL('/admin/orders?e=login', request.url), 303);
  }
  (await cookies()).set(ADMIN_COOKIE, adminCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 86_400,
  });
  return Response.redirect(new URL('/admin/orders', request.url), 303);
}
