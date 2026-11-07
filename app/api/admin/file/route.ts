import { guard } from '@/lib/store/admin';
import { db } from '@/lib/store/clients';
import { bucket, productFile } from '@/lib/store/files';

// Step 2 of a file upload: after the browser finished sending the file,
// attach it to the product and delete the previous file.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const path = typeof body?.path === 'string' ? body.path : '';
  const fileName =
    typeof body?.fileName === 'string' ? body.fileName.slice(0, 200) : '';
  if (!productId || !fileName || !path.startsWith(`${productId}/`) || path.includes('..'))
    return Response.json({ error: 'bad_request' }, { status: 400 });

  // Make sure the file really arrived and read its size.
  const name = path.slice(productId.length + 1);
  const { data: listed, error: listError } = await bucket().list(productId, {
    search: name,
  });
  const object = listed?.find((o) => o.name === name);
  if (listError || !object)
    return Response.json({ error: 'Файл не дошёл до хранилища' }, { status: 409 });

  const previous = await productFile(productId);
  const { error } = await db().from('product_files').upsert({
    product_id: productId,
    path,
    file_name: fileName.replace(/[\r\n"\\/]/g, '_'),
    size: Number(object.metadata?.size) || 0,
    updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 502 });
  if (previous && previous.path !== path) await bucket().remove([previous.path]);
  return Response.json({ ok: true });
}
