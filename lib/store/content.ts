import 'server-only';
import { getContent, type Portfolio } from '../content';
import { getLicense } from './catalog';
import { storeReady } from './config';
import { productsWithFiles } from './files';

// Site content plus the protected store state: which products have a file
// and which license version the buyer agrees to.
export async function getSiteContent(): Promise<Portfolio> {
  const content = await getContent();
  if (!storeReady()) return content;
  const [withFiles, license] = await Promise.all([
    productsWithFiles(),
    getLicense(),
  ]);
  return {
    ...content,
    store: { ready: true, licenseVersion: license.version },
    products: content.products.map((p) => ({
      ...p,
      available: Boolean(withFiles?.has(p.id)),
    })),
  };
}
