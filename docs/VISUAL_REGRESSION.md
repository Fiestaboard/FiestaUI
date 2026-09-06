# Visual Regression Testing

Every Storybook story is screenshotted at **two viewports** (desktop and mobile) in **both themes** (dark and light) — four shots per story. CI re-screenshots every story on each PR and compares against a **baseline published by `main`'s latest build**, failing when a story's rendering drifts. Intentional changes are accepted from the PR itself — a checkbox or a `/vrt approve` comment — and merging publishes the new baseline automatically.

Capture is our own harness — Playwright (chromium), self-contained, no cloud services. Comparison, reporting, and approvals are [`fiestaboard/visual-regression-action`](https://github.com/Fiestaboard/visual-regression-action), which stores baselines as **build artifacts, not files in git**. The repo carries no screenshots; `vrt/` holds only `skip.json`.

## Viewports

| Key       | Size     | Why                                                                 |
| --------- | -------- | ------------------------------------------------------------------- |
| `desktop` | 1200×800 | The original single viewport; matches the app's primary layout      |
| `mobile`  | 390×844  | iPhone 12/13/14-class logical size — the width FiestaBoard ships to |

Both are declared in one place, `VIEWPORTS` in `scripts/vrt/vrt.mjs`, and mirrored into the Storybook viewport toolbar (`.storybook/preview.tsx`) under the same names, so what you eyeball in the toolbar is the geometry CI diffs against. The viewport keys are part of the screenshot tree layout (`<viewport>/<theme>/<id>.png`), so renaming one shows up as every shot under it being removed+added.

## How it works

- On every push to `main`, CI shoots all stories and publishes the tree as a `vrt-baseline` artifact (14-day retention; see "Recovering baselines" for what happens when it lapses).
- On every PR, CI shoots the same tree and hands it to the action's compare mode, which:
  1. Downloads the newest `vrt-baseline` artifact from a `main` run.
  2. Diffs per shot with pixelmatch — per-pixel threshold `0.1`, and a shot counts as changed when more than `0.05%` of its pixels differ (the same tolerances the old in-repo compare shipped with, now set as `threshold` / `diff-ratio` inputs in `ci.yml`).
  3. Posts/updates a sticky PR comment — counts, per-shot table, pre-typed approval commands, an **Approve all** checkbox — writes the run's step summary, and uploads a single-file HTML **report artifact** (`vrt-report`) with side-by-side, swipe, overlay, and blink views plus a keyboard-driven review mode.
  4. Fails the `Visual Regression` job when any shot changed or went missing **and hasn't been approved**.
- Added stories never fail (there is nothing to compare against); removed shots do, because a disappearing screenshot is indistinguishable from a broken capture until a human says otherwise.
- If no baseline artifact exists (first run, or retention lapsed), the compare reports everything as new and passes; the next `main` build reseeds.

### Accepting an intentional change

Everything happens on the PR:

1. The red check's comment lists what changed, with a **Download the visual report** link for reviewing (swipe/overlay/blink each change; the report assembles a precise `/vrt approve` command as you approve/reject).
2. Accept with any of:
   - **The checkbox** in the comment (approve everything at the current commit) — one click; only write-access users can tick it.
   - `/vrt approve all` as a comment (valid until the next push).
   - The per-shot command the report generated (commit-pinned, e.g. `/vrt approve ui-alert--default.png@ab12cd3 …`).
3. The `VRT approvals` workflow reruns the failed check automatically (👀 on your comment, then a receipt comment that updates with the outcome). Approvals pin the commit, so pushing again invalidates them.
4. Merge. `main` rebuilds and publishes the new baseline — no rebaseline workflow, no `chore(vrt)` commits, no baseline diffs in review.

### Sharding

Both VRT and the Storybook a11y run are split across parallel CI jobs, and the job count is **derived, not configured** — add stories and the suites widen on the next run with no workflow edit.

- `plan-shards` (a few seconds, no `npm ci`) counts CSF story exports under `src/**/*.stories.*` and multiplies by the theme×viewport fan-out (`SHOTS_PER_STORY`). The rule and its constants live in `scripts/ci/plan-shards.mjs`. The count is an estimate rather than the exact tree the old committed-baseline signal gave — good to within a shard, and drift costs sizing, not correctness.
- VRT shards slice the shot list by **stride** (`i % N`), not contiguous chunks. The list is grouped viewport-then-theme, so contiguous slices would hand one shard every desktop shot and another every mobile shot — different costs, and the suite is only as fast as its slowest shard.
- The shoot matrix is `fail-fast: true`: shards produce screenshots for **one** `vrt-report` job rather than verdicts of their own, and that job requires every slice. Each shard writes a `manifest-<i>-of-<N>.json`; `vrt-report` runs `scripts/vrt/verify-shots.mjs` and refuses a merged tree the manifests don't fully account for — a missing shard would otherwise read as "these stories were removed".
- A11y uses the test runner's own `--shard` flag (it is Jest underneath), so it needs no harness code. Its matrix is `theme x shard`, and it keeps `fail-fast: false` because each of its shards reports real findings of its own.
- The shard count is **capped** (see `VRT_LIMITS` / `A11Y_LIMITS`). The org is on GitHub Free — 20 concurrent jobs shared across every repo — so past the cap shards get larger rather than more numerous. Coverage never changes; only wall clock does.
- Both Playwright jobs — `visual-regression` (shoot) and `a11y-tests` — get their environment from one composite action, [`.github/actions/storybook-browser`](../.github/actions/storybook-browser/action.yml). Sharing it is not only DRY: a baseline is only useful if the run that _checks_ it renders in the same environment as the run that _recorded_ it, and one definition makes that true by construction.
- The merge queue **skips** the visual jobs: the gate is enforced on the PR, where the report comment and approvals live. A queue entry has no PR context to read approvals from, so replaying the gate there could only fail on capture noise a reviewer already cleared.

### Determinism measures

Screenshots use one Playwright context per viewport at `deviceScaleFactor: 1`, wait for fonts + network idle + a settle delay, emulate `prefers-reduced-motion: reduce`, and then inject CSS that pauses all animations/transitions and hides the caret before capturing the `#storybook-root` element.

Byte-level determinism across runs is **not** assumed anywhere: approvals pin commits rather than image bytes, and the comparison tolerances absorb sub-pixel rasterization jitter between runners.

### Writing stories that survive the mobile viewport

`#storybook-root` is a flex item of `body.sb-main-centered`, so it is **shrink-to-fit**: a story sized by a hard pixel width sets its own page width and will overflow a 390px viewport rather than reflow. `max-w-[Npx]` alone does not help — the percentage resolves against a shrink-to-fit parent.

Size demo wrappers `w-full sm:w-[Npx]` instead. Below the `sm` breakpoint the box is fluid and the story reflows to the phone; at and above it the declaration is literally `width: Npx`, so desktop rendering — and its baseline — is untouched.

## Recovering baselines

Baseline artifacts expire with retention (14 days, refreshed by every `main` build). If `main` has been quiet long enough for the baseline to lapse, PRs report everything as "new" and pass — nothing breaks, but the visual gate is napping. To reseed on demand: **Actions → CI → Run workflow on `main`** (or `gh workflow run ci.yml --ref main`). A manual run publishes a fresh baseline instead of comparing.

## Running locally

Local runs prove mechanics and let you eyeball rendering, but macOS/Windows font rasterization differs from the Linux runners, so local shots are not comparable to CI baselines. Comparison itself only happens in CI, where both sides render in the same environment.

```sh
npm run build-storybook
npm run vrt:serve          # serves storybook-static on :6007 (leave :6006 to the dev server)
npm run vrt:shoot -- --out /tmp/shots --url http://localhost:6007   # raw screenshots

# One shard's slice — the same thing a single CI job does. Handy for iterating
# on a subset: a high N keeps the run short.
npm run vrt:shoot -- --out /tmp/shots --url http://localhost:6007 --shard 1/40
node scripts/ci/plan-shards.mjs   # what CI would plan for the current story count
```

## Skipping flaky stories: `vrt/skip.json`

`vrt/skip.json` is a JSON array of stories excluded from shooting entirely. Entries are objects with an `id` (an exact story id, or a prefix glob ending in `*`) and a mandatory `reason`:

```json
[{ "id": "components-fancy-thing--live-clock", "reason": "renders current time — nondeterministic by design" }]
```

A skip applies to **every viewport** by default, because nondeterminism is usually width-independent (animation loops, timers, live data). When a story is only unstable at one width, narrow the skip with an optional `viewports` array rather than giving up the other viewport's coverage:

```json
[{ "id": "ui-thing--marquee", "viewports": ["mobile"], "reason": "scroll animation only auto-plays below sm" }]
```

Values must be viewport keys from the table above; an unknown key is a hard error rather than a silent no-op.

**Policy:** the list should stay as close to empty as possible. Only add an entry after **proving** the story is nondeterministic — run `shoot` twice against the same build and confirm it differs run-to-run. Prefer fixing the story (freeze time in the story args, honor `prefers-reduced-motion`, etc.) over skipping it. Every entry must carry a `reason`.

## Failure triage cheat sheet

The report groups shots as `<viewport>/<theme>/<story-id>.png`. If a story fails at `mobile/*` but not `desktop/*`, the regression is responsive — the story or component does not reflow — not a rendering drift.

| Report says                          | Meaning                                          | Fix                                                                             |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Changed (N%)                         | Rendering drifted                                | Unintended → fix the code. Intended → approve from the PR comment or report     |
| Added                                | New story (or renamed) — no baseline yet         | Nothing to do; the merge publishes its baseline                                 |
| Removed                              | Story deleted/renamed, or its capture broke      | Expected → approve it. Unexpected → find out why the story stopped rendering    |
| Changed at `mobile/*` only           | Story sets a hard pixel width and cannot reflow  | Re-author the wrapper as `w-full sm:w-[Npx]` (see above); desktop is unaffected |
| "No baseline found — everything new" | Baseline artifact expired or never seeded (warn) | Run the CI workflow manually on `main` to reseed                                |
| `Verify every shard delivered` red   | A shoot shard's artifact never arrived           | Re-run the failed jobs; the report never compares a partial tree                |
