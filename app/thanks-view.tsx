'use client';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
type Locale = 'en' | 'ru';

const COPY = {
  en: {
    headingOne: 'THANK',
    headingTwo: 'YOU.',
    label: 'PAYMENT // RECEIVED',
    lead: 'Your payment went through.',
    receipt:
      'A receipt from Stripe is on its way to your email. If it has not arrived in a few minutes, check your spam folder.',
    store: 'Back to the store',
    contact: 'Questions? Write to me',
  },
  ru: {
    headingOne: 'ОПЛАТА',
    headingTwo: 'ПРОШЛА.',
    label: 'ОПЛАТА // ПОЛУЧЕНА',
    lead: 'Спасибо за покупку!',
    receipt:
      'Чек от Stripe придёт на вашу почту. Если через несколько минут письма нет, проверьте папку «Спам».',
    store: 'Вернуться в магазин',
    contact: 'Есть вопросы? Напишите мне',
  },
} as const;

export default function ThanksView({
  locale,
  titleRef,
  onStore,
  onContact,
}: {
  locale: Locale;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onStore: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onContact: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = COPY[locale];
  return (
    <section className="thanks">
      <div className="contact-heading">
        <h1 ref={titleRef} tabIndex={-1}>
          <span className="title-mask">
            <span>{t.headingOne}</span>
          </span>
          <span className="title-mask">
            <span className="title-chrome">{t.headingTwo}</span>
          </span>
        </h1>
      </div>
      <div className="section-label">
        <span>{t.label}</span>
        <span>
          <i className="checker" aria-hidden="true" />
          OK
        </span>
      </div>
      <div className="thanks-body reveal">
        <p className="thanks-lead">{t.lead}</p>
        <p className="thanks-copy">{t.receipt}</p>
        <div className="thanks-links">
          <a className="back-link" href="/store" onClick={onStore}>
            {t.store} <ArrowRight size={16} />
          </a>
          <a className="back-link" href="/contacts" onClick={onContact}>
            {t.contact} <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
