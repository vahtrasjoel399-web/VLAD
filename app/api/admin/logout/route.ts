import { cookies } from 'next/headers';
import { ADMIN_COOKIE, sameOrigin } from '@/lib/store/admin';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.redirect(new URL('/admin/orders', request.url), 303);
}
