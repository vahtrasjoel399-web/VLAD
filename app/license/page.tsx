import type { Metadata } from 'next';
import { getLicense } from '@/lib/store/catalog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'License — SMOLIN.FX',
  description: 'License terms for SMOLIN.FX presets, LUTs and other digital products.',
};

// Text format from Sanity: blank line = paragraph, "## " = heading, "- " = list item.
function Rich({ text }: { text: string }) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block, i) => {
      const lines = block.split('\n').filter((l) => l.trim());
      if (!lines.length) return null;
      if (lines[0].startsWith('## ')) {
        const rest = lines.slice(1);
        return (
          <section key={i}>
            <h2>{lines[0].slice(3)}</h2>
            {rest.length > 0 && <Block lines={rest} />}
          </section>
        );
      }
      return <Block key={i} lines={lines} />;
    });
}

function Block({ lines }: { lines: string[] }) {
  if (lines.every((l) => l.startsWith('- ')))
    return (
      <ul>
        {lines.map((l, i) => (
          <li key={i}>{l.slice(2)}</li>
        ))}
      </ul>
    );
  return <p>{lines.join(' ')}</p>;
}

export default async function LicensePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const ru = (await searchParams).lang === 'ru';
  const license = await getLicense();
  return (
    <main className="plain-page is-text" lang={ru ? 'ru' : 'en'}>
      <div className="admin-top">
        <a className="plain-brand" href="/store">
          SMOLIN.FX
        </a>
        <nav className="plain-lang">
          <a href="/license" aria-current={!ru ? 'page' : undefined}>
            EN
          </a>
          <a href="/license?lang=ru" aria-current={ru ? 'page' : undefined}>
            RU
          </a>
        </nav>
      </div>
      <h1>{ru ? 'Лицензия' : 'License'}</h1>
      <p className="plain-note">
        {ru ? 'Версия' : 'Version'} {license.version}
        {license.updatedAt ? ` · ${license.updatedAt}` : ''}
      </p>
      <div className="license-text">
        <Rich text={ru ? license.textRu : license.textEn} />
      </div>
      <p className="plain-note">
        <a href="/store">{ru ? '← Вернуться в магазин' : '← Back to the store'}</a>
      </p>
    </main>
  );
}
