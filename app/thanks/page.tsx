import type { Metadata } from 'next';
import PortfolioView from '../portfolio-view';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thank you — SMOLIN.FX',
  robots: { index: false },
};
// Stripe sends buyers here after payment (set in each Payment Link).
export default async function Thanks() {
  try {
    return <PortfolioView content={await getContent()} initialPage="thanks" />;
  } catch {
    return (
      <main className="error-page">
        <h1>Thank you.</h1>
        <p>Your receipt is on its way to your email.</p>
        <a href="/store">Back to the store ↗</a>
      </main>
    );
  }
}
