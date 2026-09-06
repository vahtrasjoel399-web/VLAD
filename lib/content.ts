import fallback from '../content/portfolio.json';
export type Work = {
  id: string;
  title: string;
  client: string;
  kind: string;
  order: number;
  poster: string;
  src?: string;
  muxPlaybackId?: string;
  previewStart?: number;
  duration?: string;
  demo?: boolean;
  captions?: string;
};
export type Logo = {
  name: string;
  image?: string;
  url?: string;
  order: number;
};
export type Portfolio = {
  name: string;
  demo: boolean;
  description: string;
  roles: string;
  email: string;
  socials: { name: string; url: string }[];
  works: Work[];
  logos: Logo[];
};
export const demoContent: Portfolio = fallback;
export function safeLink(value: string | undefined) {
  return value && /^https:\/\//i.test(value) ? value : undefined;
}
export function videoSource(work: Work) {
  return work.muxPlaybackId
    ? `https://stream.mux.com/${encodeURIComponent(work.muxPlaybackId)}.m3u8`
    : work.src || '';
}
export function posterSource(work: Work) {
  return (
    work.poster ||
    (work.muxPlaybackId
      ? `https://image.mux.com/${encodeURIComponent(work.muxPlaybackId)}/thumbnail.jpg?width=1000&time=${work.previewStart || 1}`
      : '')
  );
}
export async function getContent(): Promise<Portfolio> {
  const project = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  if (!project) return demoContent;
  if (!/^[a-z0-9-]+$/.test(project) || !/^[a-z0-9_-]+$/.test(dataset))
    throw new Error('Invalid CMS configuration');
  const query = `*[_type=="portfolio"][0]{name,demo,description,roles,email,socials,"works":works[]{"id":_key,title,client,kind,order,"poster":poster.asset->url,src,muxPlaybackId,previewStart,duration,demo,"captions":captions.asset->url},"logos":logos[]{name,"image":image.asset->url,url,order}}`;
  const response = await fetch(
    `https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}?perspective=published&query=${encodeURIComponent(query)}`,
    { cache: 'no-store', signal: AbortSignal.timeout(6000) },
  );
  if (!response.ok) throw new Error('CMS unavailable');
  const { result } = (await response.json()) as { result: Portfolio | null };
  if (
    !result ||
    !result.name ||
    !Array.isArray(result.works) ||
    !Array.isArray(result.logos)
  )
    throw new Error('Publish a portfolio in Sanity');
  return {
    ...result,
    email: result.email || '',
    socials: result.socials || [],
    description: result.description || '',
    roles: result.roles || '',
  };
}
