import PortfolioView from '../portfolio-view';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export default async function Contacts() {
  try {
    return (
      <PortfolioView content={await getContent()} initialPage="contacts" />
    );
  } catch {
    return (
      <main className="error-page">
        <h1>A short pause.</h1>
        <a href="/contacts">Try again ↗</a>
      </main>
    );
  }
}
