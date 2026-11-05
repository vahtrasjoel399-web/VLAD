import { safeLink, type Product } from './content';

// Normally the Stripe link goes into the product in Sanity (field
// "Ссылка на оплату Stripe"). This list is only a fallback for products
// without one. Key: the product's English title (case does not matter).
// Value: the link from Stripe → Payment Links → Copy link.
// Rename the example keys to the real product titles and replace each
// REPLACE_ME link with the real one.
export const PAYMENT_LINKS: Record<string, string> = {
  'Product 1': 'https://buy.stripe.com/REPLACE_ME_1',
  'Product 2': 'https://buy.stripe.com/REPLACE_ME_2',
};

const links = new Map(
  Object.entries(PAYMENT_LINKS).map(([title, url]) => [
    title.trim().toLowerCase(),
    url,
  ]),
);

// The checkout link for a product: the Sanity field first, then this file.
// Placeholder links show in development only, so a live site never sends
// buyers to a dead page; there the button reads "Coming soon" instead.
export function checkoutLink(product: Product) {
  const url =
    product.checkoutUrl || links.get(product.title.trim().toLowerCase());
  if (url?.includes('REPLACE_ME') && process.env.NODE_ENV === 'production')
    return undefined;
  return safeLink(url);
}
