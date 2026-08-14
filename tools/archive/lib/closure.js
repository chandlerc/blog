// What a page needs in order to render, read out of Hugo's output rather than
// from a browser run, which would miss references such as a font face only some
// other slide selects. Anything this gets wrong shows up as a file that `check`
// reports absent.

import fs from 'node:fs';
import path from 'node:path';

import { scanCss, scanMarkup } from './scan.js';

/** File types that can refer to further files. */
const SCANNABLE = new Set(['.html', '.htm', '.css', '.svg', '.xhtml']);

/**
 * The subresource references in one file, or null if it can hold none. A
 * reference written against `site`, the base URL Hugo publishes under, comes
 * back site-relative and flagged `absolute`; its offsets still bound the text
 * as written, so a rewrite replaces the whole absolute URL.
 */
export function scanFile(relPath, bytes, site) {
  const extension = path.extname(relPath).toLowerCase();
  if (!SCANNABLE.has(extension)) return null;
  const text = bytes.toString('utf8');
  const refs = extension === '.css' ? scanCss(text) : scanMarkup(text);
  return refs.map((ref) =>
    ref.url.startsWith(site)
      ? { ...ref, url: '/' + ref.url.slice(site.length), absolute: true }
      : ref
  );
}

export function isExternal(url) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.startsWith('//');
}

/** Resolve a reference found in `from` to a path relative to the site root. */
export function resolve(from, url) {
  const resolved = new URL(url, `http://site/${from}`);
  return decodeURIComponent(resolved.pathname).replace(/^\//, '');
}

export function listFiles(root, subdirectory = '') {
  const base = path.join(root, subdirectory);
  if (!fs.existsSync(base)) return [];
  const files = [];
  for (const entry of fs.readdirSync(base, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    files.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return files.sort();
}

/**
 * Every file reachable from `entries` through markup and stylesheets, plus the
 * references that left the site or landed nowhere. The caller records those, so
 * a reference that was already a 404 stays one instead of looking like a gap.
 */
export function reachableFrom(buildDir, entries, site) {
  const files = new Set();
  const external = new Set();
  const unresolved = new Set();
  const queue = [...entries];

  while (queue.length) {
    const relPath = queue.shift();
    if (files.has(relPath)) continue;
    const full = path.join(buildDir, relPath);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    files.add(relPath);

    const refs = scanFile(relPath, fs.readFileSync(full), site);
    if (!refs) continue;
    for (const ref of refs) {
      if (isExternal(ref.url)) {
        external.add(ref.url);
        continue;
      }
      const target = resolve(relPath, ref.url);
      if (fs.existsSync(path.join(buildDir, target))) queue.push(target);
      else unresolved.add(`${target} <- ${relPath}`);
    }
  }
  return {
    files: [...files].sort(),
    external: [...external].sort(),
    unresolved: [...unresolved].sort(),
  };
}
