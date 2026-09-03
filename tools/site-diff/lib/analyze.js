// Turning two captures into findings.
//
// The pixel diff is deliberately zero-tolerance: capture.js makes identical
// content produce identical bytes, so any tolerance would only hide real
// changes. What keeps reports readable is attribution: saying why a region
// differs, and collapsing a page-wide repaint caused by one shifted element
// into the single finding that explains it.

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

import { diffLines } from './linediff.js';
import { finding } from './findings.js';

// --- pixels ------------------------------------------------------------------

// Rows of an image, as slices that can be compared with memcmp. Finding which
// rows differ does not need a hash, and hashing every byte in JS measured 36x
// slower than Buffer.compare on the same pair.
function rowSlicer(png) {
  const stride = png.width * 4;
  return (y) => png.data.subarray(y * stride, (y + 1) * stride);
}

function differingRows(a, b, height) {
  const rowA = rowSlicer(a);
  const rowB = rowSlicer(b);
  const rows = [];
  for (let y = 0; y < height; y++) {
    if (Buffer.compare(rowA(y), rowB(y)) !== 0) rows.push(y);
  }
  return rows;
}

const MAX_SHIFT_SEARCH = 64;

// A band whose every row is uniform carries no positional information: a run of
// blank rows matches a run of blank rows at any offset, so "it matches 10px up"
// would be true of content that was added rather than moved.
function isFeatureless(row, start, end) {
  const first = row(start);
  for (let y = start + 1; y <= end; y++) {
    if (Buffer.compare(row(y), first) !== 0) return false;
  }
  return true;
}

// A contiguous run of differing rows that reappears intact at some offset is
// content that moved, not content that changed. Saying so is what keeps one
// inserted paragraph from reading as a rewrite of everything below it.
//
// Two ways to get this wrong, both of which this has to avoid. Requiring every
// row of the band to have a counterpart rejects the common case outright, since
// displaced content runs to the bottom edge and its tail has nowhere to land --
// rows that fall outside the image are unknown, not mismatched. Accepting any
// offset that matches, on the other hand, calls a block added to a blank region
// a displacement, because blank matches blank anywhere.
function detectShift(a, b, height, start, end) {
  const rowA = rowSlicer(a);
  const rowB = rowSlicer(b);
  if (isFeatureless(rowA, start, end) || isFeatureless(rowB, start, end)) {
    return null;
  }

  for (let dy = 1; dy <= MAX_SHIFT_SEARCH; dy++) {
    for (const offset of [dy, -dy]) {
      let compared = 0;
      let matched = true;
      for (let y = start; y <= end && matched; y++) {
        const other = y + offset;
        if (other < 0 || other >= height) continue;
        compared++;
        matched = Buffer.compare(rowA(y), rowB(other)) === 0;
      }
      // One row agreeing proves nothing, and a band shorter than the offset
      // itself cannot distinguish a shift from a coincidence.
      if (matched && compared >= Math.max(2, dy)) return offset;
    }
  }
  return null;
}

export function comparePixels(bufferA, bufferB) {
  const a = PNG.sync.read(bufferA);
  const b = PNG.sync.read(bufferB);
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const result = {
    sizeA: `${a.width}x${a.height}`,
    sizeB: `${b.width}x${b.height}`,
    sizeMismatch: a.width !== b.width || a.height !== b.height,
    width,
    height,
    changed: 0,
    structural: 0,
    bands: [],
  };

  // Crop to the shared region so a height change doesn't report every pixel as
  // different; the size mismatch itself is reported separately.
  const cropA = result.sizeMismatch ? cropRegion(a, 0, height, width) : a;
  const cropB = result.sizeMismatch ? cropRegion(b, 0, height, width) : b;

  const diff = new PNG({ width, height });
  result.changed = pixelmatch(
    cropA.data,
    cropB.data,
    diff.data,
    width,
    height,
    {
      threshold: 0,
      includeAA: true,
    }
  );
  // Nothing renders these when there is nothing to show, and a pair of decoded
  // full-page images is 200MB on the tallest page here.
  if (result.changed === 0)
    return { ...result, images: { a: null, b: null, diff: null } };

  // Same comparison ignoring antialiasing-only pixels. Not used to pass or fail
  // anything -- it just says how much of a diff is edge shading.
  result.structural = pixelmatch(cropA.data, cropB.data, null, width, height, {
    threshold: 0.1,
    includeAA: false,
  });

  // Group differing rows into bands, tolerating small identical gaps so one
  // paragraph doesn't become twenty findings.
  const GAP = 8;
  for (const y of differingRows(cropA, cropB, height)) {
    const last = result.bands[result.bands.length - 1];
    if (last && y - last.end <= GAP) last.end = y;
    else result.bands.push({ start: y, end: y });
  }

  for (const band of result.bands) {
    band.shift = detectShift(cropA, cropB, height, band.start, band.end);
  }

  return { ...result, images: { a: cropA, b: cropB, diff } };
}

const CROP_CONTEXT = 120;
const MAX_CROP_HEIGHT = 2400;

// The slice of a tall page worth keeping: the differing bands plus context.
// A page whose diffs are spread top to bottom just gets the whole thing,
// capped.
export function cropWindow(bands, height) {
  if (!bands.length)
    return { top: 0, height: Math.min(height, MAX_CROP_HEIGHT) };
  const top = Math.max(
    0,
    Math.min(...bands.map((b) => b.start)) - CROP_CONTEXT
  );
  const bottom = Math.min(
    height,
    Math.max(...bands.map((b) => b.end)) + CROP_CONTEXT
  );
  return { top, height: Math.min(bottom - top, MAX_CROP_HEIGHT) };
}

export function cropRegion(png, top, height, width = png.width) {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    const sourceY = top + y;
    if (sourceY >= png.height) break;
    png.data.copy(
      out.data,
      y * width * 4,
      sourceY * png.width * 4,
      sourceY * png.width * 4 + width * 4
    );
  }
  return out;
}

// --- structure ---------------------------------------------------------------

function compareFonts(a, b, usedA, usedB, findings) {
  // A face is identified by family/style/weight; its load status is a separate
  // question and reporting them together turns one broken font into two
  // confusing findings about "different" face sets.
  const identity = (face) => face.slice(0, face.lastIndexOf('|'));
  const setA = new Set(a.faces.map(identity));
  const setB = new Set(b.faces.map(identity));
  const onlyA = [...setA].filter((face) => !setB.has(face));
  const onlyB = [...setB].filter((face) => !setA.has(face));
  if (onlyA.length || onlyB.length) {
    findings.push(
      finding(
        'critical',
        'font',
        `Declared @font-face set differs (${onlyA.length} only in source, ${onlyB.length} only in target)`,
        [
          ...onlyA.map((f) => `source only: ${f}`),
          ...onlyB.map((f) => `target only: ${f}`),
        ].join('\n')
      )
    );
  }

  // A face that fails to load on both origins is a site bug, not a difference
  // between them, and reporting it per side per page buries whatever did
  // change. Only the asymmetry belongs in a comparison.
  const unloadedA = new Set(
    a.faces.filter((face) => !face.endsWith('|loaded'))
  );
  const unloadedB = new Set(
    b.faces.filter((face) => !face.endsWith('|loaded'))
  );
  for (const [side, mine, theirs] of [
    ['source', unloadedA, unloadedB],
    ['target', unloadedB, unloadedA],
  ]) {
    const oneSided = [...mine].filter((face) => !theirs.has(face));
    if (oneSided.length) {
      findings.push(
        finding(
          'critical',
          'font',
          `${oneSided.length} font face(s) load on the other origin but not on ${side}`,
          oneSided.join('\n')
        )
      );
    }
  }

  // Every font stack the page's own CSS resolves to. A stack that disappears
  // from most of the page is a stylesheet regression; a stack that appears on a
  // handful of elements is usually just different content, which the text and
  // layout comparisons already report.
  const totalElements = (used) =>
    Object.values(used).reduce((sum, count) => sum + count, 0);
  const share = (stack, used) =>
    (used[stack] || 0) / Math.max(1, totalElements(used));
  const SUBSTANTIAL = 0.1;

  const stacksA = new Set(Object.keys(usedA));
  const stacksB = new Set(Object.keys(usedB));
  const stackOnlyA = [...stacksA].filter((stack) => !stacksB.has(stack));
  const stackOnlyB = [...stacksB].filter((stack) => !stacksA.has(stack));
  if (stackOnlyA.length || stackOnlyB.length) {
    const substantial =
      stackOnlyA.some((stack) => share(stack, usedA) >= SUBSTANTIAL) ||
      stackOnlyB.some((stack) => share(stack, usedB) >= SUBSTANTIAL);
    findings.push(
      finding(
        substantial ? 'critical' : 'minor',
        'font',
        `Rendered font stacks differ (${stackOnlyA.length} only in source, ${stackOnlyB.length} only in target)`,
        (substantial
          ? `A stack covering a substantial share of the page resolves differently, ` +
            `so text is being shaped with different fonts.\n`
          : `Only a few elements are involved, so this is more likely a content ` +
            `difference than a stylesheet regression.\n`) +
          [
            ...stackOnlyA.map(
              (stack) => `source only (${usedA[stack]} el): ${stack}`
            ),
            ...stackOnlyB.map(
              (stack) => `target only (${usedB[stack]} el): ${stack}`
            ),
          ].join('\n')
      )
    );
  }

  const appliedB = new Map(b.applied.map((entry) => [entry.family, entry]));
  for (const entry of a.applied) {
    const other = appliedB.get(entry.family);
    if (!other) continue;
    if (entry.usingFallback !== other.usingFallback) {
      const lost = entry.usingFallback ? 'source' : 'target';
      findings.push(
        finding(
          'critical',
          'font',
          `Custom font "${entry.family}" is not being applied on ${lost}`,
          `Text shaped with "${entry.family}" measures the same as the fallback font on ${lost}, ` +
            `so the webfont is declared but not in use.\n` +
            `  source ${entry.width}px (fallback ${a.fallbackWidth}px)\n` +
            `  target ${other.width}px (fallback ${b.fallbackWidth}px)`
        )
      );
    } else if (entry.width !== other.width) {
      findings.push(
        finding(
          'major',
          'font',
          `Custom font "${entry.family}" shapes text differently`,
          `A probe string measures ${entry.width}px on source and ${other.width}px on target, ` +
            `so the two origins are serving different font data.`
        )
      );
    }
  }
}

function compareImages(a, b, findings) {
  // Third-party images are blocked on purpose, so "did not load" says nothing.
  const broken = [
    ...a.filter((i) => i.broken && !i.external).map((i) => ['source', i]),
    ...b.filter((i) => i.broken && !i.external).map((i) => ['target', i]),
  ];
  for (const [side, image] of broken) {
    findings.push(
      finding(
        'critical',
        'image',
        `Image failed to load on ${side}: ${image.src}`,
        image.absolute
      )
    );
  }

  // Pair by src, not by position. An image added near the top of a page shifts
  // every later index, and pairing by index would turn that into one finding
  // per image for the whole rest of the page.
  const index = (images) => {
    const byUrl = new Map();
    images.forEach((image) => {
      const bucket = byUrl.get(image.src);
      if (bucket) bucket.push(image);
      else byUrl.set(image.src, [image]);
    });
    return byUrl;
  };
  const indexA = index(a);
  const indexB = index(b);

  const onlyA = [];
  for (const [src, bucket] of indexA) {
    const other = indexB.get(src);
    if (!other) {
      onlyA.push(bucket[0]);
      continue;
    }
    if (bucket.length !== other.length) {
      findings.push(
        finding(
          'major',
          'image',
          `Image used ${bucket.length} time(s) on source, ${other.length} on target: ${src}`,
          ''
        )
      );
    }
    compareImagePair(bucket[0], other[0], findings);
  }
  const onlyB = [...indexB.entries()]
    .filter(([src]) => !indexA.has(src))
    .map(([, bucket]) => bucket[0]);

  // Whatever did not pair by URL gets a second chance to pair by content. An
  // image that merely moved to a new path is not a difference a reader can
  // see, so it earns the same checks a URL-paired image gets and nothing more.
  const unmatchedB = new Map();
  for (const image of onlyB) {
    if (!isHash(image.hash)) continue;
    const bucket = unmatchedB.get(image.hash);
    if (bucket) bucket.push(image);
    else unmatchedB.set(image.hash, [image]);
  }
  const paired = new Set();
  for (const image of onlyA) {
    const match = isHash(image.hash) && unmatchedB.get(image.hash)?.shift();
    if (match) {
      paired.add(match);
      compareImagePair(image, match, findings);
      continue;
    }
    findings.push(
      finding(
        'major',
        'image',
        `Image only on source: ${image.src}`,
        image.absolute
      )
    );
  }
  for (const image of onlyB) {
    if (paired.has(image)) continue;
    findings.push(
      finding(
        'major',
        'image',
        `Image only on target: ${image.src}`,
        image.absolute
      )
    );
  }
}

// The probe reports a failed fetch in place of a hash. That is not evidence
// about the bytes, and comparing it as though it were turns one flaky request
// into "the bytes served at this path are not the same".
const isHash = (value) => /^[0-9a-f]{8}$/.test(value || '');

function compareImagePair(x, y, findings) {
  if (x.alt !== y.alt) {
    findings.push(
      finding(
        'major',
        'image',
        `Image alt text differs: ${x.src}`,
        `source ${JSON.stringify(x.alt)}\ntarget ${JSON.stringify(y.alt)}`
      )
    );
  }
  // A blocked third-party image has no bytes to hash and no intrinsic size on
  // either side; matching URLs is all the comparison there is.
  if (x.external) return;

  if (!isHash(x.hash) || !isHash(y.hash)) {
    if (x.hash !== y.hash) {
      findings.push(
        finding(
          'minor',
          'image',
          `Could not verify image bytes: ${x.src}`,
          `source ${x.hash}\ntarget ${y.hash}\n` +
            `One origin did not return the image to an in-page fetch, so its ` +
            `content was not compared.`
        )
      );
    }
  } else if (x.hash !== y.hash) {
    findings.push(
      finding(
        'critical',
        'image',
        `Image content differs: ${x.src}`,
        `The bytes served at this path are not the same.\n` +
          `  source ${x.natural} hash ${x.hash}\n  target ${y.natural} hash ${y.hash}`
      )
    );
    return;
  }

  if (x.natural !== y.natural) {
    findings.push(
      finding(
        'major',
        'image',
        `Image intrinsic size differs: ${x.src}`,
        `source ${x.natural}, target ${y.natural}`
      )
    );
  } else if (x.rendered !== y.rendered) {
    findings.push(
      finding(
        'minor',
        'image',
        `Image rendered size differs: ${x.src}`,
        `source ${x.rendered}, target ${y.rendered} -- a sub-pixel difference here shifts ` +
          `everything below it and repaints the rest of the page.`
      )
    );
  }
}

// srcset candidates this viewport did not select. They are fetched and hashed
// but never rendered, so this is the only check they get.
function compareVariants(a = {}, b = {}, findings) {
  const urls = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const hashesA = new Set(Object.values(a).filter(isHash));
  const hashesB = new Set(Object.values(b).filter(isHash));
  const broken = [];
  for (const url of urls) {
    if (a[url] === b[url]) continue;
    // A variant present on one side only, whose bytes the other side serves
    // under some other URL, is a renamed candidate rather than a lost one.
    if (a[url] === undefined && hashesA.has(b[url])) continue;
    if (b[url] === undefined && hashesB.has(a[url])) continue;
    broken.push(
      `${url}\n  source ${a[url] ?? '(absent)'}\n  target ${b[url] ?? '(absent)'}`
    );
  }
  if (!broken.length) return;
  findings.push(
    finding(
      'critical',
      'image',
      `${broken.length} responsive image variant(s) differ`,
      `These are srcset candidates that this viewport does not select, so they ` +
        `never appear in a screenshot. A reader on a phone or a high-DPI screen ` +
        `gets one of them.\n` +
        broken.slice(0, 10).join('\n')
    )
  );
}

// The single most useful thing the tool can say about a page-wide repaint: which
// element actually caused it.
//
// Naively reporting the first diverging element in document order always names
// <body>, because a container's box changes whenever anything inside it does.
// The real cause is the innermost element that changed size while staying put;
// everything after it merely moved.
function compareLayout(a, b, findings) {
  if (!a.length || !b.length) return null;
  const byPath = new Map(b.map((entry) => [entry.path, entry]));
  const pathsA = new Set(a.map((entry) => entry.path));

  const missing = a.filter((entry) => !byPath.has(entry.path));
  const added = b.filter((entry) => !pathsA.has(entry.path));
  if (missing.length || added.length) {
    findings.push(
      finding(
        'major',
        'layout',
        `DOM structure differs (${missing.length} element(s) only in source, ${added.length} only in target)`,
        [
          ...missing.slice(0, 10).map((e) => `source only: ${describe(e)}`),
          ...added.slice(0, 10).map((e) => `target only: ${describe(e)}`),
        ].join('\n')
      )
    );
  }

  // Where things point and what they are named. Neither moves a pixel, so the
  // screenshot comparison is blind to both: a link can be retargeted, and a
  // heading id renamed out from under every anchor and table-of-contents entry.
  const retargeted = [];
  const renamed = [];
  for (const entry of a) {
    const other = byPath.get(entry.path);
    if (!other) continue;
    if (entry.link !== other.link) retargeted.push({ entry, other });
    if (entry.id !== other.id) renamed.push({ entry, other });
  }
  for (const [list, kind, label] of [
    [retargeted, 'link', 'link target'],
    [renamed, 'layout', 'element id'],
  ]) {
    if (!list.length) continue;
    findings.push(
      finding(
        'major',
        kind,
        `${list.length} ${label}(s) differ`,
        list
          .slice(0, 10)
          .map(
            ({ entry, other }) =>
              `${describe(entry)}\n  source ${entry[kind === 'link' ? 'link' : 'id'] || '(none)'}` +
              `\n  target ${other[kind === 'link' ? 'link' : 'id'] || '(none)'}`
          )
          .join('\n')
      )
    );
  }

  const resized = [];
  const moved = [];
  const restyled = [];
  for (const entry of a) {
    const other = byPath.get(entry.path);
    if (!other) continue;
    if (entry.font !== other.font || entry.paint !== other.paint)
      restyled.push({ entry, other });
    // Numerically, not as strings: the probe formats with toFixed(3), and a
    // rect that rounds to "-0.000" is the same box as one that rounds to
    // "0.000". Comparing the text reports a difference with no delta to show.
    const from = entry.rect.split(',').map(Number);
    const to = other.rect.split(',').map(Number);
    if (from.every((value, i) => value === to[i])) continue;
    if (from[0] === to[0] && from[1] === to[1]) resized.push({ entry, other });
    else moved.push({ entry, other });
  }
  if (!resized.length && !moved.length && !restyled.length) return null;

  // Drop any resized element that contains another resized element: the
  // outer one only grew because the inner one did.
  const innermost = resized.filter(
    ({ entry }) =>
      !resized.some((other) => other.entry.path.startsWith(`${entry.path}/`))
  );
  const cause = innermost[0] || moved[0] || restyled[0];
  const [, causeY] = cause.entry.rect.split(',');

  const deltas = (one, two) => {
    const from = one.split(',').map(Number);
    const to = two.split(',').map(Number);
    return ['x', 'y', 'w', 'h']
      .map((axis, i) =>
        from[i] === to[i]
          ? null
          : `${axis} ${from[i]} → ${to[i]} (${to[i] - from[i] > 0 ? '+' : ''}${(to[i] - from[i]).toFixed(3)})`
      )
      .filter(Boolean)
      .join(', ');
  };

  findings.push(
    finding(
      'major',
      'layout',
      `Layout differs, rooted at ${describe(cause.entry)}`,
      [
        deltas(cause.entry.rect, cause.other.rect) &&
          `  ${deltas(cause.entry.rect, cause.other.rect)}`,
        `${resized.length} element(s) changed size, ${moved.length} moved, ${restyled.length} changed computed style.`,
        moved.length
          ? `Elements below the resized one shift by a fraction of a pixel, which re-rasterizes ` +
            `every glyph past that point. That is what a page-wide "font artifact" diff usually is.`
          : null,
        cause.entry.font !== cause.other.font
          ? `  source style ${cause.entry.font}\n  target style ${cause.other.font}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
  );
  return { y: Number(causeY), element: describe(cause.entry) };
}

function describe(entry) {
  return `<${entry.tag.toLowerCase()}${entry.cls ? ` class="${entry.cls}"` : ''}> at ${entry.path}`;
}

function compareText(a, b, findings) {
  if (a === b) return;
  // Sequence, not set. Comparing sets of lines is blind to both reordering and
  // repetition, so a post list rendered in the wrong order, or a duplicated
  // item with another dropped, would report nothing at all.
  const hunks = diffLines(a.split('\n'), b.split('\n'));
  const removed = hunks.filter((hunk) => hunk[0] === '-').length;
  const added = hunks.filter((hunk) => hunk[0] === '+').length;
  findings.push(
    finding(
      'major',
      'text',
      `Visible text differs (${removed} line(s) removed, ${added} added)`,
      hunks
        .filter((hunk) => hunk[0] !== ' ')
        .slice(0, 30)
        .map(([mark, line]) => `${mark} ${line.slice(0, 160)}`)
        .join('\n')
    )
  );
}

// These messages embed absolute URLs, which differ between the origins by
// construction, so comparing them verbatim can never cancel anything out: the
// same broken asset on both sides would be reported as one-sided on each. Key
// on the message with its origin removed, and keep the original for display.
const withoutOrigin = (entry) => entry.replace(/https?:\/\/[^/\s)]+/g, '');

function compareWatched(a, b, findings) {
  for (const [key, label, severity] of [
    ['failedRequests', 'request(s) failed', 'critical'],
    ['badResponses', 'response(s) returned 4xx/5xx', 'critical'],
    ['consoleErrors', 'console error(s)', 'major'],
  ]) {
    const keysOf = (watched) => new Set(watched[key].map(withoutOrigin));
    const [keysA, keysB] = [keysOf(a), keysOf(b)];
    for (const [side, watched, others] of [
      ['source', a, keysB],
      ['target', b, keysA],
    ]) {
      const unique = watched[key].filter(
        (entry) => !others.has(withoutOrigin(entry))
      );
      if (unique.length) {
        findings.push(
          finding(
            severity,
            'resource',
            `${unique.length} ${label} only on ${side}`,
            unique.slice(0, 20).join('\n')
          )
        );
      }
    }
  }
}

// The page's third-party references are compared even though the requests
// themselves are blocked, so a changed or removed embed is still reported.
function compareThirdParty(a, b, findings) {
  const onlyA = [...a].filter((url) => !b.has(url));
  const onlyB = [...b].filter((url) => !a.has(url));
  if (!onlyA.length && !onlyB.length) return;
  findings.push(
    finding(
      'major',
      'resource',
      `Third-party resources referenced differ (${onlyA.length} only in source, ${onlyB.length} only in target)`,
      [
        ...onlyA.map((url) => `source only: ${url}`),
        ...onlyB.map((url) => `target only: ${url}`),
      ]
        .slice(0, 20)
        .join('\n')
    )
  );
}

// Attribution for a single reveal.js state, using the slide-scoped probe.
export function compareSlideLayout(sourceLayout, targetLayout) {
  const findings = [];
  const layoutCause = compareLayout(sourceLayout, targetLayout, findings);
  return { findings, layoutCause };
}

// The head is compared through an allowlist rather than wholesale. Production
// builds emit OpenGraph, Twitter and schema.org metadata that development
// builds do not, and diffing all of it would bury the entries below -- each of
// which breaks something concrete when it changes: de-indexing the site,
// unsubscribing every feed reader that discovers by page, or handing phones the
// desktop layout.
function compareHead(a, b, iconsA = {}, iconsB = {}, findings) {
  const allHashes = (value) =>
    !!value && value.split(', ').every((hash) => isHash(hash));
  const keys = [
    ...new Set([...Object.keys(a || {}), ...Object.keys(b || {})]),
  ].sort();
  for (const key of keys) {
    if (a?.[key] === b?.[key]) continue;
    // Icons are compared by the bytes they serve, not by their URLs: a
    // renamed icon with identical content changes nothing a reader can see.
    const sameBytes = allHashes(iconsA[key]) && iconsA[key] === iconsB[key];
    if (sameBytes) continue;
    const hashNote =
      iconsA[key] || iconsB[key]
        ? `\nsource bytes ${iconsA[key] || '(none)'}\ntarget bytes ${iconsB[key] || '(none)'}`
        : '';
    findings.push(
      finding(
        'critical',
        'head',
        `${key} differs`,
        `source ${JSON.stringify(a?.[key] ?? null)}\ntarget ${JSON.stringify(b?.[key] ?? null)}` +
          hashNote
      )
    );
  }
}

// Scalars the probe reports about the document as a whole.
function compareDocument(a, b, findings) {
  for (const [field, label, severity] of [
    ['title', '<title>', 'major'],
    ['lang', '<html lang>', 'major'],
  ]) {
    if (a[field] !== b[field]) {
      findings.push(
        finding(
          severity,
          'head',
          `${label} differs`,
          `source ${JSON.stringify(a[field])}\ntarget ${JSON.stringify(b[field])}`
        )
      );
    }
  }
  // Content wider than the viewport is a horizontal scrollbar on someone's
  // phone. The pixel comparison crops to the viewport width and cannot see it.
  if (a.scrollWidth !== b.scrollWidth) {
    findings.push(
      finding(
        'major',
        'layout',
        `Document width differs: ${a.scrollWidth}px on source, ${b.scrollWidth}px on target`,
        'A document wider than the viewport overflows horizontally.'
      )
    );
  }
}

export function compareProbes(source, target) {
  const findings = [];
  if (source.layout.truncated || target.layout.truncated) {
    findings.push(
      finding(
        'info',
        'layout',
        'Layout probe hit its element cap; geometry was only compared for the first part of the page',
        'Pixel comparison still covers the whole page, but the root-cause attribution below may be incomplete.'
      )
    );
  }
  compareDocument(source.probe, target.probe, findings);
  compareHead(
    source.probe.head,
    target.probe.head,
    source.probe.iconHashes,
    target.probe.iconHashes,
    findings
  );
  compareWatched(source.watched, target.watched, findings);
  compareThirdParty(
    source.watched.thirdParty,
    target.watched.thirdParty,
    findings
  );
  compareFonts(
    source.probe.fonts,
    target.probe.fonts,
    source.probe.usedFamilies,
    target.probe.usedFamilies,
    findings
  );
  compareImages(source.probe.images, target.probe.images, findings);
  compareVariants(source.probe.variants, target.probe.variants, findings);
  compareText(source.probe.text, target.probe.text, findings);
  const layoutCause = compareLayout(
    source.layout.layout,
    target.layout.layout,
    findings
  );
  return { findings, layoutCause };
}

// Describe a pixel diff in terms of what the structural probes already
// explained, so a cascade reads as one cause rather than N symptoms.
export function describePixels(pixels, layoutCause) {
  const findings = [];
  if (pixels.sizeMismatch) {
    findings.push(
      finding(
        'major',
        'pixels',
        `Rendered size differs: ${pixels.sizeA} vs ${pixels.sizeB}`,
        'Only the overlapping region was compared.'
      )
    );
  }
  if (pixels.changed === 0) return findings;

  const shifted = pixels.bands.filter((band) => band.shift !== null);
  const total = pixels.width * pixels.height;
  const percent = ((pixels.changed / total) * 100).toFixed(3);

  // A pixel diff is only worth its own finding when nothing else already
  // accounts for it. Downstream of a known layout change, or when every region
  // is just content that moved, it is a symptom rather than a cause.
  const belowDivergence =
    layoutCause &&
    pixels.bands.every((band) => band.start >= layoutCause.y - 2);
  const allDisplaced = shifted.length === pixels.bands.length;

  findings.push(
    finding(
      belowDivergence || allDisplaced ? 'minor' : 'major',
      'pixels',
      `${pixels.changed.toLocaleString()} pixel(s) differ (${percent}%) across ${pixels.bands.length} region(s)`,
      [
        `${pixels.structural.toLocaleString()} remain when antialiasing-only differences are ignored.`,
        shifted.length
          ? `${shifted.length} of ${pixels.bands.length} region(s) are unchanged content displaced vertically ` +
            `(${[...new Set(shifted.map((band) => `${band.shift > 0 ? '+' : ''}${band.shift}px`))].join(', ')}).`
          : null,
        belowDivergence
          ? `Every region starts at or below the layout change at y=${Math.round(layoutCause.y)} ` +
            `(${layoutCause.element}), so this is one layout change repainting the page rather ` +
            `than many independent differences.`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
  );
  return findings;
}
