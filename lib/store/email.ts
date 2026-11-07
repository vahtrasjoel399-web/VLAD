import 'server-only';
import { DOWNLOAD_LIMIT, LINK_TTL_HOURS, env } from './config';

type Mail = {
  to: string;
  locale: string;
  orderNo: string;
  product: string;
  url: string;
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function compose({ locale, orderNo, product, url }: Mail) {
  const ru = locale === 'ru';
  const subject = ru
    ? `Ваша ссылка на скачивание: ${product}`
    : `Your download link: ${product}`;
  const lines = ru
    ? [
        'Спасибо за покупку!',
        `Товар: ${product}. Заказ: ${orderNo}.`,
        `Ссылка личная: она работает ${LINK_TTL_HOURS} часов и до ${DOWNLOAD_LIMIT} скачиваний. Не пересылайте её: если ссылку откроют из разных мест, она заблокируется.`,
        'В файлах записаны ваш email и номер заказа. Условия лицензии: /license на сайте.',
      ]
    : [
        'Thank you for your purchase!',
        `Product: ${product}. Order: ${orderNo}.`,
        `This link is personal: it works for ${LINK_TTL_HOURS} hours and for up to ${DOWNLOAD_LIMIT} downloads. Please do not forward it: opened from different places, it gets blocked.`,
        'The files carry your email and order number. License terms: /license on the site.',
      ];
  const button = ru ? 'Скачать' : 'Download';
  const text = [...lines, '', `${button}: ${url}`].join('\n\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:520px">
${lines.map((l) => `<p>${escape(l)}</p>`).join('\n')}
<p><a href="${escape(url)}" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none">${button}</a></p>
<p style="color:#666;font-size:13px">${escape(url)}</p>
<p style="color:#666;font-size:13px">SMOLIN.FX</p>
</div>`;
  return { subject, text, html };
}

// Sends the download link through Resend. Returns false when email is not set
// up yet; the thanks page still shows the link in that case.
export async function sendDownloadEmail(mail: Mail) {
  if (!env.resendKey) return false;
  const { subject, text, html } = compose(mail);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [mail.to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    console.error('Resend failed', response.status, await response.text());
  return response.ok;
}
