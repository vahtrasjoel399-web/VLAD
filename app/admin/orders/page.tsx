import type { Metadata } from 'next';
import { isAdmin } from '@/lib/store/admin';
import { getProducts } from '@/lib/store/catalog';
import { db } from '@/lib/store/clients';
import { DOWNLOAD_LIMIT, LINK_TTL_HOURS, env, storeReady } from '@/lib/store/config';
import { allProductFiles } from '@/lib/store/files';
import type { Order } from '@/lib/store/orders';
import FileUpload from './file-upload';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Магазин — заказы',
  robots: { index: false, follow: false },
};

type Log = {
  id: number;
  order_id: string;
  at: string;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  outcome: string;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Tallinn',
  });
const euro = (cents: number) =>
  cents ? `€${(cents / 100).toFixed(2).replace(/\.00$/, '')}` : 'бесплатно';
const size = (bytes: number) =>
  bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.ceil(bytes / 1024)} КБ`;

const OUTCOME: Record<string, string> = {
  ok: 'скачал',
  expired: 'истекла',
  limit: 'лимит',
  revoked: 'отозвана',
  stale: 'старая ссылка',
  blocked: 'БЛОК',
};

function linkState(o: Order) {
  if (o.status === 'refunded') return 'возврат денег';
  if (o.link_revoked) return o.flagged ? 'заблокирована' : 'отозвана';
  if (Date.now() > new Date(o.link_issued_at).getTime() + LINK_TTL_HOURS * 3_600_000)
    return 'истекла';
  if (o.downloads_used >= DOWNLOAD_LIMIT) return 'лимит';
  return 'активна';
}

function Action({ id, action, label }: { id: string; action: string; label: string }) {
  return (
    <form method="post" action={`/api/admin/orders/${id}`}>
      <input type="hidden" name="action" value={action} />
      <button className="plain-button is-small" type="submit">
        {label}
      </button>
    </form>
  );
}

export default async function OrdersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; q?: string; flagged?: string; product?: string; done?: string }>;
}) {
  const sp = await searchParams;

  if (!storeReady()) {
    const missing = [
      ['STRIPE_SECRET_KEY', env.stripeKey],
      ['SUPABASE_URL', env.supabaseUrl],
      ['SUPABASE_SERVICE_ROLE_KEY', env.supabaseKey],
      ['STORE_SECRET (32+ символа)', env.storeSecret.length >= 32 ? 'ok' : ''],
      ['ADMIN_PASSWORD', env.adminPassword],
    ].filter(([, v]) => !v);
    return (
      <main className="plain-page">
        <h1>Магазин не настроен</h1>
        <p className="plain-note">Добавьте переменные окружения:</p>
        <ul className="plain-list">
          {missing.map(([k]) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="plain-page">
        <a className="plain-brand" href="/">SMOLIN.FX</a>
        <h1>Вход в магазин</h1>
        <form className="plain-form" method="post" action="/api/admin/login">
          <label>
            Пароль
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button className="plain-button" type="submit">Войти</button>
          {sp.e === 'login' && <p className="plain-alert">Неверный пароль.</p>}
        </form>
      </main>
    );
  }

  let query = db().from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (sp.flagged) query = query.eq('flagged', true);
  const q = (sp.q || '').trim();
  if (/^SF-/i.test(q)) query = query.eq('order_no', q.toUpperCase());
  else if (q) query = query.ilike('email', `%${q.replace(/[%_\\]/g, '')}%`);

  const [{ data: orderRows }, products, files, { count: flaggedCount }] = await Promise.all([
    query,
    getProducts().catch(() => []),
    allProductFiles(),
    db().from('orders').select('id', { count: 'exact', head: true }).eq('flagged', true),
  ]);
  const orders = (orderRows || []) as Order[];
  const { data: logRows } = orders.length
    ? await db()
        .from('download_log')
        .select('*')
        .in('order_id', orders.map((o) => o.id))
        .order('at', { ascending: false })
        .limit(3000)
    : { data: [] };
  const logs = (logRows || []) as Log[];
  const fileFor = new Map(files.map((f) => [f.product_id, f]));
  const paidTotal = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount_total, 0);

  return (
    <main className="plain-page is-wide">
      <div className="admin-top">
        <a className="plain-brand" href="/">SMOLIN.FX</a>
        <form method="post" action="/api/admin/logout">
          <button className="plain-button is-small" type="submit">Выйти</button>
        </form>
      </div>
      <h1>Магазин</h1>
      {sp.done && <p className="plain-ok">Сделано.</p>}

      <section id="files" className="admin-section">
        <h2>Файлы товаров</h2>
        <p className="plain-note">
          Файлы лежат в закрытом хранилище, публичной ссылки на них нет. Товары и цены
          меняются в Sanity, здесь только файл. Без файла товар на сайте показывает «Скоро».
        </p>
        <table className="admin-table">
          <thead>
            <tr><th>Товар</th><th>Цена</th><th>Файл</th><th>Обновлён</th><th>Загрузка</th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const f = fileFor.get(p.id);
              return (
                <tr key={p.id} className={sp.product === p.id ? 'is-target' : undefined}>
                  <td>{p.title}</td>
                  <td>{typeof p.price === 'number' ? (p.price ? `€${p.price}` : 'бесплатно') : '—'}</td>
                  <td>{f ? `${f.file_name} (${size(f.size)})` : <span className="admin-warn">нет файла</span>}</td>
                  <td>{f ? when(f.updated_at) : ''}</td>
                  <td><FileUpload productId={p.id} /></td>
                </tr>
              );
            })}
            {!products.length && (
              <tr><td colSpan={5}>В Sanity пока нет опубликованных товаров.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-section">
        <h2>Заказы</h2>
        <div className="admin-filters">
          <a href="/admin/orders" aria-current={!sp.flagged ? 'page' : undefined}>Все</a>
          <a href="/admin/orders?flagged=1" aria-current={sp.flagged ? 'page' : undefined}>
            Подозрительные ({flaggedCount || 0})
          </a>
          <form method="get" action="/admin/orders">
            <input name="q" defaultValue={q} placeholder="email или SF-…" />
          </form>
          <span className="plain-note">Оплачено в списке: {euro(paidTotal)}</span>
        </div>
        {orders.map((o) => {
          const own = logs.filter((l) => l.order_id === o.id);
          return (
            <details key={o.id} id={o.order_no} className={`admin-order ${o.flagged ? 'is-flagged' : ''}`}>
              <summary>
                <span>{when(o.created_at)}</span>
                <b>{o.order_no}</b>
                <span>{o.product_title}</span>
                <span>{o.email}</span>
                <span>{euro(o.amount_total)}</span>
                <span>{o.downloads_used}/{DOWNLOAD_LIMIT}</span>
                <span>{linkState(o)}</span>
                {o.flagged && <span className="admin-warn">⚑ {o.flag_reason}</span>}
              </summary>
              <div className="admin-order-body">
                <p className="plain-note">
                  Согласие с лицензией: {o.consent_at ? when(o.consent_at) : '—'}, версия{' '}
                  {o.license_version || '—'}. Ссылка выдана {when(o.link_issued_at)}.
                  {o.email_sent_at ? ` Письмо отправлено ${when(o.email_sent_at)}.` : ' Письмо не отправлено.'}
                  {o.stripe_payment_intent && (
                    <>
                      {' '}
                      <a href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent}`} target="_blank" rel="noreferrer">
                        Платёж в Stripe
                      </a>
                    </>
                  )}
                </p>
                <div className="admin-actions">
                  {!o.link_revoked && <Action id={o.id} action="revoke" label="Отозвать ссылку" />}
                  <Action id={o.id} action="reissue" label="Новая ссылка" />
                  <Action id={o.id} action="reissue_email" label="Новая ссылка + письмо" />
                  {o.flagged && <Action id={o.id} action="unflag" label="Снять отметку" />}
                </div>
                <table className="admin-table">
                  <thead>
                    <tr><th>Время</th><th>Результат</th><th>Страна</th><th>IP</th><th>Браузер</th></tr>
                  </thead>
                  <tbody>
                    {own.map((l) => (
                      <tr key={l.id}>
                        <td>{when(l.at)}</td>
                        <td className={l.outcome === 'blocked' ? 'admin-warn' : undefined}>{OUTCOME[l.outcome] || l.outcome}</td>
                        <td>{l.country || '—'}</td>
                        <td>{l.ip || '—'}</td>
                        <td className="admin-ua">{l.user_agent}</td>
                      </tr>
                    ))}
                    {!own.length && <tr><td colSpan={5}>Скачиваний ещё не было.</td></tr>}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
        {!orders.length && <p className="plain-note">Заказов нет.</p>}
      </section>
    </main>
  );
}
