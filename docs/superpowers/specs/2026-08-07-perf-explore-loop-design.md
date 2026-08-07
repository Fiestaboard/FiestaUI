# Exploratory Performance Loop — Design

**Date:** 2026-08-07
**Status:** Approved
**Phase:** 2 of 2 (browser/runtime metrics; bundle cost shipped in phase 1)
**Related:**

- `docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md` (phase 1, which deferred this)
- `.github/workflows/claude-perf-audit.yml` (the per-file sweep this runs alongside)
- `.github/workflows/claude-issue-triage.yml` (what actually fixes what this loop finds)

## Problem

FiestaUI's perf-audit loop works, but the unit of work is **one file, in
alphabetical order**. `.github/perf-audit-state.json` is at round 1, 48 of 70
files audited, next up `src/components/ui/tabs.tsx`. Two limits follow from
that shape, and neither is a tuning problem — they are structural.

**It cannot ask cross-cutting questions.** Whether an app that imports `Button`
also downloads `ogl` is a property of the module graph, not of any one file.
Whether every rAF loop in the library honours `prefers-reduced-motion` is a
policy spanning `src/components/ui/aurora.tsx`, `src/components/seasons/*`, and
`src/components/ui/react-bits/*`. A re-render cascade lives in the edges
between components. The prompt tells the auditor to "check the call sites," but
it still reports per file and moves on, so system-level findings have nowhere
to land.

**It measures nothing at runtime.** Phase 1 gave us bundle cost, and CI diffs it
per PR. Render cost, frame cost, and retained memory are still argued from
static reading. The audit's own bucket B lists undisposed GPU resources and
free-running animation loops as findings it can file but never confirm.

There is also a smaller third problem. When the sweep finishes round 1 it
restarts at the top of the same file list with the same static method, and it
remembers only _rejected PRs_ — not what it already concluded. Round 2 over
`tabs.tsx` will likely reach round 1's conclusion again.

## Goal

Add a second loop that investigates **by theme, prioritized by measured cost**,
and give it a runtime instrument to reason from. The per-file sweep keeps
running unchanged; this covers what that sweep structurally cannot reach.

## Decisions (owner-confirmed)

- **Both gaps, staged** — measurement first, thematic exploration on top of it.
- **Runtime bench is in scope**, not deferred to a third project.
- **Separate workflow** on its own cadence, rather than replacing or being
  folded into the per-file sweep.
- **Themes are seeded, discovered, and cost-ranked** — a committed seed list the
  explorer may append to, ordered by measured cost.

Two further decisions were made in design rather than asked, because both exist
to keep this loop from fighting the one already running:

- **The explorer files issues only.** It never edits `src/`.
- **The bench is never a CI gate.** It informs the explorer; it blocks nothing.

## Architecture

Three pieces that land independently.

```
                 ┌──────────────────────────────┐
   weekly cron → │  claude-perf-explore.yml     │
                 │                              │
                 │  build → bundle.mjs measure  │──→ snapshot-bundle.json  ┐
                 │       → bench.mjs            │──→ snapshot-bench.json   │ committed
                 │       → rank themes by cost  │                          │ each run
                 │       → investigate top      │──→ perf-explore-state.json ┘
                 │       → file issues          │
                 └──────────────┬───────────────┘
                                │ perf, perf-audit, perf-explore, claude-fix
                                ▼
                 ┌──────────────────────────────┐
                 │  claude-issue-triage.yml     │  (existing — does the fixing)
                 └──────────────┬───────────────┘
                                │ PR closed unmerged / issue closed not-planned
                                ▼
                 ┌──────────────────────────────┐
                 │ claude-perf-audit-feedback   │──→ rejected-edits.jsonl
                 │           .yml               │──→ rejected-findings.jsonl  (new)
                 └──────────────┬───────────────┘
                                │ read at the top of every run
                                └──────────────→ back to the explorer
```

### Piece A — runtime bench harness

`scripts/perf/bench.mjs`, Playwright over `storybook-static`, reusing the
story enumeration approach in `scripts/vrt/vrt.mjs` (`GET /index.json`, filter
`entry.type === "story"`).

Per story:

| Metric                | How                                                                             | Catches                              |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| `mountMs`             | Median of N mount/unmount cycles, timed in-page                                 | Expensive first render               |
| `frameP50`/`frameP95` | rAF deltas sampled over a fixed window                                          | Per-frame allocation, layout thrash  |
| `longTasks`           | `PerformanceObserver` on `longtask` during the sample window                    | Main-thread blocking                 |
| `retainedSlopeKb`     | Slope of heap-after-GC across K mount/unmount cycles — **raw data, no verdict** | Nothing yet — see the retention note |

**Noise policy — the decision that makes this viable.** The bench is an
instrument for the explorer, not a gate. It therefore never needs to be precise
enough to block a merge, which is the requirement that would have made it
flaky. Concretely:

- It never compares absolute numbers across runs or machines. Its output is a
  **ranking** of stories by cost — a large, noise-tolerant signal. (A leak
  signal was intended too; see the retention note below for why it did not
  survive contact with the measurement.)
- Every measurement is repeated and reported as median plus IQR. A measurement
  whose `IQR / median` exceeds `UNSTABLE_RATIO` is emitted as
  `unstable: true` with the number suppressed, rather than reported as fact.
  The explorer is told to treat unstable rows as "unknown," never as "fine."
- Stories run sequentially in one browser context. No parallelism, because
  parallel pages contend for the same main thread and destroy the signal.

**Retention ships measured but uncalibrated, and emits no verdict.** This was
the most instructive part of building the harness, and the conclusion is a
negative result.

The first working version reported Aurora retaining ~155 KB per mount/unmount
cycle across all 13 of its stories — exactly the undisposed-WebGL finding the
audit had been guessing at for weeks. It was an artifact. A control run over 19
trivial `ui-button--*` stories reported ~146 KB/cycle for those too: Storybook's
own story-switching machinery retains memory regardless of what is mounted.

Subtracting that control baseline fixed Aurora (~7.6 KB/cycle net, clean) but
not the metric. A full 45-component run then flagged 9 components as leaking,
ranked almost perfectly in mount-cost order — and the raw slopes showed why:

| Story                                       | Raw slope     |
| ------------------------------------------- | ------------- |
| `ui-button--default` (trivial)              | ~141 KB/cycle |
| `design-system-inventory--compact-showcase` | ~224 KB/cycle |
| `design-system-inventory--all-components`   | ~504 KB/cycle |

A trivial Button cannot retain 141 KB per cycle. The floor is Storybook's own
per-render retention and it **scales with how much the story renders**, so
subtracting a constant cannot remove it. The residue is a story-size signal
wearing a leak costume. A plateau check (require the second half of the series
to still be climbing) did not help either — the growth is genuinely linear.

Correcting this properly needs a size-proportional model: regress retention
against a weight proxy across several control stories and subtract the
prediction. That is real work and not something to guess at under time
pressure. So for this PR:

- Retention is **measured and reported as raw data**, with the full
  per-cycle heap series attached to every story so any future reader can
  sanity-check it.
- **No leak verdicts are emitted.** Every verdict is `unknown` with reason
  `uncalibrated` unless `--trust-retention` is passed explicitly.
- Retention is **excluded from the ranking weights**, so an uninterpretable
  number cannot reorder the explorer's targets.
- The explorer's prompt states all of this and forbids filing a leak issue on
  the strength of these numbers.

A false leak issue costs a maintainer far more than a missing one, and the
whole point of this loop is that its findings can be trusted. Two decisions
that survived from the baseline work are still in place and still correct: the
control and idle stories must be trivial primitives (falling back to "first
story id alphabetically" picked `board-boarddisplay--color-palette`, a 245
KB/cycle floor), and the leak threshold sits at 64 KB/cycle net for whenever
calibration lands.

The bench **includes** stories listed in `vrt/skip.json`. That file excludes
stories from _visual_ baselining, and the reasons given are animation-related —
which is exactly where runtime cost concentrates. Excluding them here would
blind the instrument to its highest-value targets.

Pure logic lives in `scripts/perf/bench-analyze.mjs` (percentiles, IQR,
stability classification, leak classification, ranking) and is unit-tested
directly, matching how `compare.mjs` splits from `bundle.mjs` in phase 1.
`bench.mjs` is the browser driver and delegates all judgement to it.

### Piece B — the explorer

`.github/workflows/claude-perf-explore.yml`. Weekly cron, reusing
`claude-perf-audit.yml`'s proven scaffolding verbatim: paired UTC crons plus a
`America/Los_Angeles` local-hour gate to absorb DST, `concurrency: perf-explore`
with `cancel-in-progress: false`, a GitHub App installation token, and
`show_full_output: "true"`.

Each run:

1. Reads `rejected-edits.jsonl` and `rejected-findings.jsonl`.
2. Builds, runs `bundle.mjs measure`, runs `bench.mjs`.
3. Ranks pending themes by the measured cost of the surfaces each touches.
4. Investigates the top theme(s) with those numbers in hand.
5. Files issues; commits its state and both measurement reports.

**Output policy: issues only.** Thematic findings are multi-file and
judgement-heavy by construction — precisely what the sweep's bucket-A
definition (single-token, provably visually neutral) excludes. So the explorer
has no PR path at all. Fixes flow through the existing `claude-fix` →
`claude-issue-triage.yml` route, which already does a full thinking pass per
issue. This is the cleanest split available: **the explorer finds, the existing
triage fixes.** It also means the two loops never contend for the sweep's
3-open-PR cap.

Its write scope is correspondingly tiny: `.github/perf-explore-state.json` and
`.github/perf-explore/*.json`. Nothing under `src/`, ever.

**State** — `.github/perf-explore-state.json`:

| Field            | Meaning                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `schema_version` | int, currently 1                                                                                       |
| `last_run_at`    | ISO8601 UTC or null                                                                                    |
| `themes[]`       | `{id, title, question, surfaces[], status, source, added_at, last_investigated_at, findings[], notes}` |

`status` ∈ `pending | active | done | dropped`. `source` ∈ `seed | discovered`.
`surfaces[]` are path globs, and are what the cost ranking joins against.

Seeded with the questions the per-file sweep cannot ask:

1. **Barrel and tree-shaking shape** — what does importing one `Button`
   actually cost a consumer?
2. **`ogl` reachability** — is the WebGL dependency reachable from the main
   entry, and can it be split behind a lazy path?
3. **Animation-loop policy** — do _all_ rAF/WebGL/timer loops honour
   `prefers-reduced-motion`, pause on `visibilitychange`, and stop when
   off-screen? (Aurora is known not to; `vrt/skip.json` says so.)
4. **Resource disposal sweep** — every GPU/timer/observer resource across
   `seasons/*` and `aurora.tsx`, audited by reading teardown paths. Note this
   one cannot lean on the bench: retention is uncalibrated, so disposal has to
   be argued from the code until that lands.
5. **Re-render cascade mapping** — context value identity and prop stability
   through `board/*`, traced across component boundaries.
6. **CSS paint and layer budget** — blur radii, `will-change`, layer promotion
   across `src/styles/**`.

The explorer may append discovered themes. Those arrive as a diff on the state
file, so pruning them is a normal review action.

**Labels:** `perf`, `perf-audit`, `perf-explore`, plus `claude-fix`. Carrying
`perf-audit` is deliberate — it means explorer findings feed the sweep's
`Compute dynamic effort` step and throttle it, because the two loops share one
human review queue.

**Self-throttle:** skip the run when open `perf-explore` issues ≥ 10, or when
the shared `perf-audit` queue is over the sweep's own conservative threshold.
`workflow_dispatch` bypasses both.

### Piece C — closing the learning loop

The explorer only files issues, and `claude-perf-audit-feedback.yml` today only
captures rejected **PRs**. Without this piece the explorer has no way to learn
that a finding was wrong — it would refile the same theme conclusion every
round, forever. This is a correctness requirement, not a nicety.

Piece C adds an `issues: closed` trigger to that workflow. When an issue
labelled `perf-explore` is closed as `not_planned`, it appends a record to
`.github/perf-audit/rejected-findings.jsonl`:

```json
{ "issue": 71, "title": "...", "closed_at": "...", "state_reason": "not_planned",
  "labels": ["perf", "perf-explore"], "body": "...", "comments": [...] }
```

Issues closed as `completed` are not logged — those were fixed, not rejected.

## Guardrails

Carried over from the sweep, and mostly moot given the explorer's write scope,
but stated so they survive future prompt edits:

- Never modify anything under `vrt/`, including `skip.json`. Widening the skip
  list to make a change look safe remains the worst available action.
- Never modify `*.stories.tsx` — they define the VRT surface.
- Never change the public API exported from `src/index.ts`.
- Never push to `main` except the single state/snapshot commit, with the same
  fetch-and-replay fallback the sweep uses.
- Never use `[skip ci]` in a commit message — it suppresses the workflow run, so
  the required `CI Success` check never reports and the PR can never merge.

## Testing

- `scripts/perf/tests/bench-analyze.test.mjs` via `npm run perf:test`
  (`node --test`), covering percentile math, IQR stability classification, leak
  classification, and cost ranking.
- `npm run perf:bench` runs locally against `storybook-static` — the harness is
  verifiable by hand before any cron touches it.
- The existing `automation` CI job runs `actionlint` over the new workflow.
- Both new workflows are `workflow_dispatch`-able and get a manual dry run
  before the cron is trusted.

## What this explicitly does not do

- Does not gate CI on runtime numbers. Report and rank only.
- Does not change the per-file sweep, its state, or its cadence.
- Does not give the explorer any ability to edit source.
- Does not address round-2 re-audit redundancy in the per-file sweep. That is a
  real issue, noted above, but it belongs to that loop's own tuning.
