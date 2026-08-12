// Line diffing, shared by the visible-text comparison and the feed comparison.

// Beyond this the LCS table stops being worth its memory: the matrix is one
// Uint32 per pair of lines, so 20k x 20k would ask for 1.6 GB.
const MAX_LCS_CELLS = 4_000_000;

// Longest common subsequence, returned as ['-'|'+'|' ', line] in order.
export function diffLines(a, b) {
  if (a.length * b.length > MAX_LCS_CELLS) {
    return [
      ['-', `(${a.length} lines, too large to diff line by line)`],
      ['+', `(${b.length} lines, too large to diff line by line)`],
    ];
  }

  const lcs = Array.from(
    { length: a.length + 1 },
    () => new Uint32Array(b.length + 1)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const script = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) script.push([' ', a[i++], j++]);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) script.push(['-', a[i++]]);
    else script.push(['+', b[j++]]);
  }
  while (i < a.length) script.push(['-', a[i++]]);
  while (j < b.length) script.push(['+', b[j++]]);
  return script;
}

// The same diff, rendered with a little context and the unchanged stretches
// elided.
export function unifiedDiff(a, b, context = 2) {
  const script = diffLines(a.split('\n'), b.split('\n'));
  const keep = new Set();
  script.forEach((entry, index) => {
    if (entry[0] === ' ') return;
    for (
      let k = Math.max(0, index - context);
      k <= Math.min(script.length - 1, index + context);
      k++
    ) {
      keep.add(k);
    }
  });

  const out = [];
  let skipping = false;
  script.forEach((entry, index) => {
    if (keep.has(index)) {
      out.push(`${entry[0]} ${entry[1]}`);
      skipping = false;
    } else if (!skipping) {
      out.push('  ...');
      skipping = true;
    }
  });
  return out.join('\n');
}
