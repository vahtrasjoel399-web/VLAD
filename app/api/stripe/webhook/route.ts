import type Stripe from 'stripe';
import { env, siteOrigin, storeReady } from '@/lib/store/config';
import { stripeClient } from '@/lib/store/clients';
import { fulfillSession, markRefunded } from '@/lib/store/orders';

// Stripe → Developers → Webhooks → this address. Events:
// checkout.session.completed, checkout.session.async_payment_succeeded,
// charge.refunded. Every request is checked against STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  if (!storeReady() || !env.webhookSecret)
    return new Response('Store is not configured', { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('No signature', { status: 400 });
  // The signature covers the raw body, so it is read as text, not JSON.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      body,
      signature,
      env.webhookSecret,
    );
  } catch {
    return new Response('Bad signature', { status: 400 });
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillSession(event.data.object, siteOrigin(request));
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        // Only a full refund closes the links; a partial one keeps them.
        if (charge.refunded && paymentIntent) await markRefunded(paymentIntent);
        break;
      }
    }
  } catch (error) {
    console.error('Webhook handling failed', event.type, error);
    // 500 makes Stripe retry later; fulfilment is safe to repeat.
    return new Response('Retry', { status: 500 });
  }
  return Response.json({ received: true });
}
