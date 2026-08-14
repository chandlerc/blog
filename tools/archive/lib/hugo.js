// Running Hugo, and how its routes map onto the files it writes.
//
// Every build points the archive mount at an empty directory, so a capture is
// of Hugo's own output rather than of a previous archive served back, and a
// frozen page's absence from a build is what proves the freeze.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listFiles } from './closure.js';

/** Mount source in each module.toml that publishes the archive. */
export const ARCHIVE_MOUNT = 'archive/site';

/**
 * A capture build also writes what every page tells Hugo about itself, which is
 * what a placeholder is generated from. The output format exists only in the
 * scratch config; its template lives beside the tool.
 */
const META_FORMAT = 'archivemeta';
const META_FILE = 'archive-meta.json';
const META_LAYOUTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../layouts'
);

function hugo(repo, args) {
  // --noBuildLock: these runs only read the project and write to a scratch
  // destination, and taking the lock means waiting on a `hugo server` that is
  // rebuilding in response to the very files being written.
  try {
    return execFileSync(
      'hugo',
      [...args, '--environment', 'production', '--noBuildLock'],
      {
        cwd: repo,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  } catch (error) {
    const what = args.find((arg) => !arg.startsWith('--')) ?? 'build';
    throw new Error(
      `hugo ${what} failed:\n${error.stderr?.toString().trim() || error.message}`
    );
  }
}

/** The output formats the home page already has, from `hugo config`. */
export function parseHomeOutputs(text) {
  const section = /^\[outputs\]\n((?:[ \t]+.*\n?)*)/m.exec(text);
  const home = section && /^[ \t]+home\s*=\s*\[([^\]]*)\]/m.exec(section[1]);
  if (!home) throw new Error('hugo config reports no home outputs');
  return home[1]
    .split(',')
    .map((name) => name.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function withMetaOutput(repo, configDir) {
  // Hugo layers the files in an environment's directory over `_default` by
  // key, so two small files add the output format without editing anything
  // the site owns.
  const production = path.join(configDir, 'production');
  const outputs = [...parseHomeOutputs(hugo(repo, ['config'])), META_FORMAT];
  fs.writeFileSync(
    path.join(production, 'outputs.toml'),
    `home = ${JSON.stringify(outputs)}\n`
  );
  fs.writeFileSync(
    path.join(production, 'outputformats.toml'),
    `[${META_FORMAT}]\n` +
      `  mediaType = "application/json"\n` +
      `  baseName = "${path.basename(META_FILE, '.json')}"\n` +
      `  isPlainText = true\n` +
      `  notAlternative = true\n`
  );
  fs.appendFileSync(
    path.join(production, 'module.toml'),
    `\n[[mounts]]\n  source = '${META_LAYOUTS}'\n  target = 'layouts'\n`
  );
}

function pristineConfig(repo, scratch, meta) {
  const configDir = path.join(scratch, 'config');
  const empty = path.join(scratch, 'no-archive');
  fs.mkdirSync(empty, { recursive: true });
  fs.cpSync(path.join(repo, 'config'), configDir, { recursive: true });

  let replaced = 0;
  for (const entry of fs.readdirSync(configDir, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith('.toml')) continue;
    const file = path.join(entry.parentPath, entry.name);
    const text = fs.readFileSync(file, 'utf8');
    const updated = text.replaceAll(`'${ARCHIVE_MOUNT}'`, `'${empty}'`);
    if (updated === text) continue;
    fs.writeFileSync(file, updated);
    replaced++;
  }
  if (replaced === 0) {
    throw new Error(
      `No '${ARCHIVE_MOUNT}' mount in config/. Add it to ` +
        `config/_default/module.toml and config/production/module.toml.`
    );
  }
  if (meta) withMetaOutput(repo, configDir);
  return configDir;
}

/**
 * Build the production site into a fresh directory, returned with the call that
 * cleans it up. With `meta`, the build also writes the page metadata a capture
 * needs.
 */
export function build(repo, { meta = false, label = 'build' } = {}) {
  const scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), `blog-archive-${label}-`)
  );
  const destination = path.join(scratch, 'public');
  const dispose = () => fs.rmSync(scratch, { recursive: true, force: true });
  try {
    hugo(repo, [
      '--configDir',
      pristineConfig(repo, scratch, meta),
      '--destination',
      destination,
      '--quiet',
    ]);
  } catch (error) {
    dispose();
    throw error;
  }
  return { dir: destination, dispose };
}

/** What each page told Hugo about itself, keyed by route, from a meta build. */
export function pageMeta(buildDir) {
  const pages = JSON.parse(
    fs.readFileSync(path.join(buildDir, META_FILE), 'utf8')
  );
  return new Map(pages.map((page) => [page.route, page]));
}

/** The base URL from `hugo config` output, with a trailing slash. */
export function parseBaseUrl(text) {
  const match = /^baseurl\s*=\s*(['"])(.*?)\1\s*$/im.exec(text);
  if (!match) throw new Error('hugo config reports no baseURL');
  return match[2].endsWith('/') ? match[2] : match[2] + '/';
}

/** The URL the production site publishes under. */
export function siteBase(repo) {
  return parseBaseUrl(hugo(repo, ['config']));
}

/** Hugo gives a page with no date the zero time, which lists as year 0001. */
export function isUndated(page) {
  return !page.date || page.date.startsWith('0001-');
}

/** `/slides/foo/` -> `slides/foo`, the directory the route publishes into. */
export function subtreeOf(route) {
  return route.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** The file a route publishes. */
export function entryOf(route) {
  return `${subtreeOf(route)}/index.html`;
}

/** The routes Hugo rendered into `buildDir`: one per directory with a page. */
export function renderedRoutes(buildDir) {
  const suffix = 'index.html';
  return listFiles(buildDir)
    .filter((file) => file === suffix || file.endsWith('/' + suffix))
    .map((file) => '/' + file.slice(0, -suffix.length))
    .sort();
}

/**
 * Whether other rendered pages live beneath `route`, making it a listing rather
 * than a page of its own. A deck root is not one: its sections exist as content
 * but are never rendered.
 */
export function isListing(route, routes) {
  return routes.some((other) => other !== route && other.startsWith(route));
}

/** Titles carry commas, so the page listing needs real CSV parsing. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

/**
 * The content pages Hugo knows about, keyed by URL path. This is every content
 * file, including ones Hugo will not render; `renderedRoutes` on a build says
 * which of them are pages.
 */
export function pages(repo) {
  const rows = parseCsv(hugo(repo, ['list', 'all']));
  const header = rows.shift() ?? [];
  const at = (row, name) => row[header.indexOf(name)];
  const byRoute = new Map();
  for (const row of rows) {
    const permalink = at(row, 'permalink');
    if (!permalink) continue;
    const route = new URL(permalink).pathname;
    byRoute.set(route, {
      route,
      contentPath: at(row, 'path'),
      kind: at(row, 'kind'),
      date: at(row, 'date'),
      title: at(row, 'title'),
    });
  }
  return byRoute;
}
