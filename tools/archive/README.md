# Archive Tool

Freezes a published URL. What the URL serves from then on is a fixed set of
files under `archive/site/`, captured from the build that last rendered the
page, so the site can be rebuilt, restyled, or upgraded without touching it.

```bash
./archive.sh freeze /slides/2023-cppnow-compiler/   # capture one deck
./archive.sh freeze '/slides/*' --before=2025-09-04 # capture a whole vintage
./archive.sh check                                  # verify every frozen URL
./archive.sh list                                   # what is frozen
./archive.sh list --available                       # what could be
./archive.sh thaw /slides/2023-cppnow-compiler/     # give one back to Hugo
```

Exit codes: `0` sound, `1` something is wrong with the archive, `2` the tool
could not do its job.

A pattern selects only pages. Deck sections, which Hugo folds into their deck
rather than rendering, are skipped, as is any route with pages published beneath
it, since freezing a listing would pin a list that grows. Naming either outright
is an error. `--before` counts an undated page as older than any date and says
so in the output.

## Why

A page's rendering used to be a function of the current theme, stylesheet
pipeline, and reveal.js version, so improving any of those changed every page
ever published. Freezing breaks that link. The captured bytes stop depending on
the build, and the page's source leaves `content/`, out of reach of anything
that edits or regenerates content there.

## What ends up in the archive

`archive/site/` is a plain tree rooted at the site root, mounted into Hugo's
`static` so an ordinary build publishes it. It is also a site on its own: copy
it into a bucket and every frozen URL works, with no generator involved.

Every file a page needs is copied into the tree, so nothing it loads depends on
Hugo still publishing that file. Three rules decide only what the copy is
called.

|                                    |                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inside the page's own subtree**  | Archived where it stood, so a link straight at an image still resolves.                                                                           |
| **Path already names its content** | Archived where it stood, which leaves the markup and its `integrity` attribute alone. Hugo fingerprints stylesheets, scripts, and fonts this way. |
| **Everything else**                | Archived at `_a/<sha256>.<ext>`, with the references to it rewritten.                                                                             |

The third case is eight files across the ten frozen decks: reveal.js, its four
plugins, `object-assign.js`, `reset.css`, and `reveal.css`. A reveal.js upgrade
would otherwise replace them underneath a frozen deck. A frozen post adds the
four favicons.

A path counts as naming its content only when hashing the bytes reproduces the
hash in the path, so a filename that merely looks fingerprinted does not.

One other kind of reference is rewritten: a URL written against the site's own
domain, which production markup emits for a post's cover image. It becomes the
relative path it would otherwise have had, leaving the tree independent of the
domain as well as of the build.

The store is shared, so a second deck frozen at the same site revision costs
only its own slides. Ten decks come to 79 files and 26.5 MB, mostly their own
images moved out of `content/` and fonts the repository already had under
`third_party/`. New objects come to 2.5 MB.

## How a URL stops being generated

Hugo's output beats a static file at the same path, so a freeze retires the
page's source. Its content directory becomes a single generated placeholder
holding the title, date, aliases, and tags that lists and the sitemap read, a
summary saying the page is archived, and build settings under which Hugo renders
nothing for the page and publishes nothing beside it.

The page therefore keeps its permalink and its entries in listings, feeds, and
`sitemap.xml`, while nothing under its route comes from the build. Its source
stays in version control, in the commit that froze it.

The listing entry is the only visible change: the archived-page summary stands
in for the page's own, and the word count goes. Everything else a build produces
is unchanged apart from whitespace in the other decks' pages, which reveal-hugo
lays out by iterating over deck sections that no longer exist.

## thaw

`thaw` deletes the placeholder and reclaims the archived files. It does not
restore the source; the commit that froze the page has it, and the tool prints
that. Changing a frozen page means thawing, restoring, editing, and freezing
again.

## What it cannot freeze

**Third-party embeds.** A YouTube iframe is fetched from YouTube at view time.
The manifest records the URLs a page depends on and `list` reports the count, so
which pages have a dependency that will eventually rot stays visible.

**References that were already broken.** A reference the live site never
satisfied is recorded per route and preserved as the 404 it always was.

**Hyperlinks.** Navigation, canonical URLs, and feed autodiscovery still point
at the live site. A frozen page is a frozen rendering, not a copy of the blog.

**A list entry that needs the page's resources.** A post's cover image is a page
resource and the placeholder has none, so its listing entry would lose the
cover. No deck has such an entry; a post would need the listing template to look
elsewhere first.

## check

`check` runs after every freeze and thaw. From one build of the site it
establishes:

|                    |                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Self-contained** | Every reference inside the archive resolves inside the archive.                                                                                 |
| **Owned**          | Hugo publishes nothing under a frozen route, whether from a placeholder that lost its build settings or from source that came back.             |
| **Listed**         | Every frozen route still has its placeholder and its sitemap entry.                                                                             |
| **Unshadowed**     | Where Hugo still publishes a path the archive also holds, the bytes agree. Losing that overlap is harmless, since the archive has its own copy. |
| **Complete**       | Every file the manifest lists is present, and nothing is present that nothing lists.                                                            |

Each was confirmed by breaking it. Deleting a store file, stripping a
placeholder of its build settings, deleting a placeholder, and tampering with an
archived font are all reported; a sound archive reports none of them.

## Proving a freeze changed nothing

`check` is structural. For the visual claim, compare builds from before and
after the freeze with the site-diff tool:

```bash
hugo --environment production -d /tmp/before   # before freezing
./archive.sh freeze ...
hugo --environment production -d /tmp/after
python3 -m http.server 8081 --directory /tmp/before &
python3 -m http.server 8082 --directory /tmp/after &
./site-diff.sh --source=http://127.0.0.1:8082 --target=http://127.0.0.1:8081
```

Freezing ten decks changed the ten listing entries and nothing else, across
every slide and every fragment step of every deck.

The stronger test serves `archive/site/` alone, with no Hugo output behind it.
The tree carries no sitemap, so give the copy one listing the frozen URLs:

```bash
./site-diff.sh --source=http://127.0.0.1:8083 --target=http://127.0.0.1:8081 \
    --routes=/slides/ --no-feeds
```

Every deck rendered identically from the bare tree, through every state, with no
failed request. That tests self-containment through a browser rather than the
scanner, so it also covers what the scanner cannot see, such as a script
choosing at runtime what to load.

## Layout of the code

|                                  |                                                                          |
| -------------------------------- | ------------------------------------------------------------------------ |
| `archive.js`                     | Arguments, route patterns, and the four commands.                        |
| `lib/scan.js`                    | Which references in a document are subresources, and where to edit them. |
| `lib/closure.js`                 | What a page reaches, transitively, through markup and stylesheets.       |
| `lib/store.js`                   | Where each captured file lands.                                          |
| `lib/freeze.js`                  | Capture, placement, rewriting, retiring, and reclaiming.                 |
| `lib/placeholder.js`             | The file a frozen page leaves behind in `content/`.                      |
| `lib/check.js`                   | The five properties above.                                               |
| `lib/manifest.js`                | The manifest.                                                            |
| `lib/hugo.js`                    | Running Hugo, and how routes map onto the files it writes.               |
| `layouts/index.archivemeta.json` | Page metadata for the placeholder, rendered only into a capture build.   |

A capture build differs from an ordinary one in two ways. The archive mount
points at an empty directory, so what gets captured is Hugo's own output rather
than a previous archive served back, and an output format added to the home page
writes every page's title, date, aliases, and tags as JSON for the placeholder.
Both live in the build's scratch config, so the site's own config never learns
about them.

## Tests

```bash
npm test
```

`node:test`, no dependencies -- the tool has none either. The tests cover the
pure parts: subresource scanning and rewriting, content-addressed detection and
placement, reading `hugo config`, which routes a build renders and which a
pattern may not freeze, and what a placeholder carries. The Hugo-facing parts
are checked by running the tool, which is what `check` is for.
