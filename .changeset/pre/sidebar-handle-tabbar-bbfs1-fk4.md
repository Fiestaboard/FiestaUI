---
"@fiestaboard/ui": patch
---

Sidebar: with `collapseHandle="hover"` (the default) the edge collapse handle now follows the same rule on the collapsed rail as on the expanded one, shown only on rail hover or keyboard focus, and it is hidden only on devices that can hover, so touch keeps it visible at rest. The phone tab bar floats 8 px above the safe area (was 12; `--bottom-nav-offset` is now 84 px) and its tabs are rounded 12 px, using the new `--radius-chrome-item` token.
