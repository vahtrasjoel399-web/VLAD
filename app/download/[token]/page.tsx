import type { Metadata } from 'next';
import { DOWNLOAD_LIMIT, LINK_TTL_HOURS, storeReady } from '@/lib/store/config';
import { readDownloadToken } from '@/lib/store/links';
import { orderBy } from '@/lib/store/orders';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Download — SMOLIN.FX',
  robots: { index: false, follow: false },
};

const COPY = {
  en: {
    title: 'Your download',
    order: 'Order',
    left: 'Downloads left',
    until: 'Link works until',
    button: 'Download',
    note: 'The file carries your email and order number. Personal license: do not share the file or this link.',
    license: 'License terms',
    help: 'Problem with the link? Write to me and include your order number.',
    contact: 'Contact',
    errors: {
      invalid: 'This link is not valid.',
      expired: `This link has expired (it works for ${LINK_TTL_HOURS} hours).`,
      limit: `All ${DOWNLOAD_LIMIT} downloads of this link are used up.`,
      revoked: 'This link has been turned off.',
      stale: 'This link was replaced by a newer one. Use the latest email.',
      blocked:
        'This link was opened from different places and has been blocked to protect the files.',
      nofile: 'The file is being updated. Please try again a little later.',
      closed: 'Downloads are paused for a moment. Please try again later.',
      error: 'Something went wrong. Please try again.',
    } as Record<string, string>,
  },
  ru: {
    title: 'Ваше скачивание',
    order: 'Заказ',
    left: 'Осталось скачиваний',
    until: 'Ссылка работает до',
    button: 'Скачать',
    note: 'В файле записаны ваш email и номер заказа. Лицензия личная: не передавайте файл и эту ссылку.',
    license: 'Условия лицензии',
    help: 'Проблема со ссылкой? Напишите мне и укажите номер заказа.',
    contact: 'Контакты',
    errors: {
      invalid: 'Эта ссылка недействительна.',
      expired: `Срок ссылки истёк (она работает ${LINK_TTL_HOURS} часов).`,
      limit: `Все ${DOWNLOAD_LIMIT} скачиваний по этой ссылке использованы.`,
      revoked: 'Эта ссылка отключена.',
      stale: 'Эту ссылку заменила новая. Откройте последнее письмо.',
      blocked:
        'Ссылку открывали из разных мест, поэтому она заблокирована для защиты файлов.',
      nofile: 'Файл обновляется. Попробуйте чуть позже.',
      closed: 'Скачивание ненадолго приостановлено. Попробуйте позже.',
      error: 'Что-то пошло не так. Попробуйте ещё раз.',
    } as Record<string, string>,
  },
};

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const [{ token }, { e }] = await Promise.all([params, searchParams]);
  const link = storeReady() ? readDownloadToken(token) : null;
  const order = link
    ? await orderBy('order_no', link.orderNo).catch(() => null)
    : null;
  const t = COPY[order?.locale === 'ru' ? 'ru' : 'en'];

  const expires = order
    ? new Date(
        new Date(order.link_issued_at).getTime() + LINK_TTL_HOURS * 3_600_000,
      )
    : null;
  const state = !order
    ? 'invalid'
    : link!.gen !== order.link_gen
      ? 'stale'
      : order.link_revoked || order.status === 'refunded'
        ? order.flagged
          ? 'blocked'
          : 'revoked'
        : expires! < new Date()
          ? 'expired'
          : order.downloads_used >= DOWNLOAD_LIMIT
            ? 'limit'
            : 'ok';
  const message = e && e !== 'ok' ? t.errors[e] || t.errors.error : '';

  return (
    <main className="plain-page">
      <a className="plain-brand" href="/">
        SMOLIN.FX
      </a>
      <h1>{t.title}</h1>
      {order && (
        <dl className="plain-facts">
          <div>
            <dt>{t.order}</dt>
            <dd>
              {order.order_no} · {order.product_title}
            </dd>
          </div>
          {state === 'ok' && (
            <>
              <div>
                <dt>{t.left}</dt>
                <dd>
                  {DOWNLOAD_LIMIT - order.downloads_used} / {DOWNLOAD_LIMIT}
                </dd>
              </div>
              <div>
                <dt>{t.until}</dt>
                <dd>
                  {expires!.toLocaleString(
                    order.locale === 'ru' ? 'ru-RU' : 'en-GB',
                    {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Tallinn',
                    },
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
      )}
      {message && (
        <p className="plain-alert" role="alert">
          {message}
        </p>
      )}
      {state === 'ok' ? (
        <form method="post" action={`/api/download/${encodeURIComponent(token)}`}>
          <button className="plain-button" type="submit">
            {t.button}
          </button>
        </form>
      ) : (
        !message && (
          <p className="plain-alert" role="alert">
            {t.errors[state]}
          </p>
        )
      )}
      <p className="plain-note">{t.note}</p>
      <p className="plain-note">
        <a href="/license">{t.license}</a> · {t.help}{' '}
        <a href="/contacts">{t.contact}</a>
      </p>
    </main>
  );
}
