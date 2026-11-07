import { guard } from '@/lib/store/admin';
import { getProducts } from '@/lib/store/catalog';
import { bucket } from '@/lib/store/files';

// Step 1 of a file upload: a one-time upload address in the private bucket.
// The browser sends the file straight to storage, so its size is not limited
// by the site's functions.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
    fileName?: unknown;
  } | null;
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
  const products = await getProducts();
  if (!products.some((p) => p.id === productId))
    return Response.json({ error: 'Товар не найден в Sanity (нажмите Publish)' }, { status: 404 });
  // Storage paths: letters, digits, dot, dash, underscore only.
  const safe =
    fileName
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^[._]+/, '')
      .slice(-120) || 'file';
  const path = `${productId}/${Date.now()}-${safe}`;
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data)
    return Response.json({ error: error?.message || 'upload_failed' }, { status: 502 });
  return Response.json({ signedUrl: data.signedUrl, path });
}
