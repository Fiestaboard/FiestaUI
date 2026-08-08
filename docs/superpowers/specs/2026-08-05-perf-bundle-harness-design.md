# Performance Measurement Harness: Bundle Cost — Design

**Date:** 2026-08-05
**Status:** Approved
**Phase:** 1 of 2 (bundle cost now; browser/runtime metrics get their own spec)
**Related:** `.github/workflows/claude-perf-audit.yml` (the perf-audit loop this gates)

## Problem

FiestaUI has a Claude-driven perf-audit loop that sweeps the library daily for
render cost, memory, and bundle weight. It is a _reasoning_ loop: Claude reads
code and argues that a change is faster. Nothing measures anything.

That reasoning is reliable for structural claims — an undisposed WebGL context
leaks whether or not you benchmark it. It is unreliable for anything involving
magnitude. The loop cannot tell whether a `useMemo` paid for itself, and it
cannot tell whether an import change made every consumer's bundle bigger.

The gap is widest exactly where the stakes are highest. `src/index.ts` does
`export * from "./components/ui/aurora"`, and `vite.config.ts` marks `ogl`
external with `preserveModules: true`. Whether an app that imports `Button`
pays for a WebGL library therefore depends entirely on the consumer's
tree-shaking working against a module graph that nothing in CI verifies.
`package.json`'s `sideEffects: ["**/*.css"]` is load-bearing for that, and if
it ever breaks, every downstream bundle silently grows and no check fires.

## Goal

Gate performance changes on measured data rather than on Claude's reasoning,
starting with the cost a downstream consumer actually pays to import from
`@fiestaboard/ui`.

## Decisions (owner-confirmed)

- **Metrics wanted overall:** consumer bundle cost, render/commit counts,
  retained memory, and wall-clock speed.
- **Gate policy:** split by reliability. Deterministic metrics block the merge;
  noisy metrics report and do not block. A metric gets promoted to blocking
  only after it has demonstrably behaved.
- **Where it runs:** split by cost. The bot self-verifies with metrics cheap
  enough to run inline; expensive browser metrics run once in CI.
- **Sequencing:** bundle cost first, browser metrics second. This spec covers
  bundle cost only.

## Why bundle cost first

It is the only one of the four metrics that is simultaneously zero-flake _and_
cheap enough for the bot to self-verify with — which is precisely the
intersection the two policy decisions above carve out. It also targets the one
regression class already visible in the repo today (the barrel/`ogl` question),
and it needs no browser, so it is small enough to prove the gate's ergonomics
before we invest in the hard part.

## Measurement model

`dist/` is a 59-file module tree, not a bundle. Gzipping it would measure
nothing a consumer experiences. So the harness answers the consumer's actual
question: **if I import one thing, what do I pay?**

For each public export, generate a throwaway entry — `import { Button } from
"<dist>"` — bundle it with esbuild, and record three values.

| Metric            | Definition                                                                             | Gate                        |
| ----------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| `externals`       | Sorted set of third-party bare specifiers reachable from the entry                     | **Blocking on additions**   |
| `firstPartyBytes` | Minified + gzipped bytes of FiestaUI code reachable (all bare imports marked external) | **Blocking** past threshold |
| `totalBytes`      | Minified + gzipped bytes with only `react` / `react-dom` external                      | Advisory                    |

### Dependency reachability is the primary signal

The important call in this design: `externals` matters more than bytes.
"Importing `Button` now also pulls in `ogl`" is deterministic, human-readable,
needs no threshold tuning, and is immune to third-party version churn. It
catches the exact class of regression this repo is exposed to. Bytes are
supporting evidence; the dependency graph is the signal.

### The export list is derived, never hand-maintained

esbuild's metafile reports the export names of the built entry. The measured
surface is therefore automatically whatever `src/index.ts` actually exposes. A
hand-curated list would rot the first time someone adds a component.

### Base and head are measured in the same job run

No committed baseline file. Both sides are built and measured on the same
machine, in the same job, against the same resolved dependency versions. This
eliminates cross-machine drift and makes `totalBytes` meaningful rather than a
proxy for "did a transitive dep publish this week."

## Gate policy

| Condition                                                  | Result                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Any entry gains an external not present at base            | **Fail**                                                             |
| Any entry's `firstPartyBytes` grows **>2% AND >200 bytes** | **Fail**                                                             |
| Barrel `firstPartyBytes` grows **>1%**                     | **Fail**                                                             |
| Any entry loses an external, or shrinks                    | Reported as a win                                                    |
| `totalBytes` moves in either direction                     | Reported only                                                        |
| Export present at head but not base (new component)        | Reported, never fails                                                |
| Export present at base but not head (removed)              | Reported as a warning — possible breaking change, not a perf failure |

Both conditions are required for the `firstPartyBytes` failure so that a tiny
entry growing by a handful of bytes does not trip the gate.

### Escape hatch

A `perf-budget-ok` label on the PR converts a failure into a pass. The report
still prints in full — the number stays visible even when it is accepted.

This is not optional. Legitimate feature work grows bytes, and a gate with no
override gets disabled within a month. The label makes acceptance an explicit,
logged decision instead of a reason to delete the job.

## Architecture

### `scripts/perf/bundle.mjs`

Mirrors the structure of `scripts/vrt/vrt.mjs` — same shebang-and-doc-block
convention, same `parseArgs`, same mode dispatch — so it reads as native to
this repo. Node ESM, no TypeScript, consistent with the existing script.

Two modes:

```
node scripts/perf/bundle.mjs measure --out <file>
  Requires a built dist/. Enumerates exports from the barrel's esbuild
  metafile, bundles one synthetic entry per export, writes a JSON report.

node scripts/perf/bundle.mjs compare --base <file> --head <file> [--markdown <file>]
  Diffs two reports, prints a table, optionally writes markdown.
  Exits nonzero when a blocking condition trips.
```

`esbuild` becomes an explicit devDependency. It already resolves transitively
through Vite, but depending on a transitive copy breaks on an unrelated
upgrade.

`package.json` gains `"perf:bundle": "node scripts/perf/bundle.mjs"`.

### Report schema

```json
{
  "schemaVersion": 2,
  "ref": "<git sha>",
  "barrel": {
    "externals": ["@base-ui/react", "clsx", "ogl"],
    "firstPartyBytes": 48210,
    "totalBytes": 213774
  },
  "exports": {
    "Button": {
      "externals": ["@base-ui/react", "clsx", "tailwind-merge"],
      "firstPartyBytes": 1204,
      "totalBytes": 38112
    }
  },
  "css": {
    "theme.css": { "bytes": 10312 },
    "seasons/christmas.css": { "bytes": 843 }
  }
}
```

Byte values are gzipped sizes of minified ESM output (for `css`, gzipped sizes
of the stylesheets as shipped).

### How each number is produced

- **`firstPartyBytes`** — bundle with a plugin marking every bare specifier
  external, so only relative/`dist` code is included.
- **`externals`** — collect the bare specifiers recorded in that same build's
  metafile, reduced to package names (`@scope/pkg` or `pkg`), sorted.
- **`totalBytes`** — bundle again with only `react` and `react-dom` external.
- **`css`** — `dist/theme.css` and each `dist/seasons/*.css` gzipped directly.
  The build copies these into `dist/` verbatim, so unlike the JS exports there
  is nothing to bundle: a consumer pays their gzipped size as shipped. Keyed by
  path relative to `dist/`. Gated on the same pct/abs pair as the JS entries
  (`cssBytesPct` / `cssBytesAbs`).

Emitted Tailwind utilities (`tw-animate-css` output) and the woff2 font assets
are not yet measured; the `css` section tracks the stylesheets that ship
verbatim, which is where the audit findings (#57, #65, #71) landed.

## CI wiring

A new `perf-bundle` job in `.github/workflows/ci.yml`, PR-only — it needs a
base to compare against.

1. Checkout with `fetch-depth: 0`.
2. `setup-node` (Node 24, npm cache), `npm ci --no-audit` — **once, at head.**
3. Check out the PR base **source only**, build, `measure --out base.json`.
4. Return to head, rebuild, `measure --out head.json`.
5. `compare --base base.json --head head.json --markdown report.md`.
6. Append `report.md` to `$GITHUB_STEP_SUMMARY` — renders a table on the checks
   page with no additional permissions.
7. If `compare` failed and the PR does **not** carry `perf-budget-ok`, fail
   the job.

The job owns the label check itself, so it can be added to `ci-success`'s
`needs` list without the bypass breaking the aggregate result.

### Two constraints discovered while planning

Both of these are load-bearing; an implementation that ignores either is
broken in a way CI will not obviously report.

**`node_modules` is installed once, at head, and never reinstalled.** An
earlier draft of this spec reinstalled at base when `package-lock.json`
differed. That is actively wrong: the PR introducing this harness is itself a
lockfile change (it adds `esbuild`), so reinstalling at base would uninstall
the tool doing the measuring. Holding dependencies fixed across both sides is
also the more correct comparison — it isolates the source change, which is the
only thing being gated.

**Both checkouts are path-scoped, and that is what pins the harness to head.**
Only the build inputs are swapped — `src`, `package.json`, `vite.config.ts`,
`tsconfig.build.json` — never the whole tree. `scripts/perf/` therefore stays
at the head revision across both measurements, which is required: measuring
base with base's harness and head with head's would compare two different
rulers. A full `git checkout <sha>` would break this, and would also delete
`scripts/perf/` outright on the PR that introduces it.

An earlier draft solved this by copying the harness to `$RUNNER_TEMP` instead.
That does not work, and failed on the first CI run: Node resolves bare imports
from the importing file's own directory, so a copy outside the workspace
cannot find `esbuild`. Keeping one mechanism — the path-scoped checkout —
rather than two overlapping ones is both simpler and the one that works.

`bundle.mjs` still takes an explicit `--dist <path>` (defaulting to
`<cwd>/dist`) so one copy of the script can measure a `dist/` built from any
revision, which is exactly what the two-build sequence needs.

## Bot self-verification

`.github/workflows/claude-perf-audit.yml`'s prompt gains a verification step
for bucket-A fixes: build → `measure` → apply fixes → rebuild → `measure` →
`compare`. Any fix that regresses is reverted. The delta goes in the PR body.

The audit's `--allowed-tools` allowlist gains `Bash(npm run perf:bundle:*)`.

**Expected behaviour, stated honestly:** for most bucket-A fixes this reads
zero. Hoisting a literal does not move bytes. The value is not finding wins —
it is the guarantee that the bot cannot regress bundle cost without noticing,
and it becomes decisive the moment the bot touches anything import-shaped.

## Testing

`node --test` in `scripts/perf/tests/bundle.test.mjs`, covering the pure logic
against fixture report objects:

- New-external detection, including the scoped-package name reduction.
- Threshold math: the 2%-AND-200-bytes conjunction, the 1% barrel rule, and
  the boundary cases on each side.
- Added and removed exports classified correctly (never a failure / warning).
- The `perf-budget-ok` bypass path.

esbuild itself is not tested. This slots into the existing `automation` CI job,
which already runs `scripts/downstream-upgrade/tests/run.sh`.

## Non-goals

Explicitly out of scope for this spec:

- Browser and runtime metrics — render counts, retained memory, wall-clock.
  These are phase 2 and get their own design.
- Per-story measurement.
- Historical trend tracking or a committed baseline file. Same-run comparison
  covers the gating need; trend data is the kind of thing that sounds useful
  and then rots.
- Minification-quality or compression-strategy analysis.

## Risks

- **Build time.** The job builds the library twice, but installs dependencies
  only once. The library build is fast relative to the Storybook-based jobs
  already in CI.
- **Gate fatigue.** The `perf-budget-ok` escape hatch is the mitigation. If the
  label starts getting applied routinely, the thresholds are wrong and should
  be revisited rather than the job removed.
- **esbuild vs. consumer bundlers.** esbuild's tree-shaking is not byte-identical
  to Rollup's or webpack's, so absolute numbers are indicative rather than
  exact. Deltas between base and head — the only thing gated on — remain valid
  because both sides use the same bundler.

## Rollout

1. Land `scripts/perf/bundle.mjs`, its tests, and the npm script.
2. Add the `perf-bundle` CI job in report-only mode; do not add it to
   `ci-success` yet.
3. Watch a handful of real PRs to confirm the numbers are stable and the
   thresholds are sane.
4. Promote to blocking by adding it to `ci-success`'s `needs`.
5. Wire the audit prompt's self-verification step.

Phase 2 (browser metrics) begins after step 4 has held for a few weeks.
