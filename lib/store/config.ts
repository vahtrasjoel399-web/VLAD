import 'server-only';

// Rules for personal download links.
export const DOWNLOAD_LIMIT = 5;
export const LINK_TTL_HOURS = 48;
// A link is blocked once successful downloads come from this many countries
// or this many IP addresses. One phone switching from Wi-Fi to mobile data
// changes its IP, so the IP rule allows two before it blocks on the third.
export const MAX_COUNTRIES = 2;
export const MAX_IPS = 3;
// Files above this size are sent through a 60-second private storage link
// instead of through the site's function (Vercel caps function responses).
export const INLINE_LIMIT = 4 * 1024 * 1024;
export const BUCKET = 'products';

// All secrets come from environment variables, never from the code.
export const env = {
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  // Signs download links and the admin login cookie. Any long random string.
  storeSecret: process.env.STORE_SECRET || '',
  resendKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'SMOLIN.FX <onboarding@resend.dev>',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  siteUrl: (process.env.SITE_URL || '').replace(/\/$/, ''),
};

// The new store runs once Stripe, Supabase and the signing secret are set.
// Until then the store keeps the old behaviour (payment link from Sanity).
export function storeReady() {
  return Boolean(
    env.stripeKey &&
      env.supabaseUrl &&
      env.supabaseKey &&
      env.storeSecret.length >= 32,
  );
}

export function siteOrigin(request: Request) {
  return env.siteUrl || new URL(request.url).origin;
}
