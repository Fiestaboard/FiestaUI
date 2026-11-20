---
"@fiestaboard/ui": patch
---

BoardDisplay: the first content a board paints lands at once instead of cascading from blank, after loading or after mounting empty. Opening a screen or switching display no longer replays the flap cascade; later content changes still animate.

Tabs: a tab trigger gets the W2 44px floor on a coarse pointer inside `.fui-coarse`, and the list grows with it.

Sidebar: the bottom tab bar renders at the end of `<body>` on the client, so it comes after the page in tab and reading order (skip link, header, main content, then the bar).
