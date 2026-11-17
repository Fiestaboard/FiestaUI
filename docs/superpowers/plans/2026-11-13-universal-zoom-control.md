# ZoomControl Implementation Plan

> Execute inline with superpowers:executing-plans. Root coordinates the independent final review.

**Goal:** Ship the C39 controlled ZoomControl with an explicit Fit overview and a configurable tile-size floor.

**Architecture:** Compose SegmentedControl and Button using existing semantic tokens and exact Lucide ZoomOut, ZoomIn and Map icons. The host owns zoom, read-only preview behavior and minimap visibility; this component emits user intent and never installs document-wide shortcuts.

**Tech stack:** React 19, TypeScript, Base UI, Tailwind 4, Vitest, Storybook/axe.

**Spec:** program/briefs/FIESTAUI-SLICE-BRIEF.md and IDE-1.11-RULINGS.md in the design hub; Figma working file ZQ8RMELCO6qEOFZUnQu36e, set 108:7620 and C39 card 246:46966, read live 2026-11-17.

## Constraints and decisions

- Core only: no platform property, native chrome or one-off visual primitives.
- Values fit/sm/md/lg; min sm/md/lg defaults sm. Below-floor incoming tile values display the floor without firing changes during render. Fit remains an explicitly selected, labelled read-only overview.
- Zoom out stops at min; zoom in from Fit returns to min. Fit is never reached by stepping.
- Controlled onValueChange and optional minimapOpen/onMinimapOpenChange. The visible map button is disabled without its callback.
- Keyboard shortcuts are local to focused controls: Meta/Ctrl minus/equals, Meta/Ctrl 0 to min, Shift 1 to Fit. Radio arrows/Home/End retain shared semantics. Host application shortcuts remain a host concern.
- Compact Figma geometry: card border/radius-lg/p-1/gap-1, 28px small radio pills, 32px icon buttons, 20px separator. Touch uses existing 44px size tokens; wrapping prevents mobile horizontal overflow.
- Dark/interaction/disabled/touch states are derived from existing primitives and require a design-delta entry from root.
- No significant implementation fork: the Figma component descriptions explicitly map to existing primitives.

## Review focus

- Raised floors must disable smaller options and constrain buttons and shortcuts.
- Fit must stay explicit, including when stepping at the floor.
- Changing controlled props must immediately update the view without local shadow state.
- Disabled controls and cancelled shortcuts must emit nothing.
- Mobile and long localized labels must fit their host without losing access to controls.

## Task 1 — Component and behavior

- [x] Write zoom-control.test.tsx for controlled updates, floor boundaries, Fit semantics, keyboard selection/shortcuts, disabled state, local labels and minimap toggling. Observe missing-component failure.
- [x] Implement zoom-control.tsx with the existing primitives. Run focused tests until green.
- [x] Add light/dark/mobile, all-values, raised-floor, disabled and localization stories, including browser geometry and interaction assertions.

## Task 2 — Public integration and verification

- [x] Add only own index export and inventory/demo entries; add a minor changeset.
- [ ] Run typecheck, lint, format:check, full tests with coverage, changed coverage gate, build, release:test and Storybook axe in both themes.
- [ ] Capture paired Figma/implementation evidence; record measurements, limitations and requested shared entries in program/status/ui111c-zoom-control-report.md.
- [ ] Check WRAPUP, merge origin/alpha, commit with required co-author, push normally and open a PR into alpha. Root owns review/CI polling; no merge, publishing, comments or VRT approval.

## Execution ledger

- Orientation: live Figma context/screenshot inspected; exact library primitives and Lucide icon matches confirmed. Initial npm ci failed at protected default cache; retry uses task-specific cache.
- Component: 10 focused tests passed after the expected missing-module failure. Typecheck, lint, formatting, library build and static Storybook build passed.
- Ruling: shortcuts are scoped to this control's native buttons, so the root handles bubbled keys without becoming an extra tab stop. The aria group lint exemption documents that boundary.
- Verification limitations: native Chromium launch is sandbox-blocked (MachPortRendezvousServer permission1100); Safari/CUA unavailable per root. CI will supply axe and implementation screenshots. The first full release guard run has three unrelated elapsed-time/animation failures under high shared-host load; full unit coverage and targeted reruns are still in progress.
