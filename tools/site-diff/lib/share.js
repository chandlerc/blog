// Ephemeral sharing of the report.
//
// The report is uploaded as a secret gist through the `gh` CLI, which is
// already authenticated on any machine that pushes to this repo. Secret gists
// are exactly the sharing model wanted here: the URL embeds an unguessable
// identifier, the gist is listed nowhere public, and deleting it kills the
// link within GitHub's five-minute edge cache.
//
// GitHub serves raw gist content as text/plain with nosniff, so a browser will
// never render the report from the gist URL itself. The printed link instead
// goes through htmlpreview.github.io, a static page that fetches the raw gist
// (CORS on gist raw is `*`) and document.writes it. Verified against the
// alternatives: the report's own scripts execute there at 25MB, the bytes go
// only to GitHub (the viewer itself is the only thing loaded from its host),
// and there is no interstitial. githack puts an ad-carrying click-through
// notice on every visit, and gistpreview stops executing scripts on files
// large enough to be truncated by the gist API.
//
// Shares are ephemeral by construction: every upload also deletes previous
// report gists older than SHARE_TTL_DAYS, recognized by the MARKER prefix in
// their description, so links expire without anyone remembering to clean up.

import fs from 'node:fs';
import { spawn } from 'node:child_process';

export const MARKER = '[site-diff]';
export const GIST_FILENAME = 'site-diff-report.html';
export const SHARE_TTL_DAYS = 7;

function runGh(args, { inputPath } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: [inputPath ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (err) => {
      reject(
        err.code === 'ENOENT'
          ? new Error('sharing needs the `gh` CLI on PATH, logged in to GitHub')
          : err
      );
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`gh ${args[0]} ${args[1] ?? ''} failed: ${stderr.trim()}`)
        );
        return;
      }
      resolve(stdout);
    });
    if (inputPath) {
      const stream = fs.createReadStream(inputPath);
      stream.on('error', reject);
      stream.pipe(child.stdin);
    }
  });
}

// `gh gist create` prints progress to stderr and the gist URL to stdout.
export function parseGistUrl(output) {
  const match = output.match(
    /https:\/\/gist\.github\.com\/([^/\s]+)\/([0-9a-f]+)\s*$/
  );
  if (!match) {
    throw new Error(`gh gist create did not print a gist URL:\n${output}`);
  }
  return { user: match[1], id: match[2] };
}

export function viewUrl(user, id) {
  return (
    'https://htmlpreview.github.io/?' +
    `https://gist.githubusercontent.com/${user}/${id}/raw/${GIST_FILENAME}`
  );
}

export async function shareReport({ reportPath, description }) {
  const output = await runGh(
    [
      'gist',
      'create',
      '--desc',
      `${MARKER} ${description}`,
      '--filename',
      GIST_FILENAME,
      '-',
    ],
    { inputPath: reportPath }
  );
  const { user, id } = parseGistUrl(output);
  return {
    id,
    gistUrl: `https://gist.github.com/${user}/${id}`,
    viewUrl: viewUrl(user, id),
  };
}

// Which of the caller's gists are expired shares. Only gists this tool created
// are candidates, and only by the marker: matching anything looser would
// delete gists that are not ours to delete.
export function expiredShares(gists, nowMs, ttlDays = SHARE_TTL_DAYS) {
  const cutoff = nowMs - ttlDays * 24 * 60 * 60 * 1000;
  return gists
    .filter(
      (gist) =>
        typeof gist.description === 'string' &&
        gist.description.startsWith(MARKER) &&
        Date.parse(gist.created_at) < cutoff
    )
    .map((gist) => gist.id);
}

// One page of 100 covers every realistic backlog: the steady state is one gist
// per share within the TTL, and every share prunes again.
export async function pruneShares() {
  const listing = await runGh(['api', 'gists?per_page=100']);
  const expired = expiredShares(JSON.parse(listing), Date.now());
  for (const id of expired) {
    await runGh(['api', '-X', 'DELETE', `gists/${id}`]);
  }
  return expired.length;
}
