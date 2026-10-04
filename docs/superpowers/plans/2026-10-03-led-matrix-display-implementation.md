# LED Matrix Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship LED matrix support in `@fiestaboard/ui` as a series of small, independently releasable PRs that FiestaBoard and its output plugins can consume as each one lands. The pieces are:

- the content grammar, character sets and device models;
- the LED renderer and transitions;
- the glyph and picker UI;
- a single preview entry point.

**Architecture:** The working prototype on `feat/led-matrix-display` is the reference implementation, and the spec records its full behaviour. This plan does not rewrite it. It carves the prototype into PRs in dependency order (Tasks 0–6), adds the pieces the prototype doesn't have yet (Task 7: cells-in rendering plus `DisplayPreview`; Task 8: the device-aware `TemplateEditor`; Task 9: `TvFrame` for FiestaPanel previews; Task 10: the Storybook showcase; Task 11: output-plugin devDependencies), ends with the coordinated markup switch-over (Task 12), and records what each release unblocks downstream.

**Tech stack:** React 19, TypeScript, Tailwind v4, Storybook 10 (VRT + test-runner a11y), vitest + jsdom, `node --test` fixture tests, and JSON Schema fixtures for the Python port.

**Spec:** `docs/superpowers/specs/2026-10-03-led-matrix-display-design.md`

**Downstream program:** FiestaBoard output plugins. The plan is at `~/.claude/plans/fiestaboard-output-plugins.md` (D15, LED alignment), and the roadmap at `~/.claude/plans/fiestaboard-output-plugins-roadmap.md`. The coordinating session is `distributed-kindling-quokka-45`.

## Global Constraints

- **Every merge to `main` publishes a version.** The continuous release derives the bump from conventional commits, so each PR must be safe to ship alone: additive, default-off, and with no `!` / `BREAKING CHANGE`, except Task 12, which is a deliberate, coordinated major. A PR whose feature is half-done keeps it unexported or behind a prop that defaults to today's behaviour.
- **PRs are squash-merged, so the PR title is the commit the release gate sees.** Releases use `--generate-notes`, so anything a downstream consumer must know goes in the PR **title and body**, not only in commit messages.
- **Parser parity is a contract.** `src/lib/board-characters.ts` mirrors FiestaBoard's Python renderer.
  - New grammar (`{colour:…}`, `{fg/bg:…}`, `{icon:…}`) stays behind `extendedMarkup` (default `false`) until FiestaBoard ships parser parity in a coordinated release.
  - Every message without the new markers parses byte-identically, _except_ the four deliberate parity fixes in Task 0. Those ship as `fix(board-characters)` commits and are called out in the release notes.
- **The LED flip never uses Vestaboard's character order.** It is FiestaBoard's own seeded scramble over the device's character set. Split-flap `BoardDisplay` keeps the real Vestaboard order.
- **Device data is open JSON.** Every API accepts a `DeviceModel` / `CharacterSet` object as well as a built-in id. Unknown ids fail loudly; they never coerce to a flagship.
- **Device frame budgets are hard.** A transition fits `animation.maxFrames` and always lands exactly on the final frame. It is compressed to fit, never truncated.
- **Appearance is preview-only.** Pixel shape, dot ratio, colours and bezel never reach device bytes. Anything that changes the bytes lives in layout options.
- **Exports are curated.** Each PR adds named exports to `src/index.ts` for its own public surface. No `export *` for the new modules, and internals stay unexported.
- **Exported components are inventoried in the same PR.** `src/stories/component-inventory.ts` and `component-inventory-demos.tsx` must cover every exported component, and `scripts/ci/tests/component-inventory-coverage.test.mjs` enforces it.
- **VRT shoots every story** in 2 viewports × 2 themes with `reducedMotion: "reduce"`.
  - Animated stories must render a stable frame under reduced motion.
  - The transition picker's looping previews freeze to a static frame.
  - Anything still racy goes in `vrt/skip.json` with a reason (precedent: `board-boarddisplay--loading`).
- **Bundle budget.** CI's `perf-bundle` job gates gzipped size. Each task records its bundle delta in the PR body, from `npm run perf:bundle` against `main`. If a task exceeds the budget, the PR adjusts the budget explicitly with a reason; it never just lets it grow. Research prose (device `notes`, `sources` URLs) stays out of the runtime modules: it lives in the fixture JSON and the plugin data, and the runtime built-ins carry only what rendering needs (Task 2).
- **Every PR passes the following before review:**
  - `npm run lint`
  - `npm run format:check`
  - `npm run typecheck`
  - `npm test`
  - `npm run release:test`
  - `npm run build`
  - Storybook test-runner (a11y)
- **Golden fixtures are code-generated and drift-tested.** `scripts/ci/led-fixtures.mjs` writes `scripts/ci/tests/fixtures/*.json`, and a test fails if the committed fixtures differ from the code's output. FiestaBoard's Python port pins them by FiestaUI commit SHA, so they never change silently.
- **After each merge, send the coordinating FiestaBoard session the merge SHA and the published version** (see each task's "Downstream" line).

## Reference prototype and carving method

The prototype is uncommitted on `feat/led-matrix-display` (base `81ef225`, revision 7: 649 vitest + 353 node tests green). Preserve it before carving:

- [ ] Commit the prototype on `feat/led-matrix-display` as one commit: `chore(prototype): LED matrix reference implementation (do not merge)`. Push it, and open a **draft** PR titled "LED matrix prototype (reference, do not merge)" so its stories stay browsable.
- [ ] For each task below:
  1. Branch from `main`.
  2. Bring files over with `git checkout feat/led-matrix-display -- <paths>`.
  3. Trim the parts that belong to later tasks (see **Split files**).
  4. Run the full check list, and open the PR.
  5. Merge before cutting the next task's branch. The tasks are sequential; don't stack them.
- [ ] When the last task merges, close the draft PR and delete the branch.

**Split files.** These span several tasks, so each task brings over only its slice:

| File                                                                         | Split across tasks                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                                               | 1–9 (each adds its own exports)                                                                                                                                                              |
| `src/stories/component-inventory.ts` / `component-inventory-demos.tsx`       | 3–6                                                                                                                                                                                          |
| `src/components/board/led-matrix-display.tsx` / `.stories.tsx` / `.test.tsx` | 3 (static) / 4 (transitions)                                                                                                                                                                 |
| `scripts/ci/led-fixtures.mjs` and `src/lib/led-fixtures.test.ts`             | 2 (data + layout goldens) / 4 (transition goldens)                                                                                                                                           |
| `src/lib/plugin-device.test.ts`                                              | 2 (validation + layout) / 4 (budget) / 6 (picker availability)                                                                                                                               |
| `src/lib/devices.test.ts`                                                    | 2 (model data, resolution, validators) / 4 (`defaultTransitionIdForModel`, `transitionSpecForDevice` assertions)                                                                             |
| `src/lib/led-golden-cases.ts`                                                | 2 (`GOLDEN_LAYOUT_CASES` only, no transition imports) / 4 (transition cases)                                                                                                                 |
| `src/components/board/led-matrix-display.test.tsx`                           | 2 (library suites move to `src/lib/led-matrix.test.ts`: fonts, glyph table, `renderLedFrame`, spans/icons/case/monochrome, `layoutLedMessage` text) / 3 (static component) / 4 (transitions) |
| `docs/superpowers/specs/2026-10-03-led-matrix-display-design.md`             | 0 (lands with the first PR, updated as decisions change)                                                                                                                                     |

**Module dependency order** (from the import graph):

```
board-icons → board-characters → led-fonts → character-sets → led-matrix → devices
  → led-transitions → led-transition-registry → (components)
```

So character sets and device models cannot ship before the LED layout library. Task 2 ships the whole pure-data layer together.

---

### Task 0: Parser parity fixes (patch release)

**PR title:** `fix(board-characters): match the board for {filled}, unknown end tags, emoji and typed hearts`

These are FiestaBoard's B1 parity findings: the preview disagrees with what the board draws. They change what split-flap previews draw today, and FiestaBoard pins `@fiestaboard/ui` exactly and has tests on heart tiles (`web/src/__tests__/board-display-colors.test.tsx`, `integrations-plugin-preview-code62.test.tsx`). So they ship alone, as a patch, with nothing else in the PR. That keeps any breakage in the evergreen upgrade PR attributable, and gives B1 one clean SHA to pin.

**Files:**

- Modify: `src/lib/board-colors.ts` (the `filled` name), `src/lib/board-characters.ts`, `scripts/ci/tests/board-characters.test.mjs`
- Add: the spec doc

**Steps:**

- [ ] Write a test for each fix, mirroring FiestaBoard's pinned case, and confirm each fails against `main`.
- [ ] `{filled}` resolves to tile 71.
- [ ] Only `{/}` and `{/<colour>}` are end tags. Any other `{/…}` (`{/foo}`, `{/63}`, `{/white:A}`) renders literally.
- [ ] `parseLine` iterates by code point, so astral characters and emoji occupy one cell.
- [ ] A typed `♥` / `❤` projects to code 62.
- [ ] The PR body lists the four visible changes for the release notes.
- [ ] Before merging, run FiestaBoard's web tests against a packed build (`npm pack`, installed into a FiestaBoard checkout), or warn the evergreen upgrade PR, so the heart-tile tests are expected to change.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** send the merge SHA and the version. B1 flips its pinned tests 1–4.

---

### Task 1: Markup grammar and icons

**PR title:** `feat(board): gated extended markup ({colour:…}, {fg/bg:…}, {icon:…}) and board icons`

**Files:**

- Create: `src/lib/board-icons.ts`, `scripts/ci/tests/fixtures/board-icons.json`
- Modify:
  - `src/lib/board-characters.ts`: `ParseLineOptions.extendedMarkup` / `preserveCase`, span, block and icon tokens, the `messageToText` options parameter, and `richTokensEqual`
  - `scripts/ci/tests/board-characters.test.mjs`
  - `src/components/board/board-display.tsx`, `static-board-display.tsx`, `board-teaser.tsx`: `extendedMarkup` prop, default `false`. `ScaledBoardDisplay` passes it through its props spread and needs no change.

**Interfaces (exported):**

- `ParseLineOptions` with `extendedMarkup` and `preserveCase`
- the extended `BoardToken` fields (`color?`, `background?`, `icon?`)
- `richTokensEqual(a, b)`: true only when the type, value/code, `color`, `background` and `icon` all match (spec §8.1). This is new: the prototype doesn't have it yet, so write it test-first. `tokensEqual` stays colour-blind for flap memo comparators.
- the board icon registry: `BOARD_ICONS`, `BOARD_ICON_NAMES`, `BOARD_ICON_ALIASES`, `resolveBoardIconName`, `isBoardIconName`, types. It has 16 icons, including the `storm`→bolt and `x`→cross aliases and `{icon:heart}`→♥.

**Steps:**

- [ ] Bring over the gated grammar and the icons. Assert that, with `extendedMarkup` off, every existing parser test passes unchanged and the new markers parse as literal text.
- [ ] Fix under `extendedMarkup`: an icon whose fallback is a colour tile keeps the surrounding span's colour and background (B1 finding 5).
- [ ] Write `richTokensEqual` test-first.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** send the merge SHA. FiestaBoard B1 (`feat/markup-extended-parser`, PR #2126) regenerates its fixtures from this SHA and flips pinned test 5.

---

### Task 2: LED data layer: fonts, character sets, layout and raster, device models, schemas

**PR title:** `feat(board): LED fonts, character sets, device models and their JSON schemas`

**Files:**

- Create:
  - `src/lib/led-fonts.ts`
  - `src/lib/character-sets.ts` + test
  - `src/lib/led-matrix.ts` (layout → raster, presets, `frameToAscii`, `frameToBits`)
  - `src/lib/devices.ts` + test
  - `src/lib/plugin-device.test.ts` (validation + layout slice)
  - fixtures: `led-fonts.json`, `character-sets.json`, `device-models.json`, `character-set.schema.json`, `device-model.schema.json`
  - the `scripts/ci/led-fixtures.mjs` data slice, plus layout goldens in `led-golden.json` (message + spec → `LedLayout.text` + RGB888)
- Modify: `src/index.ts`

**Interfaces (exported):**

- **Character sets:**
  - `CHARACTER_SETS`, `CHARACTER_SET_IDS`
  - `charsetSupports`, `charsetIssue`, `charsetFallback`, `validateMessage`, `charsetDiff`, `charsetLineage`
  - `characterSetForDevice`, `materializeCharacterSet`, `validateCharacterSet`, `tryResolveCharacterSet`
  - types
- **Device models:**
  - `DEVICE_FAMILIES`, `DEVICE_MODELS`
  - `deviceModelForDeviceType`, `deviceModelForPreset`, `characterSetForModel`, `ledSpecForModel`, `modelsByTechnology`
  - `validateDeviceModel`, `tryResolveDeviceModel`
  - types
- **LED layout:**
  - `LED_FONTS`, `LED_MATRIX_PRESETS`
  - `ledGridLayout`, `layoutLedMessage`, `rasterizeLedLayout`, `renderLedFrame`, `frameToAscii`, `frameToBits`
  - types

  `LED_DRUM`-era internals are gone and are not exported.

**New beyond the prototype:**

- [ ] Add an optional `appearance` block to `DeviceModel` and its schema:
  - `pixelShape`, `dotRatio`, `offColor`, `substrateColor`, `bezel`, and for split-flap, board colours
  - plus `appearance.options`, which lists the user-selectable fields (e.g. `{ board_color: ["black", "white"] }`)

  It is preview-only; document that in the schema description. Fill it in for every built-in model.

- [ ] Move `pixelShape` into `appearance.pixelShape`. It has never been published, so there is no alias. Tell the coordinating session, so the Pixoo plugin's `output/device-models.json` moves it too before its v0.1.0 tag.
- [ ] Keep research prose out of the runtime: the built-in models in `src/lib/devices.ts` keep `animation.notes` / `sources` empty or absent, and the full researched text lives in `device-models.json` and in the plugin data. Record the bundle delta.
- [ ] Move the library suites out of `led-matrix-display.test.tsx` into `src/lib/led-matrix.test.ts` (fonts, glyph table, `renderLedFrame`, spans/icons/case/monochrome, `layoutLedMessage` text). Carry only the non-transition slices of `devices.test.ts` and `led-golden-cases.ts` (see **Split files**).

**Steps:**

- [ ] Bring the modules over with their tests. Confirm that nothing imports `led-transitions` or any component.
- [ ] Generate the fixtures with `node scripts/ci/led-fixtures.mjs`, and confirm the drift test fails if the code changes without regenerating them.
- [ ] Add a standards-compliant JSON Schema validator as a devDependency (Ajv, Draft 7, with `strict: true`). Validate every fixture data file (`device-models.json`, `character-sets.json`) against the schemas in a test, along with a fictional plugin-declared model (a 48×12 amber monochrome sign with its own `€` glyph).

  Register the schemas **by `$id` only**, never by filename. Registering by filename would hide a broken `$ref` that FiestaBoard's python-jsonschema rejects.

  Also add a test that the hand-written TS validators (`validateDeviceModel`, `validateCharacterSet`) agree with the schema on a table of valid and invalid documents, so the two definitions cannot drift.

- [ ] Charset golden fixtures for FiestaBoard's Python port, generated by `scripts/ci/led-fixtures.mjs` with a drift test. Cases: `message` + set (built-in and plugin) → `validateMessage` issues (row, col, token, reason, fallback). Also a `charsetFallback` table covering every branch: a missing icon to a tile or a character, span colours kept or dropped, uppercase, °↔♥, and blank. And `materializeCharacterSet` inputs → flattened sets. **Required case (FiestaBoard D17):** at least one plugin-style set that `extends` a built-in _and_ carries custom `glyphs` (the 48×12 amber sign's set with its `€` bitmap). Run it through `materializeCharacterSet`, `validateMessage` and `charsetFallback`, and through layout and raster, so the inheritance and custom-glyph paths are pinned exactly.
- [ ] Decide whether tile tokens normalise to numeric codes (`"red"` → `"63"`). Today a tile keeps the spelling it was parsed with. If it changes, note it in the parity fixtures and tell the coordinating session.
- [ ] Spec §5: document the `extends` merge rule (per-field override, arrays replaced wholesale, `version` not inherited), and that a plugin must bump `version` whenever its set's content changes, with caches keyed on (set id, version).
- [ ] Keep `scripts/ci/tests/schema-refs.test.mjs` (added in revision 7). It checks that every `$ref` resolves, per RFC 3986, to a shipped schema's `$id`, and that each `$id` names its own file.
- [ ] Run the checks, then open and merge the PR.

**Downstream:**

- FiestaBoard vendors the schemas, pinned to this release.
- B3 (rich-cell projection) uses `charsetFallback` semantics.
- `feat/output-plugin-kind` validates `output.device_models[]` against `device-model.schema.json`.
- The Pixoo plugin repo (`Fiestaboard/fiestaboard-output--divoom-pixoo`) re-validates its `output/device-models.json` (currently the draft from revision 7, with the `appearance` values added) and tags **v0.1.0**.

Send the version and SHA.

---

### Task 3: `LedMatrixDisplay`, the static renderer

**PR title:** `feat(board): LedMatrixDisplay, an LED matrix preview renderer`

**Files:**

- Create: `src/components/board/led-matrix-display.tsx`, its static slice only:
  - no `transition` / `announceUpdates`
  - one canvas, batched `Path2D`, upscale bloom with block-field masking, DPR cap and resolution repaint
  - naming by clipped grid text, monochrome, block colour
- Also: the static stories (presets, Pixoo featured, colour text, icons, mixed case, monochrome, block text, the FiestaBoard examples, small matrix vs flagship, one message on every character set) and the static tests.
- Modify: `src/index.ts`, the component inventory and demos, `.github/prompts/design-system-adoption.md`.

**Interfaces:** `LedMatrixDisplay`, `LedMatrixDisplayProps`, `LedPixelShape`.

**Steps:**

- [ ] Bring over the static slice. Remove the transition code paths, their imports and the `transition` / `announceUpdates` props. Task 4 adds those props, because their types (`LedTransitionId`, `LedTransitionSpec`) live in Task 4 modules.
- [ ] Inventory entry and demo.
- [ ] Add a note to `.github/prompts/design-system-adoption.md`: LED matrix components and the charset props on pickers are adopted in FiestaBoard only through the output-plugins program, so the automated adoption pass must not swap them in.
- [ ] Run Storybook test-runner a11y locally on the new stories, and run a VRT shoot (`npm run vrt:shoot`) to confirm the stories are stable across two runs.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** none blocking. FiestaBoard gets it in the evergreen upgrade PR, unused.

---

### Task 4: Transitions: engine, registry and golden sequences

**PR title:** `feat(board): LED transitions (flip, cascade, slide, wipe, fade, dissolve, none) with device frame budgets`

**Files:**

- Create:
  - `src/lib/led-transitions.ts` + test
  - `src/lib/led-transition-registry.ts` + test
  - `src/lib/led-golden-cases.ts`
  - the transition slice of `scripts/ci/led-fixtures.mjs` / `led-golden.json` (from, to, model or spec → exact frame sequences, including the Pixoo 32-frame budget and the fades)
  - the `plugin-device.test.ts` budget slice
- Modify:
  - `led-matrix-display.tsx`: `transition` (registry ids or a spec object), the resolution precedence (explicit > device default, then a reasoned fallback, exposed as `data-transition-source` / `-fallback`), `announceUpdates`, the rAF loop with mid-flight retargeting, `frameAtIndex`
  - the transition stories, including `SequenceDeviceBudget` (the 32-frame budget on the generic `sequence_panel_64` fixture model; the Pixoo 64 snaps) and `BlockFlip`
  - `src/index.ts`

**Interfaces:**

- `LED_TRANSITIONS`, `transitionsForModel`, `defaultTransitionIdForModel`, `resolveLedTransition`
- `planLedTransition`, `ledTransitionFrames`, `LedTransition` (with `frameCount`, `frameAt`, `frameAtIndex`, `layoutAt`), `LedTransitionSpec` (`maxFrames`, `scrambleSteps`, `stagger`, `halfFlap`, `stepMs`)
- types

**Steps:**

- [ ] Bring over the engine and the registry. Assert that the LED transition path has no dependency on `BOARD_CHARS` order (there's a test for this).
- [ ] Generate the transition goldens. Test the budget at non-divisible durations (777 ms into 3…32 frames, for every kind).
- [ ] Confirm reduced motion snaps, and that VRT shots of the transition stories are stable. If a story still races, add it to `vrt/skip.json` with a reason.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** send the SHA and version. FiestaBoard B2 (`feat/led-raster`, `src/led/`) ports the layout, raster and seeded scramble flip against `led-golden.json`.

---

### Task 5: `CharacterGlyph` and `CharacterSetSpecimen`

**PR title:** `feat(board): CharacterGlyph and CharacterSetSpecimen`

**Files:**

- Create: `src/components/board/character-glyph.tsx` (+ stories and test), `character-set-specimen.tsx` (+ stories and test)
- Modify: `src/lib/board-metrics.ts` (`TILE_BASE_HEIGHT`), `src/index.ts`, inventory

**Interfaces:**

- `CharacterGlyph` (with a `height` option), `characterGlyphName`, `characterGlyphRenderer`, `characterGlyphToken`, `DEFAULT_CHARACTER_GLYPH_LABELS`
- `CharacterSetSpecimen`, `DEFAULT_CHARACTER_SET_SPECIMEN_LABELS`
- types

**Steps:**

- [ ] Bring both components over with their tests: names never expose raw markup, fallback plus the unsupported marker, renderer choice per set, and SVG output that works in SSR and jsdom.
- [ ] Run the checks, then open and merge the PR.

---

### Task 6: Charset-aware editor pickers and `LedTransitionPicker`

**PR title:** `feat(editor): charset-aware colour and draw pickers; LedTransitionPicker`

**Files:**

- Modify:
  - `src/components/editor/color-picker-content.tsx` + stories: `charset`, `onInsertTextColor`, `onInsertIcon`, glyph rendering, the keyboard guard limited to the swatch grid, `role="group"` sections, black shown as "Black (unlit on LEDs)"
  - `draw-char-picker-content.tsx` + stories: `charset`, the lowercase heading, glyph stamps, and the code-62 button drawn with `CharacterGlyph`
- Create:
  - `src/components/editor/charset-pickers.test.tsx`
  - `src/components/board/led-transition-picker.tsx` (+ stories and test): `aria-disabled` unavailable options with reasons, the device-default marker, a shared preview clock, and static previews under reduced motion
  - the `plugin-device.test.ts` picker-availability slice

**Steps:**

- [ ] Prove the pickers are **byte-identical when `charset` is not passed**. Snapshot or DOM-compare them against `main`, because FiestaBoard's local picker copies are what's in production today.
- [ ] Bring over the picker changes and the transition picker. Write the keyboard tests first: Enter/Space on an icon inserts the icon, not a colour, and every option is reachable.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** FiestaBoard's editor can adopt the package pickers in place of its local copies (`web/src/components/tiptap-template-editor/components/`). That threads `charset` the same way `code62Glyph` travels today.

---

### Task 7: Cells-in rendering and `DisplayPreview` (new)

**PR title:** `feat(board): cells-in LedMatrixDisplay and DisplayPreview`

This is new work. FiestaBoard core parses markup once into rich cells (FiestaBoard plan D15), so previews must be able to render a cell grid handed to them, not only a message string. D7 also asks for one capability-driven preview entry point.

**Files:**

- Modify: `src/lib/led-matrix.ts` (a `layoutLedCells` path from `BoardToken[][]`), `led-matrix-display.tsx`
- Create: `src/components/board/display-preview.tsx` (+ stories and test)

**Interfaces:**

- `LedMatrixDisplay` accepts `cells?: BoardToken[][]` as an alternative to `message`. When both are given, `cells` wins. The cell grid's dimensions must match the device grid; a mismatch fails loudly in dev and clips in production.
- `DisplayPreview({ model, message | cells, appearance?, transition?, ... })` dispatches on `model.technology` and `model.geometry`:
  - split-flap goes to `StaticBoardDisplay` / `BoardDisplay`
  - LED matrix goes to `LedMatrixDisplay`
  - FiestaPanel goes to the split-flap renderer inside a TV frame, once FiestaBoard defines that frame. Until then it is the split-flap renderer.

  The board's `appearance.options` choices are applied only when the model lists them.

**Steps:**

- [ ] Write tests first:
  - cells-in and message-in produce identical frames for the same content (golden-checked);
  - a model's `appearance.options` gate the overrides;
  - an unknown model raises an error.
- [ ] Implement the cells-in path on top of the existing `layoutLedCells`.
- [ ] Build `DisplayPreview`, with stories for each technology using the built-in models.
- [ ] README: add a "Display previews" usage section covering `DisplayPreview`, `LedMatrixDisplay` (message-in and cells-in), the validators (`validateDeviceModel`, `validateCharacterSet`), and where the JSON Schemas live. Add a short "Declaring a device (output plugin authors)" section that points at the spec's §6 and at the fixtures.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** the FiestaBoard app adopts `DisplayPreview` for board previews (output-plugins D7).

---

### Task 8: Device-aware `TemplateEditor` (new)

**PR title:** `feat(editor): device-aware TemplateEditor — charset/deviceModel, colour and block spans, icons, charset warnings`

Added after the plan was approved. Task 6 gave the pickers `charset`; this threads it through the editor itself, so the TipTap surface reads, writes, offers and warns about the extended markup for whichever board a template targets. The template syntax and its rules were agreed with FiestaBoard (session `distributed-kindling-quokka-45`) and are recorded in spec §10.

**Files:**

- Modify:
  - `src/components/editor/template-editor.tsx`: `charset?` (an id or a `CharacterSet`), `deviceModel?` (an id or a `DeviceModel`; implies the set through `characterSetForModel` with `code62Glyph`, and the grid from the model's geometry — an LED model's rows × cols are `ledGridLayout`'s; explicit `boardWidth` / `boardLines` still win). Unknown ids throw. The warnings summary is the textbox's accessible description.
  - `template-editor-toolbar.tsx`: `charset`, threaded to both pickers; the picker callbacks wired to editor commands (`toggleMark` for spans, an icon atom at the caret); draw-mode swatches only for a set with tiles.
  - `draw-char-picker-content.tsx`: an icon row for a set with icons (`{ kind: "icon" }` brushes).
  - `utils/serialization.ts`: `TemplateParseOptions.extendedMarkup`, the nested double-brace tokenizer, the CLOSED head grammar (`spanHead`: a colour name, 63–70, `#rrggbb`, `fg/bg`, or `icon`; never `filled` / 71), mark-aware serialization (`serializeInlineNodes`).
  - `utils/draw-mode.ts`: the icon brush; `{{icon:…}}` is one cell and a span is one cell per character, so draw mode stays positional over the new forms.
  - `utils/length-calculator.ts`, `utils/insertion.ts`, `utils/stroke-transaction.ts`, `node-views/node-view-context.tsx` (the set reaches node views), `src/styles/editor.css`.
- Create:
  - `extensions/color-span-mark.ts` — a MARK with `color` / `background`, serialized `{{red:HOT}}` / `{{black/white:OPEN}}`
  - `extensions/icon-node.ts` + `node-views/icon-node-view.tsx` — an atom drawn by `CharacterGlyph` with the target set, serialized `{{icon:sun}}` (always the canonical name; `{sun}` is a read-only alias, D16)
  - `extensions/charset-warnings.ts` — decorations from `charsetIssue` / `charsetFallback` per cell, with a `title` naming what draws instead and a summary outside the surface; the split-flap case says the forms render literally until Task 12
  - the tests: `template-editor-identity.test.tsx` (byte-identity without a set, snapshots generated at the parent commit), `utils/extended-markup.test.ts` (round-trips, nesting, edge cases, draw mode, length), `template-editor-charsets.test.tsx` (a real editor in jsdom: inserting a span, a block and an icon through the toolbar, the serialized value, the warnings)
  - the stories: each charset/device (Flagship v1 and v2, Note, Pixoo 64, HUB75, AWTRIX, MAX7219, the ACME plugin set), the editor beside a live `DisplayPreview`, and the warnings

**Rules (from the agreed inputs):**

- [x] Without `charset` / `deviceModel` the editor is byte-identical in value and DOM: the extended forms are not parsed, so a split-flap template serializes exactly as today.
- [x] The closed head grammar: `{{weather:sf.temperature}}` and any other head stays a variable. FiestaBoard reserves the colour names, the codes and `icon` as plugin ids.
- [x] Spans, blocks and icons are OFFERED only when the set supports them (`colorSpans`, `blockSpans`, `icons`). A loaded template is never rewritten: a span read on a flap set is kept and warned about, not dropped.
- [x] Nesting round-trips: a variable, formula or tile inside a span (`{{red:{{weather.temp}}°}}`); a span inside a span flattens to adjacent spans (the same cells).
- [x] Data is not markup: there is no literal-brace escape in the editor's parser; the data-vs-markup rule is FiestaBoard's engine contract (spec §10.2).
- [x] Length counting treats a span as its content and an icon as one cell.
- [x] Case follows the set: a mixed-case set keeps typed lowercase (surface, template, draw stamps, no `case` warning); every other set, and no set, uppercases on serialize as before.

**Steps:**

- [x] Generate the byte-identity snapshots at the parent commit before changing the parser; never regenerate them.
- [x] Build the parser, the mark, the icon node, the warnings and the wiring; tests for each.
- [x] Stories, the a11y runner, screenshots looked at.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** FiestaBoard's editor adopts the package editor with `deviceModel` threaded from the board. B5 `feat/template-extended-syntax` is the engine side of the same syntax (B4 #2161 has `TemplateEngine.render(..., extended_markup=False)`, applied per flap output until Task 12).

---

### Task 9: `TvFrame`, an OLED-TV-style frame for FiestaPanel previews (new)

**PR title:** `feat(board): TvFrame for FiestaPanel previews`

FiestaPanel is a board shown on a TV, so its previews sit on one. `TvFrame` is the OLED television around any board renderer, and `DisplayPreview frame="tv"` (reserved in Task 7) now wraps whichever renderer the model gets in it. The inputs were agreed with FiestaBoard (`src/panels/models.py`; spec §7.5 and §14): the render style and the grid come from the model as before; the set itself from `screen_diagonal_inches`, `screen_aspect_w` / `_h`, the viewer's auto-dim level and its frame-fetch failure. `calibration_scale` is the viewer's physical-size calibration and the frame never reads it.

**What was built:**

- `TvFrame` (`src/components/board/tv-frame.tsx`): a thin gunmetal bezel lit from above with a slim chin, a standby LED on the chin, a centre plate stand (`stand={false}` for a wall mount), and an OLED-black screen with a faint reflection. CSS and inline styles only — no images, no new tokens (the LED is `--color-board-orange`; the hardware greys are literal, as the board bezels' are).
  - `diagonalInches` (3–200, default 55) and `aspect` (a number or `{ w, h }`, default 16/9) set the geometry through `tvFrameGeometry`: the bezel is modelled in inches (a fixed part plus a little per inch of diagonal) and emitted as a fraction of the set's width in `cqw` (the housing is an inline-size container), so a 32" set has a visibly thicker bezel and a bigger stand than an 85" (`standScale = √(55/D)`, bounded). The diagonal never changes how big the board renders beyond the fit.
  - The board is laid out at its natural size (`width: max-content`) and scaled to fit the screen inside a 4% margin (`fitToScreen`, measured by a ResizeObserver from a layout effect, so the first paint is right); it fills the width or the height, whichever binds. The screen records `data-fit` and `data-fit-scale`.
  - `dimmed` (0–1) is a black veil over the screen only. `offline` turns the screen off: the board is `visibility: hidden` and `aria-hidden` (nothing is showing, so nothing is reported), the standby LED lights amber, and a `role="status"` region on the screen carries `offlineLabel` ("No signal"); it is rendered empty while online, so the change announces.
  - Sizing is the container's: the set fills the width it is given and shrinks to a phone with no horizontal overflow (checked at 390px in both themes).
  - A11y: every piece of chrome is `aria-hidden`; the housing has no role or label; the board keeps its own `role="img"` and name.
- `DisplayPreview`: `tv?: TvFrameOptions` (`diagonalInches`, `aspect`, `dimmed`, `offline`, `stand`, `offlineLabel`), applied when `frame="tv"`, which is allowed for any model. `className` still goes to the board, not the set.
- Exports: `TvFrame`, `TvFrameProps`, `TvFrameOptions`, `TvAspect`. The geometry and fit helpers stay internal. Inventory entry and demo.
- Tests (`tv-frame.test.tsx`, 21; `display-preview.test.tsx` +2): the inputs' fallbacks and clamps, the geometry's monotonicity, `fitToScreen` on both axes and the margin, the chrome hidden and the board named, offline announced and hidden, defaults, the CSS variables, the measured fit through stubbed sizes, and the `DisplayPreview` wiring.
- Stories (`tv-frame.stories.tsx`, 9): split-flap 55" 16:9, LED 65", portrait 9:16, 32" beside 85", dimmed 0.6, offline, wall mount, and `DisplayPreview frame="tv"` for both FiestaPanel models. The a11y runner passes in both themes; the shots were looked at in both themes at desktop and phone width.
- Consumers: the FiestaBoard web viewer (`panel-view.tsx` / `panel-board.tsx`). The tvOS app draws its own frame and does not use this.
- **Frameless split-flap boards inside the TV** (owner feedback on the PR: "the Apple TV app doesn't show a frame, just flaps"; second commit). `bezel?: boolean` on `StaticBoardDisplay`, `BoardDisplay` (`ScaledBoardDisplay` passes it through and measures the grid) and `LedMatrixDisplay`: default `true` with the DOM byte-identical (held by `bezel.test.tsx`'s snapshots, recorded from the first commit); `false` draws only the tile grid — gutters, seams and tile materials intact, transparent — with no bezel, border, shadow, padding or surface, keeping `role="img"`, the name and `data-slot`, plus `data-bezel="false"`. `DisplayPreview` exposes `bezel` (default `true` outside a TV, `false` for a split-flap model inside `frame="tv"`; explicit wins), so the flaps fill the TV screen to its margin as the Apple TV app shows them. The LED board keeps its housing on the TV until the owner decides (spec §7.5, §17); the bare alternative is a TvFrame story. Tests (`bezel.test.tsx`, 13): the default snapshots, `bezel={false}` on every renderer, the flap cascade without a bezel, the `DisplayPreview` rules. Stories: StaticBoardDisplay "Frameless"; the TvFrame split-flap stories now bare; "FiestaPanel LED matrix, bare (open question)". This replaces the crop in FiestaBoard's `panel-board.tsx`.

**Steps:**

- [x] `TvFrame`, the `DisplayPreview` branch, exports, inventory; tests for each.
- [x] Stories, the a11y runner, screenshots looked at in both themes and at 390px.
- [x] `bezel={false}` for split-flap boards inside the TV (owner feedback), the LED open question recorded.
- [ ] Run the checks, then open and merge the PR.

**Downstream:** FiestaBoard's viewer wraps its preview in `DisplayPreview frame="tv"` with `tv` built from the panel's settings; its own bezel goes, and so does `panel-board.tsx`'s overflow-hidden crop of the housed board (the flaps are now the renderer's whole box, so the viewer's physical-size scale applies to the grid directly). The viewer decides the LED housing question with the owner.

---

### Task 10: Storybook showcase (new)

**PR title:** `docs(storybook): LED matrix showcase`

Stub: the owner scopes this. The intent: one showcase page that walks the shipped pieces end to end — every built-in and plugin model through `DisplayPreview`, the editor beside its preview (Task 8's story as a starting point), the character-set specimens and the transition picker — as the entry point for output-plugin authors and the FiestaBoard team.

---

### Task 11: Output-plugin device data as devDependencies (new; gated on FiestaBoard)

**PR title:** `test(board): render and validate output-plugin device data`

**Ready to start after Task 2.**

The Pixoo repo is already live and public: https://github.com/Fiestaboard/fiestaboard-output--divoom-pixoo. Commit `01e9ee21548012a007ef7aef78cdfe1a16cad678` carries the Task 2 data: `output/device-models.json` with the `appearance` block and no top-level `pixelShape` (sha256 `e7cbfff3…`), and a data-only `package.json`; its README cites `a70b719`. It is untagged.

FiestaBoard tags v0.1.0 only once the data validates against the schema released in Task 2. Pin by that commit SHA until the tag exists, then switch to the tag.

The Vestaboard and FiestaPanel repos follow FiestaBoard's Phase 4 extraction, and each is added the same way when its first tag exists.

**Files:**

- Modify: `package.json` devDependencies: `"@fiestaboard/output-divoom-pixoo": "github:Fiestaboard/fiestaboard-output--divoom-pixoo#01e9ee21548012a007ef7aef78cdfe1a16cad678"` (later `#v0.1.0`), and later `-vestaboard` and `-fiestapanel`
- Create:
  - `src/lib/output-plugin-data.test.ts`: validates each devDep's `output/device-models.json` (and `character-set.json`) against the **current** schemas
  - `src/components/board/output-plugin-devices.stories.tsx`: renders each plugin model through `DisplayPreview`

**Steps:**

- [ ] Add the devDependency and confirm `npm ci --no-audit` resolves the `github:` dependency in every CI job that installs it, without a token (the repos are public, and the runners have git).
- [ ] Contract test: a schema change in FiestaUI that would break a published plugin fails here, before release.
- [ ] Switch the Pixoo built-in to come from the plugin data where FiestaUI needs a model in stories or tests. The built-in `divoom_pixoo64` stays exported until the next major, marked `@deprecated`, pointing at the plugin.
- [ ] Run the checks, then open and merge the PR.

---

### Task 12: Coordinated `extendedMarkup` default flip (gated on FiestaBoard B1)

**PR title:** `feat(board)!: split-flap boards render extended markup by default`

**Blocked until** FiestaBoard's Python parser parity (B1) is merged and its release is scheduled. This flip changes what existing literal text such as `{red:HOT}` or `{icon:sun}` draws on a split-flap preview, so it is a deliberate **major**, released in the same window as FiestaBoard's parity release so that previews and boards never disagree.

**Files:**

- Modify:
  - `src/lib/board-characters.ts`: the `extendedMarkup` default for split-flap callers
  - `board-display.tsx`, `static-board-display.tsx`, `board-teaser.tsx`: the prop default becomes `true`, and the prop stays as an opt-out
  - parser tests
  - the spec (§4.2)

**Steps:**

- [ ] FiestaBoard confirms its scan with `src/markup_compat.py` (FiestaBoard #2128). The scan finds stored `{<colour>:`, `{<fg>/<bg>:` and `{icon:` text in users' data at upgrade time; none of FiestaBoard's own fixtures contain it today. The owner accepts the change.
- [ ] Legacy shortcuts: **decided** (FiestaBoard D16, spec "Decided: legacy shortcuts become icon aliases"). Make sure `resolveBoardIconName` resolves every legacy shortcut name (`sun`, `star`, `cloud`, `rain`, `snow`, `storm`, `fog`, `partly`, `check`, `x`; `heart` → ♥), with a test that iterates FiestaBoard's `SYMBOL_CHARS` list. The release notes call out that `{sun}` and its siblings now draw the icon's tile fallback on split-flap instead of ASCII. This lands together with FiestaBoard B4 (`feat/icon-shortcut-aliases`).
- [ ] Write a `BREAKING CHANGE:` footer naming the affected markup and the opt-out prop.
- [ ] Flip the defaults. Update every test that asserted literal rendering of the new markers to its opt-out form.
- [ ] Release in coordination: FiestaUI publishes the major, and FiestaBoard bumps it alongside its parity release.

## FiestaBoard work this plan unblocks (tracked here, executed there)

| After FiestaUI task | FiestaBoard work (output-plugins program)                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0                   | B1 flips its pinned "board disagrees with preview" tests 1–4.                                                                                                                                                                                             |
| 1                   | B1: Python parser parity. Fixtures are pinned to the Task 1 SHA, and test 5 flips.                                                                                                                                                                        |
| 2                   | Schema vendoring. `feat/output-plugin-kind` validates `device_models`. B3 does the rich-cell projection. The Pixoo repo moves `pixelShape` into `appearance` and tags v0.1.0. Layout goldens land.                                                        |
| 2 + 4               | B2: `src/led/` ports the layout, raster and seeded scramble flip against `led-golden.json`. It needs the layout goldens (Task 2) and transition goldens (Task 4), not the canvas (Task 3). The Pixoo plugin uploads sequences within its 32-frame budget. |
| 6                   | The editor adopts the package pickers, with `charset` threaded alongside `code62Glyph`.                                                                                                                                                                   |
| 7                   | The app adopts `DisplayPreview`.                                                                                                                                                                                                                          |
| 8                   | The editor adopts the package `TemplateEditor` with `deviceModel` threaded from the board; B5 `feat/template-extended-syntax` is the engine side (extended markup per output).                                                                            |
| 9                   | The web viewer (`panel-view.tsx` / `panel-board.tsx`) adopts `DisplayPreview frame="tv"` for FiestaPanel.                                                                                                                                                 |
| 12 (coordinated)    | Turn on `extendedMarkup` for split-flap previews in the **same** release window as Python parser parity.                                                                                                                                                  |

**Hardware spike (FiestaBoard, before the Pixoo plugin's transport is finalised).** About an hour with a real Pixoo 64 to confirm:

- the "Loading.." overlay: does it appear on single-frame pushes too?
- the push spacing;
- the ~300-push freeze, and whether `Draw/ResetHttpGifId` or a reboot clears it;
- the 32-frame ceiling.

The result decides the push-counter / reboot / animate-on-change mitigation recorded in the spec.

## Open decisions (owner)

The single list is the spec's §17. These are the ones that gate a task here:

- **Legacy `{sun}` vs `{icon:sun}`**: decided (D16). Shortcuts become registry aliases, with tile fallbacks, shipping in Task 12. The editor always writes `{{icon:sun}}` (Task 8).
- **Pixoo frames per change**: decided at 32. The hardware spike may argue for 16, which would change only the plugin's data, not this plan.
- **Page-level override of a degraded transition**: affects FiestaBoard's settings work, not a FiestaUI task.

## Out of scope

- Scrolling / marquee.
- The pixel-native layer (8×8 icon bitmaps, sparklines).
- A loading drum for LED.
- Brightness / gamma preview.
- A BDF font parser.
- Device transports. These belong to FiestaBoard output plugins.
