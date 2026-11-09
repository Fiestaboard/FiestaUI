---
"@fiestaboard/ui": minor
---

Navigation and hub identity for the universal web shell, all additive with backward-compatible defaults:

- `Sidebar variant="bottom-nav"`: below the rail breakpoint the hamburger gives way to a five-slot tab bar pinned to the bottom. Up to five destinations fit as they are. Past five, or when there is an account menu to reach, the first four are tabs and the fifth is "More" (`labels.more`), which opens the drawer with the rest. More lights while the current route is one it holds, and wears a dot for any badge inside it or for `menuNotice`. The default, `variant="header-menu"`, is unchanged.
- `SidebarNavItem.badge` (`{ count?, label }`): a dot or a count (99+) over the row's icon, on the rail, in the drawer and on the tab bar. The required `label` joins the row's accessible name, so the badge is never colour alone.
- `railBreakpoint: "lg" | "md"` on `Sidebar` and `MainContent` (default `"lg"`): the rail, and MainContent's padding for it, can take over from 768px instead of 1024px. `MainContent bottomNav` pads the page clear of the tab bar.
- `BoardSelector` gains `host` and `status` (`"online" | "remote" | "unreachable"`), with words from `labels.hubStatus`. The sidebar shows a hub line ("fiestapi.local · Online") with a StatusDot. The collapsed rail shows a state glyph (wifi, globe or wifi-off) and moves the words to the tooltip. The mobile header becomes a two-line pill ("Online · fiestapi.local"). The trigger is described by the words, and a state without words draws no indicator.
