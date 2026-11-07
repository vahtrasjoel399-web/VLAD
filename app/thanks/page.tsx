import type { Metadata } from 'next';
import PortfolioView, { type DownloadInfo } from '../portfolio-view';
import { getSiteContent } from '@/lib/store/content';
import { siteOrigin, storeReady } from '@/lib/store/config';
import { stripeClient } from '@/lib/store/clients';
import { downloadUrl, fulfillSession, orderBy } from '@/lib/store/orders';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thank you — SMOLIN.FX',
  robots: { index: false },
};

// Stripe sends buyers here after payment with ?session_id=cs_...
// If the webhook has not arrived yet, the payment is checked with Stripe
// directly and the order is created here (the same code, never twice).
async function findDownload(sessionId: string | undefined): Promise<DownloadInfo | undefined> {
  if (!storeReady() || !sessionId || !/^cs_(test|live)_\w{10,200}$/.test(sessionId))
    return undefined;
  try {
    const h = await headers();
    const origin = siteOrigin(
      new Request(`${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}/thanks`),
    );
    let order = await orderBy('stripe_session_id', sessionId);
    if (!order) {
      const session = await stripeClient().checkout.sessions.retrieve(sessionId);
      order = await fulfillSession(session, origin);
    }
    if (!order) return { pending: true };
    return {
      url: downloadUrl(origin, order),
      orderNo: order.order_no,
      product: order.product_title,
      email: order.email,
      emailed: Boolean(order.email_sent_at),
    };
  } catch (error) {
    console.error('Thanks page lookup failed', error);
    return { pending: true };
  }
}

export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const download = await findDownload((await searchParams).session_id);
  const content = await getSiteContent().catch(() => null);
  if (content)
    return (
      <PortfolioView content={content} initialPage="thanks" download={download} />
    );
  return (
    <main className="error-page">
      <h1>Thank you.</h1>
      {download && !download.pending ? (
        <p>
          <a href={download.url}>Download your files ↗</a>
        </p>
      ) : (
        <p>Your receipt is on its way to your email.</p>
      )}
      <a href="/store">Back to the store ↗</a>
    </main>
  );
}
