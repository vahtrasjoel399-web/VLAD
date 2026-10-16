'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { productImage, safeLink, type Product } from '@/lib/content';
import LiquidCanvas from './liquid-canvas';
type Locale = 'en' | 'ru';

const COPY = {
  en: {
    headingOne: 'THE',
    headingTwo: 'STORE.',
    label: 'PRESETS / LUTS / TOOLS',
    empty: 'The store opens soon.',
    buy: 'Buy',
    isNew: 'NEW',
    get: 'Get',
    free: 'Free',
    soon: 'Coming soon',
    back: 'Back to work',
    metaLeft: 'SMOLIN.FX // STORE_SEQUENCE_01',
    metaRight: 'DIGITAL GOODS — EUR',
    ticker: ['PRESETS', 'LUTS', 'EFFECTS'],
    howTitle: 'HOW IT WORKS // 03 STEPS',
    steps: [
      ['PICK', 'Choose a pack', 'Presets, LUTs and effects in one place.'],
      [
        'PAY',
        'Pay securely',
        'Checkout opens in a new tab. Prices are in euros.',
      ],
      [
        'GET',
        'Download at once',
        'The download link arrives by email right after payment.',
      ],
    ],
    facts: [
      ['STATUS:', 'Store open.'],
      ['DELIVERY:', 'Instant, by email.'],
      ['FORMAT:', 'Digital files.'],
    ],
    vertical: 'SMOLIN.FX — DIGITAL GOODS — MOTION IN FOCUS',
    ctaEyebrow: '[ SIGNAL ]',
    cta: 'QUESTIONS ABOUT A PACK?',
    ctaLink: 'WRITE TO ME',
  },
  ru: {
    headingOne: 'МОЙ',
    headingTwo: 'МАГАЗИН.',
    label: 'ПРЕСЕТЫ / LUT / ИНСТРУМЕНТЫ',
    empty: 'Магазин скоро откроется.',
    buy: 'Купить',
    isNew: 'НОВИНКА',
    get: 'Получить',
    free: 'Бесплатно',
    soon: 'Скоро',
    back: 'Вернуться к работам',
    metaLeft: 'SMOLIN.FX // STORE_SEQUENCE_01',
    metaRight: 'ЦИФРОВЫЕ ТОВАРЫ — EUR',
    ticker: ['ПРЕСЕТЫ', 'LUT', 'ЭФФЕКТЫ'],
    howTitle: 'КАК ЭТО РАБОТАЕТ // 03 ШАГА',
    steps: [
      ['PICK', 'Выберите набор', 'Пресеты, LUT и эффекты в одном месте.'],
      [
        'PAY',
        'Оплатите безопасно',
        'Оплата откроется в новой вкладке. Цены указаны в евро.',
      ],
      [
        'GET',
        'Скачайте сразу',
        'Ссылка на скачивание придёт на почту сразу после оплаты.',
      ],
    ],
    facts: [
      ['СТАТУС:', 'Магазин открыт.'],
      ['ДОСТАВКА:', 'Сразу, на почту.'],
      ['ФОРМАТ:', 'Цифровые файлы.'],
    ],
    vertical: 'SMOLIN.FX — ЦИФРОВЫЕ ТОВАРЫ — ДВИЖЕНИЕ В ФОКУСЕ',
    ctaEyebrow: '[ СИГНАЛ ]',
    cta: 'ВОПРОСЫ ПО НАБОРУ?',
    ctaLink: 'НАПИСАТЬ МНЕ',
  },
} as const;

const SPARK =
  'M50 0C54 34 66 46 100 50 66 54 54 66 50 100 46 66 34 54 0 50 34 46 46 34 50 0Z';

function Spark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d={SPARK} fill="url(#store-chrome)" />
    </svg>
  );
}

function Ticker({ words }: { words: readonly string[] }) {
  const items = Array.from({ length: 8 }, (_, i) => words[i % words.length]);
  const group = (hidden: boolean) => (
    <div className="store-ticker-group" aria-hidden={hidden || undefined}>
      {items.map((word, i) => (
        <span key={i}>
          {word}
          <Spark className="store-ticker-spark" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="store-ticker">
      <div className="store-ticker-track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  locale,
}: {
  product: Product;
  index: number;
  locale: Locale;
}) {
  const [imageError, setImageError] = useState(false);
  const t = COPY[locale];
  const title =
    locale === 'ru' ? product.titleRu || product.title : product.title;
  const description =
    locale === 'ru'
      ? product.descriptionRu || product.description
      : product.description;
  const image = imageError ? '' : productImage(product.image);
  const hoverImage = image ? productImage(product.imageHover) : '';
  const checkout = safeLink(product.checkoutUrl);
  const free = product.price === 0;
  const price =
    typeof product.price !== 'number'
      ? ''
      : free
        ? t.free
        : new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-IE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: Number.isInteger(product.price) ? 0 : 2,
          }).format(product.price);
  return (
    <article
      className="product reveal"
      style={{ '--delay': `${(index % 3) * 90}ms` } as React.CSSProperties}
    >
      <div
        className={`product-art ${image ? '' : 'is-empty'} ${hoverImage ? 'has-hover' : ''}`}
      >
        <span className="product-halftone" aria-hidden="true" />
        {image && (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}
        {hoverImage && (
          <img
            className="product-hover-image"
            src={hoverImage}
            alt=""
            loading="lazy"
          />
        )}
        <span className="product-tag" aria-hidden="true">
          [{String(index + 1).padStart(2, '0')}]
        </span>
        {product.isNew && <span className="product-new">{t.isNew}</span>}
        <Spark className="product-glint" />
      </div>
      <div className="product-body">
        <div className="product-head">
          <h2>{title}</h2>
          {price && <span className="product-price">{price}</span>}
        </div>
        {product.category && (
          <span className="product-kind">[{product.category}]</span>
        )}
        {description && <p className="product-copy">{description}</p>}
      </div>
      {checkout ? (
        <a
          className="product-buy"
          href={checkout}
          target="_blank"
          rel="noreferrer"
        >
          {free ? t.get : t.buy} <ArrowUpRight size={15} />
        </a>
      ) : (
        <span className="product-buy is-soon">{t.soon}</span>
      )}
    </article>
  );
}

export default function StoreView({
  products,
  locale,
  titleRef,
  onBack,
  onContact,
}: {
  products: Product[];
  locale: Locale;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onContact: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = COPY[locale];
  const categories = [
    ...new Set(
      products.map((p) => p.category?.trim().toUpperCase()).filter(Boolean),
    ),
  ] as string[];
  return (
    <section className="store">
      <svg className="store-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <linearGradient id="store-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.3" stopColor="#8a8a8a" />
            <stop offset="0.48" stopColor="#f4f4f4" />
            <stop offset="0.62" stopColor="#3d3d3d" />
            <stop offset="0.8" stopColor="#cfcfcf" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="contact-heading">
        <div className="store-meta" aria-hidden="true">
          <span>{t.metaLeft}</span>
          <span>+</span>
          <span>{t.metaRight}</span>
        </div>
        <div className="store-deco" aria-hidden="true">
          <span className="store-glow" />
          <img
            className="store-flower"
            src="/media/store/chrome-flower.png"
            alt=""
            width="720"
            height="905"
            fetchPriority="high"
          />
        </div>
        <h1 ref={titleRef} tabIndex={-1}>
          <span className="title-mask">
            <span>{t.headingOne}</span>
          </span>
          <span className="title-mask">
            <span className="title-chrome">{t.headingTwo}</span>
          </span>
        </h1>
      </div>
      <Ticker words={categories.length > 1 ? categories : t.ticker} />
      <div className="section-label">
        <span>{t.label}</span>
        <span>
          <i className="checker" aria-hidden="true" />
          {String(products.length).padStart(2, '0')}
        </span>
      </div>
      {products.length > 0 ? (
        <div className="store-grid">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="empty">{t.empty}</p>
      )}
      <div className="store-info reveal">
        <div className="section-label">
          <span>{t.howTitle}</span>
          <span>
            <i className="checker" aria-hidden="true" />
            03
          </span>
        </div>
        <div className="store-info-body">
          <ol className="store-steps">
            {t.steps.map(([tag, title, text], i) => (
              <li key={tag}>
                <span className="store-step-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="product-kind">[{tag}]</span>
                  <h2>{title}</h2>
                </div>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="store-side">
            <img
              className="store-globe"
              src="/media/store/chrome-globe.png"
              alt=""
              width="600"
              height="600"
              loading="lazy"
            />
            <dl>
              {t.facts.map(([term, value]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <span className="store-vertical" aria-hidden="true">
              {t.vertical}
            </span>
            <span className="store-cross" aria-hidden="true">
              +
            </span>
            <span className="store-cross" aria-hidden="true">
              +
            </span>
          </div>
        </div>
      </div>
      <a
        className="store-cta reveal"
        href="/contacts"
        onClick={onContact}
        data-liquid
      >
        <span className="liquid" aria-hidden="true">
          <LiquidCanvas />
        </span>
        <img
          className="store-cta-logo"
          src="/media/logo/smolin-logo.png"
          alt=""
          width="1600"
          height="799"
          loading="lazy"
        />
        <span className="product-kind">{t.ctaEyebrow}</span>
        <strong>{t.cta}</strong>
        <span className="store-cta-link">
          {t.ctaLink} <ArrowUpRight size={18} />
        </span>
      </a>
      <a className="back-link reveal" href="/" onClick={onBack}>
        {t.back} <ArrowRight size={16} />
      </a>
    </section>
  );
}
