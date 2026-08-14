// Proving the archive still does what it claims. Each check returns what it
// found wrong; `check` runs them all against one build of the site.

import fs from 'node:fs';
import path from 'node:path';

import { isExternal, listFiles, resolve, scanFile } from './closure.js';
import { build, entryOf, siteBase, subtreeOf } from './hugo.js';
import { SITE_DIR, readManifest } from './manifest.js';
import { isPlaceholder } from './placeholder.js';

export function checkSelfContained(repo, manifest, site) {
  const root = path.join(repo, SITE_DIR);
  const present = new Set(listFiles(root));
  const expected = new Set(
    manifest.routes.flatMap((entry) => entry.unresolved ?? [])
  );
  const problems = [];
  for (const relPath of present) {
    const refs = scanFile(
      relPath,
      fs.readFileSync(path.join(root, relPath)),
      site
    );
    for (const ref of refs ?? []) {
      if (isExternal(ref.url)) continue;
      const target = resolve(relPath, ref.url);
      if (present.has(target)) continue;
      const record = `${target} <- ${relPath}`;
      // A reference the live site never satisfied either is faithfully
      // archived as the 404 it always was.
      if (!expected.has(record)) problems.push(`dangling reference: ${record}`);
    }
  }
  return problems;
}

export function checkManifest(repo, manifest) {
  const root = path.join(repo, SITE_DIR);
  const present = new Set(listFiles(root));
  const listed = new Set(manifest.routes.flatMap((entry) => entry.files));
  const problems = [];
  for (const entry of manifest.routes) {
    const page = entryOf(entry.route);
    if (!present.has(page))
      problems.push(`${entry.route}: archived page ${page} is missing`);
    for (const file of entry.files)
      if (!present.has(file))
        problems.push(`${entry.route}: missing archived file ${file}`);
  }
  for (const file of present)
    if (!listed.has(file)) problems.push(`unreferenced archived file: ${file}`);
  return problems;
}

export function checkPlaceholders(repo, manifest) {
  const problems = [];
  for (const entry of manifest.routes) {
    const file = path.join(repo, entry.source);
    if (!fs.existsSync(file))
      problems.push(
        `${entry.route}: placeholder ${entry.source} is missing, so the ` +
          `page has dropped out of every list and the sitemap.`
      );
    else if (!isPlaceholder(fs.readFileSync(file, 'utf8')))
      problems.push(
        `${entry.route}: ${entry.source} is not the placeholder the freeze ` +
          `left behind.`
      );
  }
  return problems;
}

/** Hugo's output under a frozen route would win over the archived copy. */
export function checkOwnership(manifest, buildDir) {
  const problems = [];
  for (const entry of manifest.routes) {
    const published = listFiles(buildDir, subtreeOf(entry.route));
    if (published.length === 0) continue;
    problems.push(
      `${entry.route}: Hugo publishes ${published.length} file(s) under ` +
        `this route (${published[0]}), which would override the archive. ` +
        `Its placeholder has lost its build settings, or source came back ` +
        `beside it.`
    );
  }
  return problems;
}

export function checkListed(manifest, buildDir, site) {
  const sitemap = fs.readFileSync(path.join(buildDir, 'sitemap.xml'), 'utf8');
  const problems = [];
  for (const entry of manifest.routes) {
    if (!sitemap.includes(`<loc>${site}${entry.route.slice(1)}</loc>`))
      problems.push(
        `${entry.route}: not in the sitemap, so its placeholder is not ` +
          `being listed.`
      );
  }
  return problems;
}

/** Paths the archive shares with the build, such as fingerprinted assets. */
export function checkAgainstBuild(repo, buildDir) {
  const root = path.join(repo, SITE_DIR);
  const problems = [];
  for (const relPath of listFiles(root)) {
    const built = path.join(buildDir, relPath);
    if (!fs.existsSync(built)) continue;
    if (
      fs.readFileSync(built).equals(fs.readFileSync(path.join(root, relPath)))
    )
      continue;
    problems.push(
      `${relPath}: Hugo publishes different bytes at this path, which would ` +
        `override the archived copy.`
    );
  }
  return problems;
}

export function check(repo, { log = () => {} } = {}) {
  const manifest = readManifest(repo);
  const site = siteBase(repo);
  const problems = [
    ...checkManifest(repo, manifest),
    ...checkPlaceholders(repo, manifest),
    ...checkSelfContained(repo, manifest, site),
  ];
  log('Building the site to check what the archive owns...');
  const built = build(repo, { label: 'check' });
  try {
    problems.push(
      ...checkOwnership(manifest, built.dir),
      ...checkListed(manifest, built.dir, site),
      ...checkAgainstBuild(repo, built.dir)
    );
  } finally {
    built.dispose();
  }
  return {
    problems,
    routes: manifest.routes.length,
    files: listFiles(path.join(repo, SITE_DIR)).length,
  };
}
