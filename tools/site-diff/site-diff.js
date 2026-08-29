#!/usr/bin/env node
// Visual site difference tool. See README.md.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import {
  captureFullPage,
  configureReveal,
  confirmStable,
  focusFirstLink,
  gotoRoute,
  hoverFirstLink,
  isRevealDeck,
  launchBrowser,
  NARROW_VIEWPORT,
  newSiteContext,
  resetInteraction,
  restoreViewport,
  revealStates,
  screenshot,
  showRevealState,
  stateKey,
  stateLabel,
  useViewport,
  watchPage,
} from './lib/capture.js';
import { probeCurrentSlide, probeLayout, probePage } from './lib/probe.js';
import {
  comparePixels,
  compareProbes,
  cropRegion,
  cropWindow,
  describePixels,
  compareSlideLayout,
} from './lib/analyze.js';
import { entry, finding, note, pooled } from './lib/findings.js';
import {
  ENVIRONMENTS,
  fetchSitemapPaths,
  probeRoutes,
  resolveOrigin,
} from './lib/routes.js';
import { compareFeeds } from './lib/feeds.js';
import { writeReport } from './lib/report.js';
import { pruneShares, shareReport, SHARE_TTL_DAYS } from './lib/share.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const USAGE = `Usage: site-diff.sh [options]

  --source=<env|url>    What you are testing.       (default: local)
  --target=<env|url>    What you are testing against. (default: live)
  --slides=<mode>       fragments | slides | first | none  (default: fragments)
  --routes=<substr>     Only compare routes containing this substring.
  --concurrency=<n>     Routes compared in parallel.  (default: ${Math.max(2, Math.min(6, os.cpus().length - 2))})
  --out=<path>          Report path.                  (default: report.html)
  --max-embed-mb=<n>    Cap on inlined report images. (default: 24)
  --no-feeds            Skip RSS/sitemap comparison.
  --no-share            Skip the secret-gist upload and its ephemeral link.
  --allow-third-party   Let embeds load. They render nondeterministically.
  --keep-screenshots    Write every differing capture to screenshots/.

Environments: ${Object.keys(ENVIRONMENTS).join(', ')}, or any http(s) URL.
`;

export class UsageError extends Error {}

// A flag that silently parses to NaN is worse than one that is rejected: NaN
// concurrency spawns zero workers, and the run then reports that every page
// matched because it never compared any.
function positiveNumber(flag, value, { integer = false } = {}) {
  const parsed = integer ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new UsageError(`${flag} needs a positive number, got "${value}"`);
  }
  return parsed;
}

export function parseArgs(argv) {
  const options = {
    source: 'local',
    target: 'live',
    slides: 'fragments',
    routes: '',
    concurrency: Math.max(2, Math.min(6, os.cpus().length - 2)),
    out: path.join(HERE, 'report.html'),
    maxEmbedMb: 24,
    feeds: true,
    allowThirdParty: false,
    keepScreenshots: false,
    share: true,
  };
  for (const arg of argv) {
    const [key, value] = arg.includes('=')
      ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
      : [arg, ''];
    switch (key) {
      case '--source':
        options.source = value;
        break;
      case '--target':
        options.target = value;
        break;
      case '--slides':
        options.slides = value;
        break;
      case '--routes':
        options.routes = value;
        break;
      case '--concurrency':
        options.concurrency = positiveNumber(key, value, { integer: true });
        break;
      case '--out':
        if (!value) throw new UsageError('--out needs a path');
        options.out = path.resolve(value);
        break;
      case '--max-embed-mb':
        options.maxEmbedMb = positiveNumber(key, value);
        break;
      case '--no-feeds':
        options.feeds = false;
        break;
      case '--allow-third-party':
        options.allowThirdParty = true;
        break;
      case '--keep-screenshots':
        options.keepScreenshots = true;
        break;
      case '--no-share':
        options.share = false;
        break;
      case '--help':
      case '-h':
        return { ...options, help: true };
      default:
        throw new UsageError(`Unknown option: ${arg}`);
    }
  }
  if (!['fragments', 'slides', 'first', 'none'].includes(options.slides)) {
    throw new UsageError('--slides must be fragments, slides, first, or none');
  }
  // Better to find out now than after a five-minute run.
  if (fs.existsSync(options.out) && fs.statSync(options.out).isDirectory()) {
    throw new UsageError(`--out is a directory: ${options.out}`);
  }
  const outputDir = path.dirname(options.out);
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    throw new UsageError(`--out directory is not writable: ${outputDir}`);
  }
  return options;
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

// One route on both origins: navigate, probe, then capture and compare every
// view or slide state. Captures are compared as they are taken and dropped
// unless they differ, so a run of several thousand stays within a fixed memory
// budget.
async function compareRoute({
  routePath,
  sourceOrigin,
  targetOrigin,
  browser,
  options,
  screenshotsDir,
}) {
  const entries = [];
  const contexts = [];
  try {
    // Both origins are driven together throughout. Each step is a browser
    // round-trip that the other origin does not depend on, and serializing them
    // doubled the wall time of the whole run.
    const sides = await Promise.all(
      [sourceOrigin, targetOrigin].map(async (origin) => {
        const context = await newSiteContext(browser);
        contexts.push(context);
        const page = await context.newPage();
        const watched = await watchPage(page, origin, {
          allowThirdParty: options.allowThirdParty,
        });
        await gotoRoute(page, origin + routePath);
        return { page, watched, origin };
      })
    );
    const [source, target] = sides;

    const isDeck = await Promise.all(
      sides.map((side) => isRevealDeck(side.page))
    );
    await Promise.all(
      sides.map(async (side) => {
        side.probe = await probePage(side.page, side.origin);
        // Decks get their geometry per slide instead, and only once a state has
        // differed: walking every element of every slide would dominate the run.
        side.layout = isDeck[0]
          ? { layout: [], truncated: false }
          : await probeLayout(side.page, side.origin);
      })
    );

    const { findings: structural, layoutCause } = compareProbes(source, target);

    if (isDeck[0] !== isDeck[1]) {
      structural.push(
        finding(
          'critical',
          'layout',
          `Route is a reveal.js deck on ${isDeck[0] ? 'source' : 'target'} but not on the other`,
          'Slides were not walked; only the initial rendering was compared.'
        )
      );
    }

    // Reveal is neutered whenever the route is a deck, including under
    // `--slides=none`: auto-advance and auto-animate are live JS timers that no
    // stylesheet can freeze, so a deck captured without this is nondeterministic
    // however few states are captured.
    if (isDeck[0] && isDeck[1]) {
      await Promise.all(sides.map((side) => configureReveal(side.page)));
    }

    const deck = options.slides !== 'none' && isDeck[0] && isDeck[1];
    if (deck) {
      const [states, targetStates] = await Promise.all(
        sides.map((side) => revealStates(side.page))
      );

      // Match states by coordinate rather than by position. A slide added to
      // one deck would otherwise shift every later index and report the whole
      // deck as changed.
      const targetKeys = new Set(targetStates.map(stateKey));
      const shared = states.filter((state) => targetKeys.has(stateKey(state)));
      const sourceKeys = new Set(states.map(stateKey));
      const missing = targetStates.filter(
        (state) => !sourceKeys.has(stateKey(state))
      );
      if (shared.length !== states.length || missing.length) {
        structural.push(
          finding(
            'major',
            'layout',
            `Deck states differ: ${states.length} on source, ${targetStates.length} on target`,
            [
              ...states
                .filter((s) => !targetKeys.has(stateKey(s)))
                .slice(0, 10)
                .map((s) => `source only: ${stateLabel(s)}`),
              ...missing
                .slice(0, 10)
                .map((s) => `target only: ${stateLabel(s)}`),
            ].join('\n') +
              `\nThe ${shared.length} state(s) present on both were compared.`
          )
        );
      }

      const captureStates =
        options.slides === 'first'
          ? shared.slice(0, 1)
          : options.slides === 'slides'
            ? shared.filter((state) => state.f === -1)
            : shared;

      // Route-level findings ride along with the first state so they are not
      // reported once per slide.
      let pending = structural;
      for (const state of captureStates) {
        const findings = pending;
        pending = [];
        const result = await captureAndCompare(sides, { state });
        // Only worth probing once a state has actually differed.
        let stateCause = layoutCause;
        if (result) {
          const slideLayouts = await Promise.all(
            sides.map((side) => probeCurrentSlide(side.page, side.origin))
          );
          const explained = compareSlideLayout(...slideLayouts);
          findings.push(...explained.findings);
          stateCause = explained.layoutCause ?? layoutCause;
        }
        // Before pushEntry, which may release the images to bound memory.
        if (options.keepScreenshots && result?.pixels.changed) {
          saveScreenshots(
            screenshotsDir,
            `${routeSlug(routePath)}_${stateKey(state)}`,
            result
          );
        }
        pushEntry(
          entries,
          routePath,
          stateLabel(state),
          findings,
          result,
          stateCause
        );
      }
      if (pending.length)
        pushEntry(entries, routePath, '', pending, null, layoutCause);
    } else {
      // Route-level findings ride along with the first view rather than being
      // repeated for each one.
      let pending = structural;
      for (const view of PAGE_VIEWS) {
        const findings = pending;
        pending = [];
        const result = await captureAndCompare(sides, {
          view,
          routeUrl: routePath,
        });
        if (options.keepScreenshots && result?.pixels.changed) {
          saveScreenshots(
            screenshotsDir,
            `${routeSlug(routePath)}${view.name ? `_${routeSlug(view.name)}` : ''}`,
            result
          );
        }
        pushEntry(entries, routePath, view.name, findings, result, layoutCause);
      }
      if (pending.length)
        pushEntry(entries, routePath, '', pending, null, layoutCause);
    }
    for (const side of sides) {
      for (const url of side.watched.thirdParty) thirdPartySeen.add(url);
    }
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
  }
  return entries;
}

// Every third-party URL any page referenced, so blocking them is visible in the
// report rather than being a silent change in what was tested.
const thirdPartySeen = new Set();

// The ways an ordinary page is actually seen. Decks are excluded: they are
// fixed-size presentations with no responsive layout and no links to point at,
// and they are already most of the run.
const PAGE_VIEWS = [
  {
    name: '',
    fullPage: true,
    prepare: (page) => restoreViewport(page).then(() => resetInteraction(page)),
  },
  {
    name: 'narrow viewport',
    fullPage: true,
    prepare: (page) =>
      resetInteraction(page).then(() => useViewport(page, NARROW_VIEWPORT)),
  },
  {
    name: 'keyboard focus',
    fullPage: false,
    prepare: async (page) => {
      await restoreViewport(page);
      await focusFirstLink(page);
    },
  },
  {
    name: 'pointer hover',
    fullPage: false,
    prepare: async (page) => {
      await restoreViewport(page);
      return hoverFirstLink(page);
    },
  },
];

// Returns null when the two origins rendered the same bytes.
async function captureAndCompare(sides, { state, view, routeUrl }) {
  const capture = async (side) => {
    if (state) await showRevealState(side.page, state);
    if (view) await view.prepare(side.page);
    return (view?.fullPage ?? !state)
      ? captureFullPage(side.page)
      : screenshot(side.page);
  };

  const shots = await Promise.all(sides.map(capture));
  // Two independent renderings agreeing byte for byte is a stronger stability
  // check than shooting either page twice, and it skips decoding both PNGs.
  if (shots[0].equals(shots[1])) return null;

  // They disagree, so establish that each side had settled before calling it a
  // difference.
  const unstable = [];
  const confirmed = await Promise.all(
    sides.map((side, index) => confirmStable(side.page, shots[index]))
  );
  confirmed.forEach((result, index) => {
    shots[index] = result.buffer;
    if (!result.stable) unstable.push(index === 0 ? 'source' : 'target');
  });
  if (shots[0].equals(shots[1])) return null;

  // Re-shooting cannot catch a rendering that was chosen once at load and then
  // held, so a whole-page difference has to survive a fresh load of both
  // origins before it is believed. Deck states are exempt: they are driven
  // through hundreds of states per load, and reloading would cost more than the
  // difference is worth re-checking.
  if (routeUrl) {
    const reshot = await Promise.all(
      sides.map(async (side) => {
        // Loaded the same way it was the first time, or the second capture
        // means nothing.
        await restoreViewport(side.page);
        await gotoRoute(side.page, side.origin + routeUrl);
        return capture(side);
      })
    );
    if (reshot[0].equals(reshot[1])) return null;
    shots[0] = reshot[0];
    shots[1] = reshot[1];
  }

  return { pixels: comparePixels(shots[0], shots[1]), unstable };
}

// A decoded screenshot is four bytes a pixel, so one full-page pair of the
// tallest page here is 300MB. Entries are held until the report is written at
// the end of the run, so retention has to be bounded in bytes: a count cannot
// do it when a deck state is 12MB and a full page is 300MB.
const MAX_RETAINED_BYTES = 512 * 1024 * 1024;
let retainedBytes = 0;
let releasedVisuals = 0;

const decodedBytes = (png) => (png ? png.data.length : 0);

function pushEntry(entries, route, state, findings, result, layoutCause) {
  const all = [...findings];
  if (result) {
    if (result.unstable.length) {
      all.push(
        finding(
          'minor',
          'stability',
          `Rendering never settled on ${result.unstable.join(' and ')}`,
          'Repeated screenshots of the same state kept changing, so this comparison may be noisy.'
        )
      );
    }
    all.push(...describePixels(result.pixels, layoutCause));
  }
  if (!all.length) return;

  const pixels = result?.pixels ?? null;
  if (pixels?.images?.diff) {
    // Only the window the report will show is worth keeping. The rest of a
    // 19,000px capture is never rendered.
    const { top, height } = cropWindow(pixels.bands, pixels.height);
    const cropped = {
      a: cropRegion(pixels.images.a, top, height, pixels.width),
      b: cropRegion(pixels.images.b, top, height, pixels.width),
      diff: cropRegion(pixels.images.diff, top, height, pixels.width),
    };
    const cost =
      decodedBytes(cropped.a) +
      decodedBytes(cropped.b) +
      decodedBytes(cropped.diff);
    if (retainedBytes + cost <= MAX_RETAINED_BYTES) {
      retainedBytes += cost;
      pixels.images = cropped;
      pixels.cropTop = top;
    } else {
      pixels.images = { a: null, b: null, diff: null };
      releasedVisuals++;
    }
  }
  entries.push(entry(route, state, all, pixels));
}

const routeSlug = (routePath) =>
  routePath.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'index';

function saveScreenshots(dir, name, result) {
  for (const [suffix, image] of [
    ['source', result.pixels.images.a],
    ['target', result.pixels.images.b],
    ['diff', result.pixels.images.diff],
  ]) {
    if (image)
      fs.writeFileSync(
        path.join(dir, `${name}.${suffix}.png`),
        PNG.sync.write(image)
      );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const sourceOrigin = resolveOrigin(options.source);
  const targetOrigin = resolveOrigin(options.target);
  const startedAt = new Date();
  const startTime = Date.now();
  const notes = [];

  log(`Comparing ${sourceOrigin} (source) against ${targetOrigin} (target)\n`);

  let paths;
  try {
    paths = await fetchSitemapPaths(sourceOrigin);
  } catch (err) {
    process.stderr.write(
      `Could not read the sitemap from ${sourceOrigin}: ${err.message}\n` +
        (options.source === 'local' ? `Is \`hugo server\` running?\n` : '')
    );
    return 1;
  }
  if (options.routes)
    paths = paths.filter((routePath) => routePath.includes(options.routes));
  log(
    `Discovered ${paths.length} route(s); checking reachability on both origins...`
  );

  const probed = await probeRoutes(paths, sourceOrigin, targetOrigin, 16);
  const usable = probed.filter((r) => r.source === 200 && r.target === 200);
  const missingBoth = probed.filter(
    (r) => r.source === 404 && r.target === 404
  );
  const asymmetric = probed.filter(
    (r) =>
      !(r.source === 200 && r.target === 200) &&
      !(r.source === 404 && r.target === 404)
  );

  if (missingBoth.length) {
    notes.push(
      note(
        'routes',
        `${missingBoth.length} sitemap route(s) return 404 on both origins and were skipped`,
        `The sitemap advertises URLs that the site does not build. Not a regression, but ` +
          `worth fixing in the sitemap template.\n` +
          missingBoth
            .slice(0, 20)
            .map((r) => `  ${r.path}`)
            .join('\n') +
          (missingBoth.length > 20
            ? `\n  ... and ${missingBoth.length - 20} more`
            : '')
      )
    );
  }

  // `hugo server` builds drafts and omits the production-only <head> metadata,
  // which explains most of what an otherwise alarming route mismatch means.
  const devSides = [];
  for (const [label, origin] of [
    ['source', sourceOrigin],
    ['target', targetOrigin],
  ]) {
    const html = await fetch(origin + '/')
      .then((r) => r.text())
      .catch(() => '');
    if (html.includes('/livereload.js')) devSides.push(`${label} (${origin})`);
  }
  if (devSides.length && asymmetric.length) {
    notes.push(
      note(
        'environment',
        `${devSides.join(' and ')} is a \`hugo server\` dev build`,
        `Dev builds include drafts (\`-D\`) and omit the OpenGraph, Twitter, and schema.org ` +
          `metadata that production emits. Drafts are the usual reason a route resolves on one ` +
          `origin and 404s on the other. Only <body> is compared, so the missing <head> metadata ` +
          `does not itself produce findings.`
      )
    );
  }

  const entries = [];
  for (const route of asymmetric) {
    entries.push(
      entry(route.path, '', [
        finding(
          'critical',
          'status',
          `HTTP ${route.source || 'unreachable'} on source, ${route.target || 'unreachable'} on target`,
          'The route was not captured because it does not resolve the same way on both origins.'
        ),
      ])
    );
  }

  log(
    `  ${usable.length} comparable, ${missingBoth.length} absent from both, ${asymmetric.length} mismatched\n`
  );

  const screenshotsDir = path.join(HERE, 'screenshots');
  if (options.keepScreenshots) {
    fs.rmSync(screenshotsDir, { recursive: true, force: true });
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Longest first. A run cannot finish before its slowest route, and the decks
  // are minutes where an ordinary page is seconds; dispatching in sitemap order
  // leaves workers idle at the end waiting on one deck that started late. The
  // sitemap lists a URL per deck section, so counting those ranks the decks by
  // size without loading any of them.
  const weightOf = (routePath) =>
    paths.filter((other) => other !== routePath && other.startsWith(routePath))
      .length;
  usable.sort((a, b) => weightOf(b.path) - weightOf(a.path));

  const browser = await launchBrowser();
  const failures = [];
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < usable.length) {
      const route = usable[next++];
      const startedRoute = Date.now();
      const compare = () =>
        compareRoute({
          routePath: route.path,
          sourceOrigin,
          targetOrigin,
          browser,
          options,
          screenshotsDir,
        });
      try {
        try {
          entries.push(...(await compare()));
        } catch {
          entries.push(...(await compare()));
        }
      } catch (err) {
        // A timeout under load says nothing about the site. Retry once, and if
        // it fails again record it as the harness failing rather than as a
        // content regression, so it neither reddens the tally nor hides in it.
        failures.push({ route: route.path, message: err.message });
      }
      done++;
      const seconds = ((Date.now() - startedRoute) / 1000).toFixed(1);
      log(
        `  [${String(done).padStart(3)}/${usable.length}] ${String(seconds).padStart(5)}s  ${route.path}`
      );
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, usable.length) }, worker)
  );
  await browser.close();

  if (thirdPartySeen.size) {
    notes.push(
      note(
        'resource',
        `${thirdPartySeen.size} third-party URL(s) were ${options.allowThirdParty ? 'allowed to load' : 'blocked'}`,
        (options.allowThirdParty
          ? `Embeds loaded, so captures on these pages may differ run to run.\n`
          : `Embeds fetch on their own schedule and would make these pages differ run to ` +
            `run, so they were blocked. The URLs are still compared between origins, and a ` +
            `changed embed is reported. Pass --allow-third-party to render them.\n`) +
          [...thirdPartySeen]
            .sort()
            .slice(0, 20)
            .map((url) => `  ${url}`)
            .join('\n')
      )
    );
  }

  if (options.feeds) {
    log('\nComparing RSS feeds and sitemaps...');
    const feeds = await compareFeeds(paths, sourceOrigin, targetOrigin, 8);
    log(
      `  ${feeds.checked} feed(s) checked, ${feeds.results.length} differing`
    );
    for (const result of feeds.results) {
      entries.push(
        entry(result.path, '', [
          finding(result.severity, 'feed', result.summary, result.diff),
        ])
      );
    }
  }

  if (failures.length) {
    notes.push(
      note(
        'harness',
        `${failures.length} route(s) could not be captured`,
        `These are failures of this tool, not findings about the site, and they ` +
          `are not counted below. Whatever they would have reported is unknown.\n` +
          failures
            .map(
              ({ route, message }) => `  ${route}: ${message.split('\n')[0]}`
            )
            .join('\n')
      )
    );
  }

  const compared = done - failures.length;
  const report = writeReport({
    outputPath: options.out,
    sourceOrigin,
    targetOrigin,
    startedAt: startedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    durationMs: Date.now() - startTime,
    entries,
    notes,
    coverage: `${compared} of ${usable.length} route(s) compared`,
    releasedVisuals,
    maxEmbedBytes: options.maxEmbedMb * 1024 * 1024,
  });

  // Upload before the summary so the link lands inside it. A failed upload
  // must not cost the run: the local report is already written and the verdict
  // stands, so the failure is printed in the summary but changes nothing else.
  // Sharing is a default rather than a request, and a machine without gh set
  // up must not have every clean run exit as if the comparison had failed.
  let share = null;
  let shareError = null;
  if (options.share) {
    log('\nUploading the report to a secret gist...');
    try {
      share = await shareReport({
        reportPath: options.out,
        description: `${options.source} vs ${options.target}, ${startedAt.toISOString()}`,
      });
      const pruned = await pruneShares().catch(() => 0);
      if (pruned) log(`  Deleted ${pruned} expired shared report(s).`);
    } catch (err) {
      shareError = err.message.split('\n')[0];
    }
  }

  const counts = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const entry of entries) counts[entry.severity]++;

  log('\n-----------------------------------------------------------------');
  if (!entries.length) {
    log(
      `No differences found across ${compared} route(s). ` +
        `Every captured page matched pixel for pixel.`
    );
  } else {
    log(
      `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} with findings ` +
        `across ${compared} route(s): ${counts.critical} critical, ${counts.major} major, ` +
        `${counts.minor} minor, ${counts.info} info`
    );
  }
  if (failures.length) {
    log(
      `${failures.length} route(s) could not be captured; see the run notes.`
    );
  }
  if (releasedVisuals) {
    log(
      `${releasedVisuals} comparison(s) kept their findings but not their images ` +
        `(retained image memory is capped at ${MAX_RETAINED_BYTES / 1024 / 1024}MB).`
    );
  }
  if (report.dropped.length) {
    log(
      `${report.dropped.length} comparison(s) omitted from the report to stay under --max-embed-mb.`
    );
  }
  log(`Report: ${options.out} (${(report.bytes / 1024 / 1024).toFixed(1)} MB)`);
  log(`  scp ${os.hostname()}:${options.out} .`);
  if (share) {
    log(`View:   ${share.viewUrl}`);
    log(
      `  Backed by secret gist ${share.gistUrl}; auto-deleted after ` +
        `${SHARE_TTL_DAYS} days, or now with: gh gist delete ${share.id} --yes`
    );
  }
  if (shareError) {
    log(`Share:  FAILED: ${shareError}`);
    log(`  The report above is unaffected. Pass --no-share to skip uploading.`);
  }
  log('-----------------------------------------------------------------');

  // "Nothing differs" is only true if something was actually compared. An empty
  // route set and a clean site must not produce the same verdict.
  if (!compared) {
    process.stderr.write(
      usable.length
        ? '\nNo route was compared successfully. Treating this as a failure.\n'
        : '\nNo comparable routes. Check --routes, and that both origins serve the sitemap.\n'
    );
    return 2;
  }
  if (failures.length) return 2;
  return counts.critical || counts.major ? 1 : 0;
}

// Guarded so the tests can import parseArgs without starting a run. Setting
// exitCode rather than calling process.exit: the latter truncates stdout when
// it is a pipe, which loses the summary under `| tee`.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      if (err instanceof UsageError) {
        process.stderr.write(`${err.message}\n\n${USAGE}`);
        process.exitCode = 2;
        return;
      }
      process.stderr.write(`\nFatal error: ${err.stack || err.message}\n`);
      process.exitCode = 1;
    });
}
