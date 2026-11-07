import 'server-only';
import { BUCKET, storeReady } from './config';
import { db } from './clients';

export type ProductFile = {
  product_id: string;
  path: string;
  file_name: string;
  size: number;
  updated_at: string;
};

export async function productFile(productId: string) {
  const { data, error } = await db()
    .from('product_files')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return data as ProductFile | null;
}

export async function allProductFiles() {
  const { data, error } = await db().from('product_files').select('*');
  if (error) throw error;
  return (data || []) as ProductFile[];
}

// Product ids that have a file uploaded, for the store buttons.
// Null when the protected store is not set up yet.
export async function productsWithFiles() {
  if (!storeReady()) return null;
  try {
    return new Set((await allProductFiles()).map((f) => f.product_id));
  } catch (error) {
    console.error('Product files unavailable', error);
    return new Set<string>();
  }
}

export function bucket() {
  return db().storage.from(BUCKET);
}
