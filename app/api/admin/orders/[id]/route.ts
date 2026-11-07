import { guard } from '@/lib/store/admin';
import { siteOrigin } from '@/lib/store/config';
import { db } from '@/lib/store/clients';
import {
  emailLinkOnce,
  orderBy,
  reissueLink,
  revokeLink,
} from '@/lib/store/orders';

// Buttons on /admin/orders: revoke, new link, new link + email, clear flag.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard(request);
  if (denied) return denied;
  const { id } = await params;
  const value = (await request.formData()).get('action');
  const action = typeof value === 'string' ? value : '';
  const order = /^[0-9a-f-]{36}$/.test(id) ? await orderBy('id', id) : null;
  if (!order) return new Response('Order not found', { status: 404 });

  if (action === 'revoke') await revokeLink(order.id);
  else if (action === 'reissue' || action === 'reissue_email') {
    const fresh = await reissueLink(order);
    if (action === 'reissue_email')
      await emailLinkOnce(fresh, siteOrigin(request), true);
  } else if (action === 'unflag')
    await db()
      .from('orders')
      .update({ flagged: false, flag_reason: null })
      .eq('id', order.id);
  else return new Response('Unknown action', { status: 400 });

  return Response.redirect(
    new URL(`/admin/orders?done=${action}#${order.order_no}`, request.url),
    303,
  );
}
