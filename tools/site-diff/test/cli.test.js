import assert from 'node:assert/strict';
import test from 'node:test';
import os from 'node:os';

import { parseArgs, UsageError } from '../site-diff.js';
import { decodeXmlEntities, resolveOrigin } from '../lib/routes.js';
import { diffLines, unifiedDiff } from '../lib/linediff.js';

const rejects = (argv, pattern) =>
  assert.throws(
    () => parseArgs(argv),
    (err) => {
      assert.ok(err instanceof UsageError, `expected UsageError, got ${err}`);
      assert.match(err.message, pattern);
      return true;
    }
  );

test('numeric flags reject anything that is not a positive number', () => {
  // A NaN concurrency spawned zero workers and the run then reported that
  // every page matched, so these must fail loudly rather than default.
  for (const value of ['abc', '-2', '0', '']) {
    rejects(
      [`--concurrency=${value}`],
      /--concurrency needs a positive number/
    );
    rejects(
      [`--max-embed-mb=${value}`],
      /--max-embed-mb needs a positive number/
    );
  }
});

test('unknown flags and bad --slides are rejected', () => {
  rejects(['--bogus'], /Unknown option/);
  rejects(['--slides=wat'], /--slides must be/);
});

test('--out is checked before the run, not after', () => {
  rejects(['--out=/definitely/not/a/directory/report.html'], /not writable/);
  rejects([`--out=${os.tmpdir()}`], /is a directory/);
});

test('valid arguments parse', () => {
  const options = parseArgs([
    '--source=staging',
    '--target=live',
    '--concurrency=3',
  ]);
  assert.equal(options.source, 'staging');
  assert.equal(options.target, 'live');
  assert.equal(options.concurrency, 3);
  assert.equal(options.slides, 'fragments');
  assert.equal(options.share, true);
  assert.equal(parseArgs(['--no-share']).share, false);
});

test('--help does not throw and asks for help', () => {
  assert.equal(parseArgs(['--help']).help, true);
});

test('environments and URLs resolve, nonsense does not', () => {
  assert.equal(resolveOrigin('live'), 'https://chandlerc.blog');
  assert.equal(
    resolveOrigin('http://localhost:1316/'),
    'http://localhost:1316'
  );
  assert.throws(() => resolveOrigin('nope'), /Not a known environment/);
});

test('sitemap entities decode', () => {
  assert.equal(decodeXmlEntities('/tags/c&#43;&#43;/'), '/tags/c++/');
  assert.equal(decodeXmlEntities('a&amp;b'), 'a&b');
  assert.equal(decodeXmlEntities('&#x2B;'), '+');
  assert.equal(decodeXmlEntities('&unknown;'), '&unknown;');
});

test('diffLines sees ordering and repetition, not just membership', () => {
  const reordered = diffLines(['a', 'b', 'c'], ['c', 'b', 'a']);
  assert.ok(reordered.some((hunk) => hunk[0] !== ' '));

  const deduped = diffLines(['x', 'x', 'x', 'y'], ['x', 'y']);
  assert.equal(deduped.filter((hunk) => hunk[0] === '-').length, 2);

  assert.deepEqual(
    diffLines(['same'], ['same']).map((hunk) => hunk[0]),
    [' ']
  );
});

test('unifiedDiff elides unchanged stretches', () => {
  const a = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
  const b = a.replace('line 20', 'CHANGED');
  const diff = unifiedDiff(a, b);
  assert.match(diff, /- line 20/);
  assert.match(diff, /\+ CHANGED/);
  assert.match(diff, /\.\.\./);
  assert.ok(diff.split('\n').length < 20, 'context should be elided');
});

test('a diff too large to compute degrades instead of allocating', () => {
  const huge = Array.from({ length: 3000 }, (_, i) => `a${i}`);
  const other = Array.from({ length: 3000 }, (_, i) => `b${i}`);
  const result = diffLines(huge, other);
  assert.equal(result.length, 2);
  assert.match(result[0][1], /too large to diff/);
});
