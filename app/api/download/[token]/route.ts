import {
  DOWNLOAD_LIMIT,
  INLINE_LIMIT,
  LINK_TTL_HOURS,
  MAX_COUNTRIES,
  MAX_IPS,
  storeReady,
} from '@/lib/store/config';
import { db } from '@/lib/store/clients';
import { bucket, productFile } from '@/lib/store/files';
import { readDownloadToken } from '@/lib/store/links';
import { orderBy } from '@/lib/store/orders';
import { markedName, stampFile } from '@/lib/store/stamp';

export const maxDuration = 60;

// The file itself is only given out on POST (the "Download" button on the
// /download page). Mail scanners open links with GET; they must not use up
// downloads or trip the country check.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const back = (reason: string) =>
    Response.redirect(
      new URL(`/download/${encodeURIComponent(token)}?e=${reason}`, request.url),
      303,
    );
  if (!storeReady()) return back('closed');
  const link = readDownloadToken(token);
  if (!link) return back('invalid');
  const order = await orderBy('order_no', link.orderNo).catch(() => null);
  if (!order) return back('invalid');

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;
  // Set by Vercel from the visitor's IP. Absent locally.
  const country = request.headers.get('x-vercel-ip-country') || null;
  const { data: outcome, error } = await db().rpc('claim_download', {
    p_order_id: order.id,
    p_gen: link.gen,
    p_ip: ip,
    p_country: country,
    p_user_agent: request.headers.get('user-agent') || '',
    p_max_downloads: DOWNLOAD_LIMIT,
    p_ttl_hours: LINK_TTL_HOURS,
    p_max_countries: MAX_COUNTRIES,
    p_max_ips: MAX_IPS,
  });
  if (error) {
    console.error('claim_download failed', error);
    return back('error');
  }
  if (outcome !== 'ok') return back(String(outcome));

  try {
    const file = await productFile(order.product_id);
    if (!file) return back('nofile');
    const name = markedName(file.file_name, order.order_no);
    if (file.size > INLINE_LIMIT) {
      // Big files: a private storage link that lives 60 seconds, with the
      // order number in the file name.
      const { data, error: signError } = await bucket().createSignedUrl(
        file.path,
        60,
        { download: name },
      );
      if (signError || !data) throw signError;
      return Response.redirect(data.signedUrl, 303);
    }
    const { data: blob, error: readError } = await bucket().download(file.path);
    if (readError || !blob) throw readError;
    const bytes = stampFile(
      file.file_name,
      new Uint8Array(await blob.arrayBuffer()),
      {
        email: order.email,
        orderNo: order.order_no,
        date: order.created_at.slice(0, 10),
      },
      order.product_title,
    );
    const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
    return new Response(new Blob([bytes as BlobPart]), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (failure) {
    console.error('Download failed', order.order_no, failure);
    // Give the download back (the count from before this attempt): the
    // buyer did not get a file.
    await db()
      .from('orders')
      .update({ downloads_used: order.downloads_used })
      .eq('id', order.id);
    return back('error');
  }
}
