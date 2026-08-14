// Turning a built page into a frozen one: capture its closure, place it in the
// archive, rewrite the references that moved, and retire its source.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  isExternal,
  listFiles,
  reachableFrom,
  resolve,
  scanFile,
} from './closure.js';
import {
  build,
  isListing,
  isUndated,
  pageMeta,
  renderedRoutes,
  siteBase,
  subtreeOf,
} from './hugo.js';
import {
  SITE_DIR,
  liveFiles,
  readManifest,
  writeManifest,
} from './manifest.js';
import {
  removePlaceholder,
  renderPlaceholder,
  retireSource,
  sourceTree,
} from './placeholder.js';
import { classify, relativeUrl } from './store.js';
import { encodeAttribute, rewrite } from './scan.js';

export function hugoVersion(repo) {
  const text = execFileSync('hugo', ['version'], {
    cwd: repo,
    encoding: 'utf8',
  });
  return /hugo v[^ ]+/.exec(text)?.[0] ?? text.trim();
}

/**
 * One route's files: everything published under it, plus everything those
 * reach. Everything published, not only what the markup links to, because a URL
 * under a frozen page has to keep working even if the page stopped pointing at
 * it years ago.
 */
export function capture(buildDir, route, site) {
  return reachableFrom(buildDir, listFiles(buildDir, subtreeOf(route)), site);
}

/**
 * Where every captured file lands, plus the contents of the ones that change. A
 * reference is rewritten when the file it names moved, or when it was written
 * against the site's own domain.
 */
export function plan(buildDir, files, ownedPrefixes, site) {
  const placements = new Map();
  for (const relPath of files) {
    const bytes = fs.readFileSync(path.join(buildDir, relPath));
    placements.set(relPath, {
      ...classify(relPath, bytes, ownedPrefixes),
      bytes,
    });
  }

  const contents = new Map();
  for (const [relPath, placement] of placements) {
    const rewrites = [];
    for (const ref of scanFile(relPath, placement.bytes, site) ?? []) {
      if (isExternal(ref.url)) continue;
      const target = resolve(relPath, ref.url);
      const to = placements.get(target);
      // A reference that resolved nowhere is left as the 404 it always was.
      if (!to) continue;
      if (to.target === target && !ref.absolute) continue;
      rewrites.push({ ref, to });
    }
    if (rewrites.length === 0) {
      contents.set(placement.target, placement.bytes);
      continue;
    }
    if (placement.kind !== 'owned') {
      throw new Error(
        `${relPath} is shared, so its archived path is its own hash, but it ` +
          `refers to ${rewrites[0].to.target}, which moved. Rewriting it ` +
          `would change the bytes that path names.`
      );
    }
    const isCss = path.extname(relPath).toLowerCase() === '.css';
    const edits = rewrites.map(({ ref, to }) => {
      const url = relativeUrl(placement.target, to.target);
      return {
        start: ref.start,
        end: ref.end,
        replacement: isCss ? url : encodeAttribute(url),
      };
    });
    contents.set(
      placement.target,
      Buffer.from(rewrite(placement.bytes.toString('utf8'), edits), 'utf8')
    );
  }
  return {
    contents,
    targets: [...placements.values()].map((placement) => placement.target),
  };
}

function writeFiles(repo, contents) {
  for (const [relPath, bytes] of contents) {
    const file = path.join(repo, SITE_DIR, relPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && fs.readFileSync(file).equals(bytes)) continue;
    fs.writeFileSync(file, bytes);
  }
}

/** Drop archived files no frozen route needs any more, and empty directories. */
export function collect(repo, manifest) {
  const keep = liveFiles(manifest);
  const root = path.join(repo, SITE_DIR);
  let removed = 0;
  for (const relPath of listFiles(root)) {
    if (keep.has(relPath)) continue;
    fs.rmSync(path.join(root, relPath));
    removed++;
  }
  for (const dir of directoriesDeepestFirst(root)) {
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  return removed;
}

function directoriesDeepestFirst(root) {
  if (!fs.existsSync(root)) return [];
  const dirs = [];
  for (const entry of fs.readdirSync(root, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (entry.isDirectory()) dirs.push(path.join(entry.parentPath, entry.name));
  }
  return dirs.sort((a, b) => b.length - a.length);
}

/**
 * Which of the selected routes can be captured. A pattern may sweep up routes
 * Hugo never renders, such as a deck's section pages, and listings, which would
 * pin a list that grows as pages arrive beneath it; both are dropped and
 * counted. Naming either outright is an error rather than a near miss.
 */
export function partition(targets, published) {
  const rendered = new Set(published);
  const missing = targets.filter((target) => !rendered.has(target.route));
  const listings = targets.filter(
    (target) => rendered.has(target.route) && isListing(target.route, published)
  );
  const named = (dropped) =>
    dropped.filter((target) => target.explicit).map((target) => target.route);
  if (named(missing).length) {
    throw new Error(
      `Hugo does not render ${named(missing).join(', ')}. Check the route.`
    );
  }
  if (named(listings).length) {
    throw new Error(
      `${named(listings).join(', ')}: other pages are published beneath ` +
        `this route, so freezing it would pin a listing.`
    );
  }
  const chosen = targets.filter(
    (target) => !missing.includes(target) && !listings.includes(target)
  );
  return { chosen, missing, listings };
}

/** Freeze `targets`, each `{route, contentPath, explicit, undated}`. */
export function freeze(repo, targets, { log = () => {} } = {}) {
  const manifest = readManifest(repo);
  const routes = targets.map((target) => target.route);
  const already = routes.filter((route) =>
    manifest.routes.some((entry) => entry.route === route)
  );
  if (already.length) {
    throw new Error(
      `Already frozen: ${already.join(', ')}. Thaw it, restore its source ` +
        `from version control, edit, and freeze it again.`
    );
  }

  const site = siteBase(repo);
  log(`Building the site with ${routes.length} route(s) still live...`);
  const captureBuild = build(repo, { meta: true, label: 'capture' });

  let entries;
  try {
    const version = hugoVersion(repo);
    const frozenOn = new Date().toISOString().slice(0, 10);
    const { chosen, missing, listings } = partition(
      targets,
      renderedRoutes(captureBuild.dir)
    );
    if (missing.length)
      log(`Skipped ${missing.length} route(s) Hugo does not render.`);
    if (listings.length) log(`Skipped ${listings.length} listing(s).`);
    if (chosen.length === 0) {
      log('Nothing to freeze.');
      return manifest;
    }
    const meta = pageMeta(captureBuild.dir);
    const ownedPrefixes = [
      ...manifest.routes.map((entry) => entry.route),
      ...chosen.map((target) => target.route),
    ].map((route) => subtreeOf(route) + '/');

    entries = chosen.map((target) => {
      const page = meta.get(target.route);
      if (!page) {
        throw new Error(`${target.route}: not among the pages Hugo built`);
      }
      const captured = capture(captureBuild.dir, target.route, site);
      const { contents, targets: files } = plan(
        captureBuild.dir,
        captured.files,
        ownedPrefixes,
        site
      );
      writeFiles(repo, contents);
      retireSource(
        repo,
        target.contentPath,
        renderPlaceholder({ ...page, frozen: frozenOn })
      );
      // `--before` counts an undated page as older than any date, which is
      // worth seeing in the output.
      log(
        `  ${target.route}: ${files.length} files` +
          (target.undated ? ', undated' : '') +
          `; ${sourceTree(target.contentPath)} retired`
      );
      return {
        route: target.route,
        source: target.contentPath,
        frozen: frozenOn,
        hugo: version,
        files: [...new Set(files)].sort(),
        external: captured.external,
        unresolved: captured.unresolved,
      };
    });
  } finally {
    captureBuild.dispose();
  }

  manifest.routes = [...manifest.routes, ...entries];
  writeManifest(repo, manifest);
  const removed = collect(repo, manifest);
  if (removed) log(`Reclaimed ${removed} file(s) no frozen route still needs.`);
  return manifest;
}

export function thaw(repo, routes, { log = () => {} } = {}) {
  const manifest = readManifest(repo);
  const entries = routes.map((route) => {
    const entry = manifest.routes.find((entry) => entry.route === route);
    if (!entry) throw new Error(`Not frozen: ${route}`);
    return entry;
  });
  for (const entry of entries) removePlaceholder(repo, entry.source);
  manifest.routes = manifest.routes.filter(
    (entry) => !routes.includes(entry.route)
  );
  writeManifest(repo, manifest);
  log(`Reclaimed ${collect(repo, manifest)} file(s).`);
  for (const entry of entries) {
    log(
      `${entry.route}: restore ${sourceTree(entry.source)} from version ` +
        `control; the commit that froze the page removed it.`
    );
  }
  return manifest;
}

/** Attach the content path Hugo knows for each route being frozen. */
export function withContentPaths(selected, pages) {
  return selected.map(({ route, explicit }) => {
    const page = pages.get(route);
    if (!page) {
      throw new Error(
        `${route} is not a page Hugo builds. ` +
          `Run './archive.sh list --available' to see what can be frozen.`
      );
    }
    return {
      route,
      explicit,
      contentPath: page.contentPath,
      undated: isUndated(page),
    };
  });
}
