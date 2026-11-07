import { siteOrigin, storeReady } from '@/lib/store/config';
import { getLicense, getProduct } from '@/lib/store/catalog';
import { stripeClient } from '@/lib/store/clients';
import { productFile } from '@/lib/store/files';

// Starts a Stripe Checkout for one product. The license box must be ticked;
// the price comes from Sanity on the server.
export async function POST(request: Request) {
  if (!storeReady())
    return Response.json({ error: 'store_closed' }, { status: 503 });
  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
    locale?: unknown;
    consent?: unknown;
    licenseVersion?: unknown;
  } | null;
  if (!body || typeof body.productId !== 'string')
    return Response.json({ error: 'bad_request' }, { status: 400 });
  if (body.consent !== true)
    return Response.json({ error: 'consent_required' }, { status: 400 });
  const locale = body.locale === 'ru' ? 'ru' : 'en';
  try {
    const [product, license, file] = await Promise.all([
      getProduct(body.productId),
      getLicense(),
      productFile(body.productId),
    ]);
    if (!product || product.price <= 0)
      return Response.json({ error: 'not_found' }, { status: 404 });
    if (!file) return Response.json({ error: 'no_file' }, { status: 409 });
    // The buyer agreed to the version shown on the page; if the terms changed
    // meanwhile, they have to see the new ones first.
    if (body.licenseVersion !== license.version)
      return Response.json({ error: 'license_changed' }, { status: 409 });
    const origin = siteOrigin(request);
    const title =
      locale === 'ru' ? product.titleRu || product.title : product.title;
    const consent = {
      product_id: product.id,
      product_title: product.title.slice(0, 200),
      license_version: license.version,
      consent_at: new Date().toISOString(),
      locale,
    };
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(product.price * 100),
            product_data: {
              name: title,
              ...(product.image?.startsWith('https://')
                ? { images: [`${product.image}?w=600&fm=png`] }
                : {}),
            },
          },
        },
      ],
      metadata: consent,
      payment_intent_data: { metadata: consent },
      locale,
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout failed', error);
    return Response.json({ error: 'checkout_failed' }, { status: 502 });
  }
}
