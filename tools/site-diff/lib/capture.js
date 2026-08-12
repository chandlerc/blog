// Browser setup and screenshot capture.
//
// Everything here exists to make two loads of the same content produce
// byte-identical PNGs. Chromium is deterministic enough to hit that exactly, so
// the tool never needs a pixel tolerance and never has to guess whether a
// difference is real.

import { chromium } from 'playwright';

const VIEWPORT = { width: 1280, height: 800 };

// Rasterization is the only part of Chromium that is allowed to vary run to
// run, so pin every input to it. Notably absent: --deterministic-mode. It
// implies --enable-begin-frame-control, which expects an external frame driver
// and wedges the renderer under Playwright.
const LAUNCH_ARGS = [
  // Software raster only. GPU raster results depend on the driver and on
  // whether a tile happened to be promoted to its own layer.
  '--disable-gpu',
  '--disable-gpu-rasterization',
  '--disable-partial-raster',
  // Skia otherwise picks code paths from runtime CPU feature detection.
  '--disable-skia-runtime-opts',
  // Grayscale antialiasing with no hinting or subpixel positioning: glyph
  // rasterization then depends only on the glyph and its integer position.
  '--disable-lcd-text',
  '--font-render-hinting=none',
  '--disable-font-subpixel-positioning',
  '--force-color-profile=srgb',
  '--force-device-scale-factor=1',
  // Scrollbars are chrome, not content, and their presence changes layout.
  '--hide-scrollbars',
  // Paint the whole frame before the screenshot rather than racing a deadline.
  '--run-all-compositor-stages-before-draw',
  '--disable-new-content-rendering-timeout',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  // Progressive image decoding: without this a screenshot can catch a
  // half-decoded image, which is the classic "image rendering artifact".
  '--disable-checker-imaging',
  '--disable-image-animation-resync',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--js-flags=--random-seed=42',
];

export async function launchBrowser() {
  return chromium.launch({ args: LAUNCH_ARGS });
}

// Playwright's `animations: 'disabled'` only freezes animations for the
// duration of a screenshot, which is not enough: reveal.js transitions the
// transform that scales a deck to the viewport, and a transition caught
// mid-flight settles at a sub-pixel offset that then rasterizes one line of
// text differently. Transitions are killed in the document from the first
// frame instead.
const FREEZE_CSS = `
*, *::before, *::after {
  transition: none !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  caret-color: transparent !important;
}
html { scroll-behavior: auto !important; }
`;

export async function newSiteContext(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  await context.addInitScript((css) => {
    const install = () => {
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.head || document.documentElement) install();
    else document.addEventListener('DOMContentLoaded', install);
  }, FREEZE_CSS);
  return context;
}

// Requests this tool blocks itself. Reporting them as failures would flag every
// page served by `hugo server` as broken.
const LIVERELOAD = /\/livereload\.js(\?|$)/;

const mayLoad = (url, origin) =>
  url.startsWith(`${origin}/`) ||
  url === origin ||
  /^(data|blob|about):/.test(url);

// Watch a page, and by default cut it off from other origins.
//
// Third-party embeds (the YouTube iframes in some decks) fetch on their own
// schedule and tear down mid-flight, so two loads of the same page genuinely
// differ. Blocking them makes the capture deterministic without losing
// coverage: the set of third-party URLs the page *asked* for is recorded and
// compared, so an embed that changes is still caught.
export async function watchPage(
  page,
  origin,
  { allowThirdParty = false } = {}
) {
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  const thirdParty = new Set();

  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (LIVERELOAD.test(url)) return route.abort();
    if (mayLoad(url, origin)) return route.continue();
    try {
      const parsed = new URL(url);
      thirdParty.add(parsed.origin + parsed.pathname);
    } catch {
      thirdParty.add(url.slice(0, 200));
    }
    return allowThirdParty ? route.continue() : route.abort();
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const from = msg.location()?.url || '';
    if (LIVERELOAD.test(from) || !mayLoad(from, origin)) return;
    consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    // Our own aborts, and anything we deliberately cut off.
    if (LIVERELOAD.test(req.url()) || !mayLoad(req.url(), origin)) return;
    failedRequests.push(
      `${req.method()} ${req.url()} (${req.failure()?.errorText})`
    );
  });
  page.on('response', (res) => {
    if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
  });
  return {
    consoleErrors,
    badResponses,
    thirdParty,
    // A 4xx also surfaces as a failed request once its consumer -- a font
    // loader, say -- rejects it. Report the status, which is the more useful
    // half, and drop the duplicate.
    get failedRequests() {
      const rejected = badResponses.map((entry) =>
        entry.slice(entry.indexOf(' ') + 1)
      );
      return failedRequests.filter(
        (entry) => !rejected.some((url) => entry.includes(url))
      );
    },
  };
}

// Bring the page to a state where nothing further will change what it paints.
async function settle(page) {
  await page.evaluate(async () => {
    // document.fonts.ready only covers faces already requested, so ask for
    // every declared face first. A face that never resolves here is a real
    // finding, and the probe reports it rather than silently painting fallback.
    await Promise.all(
      [...document.fonts.values()].map((face) =>
        document.fonts
          .load(`${face.style} ${face.weight} 1em "${face.family}"`)
          .catch(() => {})
      )
    );
    await document.fonts.ready;

    // Lazy images below the fold never load on their own during a full-page
    // screenshot, and a merely "loaded" image may still be undecoded.
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = 'eager';
        try {
          await img.decode();
        } catch {
          // Broken images are caught by the probe; don't block the capture.
        }
      })
    );

    // Two frames: one to commit any layout the above forced, one to paint it.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
  });
}

export async function gotoRoute(page, url) {
  const response = await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await settle(page);
  return response;
}

// Screenshots go through CDP rather than page.screenshot so the renderer can
// use its fast PNG encoder. The bytes never leave this process -- they are
// compared and dropped -- so trading compression for speed is free, and PNG is
// lossless either way, which is what the comparison depends on. Playwright's
// `animations: 'disabled'` and `caret: 'hide'` are not available here and are
// not needed: FREEZE_CSS already does both, from the first frame.
const cdpSessions = new WeakMap();

async function screenshotSession(page) {
  let session = cdpSessions.get(page);
  if (!session) {
    session = await page.context().newCDPSession(page);
    cdpSessions.set(page, session);
  }
  return session;
}

export async function screenshot(page) {
  const session = await screenshotSession(page);
  const { data } = await session.send('Page.captureScreenshot', {
    format: 'png',
    optimizeForSpeed: true,
  });
  return Buffer.from(data, 'base64');
}

// Chromium's own full-page capture path picks between two renderings of a tall
// page at load time and then sticks with it, so the same content screenshots
// differently roughly half the time. It snaps a box edge that lands on a
// fractional pixel -- on this site, one row at y=7227 of a 19,656px post -- to
// whichever side won. Growing the viewport to the content instead removes the
// choice: measured 0 mismatches in 10 against 6 in 10 for `fullPage: true`,
// and pixel-identical output on every route checked.
const MAX_VIEWPORT_HEIGHT = 32000;

export async function captureFullPage(page) {
  const width = page.viewportSize().width;
  const documentHeight = () =>
    page.evaluate(() => document.documentElement.scrollHeight);

  // `min-height: 100vh` makes the height a function of the viewport, so resizing
  // can change it. total = max(content, viewport) has a fixed point, and in
  // practice it is reached immediately; the loop just refuses to assume that.
  let height = await documentHeight();
  for (let i = 0; i < 3; i++) {
    if (height > MAX_VIEWPORT_HEIGHT) break;
    await page.setViewportSize({ width, height });
    await settle(page);
    const settled = await documentHeight();
    if (settled === height) break;
    height = settled;
  }
  return screenshot(page);
}

export async function restoreViewport(page) {
  await page.setViewportSize(VIEWPORT);
}

// A phone, narrow enough to be under the site's smallest breakpoint. The device
// scale factor stays at 1: a reader's phone renders at 2 or 3, but changing it
// changes rasterization, and the responsive images a high-DPI screen would pick
// are hashed by the probe rather than rendered.
export const NARROW_VIEWPORT = { width: 390, height: 844 };

export async function useViewport(page, viewport) {
  await page.setViewportSize(viewport);
  await settle(page);
}

// Put the page back in its resting state. Views run in sequence on one page, so
// a hover left over from the previous view would leak into the next one.
export async function resetInteraction(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
}

// The first link a reader would tab to or point at. Both states are invisible
// to an ordinary screenshot, and removing their styling is the most common
// thing a CSS reset does by accident.
const CONTENT_LINK = 'main a[href], article a[href], .post-content a[href]';

export async function focusFirstLink(page) {
  await resetInteraction(page);
  await page.keyboard.press('Tab');
  await settle(page);
}

// Moving the mouse rather than using locator.hover, which waits for the element
// to be actionable and times out when something overlaps it. Nothing here needs
// the link to be clickable, only hovered, and restricting the choice to a link
// already on screen keeps the capture from scrolling.
export async function hoverFirstLink(page) {
  await resetInteraction(page);
  const point = await page.evaluate((selector) => {
    for (const el of document.querySelectorAll(selector)) {
      const rect = el.getBoundingClientRect();
      const onScreen =
        rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 4;
      if (onScreen) {
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
    }
    return null;
  }, CONTENT_LINK);
  if (!point) return false;
  await page.mouse.move(point.x, point.y);
  await settle(page);
  return true;
}

// Shoot the page again to establish that it has stopped changing. Anything that
// slipped past `settle` surfaces here as instability on one page rather than as
// a phantom difference between the two sites.
const STABILITY_ATTEMPTS = 3;

export async function confirmStable(page, previous) {
  for (let i = 0; i < STABILITY_ATTEMPTS; i++) {
    const next = await screenshot(page);
    if (next.equals(previous)) return { buffer: next, stable: true };
    previous = next;
    await settle(page);
  }
  return { buffer: previous, stable: false };
}

// --- reveal.js decks ---------------------------------------------------------

export async function isRevealDeck(page) {
  return page.evaluate(
    () =>
      typeof Reveal !== 'undefined' &&
      typeof Reveal.isReady === 'function' &&
      Reveal.isReady()
  );
}

// Strip the deck of anything time-based or animated. Without this a deck can
// auto-advance between the two captures of the same state.
export async function configureReveal(page) {
  await page.evaluate(() => {
    // Only the time-based and animated behaviour. Anything that changes what
    // the deck renders -- the progress bar, for one -- is left alone, or a
    // regression in it could never be seen.
    Reveal.configure({
      transition: 'none',
      backgroundTransition: 'none',
      autoAnimate: false,
      autoSlide: 0,
      autoSlideStoppable: true,
      loop: false,
      mouseWheel: false,
      hideInactiveCursor: false,
    });
    document
      .querySelectorAll('.auto-advance')
      .forEach((el) => el.classList.remove('auto-advance'));
  });
}

// Every distinct thing the deck can show: each slide, then each of its fragment
// steps. Driving both origins to explicit (h, v, f) coordinates keeps them in
// lockstep even if one of them has gained or lost a slide.
export async function revealStates(page) {
  return page.evaluate(() =>
    Reveal.getSlides().flatMap((slide) => {
      // getIndices omits v for slides that are not in a vertical stack.
      const { h, v = 0 } = Reveal.getIndices(slide);
      const fragments = [
        ...new Set(
          [...slide.querySelectorAll('.fragment')]
            .map((el) => el.getAttribute('data-fragment-index'))
            .filter((index) => index !== null)
            .map(Number)
        ),
      ].sort((a, b) => a - b);
      return [{ h, v, f: -1 }, ...fragments.map((f) => ({ h, v, f }))];
    })
  );
}

export async function showRevealState(page, { h, v, f }) {
  await page.evaluate(
    ([slideH, slideV, fragment]) => Reveal.slide(slideH, slideV, fragment),
    [h, v, f]
  );
  await settle(page);
}

export function stateLabel({ h, v, f }) {
  return `slide ${h}.${v}${f >= 0 ? ` fragment ${f}` : ''}`;
}

export function stateKey({ h, v, f }) {
  return `h${h}v${v}f${f}`;
}
