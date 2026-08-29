import assert from 'node:assert/strict';
import test from 'node:test';

import {
  expiredShares,
  GIST_FILENAME,
  MARKER,
  parseGistUrl,
  viewUrl,
} from '../lib/share.js';

test('the gist URL is parsed from gh output, garbage is not', () => {
  // gh prints progress lines before the URL; only the trailing URL counts.
  const output =
    '- Creating gist site-diff-report.html\n' +
    '✓ Created secret gist site-diff-report.html\n' +
    'https://gist.github.com/chandlerc/ef3cef2b3a3ad24abc2bbddf054538d9\n';
  assert.deepEqual(parseGistUrl(output), {
    user: 'chandlerc',
    id: 'ef3cef2b3a3ad24abc2bbddf054538d9',
  });

  assert.throws(() => parseGistUrl('error: not logged in'), /did not print/);
  // A URL that is mentioned mid-output but is not the result must not parse:
  // trusting it would print a share link pointing at someone else's gist.
  assert.throws(
    () => parseGistUrl('see https://gist.github.com/a/beef for details\ndone'),
    /did not print/
  );
});

test('the view link renders the raw gist through htmlpreview', () => {
  assert.equal(
    viewUrl('user', 'abc123'),
    'https://htmlpreview.github.io/?' +
      `https://gist.githubusercontent.com/user/abc123/raw/${GIST_FILENAME}`
  );
});

test('only marked, expired gists are pruned', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.parse('2026-08-29T00:00:00Z');
  const at = (daysAgo) => new Date(now - daysAgo * day).toISOString();
  const gists = [
    { id: 'old-share', description: `${MARKER} a vs b`, created_at: at(8) },
    { id: 'new-share', description: `${MARKER} a vs b`, created_at: at(6) },
    // Never someone else's gists, however old: neither an unrelated
    // description, nor one that merely mentions the marker, nor none at all.
    { id: 'unrelated', description: 'my notes', created_at: at(400) },
    { id: 'mentions', description: `about ${MARKER}`, created_at: at(400) },
    { id: 'unnamed', description: null, created_at: at(400) },
  ];
  assert.deepEqual(expiredShares(gists, now), ['old-share']);
  // The TTL boundary itself is not yet expired.
  assert.deepEqual(expiredShares([gists[1]], now, 6), []);
  assert.deepEqual(expiredShares([gists[1]], now, 5), ['new-share']);
});
