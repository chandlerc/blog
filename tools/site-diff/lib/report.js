// Single-file HTML report.
//
// One self-contained file with the images inlined, so it survives being scp'd
// off a headless box and opened from file:// with no network. Only differing
// captures carry images, and they arrive already cropped to the region that
// differs -- a 1280x19655 full-page PNG would blow past any sane report size.

import { PNG } from 'pngjs';
import fs from 'node:fs';

import { SEVERITIES, bySeverity } from './findings.js';

const MAX_DETAIL_LINES = 400;

// Findings whose detail really is a diff, and so earns +/- colouring. Anything
// else renders plain: a page's own console.error reaches a detail string, and
// colouring it would let the site under test write convincing green "added" and
// red "removed" lines into the report auditing it.
const DIFF_KINDS = new Set(['text', 'feed']);

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function dataUri(png) {
  // pngjs already defaults deflateLevel to 9. What it gets wrong for
  // screenshots is the filter (it tries all five per row) and the strategy
  // (Z_RLE). Measured on a real crop: 165ms/517KB down to 43ms/303KB.
  const encoded = PNG.sync.write(png, {
    filterType: 0,
    deflateStrategy: 0,
    deflateLevel: 6,
  });
  return `data:image/png;base64,${encoded.toString('base64')}`;
}

// Long runs are minutes, and "900.0s" is not a duration anyone reads.
function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

const severityOf = (value) => (SEVERITIES.includes(value) ? value : 'info');

function severityCounts(items) {
  const counts = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const item of items) counts[severityOf(item.severity)]++;
  return counts;
}

const slug = (text) =>
  text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';

const STYLE = `
:root {
  color-scheme: dark;
  --bg: #14141c;
  --panel: #1b1b28;
  --raised: #22222f;
  --line: #2f2f45;
  --line-soft: #26263a;
  --fg: #e8e8f2;
  --dim: #9a9ab5;
  --faint: #6d6d88;
  --critical: #ff5f7e;
  --major: #ffa657;
  --minor: #6fd3ff;
  --info: #7ee787;
  --mono: ui-monospace, "Iosevka", "Cascadia Code", Menlo, Consolas, monospace;
  --radius: 10px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }

/* --- header --- */
header {
  padding: 26px 32px 20px;
  background: linear-gradient(var(--panel), var(--panel));
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 20;
}
h1 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
.origins {
  margin-top: 8px; font-family: var(--mono); font-size: 13px; color: var(--dim);
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}
.origins b { color: var(--fg); font-weight: 600; }
.origins .arrow { color: var(--faint); }
.meta {
  margin-top: 4px; font-family: var(--mono); font-size: 12px; color: var(--faint);
}
.controls {
  margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
}
.tally {
  border: 1px solid var(--line); border-radius: 999px; padding: 4px 13px;
  font: 12px var(--mono); cursor: pointer; background: var(--raised);
  color: var(--dim); user-select: none; transition: color .12s, border-color .12s;
}
.tally:hover { border-color: var(--faint); }
.tally[aria-pressed="true"] { color: var(--fg); border-color: currentColor; }
.tally.critical[aria-pressed="true"] { color: var(--critical); }
.tally.major[aria-pressed="true"] { color: var(--major); }
.tally.minor[aria-pressed="true"] { color: var(--minor); }
.tally.info[aria-pressed="true"] { color: var(--info); }
.tally[data-empty="true"] { opacity: .45; }
.spacer { flex: 1; }
.linkish {
  background: none; border: none; color: var(--faint); cursor: pointer;
  font: 12px var(--mono); padding: 4px 6px; border-radius: 4px;
}
.linkish:hover { color: var(--fg); }

/* --- layout --- */
main { padding: 24px 32px 120px; max-width: 1500px; }
.empty {
  margin: 56px auto; max-width: 620px; text-align: center;
  border: 1px solid var(--line); border-radius: var(--radius);
  background: var(--panel); padding: 40px 32px;
}
.empty .tick { font-size: 30px; color: var(--info); line-height: 1; }
.empty h2 { margin: 14px 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0; color: var(--dim); font-size: 14px; }
.empty .checked { margin-top: 18px; font: 12px var(--mono); color: var(--faint); }

/* --- a route, holding one or more views --- */
.route-group {
  background: var(--panel); border: 1px solid var(--line);
  border-left: 3px solid var(--line); border-radius: var(--radius);
  margin-bottom: 16px; overflow: hidden;
}
.route-group.critical { border-left-color: var(--critical); }
.route-group.major { border-left-color: var(--major); }
.route-group.minor { border-left-color: var(--minor); }
.route-group.info { border-left-color: var(--info); }
.route-group > details > summary {
  padding: 14px 18px; display: flex; gap: 12px; align-items: baseline;
  cursor: pointer; list-style: none;
}
.route-group summary::-webkit-details-marker { display: none; }
.route-group summary::before {
  content: "\\25b8"; color: var(--faint); font-size: 10px; line-height: 1.8;
}
.route-group > details[open] > summary::before { content: "\\25be"; }
.route-group summary:hover { background: rgba(255,255,255,.02); }
.route-name { font: 600 14px/1.4 var(--mono); word-break: break-all; }
.view-count { color: var(--faint); font: 12px var(--mono); }
.badges { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }
.badge {
  font: 11px var(--mono); padding: 2px 8px; border-radius: 999px;
  border: 1px solid currentColor;
}
.badge.critical { color: var(--critical); }
.badge.major { color: var(--major); }
.badge.minor { color: var(--minor); }
.badge.info { color: var(--info); }
.route-body { padding: 0 18px 6px; }

/* --- one view of a route --- */
.view { border-top: 1px solid var(--line-soft); padding: 14px 0 18px; }
.view-head { display: flex; gap: 10px; align-items: baseline; }
.view-name { font: 12px var(--mono); color: var(--dim); }
.anchor {
  opacity: 0; color: var(--faint); text-decoration: none; font: 12px var(--mono);
  transition: opacity .12s;
}
.view:hover .anchor, .anchor:focus { opacity: 1; }
.open-links { margin-left: auto; display: flex; gap: 8px; }
.open-links a { color: var(--faint); font: 11px var(--mono); text-decoration: none; }
.open-links a:hover { color: var(--minor); text-decoration: underline; }

/* --- findings --- */
.finding { padding: 10px 0 2px; }
.finding + .finding { border-top: 1px dashed var(--line-soft); margin-top: 8px; }
.finding-head { display: flex; gap: 10px; align-items: baseline; }
.kind {
  font: 10px var(--mono); text-transform: uppercase; letter-spacing: .08em;
  color: var(--faint); border: 1px solid var(--line); border-radius: 4px;
  padding: 1px 6px; flex-shrink: 0; align-self: center;
}
.summary-text { font-weight: 500; }
.finding.critical .summary-text { color: var(--critical); }
.finding.major .summary-text { color: var(--major); }
.finding.minor .summary-text { color: var(--minor); }
.finding.info .summary-text { color: var(--fg); }
pre {
  margin: 8px 0 0; padding: 10px 12px; background: var(--bg);
  border: 1px solid var(--line-soft); border-radius: 6px; overflow-x: auto;
  font: 12px/1.55 var(--mono); color: var(--dim);
  white-space: pre-wrap; word-break: break-word;
}
pre .add { color: var(--info); }
pre .del { color: var(--critical); }

/* --- image viewer --- */
.viewer {
  margin-top: 14px; border: 1px solid var(--line); border-radius: 8px;
  overflow: hidden; background: var(--raised);
}
.modes { display: flex; gap: 4px; padding: 8px; align-items: center; flex-wrap: wrap; }
.modes button {
  background: transparent; border: 1px solid var(--line); color: var(--dim);
  font: 12px var(--mono); padding: 4px 11px; border-radius: 4px; cursor: pointer;
}
.modes button:hover { border-color: var(--faint); }
.modes button[aria-pressed="true"] { color: var(--fg); border-color: var(--fg); }
.modes .note { margin-left: auto; color: var(--faint); font: 11px var(--mono); }
input[type=range] { width: 100%; margin: 0; accent-color: var(--minor); display: block; }
.stage { background: #000; overflow: auto; max-height: 78vh; }
.stage img { display: block; width: 100%; height: auto; }
/* The overlay is positioned against this inner box rather than the scroll
   container, so the two layers stay aligned while scrolled. */
.canvas { position: relative; }
.canvas .layer { position: absolute; top: 0; left: 0; right: 0; }
.sxs { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
.sxs figure { margin: 0; position: relative; }
.sxs figcaption {
  position: sticky; top: 6px; z-index: 1; width: fit-content;
  margin: 6px 0 -6px 6px; font: 11px var(--mono);
  background: rgba(0,0,0,.78); color: var(--fg); padding: 2px 7px; border-radius: 3px;
}
.legend { padding: 6px 10px; font: 11px var(--mono); color: var(--faint); }

.hidden { display: none !important; }
footer {
  padding: 22px 32px 40px; color: var(--faint); font: 12px/1.7 var(--mono);
  border-top: 1px solid var(--line);
}
@media (max-width: 720px) {
  header, main, footer { padding-left: 16px; padding-right: 16px; }
  .sxs { grid-template-columns: 1fr; }
}
`;

const SCRIPT = `
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Severity filter. Routes hide when every view inside them is hidden, so the
// list never shows an empty container.
const applyFilter = () => {
  const on = $$('.tally[aria-pressed="true"]').map((chip) => chip.dataset.severity);
  $$('.view').forEach((view) => {
    view.classList.toggle('hidden', on.length > 0 && !on.includes(view.dataset.severity));
  });
  $$('.route-group').forEach((group) => {
    const shown = $$('.view:not(.hidden)', group).length;
    group.classList.toggle('hidden', !group.dataset.always && shown === 0);
  });
};
$$('.tally').forEach((chip) => {
  chip.addEventListener('click', () => {
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true');
    applyFilter();
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  $$('.tally').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
  applyFilter();
});

const toggleAll = (open) =>
  $$('.route-group > details').forEach((details) => { details.open = open; });
document.getElementById('expand-all')?.addEventListener('click', () => toggleAll(true));
document.getElementById('collapse-all')?.addEventListener('click', () => toggleAll(false));

$$('.viewer').forEach((viewer) => {
  // Side-by-side reuses the images above rather than repeating their base64,
  // which would double the size of the file.
  $$('img[data-from]', viewer).forEach((img) => {
    img.src = viewer.querySelector('img[data-role="' + img.dataset.from + '"]').src;
  });
  const stage = viewer.querySelector('.stage');
  const slider = viewer.querySelector('input[type=range]');
  const apply = () => {
    const top = stage.querySelector('.layer-top');
    if (!top) return;
    if (stage.dataset.mode === 'slider') {
      top.style.clipPath = 'inset(0 0 0 ' + slider.value + '%)';
      top.style.opacity = 1;
    } else if (stage.dataset.mode === 'onion') {
      top.style.clipPath = 'none';
      top.style.opacity = slider.value / 100;
    }
  };
  const setMode = (mode) => {
    $$('.modes button', viewer).forEach((button) =>
      button.setAttribute('aria-pressed', button.dataset.mode === mode));
    stage.dataset.mode = mode;
    $$('[data-view]', viewer).forEach((el) =>
      el.classList.toggle('hidden', !el.dataset.view.split(' ').includes(mode)));
    slider.classList.toggle('hidden', mode !== 'slider' && mode !== 'onion');
    viewer.querySelector('.legend').classList.toggle('hidden', mode !== 'diff');
    apply();
  };
  slider.addEventListener('input', apply);
  $$('.modes button', viewer).forEach((button) =>
    button.addEventListener('click', () => setMode(button.dataset.mode)));
  setMode('slider');
});

// A deep link should open its route and land on the finding.
const openTarget = () => {
  const target = location.hash && document.querySelector(location.hash);
  if (!target) return;
  const details = target.closest('details');
  if (details) details.open = true;
  target.scrollIntoView({ block: 'center' });
};
window.addEventListener('hashchange', openTarget);
openTarget();
`;

function renderFinding(item) {
  const severity = severityOf(item.severity);
  let detail = '';
  if (item.detail) {
    const lines = item.detail.split('\n');
    const shown = lines.slice(0, MAX_DETAIL_LINES).map(escapeHtml);
    if (lines.length > shown.length) {
      shown.push(`  ... ${lines.length - shown.length} more line(s)`);
    }
    const body = DIFF_KINDS.has(item.kind)
      ? shown.map((line) =>
          line.startsWith('+')
            ? `<span class="add">${line}</span>`
            : line.startsWith('-')
              ? `<span class="del">${line}</span>`
              : line
        )
      : shown;
    detail = `<pre>${body.join('\n')}</pre>`;
  }
  return `<div class="finding ${severity}">
  <div class="finding-head">
    <span class="kind">${escapeHtml(item.kind)}</span>
    <span class="summary-text">${escapeHtml(item.summary)}</span>
  </div>${detail}
</div>`;
}

function renderViewer(visual, sourceLabel, targetLabel) {
  if (!visual) return '';
  const modes = ['slider', 'onion', 'side-by-side', 'diff']
    .map((mode) => `<button type="button" data-mode="${mode}">${mode}</button>`)
    .join('');
  return `<div class="viewer">
  <div class="modes">${modes}<span class="note">${escapeHtml(visual.note)}</span></div>
  <input type="range" min="0" max="100" value="50"
         aria-label="Wipe between source and target" />
  <div class="legend hidden">Red marks pixels that differ; yellow marks antialiasing.</div>
  <div class="stage" data-view="slider onion">
    <div class="canvas">
      <img data-role="source" src="${escapeHtml(visual.source)}" alt="${escapeHtml(sourceLabel)}" />
      <div class="layer layer-top">
        <img data-role="target" src="${escapeHtml(visual.target)}" alt="${escapeHtml(targetLabel)}" />
      </div>
    </div>
  </div>
  <div class="stage sxs hidden" data-view="side-by-side">
    <figure><figcaption>${escapeHtml(sourceLabel)}</figcaption><img data-from="source" alt="${escapeHtml(sourceLabel)}" /></figure>
    <figure><figcaption>${escapeHtml(targetLabel)}</figcaption><img data-from="target" alt="${escapeHtml(targetLabel)}" /></figure>
  </div>
  <div class="stage hidden" data-view="diff"><img src="${escapeHtml(visual.diff)}" alt="Pixel differences" /></div>
</div>`;
}

// Encoding is the expensive part of writing the report, so the budget is
// checked against an estimate first: paying full deflate for images that are
// about to be dropped cost about a minute on a large run. Four bytes a pixel
// across three images, base64'd, over-estimates enough to be a safe gate.
function embedVisual(entry, budget) {
  const { images } = entry.pixels;
  const cropTop = entry.pixels.cropTop ?? 0;
  const height = images.diff.height;
  const estimate = entry.pixels.width * height * 4 * 3 * (4 / 3);
  if (estimate > budget.remaining) return null;

  const visual = {
    source: dataUri(images.a),
    target: dataUri(images.b),
    diff: dataUri(images.diff),
    note:
      `showing y ${cropTop}-${cropTop + height} of ${entry.pixels.height}` +
      (entry.pixels.sizeMismatch
        ? ` (${entry.pixels.sizeA} vs ${entry.pixels.sizeB})`
        : ''),
  };
  budget.remaining -=
    visual.source.length + visual.target.length + visual.diff.length;
  return visual;
}

export function writeReport({
  outputPath,
  sourceOrigin,
  targetOrigin,
  startedAt,
  durationMs,
  entries,
  notes,
  coverage,
  releasedVisuals = 0,
  maxEmbedBytes,
}) {
  // Numeric collation, or "slide 10" sorts before "slide 2" and a deck reads
  // out of order.
  const collate = (x, y) =>
    x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });

  // Grouped by route: a deck with twenty differing states is one thing that
  // went wrong, not twenty.
  const byRoute = new Map();
  for (const entry of entries) {
    if (!byRoute.has(entry.route)) byRoute.set(entry.route, []);
    byRoute.get(entry.route).push(entry);
  }
  const groups = [...byRoute.entries()]
    .map(([route, views]) => ({
      route,
      views: views.sort(
        (a, b) => bySeverity(a, b) || collate(a.state, b.state)
      ),
      severity: views.map(severityOfEntry).sort(compareSeverity)[0],
    }))
    .sort(
      (a, b) =>
        compareSeverity(a.severity, b.severity) || collate(a.route, b.route)
    );

  const budget = { remaining: maxEmbedBytes };
  let embedded = 0;
  const dropped = [];

  const sections = groups.map((group) => {
    const views = group.views.map((entry) => {
      let visual = null;
      if (entry.pixels?.changed > 0 && entry.pixels.images.diff) {
        visual = embedVisual(entry, budget);
        if (visual) embedded++;
        else dropped.push(`${entry.route} ${entry.state}`.trim());
      }
      const severity = severityOf(entry.severity);
      const id = `${slug(entry.route)}${entry.state ? `--${slug(entry.state)}` : ''}`;
      return `<article class="view ${severity}" data-severity="${severity}" id="${id}">
  <div class="view-head">
    <span class="view-name">${escapeHtml(entry.state || 'desktop')}</span>
    <a class="anchor" href="#${id}" title="Link to this finding">#</a>
    <span class="open-links">
      <a href="${escapeHtml(sourceOrigin + entry.route)}" target="_blank" rel="noreferrer">open source</a>
      <a href="${escapeHtml(targetOrigin + entry.route)}" target="_blank" rel="noreferrer">open target</a>
    </span>
  </div>
  ${entry.findings.map(renderFinding).join('')}
  ${renderViewer(visual, `source · ${sourceOrigin}`, `target · ${targetOrigin}`)}
</article>`;
    });

    const counts = severityCounts(group.views.flatMap((view) => view.findings));
    const badges = SEVERITIES.filter((severity) => counts[severity])
      .map(
        (severity) =>
          `<span class="badge ${severity}">${counts[severity]} ${severity}</span>`
      )
      .join('');
    const open = group.severity === 'critical' || group.severity === 'major';
    const plural = group.views.length === 1 ? '' : 's';
    return `<section class="route-group ${group.severity}">
  <details ${open ? 'open' : ''}>
    <summary>
      <span class="route-name">${escapeHtml(group.route)}</span>
      <span class="view-count">${group.views.length} view${plural}</span>
      <span class="badges">${badges}</span>
    </summary>
    <div class="route-body">${views.join('')}</div>
  </details>
</section>`;
  });

  const totals = severityCounts(entries);
  const tallies = SEVERITIES.map(
    (severity) =>
      `<button type="button" class="tally ${severity}" data-severity="${severity}"
        data-empty="${totals[severity] === 0}" aria-pressed="false">${totals[severity]} ${severity}</button>`
  ).join('');

  const notesSection = notes.length
    ? `<section class="route-group info" data-always="1">
  <details open>
    <summary><span class="route-name">run notes</span>
    <span class="view-count">${notes.length}</span></summary>
    <div class="route-body"><article class="view info" data-severity="notes">
      ${notes.map((item) => renderFinding({ ...item, severity: 'info' })).join('')}
    </article></div>
  </details>
</section>`
    : '';

  const body = groups.length
    ? sections.join('\n')
    : `<div class="empty">
  <div class="tick">&#10003;</div>
  <h2>No differences found</h2>
  <p>Every captured page matched pixel for pixel.</p>
  <div class="checked">${escapeHtml(coverage || '')}</div>
</div>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'" />
<title>Site diff &#183; ${escapeHtml(sourceOrigin)} vs ${escapeHtml(targetOrigin)}</title>
<style>${STYLE}</style></head>
<body>
<header>
  <h1>Visual site difference report</h1>
  <div class="origins">
    source <b>${escapeHtml(sourceOrigin)}</b>
    <span class="arrow">&#8594;</span>
    target <b>${escapeHtml(targetOrigin)}</b>
  </div>
  <div class="meta">${escapeHtml(startedAt)} &#183; ${formatDuration(durationMs)} &#183; ${escapeHtml(coverage || '')} &#183; ${groups.length} route${groups.length === 1 ? '' : 's'} with findings</div>
  <div class="controls">
    ${tallies}
    <span class="spacer"></span>
    <button type="button" class="linkish" id="expand-all">expand all</button>
    <button type="button" class="linkish" id="collapse-all">collapse all</button>
  </div>
</header>
<main>
${notesSection}
${body}
</main>
<footer>
  ${embedded} comparison${embedded === 1 ? '' : 's'} embedded${dropped.length ? ` &#183; ${dropped.length} omitted to stay under --max-embed-mb: ${escapeHtml(dropped.join(', '))}` : ''}${releasedVisuals ? ` &#183; ${releasedVisuals} comparison(s) show findings without images, because only the first captures that differ are held in memory` : ''}
</footer>
<script>${SCRIPT}</script>
</body></html>`;

  fs.writeFileSync(outputPath, html);
  return { bytes: Buffer.byteLength(html), embedded, dropped };
}

const severityOfEntry = (entry) => severityOf(entry.severity);
const compareSeverity = (a, b) => SEVERITIES.indexOf(a) - SEVERITIES.indexOf(b);
