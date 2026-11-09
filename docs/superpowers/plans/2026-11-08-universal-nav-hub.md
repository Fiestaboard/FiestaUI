# Universal slices 1.4a, 1.4b, 1.4c: bottom nav, rail breakpoint, hub identity

**Program:** FiestaBoard universal redesign, MASTER-PLAN §4.4, rows 1.4a–1.4c. These slices unblock web slices 2.1 (IA and nav) and 2.3 (status banners and the BoardSelector host line).
**Branch:** `feat/universal-14-nav-hub` from `origin/alpha` (`900fabf6`, 8.17.0-alpha.0).
**Design:** web Figma `ZQ8RMELCO6qEOFZUnQu36e`.

- Bottom nav `53:100587`, as placed in 07 Home `57:63379`.
- Nav badge `302:2340`.
- Display switcher `302:2146` and its focus variants (07a S1/S6).
- 900px rail `61:17544`.
- 1440 Home `53:143037`.

## Scope

| Slice | API                                                                                                                | Default (unchanged behaviour)                        |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 1.4a  | `Sidebar variant="bottom-nav"`, `labels.more`, `SidebarNavItem.badge = { count?, label }`, `MainContent bottomNav` | `variant="header-menu"`, no badge, no bottom padding |
| 1.4b  | `railBreakpoint: "lg" \| "md"` on `Sidebar` and `MainContent`                                                      | `"lg"`                                               |
| 1.4c  | `BoardSelector host`, `status: "online" \| "remote" \| "unreachable"`, `labels.hubStatus`                          | no hub line; DOM identical to 8.16                   |

## Decisions

- **Five slots, More from data.** The bar shows `items` in the app's order. If there are more than five items, or there is an account menu (`renderSettingsMenu`) to reach, the first four become tabs and slot five is More. More opens the existing drawer, anchored above the bar, which holds the remaining items and the footer. The Figma order (Home · Pages · Schedule · Displays · More) is therefore the app's data, not a component rule.
- **More's state.**
  - It is lit while the drawer is open or the current route is among its rows.
  - It shows a dot for any badge among those rows, and for `menuNotice`, because the hamburger no longer exists in this variant.
  - Its badge words join its name: "More, Needs attention".
- **The badge is never colour alone.** `label` is required. Expanded rows append it as sr-only text (", Needs attention"). Collapsed rows fold it into the aria-label ("Integrations, Needs attention"). The visual badge is `aria-hidden`. Colours follow 07a: `--destructive` fill with a `--card` ring. The count caps at 99+.
- **The hub state is never colour alone.**
  - The state is words from `labels.hubStatus`. A state with no words draws no dot or glyph.
  - On the collapsed rail, the glyph's shape differs per state (wifi, globe, wifi-off), and the words move to the tooltip.
  - The trigger is `aria-describedby` an sr-only copy of the line. The visible lines are `aria-hidden`, so browse mode does not read them twice.
  - Order follows 07a: the sidebar reads "host · State"; the mobile pill reads "State · host", because the host truncates.
- **Mobile header in bottom-nav.** It has no hamburger, and the wordmark hides below 480px (07 Home at 390 shows the mark alone), so the 187px hub pill and the assistant share one row.
- **Breakpoint classes are spelled out per breakpoint** (`RAIL_CHROME`, `RAIL_LAYOUT`), because Tailwind compiles only literal class names. The `lg` strings carry the same classes as before.
- **The collapsed state at md is the app's choice.** 07 `61:17544` shows the rail collapsed at 900px, but `collapsed` stays a prop; nothing is forced.
- **Tab bar layer:** `--z-mobile-menu`, so More stays tappable over the backdrop and can close what it opened. The bar's footprint is `--bottom-nav-offset` (88px fallback) plus `env(safe-area-inset-bottom)`; slice 1.3's Toaster offset can read the same variable.

## Tests (written first)

- `board-selector.test.tsx` "hub line": order per layout, dot mapping, glyph on the rail, tooltip, the no-words rule, and describedby combined with `boardError`.
- `sidebar.test.tsx`:
  - "nav badge": dot, count, 99+, collapsed name, drawer.
  - "bottom nav": slots, More, aria-expanded/controls, focus return, lit and badged More, label fallback, ≥44px targets, wordmark.
  - "rail breakpoint".
  - Backfill (the focus trap, external rows, logo, transition end, resize) to raise the whole file above the changed-file bar.
- New `main-content.test.tsx`: padding per breakpoint, the bottom-nav padding, auth screens, and the FLIP slide under a matchMedia stub.

## Stories and VRT

- New stories:
  - BoardSelector: `HubOnline`, `HubRemote`, `HubUnreachable`, `HubCollapsed`, `HubMobileHeader`, `HubStates`.
  - Sidebar: `BottomNav`, `BottomNavMoreActive`, `WithBadges`, `WithBadgesCollapsed`, `RailBreakpointMd`, `HubIdentity`, `HubIdentityBottomNav`.
  - MainContent: `BottomNav`, `RailBreakpointMd`.
- All of them are **Added** shots. Existing stories are expected unchanged, because every default path renders the same classes.
- Parity: two `pendingRef` entries in `vrt/figma-refs.json`:
  - `chrome-board-selector-hub-online` → `302:2055`;
  - `chrome-sidebar-bottom-nav-home` → `53:100392`.
