'use client';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { DownloadInfo } from './portfolio-view';
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
    download: 'Download your files',
    order: 'Order',
    emailed: 'The same personal link went to',
    notEmailed: 'Save this link: it is personal and works for 48 hours and up to 5 downloads.',
    personal: 'The link works for 48 hours and up to 5 downloads. Please do not share it.',
    pending:
      'Your payment is being confirmed. Refresh this page in a minute, or wait for the email with your link.',
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
    download: 'Скачать файлы',
    order: 'Заказ',
    emailed: 'Эта же личная ссылка отправлена на',
    notEmailed: 'Сохраните ссылку: она личная, работает 48 часов и до 5 скачиваний.',
    personal: 'Ссылка работает 48 часов и до 5 скачиваний. Пожалуйста, не передавайте её.',
    pending:
      'Оплата подтверждается. Обновите страницу через минуту или дождитесь письма со ссылкой.',
  },
} as const;

export default function ThanksView({
  locale,
  download,
  titleRef,
  onStore,
  onContact,
}: {
  locale: Locale;
  download?: DownloadInfo;
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
        {download && !download.pending ? (
          <div className="thanks-download">
            <a className="product-buy" href={download.url}>
              <span>{t.download}</span>
              <ArrowRight size={16} />
            </a>
            <p className="thanks-copy">
              {t.order} {download.orderNo} · {download.product}
            </p>
            <p className="thanks-copy">
              {download.emailed
                ? `${t.emailed} ${download.email}. ${t.personal}`
                : t.notEmailed}
            </p>
          </div>
        ) : download?.pending ? (
          <p className="thanks-copy">{t.pending}</p>
        ) : null}
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
