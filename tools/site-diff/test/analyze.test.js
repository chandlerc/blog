import assert from 'node:assert/strict';
import test from 'node:test';
import { PNG } from 'pngjs';

import {
  comparePixels,
  compareProbes,
  cropWindow,
  describePixels,
} from '../lib/analyze.js';
import { worstSeverity } from '../lib/findings.js';

const WIDTH = 60;

// A page of white with whatever `draw` puts on it.
function page(height, draw) {
  const png = new PNG({ width: WIDTH, height });
  png.data.fill(255);
  draw((x, y, value) => {
    if (y < 0 || y >= height || x < 0 || x >= WIDTH) return;
    const i = (y * WIDTH + x) * 4;
    png.data[i] = png.data[i + 1] = png.data[i + 2] = value;
  });
  return PNG.sync.write(png);
}

// Rows must differ from each other, or a "shift" cannot be told from a
// coincidence -- so the pattern keys off the row's index within the block.
const textBlock = (put, top, rows) => {
  for (let y = top; y < top + rows; y++) {
    const n = y - top;
    for (let x = 10; x < 50; x++) {
      put(x, y, (x + n) % 3 === 0 ? ((n * 37) % 200) + 20 : 250);
    }
  }
};
const bar = (put, top, rows, value) => {
  for (let y = top; y < top + rows; y++) {
    for (let x = 5; x < 55; x++) put(x, y, value);
  }
};

const allShifted = (result) =>
  result.bands.length > 0 && result.bands.every((band) => band.shift !== null);

test('identical captures produce no bands', () => {
  const a = page(200, (put) => textBlock(put, 50, 40));
  const result = comparePixels(
    a,
    page(200, (put) => textBlock(put, 50, 40))
  );
  assert.equal(result.changed, 0);
  assert.deepEqual(result.bands, []);
  assert.equal(result.images.a, null, 'nothing to render, nothing retained');
});

test('displaced content is recognised even when it runs to the bottom edge', () => {
  const result = comparePixels(
    page(200, (put) => textBlock(put, 100, 100)),
    page(200, (put) => textBlock(put, 101, 100))
  );
  assert.ok(allShifted(result), JSON.stringify(result.bands));
});

test('content pushed down by a taller page is displacement, not a rewrite', () => {
  const result = comparePixels(
    page(200, (put) => textBlock(put, 100, 100)),
    page(210, (put) => textBlock(put, 110, 100))
  );
  assert.ok(allShifted(result), JSON.stringify(result.bands));
});

test('a block added to blank space is a change, not a displacement', () => {
  const result = comparePixels(
    page(400, () => {}),
    page(400, (put) => bar(put, 200, 10, 0))
  );
  assert.ok(!allShifted(result), JSON.stringify(result.bands));
});

test('a block added at the bottom edge is still a change', () => {
  const result = comparePixels(
    page(400, () => {}),
    page(400, (put) => bar(put, 390, 10, 0))
  );
  assert.ok(!allShifted(result), JSON.stringify(result.bands));
});

test('a single recoloured row is not a displacement', () => {
  const result = comparePixels(
    page(400, (put) => bar(put, 200, 1, 46)),
    page(400, (put) => bar(put, 200, 1, 42))
  );
  assert.ok(!allShifted(result), JSON.stringify(result.bands));
});

test('a size mismatch compares the overlap and says so', () => {
  const result = comparePixels(
    page(50, (put) => textBlock(put, 10, 20)),
    page(40, (put) => textBlock(put, 10, 20))
  );
  assert.equal(result.sizeMismatch, true);
  assert.equal(result.changed, 0);
  const findings = describePixels(result, null);
  assert.equal(findings.length, 1);
  assert.match(findings[0].summary, /Rendered size differs/);
});

test('cropWindow covers the bands plus context', () => {
  assert.deepEqual(cropWindow([], 500), { top: 0, height: 500 });
  const window = cropWindow([{ start: 300, end: 320 }], 5000);
  assert.ok(window.top < 300 && window.top + window.height > 320);
});

test('worstSeverity picks the most severe', () => {
  assert.equal(
    worstSeverity([{ severity: 'minor' }, { severity: 'critical' }]),
    'critical'
  );
  assert.equal(worstSeverity([]), 'info');
});

// --- structural comparison ---------------------------------------------------

const probe = (overrides = {}) => ({
  title: 'Page',
  lang: 'en',
  scrollWidth: 1280,
  head: { 'meta[viewport]': 'width=device-width' },
  fonts: {
    faces: ['open sans|normal|normal|loaded'],
    applied: [],
    fallbackWidth: '10',
  },
  usedFamilies: { '"Open Sans", sans-serif': 40 },
  images: [],
  variants: {},
  text: 'hello\nworld',
  ...overrides,
});

const watched = (overrides = {}) => ({
  consoleErrors: [],
  failedRequests: [],
  badResponses: [],
  thirdParty: new Set(),
  ...overrides,
});

const side = (spec) => ({
  probe: probe(spec.probe),
  watched: watched(spec.watched),
  layout: { layout: spec.layout || [], truncated: false },
});

const compare = (a, b) => compareProbes(side(a), side(b)).findings;

test('a failure present on both origins is not reported as one-sided', () => {
  const findings = compare(
    { watched: { badResponses: ['404 http://localhost:1313/x.png'] } },
    { watched: { badResponses: ['404 https://example.com/x.png'] } }
  );
  assert.deepEqual(findings, [], JSON.stringify(findings));
});

test('a failure on only one origin is reported once', () => {
  const findings = compare(
    { watched: { badResponses: ['404 http://localhost:1313/x.png'] } },
    {}
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].summary, /only on source/);
});

test('a font that fails to load on both origins is not a difference', () => {
  const faces = ['open sans|normal|normal|error'];
  const findings = compare(
    { probe: { fonts: { faces, applied: [], fallbackWidth: '10' } } },
    { probe: { fonts: { faces, applied: [], fallbackWidth: '10' } } }
  );
  assert.deepEqual(findings, [], JSON.stringify(findings));
});

test('a font that loads on one origin but not the other is critical', () => {
  const findings = compare(
    {
      probe: {
        fonts: {
          faces: ['open sans|normal|normal|error'],
          applied: [],
          fallbackWidth: '10',
        },
      },
    },
    {
      probe: {
        fonts: {
          faces: ['open sans|normal|normal|loaded'],
          applied: [],
          fallbackWidth: '10',
        },
      },
    }
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'critical');
});

test('images are paired by src, so one insertion does not cascade', () => {
  const image = (src) => ({
    src,
    natural: '10x10',
    rendered: '10.000x10.000',
    hash: 'aabbccdd',
    alt: '',
    external: false,
    broken: false,
    absolute: `http://x${src}`,
  });
  const findings = compare(
    {
      probe: { images: [image('/new.png'), image('/a.png'), image('/b.png')] },
    },
    { probe: { images: [image('/a.png'), image('/b.png')] } }
  );
  assert.equal(
    findings.length,
    1,
    JSON.stringify(findings.map((f) => f.summary))
  );
  assert.match(findings[0].summary, /only on source: \/new\.png/);
});

test('an unhashable image is not reported as differing bytes', () => {
  const image = (hash) => ({
    src: '/a.png',
    natural: '10x10',
    rendered: '10.000x10.000',
    hash,
    alt: '',
    external: false,
    broken: false,
    absolute: 'http://x/a.png',
  });
  const findings = compare(
    { probe: { images: [image('aabbccdd')] } },
    { probe: { images: [image('ERR TypeError')] } }
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'minor');
  assert.match(findings[0].summary, /Could not verify/);
});

test('reordered text is reported', () => {
  const findings = compare(
    { probe: { text: 'alpha\nbeta\ngamma' } },
    { probe: { text: 'gamma\nbeta\nalpha' } }
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'text');
});

test('head entries that break something are critical', () => {
  const findings = compare(
    { probe: { head: { 'meta[robots]': 'index, follow' } } },
    { probe: { head: { 'meta[robots]': 'noindex, nofollow' } } }
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'critical');
  assert.match(findings[0].summary, /meta\[robots\]/);
});

test('title and lang are compared', () => {
  assert.equal(
    compare({ probe: { title: 'A' } }, { probe: { title: 'B' } }).length,
    1
  );
  assert.equal(
    compare({ probe: { lang: 'en' } }, { probe: { lang: 'de' } }).length,
    1
  );
});

test('unselected srcset variants are compared', () => {
  const findings = compare(
    { probe: { variants: { '/a-480.png': 'aabbccdd' } } },
    { probe: { variants: { '/a-480.png': '11223344' } } }
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'critical');
});
