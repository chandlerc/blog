import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeEntities, rewrite, scanCss, scanMarkup } from '../lib/scan.js';

const urls = (refs) => refs.map((ref) => ref.url);

test('finds subresources across quoting styles', () => {
  const html = `
    <link rel="stylesheet" href="a.css">
    <script src='b.js'></script>
    <script src=c.js></script>
    <img src = "d.png">
  `;
  assert.deepEqual(urls(scanMarkup(html)), ['a.css', 'b.js', 'c.js', 'd.png']);
});

test('leaves hyperlinks and metadata alone', () => {
  const html = `
    <a href="/somewhere/">text</a>
    <link rel="canonical" href="https://example.com/here/">
    <link rel="alternate" type="application/rss+xml" href="/index.xml">
    <link rel="me" href="https://example.com/@me">
    <base href="/">
    <form action="/search"></form>
  `;
  assert.deepEqual(urls(scanMarkup(html)), []);
});

test('takes every srcset candidate, not only the selected one', () => {
  const refs = scanMarkup(
    '<img srcset="small.png 480w, medium.png 800w, large.png 1600w" src="fallback.png">'
  );
  assert.deepEqual(urls(refs), [
    'small.png',
    'medium.png',
    'large.png',
    'fallback.png',
  ]);
});

test('reads reveal.js background attributes', () => {
  const refs = scanMarkup(
    '<section data-background-image="splash.png"></section>'
  );
  assert.deepEqual(urls(refs), ['splash.png']);
});

test('ignores markup quoted inside a script', () => {
  const html = `
    <script>
      var pattern = '<img src="not-a-real-reference.png">';
    </script>
    <img src="real.png">
  `;
  assert.deepEqual(urls(scanMarkup(html)), ['real.png']);
});

test('ignores commented-out markup', () => {
  const html =
    '<!-- <script src="old.js"></script> --><script src="new.js"></script>';
  assert.deepEqual(urls(scanMarkup(html)), ['new.js']);
});

test('skips references a browser never fetches', () => {
  const html = `
    <img src="data:image/gif;base64,R0lGOD">
    <a href="#section"></a>
    <img src="">
    <script src="javascript:void(0)"></script>
  `;
  assert.deepEqual(urls(scanMarkup(html)), []);
});

test('decodes entities in attribute values', () => {
  assert.deepEqual(urls(scanMarkup('<img src="a&amp;b.png">')), ['a&b.png']);
  assert.equal(decodeEntities('c&#43;&#43;'), 'c++');
});

test('finds inline style backgrounds', () => {
  const refs = scanMarkup('<div style="background-image: url(bg.png)"></div>');
  assert.deepEqual(urls(refs), ['bg.png']);
});

test('finds SVG raster references', () => {
  const refs = scanMarkup(
    '<svg><image href="photo.png"/><use xlink:href="i.svg#a"/></svg>'
  );
  assert.deepEqual(urls(refs), ['photo.png', 'i.svg#a']);
});

test('offsets bound the URL itself', () => {
  const html = '<script src=../reveal.js></script>';
  const [ref] = scanMarkup(html);
  assert.equal(html.slice(ref.start, ref.end), '../reveal.js');
});

test('finds stylesheet references', () => {
  const css = `
    @font-face { src: url("/fonts/a.woff2") format('woff2'); }
    .b { background: url(/img/b.png); }
    .c { background: url('/img/c.png'); }
    @import "other.css";
  `;
  assert.deepEqual(urls(scanCss(css)), [
    '/fonts/a.woff2',
    '/img/b.png',
    '/img/c.png',
    'other.css',
  ]);
});

test('skips data URIs in stylesheets', () => {
  assert.deepEqual(
    urls(scanCss('.a { background: url(data:image/gif;base64,R0l) }')),
    []
  );
});

test('css offsets bound the URL itself', () => {
  const css = '.a { background: url( /img/b.png ) }';
  const [ref] = scanCss(css);
  assert.equal(css.slice(ref.start, ref.end), '/img/b.png');
});

test('rewrites in place and leaves everything else byte for byte', () => {
  const html = '<script src=a.js></script><img src="b.png">';
  const refs = scanMarkup(html);
  const out = rewrite(html, [
    { start: refs[0].start, end: refs[0].end, replacement: '_a/1.js' },
  ]);
  assert.equal(out, '<script src=_a/1.js></script><img src="b.png">');
});

test('refuses overlapping rewrites', () => {
  assert.throws(
    () =>
      rewrite('abcdef', [
        { start: 0, end: 3, replacement: 'x' },
        { start: 2, end: 5, replacement: 'y' },
      ]),
    /overlapping/
  );
});
