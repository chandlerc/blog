//! Parsing of highlight annotations embedded in snippet comments.
//!
//! See `docs/code-highlighting.md` for the format. An annotation line is a
//! full-line comment marked with the `@` sigil directly after the comment
//! leader (`//@`, the reserved-character special-comment form the Carbon
//! toolchain uses for test directives) whose body is one or more rulers
//! followed by optional metadata. The combination is what disambiguates:
//! un-sigiled ruler lookalikes (quoted compiler diagnostics, `^----` in
//! prose) are ordinary comments, sigiled non-ruler bodies
//! (`//@dump-sem-ir-begin`) are ordinary code, and a sigiled ruler that
//! fails to parse is a hard error. Annotation lines are stripped from the
//! snippet, and their rulers become ranges over the stripped code.
//!
//! Ruler columns are WYSIWYG display cells (emoji and CJK count as their
//! rendered width), converted to grapheme indices against the anchor line at
//! parse time; `Range` stores grapheme indices.

use std::collections::HashMap;

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

/// A half-open span of grapheme indices on one stripped line, or a
/// whole-line span over a range of stripped lines.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Range {
    Inline {
        line: usize,
        start_col: usize,
        end_col: usize,
    },
    Lines {
        first: usize,
        last: usize,
    },
}

/// One annotation line: its ranges plus metadata.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Annot {
    pub ranges: Vec<Range>,
    pub name: Option<String>,
    pub pin: Option<u32>,
    pub join_prev: bool,
    pub note: Option<String>,
    /// 1-based line in the snippet source, for diagnostics.
    pub src_line: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Warning,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Lint {
    pub severity: Severity,
    pub src_line: usize,
    pub message: String,
}

/// The result of parsing one snippet: the stripped code and its annotations.
#[derive(Debug, Default)]
pub struct SnippetAnnotations {
    pub code: String,
    pub annots: Vec<Annot>,
    pub lints: Vec<Lint>,
}

/// Every line-comment leader an annotation can follow.
const LEADERS: [&str; 3] = ["//", "#", "--"];

/// The line-comment leader for a language, or None if the language has no
/// annotation support (its snippets pass through unannotated). Languages are
/// matched case-insensitively, as the highlighter does.
pub fn comment_leader(lang: &str) -> Option<&'static str> {
    match lang.to_lowercase().as_str() {
        "carbon" | "cpp" | "c" | "c++" | "rust" | "java" | "javascript" | "js" | "typescript"
        | "ts" | "go" | "swift" | "csharp" | "cs" | "semir" => Some("//"),
        "python" | "py" | "bash" | "sh" | "shell" | "fish" | "yaml" | "toml" | "make" => Some("#"),
        "sql" | "lua" | "haskell" => Some("--"),
        // A block with no language of its own still needs a leader to carry
        // annotations. The lines are stripped either way, so the choice only
        // has to be unambiguous.
        "" | "text" | "plain" => Some("//"),
        _ => None,
    }
}

/// The body of a sigiled comment that can only be an annotation: the sigil
/// directly follows the leader and the body opens with a ruler glyph. Sigiled
/// directives such as `//@dump-sem-ir-begin` do not qualify and stay code.
fn annotation_body<'a>(line: &'a str, leader: &str) -> Option<&'a str> {
    let body = line
        .trim_start_matches(' ')
        .strip_prefix(leader)?
        .strip_prefix('@')?;
    let ruler = body.trim_start_matches(' ');
    (ruler.starts_with('^') || ruler.starts_with('<')).then_some(body)
}

/// Whether a line is an annotation under any known leader, for warning about
/// annotations in languages that have no annotation support.
pub fn looks_like_annotation(line: &str) -> bool {
    LEADERS
        .iter()
        .any(|leader| annotation_body(line, leader).is_some())
}

pub fn parse_snippet(src: &str, leader: &str) -> SnippetAnnotations {
    let mut out = SnippetAnnotations::default();
    let mut stripped: Vec<&str> = Vec::new();

    for (i, line) in src.lines().enumerate() {
        let src_line = i + 1;
        if annotation_body(line, leader).is_none() {
            stripped.push(line);
            continue;
        }
        let parsed = match stripped.last() {
            None => Err("annotation before any code line".to_string()),
            Some(anchor) => parse_annotation(line, leader, anchor, stripped.len() - 1, src_line),
        };
        match parsed {
            Ok(annot) => out.annots.push(annot),
            Err(message) => {
                // The sigil makes the intent unambiguous, so a failed parse
                // is a hard error; the line stays in the snippet as code so
                // the output remains usable while fixing it.
                out.lints.push(Lint {
                    severity: Severity::Error,
                    src_line,
                    message,
                });
                stripped.push(line);
            }
        }
    }

    // WYSIWYG columns cannot be defined for tabs, so annotated snippets must
    // not contain them at all.
    if !out.annots.is_empty()
        && let Some(i) = src.lines().position(|l| l.contains('\t'))
    {
        out.lints.push(Lint {
            severity: Severity::Error,
            src_line: i + 1,
            message: "annotated snippets must not contain tabs".to_string(),
        });
    }

    out.code = stripped.join("\n");
    if src.ends_with('\n') && !out.code.is_empty() {
        out.code.push('\n');
    }
    out
}

/// Maps display cells to grapheme indices on the anchor line, padding past
/// the end of the line with one virtual cell per grapheme.
struct AnchorMap {
    /// Per grapheme: starting display cell.
    starts: Vec<usize>,
    total_width: usize,
}

impl AnchorMap {
    fn new(anchor: &str) -> Self {
        let mut starts = Vec::new();
        let mut col = 0;
        for g in anchor.graphemes(true) {
            starts.push(col);
            col += UnicodeWidthStr::width(g);
        }
        Self {
            starts,
            total_width: col,
        }
    }

    /// Grapheme index for a display cell, with `true` when the cell lands
    /// strictly inside a wide grapheme (floor semantics).
    fn grapheme_at(&self, cell: usize) -> (usize, bool) {
        if cell >= self.total_width {
            return (self.starts.len() + (cell - self.total_width), false);
        }
        match self.starts.binary_search(&cell) {
            Ok(i) => (i, false),
            Err(i) => (i - 1, true),
        }
    }

    /// The range for a display cell span, snapping boundaries that land
    /// inside a wide glyph outward and recording that they did.
    fn range(
        &self,
        line: usize,
        start_cell: usize,
        end_cell: usize,
        mid_glyph: &mut bool,
    ) -> Range {
        let (start_col, inside_start) = self.grapheme_at(start_cell);
        let (end_raw, inside_end) = self.grapheme_at(end_cell);
        let end_col = if inside_end { end_raw + 1 } else { end_raw };
        *mid_glyph |= inside_start || inside_end;
        Range::Inline {
            line,
            start_col,
            end_col: end_col.max(start_col + 1),
        }
    }
}

/// Display cell just past the anchor's first whitespace-delimited word,
/// counting from its text start.
fn word_end_cell(anchor: &str, text_start: usize) -> usize {
    let mut cell = 0;
    for g in anchor.graphemes(true) {
        if cell >= text_start && g == " " {
            return cell;
        }
        cell += UnicodeWidthStr::width(g);
    }
    cell
}

/// A cursor over the graphemes of an annotation line. Every ruler glyph is
/// single-cell ASCII, so a position past the sigil is also the display cell
/// it sits above on the anchor line.
struct Cursor<'a> {
    graphemes: Vec<&'a str>,
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn peek(&self) -> &'a str {
        self.graphemes.get(self.pos).copied().unwrap_or("")
    }

    fn eat(&mut self, g: &str) -> bool {
        let matched = self.peek() == g;
        if matched {
            self.pos += 1;
        }
        matched
    }

    fn eat_all(&mut self, g: &str) -> usize {
        let start = self.pos;
        while self.eat(g) {}
        self.pos - start
    }

    /// A run of ASCII digits as a number, or None when none follows.
    fn number(&mut self) -> Result<Option<usize>, String> {
        let start = self.pos;
        while self
            .peek()
            .bytes()
            .next()
            .is_some_and(|b| b.is_ascii_digit())
        {
            self.pos += 1;
        }
        if self.pos == start {
            return Ok(None);
        }
        let digits: String = self.graphemes[start..self.pos].concat();
        digits
            .parse()
            .map(Some)
            .map_err(|_| format!("number `{digits}` is out of range"))
    }

    /// Everything up to the next space.
    fn word(&mut self) -> String {
        let start = self.pos;
        while !self.peek().is_empty() && self.peek() != " " {
            self.pos += 1;
        }
        self.graphemes[start..self.pos].concat()
    }

    fn rest(&self) -> String {
        self.graphemes[self.pos..].concat()
    }
}

/// Parses the annotation grammar over the full line, after the sigil.
fn parse_annotation(
    line: &str,
    leader: &str,
    anchor: &str,
    anchor_line: usize,
    src_line: usize,
) -> Result<Annot, String> {
    let indent = line.len() - line.trim_start_matches(' ').len();
    // The indent, leader, and sigil are ASCII, so their byte length is their
    // grapheme count.
    let mut cur = Cursor {
        graphemes: line.graphemes(true).collect(),
        pos: indent + leader.len() + 1,
    };
    let map = AnchorMap::new(anchor);
    let mut annot = Annot {
        ranges: Vec::new(),
        name: None,
        pin: None,
        join_prev: false,
        note: None,
        src_line,
    };
    let mut mid_glyph = false;

    cur.eat_all(" ");
    if cur.eat("<") {
        let (start_cell, end_cell) = parse_left_ruler(&mut cur, anchor, &map)?;
        annot
            .ranges
            .push(map.range(anchor_line, start_cell, end_cell, &mut mid_glyph));
    }

    // Column rulers and the whole-line marker.
    loop {
        cur.eat_all(" ");
        if !cur.eat("^") {
            break;
        }
        if cur.eat("^") {
            // Whole-line marker `^^`, optionally `^^N`.
            if !annot.ranges.is_empty() {
                return Err("`^^` cannot be combined with other rulers".to_string());
            }
            let n = cur.number()?.unwrap_or(1);
            if n == 0 {
                return Err("`^^0` covers no lines".to_string());
            }
            if n > anchor_line + 1 {
                return Err(format!(
                    "`^^{n}` reaches above the start of the snippet (anchor is stripped \
                     line {})",
                    anchor_line + 1
                ));
            }
            annot.ranges.push(Range::Lines {
                first: anchor_line + 1 - n,
                last: anchor_line,
            });
            cur.eat_all(" ");
            if cur.peek() == "^" {
                return Err("`^^` cannot be combined with other rulers".to_string());
            }
            break;
        }
        let start_cell = cur.pos - 1;
        cur.eat_all("-");
        let end_cell = if cur.eat("~") {
            // Degenerate `~` at or past the end of the line falls back to a
            // single virtual cell, like other virtual-space rulers.
            map.total_width.max(start_cell + 1)
        } else {
            cur.pos
        };
        annot
            .ranges
            .push(map.range(anchor_line, start_cell, end_cell, &mut mid_glyph));
    }

    parse_metadata(&mut cur, &mut annot)?;
    if annot.join_prev && (annot.name.is_some() || annot.pin.is_some()) {
        return Err("`+` cannot be combined with `#name` or `@N`".to_string());
    }
    if mid_glyph {
        return Err("ruler boundary lands inside a double-width character".to_string());
    }
    Ok(annot)
}

/// The display cells of a `<` ruler, after the `<`. It exists because the
/// comment leader and sigil occupy the leftmost columns a `^` could otherwise
/// reach, so no drawing can express a range that starts there. Two coordinate
/// rules: the non-numeric extents anchor to the anchor line's first non-space
/// column (its text start), where bare `<` covers the first
/// whitespace-delimited word, dashes end at the last ruler glyph, and `~`
/// extends to end of line; numeric coordinates are 1-based editor columns
/// from the start of the line, regardless of indentation, so they transcribe
/// directly from an editor's column display or a compiler diagnostic: `<L`
/// covers columns 1 through L, and an `S+` prefix starts at column S and
/// composes with a length, dashes, or `~`.
fn parse_left_ruler(
    cur: &mut Cursor,
    anchor: &str,
    map: &AnchorMap,
) -> Result<(usize, usize), String> {
    let text_start = anchor.len() - anchor.trim_start_matches(' ').len();
    let mut number = cur.number()?;
    let mut explicit_start = None;
    if number.is_some() && cur.eat("+") {
        match number {
            Some(0) => return Err("`<` columns are 1-based; there is no column 0".to_string()),
            Some(s) => explicit_start = Some(s - 1),
            None => unreachable!(),
        }
        number = cur.number()?;
    }
    let dashes = cur.eat_all("-");
    let start_cell = explicit_start.unwrap_or(if number.is_some() { 0 } else { text_start });
    let end_cell = if let Some(n) = number {
        if dashes > 0 || cur.peek() == "~" {
            return Err("a `<` length cannot be combined with `-` or `~`".to_string());
        }
        if n == 0 {
            return Err("a `<` length of 0 covers no columns".to_string());
        }
        start_cell + n
    } else if cur.eat("~") {
        map.total_width.max(start_cell + 1)
    } else if dashes > 0 {
        cur.pos
    } else if explicit_start.is_some() {
        return Err("`<S+` needs an extent: a length, dashes, or `~`".to_string());
    } else {
        let word_end = word_end_cell(anchor, text_start);
        if word_end <= text_start {
            return Err("`<` ruler on a blank line".to_string());
        }
        word_end
    };
    if end_cell <= start_cell {
        return Err("`<` ruler ends at or before its start".to_string());
    }
    Ok((start_cell, end_cell))
}

/// Metadata tokens after the rulers, then an optional `: note` through end
/// of line.
fn parse_metadata(cur: &mut Cursor, annot: &mut Annot) -> Result<(), String> {
    loop {
        cur.eat_all(" ");
        match cur.peek() {
            "" => return Ok(()),
            ":" => {
                cur.pos += 1;
                cur.eat(" ");
                annot.note = Some(cur.rest().trim_end().to_string());
                return Ok(());
            }
            "#" => {
                let word = cur.word();
                let name = &word[1..];
                if name.is_empty()
                    || !name
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
                {
                    return Err(format!("bad step name `{word}`"));
                }
                if annot.name.is_some() {
                    return Err("multiple step names".to_string());
                }
                annot.name = Some(name.to_string());
            }
            "@" => {
                let word = cur.word();
                let pin = word[1..]
                    .parse()
                    .map_err(|_| format!("bad pinned index `{word}`"))?;
                if annot.pin.is_some() {
                    return Err("multiple pinned indices".to_string());
                }
                annot.pin = Some(pin);
            }
            "+" => {
                let word = cur.word();
                if word != "+" {
                    return Err(format!("bad metadata token `{word}`"));
                }
                if annot.join_prev {
                    return Err("duplicate `+`".to_string());
                }
                annot.join_prev = true;
            }
            other => {
                return Err(format!(
                    "unexpected `{other}` after rulers (notes need a `:` prefix)"
                ));
            }
        }
    }
}

/// A step: one fragment moment. Ranges from many annotations may join it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Step {
    pub name: Option<String>,
    pub pin: Option<u32>,
    /// The assigned reveal.js fragment index.
    pub index: u32,
    /// Page line of the first mention, for diagnostics.
    first_line: usize,
}

/// Groups the annotations of all snippets on one slide into steps and
/// assigns fragment indices. Each snippet comes with the page line of its
/// first body line so lints carry page line numbers. Returns the steps plus,
/// per snippet, the step id of each of its annotations.
pub fn assign_steps(
    snippets: &[(&SnippetAnnotations, usize)],
    lints: &mut Vec<Lint>,
) -> (Vec<Step>, Vec<Vec<usize>>) {
    let mut steps: Vec<Step> = Vec::new();
    let mut assignment: Vec<Vec<usize>> = Vec::new();

    for (snip, base) in snippets {
        let mut ids = Vec::with_capacity(snip.annots.len());
        let mut prev_in_snippet: Option<usize> = None;
        for annot in &snip.annots {
            let page_line = base + annot.src_line - 1;
            let id = if annot.join_prev {
                match prev_in_snippet {
                    Some(id) => id,
                    None => {
                        lints.push(Lint {
                            severity: Severity::Error,
                            src_line: page_line,
                            message: "`+` with no previous annotation in this snippet".to_string(),
                        });
                        new_step(&mut steps, None, page_line)
                    }
                }
            } else if let Some(name) = &annot.name {
                match steps.iter().position(|s| s.name.as_deref() == Some(name)) {
                    Some(id) => id,
                    None => new_step(&mut steps, Some(name.clone()), page_line),
                }
            } else {
                new_step(&mut steps, None, page_line)
            };
            if let Some(pin) = annot.pin {
                match steps[id].pin {
                    Some(existing) if existing != pin => lints.push(Lint {
                        severity: Severity::Error,
                        src_line: page_line,
                        message: format!(
                            "step pinned to conflicting indices @{existing} and @{pin}"
                        ),
                    }),
                    _ => steps[id].pin = Some(pin),
                }
            }
            ids.push(id);
            prev_in_snippet = Some(id);
        }
        assignment.push(ids);
    }

    let mut prev_index = 0u32;
    for step in &mut steps {
        step.index = match step.pin {
            Some(pin) => pin,
            None => prev_index.saturating_add(1),
        };
        prev_index = step.index;
    }
    // Sharing an index is fine when both steps pinned it; an auto-assigned
    // collision is almost certainly unintended.
    let mut seen: HashMap<u32, usize> = HashMap::new();
    for (id, step) in steps.iter().enumerate() {
        if let Some(&prior) = seen.get(&step.index) {
            if steps[prior].pin.is_none() || step.pin.is_none() {
                lints.push(Lint {
                    severity: Severity::Warning,
                    src_line: step.first_line,
                    message: format!(
                        "{} and {} share fragment index {} without a shared name",
                        describe_step(&steps[prior]),
                        describe_step(step),
                        step.index
                    ),
                });
            }
        } else {
            seen.insert(step.index, id);
        }
    }

    (steps, assignment)
}

fn describe_step(step: &Step) -> String {
    match &step.name {
        Some(name) => format!("step `#{name}`"),
        None => format!("the step from line {}", step.first_line),
    }
}

fn new_step(steps: &mut Vec<Step>, name: Option<String>, first_line: usize) -> usize {
    steps.push(Step {
        name,
        pin: None,
        index: 0,
        first_line,
    });
    steps.len() - 1
}
#[cfg(test)]
mod tests {
    use super::*;

    fn parse(src: &str) -> SnippetAnnotations {
        parse_snippet(src, "//")
    }

    fn errors(out: &SnippetAnnotations) -> Vec<&Lint> {
        out.lints
            .iter()
            .filter(|l| l.severity == Severity::Error)
            .collect()
    }

    fn assign(
        snips: &[&SnippetAnnotations],
        lints: &mut Vec<Lint>,
    ) -> (Vec<Step>, Vec<Vec<usize>>) {
        let with_base: Vec<(&SnippetAnnotations, usize)> = snips.iter().map(|s| (*s, 1)).collect();
        assign_steps(&with_base, lints)
    }

    #[test]
    fn language_less_blocks_have_a_leader() {
        assert_eq!(comment_leader(""), Some("//"));
        assert_eq!(comment_leader("text"), Some("//"));
        assert_eq!(comment_leader("plain"), Some("//"));
        assert_eq!(comment_leader("json"), None);
    }

    #[test]
    fn basic_ruler() {
        let out = parse("auto MyFunction() -> bool;\n//@  ^-----------\n");
        assert_eq!(out.code, "auto MyFunction() -> bool;\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 5,
                end_col: 17
            }]
        );
        assert!(out.lints.is_empty());
    }

    #[test]
    fn stacked_rulers_same_anchor() {
        let out = parse("auto F() -> bool;\n//@  ^--\n//@  ^-----\n");
        assert_eq!(out.annots.len(), 2);
        for annot in &out.annots {
            assert!(matches!(annot.ranges[0], Range::Inline { line: 0, .. }));
        }
    }

    #[test]
    fn unsigiled_ruler_lookalikes_are_comments() {
        // Quoted compiler diagnostics and prose rulers have no sigil and are
        // never annotations, with no lint.
        for line in [
            "// ^\n",
            "// ^^\n",
            "// ^----\n",
            "//   ^^^^  ^^^^^\n",
            "// ^~~~~\n",
            "// ^b.Elts may overlap\n",
        ] {
            let src = format!("f(x);\n{line}");
            let out = parse(&src);
            assert!(out.annots.is_empty(), "{line:?}");
            assert!(out.lints.is_empty(), "{line:?}: {:?}", out.lints);
            assert!(out.code.contains(line.trim_end()), "{line:?}");
        }
    }

    #[test]
    fn annotation_shape_under_any_leader() {
        assert!(looks_like_annotation("  #@ ^--"));
        assert!(looks_like_annotation("--@<"));
        assert!(!looks_like_annotation("//@dump-sem-ir-begin"));
        assert!(!looks_like_annotation("// ^--"));
    }

    #[test]
    fn sigiled_directives_are_code() {
        // Real reserved-comment directives do not start with a ruler glyph.
        let out = parse("f(x);\n//@dump-sem-ir-begin\ng(x);\n//@dump-sem-ir-end\n");
        assert!(out.annots.is_empty());
        assert!(out.lints.is_empty());
        assert!(out.code.contains("//@dump-sem-ir-begin"));
    }

    #[test]
    fn sigiled_broken_ruler_is_error() {
        let out = parse("f(x);\n//@ ^-- oops trailing\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
        assert!(out.code.contains("oops"));
    }

    #[test]
    fn bare_single_caret() {
        let out = parse("f(x);\n//@ ^\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 4,
                end_col: 5
            }]
        );
        assert!(out.lints.is_empty());
    }

    #[test]
    fn whole_line_marker() {
        let out = parse("int x = 1;\n//@ ^^\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Lines { first: 0, last: 0 }]
        );
        assert!(out.lints.is_empty());
    }

    #[test]
    fn left_pinned_ruler() {
        let out = parse("int x = 1;\n//@<---\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 0,
                end_col: 7
            }]
        );
    }

    #[test]
    fn left_pinned_after_spaces() {
        let out = parse("int x = 1;\n//@ <--\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 0,
                end_col: 7
            }]
        );
    }

    #[test]
    fn left_pinned_starts_at_text() {
        // `<` pins to the anchor's first non-space column, so an indented
        // statement can be covered even though `^` cannot reach its first
        // columns past the leader and sigil.
        let out = parse("  int* p = &x[0];\n  //@<----------\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 2,
                end_col: 16
            }]
        );
        // `<~` covers exactly the line's text.
        let out = parse("  f();\n  //@<~\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 2,
                end_col: 6
            }]
        );
    }

    #[test]
    fn left_pinned_word() {
        // Bare `<` covers the anchor's first word, wherever it starts and
        // however long it is.
        for (code, start, end) in [
            ("fn SomeFunction();", 0, 2),
            ("x += y;", 0, 1),
            ("  x += y;", 2, 3),
            ("xy += y;", 0, 2),
            ("  xy += y;", 2, 4),
            ("xyz += y;", 0, 3),
            ("  xyz += y;", 2, 5),
            // No space in the text: the word is the whole text.
            ("x.PushBack(4000);", 0, 17),
        ] {
            let out = parse(&format!("{code}\n//@<\n"));
            assert_eq!(
                out.annots[0].ranges,
                vec![Range::Inline {
                    line: 0,
                    start_col: start,
                    end_col: end
                }],
                "{code:?}"
            );
            assert!(out.lints.is_empty(), "{code:?}");
        }
    }

    #[test]
    fn left_pinned_count() {
        // `<L` covers columns 1 through L, for sub-word prefixes the ruler
        // glyphs cannot reach.
        for (code, ruler, start, end) in [
            ("fn SomeFunction();", "//@<2", 0, 2),
            ("x.PushBack(4000);", "//@<1", 0, 1),
            // Numeric columns are absolute: on an indented line the count
            // starts in the indent, not at the text.
            ("  x += y;", "//@<3", 0, 3),
        ] {
            let out = parse(&format!("{code}\n{ruler}\n"));
            assert_eq!(
                out.annots[0].ranges,
                vec![Range::Inline {
                    line: 0,
                    start_col: start,
                    end_col: end
                }],
                "{code:?}"
            );
        }
    }

    #[test]
    fn left_pinned_count_rejects_zero_and_mixing() {
        for src in ["f();\n//@<0\n", "f();\n//@<2--\n", "f();\n//@<2~\n"] {
            let out = parse(src);
            assert!(out.annots.is_empty(), "{src:?}");
            assert_eq!(errors(&out).len(), 1, "{src:?}");
        }
    }

    #[test]
    fn left_pinned_start_and_length() {
        // `<S+L` starts at 1-based editor column S and covers L cells:
        // `bc` in `abcd` is columns 2-3 whatever the indentation of code or
        // comment, matching what an editor's column display shows.
        for (code, ruler, start, end) in [
            ("abcd(1);", "//@<2+2", 1, 3),
            ("  abcd(1);", "  //@<4+2", 3, 5),
            ("fn Run() {", "//@<2+1", 1, 2),
            ("  var x: buf(i32);", "//@<7+1", 6, 7),
        ] {
            let out = parse(&format!("{code}\n{ruler}\n"));
            assert_eq!(
                out.annots[0].ranges,
                vec![Range::Inline {
                    line: 0,
                    start_col: start,
                    end_col: end
                }],
                "{code:?} {ruler:?}"
            );
            assert!(out.lints.is_empty(), "{code:?}");
        }
    }

    #[test]
    fn left_pinned_start_with_eol_and_dashes() {
        // The start column composes with the other extents.
        let out = parse("abcd efg;\n//@<2+~\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 1,
                end_col: 9
            }]
        );
        // `<2+--` ends at the last ruler glyph (cell 8 here).
        let out = parse("abcd efg;\n//@<2+--\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 1,
                end_col: 8
            }]
        );
    }

    #[test]
    fn left_pinned_start_requires_extent() {
        for src in [
            "f();\n//@<1+\n",
            "f();\n//@<1+0\n",
            "f();\n//@<1+2--\n",
            "f();\n//@<0+2\n",
        ] {
            let out = parse(src);
            assert!(out.annots.is_empty(), "{src:?}");
            assert_eq!(errors(&out).len(), 1, "{src:?}");
        }
        // A spaced `+` after a complete ruler is still the join token.
        let out = parse("f();\n//@<1\ng();\n//@<1 +\n");
        assert!(out.annots[1].join_prev);
    }

    #[test]
    fn left_pinned_word_on_blank_line_is_error() {
        let out = parse("f();\n\n//@<\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
    }

    #[test]
    fn left_pinned_ending_in_indent_is_error() {
        let out = parse("        f();\n//@<-\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
    }

    #[test]
    fn left_pinned_to_eol() {
        let out = parse("int x = 1;\n//@<~\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 0,
                end_col: 10
            }]
        );
    }

    #[test]
    fn to_end_of_line() {
        let out = parse("int x = compute();\n//@     ^~\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 8,
                end_col: 18
            }]
        );
    }

    #[test]
    fn eol_ruler_past_end_is_virtual() {
        // `^~` at or past the anchor's end degrades to one virtual cell.
        let out = parse("f();\n//@      ^~\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 9,
                end_col: 10
            }]
        );
        assert!(out.lints.is_empty());
    }

    #[test]
    fn multi_line_marker() {
        let out = parse("a();\nb();\nc();\n//@ ^^2\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Lines { first: 1, last: 2 }]
        );
    }

    #[test]
    fn multi_line_marker_ignores_interleaved_annotations() {
        let out = parse("a();\n//@ ^-\nb();\n//@ ^^2\n");
        assert_eq!(
            out.annots[1].ranges,
            vec![Range::Lines { first: 0, last: 1 }]
        );
    }

    #[test]
    fn multi_line_marker_out_of_bounds_is_error() {
        let out = parse("a();\n//@ ^^5\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
        assert!(out.code.contains("^^5"));
    }

    #[test]
    fn lines_marker_cannot_combine() {
        let out = parse("a();\n//@ ^^ ^-\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
    }

    #[test]
    fn multiple_rulers_one_line() {
        let out = parse("f(ref x, ref y);\n//@^--   ^--\n");
        assert_eq!(out.annots[0].ranges.len(), 2);
        assert_eq!(
            out.annots[0].ranges[1],
            Range::Inline {
                line: 0,
                start_col: 9,
                end_col: 12
            }
        );
    }

    #[test]
    fn metadata_tokens() {
        let out = parse("f();\n//@ ^- #alloc @3 : the allocation\n");
        let annot = &out.annots[0];
        assert_eq!(annot.name.as_deref(), Some("alloc"));
        assert_eq!(annot.pin, Some(3));
        assert_eq!(annot.note.as_deref(), Some("the allocation"));
    }

    #[test]
    fn join_previous() {
        let out = parse("f();\n//@ ^-\ng();\n//@ ^- +\n");
        assert!(out.annots[1].join_prev);
    }

    #[test]
    fn join_with_name_rejected() {
        let out = parse("f();\n//@ ^- + #x\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
    }

    #[test]
    fn duplicate_join_rejected() {
        let out = parse("f();\n//@ ^- + +\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
    }

    #[test]
    fn arrow_comment_is_code() {
        let out = parse("f();\n// <- boom\n");
        assert!(out.annots.is_empty());
        assert!(out.lints.is_empty());
        assert!(out.code.contains("<- boom"));
    }

    #[test]
    fn haddock_style_comment_is_silent() {
        let out = parse_snippet("x = 1\n-- ^ The thing\n", "--");
        assert!(out.annots.is_empty());
        assert!(out.lints.is_empty());
    }

    #[test]
    fn ordinary_comments_untouched() {
        let out = parse("// A comment.\nf();\n");
        assert!(out.annots.is_empty());
        assert_eq!(out.code, "// A comment.\nf();\n");
    }

    #[test]
    fn annotation_before_code_is_error() {
        for src in ["//@ ^--\nf();\n", "//@ ^^2\nf();\n", "//@ ^\nf();\n"] {
            let out = parse(src);
            assert_eq!(errors(&out).len(), 1, "{src:?}");
        }
    }

    #[test]
    fn tabs_rejected_in_annotated_snippets() {
        let out = parse("\tf();\n//@ ^-\n");
        assert_eq!(errors(&out).len(), 1);
        // Without annotations, tabs are fine.
        let out = parse("\tf();\n");
        assert!(out.lints.is_empty());
    }

    #[test]
    fn virtual_space_past_eol() {
        let out = parse("f();\n//@  ^---\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 5,
                end_col: 9
            }]
        );
    }

    #[test]
    fn ruler_on_blank_line() {
        let out = parse("f();\n\n//@ ^--\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 1,
                start_col: 4,
                end_col: 7
            }]
        );
    }

    #[test]
    fn display_cell_columns_for_wide_chars() {
        // `❌` occupies two display cells but is one grapheme: a ruler
        // visually placed by cells maps back to grapheme indices.
        let out = parse("x(); // \u{274c} Err\n//@        ^--\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 10,
                end_col: 13
            }]
        );
    }

    #[test]
    fn ruler_covering_wide_glyph_exactly_is_fine() {
        // `^-` (two cells) exactly covers `宽` (two cells): one grapheme.
        let out = parse("var \u{5bbd}x;\n//@ ^-\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 4,
                end_col: 5
            }]
        );
        assert!(out.lints.is_empty());
    }

    #[test]
    fn mid_glyph_boundary_is_error() {
        // A ruler starting in the middle of `宽` (2 cells) is flagged.
        let out = parse("var \u{5bbd}x;\n//@  ^-\n");
        assert!(out.annots.is_empty());
        assert_eq!(errors(&out).len(), 1);
        assert!(out.lints[0].message.contains("double-width"));
    }

    #[test]
    fn vs16_emoji_counts_two_cells() {
        // `⚠️` (U+26A0 + VS16) renders two cells wide.
        let out = parse("f(); // \u{26a0}\u{fe0f} boom\n//@  ^----------\n");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 5,
                end_col: 15
            }]
        );
    }

    #[test]
    fn hash_leader_language() {
        let out = parse_snippet("x = 1\n#@^--\n", "#");
        assert_eq!(
            out.annots[0].ranges,
            vec![Range::Inline {
                line: 0,
                start_col: 2,
                end_col: 5
            }]
        );
    }

    #[test]
    fn case_insensitive_leader_lookup() {
        assert_eq!(comment_leader("Cpp"), Some("//"));
        assert_eq!(comment_leader("CARBON"), Some("//"));
    }

    #[test]
    fn assign_document_order() {
        let a = parse("f();\n//@ ^-\ng();\n//@ ^-\n");
        let mut lints = Vec::new();
        let (steps, assignment) = assign(&[&a], &mut lints);
        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].index, 1);
        assert_eq!(steps[1].index, 2);
        assert_eq!(assignment, vec![vec![0, 1]]);
    }

    #[test]
    fn assign_named_joins_across_snippets() {
        let a = parse("f();\n//@ ^- #x\n");
        let b = parse("g();\n//@ ^- #x\n//@ ^-\n");
        let mut lints = Vec::new();
        let (steps, assignment) = assign(&[&a, &b], &mut lints);
        assert_eq!(steps.len(), 2);
        assert_eq!(assignment, vec![vec![0], vec![0, 1]]);
    }

    #[test]
    fn assign_pins_and_continuation() {
        let a = parse("f();\n//@ ^- @5\ng();\n//@ ^-\n");
        let mut lints = Vec::new();
        let (steps, _) = assign(&[&a], &mut lints);
        assert_eq!(steps[0].index, 5);
        assert_eq!(steps[1].index, 6);
    }

    #[test]
    fn assign_join_prev_merges() {
        let a = parse("f();\n//@ ^-\ng();\n//@ ^- +\n");
        let mut lints = Vec::new();
        let (steps, assignment) = assign(&[&a], &mut lints);
        assert_eq!(steps.len(), 1);
        assert_eq!(assignment, vec![vec![0, 0]]);
    }

    #[test]
    fn assign_explicit_duplicate_pins_ok() {
        // Two steps pinned to the same index are a supported way to sync
        // with a handwritten fragment; no warning.
        let a = parse("f();\n//@ ^- @2\ng();\n//@ ^- @2\n");
        let mut lints = Vec::new();
        let (steps, _) = assign(&[&a], &mut lints);
        assert_eq!(steps.len(), 2);
        assert!(lints.is_empty());
    }

    #[test]
    fn assign_auto_collision_warns() {
        // An auto-assigned index colliding with a pinned one warns.
        let a = parse("f();\n//@ ^-\ng();\n//@ ^- @1\n");
        let mut lints = Vec::new();
        let (_, _) = assign(&[&a], &mut lints);
        assert!(lints.iter().any(|l| l.severity == Severity::Warning));
    }

    #[test]
    fn assign_pin_overflow_saturates() {
        let a = parse("f();\n//@ ^- @4294967295\ng();\n//@ ^-\n");
        let mut lints = Vec::new();
        let (steps, _) = assign(&[&a], &mut lints);
        assert_eq!(steps[1].index, u32::MAX);
    }

    #[test]
    fn assign_lint_lines_are_page_lines() {
        let a = parse("f();\n//@ ^- +\n");
        let mut lints = Vec::new();
        let (_, _) = assign_steps(&[(&a, 100)], &mut lints);
        assert_eq!(lints[0].src_line, 101);
    }
}
