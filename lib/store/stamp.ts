import 'server-only';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

export type Buyer = { email: string; orderNo: string; date: string };

const clean = (s: string) => s.replace(/[\r\n]/g, ' ');

// .cube LUTs: comment lines (#) are part of the format and every editor
// skips them, so the stamp goes at the very top. Data lines stay untouched.
export function stampCube(text: string, b: Buyer) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return (
    [
      `# Licensed to: ${clean(b.email)}`,
      `# Order: ${b.orderNo} (${b.date})`,
      '# Personal license, do not share. SMOLIN.FX',
    ].join(eol) +
    eol +
    body
  );
}

// Lightroom / Camera Raw .xmp presets are XML: a comment after the XML
// declaration (or at the top) is ignored by Adobe apps.
export function stampXmp(text: string, b: Buyer) {
  const note = `<!-- Licensed to: ${clean(b.email)} | Order: ${b.orderNo} (${b.date}) | Personal license, do not share. SMOLIN.FX -->`;
  const decl = /^\s*<\?xml[^>]*\?>/.exec(text);
  return decl
    ? `${decl[0]}\n${note}${text.slice(decl[0].length)}`
    : `${note}\n${text}`;
}

// Old Lightroom .lrtemplate presets are Lua: "--" starts a comment.
export function stampLrtemplate(text: string, b: Buyer) {
  return `-- Licensed to: ${clean(b.email)} | Order: ${b.orderNo} (${b.date})\n${text}`;
}

export function licenseNote(b: Buyer, product: string) {
  return [
    `${product}`,
    '',
    `Licensed to: ${b.email}`,
    `Order: ${b.orderNo}`,
    `Date: ${b.date}`,
    '',
    'Personal license. You may use these files in your own projects,',
    'including paid work for clients. You may not share, resell or publish',
    'the files or the download link. Full terms: https://smolinfx.com/license',
    '',
    'Лицензия личная. Файлы можно использовать в своих проектах, в том числе',
    'в коммерческих. Нельзя передавать, перепродавать или публиковать файлы',
    'и ссылку на скачивание. Условия: https://smolinfx.com/license',
  ].join('\r\n');
}

function stampText(name: string, data: Uint8Array, b: Buyer) {
  const lower = name.toLowerCase();
  const kind = lower.endsWith('.cube')
    ? stampCube
    : lower.endsWith('.xmp')
      ? stampXmp
      : lower.endsWith('.lrtemplate')
        ? stampLrtemplate
        : null;
  return kind ? strToU8(kind(strFromU8(data), b)) : data;
}

// Returns the marked file. Zips get LICENSE.txt inside, and every LUT or
// preset inside them gets the same stamp. Other formats go out unchanged
// (they are still marked by the download file name).
export function stampFile(
  name: string,
  data: Uint8Array,
  b: Buyer,
  product: string,
) {
  if (!name.toLowerCase().endsWith('.zip')) return stampText(name, data, b);
  const entries = unzipSync(data);
  const out: Zippable = {};
  for (const [path, content] of Object.entries(entries)) {
    // Folders are recreated from the file paths, so plain folder entries are skipped.
    if (path.startsWith('__MACOSX/') || path.endsWith('/')) continue;
    out[path] = stampText(path, content, b);
  }
  out['LICENSE.txt'] = strToU8(licenseNote(b, product));
  return zipSync(out, { level: 6 });
}

// "Film Pack.zip" -> "Film Pack_SF-7K3QXP.zip"
export function markedName(name: string, orderNo: string) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return `${base}_${orderNo}${ext}`;
}
