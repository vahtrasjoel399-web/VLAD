import PortfolioView from './portfolio-view';
import { getSiteContent } from '@/lib/store/content';
export const dynamic = 'force-dynamic';
export default async function Home() {
  try {
    return <PortfolioView content={await getSiteContent()} />;
  } catch {
    return (
      <main className="error-page">
        <h1>A short pause.</h1>
        <p>The collection could not be loaded.</p>
        <a href="/">Try again ↗</a>
      </main>
    );
  }
}
