import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseHomeOutputs } from '../lib/hugo.js';
import {
  MARKER,
  isPlaceholder,
  removePlaceholder,
  renderPlaceholder,
  retireSource,
  sourceTree,
} from '../lib/placeholder.js';

const DECK = {
  route: '/slides/deck/',
  title: 'A "quoted" title',
  date: '2023-05-09T00:00:00Z',
  aliases: ['/slides/old-deck'],
  frozen: '2026-09-04',
};

test('a placeholder carries what a list entry needs and nothing Hugo renders', () => {
  const text = renderPlaceholder(DECK);
  assert.ok(isPlaceholder(text));
  assert.match(text, /^\+\+\+\n# Placeholder for a frozen page\./);
  assert.match(text, /^title = "A \\"quoted\\" title"$/m);
  assert.match(text, /^date = "2023-05-09T00:00:00Z"$/m);
  assert.match(text, /^aliases = \["\/slides\/old-deck"\]$/m);
  assert.match(text, /^summary = "An archived slide deck, /m);
  assert.match(
    text,
    /^\[build\]\n  render = "link"\n  publishResources = false\n\+\+\+\n$/m
  );
  assert.doesNotMatch(text, /outputs|tags/);
});

test('undated pages get no date and posts are called pages', () => {
  const text = renderPlaceholder({
    route: '/posts/a/',
    title: 'A',
    tags: ['c++'],
    frozen: '2026-09-04',
  });
  assert.doesNotMatch(text, /^date =/m);
  assert.match(text, /^tags = \["c\+\+"\]$/m);
  assert.match(text, /An archived page, /);
});

test('only a placeholder is recognised as one', () => {
  assert.equal(isPlaceholder(`+++\n# ${MARKER} ...\n+++\n`), true);
  assert.equal(isPlaceholder('+++\ntitle = "x"\n+++\n'), false);
  assert.equal(isPlaceholder(`# ${MARKER}`), false);
});

test('a bundle index stands for its directory; a plain file for itself', () => {
  assert.equal(
    sourceTree('content/slides/deck/_index.md'),
    'content/slides/deck'
  );
  assert.equal(sourceTree('content/posts/a/index.md'), 'content/posts/a');
  assert.equal(
    sourceTree('content/posts/welcome.md'),
    'content/posts/welcome.md'
  );
});

test('retiring replaces the whole bundle with the placeholder', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
  fs.mkdirSync(path.join(repo, 'content/slides/deck/sub'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'content/slides/deck/_index.md'), 'old');
  fs.writeFileSync(path.join(repo, 'content/slides/deck/a.png'), 'a');
  fs.writeFileSync(path.join(repo, 'content/slides/deck/sub/b.md'), 'b');
  fs.writeFileSync(path.join(repo, 'content/slides/other.md'), 'keep');
  retireSource(repo, 'content/slides/deck/_index.md', renderPlaceholder(DECK));
  assert.deepEqual(fs.readdirSync(path.join(repo, 'content/slides/deck')), [
    '_index.md',
  ]);
  assert.ok(
    isPlaceholder(
      fs.readFileSync(path.join(repo, 'content/slides/deck/_index.md'), 'utf8')
    )
  );
  assert.equal(
    fs.readFileSync(path.join(repo, 'content/slides/other.md'), 'utf8'),
    'keep'
  );
});

test('thawing removes a placeholder and refuses anything else', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
  fs.mkdirSync(path.join(repo, 'content/posts'), { recursive: true });
  fs.writeFileSync(
    path.join(repo, 'content/posts/a.md'),
    renderPlaceholder({ ...DECK, route: '/posts/a/' })
  );
  fs.writeFileSync(path.join(repo, 'content/posts/b.md'), 'real content');
  removePlaceholder(repo, 'content/posts/a.md');
  assert.equal(fs.existsSync(path.join(repo, 'content/posts/a.md')), false);
  assert.throws(
    () => removePlaceholder(repo, 'content/posts/b.md'),
    /not the placeholder/
  );
  assert.throws(
    () => removePlaceholder(repo, 'content/posts/missing.md'),
    /not the placeholder/
  );
  assert.equal(fs.existsSync(path.join(repo, 'content/posts/b.md')), true);
});

test('the home output formats are read from hugo config', () => {
  const text =
    "[minify]\n  x = 1\n\n[outputs]\n  home = ['html', 'rss']\n  page = ['html']\n";
  assert.deepEqual(parseHomeOutputs(text), ['html', 'rss']);
  assert.throws(
    () => parseHomeOutputs('[outputs]\n  page = ["html"]\n'),
    /home outputs/
  );
});
