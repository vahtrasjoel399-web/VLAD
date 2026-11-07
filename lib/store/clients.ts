import 'server-only';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './config';

let supabase: SupabaseClient | undefined;
let stripe: Stripe | undefined;

// Server-side Supabase client with the service role key. Never sent to the browser.
export function db() {
  supabase ??= createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export function stripeClient() {
  stripe ??= new Stripe(env.stripeKey);
  return stripe;
}
