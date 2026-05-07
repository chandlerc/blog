import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

let source = 'local';
let target = 'live';

// We use a lot of concurrency here as there are a lot of delays and other async
// operations that can very effectively use this to complete the diff
// computation faster.
let concurrency = Math.max(4, os.cpus().length * 4);

// Simple CLI Argument Parser
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--source=')) {
    source = arg.split('=')[1];
  } else if (arg.startsWith('--target=')) {
    target = arg.split('=')[1];
  } else if (arg.startsWith('--local-url=')) {
    source = arg.split('=')[1];
  } else if (arg.startsWith('--live-url=')) {
    target = arg.split('=')[1];
  } else if (arg.startsWith('--concurrency=')) {
    concurrency = parseInt(arg.split('=')[1], 10);
  }
}

const envs = {
  local: 'http://localhost:1313',
  staging: 'http://staging.chandlerc.blog',
  live: 'https://chandlerc.blog',
};

const sourceUrl = envs[source] || source;
const targetUrl = envs[target] || target;

async function getUrlsFromSitemap(sitemapUrl) {
  console.log(`Fetching sitemap from ${sitemapUrl}...`);
  try {
    const response = await fetch(sitemapUrl, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const urls = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(text)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  } catch (err) {
    console.error(`\n[Error] Could not fetch the sitemap from ${sitemapUrl}`);
    console.error(
      `Make sure that your Hugo server is running locally via \`hugo server\`.`
    );
    console.error(`Original error: ${err.message}`);
    process.exit(1);
  }
}

function getFilenameForRoute(routeUrl) {
  const urlObj = new URL(routeUrl);
  const cleanRoute = urlObj.pathname.replace(/^\/|\/$/g, '');
  if (cleanRoute === '') {
    return 'index.png';
  }
  return cleanRoute.replace(/\//g, '_') + '.png';
}

async function captureScreenshot(page, url, outputPath) {
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      // Block livereload requests to prevent intermittent background behavior
      await page.route('**/livereload.js*', (route) => route.abort());

      await page.goto(url, { waitUntil: 'networkidle' });

      // Inject style tag to disable all transitions and animations globally
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            transition: none !important;
            animation: none !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
          }
        `
      });

      // Preload all declared font faces instantly
      await page.evaluate(async () => {
        const fontPromises = [];
        for (const font of document.fonts.values()) {
          fontPromises.push(
            document.fonts.load(`${font.style} ${font.weight} 1em "${font.family}"`)
          );
        }
        await Promise.all(fontPromises);
      });
      await page.evaluate(() => document.fonts.ready);

      // Short timeout to allow dynamic/delayed resources to render completely
      await page.waitForTimeout(10);

      const isReveal = await page.evaluate(() => {
        return (
          typeof Reveal !== 'undefined' &&
          typeof Reveal.isReady === 'function' &&
          Reveal.isReady()
        );
      });

      if (isReveal) {
        await page.evaluate(() => {
          Reveal.configure({
            transition: 'none',
            backgroundTransition: 'none',
            autoAnimate: false
          });
          // Disable auto-advance events and classes to prevent mid-flight fragments
          Reveal.off('slidechanged');
          document.querySelectorAll('.auto-advance').forEach((el) => {
            el.classList.remove('auto-advance');
          });
        });
        await page.evaluate(() => document.fonts.ready);
        const totalSlides = await page.evaluate(() => Reveal.getTotalSlides());
        for (let i = 0; i < totalSlides; i++) {
          await page.evaluate((idx) => Reveal.slide(idx), i);
          await page.evaluate(async () => {
            const fontPromises = [];
            for (const font of document.fonts.values()) {
              fontPromises.push(
                document.fonts.load(`${font.style} ${font.weight} 1em "${font.family}"`)
              );
            }
            await Promise.all(fontPromises);
          });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(10);
          const slidePath = outputPath.replace('.png', `_slide${i}.png`);
          await page.screenshot({ path: slidePath, fullPage: false });
        }
      } else {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: outputPath, fullPage: true });
      }
      // Success!
      return;
    } catch (err) {
      console.error(
        `    [Warning] Attempt ${attempt}/${maxRetries} failed for ${url}:`,
        err.message
      );
      if (attempt >= maxRetries) {
        throw err;
      }
      await page.waitForTimeout(100);
    }
  }
}

async function pMap(items, concurrency, fn) {
  const inFlight = new Set();
  for (const item of items) {
    if (inFlight.size >= concurrency) {
      await Promise.race(inFlight);
    }
    const p = (async () => {
      await fn(item);
    })().then(() => inFlight.delete(p));
    inFlight.add(p);
  }
  return Promise.all(inFlight);
}

async function main() {
  const sitemapUrl = `${sourceUrl}/sitemap.xml`;
  const urls = (await getUrlsFromSitemap(sitemapUrl)).map((u) =>
    u.startsWith('/') ? new URL(u, sourceUrl).toString() : u
  );

  console.log(`\nDiscovered ${urls.length} routes from local sitemap.\n`);

  const screenshotsDir = path.resolve('screenshots');
  const actualDir = path.join(screenshotsDir, 'actual');
  const expectedDir = path.join(screenshotsDir, 'expected');
  const diffDir = path.join(screenshotsDir, 'diff');
  const reportFile = path.resolve('report.html');

  // Ensure empty/clean screenshot directories
  fs.rmSync(screenshotsDir, { recursive: true, force: true });
  fs.mkdirSync(actualDir, { recursive: true });
  fs.mkdirSync(expectedDir, { recursive: true });
  fs.mkdirSync(diffDir, { recursive: true });

  console.log(`Launching browser with ${concurrency} workers...`);
  const browser = await chromium.launch();

  console.log(
    '\nTaking screenshots of LOCAL and LIVE site routes in parallel...'
  );
  await pMap(urls, concurrency, async (sitemapUrlStr) => {
    const filename = getFilenameForRoute(sitemapUrlStr);
    const routePath = new URL(sitemapUrlStr).pathname;

    const cb = Date.now();
    const currentLocalUrl = new URL(
      `${routePath}?cb=${cb}`,
      sourceUrl
    ).toString();
    const currentLiveUrl = new URL(
      `${routePath}?cb=${cb}`,
      targetUrl
    ).toString();

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });

    await captureScreenshot(
      page,
      currentLocalUrl,
      path.join(actualDir, filename)
    );
    await captureScreenshot(
      page,
      currentLiveUrl,
      path.join(expectedDir, filename)
    );

    await page.close();
    console.log(`  Processed route: ${routePath}`);
  });

  await browser.close();
  console.log('\nBrowser closed.');

  console.log('\nInvoking reg-cli to visually compare screenshots...');
  try {
    execSync(
      `npx reg-cli "${actualDir}" "${expectedDir}" "${diffDir}" -R "${reportFile}"`,
      { stdio: 'inherit' }
    );
    console.log(
      '\nNo visual differences detected! The site matches the live version perfectly.'
    );
  } catch (error) {
    // reg-cli exits with status code 1 if differences are detected.
    // That is expected if they differ.
    console.log('\nVisual differences detected.');
  }

  console.log('\nComparing XML files...');
  const xmlUrls = ['/sitemap.xml', '/index.xml'];
  for (const localUrlStr of urls) {
    const routePath = new URL(localUrlStr).pathname;
    if (routePath !== '/') {
      if (
        routePath.startsWith('/tags/') ||
        routePath.startsWith('/posts/') ||
        routePath.startsWith('/slides/')
      ) {
        xmlUrls.push(
          new URL('index.xml', new URL(routePath, sourceUrl)).pathname
        );
      }
    }
  }

  const uniqueXmlUrls = [...new Set(xmlUrls)];
  const xmlResults = [];
  await pMap(uniqueXmlUrls, concurrency, async (xmlRoute) => {
    const res = await compareXmlRoute(xmlRoute);
    xmlResults.push(res);
    if (res.status === 'changed') {
      console.log(`✘ XML changed: ${xmlRoute}`);
    } else if (res.status === 'error') {
      console.log(`⚠ XML error: ${xmlRoute} (${res.error})`);
    } else if (res.status === 'passed') {
      console.log(`✔ XML passed: ${xmlRoute}`);
    }
  });

  const changedXmls = xmlResults.filter((r) => r.status === 'changed');
  if (changedXmls.length > 0) {
    console.log('\n--- XML Differences Found ---');
    for (const changed of changedXmls) {
      console.log(`\nDiff for ${changed.routePath}:`);
      console.log(changed.diff);
    }
  }

  console.log(
    '\n-----------------------------------------------------------------'
  );
  console.log(`Visual Diff Report generated!`);
  console.log(`View Report: file://${reportFile}`);
  console.log(
    '-----------------------------------------------------------------\n'
  );
}

function normalizeXml(xmlText) {
  const allSiteUrls = [
    'http://localhost:1313',
    'http://staging.chandlerc.blog',
    'https://chandlerc.blog',
  ];

  let cleaned = xmlText;
  for (const url of allSiteUrls) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escapedUrl, 'g'), '');
  }

  const escapedSource = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedTarget = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  cleaned = cleaned
    .replace(new RegExp(escapedSource, 'g'), '')
    .replace(new RegExp(escapedTarget, 'g'), '');

  return cleaned
    .replace(/<lastmod>.*?<\/lastmod>/g, '<lastmod>__NORMALIZED__</lastmod>')
    .replace(/<pubDate>.*?<\/pubDate>/g, '<pubDate>__NORMALIZED__</pubDate>')
    .replace(
      /<generator>.*?<\/generator>/g,
      '<generator>__NORMALIZED__</generator>'
    )
    .replace(/<atom:link href=".*?"/g, '<atom:link href="__NORMALIZED__"')
    .replace(/<guid>.*?<\/guid>/g, '<guid>__NORMALIZED__</guid>')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

async function compareXmlRoute(routePath) {
  const localXmlUrl = new URL(routePath, sourceUrl).toString();
  const liveXmlUrl = new URL(routePath, targetUrl).toString();

  try {
    const cb = Date.now();
    const localRes = await fetch(`${localXmlUrl}?cb=${cb}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const liveRes = await fetch(`${liveXmlUrl}?cb=${cb}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });

    if (localRes.status === 404 && liveRes.status === 404) {
      return { routePath, status: 'skipped' };
    }

    if (!localRes.ok || !liveRes.ok) {
      return {
        routePath,
        status: 'error',
        error: `HTTP ${localRes.status} vs ${liveRes.status}`,
      };
    }

    const localText = normalizeXml(await localRes.text());
    const liveText = normalizeXml(await liveRes.text());

    if (localText !== liveText) {
      // Write both to temporary files
      const tempLocalFile = path.join(
        os.tmpdir(),
        `local_${routePath.replace(/\//g, '_')}.xml`
      );
      const tempLiveFile = path.join(
        os.tmpdir(),
        `live_${routePath.replace(/\//g, '_')}.xml`
      );

      fs.writeFileSync(tempLocalFile, localText);
      fs.writeFileSync(tempLiveFile, liveText);

      let diffTool = 'diff -u';
      try {
        execSync('which delta', { stdio: 'ignore' });
        diffTool = 'delta';
      } catch (e) {
        // delta not found, fallback to diff -u
      }

      let unifiedDiff = '';
      try {
        unifiedDiff = execSync(
          `${diffTool} "${tempLiveFile}" "${tempLocalFile}"`
        ).toString();
      } catch (err) {
        // diff or delta exits with non-zero code if different
        unifiedDiff = err.stdout ? err.stdout.toString() : err.message;
      }

      fs.rmSync(tempLocalFile, { force: true });
      fs.rmSync(tempLiveFile, { force: true });

      return { routePath, status: 'changed', diff: unifiedDiff };
    }

    return { routePath, status: 'passed' };
  } catch (err) {
    return { routePath, status: 'error', error: err.message };
  }
}

main().catch((err) => {
  console.error('\nFatal Error during comparison:', err.message);
  process.exit(1);
});
