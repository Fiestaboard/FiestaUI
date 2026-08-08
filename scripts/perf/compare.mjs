/**
 * Pure comparison logic for bundle-cost reports.
 *
 * No I/O, no esbuild, no process access — every export here is a plain data
 * transform so it can be unit-tested directly. All judgement about what
 * constitutes a regression lives in this file; bundle.mjs only measures and
 * renders.
 *
 * See docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md.
 */

export const THRESHOLDS = {
  entryBytesPct: 0.02,
  entryBytesAbs: 200,
  barrelBytesPct: 0.01,
  // CSS ships verbatim, so a byte of growth is a byte a consumer pays. Gate it
  // on the same pct/abs pair as the JS entries.
  cssBytesPct: 0.02,
  cssBytesAbs: 200,
};

/** "@scope/pkg/sub" -> "@scope/pkg"; "react-dom/client" -> "react-dom". */
export function packageNameOf(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function diffExternals(baseList, headList) {
  const base = new Set(baseList);
  const head = new Set(headList);
  return {
    added: [...head].filter((name) => !base.has(name)).sort(),
    removed: [...base].filter((name) => !head.has(name)).sort(),
  };
}

function pct(delta, from) {
  return from === 0 ? 0 : delta / from;
}

function formatDelta(delta, ratio) {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta}B (${sign}${(ratio * 100).toFixed(2)}%)`;
}

export function compareReports(base, head, thresholds = THRESHOLDS) {
  const failures = [];
  const warnings = [];
  const wins = [];
  const rows = [];

  const barrelDelta = head.barrel.firstPartyBytes - base.barrel.firstPartyBytes;
  const barrelRatio = pct(barrelDelta, base.barrel.firstPartyBytes);
  const barrelExternals = diffExternals(base.barrel.externals, head.barrel.externals);

  if (barrelExternals.added.length > 0) {
    failures.push({
      kind: "new-external",
      entry: "<barrel>",
      detail: barrelExternals.added.join(", "),
    });
  }
  if (barrelRatio > thresholds.barrelBytesPct) {
    failures.push({
      kind: "barrel-bytes",
      entry: "<barrel>",
      detail: formatDelta(barrelDelta, barrelRatio),
    });
  }
  rows.push({
    entry: "<barrel>",
    baseBytes: base.barrel.firstPartyBytes,
    headBytes: head.barrel.firstPartyBytes,
    deltaBytes: barrelDelta,
    deltaPct: barrelRatio,
    baseTotalBytes: base.barrel.totalBytes,
    headTotalBytes: head.barrel.totalBytes,
    newExternals: barrelExternals.added,
    removedExternals: barrelExternals.removed,
    added: false,
  });

  for (const [name, headEntry] of Object.entries(head.exports)) {
    const baseEntry = base.exports[name];

    if (!baseEntry) {
      rows.push({
        entry: name,
        baseBytes: null,
        headBytes: headEntry.firstPartyBytes,
        deltaBytes: null,
        deltaPct: null,
        baseTotalBytes: null,
        headTotalBytes: headEntry.totalBytes,
        newExternals: [],
        removedExternals: [],
        added: true,
      });
      continue;
    }

    const delta = headEntry.firstPartyBytes - baseEntry.firstPartyBytes;
    const ratio = pct(delta, baseEntry.firstPartyBytes);
    const externals = diffExternals(baseEntry.externals, headEntry.externals);

    if (externals.added.length > 0) {
      failures.push({
        kind: "new-external",
        entry: name,
        detail: externals.added.join(", "),
      });
    }
    if (ratio > thresholds.entryBytesPct && delta > thresholds.entryBytesAbs) {
      failures.push({
        kind: "entry-bytes",
        entry: name,
        detail: formatDelta(delta, ratio),
      });
    }
    if (externals.removed.length > 0) {
      wins.push({
        kind: "dropped-external",
        entry: name,
        detail: externals.removed.join(", "),
      });
    }
    if (delta < 0) {
      wins.push({
        kind: "shrink",
        entry: name,
        detail: formatDelta(delta, ratio),
      });
    }

    rows.push({
      entry: name,
      baseBytes: baseEntry.firstPartyBytes,
      headBytes: headEntry.firstPartyBytes,
      deltaBytes: delta,
      deltaPct: ratio,
      baseTotalBytes: baseEntry.totalBytes,
      headTotalBytes: headEntry.totalBytes,
      newExternals: externals.added,
      removedExternals: externals.removed,
      added: false,
    });
  }

  for (const name of Object.keys(base.exports)) {
    if (!head.exports[name]) {
      warnings.push({
        kind: "removed-export",
        entry: name,
        detail: "present at base, absent at head — possible breaking change",
      });
    }
  }

  // CSS assets. Older reports predate the css section; treat a missing one as
  // empty so this comparison is a no-op against them rather than a crash.
  const cssRows = [];
  const baseCss = base.css ?? {};
  const headCss = head.css ?? {};

  for (const [name, headEntry] of Object.entries(headCss)) {
    const baseEntry = baseCss[name];

    if (!baseEntry) {
      cssRows.push({
        entry: name,
        baseBytes: null,
        headBytes: headEntry.bytes,
        deltaBytes: null,
        deltaPct: null,
        added: true,
      });
      continue;
    }

    const delta = headEntry.bytes - baseEntry.bytes;
    const ratio = pct(delta, baseEntry.bytes);

    if (ratio > thresholds.cssBytesPct && delta > thresholds.cssBytesAbs) {
      failures.push({
        kind: "css-bytes",
        entry: name,
        detail: formatDelta(delta, ratio),
      });
    }
    if (delta < 0) {
      wins.push({
        kind: "css-shrink",
        entry: name,
        detail: formatDelta(delta, ratio),
      });
    }

    cssRows.push({
      entry: name,
      baseBytes: baseEntry.bytes,
      headBytes: headEntry.bytes,
      deltaBytes: delta,
      deltaPct: ratio,
      added: false,
    });
  }

  for (const name of Object.keys(baseCss)) {
    if (!headCss[name]) {
      warnings.push({
        kind: "removed-css",
        entry: name,
        detail: "present at base, absent at head — stylesheet no longer shipped",
      });
    }
  }

  return { ok: failures.length === 0, failures, warnings, wins, rows, cssRows };
}
