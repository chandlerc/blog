// What each captured file is called in the archive.
//
// One tree is shared by every frozen page, so two pages frozen at the same site
// revision have to agree on where a shared asset lives.

import crypto from 'node:crypto';
import path from 'node:path';

/** Directory under the archive root holding content-addressed files. */
export const STORE_DIR = '_a';

export function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Whether a path already names its own content, as Hugo's `fingerprint` makes
 * it. Checked against the bytes, so a filename that merely looks like a hash
 * does not qualify.
 */
export function isContentAddressed(relPath, bytes) {
  return relPath.includes(sha256(bytes));
}

export function storePath(relPath, bytes) {
  return `${STORE_DIR}/${sha256(bytes)}${path.extname(relPath)}`;
}

/**
 * What `relPath` is called in the archive, given the frozen subtrees as
 * directory paths relative to the site root. Every file is copied in either
 * way; only its name there is in question. A file inside a frozen subtree is
 * archived where it stood, so a deep link straight at an image survives, and so
 * is one whose path already names its content, which leaves the markup
 * referring to it alone and its `integrity` attribute verifying. Anything else
 * is shared at a path a dependency upgrade could replace, and is renamed into
 * the store.
 */
export function classify(relPath, bytes, ownedPrefixes) {
  if (ownedPrefixes.some((prefix) => relPath.startsWith(prefix)))
    return { kind: 'owned', target: relPath };
  if (isContentAddressed(relPath, bytes))
    return { kind: 'addressed', target: relPath };
  return { kind: 'stored', target: storePath(relPath, bytes) };
}

/** The URL that reaches `target` from a document published at `from`. */
export function relativeUrl(from, target) {
  const relative = path.posix.relative(
    path.posix.dirname('/' + from),
    '/' + target
  );
  return relative.startsWith('.') ? relative : './' + relative;
}
