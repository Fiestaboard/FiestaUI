# FiestaUI design-sync notes

Repo: `@fiestaboard/ui` (FiestaUI) — React on Base UI + Tailwind v4 tokens. Storybook shape.
Global name: `window.FiestaUI`. Build: `npm run build` → `dist/`. Converter entry: `--entry ./dist/index.js`, `--node-modules ./node_modules`.

## General learnings (config-level, apply to the whole DS)

- **[GENERAL] Dark theme is the default, applied by a `.dark` class on `<html>` — no ThemeProvider exists.**
  `.storybook/preview.tsx` defaults every story to `theme: "dark"` and toggles the `dark` class on `document.documentElement`; tokens are class-gated via `@custom-variant dark (&:is(.dark *))` (`:root` = light, `.dark` = dark). The converter could NOT bundle that decorator (its `storybook.css` import pulls in `.woff2` fonts the decorator esbuild build has no loader for → `! preview decorator bundle failed`). Fix: `cfg.provider = {component: "FiestaPreviewRoot"}` + `cfg.extraEntries: ["./.design-sync/preview-root.tsx"]` — an owned wrapper (`.design-sync/preview-root.tsx`) that adds `.dark` to `<html>` and paints `bg-background text-foreground p-8`. Without it every preview renders in the light default while the reference renders dark. Verified: Button/Dialog/Heading render dark, matching the reference.

- **[GENERAL] CSS ships via `[CSS_FROM_STORYBOOK]` scrape.** No `dist` CSS sidecar for components (Tailwind v4 utilities are compiled by the storybook build). The converter scrapes `.design-sync/sb-reference/assets/iframe-*.css` (one minified file, ~100KB, contains everything incl. `sidebar-gradient` `repeating-linear-gradient`). `grep -c` on the bundle CSS misleads (minified = 1 line); use `grep -o`.

- **[GENERAL] Fonts:** 11 `@font-face` (Geist / Geist Mono, `@fontsource-variable`) → `fonts/`. Resolved cleanly, no `[FONT_MISSING]`. The `[CSS_ASSETS]` warning (11 relative `url()` refs) is benign — fonts are copied separately and rewritten to `fonts/`.

- **[GENERAL] `layout:"centered"` stories render full-width (framing-only, not a defect).** Storybook applies `parameters:{layout:"centered"}` as a shrink-to-content centered wrapper; the generated preview renders the component block-level in the `p-8` FiestaPreviewRoot, so width-less stories (e.g. Grid/Stack "Playground") stretch full-width. Only stories with NO intrinsic width diverge — every sibling with an explicit width matches exactly. Graded `match` per the §4 rubric (judge the component, not framing). Do NOT author owned-preview workarounds for this (they'd shadow a future converter fix). Non-blocking.

## Excluded (titleMap null)

Demo/composite/doc stories with no component export — excluded via `cfg.titleMap` `{name: null}`:
`Chrome/AppShell`, `Design System/Inventory`, `Design System/Variant Matrix`, `Seasons/Overview`.

## Presentation overrides (cardMode)

- 6 portal/overlay → `cardMode: "single"` (+ primaryStory): Sidebar(Default), AlertDialog(Open), Dialog(Open), DropdownMenu(Open), Sheet(Open), Tooltip(InitiallyOpen).
- ~26 wide → `cardMode: "column"` (see config).

## Component-specific

- **Sidebar (and fullscreen fixed chrome generally): compare oracle UNAVAILABLE.**
  Sidebar stories are `layout: "fullscreen"` with the desktop rail `position: fixed` (`sidebar.tsx:388` `hidden lg:fixed lg:top-3 lg:bottom-3`). The reference storybook renders it fine (56KB DOM, full nav) BUT `#storybook-root` has ~0 measurable height (all content is fixed) → compare reports `sb-error` "no storybook root content" on the storybook side for ALL stories. This is a compare-harness limitation, not a render failure.
  - **Product-card crush fix (owned preview):** the single-mode card wraps stories in `.ds-single{transform:translateZ(0)}` (the containing block for fixed descendants). Because `.ds-single` is only as tall as its in-flow content (~64px), `lg:top-3 lg:bottom-3` collapse the rail to a ~40px sliver. Owned `.design-sync/previews/Sidebar.tsx` wraps each story in a `minHeight:100vh` box so `.ds-single` is full height and the rail renders correctly. Verified via manual screenshot (full sidebar renders).
  - **Gradient:** `sidebar-gradient` is an animated `repeating-linear-gradient`; a `@media (prefers-reduced-motion)` rule flattens it to `#0e0b18` (near-black). Under stabilized capture (reduced-motion forced) BOTH reference and preview flatten identically — not a mismatch. Un-stabilized manual probes can catch different animation frames and mislead.
  - **Grading:** compare can't pair (reference `sb-error`), so its 9 stories are **skipped via `cfg.overrides.Sidebar.skip`** (all `chrome-sidebar--*` ids) — this empties its `visibleStoryIds`, so compare excludes it entirely (no `sb-error` hard-failure → driver `ok:true`). The single-mode card STILL renders (its `E` exports come from `_preview/Sidebar.js` / the owned preview, not from `visibleStoryIds`), so `primaryStory: Default` renders the full rail. **Verified MANUALLY** by side-by-side screenshot at 1280×800: preview == reference (warm `sidebar-gradient`, logo, board selector, all nav, Help/Settings/toggle). Re-verify by screenshot on any sidebar source change — carried grades don't cover it.
  - Other fullscreen chrome (MainContent) and WebGL (Aurora, SidebarAurora*) did NOT sb-error — they render in-root and graded normally via compare. Only Sidebar (fully fixed rail) needed this treatment.

## Re-sync risks (watch-list for the next run)

- `preview-root.tsx` (the theme wrapper) is owned + committed. If `.storybook/preview.tsx`'s theme/season contract changes, revisit it.
- Owned `Sidebar.tsx` preview is tied to the story module's shape; if sidebar stories are restructured, re-verify the full-height wrapper still works.
- Sidebar & fullscreen chrome are verified MANUALLY (compare `sb-error`) — re-verify by screenshot on any DS source change, don't trust carried grades blindly.
- Button `[STORY_CAP]`: 19 stories, only 6 graded (the key variants); tail 13 verified-by-upload.
