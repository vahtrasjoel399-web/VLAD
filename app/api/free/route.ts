import { siteOrigin, storeReady } from '@/lib/store/config';
import { getLicense, getProduct } from '@/lib/store/catalog';
import { db } from '@/lib/store/clients';
import { productFile } from '@/lib/store/files';
import { createFreeOrder, downloadUrl } from '@/lib/store/orders';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

// Free products (price 0): no Stripe, the personal link goes to the email.
export async function POST(request: Request) {
  if (!storeReady())
    return Response.json({ error: 'store_closed' }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!body || typeof body.productId !== 'string' || !EMAIL.test(email))
    return Response.json({ error: 'bad_email' }, { status: 400 });
  if (body.consent !== true)
    return Response.json({ error: 'consent_required' }, { status: 400 });
  const locale = body.locale === 'ru' ? 'ru' : 'en';
  try {
    const [product, license, file] = await Promise.all([
      getProduct(body.productId),
      getLicense(),
      productFile(body.productId),
    ]);
    if (!product || product.price !== 0)
      return Response.json({ error: 'not_found' }, { status: 404 });
    if (!file) return Response.json({ error: 'no_file' }, { status: 409 });
    if (body.licenseVersion !== license.version)
      return Response.json({ error: 'license_changed' }, { status: 409 });
    // Stops the form from being used to flood someone's inbox.
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db()
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'free')
      .eq('email', email)
      .gte('created_at', since);
    if ((count || 0) >= 3)
      return Response.json({ error: 'too_many' }, { status: 429 });
    const origin = siteOrigin(request);
    const { order, sent } = await createFreeOrder(
      {
        productId: product.id,
        productTitle: product.title,
        email,
        locale,
        consentAt: new Date().toISOString(),
        licenseVersion: license.version,
      },
      origin,
    );
    // Without email set up (or if sending failed) the link is shown right away.
    return Response.json({
      sent,
      url: sent ? undefined : downloadUrl(origin, order),
    });
  } catch (error) {
    console.error('Free order failed', error);
    return Response.json({ error: 'failed' }, { status: 502 });
  }
}
