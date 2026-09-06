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
        <h1>Небольшая пауза.</h1>
        <a href="/contacts">Попробовать снова ↗</a>
      </main>
    );
  }
}
