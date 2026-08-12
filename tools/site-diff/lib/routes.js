// Route discovery.

import { pooled } from './findings.js';

export const ENVIRONMENTS = {
  local: 'http://localhost:1313',
  staging: 'http://staging.chandlerc.blog',
  live: 'https://chandlerc.blog',
};

export function resolveOrigin(name) {
  const url = ENVIRONMENTS[name] || name;
  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `Not a known environment or URL: ${name} (known: ${Object.keys(ENVIRONMENTS).join(', ')})`
    );
  }
  return url.replace(/\/$/, '');
}

export function decodeXmlEntities(text) {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g,
    (match, dec, hex, name) => {
      if (dec) return String.fromCodePoint(Number(dec));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name];
    }
  );
}

export async function fetchSitemapPaths(origin) {
  const url = `${origin}/sitemap.xml`;
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const body = await response.text();
  const paths = new Set(['/']);
  for (const match of body.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const loc = decodeXmlEntities(match[1].trim());
    try {
      paths.add(new URL(loc, origin).pathname);
    } catch {
      // A malformed <loc> is the sitemap's problem, not ours.
    }
  }
  return [...paths].sort();
}

async function status(url) {
  try {
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    // Drain so the socket can be reused rather than left half-open.
    await response.arrayBuffer();
    return response.status;
  } catch {
    return 0;
  }
}

// Check every route on both origins before capturing anything. This is what
// keeps the run from silently screenshotting the 404 page 200 times, and it
// turns "this page only exists on one side" into a finding instead of a
// mysterious full-page pixel diff.
export async function probeRoutes(
  paths,
  sourceOrigin,
  targetOrigin,
  concurrency
) {
  const results = [];
  await pooled(paths, concurrency, async (path) => {
    const [source, target] = await Promise.all([
      status(sourceOrigin + path),
      status(targetOrigin + path),
    ]);
    results.push({ path, source, target });
  });
  return results.sort((a, b) => a.path.localeCompare(b.path));
}
