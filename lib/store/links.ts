import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './config';

function sign(value: string) {
  return createHmac('sha256', env.storeSecret)
    .update(value)
    .digest('base64url')
    .slice(0, 32);
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// A personal download link: /download/SF-7K3QXP.1.<signature>
// The number is the link generation; issuing a new link bumps it, so every
// older link stops working. Nothing secret is stored in the database.
export function downloadToken(orderNo: string, gen: number) {
  return `${orderNo}.${gen}.${sign(`dl:${orderNo}.${gen}`)}`;
}

export function readDownloadToken(token: string) {
  const match = /^(SF-[A-Z0-9]{6,10})\.(\d{1,6})\.([\w-]{32})$/.exec(token);
  if (!match) return null;
  const [, orderNo, gen, signature] = match;
  if (!same(signature, sign(`dl:${orderNo}.${gen}`))) return null;
  return { orderNo, gen: Number(gen) };
}

// Short order code without look-alike characters (no 0/O, 1/I).
export function newOrderNo() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(7);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `SF-${code}`;
}

// Admin login cookie: "<expiry>.<signature>".
export function adminCookie(days = 7) {
  const expires = Date.now() + days * 86_400_000;
  return `${expires}.${sign(`admin:${expires}`)}`;
}

export function adminCookieValid(value: string | undefined) {
  if (!value || !env.storeSecret) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return same(signature, sign(`admin:${expires}`));
}

export function passwordMatches(input: string) {
  if (!env.adminPassword) return false;
  // Compare signatures so the check takes the same time for any input length.
  return same(sign(`pw:${input}`), sign(`pw:${env.adminPassword}`));
}
