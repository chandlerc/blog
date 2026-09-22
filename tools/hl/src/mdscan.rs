//! Content scanning: front matter, slide boundaries, and fenced code blocks.
//!
//! Hugo expands shortcodes before goldmark sees a page, and the scanner does
//! the same: it stands a placeholder in for every shortcode, then parses the
//! result as CommonMark with pulldown-cmark. Fenced code blocks come out in
//! document order, which is the render hook's `.Ordinal`; thematic breaks and
//! raw `<hr>` tags, which reveal-hugo splits the rendered page on, count
//! slides, which scope highlight steps. The parser settles what a fence is
//! (indentation, containers, HTML blocks and comments, setext headings), so
//! only Hugo's own conventions are hand-written here.

use std::fmt::Write;
use std::ops::Range;

use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag, TagEnd};

/// One hook-visible fenced code block found in a page.
#[derive(Debug, PartialEq, Eq)]
pub struct Fence {
    /// Zero-based slide this fence appears on.
    pub slide: usize,
    pub lang: String,
    pub attrs: Vec<(String, String)>,
    /// Body with the opener's indentation stripped, as goldmark's `.Inner`
    /// sees it.
    pub body: String,
    /// 1-based line of the first body line, for diagnostics.
    pub body_line: usize,
}

#[derive(Debug, Default)]
pub struct Page {
    pub front_matter: toml::Table,
    pub fences: Vec<Fence>,
    /// Files the page includes with the `snippet` shortcode, as (1-based
    /// line, site-absolute path) pairs.
    pub snippets: Vec<(usize, String)>,
    /// Constructs the pipeline does not support, as (1-based line, message)
    /// pairs.
    pub scan_lints: Vec<(usize, String)>,
}

/// A fenced block the parser is inside of.
struct OpenFence {
    range: Range<usize>,
    info: String,
    body: String,
}

/// Parses a content file: TOML `+++` front matter plus the body scan.
pub fn scan_page(src: &str) -> Result<Page, String> {
    let (front_matter, body_offset) = split_front_matter(src)?;
    let mut page = Page {
        front_matter,
        ..Default::default()
    };
    let lines = LineTable::new(src);
    let shortcodes = scan_shortcodes(&src[body_offset..]);
    page.snippets = shortcodes
        .snippets
        .into_iter()
        .map(|(offset, path)| (lines.line_of(body_offset + offset) + 1, path))
        .collect();
    let masked = Masked::new(&src[body_offset..], &shortcodes.masks);
    let to_src = |masked_offset| body_offset + masked.to_src(masked_offset);

    let mut slide = 0;
    let mut open: Option<OpenFence> = None;
    for (event, range) in Parser::new_ext(&masked.text, options()).into_offset_iter() {
        match event {
            Event::Start(Tag::CodeBlock(CodeBlockKind::Fenced(info))) => {
                open = Some(OpenFence {
                    range,
                    info: info.to_string(),
                    body: String::new(),
                });
            }
            Event::Text(text) => {
                if let Some(fence) = &mut open {
                    fence.body.push_str(&text);
                }
            }
            Event::End(TagEnd::CodeBlock) => {
                if let Some(OpenFence { range, info, body }) = open.take() {
                    let start = to_src(range.start);
                    let lineno = lines.line_of(start) + 1;
                    if shortcodes
                        .markdown_bodies
                        .iter()
                        .any(|b| b.contains(&(start - body_offset)))
                    {
                        // Hugo renders these bodies separately, with their
                        // own ordinal sequence.
                        page.scan_lints.push((
                            lineno,
                            "code fences inside {{% %}} shortcode bodies are not supported by \
                             the build pipeline"
                                .to_string(),
                        ));
                        continue;
                    }
                    if !is_terminated(&masked.text[range.clone()]) {
                        page.scan_lints
                            .push((lineno, "unterminated code fence".to_string()));
                    }
                    if let Some(i) = src[start..to_src(range.end)].find('\r') {
                        page.scan_lints.push((
                            lines.line_of(start + i) + 1,
                            "stray carriage return in a fence body".to_string(),
                        ));
                    }
                    let (lang, attrs, rouge_style) = parse_info_string(&info);
                    if rouge_style {
                        // Goldmark rejects these with a cryptic message, so
                        // the tool's message should win.
                        page.scan_lints.push((
                            lineno,
                            format!(
                                "Rouge-style `{lang}{{...}}` info string, which goldmark rejects: \
                                 lines are numbered by default, and line-highlight steps are \
                                 `^^` annotations"
                            ),
                        ));
                    }
                    page.fences.push(Fence {
                        slide,
                        lang,
                        attrs,
                        body,
                        body_line: lineno + 1,
                    });
                }
            }
            Event::Rule => slide += 1,
            // reveal-hugo splits the rendered page on `<hr />` after
            // rewriting `<hr>` to it, so raw ones count as well.
            Event::Html(html) | Event::InlineHtml(html) => {
                slide += html.matches("<hr>").count() + html.matches("<hr />").count();
            }
            _ => {}
        }
    }
    Ok(page)
}

/// The front matter of a content file.
pub fn front_matter(src: &str) -> Result<toml::Table, String> {
    Ok(split_front_matter(src)?.0)
}

/// Parses TOML `+++` front matter, returning it with the byte offset of the
/// body. Hugo accepts an empty block, which pulldown-cmark's metadata
/// support does not, so this stays by hand.
fn split_front_matter(src: &str) -> Result<(toml::Table, usize), String> {
    let Some(rest) = src.strip_prefix("+++\n") else {
        return Ok((toml::Table::new(), 0));
    };
    let mut offset = 0;
    for line in rest.split_inclusive('\n') {
        if line.trim_end() == "+++" {
            let table = rest[..offset]
                .parse::<toml::Table>()
                .map_err(|e| format!("bad front matter: {e}"))?;
            return Ok((table, 4 + offset + line.len()));
        }
        offset += line.len();
    }
    Err("unterminated front matter".to_string())
}

/// Hugo's goldmark extensions, as far as they affect where blocks begin and
/// end.
fn options() -> Options {
    Options::ENABLE_TABLES
        | Options::ENABLE_FOOTNOTES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_HEADING_ATTRIBUTES
        | Options::ENABLE_DEFINITION_LIST
}

/// Whether a fenced block's source ends with a closing fence, as opposed to
/// running to the end of its container.
fn is_terminated(block: &str) -> bool {
    fn strip(line: &str) -> &str {
        line.trim_start_matches([' ', '>']).trim_end()
    }
    let mut lines = block.lines();
    let opener = strip(lines.next().unwrap_or(""));
    let marker = opener.chars().next().unwrap_or('`');
    let len = opener.chars().take_while(|&c| c == marker).count();
    lines.last().is_some_and(|last| {
        let last = strip(last);
        last.chars().count() >= len && last.chars().all(|c| c == marker)
    })
}

/// Byte offsets of line starts, for turning offsets into line numbers.
struct LineTable(Vec<usize>);

impl LineTable {
    fn new(src: &str) -> Self {
        let mut starts = vec![0];
        starts.extend(src.match_indices('\n').map(|(i, _)| i + 1));
        Self(starts)
    }

    /// Zero-based line containing a byte offset.
    fn line_of(&self, offset: usize) -> usize {
        self.0.partition_point(|&s| s <= offset) - 1
    }
}

/// The page with every shortcode replaced by a placeholder word, the way
/// Hugo hands it to goldmark, plus the mapping back to source offsets.
struct Masked {
    text: String,
    /// (masked offset, source offset) at the end of each placeholder.
    anchors: Vec<(usize, usize)>,
}

impl Masked {
    /// `masks` must be sorted and disjoint.
    fn new(src: &str, masks: &[Range<usize>]) -> Self {
        let mut text = String::with_capacity(src.len());
        let mut anchors = vec![(0, 0)];
        let mut pos = 0;
        for (i, mask) in masks.iter().enumerate() {
            text.push_str(&src[pos..mask.start]);
            let _ = write!(text, "HAHAHUGOSHORTCODE-{i}-HBHB");
            pos = mask.end;
            anchors.push((text.len(), pos));
        }
        text.push_str(&src[pos..]);
        Self { text, anchors }
    }

    /// Source offset for a masked offset outside any placeholder.
    fn to_src(&self, masked: usize) -> usize {
        let (m, s) = self.anchors[self.anchors.partition_point(|&(m, _)| m <= masked) - 1];
        s + (masked - m)
    }
}

/// What Hugo's shortcode pass finds in a page.
#[derive(Default)]
struct Shortcodes {
    /// Source ranges goldmark never sees: each standalone shortcode, each
    /// `{{< >}}` pair with its body, and each tag of a `{{% %}}` pair.
    masks: Vec<Range<usize>>,
    /// The bodies of `{{% %}}` pairs, which Hugo renders as markdown on
    /// their own.
    markdown_bodies: Vec<Range<usize>>,
    /// Paths named by `{{< snippet "..." >}}`, with the shortcode's offset.
    snippets: Vec<(usize, String)>,
}

struct ShortcodeTag<'a> {
    range: Range<usize>,
    kind: u8,
    closing: bool,
    self_closing: bool,
    name: String,
    args: &'a str,
}

/// Pairs shortcode tags the way Hugo does: an opening tag is paired only if
/// a closing tag of the same name follows it, and is standalone otherwise.
fn scan_shortcodes(src: &str) -> Shortcodes {
    let tags = shortcode_tags(src);
    let mut out = Shortcodes::default();
    let mut open: Vec<usize> = Vec::new();
    for (i, tag) in tags.iter().enumerate() {
        if tag.kind == b'<'
            && !tag.closing
            && tag.name == "snippet"
            && let Some(path) = first_quoted(tag.args)
        {
            out.snippets.push((tag.range.start, path));
        }
        if tag.closing {
            // A closer that matches nothing is an error in Hugo; leave it.
            if let Some(&o) = open.last()
                && tags[o].kind == tag.kind
                && tags[o].name == tag.name
            {
                open.pop();
                let opener = &tags[o];
                if tag.kind == b'%' {
                    out.masks.push(opener.range.clone());
                    out.masks.push(tag.range.clone());
                    out.markdown_bodies.push(opener.range.end..tag.range.start);
                } else {
                    out.masks.push(opener.range.start..tag.range.end);
                }
            }
            continue;
        }
        let paired = !tag.self_closing
            && tags[i + 1..]
                .iter()
                .any(|t| t.closing && t.kind == tag.kind && t.name == tag.name);
        if paired {
            open.push(i);
        } else {
            out.masks.push(tag.range.clone());
        }
    }
    // A `{{< >}}` body swallows whatever was masked inside it.
    out.masks.sort_by_key(|r| r.start);
    let mut masks: Vec<Range<usize>> = Vec::new();
    for mask in out.masks.drain(..) {
        if masks.last().is_none_or(|prev| prev.end <= mask.start) {
            masks.push(mask);
        }
    }
    out.masks = masks;
    out
}

/// Every `{{< ... >}}` and `{{% ... %}}` tag in order. Hugo's escaped form,
/// `{{</* ... */>}}`, renders as literal text and is not a tag.
fn shortcode_tags(src: &str) -> Vec<ShortcodeTag<'_>> {
    let mut tags = Vec::new();
    let mut pos = 0;
    while let Some(i) = src[pos..].find("{{") {
        let start = pos + i;
        pos = start + 2;
        let Some(&kind) = src.as_bytes().get(pos).filter(|b| matches!(b, b'<' | b'%')) else {
            continue;
        };
        let closer = if kind == b'<' { ">}}" } else { "%}}" };
        let Some(j) = src[start + 3..].find(closer) else {
            break;
        };
        let end = start + 3 + j + 3;
        let inner = src[start + 3..start + 3 + j].trim();
        pos = end;
        if inner.starts_with("/*") {
            continue;
        }
        let (closing, rest) = match inner.strip_prefix('/') {
            Some(rest) => (true, rest.trim_start()),
            None => (false, inner),
        };
        let name: String = rest
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        if name.is_empty() {
            continue;
        }
        let args = rest[name.len()..].trim();
        tags.push(ShortcodeTag {
            range: start..end,
            kind,
            closing,
            self_closing: args.ends_with('/'),
            name,
            args,
        });
    }
    tags
}

/// The first double-quoted argument in a shortcode's argument text.
fn first_quoted(args: &str) -> Option<String> {
    let start = args.find('"')? + 1;
    let end = args[start..].find('"')? + start;
    Some(args[start..end].to_string())
}

/// Parses `lang`, `lang {k=v ...}`, or the Rouge-style `lang{spec}` form,
/// flagging the last. The language is the first word, as goldmark's `.Type`
/// takes it.
fn parse_info_string(info: &str) -> (String, Vec<(String, String)>, bool) {
    let info = info.trim();
    if let Some(brace) = info.find('{') {
        let before = &info[..brace];
        let lang = before.split_whitespace().next().unwrap_or("");
        let rouge_style = brace == lang.len() && !lang.is_empty();
        let attrs_src = info[brace..].trim_start_matches('{').trim_end_matches('}');
        (lang.to_string(), parse_attrs(attrs_src), rouge_style)
    } else {
        (
            info.split_whitespace().next().unwrap_or("").to_string(),
            Vec::new(),
            false,
        )
    }
}

fn parse_attrs(src: &str) -> Vec<(String, String)> {
    let mut attrs = Vec::new();
    let mut rest = src.trim();
    while !rest.is_empty() {
        let Some(eq) = rest.find('=') else {
            // Flag-style or legacy specs: keep as a bare key.
            attrs.push((rest.to_string(), String::new()));
            break;
        };
        let key = rest[..eq].trim().to_string();
        rest = rest[eq + 1..].trim_start();
        let value;
        if let Some(stripped) = rest.strip_prefix('"') {
            let end = stripped.find('"').unwrap_or(stripped.len());
            value = stripped[..end].to_string();
            rest = stripped.get(end + 1..).unwrap_or("").trim_start();
        } else {
            let end = rest.find(' ').unwrap_or(rest.len());
            value = rest[..end].to_string();
            rest = rest[end..].trim_start();
        }
        attrs.push((key, value));
    }
    attrs
}

/// Whether the page renders with the Reveal output format, honoring an
/// ancestor `_index.md`'s cascade the way Hugo does.
pub fn is_reveal(own: &toml::Table, ancestors: &[toml::Table]) -> bool {
    let check = |t: &toml::Table| {
        t.get("outputs")
            .and_then(|v| v.as_array())
            .is_some_and(|a| a.iter().any(|v| v.as_str() == Some("Reveal")))
    };
    check(own)
        || cascade_tables(own).into_iter().any(check)
        || ancestors
            .iter()
            .any(|a| cascade_tables(a).into_iter().any(check))
}

/// The cascade entries of a front matter table: `[cascade]` or the
/// `[[cascade]]` array form (whose `_target` filters are ignored: any entry
/// that sets a value is treated as applying).
fn cascade_tables(t: &toml::Table) -> Vec<&toml::Table> {
    match t.get("cascade") {
        Some(toml::Value::Table(x)) => vec![x],
        Some(toml::Value::Array(a)) => a.iter().filter_map(|v| v.as_table()).collect(),
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn front_matter_and_fences() {
        let page = scan_page("+++\ntitle = \"x\"\n+++\n\n# Slide\n\n```cpp\nf();\n```\n").unwrap();
        assert_eq!(page.front_matter.get("title").unwrap().as_str(), Some("x"));
        assert_eq!(page.fences.len(), 1);
        let fence = &page.fences[0];
        assert_eq!(fence.lang, "cpp");
        assert_eq!(fence.body, "f();\n");
        assert_eq!(fence.body_line, 8);
        assert_eq!(fence.slide, 0);
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn front_matter_alone() {
        let fm = front_matter("+++\ntitle = \"x\"\n+++\n\n```cpp\n").unwrap();
        assert_eq!(fm.get("title").unwrap().as_str(), Some("x"));
        assert!(front_matter("no front matter\n").unwrap().is_empty());
        assert!(front_matter("+++\ntitle = \"x\"\n").is_err());
        assert!(front_matter("+++\ntitle = \n+++\n").is_err());
    }

    #[test]
    fn snippet_shortcode_references() {
        let src = "+++\n+++\n{{< snippet \"/code/a.cpp\" >}}\n\n\
                   text {{< snippet \"/code/b.rs\" />}} more\n";
        let page = scan_page(src).unwrap();
        assert_eq!(
            page.snippets,
            vec![
                (3, "/code/a.cpp".to_string()),
                (5, "/code/b.rs".to_string()),
            ]
        );
    }

    #[test]
    fn snippet_references_skip_documentation() {
        // Hugo's escaped form is documentation rather than an include, and
        // the name has to match exactly.
        let src = "{{</* snippet \"/code/b.rs\" */>}}\n{{< snippets \"/code/c.go\" >}}\n";
        let page = scan_page(src).unwrap();
        assert!(page.snippets.is_empty(), "{:?}", page.snippets);
    }

    #[test]
    fn slides_split_on_dashes_outside_fences() {
        let src = "+++\n+++\n```cpp\n---\n```\n\n---\n```rust\ng();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences[0].slide, 0);
        assert_eq!(page.fences[0].body, "---\n");
        assert_eq!(page.fences[1].slide, 1);
    }

    #[test]
    fn setext_heading_is_not_a_boundary() {
        let src = "Heading text\n---\n\n```cpp\nf();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences[0].slide, 0);
    }

    #[test]
    fn other_thematic_breaks_are_boundaries() {
        for sep in [
            "----",
            "***",
            "___",
            "- - -",
            "<hr>",
            "<hr />",
            "<div>\n<hr>\n</div>",
        ] {
            let src = format!("text\n\n{sep}\n\n```cpp\nf();\n```\n");
            let page = scan_page(&src).unwrap();
            assert_eq!(page.fences[0].slide, 1, "{sep}");
        }
    }

    #[test]
    fn boundaries_inside_shortcode_bodies() {
        // A `{{< >}}` body never reaches goldmark; a `{{% %}}` body renders
        // as markdown and its `<hr>` splits the slide like any other.
        let angle = "{{< raw >}}\n\n---\n\n{{< /raw >}}\n\n```cpp\nf();\n```\n";
        assert_eq!(scan_page(angle).unwrap().fences[0].slide, 0);
        let percent = "{{% note %}}\n\n---\n\n{{% /note %}}\n\n```cpp\nf();\n```\n";
        assert_eq!(scan_page(percent).unwrap().fences[0].slide, 1);
    }

    #[test]
    fn fences_in_html_comments_ignored() {
        let src = "a\n<!--\n```cpp\nhidden\n```\n-->\n```rust\ng();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].lang, "rust");
    }

    #[test]
    fn unterminated_comment_fence_is_lint_not_error() {
        let src = "a\n<!--\n```\n-->\nb\n";
        let page = scan_page(src).unwrap();
        assert!(page.fences.is_empty());
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn fences_in_percent_shortcodes_are_linted_and_skipped() {
        let src = "{{% note %}}\n```cpp\nf();\n```\n{{% /note %}}\n```rust\ng();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].lang, "rust");
        assert_eq!(page.scan_lints.len(), 1);
        assert_eq!(page.scan_lints[0].0, 2);
    }

    #[test]
    fn fences_in_angle_shortcodes_are_skipped_silently() {
        let src = "{{< raw >}}\n```cpp\nf();\n```\n{{< /raw >}}\n```rust\ng();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].lang, "rust");
        assert_eq!(page.fences[0].body_line, 7);
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn standalone_shortcode_does_not_open_a_body() {
        let src = "{{< slide visibility=\"hidden\" >}}\n\n```cpp\nf();\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].body_line, 4);
    }

    #[test]
    fn indented_lookalike_is_not_a_fence() {
        let src = "para\n\n    ```cpp\n    not a fence\n";
        let page = scan_page(src).unwrap();
        assert!(page.fences.is_empty());
    }

    #[test]
    fn slightly_indented_fence_is_deindented() {
        let src = "- item\n\n  ```cpp\n  f();\n  ```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].body, "f();\n");
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn deeply_indented_closer_is_body() {
        let src = "```cpp\nbody\n      ```\nmore\n```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].body, "body\n      ```\nmore\n");
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn blockquoted_fence() {
        let src = "> quote\n> ```cpp\n> f();\n> ```\n";
        let page = scan_page(src).unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].body, "f();\n");
        assert_eq!(page.fences[0].body_line, 3);
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn unterminated_fence_is_lint() {
        let page = scan_page("```cpp\nf();\n").unwrap();
        assert_eq!(page.scan_lints.len(), 1);
        assert_eq!(page.fences.len(), 1);
        let page = scan_page("````cpp\nf();\n```\n").unwrap();
        assert_eq!(page.scan_lints.len(), 1);
    }

    #[test]
    fn stray_cr_is_linted() {
        let page = scan_page("```cpp\nint x;\rint y;\n```\n").unwrap();
        assert_eq!(page.scan_lints.len(), 1);
    }

    #[test]
    fn attrs_parsed() {
        let page = scan_page("```cpp {ln=false ln-start=10 x=\"a b\"}\nf();\n```\n").unwrap();
        let fence = &page.fences[0];
        assert_eq!(fence.lang, "cpp");
        assert_eq!(
            fence.attrs,
            vec![
                ("ln".to_string(), "false".to_string()),
                ("ln-start".to_string(), "10".to_string()),
                ("x".to_string(), "a b".to_string()),
            ]
        );
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn multi_word_info_takes_first_word() {
        let page = scan_page("```cpp extra {ln=true}\nf();\n```\n").unwrap();
        assert_eq!(page.fences[0].lang, "cpp");
    }

    #[test]
    fn rouge_style_info_is_linted() {
        let page = scan_page("```cpp{1-2|3}\nf();\n```\n").unwrap();
        assert_eq!(page.fences[0].lang, "cpp");
        assert_eq!(page.scan_lints.len(), 1);
        assert_eq!(page.scan_lints[0].0, 1);
    }

    #[test]
    fn longer_fence_markers() {
        let page = scan_page("````md\n```\ninner\n```\n````\n").unwrap();
        assert_eq!(page.fences.len(), 1);
        assert_eq!(page.fences[0].body, "```\ninner\n```\n");
        assert!(page.scan_lints.is_empty());
    }

    #[test]
    fn reveal_via_cascade() {
        let own: toml::Table = "title = \"x\"".parse().unwrap();
        let index: toml::Table = "[cascade]\noutputs = [\"Reveal\"]".parse().unwrap();
        assert!(is_reveal(&own, &[index]));
        assert!(!is_reveal(&own, &[]));
    }
}
