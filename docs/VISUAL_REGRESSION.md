# Visual Regression Testing

Every Storybook story has a screenshot baseline in **both themes** (dark and light). CI re-screenshots every story on each PR and fails when a story's rendering drifts from its committed baseline. Intentional changes are absorbed by regenerating the baselines.

The harness is fully self-contained — Playwright (chromium) + [pixelmatch](https://github.com/mapbox/pixelmatch) + pngjs. No cloud services.

## How it works

- Baselines live in `vrt/baselines/<theme>/<story-id>.png`, committed to the repo.
- The `Visual Regression` CI job builds Storybook, serves `storybook-static`, then runs `npm run vrt`:
  1. Reads `index.json` from the served build and screenshots **every** story (docs pages excluded) in dark and light via `iframe.html?globals=theme:<theme>&id=<id>`.
  2. Compares each shot against its baseline with pixelmatch (per-pixel threshold `0.1`; a story fails when more than `max(50, 0.05% of pixels)` differ, or on size mismatch).
  3. Failures write `<id>.diff.png` (plus `.actual.png` / `.expected.png`) into `vrt/diffs/`, uploaded as the `vrt-diffs` CI artifact.
- A story with **no baseline** fails as "new story — run update". A baseline with **no matching story** fails as "stale baseline".
- If `vrt/baselines/` doesn't exist or is empty, `compare` warns and exits 0, so CI stays green until baselines are first seeded.

### Determinism measures

Screenshots use a fixed 1200×800 viewport at `deviceScaleFactor: 1`, wait for fonts + network idle + a settle delay, emulate `prefers-reduced-motion: reduce` (the WebGL auroras honor it and freeze on a static frame), and then inject CSS that pauses all animations/transitions and hides the caret before capturing the `#storybook-root` element.

## Updating baselines (canonical: the workflow)

**Baselines are generated on Linux CI runners.** Local macOS/Windows screenshots differ in font rasterization and antialiasing, so shots taken on your machine will never match CI's baselines. Do **not** commit baselines generated locally.

When a PR intentionally changes how something renders:

1. Push the branch.
2. Run the **VRT Update Baselines** workflow (Actions → VRT Update Baselines → Run workflow → pick your branch), or: `gh workflow run vrt-update.yml --ref <branch>`.
3. The workflow rebuilds Storybook, regenerates `vrt/baselines/` wholesale (stale ids deleted), and pushes a `chore(vrt): update visual baselines` commit to your branch.
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
```

## Skipping flaky stories: `vrt/skip.json`

`vrt/skip.json` is a JSON array of stories excluded from shooting entirely. Entries are objects with an `id` (an exact story id, or a prefix glob ending in `*`) and a mandatory `reason`:

```json
[{ "id": "components-fancy-thing--live-clock", "reason": "renders current time — nondeterministic by design" }]
```

**Policy:** the list should stay as close to empty as possible. Only add an entry after **proving** the story is nondeterministic — run `shoot` twice against the same build and confirm it differs run-to-run. Prefer fixing the story (freeze time in the story args, honor `prefers-reduced-motion`, etc.) over skipping it. Every entry must carry a `reason`.

## Failure triage cheat sheet

| CI message                | Meaning                        | Fix                                                           |
| ------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `N pixels differ`         | Rendering drifted              | Unintended → fix the code. Intended → run the update workflow |
| `new story — no baseline` | Story added without a baseline | Run the update workflow on your branch                        |
| `stale baseline`          | Story removed/renamed          | Run the update workflow on your branch                        |
| `size mismatch`           | Story's rendered box resized   | Same as pixel drift — fix or update                           |
| `no baselines seeded yet` | `vrt/baselines/` empty (warn)  | Run the update workflow on `main` to seed                     |
