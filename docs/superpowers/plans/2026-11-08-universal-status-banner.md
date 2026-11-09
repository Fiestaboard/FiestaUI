# StatusBanner (universal slice 1.7a) Plan

**Goal:** a persistent page-level banner for hub, display and device state (page 08 C13, WEB-10, W7, WEB-16), with one action slot, unblocking web slice 2.3.

**Reference:** web Figma `ZQ8RMELCO6qEOFZUnQu36e`, Banner set `298:2280` (Layout=Desktop 964 / Layout=Mobile 358, 44 px mobile actions); No viewer from 02 `149:28542`.

**Architecture:** `StatusBanner` renders `Alert` (same border + 8% tint recipe) as a labelled `role="group"`. The live region (`role="alert"`/`"status"`) wraps only the title and description; actions sit outside it. `statusBannerKindMeta` maps kind → tone, Lucide glyph, default politeness. `StatusBannerAction` wraps `Button` (outline/ghost, `sm`) and switches to `h-control-touch` under `pointer-coarse:` or a `touch` banner. Layout: `auto` is a row from `sm` up, stacked below; `inline`/`stacked` pin it.

## Constraints

- No shipped copy; `title` is required. CANON lives at the call site ("Silence Schedule", "last connected").
- Status is never colour alone: border + tint + a distinct glyph per kind, and the title says it.
- `display-offline` takes Diagnostics, never "Try again" (no manual probe on the hub).
- Never render a `hub-unreachable` banner alongside a StatusScreen.
- Don't touch Button (slice 1.2 owns `size="touch"`).

## Steps

- [x] Tests (roles, live-region placement, politeness per kind, distinct glyphs, action slot, touch, layout) — red.
- [x] Component + export + inventory demo — green.
- [x] Stories: Default, AllKinds, MobileTouch; eyeball vs Figma at 1200 and 390.
- [x] Changeset (minor).

## Deferred

- `BoardLastSeen` wrapper (row 1.7a's second item) — follow-up slice; not needed by 2.3's banners.
