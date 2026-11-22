---
"@fiestaboard/ui": minor
---

Sidebar shell fidelity (bug bash F, BB-FS-1..5, -10):

- The edge collapse handle is the 07a 16×28 tab with 8px corners, 2px proud of the rail (was a 28px circle hanging 14px off it), with a solid hover fill. New `collapseHandle="hover" | "always"`, default `"hover"` (owner ruling): hidden at rest on the expanded rail, shown while the pointer is on the rail, on keyboard focus, on touch devices (no hover: always visible) and on the collapsed rail. `"always"` keeps it at rest.
- `SidebarNavItem.nested` indents a row 16px inside the one above it (expanded rail and drawer; flush on the collapsed rail), and `separatorBefore` draws the primary/secondary hairline before a row.
- One focus treatment across the shell: rail and drawer rows, the collapse handle, the board selector and SkipToContent all use the two-tone `focus-ring` (visible on a lit row in dark, where the browser outline was orange on orange).
- `variant="bottom-nav"`: with More open, More is the only lit tab (the route's tab keeps `aria-current`), and the scrim is `--overlay` above the header, under the bar and drawer. New z tokens `--z-bottom-nav-backdrop` (102) and `--z-bottom-nav` (105).
- SidebarAccountTrigger holds its chevrons at the trigger's trailing edge.
