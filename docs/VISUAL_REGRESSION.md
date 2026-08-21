# Visual Regression Testing

Every Storybook story has a screenshot baseline at **two viewports** (desktop and mobile) in **both themes** (dark and light) — four shots per story. CI re-screenshots every story on each PR and fails when a story's rendering drifts from its committed baseline. Intentional changes are absorbed by regenerating the baselines.

The harness is fully self-contained — Playwright (chromium) + [pixelmatch](https://github.com/mapbox/pixelmatch) + pngjs. No cloud services.

## Viewports

| Key       | Size     | Why                                                                 |
| --------- | -------- | ------------------------------------------------------------------- |
| `desktop` | 1200×800 | The original single viewport; matches the app's primary layout      |
| `mobile`  | 390×844  | iPhone 12/13/14-class logical size — the width FiestaBoard ships to |

Both are declared in one place, `VIEWPORTS` in `scripts/vrt/vrt.mjs`, and mirrored into the Storybook viewport toolbar (`.storybook/preview.tsx`) under the same names, so what you eyeball in the toolbar is the geometry CI diffs against. **The viewport keys are part of the on-disk baseline layout** — renaming, adding, or removing one invalidates that viewport's baselines and requires an update run.

## How it works

- Baselines live in `vrt/baselines/<viewport>/<theme>/<story-id>.png`, committed to the repo — e.g. `vrt/baselines/mobile/dark/ui-alert--default.png`.
- The `Visual Regression` CI jobs build Storybook, serve `storybook-static`, then each run `npm run vrt -- --shard <i>/<N>`:
  1. Reads `index.json` from the served build and screenshots **every** story (docs pages excluded) at every viewport in dark and light via `iframe.html?globals=theme:<theme>&id=<id>`.
  2. Compares each shot against its baseline with pixelmatch (per-pixel threshold `0.1`; a story fails when more than `max(50, 0.05% of pixels)` differ, or on size mismatch).
  3. Failures write `<id>.diff.png` (plus `.actual.png` / `.expected.png`) into `vrt/diffs/<viewport>/<theme>/`, uploaded as the `vrt-diffs-<shard>` CI artifact (one per shard — download them all with `gh run download -p 'vrt-diffs-*'`).
- Failure lines are scoped `[<viewport>/<theme>] <story-id>: …`, so a mobile-only regression is obvious from the log.
- A story with **no baseline** fails as "new story — run update". A baseline with **no matching story** fails as "stale baseline". A directory under `vrt/baselines/` that isn't a known `<viewport>/<theme>` pair — including the pre-viewport layout, where the theme dirs sat at the top level — fails as "stale baseline path", so a half-migrated baseline tree can never quietly pass.
- If `vrt/baselines/` doesn't exist or is empty, `compare` warns and exits 0, so CI stays green until baselines are first seeded.

### Sharding

Both VRT and the Storybook a11y run are split across parallel CI jobs, and the job count is **derived, not configured** — add stories and the suites widen on the next run with no workflow edit.

- `plan-shards` (a few seconds, no `npm ci`) counts `vrt/baselines/**/*.png` and divides by a per-shard target. The rule and its constants live in `scripts/ci/plan-shards.mjs`; the baseline count is exact for VRT, since every baseline is precisely one comparison.
- VRT shards slice the shot list by **stride** (`i % N`), not contiguous chunks. The list is grouped viewport-then-theme, so contiguous slices would hand one shard every desktop shot and another every mobile shot — different costs, and the suite is only as fast as its slowest shard.
- **Shard 1 owns the whole-suite inventory checks** (new, stale, and stray baselines). Those need the full story list rather than one slice, and every shard has it — so exactly one must run them. All of them reporting would print each failure N times; none reporting would silently drop the check that catches a story deleted without a rebaseline. A shard that draws a story with no baseline skips it rather than re-reporting it.
- A11y uses the test runner's own `--shard` flag (it is Jest underneath), so it needs no harness code. Its matrix is `theme x shard`, because the theme is a Storybook global baked into the URL rather than a test filter.
- The shard count is **capped** (see `VRT_LIMITS` / `A11Y_LIMITS`). The org is on GitHub Free — 20 concurrent jobs shared across every repo — so past the cap shards get larger rather than more numerous. Coverage never changes; only wall clock does.

Because shard sizing reads the committed baselines, seeding a repo with none yet plans a single shard and runs unsharded. That is correct rather than unfortunate — there is no workload to measure — and it self-corrects on the next run.

### Determinism measures

Screenshots use one Playwright context per viewport at `deviceScaleFactor: 1`, wait for fonts + network idle + a settle delay, emulate `prefers-reduced-motion: reduce`, and then inject CSS that pauses all animations/transitions and hides the caret before capturing the `#storybook-root` element.

### Writing stories that survive the mobile viewport

`#storybook-root` is a flex item of `body.sb-main-centered`, so it is **shrink-to-fit**: a story sized by a hard pixel width sets its own page width and will overflow a 390px viewport rather than reflow. `max-w-[Npx]` alone does not help — the percentage resolves against a shrink-to-fit parent.

Size demo wrappers `w-full sm:w-[Npx]` instead. Below the `sm` breakpoint the box is fluid and the story reflows to the phone; at and above it the declaration is literally `width: Npx`, so desktop rendering — and its baseline — is untouched.

## Updating baselines (canonical: the workflow)

**Baselines are generated on Linux CI runners.** Local macOS/Windows screenshots differ in font rasterization and antialiasing, so shots taken on your machine will never match CI's baselines. Do **not** commit baselines generated locally.

When a PR intentionally changes how something renders:

1. Push the branch.
2. Run the **VRT Update Baselines** workflow (Actions → VRT Update Baselines → Run workflow → pick your branch), or: `gh workflow run vrt-update.yml --ref <branch>`.
3. The workflow fans out (`plan` -> `shoot` matrix -> `adopt`), regenerates `vrt/baselines/` wholesale (stale ids deleted), and pushes a `chore(vrt): update visual baselines` commit to your branch.

   `adopt` will not write anything unless every shard's `manifest-<i>-of-<N>.json` accounts for every shot. This matters because regeneration is wholesale: a shard whose artifact never arrived would otherwise commit a tree with holes, and the next `compare` reads a hole as "new story, no baseline" — indistinguishable from a story someone just added, days after the seeding run that caused it.

4. CI re-runs on that commit and should now be green.

The same workflow seeds baselines for the first time (run it on `main`).

## Running locally

Local runs prove mechanics and let you eyeball diffs, but (per above) are not baseline-parity — expect widespread small font diffs against CI-generated baselines on macOS.

```sh
npm run build-storybook
npm run vrt:serve          # serves storybook-static on :6007 (leave :6006 to the dev server)
npm run vrt -- --url http://localhost:6007          # compare against committed baselines
npm run vrt:update -- --url http://localhost:6007   # regenerate baselines locally (don't commit)
node scripts/vrt/vrt.mjs shoot --out /tmp/shots --url http://localhost:6007   # raw screenshots

# One shard's slice — the same thing a single CI job does. Handy for iterating
# on a subset: a high N keeps the run short.
npm run vrt -- --url http://localhost:6007 --shard 1/40
node scripts/ci/plan-shards.mjs   # what CI would pick for the current tree
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

Every failure line is prefixed `[<viewport>/<theme>]`. If a story fails at `mobile/*` but not `desktop/*`, the regression is responsive — the story or component does not reflow — not a rendering drift.

| CI message                             | Meaning                                               | Fix                                                                                        |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `N pixels differ`                      | Rendering drifted                                     | Unintended → fix the code. Intended → run the update workflow                              |
| `new story — no baseline`              | Story added without a baseline                        | Run the update workflow on your branch                                                     |
| `stale baseline`                       | Story removed/renamed                                 | Run the update workflow on your branch                                                     |
| `stale baseline path`                  | `vrt/baselines/` holds a non-`<viewport>/<theme>` dir | Baselines predate the current viewport layout — run the update workflow to regenerate them |
| `size mismatch`                        | Story's rendered box resized                          | Same as pixel drift — fix or update                                                        |
| `size mismatch` at `mobile/*` only     | Story sets a hard pixel width and cannot reflow       | Re-author the wrapper as `w-full sm:w-[Npx]` (see above); desktop is unaffected            |
| `no baselines seeded yet`              | `vrt/baselines/` empty (warn)                         | Run the update workflow on `main` to seed                                                  |
| `does not match the expected … layout` | Only unrecognized dirs under `vrt/baselines/`         | Same — the tree predates the viewport layout; run the update workflow                      |
