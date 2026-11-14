# Onboarding and PWA, part (a): InstallCard, InstallSteps, PrivacyNote (universal slice 1.10a) Plan

**Goal:** the presentational pieces of the honest install flow (08 W6, WEB-12) and the shared privacy statement (08 P4), so web slice 2.8 (PWA honesty) and 2.12 (setup parity) compose them instead of hand-rolling cards. Part (b) (ConnectPhoneCard, HubDiscoveryRow, RecoverySteps) is a separate PR.

**Reference** (Figma `ZQ8RMELCO6qEOFZUnQu36e`, read only):

- 07 `58:33496` Chrome install card `58:34360`: card surface (bg card, border, Elevation/card, radius 14), p 16, gap 10; header row IconTile sm (muted, Lucide download) + Heading/base, gap 12; body Text/sm muted; actions gap 8: secondary "Install" with a download icon, ghost "Not now", both 44 high.
- 07 `58:34465` Safari Add to Home Screen sheet `58:35303`: Web / Bottom sheet (1.3's `Sheet side="bottom" grabber`), intro Text/sm muted, three step rows (bg muted, radius 12, p 12, gap 12: a 28 px foreground disc with a 14 semibold number in background ink, Text/sm/medium step copy, a 20 px trailing Lucide glyph), then "Got it" (secondary) and "Don't show again" (ghost), 44 high. Step gap 12.
- 07 notes `58:34443` / `58:35364`: ask after a success, never on load; "Not now" snoozes; on http there is no service worker, so the card says so and draws **no fake button**; iOS shows the sheet at the same success moment and from More › Install on this phone.
- 05 `36:6336` Setup / Privacy note: bg card, 1 px border, radius 14, p 16, gap 12; 20 px Lucide shield-check in hue green; title Text/base/semibold (16/24), body Text/sm muted, gap 4. No elevation.
- 08 W6 `65:36351`, P4 `61:43307`.

**Architecture** (new folder `src/components/onboarding/`, inventory section "Onboarding"):

- `InstallCard`: a labelled `<section>` on `cardSurfaceClassName`; `IconTile size="sm"` + `Heading size="base"`; body is `children`; `state: "available" | "installing" | "needs-https"`. `installing` is Button `loading` (keeps focus, `aria-busy`). `needs-https` renders no Install button at all (the 07 rule) and the host passes the "needs a secure address" copy. `onDismiss` renders "Not now". Labels overridable. Trigger timing and snooze are the WEB-12 trigger logic and stay in web 2.8.
- `InstallSteps`: an `<ol role="list">` of muted rows; `steps: { text, icon? }[]`. The number disc is `aria-hidden` (position is announced by the list). It is the sheet's body; the sheet itself is `Sheet side="bottom" grabber` from 1.3, shown in the `InSheet` story.
- `PrivacyNote`: static prose like `Note` (no role, no live region), on the card ground with a border and no elevation; `title` + `children`; the shield-check glyph is fixed and `aria-hidden`.
- Ships no copy: titles and bodies are the consumer's (same rule as StatusBanner). Button labels have English defaults (`DEFAULT_INSTALL_CARD_LABELS`).

## Constraints

- OWNER RULE: no glass, no platform prop, no browser chrome; Safari's steps are content the host passes, not a `platform="ios"` mode.
- Buttons are 44 px through `h-11` with `TODO(#385)` → `size="touch"` (same stand-in as #389 / #392); slice 1.2 owns Button.
- Radius 12 on the step rows is not on the radius ladder; snap to `rounded-xl` (card role, 14) and record it (DD-W19).
- The http (`needs-https`) state has no Figma frame, only the 07 note; record it (DD-W19) and ask the designers for a frame.

## Steps

- [x] Tests (red): section naming, heading level, states (button present/absent, loading, aria-busy, focus kept), dismiss, labels; list semantics, rows, hidden numbers, icons hidden; privacy note has no role, glyph hidden, title/body.
- [x] Components + `src/index.ts` export + inventory entries and demos (+ mount test) — green.
- [x] Stories: InstallCard Default / Installing / NeedsHttps / WithoutDismiss / LongTitle; InstallSteps Default / InSheet / WithoutIcons; PrivacyNote Default / InSetup. Eyeball at 390 and desktop, light and dark, against the refs.
- [x] Changed-file coverage gate, axe in both themes, `release:test`.
- [x] Changeset (minor).
