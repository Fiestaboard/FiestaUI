# InspectorTabs Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Parent supplies the independent exact-head review.

**Goal:** Add the C28 Core InspectorTabs family for host-selected desktop and phone Inspector content.

**Architecture:** Compose existing Tabs/TabsList/TabsTrigger/TabsContent (Base UI) with a data-driven tab list and caller-owned panels. Add a horizontal viewport, overflow fades and selected/focused-tab visibility. The host supplies the five desktop or six phone entries; Core has no platform or presentation skin prop.

**Tech Stack:** React 19, TypeScript, Base UI, Tailwind v4, Vitest, Storybook/Playwright.

**Spec:** Hub `program/briefs/IDE-1.11-RULINGS.md`, `program/shots/fiestaui-1.11/FIGMA-REFS.md`, MASTER-PLAN 1.11/C28. Live Figma `171:162947` (mobile scrolling), `184:159319` (web composition, inner tab list `184:162235`).

## Constraints and design decision

- Core appearance follows web list: 38px high, 3px padding, radius10, equal-width 32px triggers with 14/20 medium text and existing active shadow. Overflow preserves complete labels.
- Touch triggers are at least44px (50px list including padding); native iOS44px pill/Android underline remain kit skins.
- Reuse semantic tokens, shared focus ring and Badge for count state. No hardcoded default English copy. Require localized list name.
- `tabs: readonly {value:string; label:ReactNode; disabled?:boolean}[]`, `counts?: Record<string, number>`, controlled `value/onValueChange` or `defaultValue`, `size`, `disabled`, and `InspectorTabsContent` children.
- Jev `data_list_compound_panels`, p=1.0 (2026-11-17). Alternatives: all panel content inside data or fully compound list API. Reason: host owns complex panel lifecycle while Core owns a semantic data-driven list.
- No Figma writes, Docker, baseline approval, merge or release. Parent owns hub DD-W rows and final ui111a.md.

## Review focus

- A controlled selection or resized viewport keeps the selected tab visible without scrolling the document.
- Disabled first/last/all entries, removed selection and an empty list never leave an operable disabled tab.
- Counts changing width and long localized labels retain scrollability and correct accessible names.
- Keyboard navigation/Home/End discovers disabled tabs without activating them; panels are labelled by the matching tab.
- Focus/selected state remains legible inside the scroller in light/dark and RTL.

## Tasks

- [x] Add failing behavior tests for named five/six lists, panel relationships, controlled/uncontrolled selection, disabled navigation, counts and scroll geometry.
- [ ] Implement `src/components/containment/inspector-tabs.tsx` using existing primitives; verify targeted tests and >=90% lines/>=85% branches.
- [x] Add stories for desktop, six tabs, counts, touch, disabled, overflow end, controlled, focused and RTL; exercise geometry in real browser.
- [x] Add own export/inventory entries, local Code Connect mapping, parity refs and minor changeset.
- [ ] Run typecheck/lint/format/full unit+coverage/build/release tests; Storybook runner both themes and mobile screenshots on port6214 with one browser worker.
- [ ] Parent exact-head review, fix findings, merge origin/alpha before push, PR to alpha, wait/report CI/VRT. Check hub WRAPUP before each new step.

Ruling: Base UI intentionally keeps disabled tabs focusable (`focusableWhenDisabled: true`, empty `disabledIndices`) for discovery, while blocking activation. Preserve this established behavior; test aria-disabled and blocked Enter/click instead of native disabled. Removal fallback uses the first enabled tab. Counts include explicit separating whitespace for accessible names. DD-W95/97 cover derived Core states.

Validation ledger: target Vitest9/9, target ESLint, library build and Storybook build pass. Full coverage and duplicate typecheck processes stopped at coordinator request for shared-host load; root serializes remaining gates. Release checks498/499, only pre-existing parser timing1224ms against1000ms. No unrelated production code changed.

## Astra R1 fixes

- Reproduced count and resize scrolling defects with two failing tests (focused History right600 exceeded viewport300/250). Split layout/count updates from actual selection changes; focused tabs stay visible while controlled/uncontrolled selection changes still reveal their tab.
- Preserve the shared 4px focus ring with 1px transparent viewport bleed (`-m-px p-px`), contained by the visual bar's flow-root. The bar remains38px/default and50px/touch; fades/reveal use its bounds. Interior reveal reserves48px fade plus4px ring. Jev `one_pixel_viewport_bleed` p=.75.
- Added first/middle/last clipping and fade-clearance browser probes to Focused and FocusedDefault (both theme legs), plus scoped forced-colors important outline. Local browser execution remains unavailable; CI/coordinator must verify these probes before parity approval.
- Focused Vitest11/11 and inspector source coverage100% lines/branches; targeted ESLint and whole-project typecheck pass. Full suites remain coordinator-owned.
