// The two shapes everything in this tool produces, and the vocabulary for
// ranking them.

// Most severe first. Report ordering and the exit code both depend on this
// order, so it lives in one place.
export const SEVERITIES = ['critical', 'major', 'minor', 'info'];

const rank = (severity) => {
  const index = SEVERITIES.indexOf(severity);
  return index === -1 ? SEVERITIES.length : index;
};

export function worstSeverity(findings) {
  return findings.reduce(
    (worst, current) =>
      rank(current.severity) < rank(worst) ? current.severity : worst,
    'info'
  );
}

export function bySeverity(a, b) {
  return rank(a.severity) - rank(b.severity);
}

/** One thing worth telling the reader about. */
export function finding(severity, kind, summary, detail = '') {
  return { severity, kind, summary, detail };
}

/** The findings for one view of one route, with the pixels that show them. */
export function entry(route, state, findings, pixels = null) {
  return {
    route,
    state,
    findings,
    severity: worstSeverity(findings),
    pixels,
  };
}

// Run-wide context rather than a finding about the site: which routes were
// skipped, what was blocked, what could not be captured.
export function note(kind, summary, detail = '') {
  return { kind, summary, detail };
}

// Bounded work over a list, N at a time. Three callers, all of which want
// exactly this and nothing more.
export async function pooled(items, concurrency, worker) {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  };
  const width = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: width }, run));
}
