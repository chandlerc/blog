import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classify,
  isContentAddressed,
  relativeUrl,
  sha256,
  storePath,
} from '../lib/store.js';
import { parseCsv } from '../lib/hugo.js';
import { resolve } from '../lib/closure.js';

const BYTES = Buffer.from('body { color: red }');
const HASH = sha256(BYTES);

test('a path naming its own content is recognised', () => {
  assert.ok(isContentAddressed(`css/style.min.${HASH}.css`, BYTES));
});

test('a path that merely looks hashed is not', () => {
  const decoy = 'f'.repeat(64);
  assert.equal(isContentAddressed(`css/style.min.${decoy}.css`, BYTES), false);
});

test('a plain path is not content-addressed', () => {
  assert.equal(isContentAddressed('reveal-js/dist/reveal.css', BYTES), false);
});

test('files inside a frozen page keep their URLs', () => {
  const result = classify('slides/deck/splash.png', BYTES, ['slides/deck/']);
  assert.deepEqual(result, { kind: 'owned', target: 'slides/deck/splash.png' });
});

test('fingerprinted files keep their URLs and need no rewriting', () => {
  const relPath = `fonts/a.${HASH}.woff2`;
  assert.deepEqual(classify(relPath, BYTES, ['slides/deck/']), {
    kind: 'addressed',
    target: relPath,
  });
});

test('shared files at a mutable path move into the store', () => {
  const result = classify('reveal-js/dist/reveal.js', BYTES, ['slides/deck/']);
  assert.equal(result.kind, 'stored');
  assert.equal(result.target, `_a/${HASH}.js`);
});

test('the store dedups by content, whatever the file was called', () => {
  assert.equal(storePath('one/a.js', BYTES), storePath('other/b.js', BYTES));
});

test('store URLs are relative, so the tree can be served anywhere', () => {
  assert.equal(
    relativeUrl('slides/deck/index.html', '_a/abc.js'),
    '../../_a/abc.js'
  );
  assert.equal(relativeUrl('index.html', '_a/abc.js'), './_a/abc.js');
});

test('references resolve against the referring document', () => {
  assert.equal(
    resolve('slides/deck/index.html', '../../css/a.css'),
    'css/a.css'
  );
  assert.equal(
    resolve('slides/deck/index.html', 'splash.png'),
    'slides/deck/splash.png'
  );
  assert.equal(resolve('posts/a/index.html', '/favicon.ico'), 'favicon.ico');
});

test('percent-encoded references resolve to the file on disk', () => {
  assert.equal(
    resolve('index.html', 'fonts/Open%20Sans.woff2'),
    'fonts/Open Sans.woff2'
  );
});

test('page listings survive commas inside titles', () => {
  const rows = parseCsv(
    'path,title,kind\na.md,"Story-time: C++, bounds checking",page\n'
  );
  assert.deepEqual(rows[1], [
    'a.md',
    'Story-time: C++, bounds checking',
    'page',
  ]);
});
