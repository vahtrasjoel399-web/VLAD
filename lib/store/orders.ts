import 'server-only';
import type Stripe from 'stripe';
import { db, stripeClient } from './clients';
import { sendDownloadEmail } from './email';
import { downloadToken, newOrderNo } from './links';

export type Order = {
  id: string;
  order_no: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  product_id: string;
  product_title: string;
  email: string;
  amount_total: number;
  currency: string;
  locale: string;
  consent_at: string | null;
  license_version: string | null;
  status: 'paid' | 'free' | 'refunded';
  flagged: boolean;
  flag_reason: string | null;
  link_gen: number;
  link_issued_at: string;
  link_revoked: boolean;
  downloads_used: number;
  email_sent_at: string | null;
  created_at: string;
};

type NewOrder = Omit<
  Order,
  | 'id'
  | 'order_no'
  | 'flagged'
  | 'flag_reason'
  | 'link_gen'
  | 'link_issued_at'
  | 'link_revoked'
  | 'downloads_used'
  | 'email_sent_at'
  | 'created_at'
>;

export function downloadUrl(origin: string, order: Order) {
  return `${origin}/download/${downloadToken(order.order_no, order.link_gen)}`;
}

export async function orderBy(column: 'id' | 'order_no' | 'stripe_session_id', value: string) {
  const { data, error } = await db()
    .from('orders')
    .select('*')
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

async function insertOrder(order: NewOrder) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db()
      .from('orders')
      .insert({ ...order, order_no: newOrderNo() })
      .select('*')
      .single();
    if (!error) return data as Order;
    // 23505 = unique violation: the same Stripe session was handled in
    // parallel (webhook and thanks page), or, very rarely, the order code clashed.
    if (error.code !== '23505') throw error;
    if (order.stripe_session_id) {
      const existing = await orderBy('stripe_session_id', order.stripe_session_id);
      if (existing) return existing;
    }
  }
  throw new Error('Could not create order');
}

// Sends the link email once per order, even if called many times.
export async function emailLinkOnce(order: Order, origin: string, force = false) {
  const claim = db()
    .from('orders')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', order.id);
  const { data } = await (force ? claim : claim.is('email_sent_at', null))
    .select('id')
    .maybeSingle();
  if (!data) return false;
  const sent = await sendDownloadEmail({
    to: order.email,
    locale: order.locale,
    orderNo: order.order_no,
    product: order.product_title,
    url: downloadUrl(origin, order),
  }).catch(() => false);
  if (!sent)
    await db().from('orders').update({ email_sent_at: null }).eq('id', order.id);
  return sent;
}

// Turns a paid Checkout Session into an order with a personal link.
// Safe to call any number of times for the same session: the webhook and the
// thanks page both call it, whichever comes first creates the order.
export async function fulfillSession(session: Stripe.Checkout.Session, origin: string) {
  if (session.payment_status !== 'paid') return null;
  const existing = await orderBy('stripe_session_id', session.id);
  if (existing) {
    await emailLinkOnce(existing, origin);
    return existing;
  }
  const md = session.metadata || {};
  const email = session.customer_details?.email || session.customer_email;
  if (!md.product_id || !email) {
    console.error('Paid session without product or email', session.id);
    return null;
  }
  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const order = await insertOrder({
    stripe_session_id: session.id,
    stripe_payment_intent: paymentIntent,
    product_id: md.product_id,
    product_title: md.product_title || md.product_id,
    email,
    amount_total: session.amount_total || 0,
    currency: session.currency || 'eur',
    locale: md.locale === 'ru' ? 'ru' : 'en',
    consent_at: md.consent_at || null,
    license_version: md.license_version || null,
    status: 'paid',
  });
  // Keep the consent record next to the payment in Stripe too: the session
  // already holds consent time and version; the payment gets email and order.
  if (paymentIntent)
    await stripeClient()
      .paymentIntents.update(paymentIntent, {
        metadata: {
          order_no: order.order_no,
          consent_email: email,
          consent_at: md.consent_at || '',
          license_version: md.license_version || '',
        },
      })
      .catch((e) => console.error('Stripe metadata update failed', e));
  await emailLinkOnce(order, origin);
  return order;
}

export async function createFreeOrder(
  input: {
    productId: string;
    productTitle: string;
    email: string;
    locale: string;
    consentAt: string;
    licenseVersion: string;
  },
  origin: string,
) {
  const order = await insertOrder({
    stripe_session_id: null,
    stripe_payment_intent: null,
    product_id: input.productId,
    product_title: input.productTitle,
    email: input.email,
    amount_total: 0,
    currency: 'eur',
    locale: input.locale,
    consent_at: input.consentAt,
    license_version: input.licenseVersion,
    status: 'free',
  });
  const sent = await emailLinkOnce(order, origin);
  return { order, sent };
}

// A refund kills the links of that payment.
export async function markRefunded(paymentIntent: string) {
  await db()
    .from('orders')
    .update({ status: 'refunded', link_revoked: true })
    .eq('stripe_payment_intent', paymentIntent);
}

// New link for an order: older links stop working, the 48 hours and the
// download count start again. The flag stays for the record.
export async function reissueLink(order: Order) {
  const { data, error } = await db()
    .from('orders')
    .update({
      link_gen: order.link_gen + 1,
      link_issued_at: new Date().toISOString(),
      link_revoked: false,
      downloads_used: 0,
    })
    .eq('id', order.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Order;
}

export async function revokeLink(orderId: string) {
  await db().from('orders').update({ link_revoked: true }).eq('id', orderId);
}
