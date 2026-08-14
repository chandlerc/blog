#!/usr/bin/env node
// Freeze a published URL so it serves the same bytes forever. See README.md.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { check } from './lib/check.js';
import { freeze, thaw, withContentPaths } from './lib/freeze.js';
import {
  build,
  isListing,
  isUndated,
  pages,
  renderedRoutes,
} from './lib/hugo.js';
import { readManifest } from './lib/manifest.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const USAGE = `Usage: ./archive.sh <command> [options]

  freeze <route|pattern>...   Capture routes, retire their source, and stop
                              Hugo rendering them.
  thaw <route>...             Drop routes' placeholders and reclaim their files.
                              Their source comes back from version control.
  check                       Verify every frozen URL still serves as archived.
  list                        Show what is frozen.

Options:
  --before=<YYYY-MM-DD>   With freeze, only pages published before this date.
                          A page without a date counts as older than any date.
  --available             With list, show the pages that could be frozen.

A pattern may use '*'. Routes are URL paths, as in /slides/2023-cppnow-compiler/.
`;

function parseArguments(argv) {
  const options = { before: null, available: false };
  const positional = [];
  for (const argument of argv) {
    const flag = /^--([a-z-]+)(?:=(.*))?$/.exec(argument);
    if (!flag) {
      positional.push(argument);
      continue;
    }
    const [, name, value] = flag;
    if (name === 'before' && value) options.before = value;
    else if (name === 'available') options.available = true;
    else if (name === 'help') return { command: 'help', positional, options };
    else throw new Error(`Unknown option: ${argument}`);
  }
  return { command: positional.shift(), positional, options };
}

function matcherFor(pattern) {
  return new RegExp(
    '^' +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\/?$/, '/?') +
      '$'
  );
}

/**
 * Expand routes and patterns against the pages Hugo knows. A route named
 * outright is marked, so `partition` can reject one Hugo does not render
 * rather than drop it.
 */
function selectRoutes(patterns, known, options) {
  const routes = [...known.keys()];
  const selected = new Map();
  for (const pattern of patterns) {
    const matches = routes.filter((route) => matcherFor(pattern).test(route));
    if (matches.length === 0) throw new Error(`No page matches ${pattern}`);
    const explicit = !pattern.includes('*');
    for (const route of matches)
      selected.set(route, explicit || selected.get(route) === true);
  }
  let chosen = [...selected.keys()].sort();
  if (options.before) {
    const cutoff = new Date(options.before);
    if (Number.isNaN(cutoff.getTime()))
      throw new Error(`Not a date: ${options.before}`);
    chosen = chosen.filter((route) => {
      const page = known.get(route);
      return isUndated(page) || new Date(page.date) < cutoff;
    });
  }
  return chosen.map((route) => ({ route, explicit: selected.get(route) }));
}

function commandFreeze(positional, options, log) {
  if (positional.length === 0) throw new Error('freeze needs a route');
  const known = pages(REPO);
  const selected = selectRoutes(positional, known, options);
  if (selected.length === 0) {
    log('Nothing to freeze.');
    return 0;
  }
  freeze(REPO, withContentPaths(selected, known), { log });
  return commandCheck(log);
}

function commandThaw(positional, log) {
  if (positional.length === 0) throw new Error('thaw needs a route');
  const manifest = readManifest(REPO);
  const frozen = manifest.routes.map((entry) => entry.route);
  const routes = positional.flatMap((pattern) =>
    frozen.filter((route) => matcherFor(pattern).test(route))
  );
  if (routes.length === 0) throw new Error('No frozen route matches');
  thaw(REPO, [...new Set(routes)], { log });
  return commandCheck(log);
}

function commandCheck(log) {
  const result = check(REPO, { log });
  if (result.problems.length) {
    log(`\n${result.problems.length} problem(s):`);
    for (const problem of result.problems) log(`  ${problem}`);
    return 1;
  }
  log(
    `\nArchive is sound: ${result.routes} frozen route(s), ` +
      `${result.files} file(s), no references outside the tree.`
  );
  return 0;
}

/** The pages Hugo renders in their own right that are not already frozen. */
function listAvailable(log) {
  const known = pages(REPO);
  const frozen = new Set(readManifest(REPO).routes.map((entry) => entry.route));
  const built = build(REPO, { frozen: '', label: 'available' });
  let routes;
  try {
    routes = renderedRoutes(built.dir);
  } finally {
    built.dispose();
  }
  const available = routes
    .filter(
      (route) =>
        known.has(route) && !frozen.has(route) && !isListing(route, routes)
    )
    .sort();
  for (const route of available) {
    const page = known.get(route);
    const date = isUndated(page) ? 'undated' : page.date.slice(0, 10);
    log(`${date.padEnd(11)}${route}`);
  }
}

function commandList(options, log) {
  if (options.available) {
    listAvailable(log);
    return 0;
  }
  const manifest = readManifest(REPO);
  if (manifest.routes.length === 0) {
    log('Nothing is frozen.');
    return 0;
  }
  for (const entry of manifest.routes) {
    log(`${entry.frozen}  ${entry.route}`);
    log(
      `             ${entry.files.length} files, captured with ${entry.hugo}`
    );
    if (entry.external.length)
      log(
        `             ${entry.external.length} external reference(s) it cannot freeze`
      );
  }
  return 0;
}

function main(argv) {
  const { command, positional, options } = parseArguments(argv);
  const log = (message) => console.log(message);
  switch (command) {
    case 'freeze':
      return commandFreeze(positional, options, log);
    case 'thaw':
      return commandThaw(positional, log);
    case 'check':
      return commandCheck(log);
    case 'list':
      return commandList(options, log);
    case 'help':
    case undefined:
      log(USAGE);
      return command ? 0 : 2;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`archive: ${error.message}`);
  process.exitCode = 2;
}
