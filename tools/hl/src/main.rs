//! Build-time code highlighting for the blog: see docs/code-highlighting.md.
//!
//! Scans every content page, parses and strips highlight annotations from
//! its fenced code blocks, highlights via giallo, injects reveal.js fragment
//! spans, and writes per-page JSON into gen/data/hl/ plus the generated token
//! stylesheet. Hugo mounts gen/ into its data and assets trees; see
//! config/_default/module.toml.

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use giallo::{HighlightOptions, Registry, ThemeVariant};
use sha2::{Digest, Sha256};
use unicode_segmentation::UnicodeSegmentation;

mod annot;
mod mdscan;
mod render;

use annot::Severity;

const THEME: &str = "dracula";
const GRAMMARS: &[&str] = &["third_party/carbon-lang/assets/textmate/carbon.tmLanguage.json"];

fn main() -> ExitCode {
    let mut root = None;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--root" => root = args.next().map(PathBuf::from),
            other => {
                eprintln!("unknown argument `{other}` (usage: hl [--root <site-root>])");
                return ExitCode::FAILURE;
            }
        }
    }
    let Some(root) = root.or_else(find_root) else {
        eprintln!("error: site root not found (run inside the repo or pass --root)");
        return ExitCode::FAILURE;
    };

    match run(&root) {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::FAILURE,
        Err(err) => {
            eprintln!("error: {err}");
            ExitCode::FAILURE
        }
    }
}

fn find_root() -> Option<PathBuf> {
    let mut dir = std::env::current_dir().ok()?;
    loop {
        if dir.join("config/_default/hugo.toml").exists() {
            return Some(dir);
        }
        if !dir.pop() {
            return None;
        }
    }
}

fn highlight_options(lang: &str) -> HighlightOptions {
    HighlightOptions::new(lang, ThemeVariant::Single(THEME)).fallback_to_plain(true)
}

fn run(root: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    let mut registry = Registry::builtin()?;
    for grammar in GRAMMARS {
        registry.add_grammar_from_path(root.join(grammar))?;
    }
    registry.link_grammars();
    // The theme's default style anchors the generated stylesheet; giallo only
    // hands a theme out with a highlight.
    let ThemeVariant::Single(theme) = registry.highlight("", &highlight_options("plain"))?.theme
    else {
        unreachable!("single theme requested");
    };
    let mut pipeline = Pipeline {
        registry: &registry,
        sheet: render::StyleSheet::new(theme.default_style),
        errors: 0,
        warnings: 0,
    };

    let content_root = root.join("content");
    let mut pages = Vec::new();
    collect_pages(&content_root, &mut pages)?;
    pages.sort();

    let mut outputs: Vec<(String, String)> = Vec::new(); // (slug, json)
    let mut slug_sources: HashMap<String, PathBuf> = HashMap::new();
    // Path referenced by a `snippet` shortcode -> where it was first named.
    let mut snippet_refs: BTreeMap<String, (PathBuf, usize)> = BTreeMap::new();

    for path in &pages {
        let rel = path.strip_prefix(&content_root).unwrap();
        let src = std::fs::read_to_string(path)?;
        let page = match mdscan::scan_page(&src) {
            Ok(page) => page,
            Err(err) => {
                pipeline.report(Severity::Error, rel, 1, &err);
                continue;
            }
        };
        for (line, msg) in &page.scan_lints {
            pipeline.report(Severity::Error, rel, *line, msg);
        }
        for (line, path) in &page.snippets {
            snippet_refs
                .entry(path.clone())
                .or_insert_with(|| (rel.to_path_buf(), *line));
        }

        let ancestors = ancestor_front_matters(path, &content_root)?;
        let is_reveal = mdscan::is_reveal(&page.front_matter, &ancestors);
        let json = pipeline.process_page(&page, is_reveal, rel);
        let slug = page_slug(rel);
        if let Some(prior) = slug_sources.insert(slug.clone(), path.clone()) {
            pipeline.report(
                Severity::Error,
                rel,
                1,
                &format!(
                    "page slug `{slug}` collides with {}; rename one of the files",
                    prior.display()
                ),
            );
            continue;
        }
        outputs.push((slug, json));
    }

    let data_dir = root.join("gen/data/hl");
    if data_dir.exists() {
        std::fs::remove_dir_all(&data_dir)?;
    }
    std::fs::create_dir_all(&data_dir)?;
    for (slug, json) in &outputs {
        std::fs::write(data_dir.join(format!("{slug}.json")), json)?;
    }
    let snippets = pipeline.process_snippets(root, &snippet_refs);
    let snippet_dir = root.join("gen/data/hlcode");
    std::fs::create_dir_all(&snippet_dir)?;
    std::fs::write(snippet_dir.join("files.json"), snippets)?;

    let css_dir = root.join("gen/assets/css/hl");
    std::fs::create_dir_all(&css_dir)?;
    std::fs::write(css_dir.join("tokens.scss"), pipeline.sheet.to_scss())?;

    eprintln!(
        "hl: {} page(s) generated into {} ({} error(s), {} warning(s))",
        outputs.len(),
        data_dir.display(),
        pipeline.errors,
        pipeline.warnings,
    );
    // Warnings fail the run too, so no lint can ship silently.
    Ok(pipeline.errors == 0 && pipeline.warnings == 0)
}

fn collect_pages(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect_pages(&path, out)?;
        } else if path.extension().is_some_and(|e| e == "md") {
            out.push(path);
        }
    }
    Ok(())
}

/// Front matter of every `_index.md` above the page, up to the content
/// root: the scope of Hugo's cascade.
fn ancestor_front_matters(
    page: &Path,
    content_root: &Path,
) -> Result<Vec<toml::Table>, Box<dyn std::error::Error>> {
    let mut out = Vec::new();
    let mut dir = page.parent().unwrap();
    loop {
        let index = dir.join("_index.md");
        if index != page && index.exists() {
            let src = std::fs::read_to_string(&index)?;
            let table =
                mdscan::front_matter(&src).map_err(|err| format!("{}: {err}", index.display()))?;
            out.push(table);
        }
        if dir == content_root {
            return Ok(out);
        }
        dir = dir.parent().unwrap();
    }
}

fn page_slug(rel: &Path) -> String {
    let s = rel.to_string_lossy();
    s.strip_suffix(".md").unwrap_or(&s).replace('/', "_")
}

/// The state a run threads through every page: the grammars, the stylesheet
/// accumulating token classes, and the diagnostic counts.
struct Pipeline<'a> {
    registry: &'a Registry,
    sheet: render::StyleSheet,
    errors: usize,
    warnings: usize,
}

impl Pipeline<'_> {
    fn report(&mut self, severity: Severity, rel: &Path, line: usize, msg: &str) {
        let word = match severity {
            Severity::Error => {
                self.errors += 1;
                "error"
            }
            Severity::Warning => {
                self.warnings += 1;
                "warning"
            }
        };
        eprintln!("{}:{}: {word}: {msg}", rel.display(), line);
    }

    /// Renders every fence of one page into the page's JSON. Lint problems
    /// are reported, but rendering continues to keep the output usable while
    /// editing.
    fn process_page(&mut self, page: &mdscan::Page, is_reveal: bool, rel: &Path) -> String {
        // Parse annotations per fence.
        let mut parsed: Vec<annot::SnippetAnnotations> = Vec::new();
        for fence in &page.fences {
            let snip = match annot::comment_leader(&fence.lang) {
                Some(leader) => annot::parse_snippet(&fence.body, leader),
                None => {
                    // An annotation in a language with no configured leader
                    // would render as a comment, which is never what the
                    // author meant.
                    for (i, line) in fence.body.lines().enumerate() {
                        if annot::looks_like_annotation(line) {
                            self.report(
                                Severity::Warning,
                                rel,
                                fence.body_line + i,
                                &format!(
                                    "annotation in `{}`, which has no annotation support",
                                    fence.lang
                                ),
                            );
                        }
                    }
                    annot::SnippetAnnotations {
                        code: fence.body.clone(),
                        ..Default::default()
                    }
                }
            };
            for lint in &snip.lints {
                self.report(
                    lint.severity,
                    rel,
                    fence.body_line + lint.src_line - 1,
                    &lint.message,
                );
            }
            parsed.push(snip);
        }

        // Group steps per slide; an ordinary page is a single scope.
        let scope = |i: usize| if is_reveal { page.fences[i].slide } else { 0 };
        let mut index_of_annot: Vec<Vec<u32>> = vec![Vec::new(); page.fences.len()];
        let last_scope = (0..page.fences.len()).map(scope).max().unwrap_or(0);
        for s in 0..=last_scope {
            let members: Vec<usize> = (0..page.fences.len()).filter(|&i| scope(i) == s).collect();
            if members.is_empty() {
                continue;
            }
            let snips: Vec<(&annot::SnippetAnnotations, usize)> = members
                .iter()
                .map(|&i| (&parsed[i], page.fences[i].body_line))
                .collect();
            let mut lints = Vec::new();
            let (steps, assignment) = annot::assign_steps(&snips, &mut lints);
            for lint in &lints {
                self.report(lint.severity, rel, lint.src_line, &lint.message);
            }
            for (slot, &fence_idx) in members.iter().enumerate() {
                index_of_annot[fence_idx] =
                    assignment[slot].iter().map(|&s| steps[s].index).collect();
            }
        }

        // Highlight and render each fence.
        let mut blocks = Vec::new();
        for (i, fence) in page.fences.iter().enumerate() {
            let snip = &parsed[i];
            let ranges = lower_ranges(snip, &index_of_annot[i]);
            let lang = fence.lang.as_str();

            // Slides badge the languages they mix on one screen; ordinary
            // pages never badge.
            let lang_label = match lang.to_lowercase().as_str() {
                _ if !is_reveal => None,
                "carbon" => Some("Carbon"),
                "cpp" | "c++" => Some("C++"),
                "rust" => Some("Rust"),
                "swift" => Some("Swift"),
                _ => None,
            };
            let mut options = render::SnippetOptions {
                lang_label: lang_label.map(str::to_string),
                ..Default::default()
            };
            for (key, value) in &fence.attrs {
                match key.as_str() {
                    "ln" => options.line_numbers = value != "false",
                    "ln-start" => match value.parse() {
                        Ok(v) => options.ln_start = Some(v),
                        Err(_) => self.report(
                            Severity::Warning,
                            rel,
                            fence.body_line - 1,
                            &format!("bad `ln-start` value `{value}`"),
                        ),
                    },
                    other => self.report(
                        Severity::Warning,
                        rel,
                        fence.body_line - 1,
                        &format!("unknown attribute `{other}`"),
                    ),
                }
            }

            let html = self
                .highlight_and_render(
                    &snip.code,
                    lang,
                    &ranges,
                    &options,
                    rel,
                    fence.body_line - 1,
                )
                .unwrap_or_default();
            // The hash must match what the render hook computes from `.Type`
            // and `.Inner`, so it uses the fence's own language string.
            let hash = Sha256::digest(format!(
                "{}\x00{}",
                fence.lang,
                fence.body.trim_end_matches('\n')
            ));
            blocks.push(serde_json::json!({ "hash": format!("{hash:x}"), "html": html }));
        }

        serde_json::json!({ "blocks": blocks }).to_string()
    }

    /// Renders every file a page includes with the `snippet` shortcode,
    /// keyed by the path the shortcode names so the lookup needs no ordinal
    /// and a file included twice is rendered once. The language comes from
    /// the extension.
    fn process_snippets(
        &mut self,
        root: &Path,
        refs: &BTreeMap<String, (PathBuf, usize)>,
    ) -> String {
        let mut files = serde_json::Map::new();
        for (path, (from, from_line)) in refs {
            let rel = Path::new(path.trim_start_matches('/'));
            let raw = match std::fs::read_to_string(root.join(rel)) {
                Ok(src) => src,
                Err(err) => {
                    self.report(
                        Severity::Error,
                        from,
                        *from_line,
                        &format!("snippet `{path}`: {err}"),
                    );
                    continue;
                }
            };
            // Matches what the shortcode hashes.
            let src = raw.trim_matches('\n');
            let lang = rel.extension().and_then(|e| e.to_str()).unwrap_or("");

            let snip = match annot::comment_leader(lang) {
                Some(leader) => annot::parse_snippet(src, leader),
                None => annot::SnippetAnnotations {
                    code: src.to_string(),
                    ..Default::default()
                },
            };
            for lint in &snip.lints {
                self.report(lint.severity, rel, lint.src_line, &lint.message);
            }
            let mut lints = Vec::new();
            let (steps, assignment) = annot::assign_steps(&[(&snip, 1)], &mut lints);
            for lint in &lints {
                self.report(lint.severity, rel, lint.src_line, &lint.message);
            }
            let indices: Vec<u32> = assignment[0].iter().map(|&s| steps[s].index).collect();
            let ranges = lower_ranges(&snip, &indices);

            let options = render::SnippetOptions::default();
            let Some(html) = self.highlight_and_render(&snip.code, lang, &ranges, &options, rel, 1)
            else {
                continue;
            };
            let hash = Sha256::digest(src);
            files.insert(
                path.clone(),
                serde_json::json!({ "hash": format!("{hash:x}"), "html": html }),
            );
        }
        // The file name supplies the `files` key in Hugo's data tree, so the
        // document itself is the path-to-block map.
        serde_json::Value::Object(files).to_string()
    }

    /// Highlights one snippet and renders it, reporting grammar problems
    /// against `rel`:`line`. Returns None when highlighting failed outright.
    fn highlight_and_render(
        &mut self,
        code: &str,
        lang: &str,
        ranges: &HashMap<usize, Vec<render::LineRange>>,
        options: &render::SnippetOptions,
        rel: &Path,
        line: usize,
    ) -> Option<String> {
        let lang = if lang.is_empty() { "plain" } else { lang };
        let highlighted = match self.registry.highlight(code, &highlight_options(lang)) {
            Ok(h) => h,
            Err(err) => {
                self.report(
                    Severity::Error,
                    rel,
                    line,
                    &format!("highlighting failed: {err}"),
                );
                return None;
            }
        };
        if highlighted.language == "plain" && lang != "plain" && lang != "text" {
            self.report(
                Severity::Warning,
                rel,
                line,
                &format!("no grammar for `{lang}`; rendered unhighlighted"),
            );
        }
        Some(render::render_snippet(
            code,
            &highlighted.tokens,
            ranges,
            options,
            &mut self.sheet,
        ))
    }
}

/// Lowers annotation ranges to per-line render ranges with fragment indices.
fn lower_ranges(
    snip: &annot::SnippetAnnotations,
    indices: &[u32],
) -> HashMap<usize, Vec<render::LineRange>> {
    let lines: Vec<&str> = snip.code.split('\n').collect();
    let mut out: HashMap<usize, Vec<render::LineRange>> = HashMap::new();
    for (annot, &index) in snip.annots.iter().zip(indices) {
        let mut first = true;
        for range in &annot.ranges {
            match *range {
                // Each ruler is its own visual range and gets its own start
                // marker; only line-block continuations are marked `cont`.
                annot::Range::Inline {
                    line,
                    start_col,
                    end_col,
                } => {
                    out.entry(line).or_default().push(render::LineRange {
                        start_col,
                        end_col,
                        index,
                        kind: render::RangeKind::Inline,
                        first: true,
                        note: first.then(|| annot.note.clone()).flatten(),
                    });
                    first = false;
                }
                annot::Range::Lines {
                    first: lo,
                    last: hi,
                } => {
                    for line in lo..=hi {
                        let len = lines
                            .get(line)
                            .map_or(0, |l| l.graphemes(true).count())
                            .max(1);
                        out.entry(line).or_default().push(render::LineRange {
                            start_col: 0,
                            end_col: len,
                            index,
                            kind: render::RangeKind::Lines,
                            first,
                            note: first.then(|| annot.note.clone()).flatten(),
                        });
                        first = false;
                    }
                }
            }
        }
    }
    out
}
