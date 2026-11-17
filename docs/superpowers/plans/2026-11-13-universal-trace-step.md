# TraceStep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Render one shared evaluation-trace row for Inspector Steps, including failed and skipped branches.

**Architecture:** A static Core row with semantic colors, exact Lucide Check/CircleAlert icons, and mono expression/value. Host owns trace data and list semantics. No engine, network or platform behavior.

**Tech Stack:** React, TypeScript, Tailwind v4, Vitest, Storybook.

**Spec:** Program `briefs/IDE-1.11-RULINGS.md` and `shots/fiestaui-1.11/FIGMA-REFS.md` C32, live Figma109:3066.

## Global Constraints

- State is ok/error/skipped; expression and value supplied by host; error value is its tag.
- Figma p6/8, gap8, radius6,14px icon,12/16 mono text,28px minimum row. Add16px logical-start indent per depth.
- No platform prop or native chrome. Use existing tokens and exact lucide icons named by Figma.
- No Figma writes, merge, publishing, PR comments or VRT approval. Separate alpha PR with minor changeset.
- Local checks and changed coverage90/85, light/dark/mobile stories, axe and live parity evidence.

## Review Focus

- Skipped state retains invisible icon space and exposes textual state to assistive tech.
- Error state shows supplied tag and circle-alert, never a successful result icon.
- Long expressions and values wrap without losing text at narrow widths or200% text.
- Invalid/negative depth normalizes to0; fractional depth floors. Deep indent is bounded tohalf the row to preserve content space.
- Caller ref and ordinary row attributes remain available; no invented interactive behavior.

## Task 1: TraceStep

**Files:** `src/components/editor/trace-step{,.test,.stories}.tsx`, additive index/inventory/parity manifest, local CodeConnect template, minor changeset.

**Interfaces:** `TraceStepProps` extends div props (except children), with required expression/value strings, state defaultok, depth default0 and localized status labels.

- [ ] Write tests for content, each status cue, depth normalization and ref/attributes; verify failure before implementation.
- [ ] Implement static row and verify focused tests/typecheck. Default expression/value geometry follows Figma; wrapping and deep-indent cap are recorded derivations.
- [ ] Add state/depth/long-text/light/dark/mobile stories, inventory, parity refs and localCodeConnect template.
- [ ] Run static/unit/build/release/coverage gates, serializing full suites because host is overloaded. Obtain browser/axe/parity from available execution surface.
- [ ] Commit/push normal merge from origin/alpha; independent exact-head Astra review and CI; record evidence without claiming blocked checks passed.
