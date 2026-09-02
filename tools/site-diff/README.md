# Visual Site Difference Tool

Compares any two of the blog's three deployments -- your local `hugo server`,
the staging bucket, and the live site -- and reports every way they render
differently. It exists so that a change to styles, layouts, or templates can be
checked against what is already published before it goes live.

```bash
# In one terminal:
hugo server

# In another, from the repo root:
./site-diff.sh                                  # local vs live
./site-diff.sh --source=local --target=staging  # pre-flight before promoting
./site-diff.sh --source=staging --target=live   # what promoting would change
```

The result is a single self-contained `report.html`. It embeds its own images,
so it can be copied off a headless machine and opened anywhere:

```bash
scp <host>:~/src/blog/tools/site-diff/report.html .
```

Each run also prints an ephemeral link to an uploaded copy of the report, so
usually no copying is needed at all; see below.

Exit codes: `0` clean, `1` something differs, `2` the tool could not do its job
(bad arguments, nothing to compare, a route it failed to capture). The last one
matters -- a green run and a broken run must never look alike.

## Layout of the code

|                                                    |                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `site-diff.js`                                     | Arguments, route discovery, the worker pool, and what each route's views are. |
| `lib/capture.js`                                   | Browser setup and everything that makes a screenshot reproducible.            |
| `lib/probe.js`                                     | What a page says about itself: fonts, images, head, geometry, text.           |
| `lib/analyze.js`                                   | Two captures in, findings out. Pure, and the bulk of the tests.               |
| `lib/report.js`                                    | The single-file HTML report.                                                  |
| `lib/share.js`                                     | The secret-gist upload, its view link, and expiry.                            |
| `lib/findings.js`                                  | Finding and entry shapes, severity order, the worker pool.                    |
| `lib/feeds.js`, `lib/routes.js`, `lib/linediff.js` | Feeds, sitemap and origins, line diffing.                                     |

## What it checks

Screenshots are the obvious part, but they are bad at explaining themselves: a
third-of-a-pixel change in one image's height re-rasterizes every glyph below it
and shows up as thousands of scattered differences that look like font
corruption. So alongside the pixels, each page is probed directly.

|               |                                                                                                                                                                                                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fonts**     | Every `@font-face` is loaded and checked. Reports faces that load on one origin but not the other, custom families that fall back, and CSS that resolves to a different font stack.                                                                                                                                               |
| **Images**    | Same-origin bytes are hashed, along with intrinsic size, rendered size and `alt`. Every `srcset` candidate is hashed, not only the one this viewport selects, since the others never appear in a screenshot. Cross-origin images are blocked, so only their URLs are compared.                                                    |
| **Head**      | An allowlist: canonical, RSS autodiscovery, icons, manifest, viewport, robots, charset, `<title>` and `lang`. Not the whole head, because production builds emit OpenGraph and schema.org metadata that development builds do not.                                                                                                |
| **Layout**    | Element geometry to fractional pixels, plus link targets and element ids, which change nothing visually. When a page repaints, the tool names the innermost element that changed size rather than blaming `<body>`. Capped at 4000 elements, `<head>` excluded, and for decks this runs per slide only once a state has differed. |
| **Resources** | Failed requests, 4xx/5xx responses, and console errors present on one origin only. Compared with the origin stripped, so a failure on both sides cancels instead of being reported twice.                                                                                                                                         |
| **Text**      | Visible text, compared as a sequence, so reordering and repetition are caught and not just membership.                                                                                                                                                                                                                            |
| **Pixels**    | Zero-tolerance comparison, split into regions, with vertically displaced regions identified as moved rather than changed.                                                                                                                                                                                                         |
| **Views**     | Ordinary pages are captured four ways: desktop, a 390px phone, with the first link focused, and with it hovered. The last three are invisible to a single desktop screenshot, and a dropped focus ring or a broken mobile breakpoint is exactly the kind of thing that ships unnoticed.                                           |
| **Feeds**     | `sitemap.xml`, `/index.xml`, and `index.xml` under `tags`, `posts` and `slides`, normalized for host and timestamps.                                                                                                                                                                                                              |

Findings are ranked. `critical` means something is broken -- a font that loads
on one origin only, a changed image, a `noindex` that appeared, a page that
exists on one side. `major` means real content or layout changed. `minor` is
mostly pixel differences the structural probes already explained, which is how
one shifted element stays a single finding instead of two hundred.

Failures of the tool itself -- a navigation that timed out under load -- are not
findings. They are retried once, then reported as run notes, kept out of the
tally, and exit 2 rather than 1, so they can never be mistaken for a verdict
about the site.

## Why it is pixel-exact

Identical content produces byte-identical screenshots, so the tool needs no
pixel tolerance and never has to guess whether a difference is real. That
requires pinning everything that Chromium would otherwise let vary:

- Software rasterization only, with Skia's runtime CPU dispatch disabled.
- Grayscale antialiasing, no hinting, no subpixel glyph positioning.
- Progressive image decoding off, so a screenshot cannot catch a half-decoded
  image.
- All compositor stages run before the frame is drawn, rather than racing a
  deadline.
- Fixed viewport, device scale factor, color profile, locale, and timezone, with
  scrollbars hidden so their presence cannot change layout. The dark theme and
  reduced motion are pinned too, so the light theme is never compared.
- Full-page captures grow the viewport to the content and shoot that, rather
  than using Chromium's own full-page path. That path picks between two
  renderings of a tall page at load time and holds it, which made the same
  content differ in 6 captures out of 10 on a 19,656px post; growing the
  viewport measured 0 in 10 and produces identical pixels.
- Hugo's live-reload socket is blocked; otherwise the page never goes idle and a
  rebuild can swap content mid-capture.
- CSS transitions and animations are killed in the document from the first
  frame, not merely frozen for the duration of the screenshot, so nothing can be
  caught mid-flight.
- Third-party requests are blocked. The YouTube embeds in a couple of decks
  fetch on their own schedule and tear down mid-flight, so two loads genuinely
  differ. Nothing is lost by blocking them: the set of third-party URLs each
  page asks for is still compared, so a changed embed is still reported.
  `--allow-third-party` renders them at the cost of that determinism.

On top of that, no difference is reported without being confirmed. The two
origins are shot once and compared; agreeing byte for byte is a stronger
stability check than shooting either page twice, and it is also the fast path,
since nothing has to be decoded. Only when they disagree is each page shot again
to establish that it had settled, and a whole-page difference then has to
survive a fresh load of both origins before it is believed -- re-shooting alone
cannot catch a rendering that was chosen once at load. A page that will not
produce the same bytes twice is reported as unstable alongside the difference.

The goal is the user-visible effect of a change, not perfect change detection.
Things a reader can never observe are deliberately not compared: inline script
contents, response headers, and the rest of `<head>`. Those change for benign
reasons -- a rebuilt bundle, a cache-control tweak -- and a check that fires on
them is a check people learn to ignore.

Known gaps, for the same reason or because the cost is not yet worth it: the
light colour scheme is never rendered, high-DPI rasterization is never rendered
(though the responsive images it would select are hashed), and slide decks get
the desktop view only.

## Slide decks

reveal.js decks are walked state by state -- every slide, then every fragment
step within it -- with both origins driven to the same explicit coordinates.
Transitions, auto-advance, and auto-animate are switched off first.

That is thorough, and it is most of the run: the decks come to roughly 3,300
states. Use `--slides=slides` to visit only slide boundaries, or
`--slides=first` for just the title card, when iterating on something outside
the decks.

## Sharing a report

Every run uploads the finished report to a secret gist through the `gh` CLI and
prints a link that renders it in a browser, so a run on a headless box ends in a
URL rather than an scp. `--no-share` skips it, and a failed upload -- no `gh`,
no network -- is printed in the summary without touching the verdict or the exit
code, since the local report is written either way.

```
https://htmlpreview.github.io/?https://gist.githubusercontent.com/<user>/<id>/raw
```

The URL is printed alone on its own line, and the raw path omits the gist
filename (`/raw` serves the gist's only file): both exist so that the link
survives a terminal's line wrap, where a prefix or a longer tail ends up outside
what a click or copy picks up.

Secret gists have the sharing model wanted here: the URL embeds an unguessable
identifier, the gist appears in no public listing, and deleting it kills the
link within GitHub's five-minute edge cache. They are not access-controlled --
anyone holding the URL can read it -- which is the right trade for a report
about a public site.

The htmlpreview hop exists because GitHub serves raw gists as `text/plain` with
`nosniff`, so a browser will not render the report from the gist URL itself.
htmlpreview.github.io is a static page that fetches the raw gist and writes it
into the document. It was picked over the alternatives by testing all three at
real report sizes: the report's scripts execute there at 25MB and the report
bytes travel only to GitHub, where githack puts an ad-carrying interstitial on
every visit, and gistpreview stops executing scripts on files past the gist
API's 1MB truncation point.

Links expire on their own. Every share deletes previous report gists older than
seven days, recognized by the `[site-diff]` prefix this tool puts in their
descriptions; nothing else in the account is ever touched. The summary also
prints the `gh gist delete` command for revoking a link immediately.

## Speed

A full local-against-staging comparison is about 100 seconds on an 8-core
machine: 42 routes, ~3,300 deck states, ~460 seconds of work packed into six
route workers.

Both origins are driven in parallel, screenshots use the renderer's fast PNG
encoder, and the longest routes are dispatched first. Raising `--concurrency`
past the default does nothing -- measured 98s at 6, 101s at 8, 100s at 10,
because the machine is CPU-saturated rather than worker-starved, and the longest
single route (61s) is well inside the wall time. What remains is per-state cost:
a slide state is a browser round trip to change slides, one to settle, and one
to screenshot. Fewer states is the only large lever, which is what `--slides`
offers.

## Options

```
--source=<env|url>    What you are testing.         (default: local)
--target=<env|url>    What you are testing against. (default: live)
--slides=<mode>       fragments | slides | first | none  (default: fragments)
--routes=<substr>     Only compare routes containing this substring.
--concurrency=<n>     Routes compared in parallel.
--out=<path>          Report path.                  (default: report.html)
--max-embed-mb=<n>    Cap on inlined report images. (default: 24)
--no-feeds            Skip RSS/sitemap comparison.
--no-share            Skip the secret-gist upload and its ephemeral link.
--allow-third-party   Let embeds load. They render nondeterministically.
--keep-screenshots    Write every differing capture to screenshots/.
```

`--source` and `--target` accept `local`, `staging`, `live`, or any URL, so a
one-off deployment can be compared without editing anything.

Two limits are not adjustable. Retained comparison images are capped at 512MB,
after which findings are still recorded but their images are not; the report
says so in its footer. `--max-embed-mb` then caps what is inlined into the
report, and anything dropped is named there too.

## Tests

```bash
npm test
```

`node:test`, no test dependency. It covers the pure functions -- the pixel
banding and displacement detection, argument validation, line diffing, sitemap
entity decoding, and the severity each kind of probe difference earns. The
browser-facing code is a determinism configuration whose correctness is only
observable against a real site, so it is checked by running the tool rather than
by mocking Playwright.

## Setup

`./site-diff.sh` installs the npm dependencies and downloads the pinned Chromium
build on first run. On Fedora, Chromium also needs a few system libraries that
are not installed by default:

```bash
sudo dnf install atk at-spi2-atk at-spi2-core libXcomposite libXdamage libXfixes cups-libs
```

## Known site issue

The sitemap advertises a `/slides/<deck>/<section>/` URL for every section of
every deck, and none of them are built -- roughly a hundred 404s, consistently
on all three deployments. The tool skips them and notes the count, but the
sitemap template is worth fixing.
