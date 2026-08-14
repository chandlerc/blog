// Finding the subresources a document pulls in, and where to edit them.
//
// Subresources are what a browser fetches to render the page. Hyperlinks are
// not: an archived page still points at the live site for navigation, its
// canonical URL, and feed autodiscovery, which all have to keep moving.
//
// Each reference carries the offsets of its URL, so freezing a page edits a
// handful of them in place and leaves the other bytes as Hugo emitted them.

/** Attributes that are a subresource whatever element they appear on. */
const RESOURCE_ATTRS = new Set([
  'src',
  'poster',
  'data-src',
  // reveal.js resolves these itself once the deck is running, so they never
  // appear as ordinary element attributes in a rendered DOM.
  'data-background-image',
  'data-background-video',
]);

/** `rel` values that make a `<link href>` something the browser fetches. */
const RESOURCE_RELS = new Set([
  'stylesheet',
  'icon',
  'shortcut',
  'apple-touch-icon',
  'apple-touch-icon-precomposed',
  'mask-icon',
  'manifest',
  'preload',
  'modulepreload',
  'prefetch',
]);

/** Elements whose content is text, not markup. */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

const SPACE = new Set([' ', '\t', '\n', '\r', '\f']);

export function decodeEntities(text) {
  return text.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(amp|lt|gt|quot|apos|nbsp));/g,
    (match, dec, hex, name) => {
      if (dec) return String.fromCodePoint(Number(dec));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[
        name
      ];
    }
  );
}

/** Escape a URL for use in a quoted attribute value. */
export function encodeAttribute(url) {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function* elements(text) {
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) return;
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    const open = /^<([a-zA-Z][-a-zA-Z0-9:]*)/.exec(text.slice(lt, lt + 64));
    if (!open) {
      i = lt + 1;
      continue;
    }
    // Walk to the closing `>`, stepping over it inside quoted values.
    let end = lt + open[0].length;
    let quote = null;
    while (end < text.length) {
      const c = text[end];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      end++;
    }
    const name = open[1].toLowerCase();
    yield { name, attrsStart: lt + open[0].length, attrsEnd: end };
    i = end + 1;
    // Skip the body of a raw text element, so markup quoted inside a script
    // cannot be mistaken for markup of its own.
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}[\\s>]`, 'i').exec(text.slice(i));
      if (close) i += close.index + close[0].length;
    }
  }
}

function attributes(text, start, limit) {
  const attrs = [];
  let i = start;
  while (i < limit) {
    while (i < limit && (SPACE.has(text[i]) || text[i] === '/')) i++;
    const nameStart = i;
    while (
      i < limit &&
      !SPACE.has(text[i]) &&
      text[i] !== '=' &&
      text[i] !== '/'
    )
      i++;
    const name = text.slice(nameStart, i).toLowerCase();
    if (!name) {
      i++;
      continue;
    }
    let after = i;
    while (after < limit && SPACE.has(text[after])) after++;
    if (text[after] !== '=') {
      attrs.push({ name, value: '', start: i, end: i });
      continue;
    }
    i = after + 1;
    while (i < limit && SPACE.has(text[i])) i++;
    let valueStart, valueEnd;
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      valueStart = ++i;
      while (i < limit && text[i] !== quote) i++;
      valueEnd = i;
      i++;
    } else {
      valueStart = i;
      while (i < limit && !SPACE.has(text[i])) i++;
      valueEnd = i;
    }
    attrs.push({
      name,
      value: text.slice(valueStart, valueEnd),
      start: valueStart,
      end: valueEnd,
    });
  }
  return attrs;
}

/** Split a `srcset` into candidates, keeping each URL's offset. */
function srcsetUrls(value, offset) {
  const refs = [];
  for (const match of value.matchAll(/[^\s,][^,]*/g)) {
    const candidate = match[0];
    const url = /^\s*(\S+)/.exec(candidate);
    if (!url) continue;
    const start = offset + match.index + url[0].length - url[1].length;
    refs.push({ url: url[1], start, end: start + url[1].length });
  }
  return refs;
}

function isFetchable(url) {
  return (
    url.trim() !== '' &&
    !url.startsWith('#') &&
    !url.startsWith('data:') &&
    !url.startsWith('about:') &&
    !url.startsWith('javascript:')
  );
}

/**
 * Every subresource reference in an HTML or SVG document, as
 * `{url, start, end}` where the offsets bound the raw URL text.
 */
export function scanMarkup(text) {
  const refs = [];
  const add = (raw, start, end) => {
    const url = decodeEntities(raw).trim();
    if (isFetchable(url)) refs.push({ url, start, end });
  };
  for (const element of elements(text)) {
    const attrs = attributes(text, element.attrsStart, element.attrsEnd);
    const rel = new Set(
      (attrs.find((a) => a.name === 'rel')?.value || '')
        .toLowerCase()
        .split(/\s+/)
    );
    for (const attr of attrs) {
      if (!attr.value) continue;
      if (attr.name === 'srcset') {
        for (const part of srcsetUrls(attr.value, attr.start))
          add(part.url, part.start, part.end);
      } else if (attr.name === 'style') {
        for (const part of scanCss(attr.value))
          add(part.url, attr.start + part.start, attr.start + part.end);
      } else if (
        RESOURCE_ATTRS.has(attr.name) ||
        (element.name === 'object' && attr.name === 'data') ||
        (element.name === 'link' &&
          attr.name === 'href' &&
          [...rel].some((r) => RESOURCE_RELS.has(r))) ||
        // SVG paints raster content through `href` on these elements.
        (['image', 'use', 'feimage'].includes(element.name) &&
          (attr.name === 'href' || attr.name === 'xlink:href'))
      ) {
        add(attr.value, attr.start, attr.end);
      }
    }
  }
  return refs.sort((a, b) => a.start - b.start);
}

/** Every `url()` and `@import` target in a stylesheet. */
export function scanCss(text) {
  const refs = [];
  const add = (raw, start, end) => {
    const url = raw.trim();
    if (isFetchable(url)) refs.push({ url, start, end });
  };
  for (const match of text.matchAll(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*?))\s*\)/g
  )) {
    const value = match[1] ?? match[2] ?? match[3];
    const start = match.index + match[0].indexOf(value, 4);
    add(value, start, start + value.length);
  }
  for (const match of text.matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/g)) {
    const value = match[1] ?? match[2];
    const start = match.index + match[0].indexOf(value, 7);
    add(value, start, start + value.length);
  }
  return refs.sort((a, b) => a.start - b.start);
}

/** Replace reference URLs in `text`, given `[{start, end, replacement}]`. */
export function rewrite(text, edits) {
  let out = '';
  let cursor = 0;
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    if (edit.start < cursor) throw new Error('overlapping rewrites');
    out += text.slice(cursor, edit.start) + edit.replacement;
    cursor = edit.end;
  }
  return out + text.slice(cursor);
}
