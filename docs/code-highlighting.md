# Build-time code highlighting

Every code block on the site is highlighted before Hugo runs, by `tools/hl`,
and reveal.js highlight steps on the slide decks are driven by annotations
written as comments in the snippet's own language. This documents the
annotation format and the build architecture.

## Why

Code used to be highlighted in the browser with highlight.js, and a deck's
highlight steps were backtick markers inside the code that a regex rewrote
into fragment spans after highlighting. The markers made every snippet
invalid in its own language, so nothing could compile, format, or check it;
the regex ran over already highlighted HTML and mis-nested whenever the
tokenizer split a marker; ranges could not overlap or span lines; and every
explicit step index had to be renumbered by hand when a step moved.

The design here has these goals:

-   Highlight at build time and ship final HTML with no highlighting JS.
-   Keep annotated snippets valid code: annotations are comments.
-   Support overlapping and out-of-order ranges, multi-line ranges, several
    simultaneous ranges, and coordinated steps across the snippets on one
    slide, without renumbering when a step is added or removed.
-   Keep grammars updatable ahead of upstream, since Carbon changes faster
    than any bundled grammar.

The annotation syntax is defined per language through that language's comment
syntax; it is not meant to survive in arbitrary text.

## Part 1: The annotation format

### Model

A *snippet* is a block of code plus annotations. Annotations define *ranges*
(regions of the code) grouped into *steps*. A step is one moment in the
reveal.js fragment sequence: all ranges in a step highlight together, and each
step becomes one `data-fragment-index` value. Steps are scoped to a *slide*:
every snippet between two slide separators shares one step namespace and one
index sequence.

The build strips every annotation line before highlighting; none appears in
the rendered snippet.

### Annotation lines and rulers

An annotation line is a full-line comment carrying the annotation sigil: an
`@` directly after the comment leader, the reserved-character comment form the
Carbon toolchain uses for test directives like `//@dump-sem-ir-begin`. A line
is an annotation only when it has the sigil *and* a ruler, and that
combination is what keeps recognition unambiguous:

-   Without the sigil, ruler lookalikes are ordinary comments and get no
    diagnostic: quoted compiler output (`//       ^^^^^^`), `^----` in prose,
    `-- ^ The thing` field docs.
-   With the sigil but no leading ruler glyph (`^` or `<`), the line is
    ordinary code, so real reserved-comment directives pass through.
-   With the sigil and a ruler that fails to parse, the line is a hard error:
    the intent was unambiguous, so nothing is silently dropped.

A ruler marks a range on the *anchor line*, the nearest preceding line that is
not itself an annotation line, so consecutive annotation lines stack under one
code line, each describing another range on it.

```cpp
auto MyFunction() -> bool;
//@  ^-----------
//@            ^-
//@            ^----
```

-   `^` followed by zero or more `-` marks a range. Columns are WYSIWYG: the
    range starts at the caret's column in the anchor line and covers one
    column per ruler character. Above: `MyFunction()`, then `()`, then
    `() ->`. A bare `^` marks one column.
-   A trailing `~` extends the range to the end of the anchor line: `//@ ^~`
    is "from this column to end of line". A `~` at or past the end of the
    line degrades to one virtual column.
-   `<` in place of the caret handles ranges starting in the leftmost
    columns, which the leader and sigil occupy on the annotation line, so no
    drawing can express a range starting there. Its non-numeric extents
    anchor to the anchor line's first non-space column, its text start:
    -   Bare `<` covers the anchor's first whitespace-delimited word: `//@<`
        underlines `fn` in `fn SomeFunction();` and `x` in `  x += y;`, and
        keeps covering the identifier if it is renamed.
    -   `<` with dashes ends at the last ruler character, WYSIWYG: over
        `  x.push_back(4000);`, `  //@<-------------` covers the call.
    -   `<~` extends to end of line, covering the whole line's text.

    Numeric coordinates are 1-based editor columns counted from the start of
    the line regardless of indentation, so they transcribe directly from an
    editor's column display or a compiler diagnostic:
    -   `<L` covers columns 1 through L: `//@<1` underlines the receiver `x`
        in `x.PushBack(4000);`.
    -   An `S+` prefix starts at column S and composes with a length, dashes,
        or `~`, though not with the bare word form: `//@<2+2` underlines `bc`
        in `abcd`, and `//@<7+1` underlines `x` in `  var x: ...`.

    `<` must be the first ruler on its line.
-   `^^` marks whole lines instead of a column range: the entire anchor line,
    or with a count, the N lines ending at the anchor line (`^^3`), counted
    in stripped output lines so interleaved annotation lines do not count.
    Whole-line ranges render in the line style described below, and `^^`
    cannot combine with other rulers on one line.

Several rulers may share one annotation line, separated by whitespace by
convention; they form one step, so the ranges highlight simultaneously:

```carbon
fn Swap(ref x: i32, ref y: i32) {
//@     ^--------   ^--------
```

A ruler may extend past the end of the anchor line, including on a blank
line. The build pads the rendered line with spaces inside the highlight span,
so a step can point at nothing.

Columns are counted in display cells: emoji and CJK characters count as the
two cells editors render them as (`⚠️`, with its variation selector,
included), so visually aligned rulers stay aligned. A ruler boundary in the
middle of a double-width character is an error. Tabs make WYSIWYG columns
undefined, so a snippet containing both tabs and annotations is an error; tabs
without annotations are fine.

### Metadata: naming, joining, pinning, notes

After the last ruler, an annotation line may carry whitespace-separated
metadata tokens, then an optional note:

-   `#name` names the step (ASCII letters, digits, `_`, `-`). Every
    annotation with the same `#name` in the same slide joins the same step,
    across lines and across snippets. This is how distinct ranges highlight
    simultaneously and how side-by-side snippets coordinate.
-   `+` joins this line's ranges to the step of the immediately preceding
    annotation in the same snippet, without naming it. `+` cannot combine
    with `#name` or `@N` on the same line.
-   `@N` pins the step's `data-fragment-index` to the literal integer N, to
    synchronize with handwritten `<div class="fragment"
    data-fragment-index=...>` elements elsewhere on the slide, or to force an
    order document order cannot express.
-   `: text` attaches a free-form note through end of line. With several
    rulers on the line the note attaches to the first range, and a range
    split across lines or by an overlap carries it on its first span only.
    Notes reach the output as a `data-note` attribute, unused by current
    styling and reserved for rendered callouts. Bare trailing text without
    the `:` is a parse error, and so a build error on a sigiled line.

```carbon
var x: buf(i32) = (1, 20, 300);
//@    ^-------  #alloc : buf allocates storage
var p: i32* = &x[0];
//@ ^---------
x.PushBack(4000);
//@<------------  #free @3
```

### Step ordering and index assignment

Steps order by the document position of their first mention, top to bottom
through the slide's content and across all of its snippets. Inserting an
annotation between existing ones inserts a step at that position, and nothing
else needs renumbering.

Fragment indices are assigned by walking the steps in order: a pinned step
takes its `@N`; an unpinned step takes one more than the previous step's
index, starting from 1. The common case of a code walkthrough synchronized
with a handwritten bullet list needs no `@N` at all: four steps in document
order get indices 1 through 4, matching bullets pinned 1 through 4. Two steps
both pinned to the same `@N` fire together without complaint; the tool warns
when an auto-assigned index collides with another step's, which is almost
always an authoring accident.

`@N` values are emitted literally, never renormalized, since handwritten
fragments elsewhere on the slide reference the same numbers.

### Comment leaders per language

The annotation leader is the language's line comment plus the sigil: `//@`
for Carbon, C++, and Rust; `#@` for shell and Python; and so on, configured
per language in the tool. A block with no language of its own, an unlabelled
fence or one marked `text`, has no comment syntax to borrow and takes `//@`
as well; the lines are stripped either way, so the leader only has to be
unambiguous. Only full-line comments are recognized; annotations never share
a line with code.

### Slide boundaries and unsupported constructs

The tool reads a page the way Hugo does: it stands a placeholder in for every
shortcode, as Hugo does before goldmark runs, then parses the result as
CommonMark with pulldown-cmark. The parser settles what a fence is, however
it is indented, quoted, or hidden in an HTML block or comment, and whether a
`---` is a thematic break or a setext heading underline. Steps scope to
slides, and reveal-hugo splits the rendered page on `<hr />`, so a slide
begins at every thematic break and at every `<hr>` or `<hr />` in raw HTML.

Two constructs are still errors: a fence inside a `{{% ... %}}` shortcode
body, which Hugo renders with its own ordinal sequence, and a fence that runs
to the end of the page without a closer. A stray carriage return in a fence
body is also an error. Fences inside `{{< ... >}}` shortcode bodies are
invisible to goldmark and are skipped.

### Diagnostics

Errors: a sigiled ruler that fails to parse for any reason (bad metadata,
trailing text, a `^^` count past the top of the snippet, a ruler boundary
inside a double-width character); an annotation before any code line; a
Rouge-style `lang{spec}` info string, which goldmark rejects with a cryptic
message of its own; tabs in annotated snippets; conflicting `@N` pins on one
step; `+` with no previous annotation; the unsupported constructs above; and
page-slug collisions in the generated data.

Warnings: auto-assigned fragment-index collisions; unknown or malformed fence
attributes; a language with no grammar; and an annotation in a language with
no configured comment leader.

The tool exits nonzero on warnings as well as errors, so none of this can
ship through a build. Un-sigiled ruler lookalikes and sigiled non-ruler
directives are not diagnosed at all: both are ordinary content.

## Part 2: Build architecture

### Constraints

Two facts about Hugo shape the architecture:

-   Hugo cannot do this natively and cannot be extended to. Chroma has no
    Carbon lexer, Hugo's maintainer declined custom-lexer support
    (gohugoio/hugo#11496), and Hugo has no way to run external code during
    content transformation. So highlighting runs in an external tool ahead of
    Hugo, and Hugo consumes its output as data.
-   Code block render hooks only fire with `markup.highlight.codeFences =
    true`, and with that enabled goldmark rejects the Rouge-style
    `` ```cpp{1-2|3} `` info strings the decks once used. Snippets are plain
    fences; line numbers are a fence attribute (below) and line-highlight
    steps are `^^` annotations.

### Pipeline overview

```
content/**.md ──┐
code/**        ─┤  tools/hl (Rust)
grammars       ─┘        │
                         ├──> gen/data/hl/<page-slug>.json
                         ├──> gen/data/hlcode/files.json
                         └──> gen/assets/css/hl/tokens.scss
                                  │   (gen/ is gitignored and mounted into
                                  │   Hugo's data and assets trees)
                                  ▼
     render-codeblock hook ── ordinal+hash lookup
     {{< snippet >}}       ── path+hash lookup
                                  │
                                  ▼
                          hugo / hugo server
```

The tool scans every content file for fenced code blocks and `snippet`
shortcodes, parses and strips annotations, highlights the clean code, injects
fragment spans, and writes one JSON file per content file mapping each code
block, by page ordinal and verified by a content hash, to rendered HTML, plus
one file mapping each included path to the same. The Hugo side is a code
block render hook plus a small shortcode, both pure lookups in the data tree.
A miss or hash mismatch is a build error naming the tool to run, softened to
a warning plus a visible placeholder under `hugo server` so editing stays
live: re-run the tool and Hugo picks up the change.

Generated outputs live under a single gitignored `gen/` directory, kept out
of the source `data/` and `assets/` trees and merged into them by Hugo module
mounts (in both `config/_default/module.toml` and
`config/production/module.toml`, because each environment's mount list
replaces the default wholesale). The data is not committed: the tool runs
before `hugo` in every build. Hugo tolerates the mounts when `gen/` is
absent, so a fresh checkout builds pages without code.

### Authoring surface

Snippets are ordinary fenced code blocks:

````
```carbon
var x: buf(i32) = (1, 20, 300);
//@    ^-------  #alloc
```
````

Fence attributes: `{ln=false}` disables line numbers, which are on by
default, and `{ln-start=N}` offsets them. Code included from a
file uses a shortcode sharing the same data, `{{< snippet
"/code/little_things/access_example1.cpp" >}}`, with the language taken from
the extension. Its lookup is by path rather than by ordinal, so a file
included twice is rendered once, and the two ordinal sequences Hugo keeps for
render hooks and for shortcodes never have to agree. Because annotations are
valid comments, a file-based snippet can be compiled and tested directly;
nothing about the file is blog-specific.

### Highlighting engine

The tool is a Rust binary built on [giallo](https://github.com/getzola/giallo),
a from-scratch Rust implementation of vscode-textmate written for Zola. It
consumes VS Code JSON TextMate grammars unmodified through Oniguruma,
implements the full grammar feature set (`while` rules, injections, `\G`
anchors), and is snapshot-tested upstream against vscode-textmate's output.
So `carbon.tmLanguage.json` loads exactly as VS Code uses it, a snippet
highlights on a slide the way it does in the editor, and updating Carbon
highlighting ahead of upstream means editing one vendored JSON file. C++,
Rust, C, and the rest come from giallo's bundled dump of shiki's grammar
collection, pinned by `Cargo.lock`. giallo is EUPL-1.2, copyleft, which is
fine for a build tool that is never distributed.

The tool drives giallo's tokenizer and serializes HTML itself, since fragment
injection, per-line spans, virtual-space padding, and emoji wrapping all
happen between tokenization and serialization. `Registry::highlight` returns
per-line vectors of tokens with resolved theme styles and is documented for
use with custom renderers. Token styles map to deduplicated CSS classes
(`.hl-tN`) in a stylesheet generated from giallo's dracula theme, the palette
the site's old highlight theme was built from, with one substitution: dracula's
comment grey is too dark to read from the back of a room, so comments keep the
lighter grey the site has always given them. The block's background is left
to the site's own stylesheets. giallo's own CSS-class mode cannot be reused
because the class ids it assigns are crate-private.

Alternatives considered: shiki (Node) is the reference implementation of this
architecture and remains the fallback if giallo proves unworkable, rejected
only to keep Node out of the build; syntect consumes Sublime syntaxes, and
converting a modern VS Code grammar is lossy; tree-sitter-highlight would work
with carbon-lang's tree-sitter grammar, but that grammar trails the language
and its output would diverge from what editors show; Chroma has no Carbon
lexer and Hugo could not consume one anyway.

### Fragment injection

Injection happens between tokenization and HTML serialization, on a token
stream with source offsets. For each line:

-   Text is cut at every token boundary and every range boundary; neither
    limits the other.
-   Ranges covering the line are decomposed at each other's boundaries; each
    contiguous segment becomes a `<span>` carrying its step's classes and
    index, nested where ranges overlap. A partial overlap A/B renders as
    `[A][A∩B nested][B]`, with B split across two elements sharing one
    `data-fragment-index` (reveal.js treats same-index fragments as one
    step). The continuation carries an `hl-cont` class so the arrow marker
    is drawn only at a range's start.
-   Multi-line ranges apply per line: each covered line gets its own span.
    Whole-line `^^N` ranges wrap each covered line's full content in a
    fragment span nested directly inside the line span, never on the line
    span itself, so overlapping line steps nest cleanly; the line style's CSS
    uses descendant `:has()` matching for exactly that reason.

Inline ranges emit `class="fragment highlight-code"` and reuse the
underline-and-arrow styling. Whole-line ranges emit `highlight-lines`, styled
as a background tint on the active lines with the block's other lines dimmed.
Emoji are wrapped in an `hl-emoji` span so they can take a font that has
glyphs for them.

### Rendered form and line numbers

A snippet renders as one `<pre class="hl">` with one `hl-l` span per line,
each containing its trailing newline so selection and copy preserve line
structure. Line numbers are CSS counters on those spans, enabled by an
`hl-num` class on the block, in a gutter as wide as the block's widest number
(`--hl-ln-digits`, set inline). Slides badge Carbon, C++, Rust, and Swift
blocks with a `data-lang` attribute the theme renders as a label. The
`<code>` element carries `nohighlight` and `data-noescape`, which any
client-side highlighter would honour.

Ordinary pages render the same blocks and differ only in what the tool puts
in them: no fragment spans and no badge. The structural styling lives in `assets/css/site.scss` for ordinary
pages and in the reveal custom theme for decks, and the generated token
stylesheet joins each one's bundle.

The old plugin scrolled a highlight into view in an overflowing block.
Nothing replaces that yet; slides so far fit their blocks.

### Grammar vendoring and updates

The Carbon grammar is vendored under `third_party/carbon-lang/`, with a
README recording the upstream commit, matching the site's other vendored
dependencies. Updating ahead of upstream means editing the vendored copy and
noting the divergence in that README; syncing from upstream is a copy plus
re-applying any local patches. Other languages come from the engine's bundled
grammar set and are pinned by the tool's lockfile.

### Verification

-   Unit tests in the tool cover the annotation grammar (`<` forms, `~`,
    `^^N`, stacked rulers, joins, pins, display-cell columns), the scanner
    (slide boundaries, shortcode and comment exclusion, fence edge cases),
    and the renderer (overlap decomposition, virtual-space padding, emoji
    wrapping, line-number gutters).
-   A corpus run over all content must be clean; it is exercised in every
    build.
-   Visual changes are checked with `site-diff` for ordinary pages, and for
    decks with a direct comparison of every fragment's order, step index,
    covered text, badge, and on-screen box against a build of the previous
    commit, which is what a migration has to preserve and what screenshots
    alone cannot explain once the colours change.

## Open questions

-   A step-name shortcode for prose (`{{% step alloc %}}`), so slides need no
    integer indices at all: deferred until the format has been exercised
    further in real decks.
-   Rendered notes (`: text` as on-slide callouts): reserved, not designed.
