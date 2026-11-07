import 'server-only';
import {
  LICENSE_EN,
  LICENSE_RU,
  LICENSE_VERSION,
} from '../../cms/license-default';

export type License = {
  version: string;
  updatedAt?: string;
  textEn: string;
  textRu: string;
};

export type CatalogProduct = {
  id: string;
  title: string;
  titleRu?: string;
  price: number;
  image?: string;
};

// Reads published content from the public Sanity dataset (no token needed).
async function query<T>(groq: string, params: Record<string, string> = {}) {
  const project = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  if (!project) return null;
  if (!/^[a-z0-9-]+$/.test(project) || !/^[a-z0-9_-]+$/.test(dataset))
    throw new Error('Invalid CMS configuration');
  const search = new URLSearchParams({ query: groq, perspective: 'published' });
  for (const [key, value] of Object.entries(params))
    search.set(`$${key}`, JSON.stringify(value));
  const response = await fetch(
    `https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}?${search}`,
    { cache: 'no-store', signal: AbortSignal.timeout(6000) },
  );
  if (!response.ok) throw new Error('CMS unavailable');
  return ((await response.json()) as { result: T | null }).result;
}

// Prices always come from Sanity on the server, never from the browser.
export async function getProduct(id: string) {
  if (!/^[\w.-]{1,128}$/.test(id) || id.startsWith('drafts.')) return null;
  const product = await query<CatalogProduct>(
    `*[_type=="product" && _id==$id][0]{"id":_id,title,titleRu,price,"image":image.asset->url}`,
    { id },
  );
  return product && typeof product.price === 'number' && product.title
    ? product
    : null;
}

export async function getProducts() {
  return (
    (await query<CatalogProduct[]>(
      `*[_type=="product" && defined(title)]|order(order asc){"id":_id,title,titleRu,price,"image":image.asset->url}`,
    )) || []
  );
}

const fallbackLicense: License = {
  version: LICENSE_VERSION,
  textEn: LICENSE_EN,
  textRu: LICENSE_RU,
};

export async function getLicense(): Promise<License> {
  try {
    const license = await query<License>(
      `*[_type=="license" && _id=="license"][0]{version,updatedAt,textEn,textRu}`,
    );
    return license?.version && license.textEn
      ? { ...license, textRu: license.textRu || license.textEn }
      : fallbackLicense;
  } catch {
    return fallbackLicense;
  }
}
