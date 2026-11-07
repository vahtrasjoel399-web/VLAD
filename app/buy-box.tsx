'use client';
import { useId, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Product, StoreInfo } from '@/lib/content';

type Locale = 'en' | 'ru';

const COPY = {
  en: {
    agree: 'I agree to the',
    terms: 'license terms',
    email: 'Your email',
    send: 'Send me the link',
    sent: 'Done. The download link is in your inbox.',
    wait: 'One moment…',
    errors: {
      consent_required: 'Tick the box to agree to the license first.',
      license_changed: 'The license terms were updated. Reload the page and read them again.',
      no_file: 'This product is not ready yet.',
      bad_email: 'Check the email address.',
      too_many: 'Too many requests for this email today.',
      default: 'Something went wrong. Please try again.',
    } as Record<string, string>,
  },
  ru: {
    agree: 'Я согласен с',
    terms: 'условиями лицензии',
    email: 'Ваш email',
    send: 'Прислать ссылку',
    sent: 'Готово. Ссылка на скачивание уже на почте.',
    wait: 'Секунду…',
    errors: {
      consent_required: 'Сначала поставьте галочку согласия с лицензией.',
      license_changed: 'Условия лицензии обновились. Обновите страницу и прочитайте их.',
      no_file: 'Этот товар ещё не готов.',
      bad_email: 'Проверьте адрес почты.',
      too_many: 'Слишком много запросов на эту почту сегодня.',
      default: 'Что-то пошло не так. Попробуйте ещё раз.',
    } as Record<string, string>,
  },
};

// Buy button of the protected store: the license box must be ticked before
// checkout opens. Free products ask for an email instead of payment.
export default function BuyBox({
  product,
  store,
  locale,
  label,
}: {
  product: Product;
  store: StoreInfo;
  locale: Locale;
  label: React.ReactNode;
}) {
  const t = COPY[locale];
  const id = useId();
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const free = product.price === 0;

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!agreed) return setError(t.errors.consent_required);
    setBusy(true);
    setError('');
    try {
      const response = await fetch(free ? '/api/free' : '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          locale,
          consent: true,
          licenseVersion: store.licenseVersion,
          ...(free ? { email } : {}),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        url?: string;
        sent?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || 'default');
      if (free) {
        if (result.url) location.href = result.url;
        else setDone(t.sent);
      } else if (result.url) location.href = result.url;
      else throw new Error('default');
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : 'default';
      setError(t.errors[code] || t.errors.default);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <output className="buy-done">{done}</output>
    );

  return (
    <form className="buy-box" onSubmit={submit}>
      {free && (
        <input
          className="buy-email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.email}
          aria-label={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      <label className="buy-consent" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (e.target.checked) setError('');
          }}
        />
        <span>
          {t.agree}{' '}
          <a
            href={locale === 'ru' ? '/license?lang=ru' : '/license'}
            target="_blank"
            rel="noopener"
          >
            {t.terms}
          </a>
        </span>
      </label>
      <button
        className="product-buy"
        type="submit"
        disabled={!agreed || busy}
        aria-disabled={!agreed || busy}
      >
        <span>{busy ? t.wait : free ? t.send : label}</span>
        <ArrowUpRight size={16} />
      </button>
      {error && (
        <p className="buy-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
