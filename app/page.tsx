import PortfolioView from './portfolio-view';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export default async function Home() {
  try {
    return <PortfolioView content={await getContent()} />;
  } catch {
    return (
      <main className="error-page">
        <h1>Небольшая пауза.</h1>
        <p>Не удалось загрузить коллекцию.</p>
        <a href="/">Попробовать снова ↗</a>
      </main>
    );
  }
}
