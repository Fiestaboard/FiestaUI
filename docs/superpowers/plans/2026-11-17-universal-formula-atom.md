# FormulaAtom implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Parent supplies independent review.

**Goal:** Build the C31 compact source/value atom for the formula inspector and desktop/tablet editor.

**Architecture:** Compose the existing noninteractive Badge with exact Lucide Sigma, Braces and CircleAlert icons. C7 is currently Chip touch geometry plus Badge-based TipTap node views; there is no exported EditorAtom. This additive component preserves those existing editor consumers. Source and formatted value/error tag arrive from the consumer, with no evaluation or fetching.

**Tech stack:** React 19, TypeScript 6, Tailwind 4 semantic tokens, Vitest/Testing Library, Storybook.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/IDE-1.11-RULINGS.md`; C31 in `program/shots/fiestaui-1.11/FIGMA-REFS.md`; live read-only Figma `ZQ8RMELCO6qEOFZUnQu36e` / `109:3016`.

## Constraints and design calls

- `kind: formula | variable`; `state: ok | error | fallback`; required `source` and formatted `value`. No platform, interaction or evaluation props.
- Error value is the actual hub error tag (`#REF`, `#VALUE`, `#DIV/0`, `#NAME?`, `#NUM`, `#SYNTAX:n`, `???`), per ruling; the drawing's `= 72` is stale. Preserve arbitrary caller text without parsing the hub's error grammar.
- Badge supplies the reusable content primitive and formula/variable palette. Live context uses 15% tag fills (the prose digest says 20%). Source uses tag ink; error uses destructive tint/border/ink, and destructive value pill.
- Geometry: outer gap 6, padding 2/3/2/6, radius 4; 12px icon; 12/16 regular mono source; value pill padding 1/6, radius 3, medium mono. Error border adds 2px to dimensions.
- Long source caps at 116px (sample width), long value caps at half the containing atom; both ellipsize without discarding the full DOM string or title. Small containers shrink both text slots and preserve the icon. Document this undrawn case to the parent for DD-W.
- Fallback adds localized screen-reader status; error tag and CircleAlert give non-color cues. No live region per atom, no tab stop.
- Dark mode derives from existing semantic tokens; no local browsers/CUA. Parent arranges hosted axe/parity/VRT and serialized full tests/coverage.
- No Figma writes; local parserless Code Connect only. Normal merge origin/alpha before push, draft PR into alpha, no merge/publish/approval/comments.

## Review focus

- Long unbroken source/value stays inside narrow containers; full content remains in DOM.
- Error tags remain visible and never become stale successful results in stories.
- Fallback status has non-color accessible text with localization.
- Root remains inline noninteractive content usable inside a paragraph; no surprise focus stop or live region.
- Shared Badge/TipTap behavior and other inventory entries remain unchanged.

## Task 1: FormulaAtom and focused tests

Files: `src/components/editor/formula-atom.tsx`, `formula-atom.test.tsx`.

- [x] Write failing tests for the missing component; cover both kinds/all states, full long content, actual error tags, localized fallback status, noninteractive inline semantics, forwarded ref/attributes.
- [x] Run focused Vitest with `--maxWorkers=1`, record red.
- [x] Implement the Badge composition using tokens and exact icons.
- [x] Run focused tests and record green.

## Task 2: stories and integration

Files: `formula-atom.stories.tsx`, additive `src/index.ts`, `src/stories/component-inventory.ts`, `component-inventory-demos.tsx`, `vrt/figma-refs.json`, local `figma/FormulaAtom.figma.ts`, `.changeset/formula-atom-value-hints.md`.

- [x] Add six canonical stories, all-state and narrow/long fixtures. Shared play assertions check loaded-font geometry, 12px icon, 18px value pill, 22/24px atom, containment and truncation.
- [x] Add inventory/export and local Code Connect mapping for Source/Value/Kind/State, preserving caller ownership of errors.
- [x] Add pending parity refs for all six canonical variants. Store Figma reference evidence; mark implementation images pending hosted capture.
- [x] Format changed files; typecheck, lint, format:check, build and focused release guards pass. Full test/coverage/release suites are parent-serialized.
- [ ] Parent independent review, normal origin/alpha merge, commit and push; open draft PR and report exact head/checks/pending gates.

## Execution ledger

- Setup: clean worktree at `208499e4`; no existing PR; Node `26.13.1`; npm ci complete (dependency deprecation warnings only). Live Figma context and screenshot fetched read-only.
- Implementation chosen by source inspection: Badge is the reusable base; Chip is operable and inappropriate for this content-only atom. No substantial unresolved fork needed Jev.

- TDD: missing import observed first; null implementation then produced 18/18 behavior failures. Badge implementation passed 18/18. Final focused FormulaAtom + Badge: 30/30. Targeted inventory cases: 4 pass, 313 skipped by name filter.
- Static validation: typecheck, lint, format:check and build pass. First lint found one import-order error; fixed with ESLint. Build reports existing token gamut clipping.
- All six parity story IDs verified using Storybook toId/storyNameFromExport. Hosted geometry/axe, implementation screenshots, coverage and full release guards remain pending.
