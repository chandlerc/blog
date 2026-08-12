// RSS and sitemap comparison.
//
// These are the parts of the site no screenshot can check, and they break in
// ways that are invisible until a feed reader chokes on them.

import { unifiedDiff } from './linediff.js';
import { pooled } from './findings.js';
import { ENVIRONMENTS } from './routes.js';

const NORMALIZERS = [
  [/<lastmod>.*?<\/lastmod>/g, '<lastmod>NORMALIZED</lastmod>'],
  [/<pubDate>.*?<\/pubDate>/g, '<pubDate>NORMALIZED</pubDate>'],
  [
    /<lastBuildDate>.*?<\/lastBuildDate>/g,
    '<lastBuildDate>NORMALIZED</lastBuildDate>',
  ],
  [/<generator>.*?<\/generator>/g, '<generator>NORMALIZED</generator>'],
  [/<atom:link href=".*?"/g, '<atom:link href="NORMALIZED"'],
];

function normalize(xml, origins) {
  let text = xml;
  for (const origin of origins) {
    text = text.split(origin).join('');
  }
  for (const [pattern, replacement] of NORMALIZERS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function feedPathsFor(routePaths) {
  const feeds = new Set(['/sitemap.xml', '/index.xml']);
  for (const path of routePaths) {
    if (path === '/') continue;
    // Any section, not a fixed list, and only where the path is a directory --
    // `${path}index.xml` on `/posts/bar` would ask for `/posts/barindex.xml`.
    if (path.endsWith('/')) feeds.add(`${path}index.xml`);
  }
  return [...feeds].sort();
}

async function get(url) {
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  return {
    status: response.status,
    body: response.ok ? await response.text() : '',
  };
}

export async function compareFeeds(
  routePaths,
  sourceOrigin,
  targetOrigin,
  concurrency
) {
  // Absolute URLs differ by construction between origins; strip them all so
  // only real content differences survive.
  const origins = [
    ...new Set([sourceOrigin, targetOrigin, ...Object.values(ENVIRONMENTS)]),
  ];
  const paths = feedPathsFor(routePaths);
  const results = [];
  let checked = 0;

  await pooled(paths, concurrency, async (path) => {
    try {
      const [source, target] = await Promise.all([
        get(sourceOrigin + path),
        get(targetOrigin + path),
      ]);
      // A feed that does not exist on either origin was never a feed; it came
      // from guessing a path per section, and counting it inflates the total.
      if (source.status === 404 && target.status === 404) return;
      checked++;
      if (source.status !== target.status) {
        results.push({
          path,
          severity: 'critical',
          summary: `HTTP ${source.status} on source, ${target.status} on target`,
          diff: '',
        });
        return;
      }
      if (!source.status || source.status >= 400) {
        results.push({
          path,
          severity: 'critical',
          summary: `HTTP ${source.status} on both origins`,
          diff: '',
        });
        return;
      }
      const a = normalize(source.body, origins);
      const b = normalize(target.body, origins);
      if (a !== b) {
        results.push({
          path,
          severity: 'major',
          summary: 'Feed content differs',
          diff: unifiedDiff(a, b),
        });
      }
    } catch (err) {
      results.push({
        path,
        severity: 'critical',
        summary: `Comparison failed: ${err.message}`,
        diff: '',
      });
    }
  });

  return {
    checked,
    results: results.sort((x, y) => x.path.localeCompare(y.path)),
  };
}
