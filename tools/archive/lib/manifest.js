// The record of what is frozen: which routes, when and with which Hugo, where
// each one left its placeholder, the files each one needs, and what it referred
// to that was never there to capture. Generated and checked in.

import fs from 'node:fs';
import path from 'node:path';

export const ARCHIVE_DIR = 'archive';
export const SITE_DIR = 'archive/site';
export const MANIFEST_FILE = 'archive/manifest.json';

export function emptyManifest() {
  return { version: 2, routes: [] };
}

export function readManifest(repo) {
  const file = path.join(repo, MANIFEST_FILE);
  if (!fs.existsSync(file)) return emptyManifest();
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeManifest(repo, manifest) {
  manifest.routes.sort((a, b) => a.route.localeCompare(b.route));
  fs.mkdirSync(path.join(repo, ARCHIVE_DIR), { recursive: true });
  fs.writeFileSync(
    path.join(repo, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + '\n'
  );
}

/** Every file some frozen route still needs; `collect` drops the rest. */
export function liveFiles(manifest) {
  return new Set(manifest.routes.flatMap((entry) => entry.files));
}
