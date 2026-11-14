---
"@fiestaboard/ui": minor
---

Add `StatusBanner`, a persistent page-level status banner built on `Alert` with an `action` slot. Kinds: `paused`, `silenced`, `silence-soon`, `display-offline`, `hub-unreachable`, `device-offline`, `out-of-sync`, `no-viewer`, `init-error` and `https`. Each kind picks a tone, a distinct glyph and a default announcement urgency (`politeness` overrides it, `off` renders no live region). The live region wraps only the title and description, so actions are never read as part of the announcement. `StatusBannerAction` is a 32 px outline or ghost button that grows to 44 px (`--control-h-touch`) on a coarse pointer or inside a `touch` banner. The component ships no copy: consumers pass `title` and `description`.
