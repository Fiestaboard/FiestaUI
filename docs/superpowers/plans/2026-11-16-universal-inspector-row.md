# InspectorRow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add C34 InspectorRow, a single accessible action row inside an Inspector tab.

**Architecture:** Compose the existing ListRow with a native button, map detail to description and value to meta, and use the mapped Lucide ChevronRight. Keep ListRow's wrapping layout, 48px floor and focus ring; remove its horizontal inset and add the Figma bottom divider. No platform prop or native chrome.

**Tech Stack:** React 19, TypeScript 6, Base UI useRender through ListRow, Tailwind 4, Vitest, Storybook.

**Spec:** Hub `program/briefs/FIESTAUI-SLICE-BRIEF.md`, `program/briefs/IDE-1.11-RULINGS.md`, `program/shots/fiestaui-1.11/FIGMA-REFS.md` C34; live Figma `ZQ8RMELCO6qEOFZUnQu36e` / `171:163203`.

## Global Constraints

- One family PR into alpha, no main-checkout edits or Figma writes.
- API: title, detail?, value?, chevron?, onPress, native disabled and button attributes/ref. Noninteractive content only; native button type fixed to button.
- Figma: 48px minimum; py8, px0, gap12, title14/20 medium, detail12/16 normal, gap2, value14/20 normal, bottom border token, ChevronRight16 with normal Lucide stroke scaling.
- Derived states use existing kit tokens. Scoped forced-colors focus outline must override the unlayered shared focus rule.
- Focused checks use one worker. Root coordinates full suite, coverage, hosted axe/VRT and independent review.

## Review Focus

- Pointer/Enter/Space activate the same callback once, including inside a form without submission.
- Disabled rows cannot activate and are skipped by Tab.
- Optional content preserves numeric zero and hides omitted/false slots; chevron remains decorative.
- Long unbroken title/detail/value fit narrow containers and enlarged text through wrapping; browser story asserts geometry.
- Focus remains visible in light/dark and forced colors; browser story plus hosted review must verify.

## Ruling

Jev `natural_height`, p=0.99 (2026-11-16): preserve py8 and 48px minimum, allow the two-line row to grow to55px including border. The live Figma root is fixed48px despite38px text plus16px padding and1px border; metadata places text at y4.5. Reducing padding or fixing height would discard the spacing or enlarged-text requirement. Root owns the design-delta allocation. This is a declared parity difference, not a claim of pixel identity.

## Task 1: InspectorRow family

**Files:** create `src/components/editor/inspector-row{,.test,.stories}.tsx`; add export in `src/index.ts`; add inventory entry/demo only; add family parity ref, local Code Connect mapping, minor changeset.

**Interfaces:** `InspectorRowProps` derives native button attributes except title/children/onClick/type; required `title: React.ReactNode`, `onPress: React.MouseEventHandler<HTMLButtonElement>`; optional `detail/value: React.ReactNode`, `chevron: boolean` (default false), disabled inherited. Root is the ListRow native button with stable `data-inspector-row` marker; existing ListRow slots remain intact.

- [x] Write unit tests for full-row naming and once-only keyboard/pointer activation; disabled/Tab; form safety; optional/zero content and chevron; forwarded button ref/attributes.
- [x] Run `npx vitest run src/components/editor/inspector-row.test.tsx --maxWorkers=1` and record the expected missing-component failure.
- [x] Implement the ListRow composition with variant plain and size default, px0 bottom border, wrapped value max-width100%, forced-colors focus, active/press and disabled kit states.
- [x] Run the focused tests to green. Add inventory consumer test; all tests exercise real components.
- [x] Add Default, TitleOnly, NoChevron, Disabled, Focused, Pressed, LongText, LargeText and Mobile stories. Plays check rendered geometry, activation and keyboard focus; no local browser pass claim.
- [x] Add public export, inventory, pending parity ref, local-only Code Connect artifact and minor changeset.
- [ ] Run typecheck, lint, format, build and release checks sequentially; request root's serialized suite/coverage and hosted browser evidence.
- [ ] Normal merge origin/alpha, commit with required coauthor trailer, push and create a draft alpha PR with exact pending gates and required footer. Update family status; root owns global status/DD-W.

## Execution record

- RED: the initial missing import was followed by a null scaffold; all nine behavioral tests then failed because no action was rendered. The inventory registration test separately failed before its entry/demo existed.
- GREEN: eleven component tests and one inventory consumer test pass (12 total). The accessible-name test exposed concatenated inline text; explicit `aria-labelledby` slot IDs preserve word boundaries and caller labels.
- Typecheck and format pass. Lint found one unsorted export and passes after the targeted ordering fix.
- Full suite, coverage, hosted axe/VRT, forced-colors/browser geometry and exact-head review remain coordinator gates. No browser was launched locally.

## Review round 1 follow-up

- M1: C34 maps the chevron to foreground; ListRow's generic trailing slot is muted. Give the exact Lucide icon `text-foreground`, add a rendered-color assertion beside its Default story geometry checks, and add a foreground token probe in the parity manifest.
- C1: `.storybook/inspector-row-regression.ts`, wired additively into the runner, scopes forced-colors emulation to the Focused story. It checks keyboard focus-visible plus a solid 2px system Highlight outline with 2px offset, then restores media before axe. Corrected the story comment to identify the actual hook.
- Validation: 12 focused tests, typecheck, targeted lint/format, package build and Storybook build pass. The new browser assertions are written and built but remain pending hosted execution; no local browser was launched.
- Coordinator evidence at the preceding head `b88d245f`: 3,386 tests passed / 33 skipped, changed-source coverage 100% lines and branches for all four changed source files, release guards 499 passed. These full gates were not rerun for the color-only component fix.
