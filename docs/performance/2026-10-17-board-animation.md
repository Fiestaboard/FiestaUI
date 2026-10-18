# Board animation work measurements — 2026-10-17

Split-flap playback eliminates per-tile timers and repeated flap-node replacement. LED flip moves glyph rasterization into bounded preparation, cascade reuses its held layout, and the canvas painter skips identical visible RGB/mask/appearance. This applies to the existing board APIs, including bitmap layers.

## Method and limits

Before is `8f7717af762d2dd03dccf72b82fa8203c367b6f8` (main, v8.8.0). After is the implementation accompanying this report. Both used the **same new harness, dependencies, machine, and inputs**, sequentially. The baseline was measured by restoring only the three production files to that commit, retaining the benchmark. [Raw samples and environment](2026-10-17-board-animation.json) are included.

- macOS arm64, Node 26.12.0, React 19.2.8, Vitest 4.1.11, jsdom 30. Timing uses a real monotonic clock captured before fake timers. Milliseconds are elapsed CPU-work samples (including runtime/GC overhead), not animation duration or process CPU accounting.
- Split-flap: full `A` grid → full `Z` grid, default 80ms cadence, after initial mount. Preparation times the message update; playback times five subsequent steps (400ms simulated time). A direct timer driver avoids measuring fake-timer queue overhead with 12,288 timers. One full before/after run; these are samples, not statistical confidence intervals. Counts are deterministic. All dimensions use a panel in the benchmark; functional tests also exercise Note, Flagship, 2×2 Notes and 8×8 Notes, plus sm/md/lg tiles.
- Matrix: full text grid `A` → `Z`, default parameters for all six transition kinds. Preparation times the update; playback samples the first 480ms at 16ms intervals. Flip/cascade can last longer than this window. Each timing column is the median of three independent LED-only process runs; total is the median of each run's preparation + playback, so rounded columns need not add up exactly. Paint/path counts include the update and playback, excluding the initial mount.
- Bitmap flip adds a full-board opaque multicolour layer that covers the changing text: there should be no visible redraw during this sample. This exercises the dense bitmap painting path.
- Canvas and Path2D are counting stubs. A “paint” is a substrate `fillRect`; “dots” counts traced `arc`/`rect` calls, not GPU draws or necessarily unique pixels. Native canvas cost is absent, making byte-comparison overhead more prominent. jsdom does not run CSS animation, layout, compositing, or GPU rendering. **These are not FPS measurements or proof of visual smoothness.**
- Local Chromium could not launch under the macOS sandbox (`MachPortRendezvousServer: Permission denied`). Browser visual checks and frame-time profiling remain outstanding; the PR runs the repository's browser CI checks.

## Split-flap results

All times are milliseconds, before → after. Playback is the five-step aggregate.

| Grid   |  Tiles |       Preparation |           Playback | Playback reduction | Active timers | Added DOM nodes during playback |
| ------ | -----: | ----------------: | -----------------: | -----------------: | ------------: | ------------------------------: |
| 3×15   |     45 |     48.54 → 53.18 |     110.79 → 27.70 |              75.0% |        45 → 1 |                         675 → 0 |
| 6×22   |    132 |     94.54 → 99.25 |     281.39 → 55.06 |              80.4% |       132 → 1 |                       1,980 → 0 |
| 12×64  |    768 |   489.07 → 513.89 |   1599.82 → 340.65 |              78.7% |       768 → 1 |                      11,520 → 0 |
| 24×120 |  2,880 | 1808.02 → 1774.60 |  6163.14 → 1119.34 |              81.8% |     2,880 → 1 |                      43,200 → 0 |
| 96×128 | 12,288 | 7792.09 → 7624.99 | 28095.26 → 4916.50 |              82.5% |    12,288 → 1 |                     184,320 → 0 |

The shared scheduler retains per-board deadlines so a new board cannot be advanced early by an existing board. Tiles mounting together share their deadline, allowing React to batch their updates. Stable flap nodes restart their CSS animations with drum-position keyframe names, including batched steps.

Initial mounting and the transition's first render still scale with tile count. Even after this change, a 12,288-tile React/jsdom display is expensive. These results do **not** establish a 60fps guarantee for very large displays, nor remove the need for future browser profiling of layout, CSS layers, and compositing.

## Matrix results

All times are milliseconds, before → after. Totals include preparation plus the sampled playback window, not the entire transition when it lasts longer than 480ms.

| Effect      | Matrix  |  Preparation |      Playback |         Total |  Paints |      Traced dots |
| ----------- | ------- | -----------: | ------------: | ------------: | ------: | ---------------: |
| flip        | 32×8    |  1.53 → 2.33 |   1.44 → 0.80 |   2.96 → 3.13 | 31 → 10 |       2521 → 781 |
| flip        | 64×64   |  0.53 → 1.59 |   2.23 → 1.65 |   2.76 → 3.26 | 31 → 12 |    40644 → 15475 |
| flip        | 128×128 |  1.37 → 4.12 |   7.72 → 3.78 |   8.97 → 7.89 | 31 → 12 |   171287 → 65299 |
| flip        | 256×256 | 3.05 → 13.96 | 23.84 → 13.42 | 26.95 → 27.38 | 31 → 12 |  686435 → 261567 |
| cascade     | 32×8    |  0.39 → 0.36 |   0.89 → 0.31 |   1.28 → 0.67 |  31 → 6 |       2479 → 475 |
| cascade     | 64×64   |  0.56 → 0.22 |   1.98 → 2.17 |   2.54 → 2.40 | 31 → 16 |    43845 → 22616 |
| cascade     | 128×128 |  0.98 → 0.37 |   8.03 → 9.03 |   9.02 → 9.40 | 31 → 16 |   186693 → 96344 |
| cascade     | 256×256 |  3.35 → 1.59 | 21.97 → 18.22 | 25.29 → 19.44 | 31 → 16 |  749157 → 386648 |
| bitmap-flip | 32×8    |  0.24 → 0.66 |   1.29 → 0.13 |   1.53 → 0.79 |  31 → 0 |         9920 → 0 |
| bitmap-flip | 64×64   |  0.40 → 1.67 |   3.11 → 0.29 |   3.50 → 1.98 |  31 → 0 |       128960 → 0 |
| bitmap-flip | 128×128 |  1.03 → 5.06 |   9.32 → 0.77 |  10.35 → 5.83 |  31 → 0 |       509888 → 0 |
| bitmap-flip | 256×256 | 2.81 → 18.59 |  34.40 → 2.97 | 37.17 → 21.64 |  31 → 0 |      2033600 → 0 |
| fade        | 32×8    |  0.31 → 0.29 |   1.18 → 1.15 |   1.49 → 1.44 | 31 → 30 |      3790 → 3700 |
| fade        | 64×64   |  0.57 → 0.23 |   7.76 → 4.08 |   8.31 → 4.34 | 31 → 30 |    60640 → 59200 |
| fade        | 128×128 |  0.97 → 0.30 |  7.63 → 11.57 |  8.57 → 11.87 | 31 → 30 |  254688 → 248640 |
| fade        | 256×256 |  3.34 → 0.90 | 23.92 → 26.65 | 27.37 → 27.55 | 31 → 30 | 1018752 → 994560 |
| wipe        | 32×8    |  0.22 → 0.17 |   0.80 → 0.73 |   1.01 → 0.90 | 31 → 24 |      2558 → 1973 |
| wipe        | 64×64   |  0.56 → 0.21 |   1.59 → 4.58 |   2.14 → 4.76 | 31 → 28 |    40920 → 36840 |
| wipe        | 128×128 |  0.90 → 0.27 |   5.35 → 6.94 |   6.25 → 7.21 | 31 → 30 |  171872 → 165824 |
| wipe        | 256×256 |  3.33 → 0.90 | 15.90 → 19.49 | 19.14 → 20.30 | 31 → 30 |  687456 → 663264 |
| slide       | 32×8    |  0.26 → 0.22 |   0.82 → 0.36 |   1.06 → 0.58 |  31 → 8 |       2480 → 630 |
| slide       | 64×64   |  0.44 → 0.14 |   6.40 → 3.18 |   6.85 → 3.31 | 31 → 30 |    40740 → 39300 |
| slide       | 128×128 |  0.89 → 0.30 |   5.93 → 7.13 |   6.82 → 7.44 | 31 → 30 |  171486 → 165438 |
| slide       | 256×256 |  3.22 → 0.86 | 15.71 → 19.81 | 18.89 → 20.67 | 31 → 30 |  686700 → 662508 |
| dissolve    | 32×8    |  0.18 → 0.15 |   1.13 → 1.24 |   1.31 → 1.39 | 31 → 30 |      2615 → 2525 |
| dissolve    | 64×64   |  0.36 → 0.16 |   2.20 → 2.68 |   2.52 → 2.84 | 31 → 30 |    41116 → 39676 |
| dissolve    | 128×128 |  0.92 → 0.38 |   8.87 → 9.87 |  9.74 → 10.25 | 31 → 30 |  171655 → 165607 |
| dissolve    | 256×256 |  3.30 → 0.92 | 26.80 → 29.28 | 30.13 → 30.29 | 31 → 30 |  688739 → 664547 |

Ordinary flips perform no glyph rasterization or cell layout construction during playback. Their preparation costs more: at 256×256, preparation rises from about 3ms to 14ms, while sampled playback drops from about 24ms to 13ms. This shifts work before animation rather than removing all work. Prepared RGB frames are limited to an estimated **8MiB per plan**; longer/larger flips use the existing streaming cache. This is an RGB-frame budget, not a total-heap limit: layouts, source/target frames, canvases and paint snapshots use additional memory.

Held-frame and bitmap paint counts improve substantially. Continuous effects do not show a universal speedup: at 256×256 the measured total changes by about +1% for fade/dissolve, +6% for wipe, and +9% for slide. Pixel comparisons and retained snapshots have a cost, and this benchmark excludes the native painting work they avoid. Browser profiling is needed to establish the actual frame-time tradeoff; these numbers are disclosed rather than treating every effect as faster.

## Regression coverage and TDD

Tests were observed failing before the corresponding fixes, then passing: per-tile timer counts across board sizes; independent boards joining just before an existing deadline; subscription timestamps drifting across a large commit; DOM identity and animation restart after batched ticks; flip rasterization during playback; duplicate held-frame painting; cascade layout reuse; and geometry changing while backing-store dimensions remain equal. Bitmap coverage was added against the newer main renderer and failed before the paint-cache fix.

The tests also check retargeting, speed changes, loading/message handoff, reduced motion, cleanup, appearance changes, final pixels, and bounded preparation for a long 256×256 sequence. Deterministic operation-count regressions run in normal CI; noisy timing samples are opt-in and have no wall-clock thresholds. Existing automation clock fixtures now drive both intervals and timeouts with monotonic deadlines.

## Reproduce

```sh
npm ci
npm test
npm run perf:boards
# Appends JSON lines; choose a new output file for a fresh sample.
FIESTA_BOARD_BENCH_OUT=/tmp/boards.jsonl npm run perf:boards
# LED-only samples, run three times into the same file for the reported medians:
FIESTA_BOARD_BENCH=1 FIESTA_BOARD_BENCH_OUT=/tmp/led.jsonl npx vitest run src/components/board/board-animation.perf.test.tsx -t LED
```

For a baseline comparison, use a separate checkout at the stated base, copy the benchmark file into it, install the same lockfile dependencies, and run the same direct Vitest command with `FIESTA_BOARD_BENCH=1`. Avoid other heavy processes during samples. Do not compare these numbers to production browser timings.

On a host that can launch Chromium, serve Storybook and use the existing browser harness for board stories:

```sh
npm run build-storybook
npm run vrt:serve
# In another shell:
npm run perf:bench -- measure --base-url http://localhost:6007 --only board --out /tmp/board-browser.json --markdown /tmp/board-browser.md
```

The browser harness measures the selected stories, not automatically every synthetic grid above. Large-grid interaction traces and visual playback checks should accompany any claim about production FPS.
