// The file a frozen page leaves behind in content/.
//
// Hugo builds its lists and its sitemap from content, so a frozen page keeps a
// content file carrying what a list entry reads. Everything the page itself
// needs is in the archive.

import fs from 'node:fs';
import path from 'node:path';

/** First line of every placeholder, and how one is recognised. */
export const MARKER = 'Placeholder for a frozen page.';

/** A bundle's index file stands for its whole directory; a plain file for itself. */
export function sourceTree(contentPath) {
  return /^_?index\.[^.]+$/.test(path.basename(contentPath))
    ? path.dirname(contentPath)
    : contentPath;
}

/** TOML basic strings and arrays of them are a subset of JSON. */
const toml = (value) => JSON.stringify(value);

/** A paragraph as TOML comment lines, wrapped to fit 80 columns. */
function comment(text) {
  const lines = [];
  let line = '#';
  for (const word of text.split(/\s+/)) {
    if (line.length + 1 + word.length > 80 && line !== '#') {
      lines.push(line);
      line = '#';
    }
    line += ' ' + word;
  }
  lines.push(line);
  return lines;
}

export function renderPlaceholder({
  route,
  title,
  date = '',
  aliases = [],
  tags = [],
  frozen,
}) {
  const what = route.startsWith('/slides/') ? 'slide deck' : 'page';
  const lines = [
    '+++',
    ...comment(
      `${MARKER} The ${what} at ${route} is served from archive/site/, ` +
        `exactly as captured on ${frozen}. This file only keeps it in the ` +
        `lists and the sitemap; nothing here reaches the URL itself. To ` +
        `change the ${what}, thaw it first: ./archive.sh thaw ${route}. ` +
        `See archive/README.md.`
    ),
    `title = ${toml(title)}`,
  ];
  if (date) lines.push(`date = ${toml(date)}`);
  if (aliases.length) lines.push(`aliases = ${toml(aliases)}`);
  if (tags.length) lines.push(`tags = ${toml(tags)}`);
  lines.push(
    `summary = ${toml(`An archived ${what}, served exactly as it was published.`)}`,
    '# The body is empty, and a word count of it would be meaningless.',
    'ShowWordCount = false',
    '[build]',
    '  render = "link"',
    '  publishResources = false',
    '+++',
    ''
  );
  return lines.join('\n');
}

export function isPlaceholder(text) {
  return text.startsWith(`+++\n# ${MARKER}`);
}

/** Replace a page's source with its placeholder. */
export function retireSource(repo, contentPath, placeholder) {
  fs.rmSync(path.join(repo, sourceTree(contentPath)), {
    recursive: true,
    force: true,
  });
  const file = path.join(repo, contentPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, placeholder);
}

/** Remove a placeholder, refusing to touch anything that is not one. */
export function removePlaceholder(repo, contentPath) {
  const file = path.join(repo, contentPath);
  if (!fs.existsSync(file) || !isPlaceholder(fs.readFileSync(file, 'utf8'))) {
    throw new Error(
      `${contentPath} is not the placeholder the freeze left behind. ` +
        `Nothing was changed.`
    );
  }
  fs.rmSync(file);
}
