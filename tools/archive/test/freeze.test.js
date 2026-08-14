import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { reachableFrom, scanFile } from '../lib/closure.js';
import { partition, plan } from '../lib/freeze.js';
import { isListing, parseBaseUrl, renderedRoutes } from '../lib/hugo.js';
import { sha256 } from '../lib/store.js';

const SITE = 'https://example.com/';

/** A build directory holding `files`, as `{relPath: contents}`. */
function buildDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
  for (const [relPath, contents] of Object.entries(files)) {
    const file = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return dir;
}

test('the base URL is read from hugo config output', () => {
  assert.equal(parseBaseUrl("baseurl = 'https://example.com/'\n"), SITE);
  assert.equal(
    parseBaseUrl('other = 1\nbaseURL = "https://example.com"'),
    SITE
  );
  assert.throws(() => parseBaseUrl('title = "x"'), /baseURL/);
});

test('references written against the site come back site-relative', () => {
  const html = `<img src="${SITE}posts/a/x.png"><img src="y.png">`;
  const [absolute, relative] = scanFile(
    'posts/a/index.html',
    Buffer.from(html),
    SITE
  );
  assert.equal(absolute.url, '/posts/a/x.png');
  assert.equal(absolute.absolute, true);
  assert.equal(
    html.slice(absolute.start, absolute.end),
    `${SITE}posts/a/x.png`
  );
  assert.equal(relative.url, 'y.png');
  assert.equal(relative.absolute, undefined);
});

test("the closure follows the site's own absolute references", () => {
  const dir = buildDir({
    'posts/a/index.html': `<img src="${SITE}posts/a/x.png"><img src="gone.png"><img src="https://elsewhere.org/z.png">`,
    'posts/a/x.png': 'x',
  });
  const result = reachableFrom(dir, ['posts/a/index.html'], SITE);
  assert.deepEqual(result.files, ['posts/a/index.html', 'posts/a/x.png']);
  assert.deepEqual(result.external, ['https://elsewhere.org/z.png']);
  assert.deepEqual(result.unresolved, [
    'posts/a/gone.png <- posts/a/index.html',
  ]);
});

test('rendered routes are the directories holding a page', () => {
  const dir = buildDir({
    'index.html': '',
    '404.html': '',
    'slides/index.html': '',
    'slides/deck/index.html': '',
    'slides/deck/splash.png': '',
    'tags/x/index.html': '',
  });
  const routes = renderedRoutes(dir);
  assert.deepEqual(routes, ['/', '/slides/', '/slides/deck/', '/tags/x/']);
  assert.equal(isListing('/', routes), true);
  assert.equal(isListing('/slides/', routes), true);
  assert.equal(isListing('/slides/deck/', routes), false);
  assert.equal(isListing('/tags/x/', routes), false);
});

test('a pattern skips what cannot be frozen; a named route stops', () => {
  const published = ['/', '/slides/', '/slides/deck/'];
  const deck = { route: '/slides/deck/', explicit: false };
  const section = { route: '/slides/deck/intro/', explicit: false };
  const listing = { route: '/slides/', explicit: false };
  const result = partition([deck, section, listing], published);
  assert.deepEqual(result.chosen, [deck]);
  assert.deepEqual(result.missing, [section]);
  assert.deepEqual(result.listings, [listing]);
  assert.throws(
    () => partition([{ ...section, explicit: true }], published),
    /does not render/
  );
  assert.throws(
    () => partition([{ ...listing, explicit: true }], published),
    /listing/
  );
});

test('a plan rewrites moved and site-absolute references only', () => {
  const css = 'body { color: red }';
  const html =
    `<link rel="stylesheet" href="../../reveal/reveal.css">` +
    `<link rel="stylesheet" href="../../css/a.${sha256(Buffer.from(css))}.css">` +
    `<img src="${SITE}slides/deck/a.png"><img src="b.png">`;
  const dir = buildDir({
    'slides/deck/index.html': html,
    'slides/deck/a.png': 'a',
    'slides/deck/b.png': 'b',
    'reveal/reveal.css': css,
    [`css/a.${sha256(Buffer.from(css))}.css`]: css,
  });
  const files = [
    'slides/deck/index.html',
    'slides/deck/a.png',
    'slides/deck/b.png',
    'reveal/reveal.css',
    `css/a.${sha256(Buffer.from(css))}.css`,
  ];
  const { contents, targets } = plan(dir, files, ['slides/deck/'], SITE);
  const store = `_a/${sha256(Buffer.from(css))}.css`;
  assert.deepEqual(
    [...targets].sort(),
    [
      store,
      `css/a.${sha256(Buffer.from(css))}.css`,
      'slides/deck/a.png',
      'slides/deck/b.png',
      'slides/deck/index.html',
    ].sort()
  );
  assert.equal(
    contents.get('slides/deck/index.html').toString(),
    `<link rel="stylesheet" href="../../${store}">` +
      `<link rel="stylesheet" href="../../css/a.${sha256(Buffer.from(css))}.css">` +
      `<img src="./a.png"><img src="b.png">`
  );
  assert.equal(contents.get(store).toString(), css);
});

test('a shared file that would need rewriting is refused', () => {
  const dir = buildDir({
    'slides/deck/index.html':
      '<link rel="stylesheet" href="../../reveal/theme.css">',
    'reveal/theme.css': '@import "reveal.css";',
    'reveal/reveal.css': 'body {}',
  });
  const files = [
    'slides/deck/index.html',
    'reveal/theme.css',
    'reveal/reveal.css',
  ];
  assert.throws(() => plan(dir, files, ['slides/deck/'], SITE), /is shared/);
});
