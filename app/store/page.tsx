import type { Metadata } from 'next';
import PortfolioView from '../portfolio-view';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Store — SMOLIN.FX',
  description: 'Presets, LUTs and editing tools by Vladislav Smolin.',
};
export default async function Store() {
  try {
    return <PortfolioView content={await getContent()} initialPage="store" />;
  } catch {
    return (
      <main className="error-page">
        <h1>A short pause.</h1>
        <a href="/store">Try again ↗</a>
      </main>
    );
  }
}
