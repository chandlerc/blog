// In-page structural probe.
//
// Pixels tell you *that* two renderings differ; they are bad at telling you
// what broke. A sub-pixel layout shift near the top of a page repaints every
// glyph below it and reads as thousands of scattered "font artifacts". These
// probes answer the questions the pixels can't: did the webfonts actually
// apply, is this the same image, and which element moved first.

const MAX_LAYOUT_ELEMENTS = 4000;

// Elements that never paint. Including them adds noise and, for the dev-only
// livereload script tag, a guaranteed false positive.
const NON_VISUAL_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'NOSCRIPT',
  'TEMPLATE',
  'TITLE',
  'BASE',
]);

function probeInPage(config) {
  const { nonVisualTags, origin } = config;
  const skip = new Set(nonVisualTags);

  // FNV-1a. crypto.subtle is unavailable over plain http (staging), and these
  // hashes only ever need to be compared against each other.
  const fnv1a = (bytes) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  };

  const measureText = (family) => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `32px "${family}"`;
    return ctx.measureText('Handgloves 0123 mmiill').width;
  };

  // A family that cannot exist, so its measurement is the fallback baseline.
  const fallbackWidth = measureText('__site_diff_absent_family__');

  const families = [
    ...new Set([...document.fonts.values()].map((face) => face.family)),
  ].sort();
  const fonts = {
    faces: [...document.fonts.values()]
      .map(
        (face) => `${face.family}|${face.style}|${face.weight}|${face.status}`
      )
      .sort(),
    applied: families.map((family) => {
      const width = measureText(family);
      return {
        family,
        width: width.toFixed(3),
        // Equal to the fallback measurement means the custom face is declared
        // but not actually being used to shape text.
        usingFallback: Math.abs(width - fallbackWidth) < 0.01,
      };
    }),
    fallbackWidth: fallbackWidth.toFixed(3),
  };

  // The parts of <head> whose loss breaks something concrete. Everything else
  // there legitimately differs between a development and a production build.
  const head = {};
  const relative = (value) => {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin
        ? url.pathname + url.search
        : url.href;
    } catch {
      return value;
    }
  };
  for (const rel of [
    'canonical',
    'alternate',
    'icon',
    'apple-touch-icon',
    'manifest',
    'mask-icon',
  ]) {
    const found = [...document.querySelectorAll(`link[rel~="${rel}"]`)]
      .map((el) =>
        [relative(el.getAttribute('href') || ''), el.type, el.sizes?.value]
          .filter(Boolean)
          .join(' ')
      )
      .sort();
    if (found.length) head[`link[rel=${rel}]`] = found.join(', ');
  }
  for (const name of ['viewport', 'robots', 'theme-color']) {
    const el = document.querySelector(`meta[name="${name}"]`);
    if (el) head[`meta[${name}]`] = el.content;
  }
  head.charset = document.characterSet;

  // What the CSS actually asks for, as opposed to what loaded. A stylesheet
  // that stops naming the custom families renders in fallback even though every
  // @font-face is present and "loaded".
  const usedFamilies = {};
  for (const el of document.body.querySelectorAll('*')) {
    if (skip.has(el.tagName) || !el.firstChild) continue;
    const family = getComputedStyle(el).fontFamily;
    usedFamilies[family] = (usedFamilies[family] || 0) + 1;
  }

  const absolute = (value) => {
    try {
      return new URL(value, location.href).href;
    } catch {
      return '';
    }
  };
  const parseSrcset = (value) =>
    (value || '')
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
  const ancestorSources = (img) => {
    const picture = img.closest('picture');
    return picture ? [...picture.querySelectorAll('source')] : [];
  };

  const seenImages = new Set();
  const variants = new Set();
  const images = [];
  for (const img of document.images) {
    const src = img.currentSrc || img.src;
    if (!src) {
      images.push({
        src: '(no src)',
        natural: '0x0',
        rendered: '',
        broken: true,
        alt: img.alt || '',
        absolute: '',
      });
      continue;
    }
    const rect = img.getBoundingClientRect();
    // Images from other hosts (GitHub avatars in a couple of decks) are blocked
    // for determinism, so they are legitimately unloaded here. Their URLs are
    // still compared, both below and as part of the third-party URL set.
    const external = !src.startsWith(`${origin}/`) && !src.startsWith('data:');
    images.push({
      src: (() => {
        try {
          const parsed = new URL(src, location.href);
          return external ? parsed.origin + parsed.pathname : parsed.pathname;
        } catch {
          return src;
        }
      })(),
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
      rendered: `${rect.width.toFixed(3)}x${rect.height.toFixed(3)}`,
      broken: img.complete && img.naturalWidth === 0,
      external,
      alt: img.alt || '',
      absolute: src,
    });
    if (!external) seenImages.add(src);

    // Every candidate, not just the one this viewport happens to pick. A
    // responsive image ships five or six variants and only the 720w one is
    // selected at 1280px and DPR 1, so the rest are never rendered here and a
    // break in them is invisible to both the pixels and the checks above.
    for (const source of [img, ...ancestorSources(img)]) {
      for (const candidate of parseSrcset(source.getAttribute('srcset'))) {
        const url = absolute(candidate);
        if (url && url.startsWith(`${origin}/`)) {
          seenImages.add(url);
          variants.add(url);
        }
      }
    }
  }

  return Promise.all(
    [...seenImages].map(async (src) => {
      try {
        const response = await fetch(src, { cache: 'force-cache' });
        if (!response.ok) return [src, `HTTP ${response.status}`];
        return [src, fnv1a(new Uint8Array(await response.arrayBuffer()))];
      } catch (err) {
        return [src, `ERR ${err.name}`];
      }
    })
  ).then((hashes) => {
    const byUrl = new Map(hashes);
    for (const image of images) image.hash = byUrl.get(image.absolute) || 'n/a';
    return {
      title: document.title,
      lang: document.documentElement.lang || '',
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      head,
      fonts,
      usedFamilies,
      images,
      // Keyed by URL rather than by element: these are never rendered at this
      // viewport, so there is no box to attach them to.
      variants: Object.fromEntries(
        [...variants]
          .sort()
          .map((url) => [url.slice(origin.length), byUrl.get(url) || 'n/a'])
      ),
      // innerText reflects what is actually visible, so it ignores the
      // production-only metadata in <head> and any display:none content.
      text: document.body.innerText.replace(/[ \t]+/g, ' ').trim(),
    };
  });
}

export async function probePage(page, origin) {
  return page.evaluate(probeInPage, {
    nonVisualTags: [...NON_VISUAL_TAGS],
    origin,
  });
}

// Element geometry under some root, plus the two things that change nothing
// visually: where an element points, and what it is called.
//
// One walker, used for whole pages and for a single slide. It used to be two
// near-copies, which had already drifted -- the slide version omitted
// `transform` from `paint`, so a deck's transform change was invisible where a
// page's was not.
function walkInPage(config) {
  const { rootSelector, nonVisualTags, maxLayoutElements, origin } = config;
  const skip = new Set(nonVisualTags);
  const root = rootSelector
    ? document.querySelector(rootSelector)
    : document.body;
  const layout = [];
  if (!root) return { layout, truncated: false };

  const relative = (value) => {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin
        ? url.pathname + url.search
        : url.href;
    } catch {
      return value;
    }
  };
  // Share links carry the page's own URL percent-encoded inside a query
  // parameter of a third-party href, so stripping only bare origins would leave
  // every one of them differing between the two origins by construction.
  const originPattern = new RegExp(
    [origin, encodeURIComponent(origin)]
      .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'gi'
  );
  const linkTarget = (el) => {
    const attr =
      { A: 'href', AREA: 'href', FORM: 'action' }[el.tagName] ||
      (el.hasAttribute('src') ? 'src' : null);
    if (!attr) return '';
    const value = el.getAttribute(attr);
    if (value === null) return '';
    return `${attr}=${relative(value).replace(originPattern, '')}`;
  };

  let truncated = false;
  const walk = (el, path) => {
    if (layout.length >= maxLayoutElements) {
      truncated = true;
      return;
    }
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    layout.push({
      path,
      tag: el.tagName,
      id: el.id || '',
      cls:
        typeof el.className === 'string'
          ? el.className.trim().slice(0, 80)
          : '',
      // Fractional values on purpose: a 0.33px shift is exactly the kind of
      // root cause that repaints a whole page.
      rect: [rect.x, rect.y, rect.width, rect.height]
        .map((n) => n.toFixed(3))
        .join(','),
      link: linkTarget(el),
      font: [
        style.fontFamily,
        style.fontSize,
        style.fontWeight,
        style.fontStyle,
        style.fontVariationSettings,
        style.letterSpacing,
        style.lineHeight,
      ].join('|'),
      paint: [
        style.color,
        style.backgroundColor,
        style.opacity,
        style.transform,
      ].join('|'),
    });
    // Numbered over the children actually walked. Counting skipped ones would
    // renumber every later sibling when a <script> is added or removed,
    // reporting the whole subtree as restructured.
    let index = 0;
    for (const child of el.children) {
      if (skip.has(child.tagName)) continue;
      walk(child, `${path}/${child.tagName}[${index++}]`);
    }
  };
  // From <body>: the rest of <head> legitimately differs, since OpenGraph and
  // schema.org tags are emitted only in production builds. The entries that
  // matter are compared through the allowlist in probePage.
  walk(root, rootSelector ? 'slide' : 'body');
  return { layout, truncated };
}

export async function probeLayout(page, origin, { rootSelector = '' } = {}) {
  return page.evaluate(walkInPage, {
    rootSelector,
    nonVisualTags: [...NON_VISUAL_TAGS],
    maxLayoutElements: MAX_LAYOUT_ELEMENTS,
    origin,
  });
}

// Reveal marks both a vertical stack and its current child as `.present`, and
// querySelector returns the stack; this asks reveal which slide is on screen.
export async function probeCurrentSlide(page, origin) {
  const selector = await page.evaluate(() => {
    const slide =
      typeof Reveal !== 'undefined' && Reveal.getCurrentSlide
        ? Reveal.getCurrentSlide()
        : null;
    if (!slide) return '.reveal .slides section.present';
    slide.dataset.siteDiffSlide = '1';
    return '[data-site-diff-slide]';
  });
  const { layout } = await probeLayout(page, origin, {
    rootSelector: selector,
  });
  return layout;
}
