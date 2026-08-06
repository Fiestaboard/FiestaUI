# Bundle-Cost Measurement Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure what a downstream consumer pays to import from `@fiestaboard/ui`, and fail CI when that cost regresses.

**Architecture:** Two Node ESM modules under `scripts/perf/`. `compare.mjs` holds pure data transforms (threshold math, external-set diffing) and is unit-tested directly. `bundle.mjs` is the CLI: it drives esbuild to produce reports and delegates all judgement to `compare.mjs`. A `perf-bundle` CI job measures the PR base and head in one run and renders a table into the job summary.

**Tech Stack:** Node 24, ESM, esbuild, `node --test`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md`

## Global Constraints

- Node 24 in CI. Scripts are ESM `.mjs`, no TypeScript — matches `scripts/vrt/vrt.mjs`.
- `npm run format:check` (Prettier) must pass; repo CI enforces it on every file.
- `actionlint` must pass on any workflow change; the `automation` CI job runs it.
- Never commit to `main`. Feature branch + PR. Conventional commit messages.
- `esbuild` is an explicit devDependency, never a transitive one.
- Byte values are gzip level 9 of minified ESM output.
- `bundle.mjs` resolves `dist/` from `--dist <path>`, defaulting to `<cwd>/dist`. It must never resolve `dist/` relative to its own file location — CI runs it from a temp copy.
- Blocking thresholds: entry `firstPartyBytes` fails at **>2% AND >200 bytes**; barrel fails at **>1%**; any newly-added external fails.

---

### Task 1: Pure comparison logic

**Files:**

- Create: `scripts/perf/compare.mjs`
- Test: `scripts/perf/tests/compare.test.mjs`

**Interfaces:**

- Consumes: nothing (first task).
- Produces: `packageNameOf(specifier) -> string`, `THRESHOLDS` object, and `compareReports(base, head, thresholds?) -> {ok, failures, warnings, wins, rows}`. Task 3 imports all three.

- [ ] **Step 1: Write the failing test**

Create `scripts/perf/tests/compare.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import { compareReports, packageNameOf } from "../compare.mjs";

const report = (overrides = {}) => ({
  schemaVersion: 1,
  ref: "abc123",
  barrel: { externals: ["clsx"], firstPartyBytes: 10000, totalBytes: 50000 },
  exports: {
    Button: { externals: ["clsx"], firstPartyBytes: 1000, totalBytes: 20000 },
  },
  ...overrides,
});

const entry = (overrides = {}) => ({
  externals: ["clsx"],
  firstPartyBytes: 1000,
  totalBytes: 20000,
  ...overrides,
});

test("packageNameOf reduces specifiers to package names", () => {
  assert.equal(packageNameOf("clsx"), "clsx");
  assert.equal(packageNameOf("react-dom/client"), "react-dom");
  assert.equal(packageNameOf("@base-ui/react"), "@base-ui/react");
  assert.equal(packageNameOf("@base-ui/react/menu"), "@base-ui/react");
});

test("identical reports pass with no findings", () => {
  const result = compareReports(report(), report());
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test("a newly reachable external fails", () => {
  const head = report({
    exports: { Button: entry({ externals: ["clsx", "ogl"] }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].kind, "new-external");
  assert.match(result.failures[0].detail, /ogl/);
});

test("entry growth past both thresholds fails", () => {
  const head = report({
    exports: { Button: entry({ firstPartyBytes: 1300 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].kind, "entry-bytes");
});

test("large percentage but tiny absolute growth does not fail", () => {
  const base = report({ exports: { Tiny: entry({ firstPartyBytes: 100 }) } });
  const head = report({ exports: { Tiny: entry({ firstPartyBytes: 150 }) } });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
});

test("large absolute but tiny percentage growth does not fail", () => {
  const base = report({
    exports: { Big: entry({ firstPartyBytes: 100000 }) },
  });
  const head = report({
    exports: { Big: entry({ firstPartyBytes: 100300 }) },
  });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
});

test("barrel growth past 1 percent fails", () => {
  const head = report({
    barrel: { externals: ["clsx"], firstPartyBytes: 10200, totalBytes: 50000 },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.kind === "barrel-bytes"));
});

test("a new export is reported but never fails", () => {
  const head = report({
    exports: { Button: entry(), Sparkline: entry({ firstPartyBytes: 9999 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.ok(result.rows.some((r) => r.entry === "Sparkline" && r.added));
});

test("a removed export warns but does not fail", () => {
  const head = report({ exports: {} });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.equal(result.warnings[0].kind, "removed-export");
});

test("shrinking and dropping an external are recorded as wins", () => {
  const head = report({
    exports: { Button: entry({ externals: [], firstPartyBytes: 500 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.ok(result.wins.some((w) => w.kind === "dropped-external"));
  assert.ok(result.wins.some((w) => w.kind === "shrink"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/perf/tests/compare.test.mjs`
Expected: FAIL — `Cannot find module '../compare.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/perf/compare.mjs`:

```js
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

  return { ok: failures.length === 0, failures, warnings, wins, rows };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/perf/tests/compare.test.mjs`
Expected: PASS, 10 tests.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write scripts/perf
git add scripts/perf
git commit -m "feat(perf): pure comparison logic for bundle-cost reports"
```

---

### Task 2: Measure mode

**Files:**

- Create: `scripts/perf/bundle.mjs`
- Modify: `package.json` (add `esbuild` devDependency, add `perf:bundle` script)

**Interfaces:**

- Consumes: `packageNameOf` from `scripts/perf/compare.mjs`.
- Produces: a CLI invoked as `node scripts/perf/bundle.mjs measure --out <file> [--dist <path>]`, writing the report schema defined in the spec. Task 3 adds a second mode to this same file; Task 4 calls it from CI.

- [ ] **Step 1: Add esbuild and the npm script**

```bash
npm install --save-dev --save-exact esbuild
```

Then add to the `scripts` block of `package.json`, after `"vrt:serve"`:

```json
"perf:bundle": "node scripts/perf/bundle.mjs"
```

- [ ] **Step 2: Write the measure implementation**

Create `scripts/perf/bundle.mjs`:

```js
#!/usr/bin/env node
/**
 * FiestaUI bundle-cost harness.
 *
 * Measures what a consumer actually pays to import from the built library.
 * dist/ is a preserveModules tree rather than a bundle, so its own size means
 * nothing; instead we bundle one synthetic entry per public export and record
 * what each drags in.
 *
 * Modes:
 *
 *   node scripts/perf/bundle.mjs measure --out <file> [--dist <path>]
 *     Enumerate the barrel's exports, bundle each one, write a JSON report.
 *     Requires a built dist/. --dist defaults to <cwd>/dist.
 *
 * See docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";

import { packageNameOf } from "./compare.mjs";

// The consumer always already has these; everything else is cost we impose.
const CONSUMER_PROVIDED = ["react", "react/*", "react-dom", "react-dom/*"];

const log = (msg) => process.stdout.write(`${msg}\n`);

function parseArgs(argv) {
  const args = {
    mode: argv[2],
    out: null,
    dist: path.resolve(process.cwd(), "dist"),
    base: null,
    head: null,
    markdown: null,
  };
  for (let i = 3; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--out") args.out = argv[++i];
    else if (flag === "--dist") args.dist = path.resolve(argv[++i]);
    else if (flag === "--base") args.base = argv[++i];
    else if (flag === "--head") args.head = argv[++i];
    else if (flag === "--markdown") args.markdown = argv[++i];
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(2);
    }
  }
  return args;
}

/** esbuild plugin: mark every bare specifier external and record its package. */
function externalizeBare(collected) {
  return {
    name: "externalize-bare",
    setup(builder) {
      builder.onResolve({ filter: /^[^./]/ }, (args) => {
        collected.add(packageNameOf(args.path));
        return { path: args.path, external: true };
      });
    },
  };
}

function gzippedSize(outputFiles) {
  const source = outputFiles.map((file) => file.text).join("");
  return gzipSync(Buffer.from(source), { level: 9 }).length;
}

/** Bundle with all third-party code external: FiestaUI's own byte cost. */
async function measureFirstParty(contents, resolveDir) {
  const externals = new Set();
  const result = await build({
    stdin: { contents, resolveDir, loader: "js" },
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
    plugins: [externalizeBare(externals)],
    logLevel: "silent",
  });
  return {
    bytes: gzippedSize(result.outputFiles),
    externals: [...externals].sort(),
  };
}

/** Bundle with only react/react-dom external: total delivered cost. */
async function measureTotal(contents, resolveDir) {
  const result = await build({
    stdin: { contents, resolveDir, loader: "js" },
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
    external: CONSUMER_PROVIDED,
    logLevel: "silent",
  });
  return gzippedSize(result.outputFiles);
}

async function listExports(distEntry) {
  const externals = new Set();
  const result = await build({
    entryPoints: [distEntry],
    bundle: true,
    format: "esm",
    write: false,
    metafile: true,
    plugins: [externalizeBare(externals)],
    logLevel: "silent",
  });
  const output = Object.values(result.metafile.outputs).find((candidate) => Array.isArray(candidate.exports));
  return (output?.exports ?? []).slice().sort();
}

async function measureEntry(contents, resolveDir) {
  const firstParty = await measureFirstParty(contents, resolveDir);
  const totalBytes = await measureTotal(contents, resolveDir);
  return {
    externals: firstParty.externals,
    firstPartyBytes: firstParty.bytes,
    totalBytes,
  };
}

async function measure(args) {
  if (!args.out) {
    console.error("measure requires --out <file>");
    process.exit(2);
  }
  const distEntry = path.join(args.dist, "index.js");
  const resolveDir = args.dist;

  const exportNames = await listExports(distEntry);
  log(`Measuring ${exportNames.length} export(s) from ${distEntry}`);

  const barrelSource = `export * from ${JSON.stringify(distEntry)};`;
  const barrel = await measureEntry(barrelSource, resolveDir);

  const exports = {};
  for (const name of exportNames) {
    const source = `import { ${name} } from ${JSON.stringify(distEntry)};\n` + `export default ${name};\n`;
    exports[name] = await measureEntry(source, resolveDir);
  }

  const report = {
    schemaVersion: 1,
    ref: process.env.GITHUB_SHA ?? "local",
    barrel,
    exports,
  };
  await writeFile(args.out, `${JSON.stringify(report, null, 2)}\n`);
  log(`Wrote ${args.out} — barrel ${barrel.firstPartyBytes}B first-party`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "measure") {
    await measure(args);
    return;
  }
  console.error(`Usage: bundle.mjs measure --out <file> [--dist <path>]`);
  process.exit(2);
}

await main();
```

- [ ] **Step 3: Verify against the real library**

```bash
npm run build
npm run perf:bundle -- measure --out /tmp/perf-head.json
node -e "const r=require('/tmp/perf-head.json'); console.log('exports:', Object.keys(r.exports).length); console.log('barrel externals:', r.barrel.externals.join(', ')); console.log('Button externals:', r.exports.Button.externals.join(', '));"
```

Expected: a non-zero export count, `ogl` present in the barrel's externals, and — the question this whole harness exists to answer — `ogl` **absent** from `Button`'s externals. If `ogl` appears under `Button`, tree-shaking is not isolating the aurora and that is a real finding to report, not a bug in this script.

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write scripts/perf package.json
git add scripts/perf package.json package-lock.json
git commit -m "feat(perf): measure per-export bundle cost with esbuild"
```

---

### Task 3: Compare mode and markdown report

**Files:**

- Modify: `scripts/perf/bundle.mjs`
- Test: `scripts/perf/tests/compare.test.mjs` (already covers the logic; no new tests)

**Interfaces:**

- Consumes: `compareReports` from `scripts/perf/compare.mjs`; report files written by Task 2.
- Produces: `node scripts/perf/bundle.mjs compare --base <a> --head <b> [--markdown <file>]`, exiting `0` when clean and `1` on any failure. Task 4 depends on that exit code.

- [ ] **Step 1: Add the renderer and compare mode**

In `scripts/perf/bundle.mjs`, extend the `compare.mjs` import:

```js
import { compareReports, packageNameOf } from "./compare.mjs";
```

Add `readFile` to the `node:fs/promises` import:

```js
import { readFile, writeFile } from "node:fs/promises";
```

Then add these two functions above `main()`:

```js
function renderMarkdown(result) {
  const lines = ["## Bundle budget", ""];

  if (result.failures.length > 0) {
    lines.push("### Regressions", "");
    for (const item of result.failures) {
      lines.push(`- **${item.entry}** — ${item.kind}: ${item.detail}`);
    }
    lines.push("");
  }
  if (result.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const item of result.warnings) {
      lines.push(`- **${item.entry}** — ${item.detail}`);
    }
    lines.push("");
  }
  if (result.wins.length > 0) {
    lines.push("### Improvements", "");
    for (const item of result.wins) {
      lines.push(`- **${item.entry}** — ${item.kind}: ${item.detail}`);
    }
    lines.push("");
  }

  const changed = result.rows.filter(
    (row) => row.added || row.deltaBytes !== 0 || row.newExternals.length > 0 || row.removedExternals.length > 0,
  );

  lines.push("### Entries with a delta", "");
  if (changed.length === 0) {
    lines.push("No entry changed size or dependency reachability.");
  } else {
    lines.push("| Entry | First-party base | head | Delta | New externals |", "| --- | ---: | ---: | ---: | --- |");
    for (const row of changed) {
      const base = row.baseBytes === null ? "—" : `${row.baseBytes}B`;
      const delta = row.added ? "new" : `${row.deltaBytes >= 0 ? "+" : ""}${row.deltaBytes}B`;
      const externals = row.newExternals.length > 0 ? row.newExternals.join(", ") : "—";
      lines.push(`| \`${row.entry}\` | ${base} | ${row.headBytes}B | ${delta} | ${externals} |`);
    }
  }

  lines.push("", `_${result.rows.length} entries measured._`);
  return `${lines.join("\n")}\n`;
}

async function compare(args) {
  if (!args.base || !args.head) {
    console.error("compare requires --base <file> and --head <file>");
    process.exit(2);
  }
  const base = JSON.parse(await readFile(args.base, "utf8"));
  const head = JSON.parse(await readFile(args.head, "utf8"));
  const result = compareReports(base, head);
  const markdown = renderMarkdown(result);

  log(markdown);
  if (args.markdown) await writeFile(args.markdown, markdown);

  if (!result.ok) {
    log(`FAIL — ${result.failures.length} bundle regression(s).`);
    process.exit(1);
  }
  log("PASS — no bundle regressions.");
}
```

Replace the body of `main()` with:

```js
async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "measure") {
    await measure(args);
    return;
  }
  if (args.mode === "compare") {
    await compare(args);
    return;
  }
  console.error(
    "Usage:\n" +
      "  bundle.mjs measure --out <file> [--dist <path>]\n" +
      "  bundle.mjs compare --base <file> --head <file> [--markdown <file>]",
  );
  process.exit(2);
}
```

- [ ] **Step 2: Verify a clean comparison passes**

```bash
cp /tmp/perf-head.json /tmp/perf-base.json
npm run perf:bundle -- compare --base /tmp/perf-base.json --head /tmp/perf-head.json
echo "exit=$?"
```

Expected: "PASS — no bundle regressions.", `exit=0`.

- [ ] **Step 3: Verify a synthetic regression fails**

```bash
node -e "
const fs=require('fs');
const r=JSON.parse(fs.readFileSync('/tmp/perf-head.json','utf8'));
const k=Object.keys(r.exports)[0];
r.exports[k].externals=[...r.exports[k].externals,'ogl'];
fs.writeFileSync('/tmp/perf-bad.json', JSON.stringify(r,null,2));
"
npm run perf:bundle -- compare --base /tmp/perf-base.json --head /tmp/perf-bad.json
echo "exit=$?"
```

Expected: a "Regressions" section naming `ogl` as a `new-external`, and `exit=1`.

- [ ] **Step 4: Run the unit tests and format**

```bash
node --test scripts/perf/tests/
npx prettier --write scripts/perf
```

Expected: 10 tests pass, formatting clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/perf
git commit -m "feat(perf): compare mode with markdown budget report"
```

---

### Task 4: CI job, report-only

**Files:**

- Modify: `.github/workflows/ci.yml` (add `perf-bundle` job; add `node --test` to the `automation` job)

**Interfaces:**

- Consumes: `npm run perf:bundle` from Tasks 2–3.
- Produces: a `Bundle Budget` check on every PR. Task 5 adds it to `ci-success`.

- [ ] **Step 1: Run the new unit tests in the existing automation job**

In `.github/workflows/ci.yml`, inside the `automation` job, after the `Run script tests` step, add:

```yaml
- uses: actions/setup-node@v7
  with:
    node-version: "24"
    cache: npm

- name: Run perf harness unit tests
  run: node --test scripts/perf/tests/
```

- [ ] **Step 2: Add the perf-bundle job**

Add this job to `.github/workflows/ci.yml`, after the `build` job:

```yaml
perf-bundle:
  name: Bundle Budget
  runs-on: ubuntu-latest
  timeout-minutes: 15
  # Needs a base to compare against, so PRs only.
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v7
      with:
        fetch-depth: 0

    - uses: actions/setup-node@v7
      with:
        node-version: "24"
        cache: npm

    # Installed ONCE, at head, and never reinstalled. Reinstalling at base
    # would uninstall esbuild on any PR that touches package-lock.json —
    # including the PR that first added it. Holding dependencies fixed also
    # isolates the source change, which is the only thing being gated.
    - name: Install dependencies
      run: npm ci --no-audit

    # The harness must not come from the checked-out tree: it does not exist
    # at the base commit of the PR that adds it, and in general the two
    # copies could differ. Measuring both sides with identical code is the
    # whole point.
    - name: Stage the harness outside the worktree
      run: cp -R scripts/perf "$RUNNER_TEMP/perf-tool"

    - name: Measure base
      env:
        BASE_SHA: ${{ github.event.pull_request.base.sha }}
      run: |
        set -euo pipefail
        git checkout --quiet --force "$BASE_SHA" -- src package.json vite.config.ts tsconfig.build.json
        npm run build
        node "$RUNNER_TEMP/perf-tool/bundle.mjs" measure \
          --out "$RUNNER_TEMP/base.json" --dist "$GITHUB_WORKSPACE/dist"

    - name: Measure head
      run: |
        set -euo pipefail
        git checkout --quiet --force HEAD -- src package.json vite.config.ts tsconfig.build.json
        npm run build
        node "$RUNNER_TEMP/perf-tool/bundle.mjs" measure \
          --out "$RUNNER_TEMP/head.json" --dist "$GITHUB_WORKSPACE/dist"

    - name: Compare
      id: compare
      run: |
        set +e
        node "$RUNNER_TEMP/perf-tool/bundle.mjs" compare \
          --base "$RUNNER_TEMP/base.json" \
          --head "$RUNNER_TEMP/head.json" \
          --markdown "$RUNNER_TEMP/report.md"
        code=$?
        set -e
        echo "exit_code=${code}" >> "$GITHUB_OUTPUT"
        cat "$RUNNER_TEMP/report.md" >> "$GITHUB_STEP_SUMMARY"

    # Report-only during rollout. Task 5 turns this into a hard failure.
    - name: Report result
      env:
        COMPARE_EXIT: ${{ steps.compare.outputs.exit_code }}
      run: |
        if [ "$COMPARE_EXIT" != "0" ]; then
          echo "::warning::Bundle budget regression detected (report-only during rollout)."
        else
          echo "No bundle regressions."
        fi
```

Note the base checkout restores only the build inputs — `src`, `package.json`, `vite.config.ts`, `tsconfig.build.json` — rather than switching the whole tree. That keeps `node_modules`, `scripts/`, and the git ref intact while swapping exactly what affects the build, which is also why the "measure head" step can restore from `HEAD` without any ref juggling.

- [ ] **Step 3: Validate the workflow**

```bash
actionlint .github/workflows/ci.yml
npx prettier --check .github/workflows/ci.yml
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(perf): add report-only bundle budget job"
```

- [ ] **Step 5: Open the PR and confirm the job runs**

```bash
git push -u origin HEAD
gh pr create --title "feat(perf): bundle-cost measurement harness" --body "Implements docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md. Report-only; not yet wired into ci-success."
```

Confirm the `Bundle Budget` check appears, the job summary renders a table, and the job is green. This PR adds `esbuild` to `package-lock.json`, so it is also the first real exercise of the install-once behaviour.

---

### Task 5 (GATED): Promote to blocking

**Do not start this task until the `perf-bundle` job has run report-only on several real PRs and the numbers have proven stable.** This is spec rollout step 4. Promoting early is how a perf gate earns a reputation for crying wolf and gets deleted.

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Make the job fail on regression unless labelled**

Replace the `Report result` step with:

```yaml
- name: Enforce budget
  env:
    COMPARE_EXIT: ${{ steps.compare.outputs.exit_code }}
    LABELS: ${{ join(github.event.pull_request.labels.*.name, ',') }}
  run: |
    set -euo pipefail
    if [ "$COMPARE_EXIT" = "0" ]; then
      echo "No bundle regressions."
      exit 0
    fi
    case ",${LABELS}," in
      *,perf-budget-ok,*)
        echo "::warning::Bundle regression accepted via perf-budget-ok label."
        exit 0
        ;;
    esac
    echo "::error::Bundle budget regression. Fix it, or apply the perf-budget-ok label to accept it."
    exit 1
```

- [ ] **Step 2: Add the job to the aggregate check**

In the `ci-success` job, change `needs` to include `perf-bundle`:

```yaml
needs: [lint, build, a11y-tests, automation, visual-regression, perf-bundle]
```

Because `perf-bundle` is skipped on non-PR events and `ci-success` uses `if: always()` with a `contains(needs.*.result, 'failure')` check, a skipped job does not fail the aggregate.

- [ ] **Step 3: Create the escape-hatch label**

```bash
gh label create perf-budget-ok --color FBCA04 --description "Accept a measured bundle-size regression on this PR"
```

- [ ] **Step 4: Validate and commit**

```bash
actionlint .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci(perf): promote bundle budget to a blocking check"
```

---

### Task 6 (GATED): Audit self-verification

**Do not start until Task 5 has landed.** This is spec rollout step 5.

**Files:**

- Modify: `.github/workflows/claude-perf-audit.yml`

- [ ] **Step 1: Extend the allowlist**

In the `Run Claude perf-audit` step's `--allowed-tools` string, add `Bash(npm run perf:bundle:*)` immediately after `Bash(npm run build:*)`.

- [ ] **Step 2: Add the verification instruction to the prompt**

In the audit prompt, replace the block beginning `**Before committing, prove you didn't break anything:**` through the `npm run build` fence with:

```
            **Before committing, prove you didn't break anything.**

            First capture the bundle cost as it stands, before your edits:

                npm run build
                npm run perf:bundle -- measure --out /tmp/perf-before.json

            Then apply your bucket-A fixes, and re-measure:

                npm run typecheck
                npm run lint
                npm run build
                npm run perf:bundle -- measure --out /tmp/perf-after.json
                npm run perf:bundle -- compare --base /tmp/perf-before.json --head /tmp/perf-after.json

            typecheck, lint, and build must all pass. If any fails, revert the
            change that caused it and re-run. If you cannot get all three
            green, do not open the PR at all — file the findings as issues
            instead and say so in the wrap-up.

            If `compare` reports a regression, revert whichever fix caused it.
            A performance fix that makes the bundle bigger is not a fix.

            Expect the comparison to read zero for most bucket-A work —
            hoisting a literal does not move bytes. That is the normal result,
            not a failure. Its purpose is to catch the case where an
            import-shaped change quietly costs every consumer something.
```

- [ ] **Step 3: Extend the PR body requirement**

In the same prompt, in the paragraph beginning `Body: for each fix, name the file`, append:

```
              Include the bundle-cost delta from the comparison above, even
              when it is zero.
```

- [ ] **Step 4: Validate and commit**

```bash
actionlint .github/workflows/claude-perf-audit.yml
npx prettier --check .github/workflows/claude-perf-audit.yml
git add .github/workflows/claude-perf-audit.yml
git commit -m "feat(perf-audit): self-verify bundle cost before opening a PR"
```

---

## Verification checklist

Before considering Tasks 1–4 done:

- [ ] `node --test scripts/perf/tests/` — 10 tests pass
- [ ] `npm run build && npm run perf:bundle -- measure --out /tmp/r.json` produces a report with a non-zero export count
- [ ] `ogl` appears in the barrel's externals but not in `Button`'s
- [ ] A synthetic regression makes `compare` exit 1 and name the offending entry
- [ ] `actionlint` clean, `npm run format:check` clean
- [ ] The `Bundle Budget` check runs on the PR and renders a table in the job summary
