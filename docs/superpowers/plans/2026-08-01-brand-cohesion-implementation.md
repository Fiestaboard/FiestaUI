# Brand Cohesion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the actions from `docs/brand-cohesion-review.md` and remove components with zero downstream usage in FiestaBoard.

**Architecture:** All changes stay inside FiestaUI (tokens in `src/styles/theme.css`, class strings in components, Storybook config). Downstream usage was verified against a fresh clone of `Fiestaboard/FiestaBoard` (`web/src`): every import of `@fiestaboard/ui` was extracted and each export checked. Removals are breaking (next release must be a **major**).

**Tech Stack:** React 19, Base UI, Tailwind v4 tokens, cva, Storybook 10.

## Global Constraints

- Visual-parity rule (README): token values and class strings are contract. Intentional visual changes here → major version, called out in the PR.
- Downstream-verified usage facts (do not re-litigate):
  - USED by app: `Aurora`, `DecryptedText`, `FadeContent`, `MainContent`, `Sidebar`, `BoardSelector`, `FiestaLogo`, `LanguageSelector`, `ThemeToggle`, `SkipToContent`, all form/overlay primitives except Checkbox, seasons API (`getActiveSeason`, `useActiveSeason`, `shouldShowPride`, `usePrideActive`, `SEASONS`, `HIDE_FESTIVE_COOKIE`, `readCookieString`, `fireSeasonBurst`).
  - UNUSED by app (remove): `Checkbox`, `BlurText`, `CountUp`, `SpotlightCard`, `PageHeader`, `PageLayout`, `PageToolbar`, `PRIDE_COLORS`, `firePrideBurst`. App also never uses `--icon-g*`, `.page-title`, `.page-description`.
  - `BoardIcon` is used internally by `BoardSelector`; `FIESTA_ICON_DATA_URI` internally by `Sidebar`; `SidebarAurora`/`SidebarAuroraHorizontal` internally by `Sidebar` — all stay.
- Unified focus recipe (the "modern" one already on button/badge/switch): `outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`.
- Canonical fiesta gradient (light): `#c97a72 / #c99662 / #9b7bb0`; dark sidebar deep set: `#7a2a24 / #6d5014 / #4e3070` (defined once, shared by vertical + horizontal).
- Season `colors[]` must match that season's CSS palette (CSS design intent is canonical).

### Task 1: Remove downstream-unused components and dead tokens

**Files:**
- Delete: `src/components/ui/checkbox.tsx` + `.stories.tsx`, `src/components/ui/react-bits/blur-text.tsx` + `.stories.tsx`, `count-up.tsx` + `.stories.tsx`, `spotlight-card.tsx` + `.stories.tsx`, `src/components/chrome/page-header.tsx` + `.stories.tsx`, `page-layout.tsx` + `.stories.tsx`, `page-toolbar.tsx` + `.stories.tsx`
- Modify: `src/index.ts` (drop those exports), `src/lib/seasons.tsx` (drop `PRIDE_COLORS`, `firePrideBurst`), `src/styles/theme.css` (drop `--icon-g1..6` in `:root`, the `.pride-month { --icon-g* }` block, `.page-title`, `.page-description`), all 7 `src/styles/seasons/*.css` (drop `--icon-g*` blocks), `src/components/chrome/app-shell.stories.tsx` (rework if it uses the Page* trio — inspect first)

**Steps:**
- [ ] Delete the files; strip `src/index.ts` exports; strip seasons shims
- [ ] Remove `--icon-g*`/`.page-title`/`.page-description` from theme.css and all season CSS
- [ ] Fix `app-shell.stories.tsx` (replace Page* usage with plain markup or delete the story if it is Page*-centric)
- [ ] `npm run typecheck` → PASS; commit `feat!: remove downstream-unused components (Checkbox, BlurText, CountUp, SpotlightCard, PageHeader/Layout/Toolbar)`

### Task 2: Single-source the fiesta gradient (A1) and pride palette (A2)

**Files:**
- Modify: `src/styles/theme.css`, `src/components/chrome/sidebar-aurora.tsx`, `sidebar-aurora-horizontal.tsx`

**Steps:**
- [ ] theme.css: `.sidebar-gradient` light block sets `--sidebar-fiesta-red: var(--fiesta-red)` etc.; `.sidebar-gradient-horizontal` light uses the same vars (drops the warmer `#c98a82/#c9a070` fork — intentional unification); dark deep set defined once in a combined rule `.dark .sidebar-gradient, .dark .sidebar-gradient-horizontal { --sidebar-fiesta-red: #7a2a24; --sidebar-fiesta-orange: #6d5014; --sidebar-fiesta-purple: #4e3070; }` (other dark props remain per-variant as today)
- [ ] Aurora components: delete local `DEFAULT_COLORS`, `import { PRIDE_SEASON } from "../../lib/seasons"` and default `colors = PRIDE_SEASON.colors`
- [ ] `npm run typecheck` → PASS; commit `refactor: single-source fiesta gradient + pride palette`

### Task 3: Reconcile season colors[] with season CSS (A3) + June note (E4)

**Files:**
- Modify: `src/lib/seasons.tsx` (each draft's `colors`), `src/styles/seasons/halloween.css` (align logo purples to one purple ramp)

**Steps:**
- [ ] Read each season CSS, set `colors[]` to that file's palette (6 stops, logo-gradient order). Halloween: `["#ff7518", "#ff9838", "#39d353", "#a855f7", "#7c3aed", "#6a0dad"]`; Easter: `["#e8879e", "#d9a520", "#5cbf8a", "#6fb3e0", "#a98ed9", "#e8879e"]`; Mother's Day: garden-rose set from `mothers-day.css` (`#b03060`, `#d1608a`, `#e79ab0`, `#d8b98a` + derived); others read-and-match
- [ ] Add comment on `fathers-day.months: [5]` documenting the June collision with pride and first-match-wins precedence
- [ ] Commit `fix: season aurora/confetti palettes now match their CSS design intent`

### Task 4: Unify focus rings (B1) + off-token colors (B2)

**Files:**
- Modify: `input.tsx`, `textarea.tsx`, `select.tsx` (trigger, also `h-10`→`h-9`), `tabs.tsx` (trigger + content), `scroll-area.tsx` (viewport), `dialog.tsx` (close), `sheet.tsx` (close), `slider.tsx` (thumb: `bg-white`→`bg-background`, ring-4→ring-[3px]), `badge.tsx` (formula→tokens), `label.tsx` (opacity-70→50), `alert-dialog.tsx` + `dialog.tsx` shadow-lg→shadow-modal, `dropdown-menu.tsx` sub-content shadow-lg→shadow-md, `chrome/sidebar.tsx` (gray-* toggle → tokens; inline X svg → lucide `X`), `theme.css` (add `--tag-formula` light/dark + `@theme` lines)
- New tokens: `:root` `--tag-formula: oklch(0.45 0.15 80); --tag-formula-foreground: oklch(0.35 0.1 80);` `.dark` `--tag-formula: oklch(0.65 0.15 80); --tag-formula-foreground: oklch(0.85 0.08 80);`

**Steps:**
- [ ] Apply the unified recipe everywhere listed; `focus:` → `focus-visible:`; add `disabled:opacity-50` to dialog/sheet close
- [ ] Badge formula: `bg-tag-formula/15 border-tag-formula/30 text-tag-formula-foreground font-mono [a&]:hover:bg-tag-formula/25`
- [ ] Sidebar toggle: `border-border bg-background text-muted-foreground shadow-md hover:bg-accent hover:text-foreground transition-colors`
- [ ] `npm run lint && npm run typecheck` → PASS; commit `fix: unified focus rings, tokenized stragglers, aligned control heights`

### Task 5: Variant vocabulary (D) + title typography

**Files:**
- Modify: `alert.tsx` (add `info`/`success`/`warning` variants mirroring destructive: `border-info text-info [&>svg]:text-info` etc.; AlertTitle `font-medium`→`font-semibold`), `badge.tsx` (add `brand: "border-transparent bg-brand text-brand-foreground [a&]:hover:bg-brand/90"`), `alert-dialog.tsx` (title += `leading-none tracking-tight`), stories for new variants

**Steps:**
- [ ] Implement variants + story entries; `npm run typecheck`; commit `feat: brand badge, status alerts, consistent title typography`

### Task 6: Season CSS structural normalization (E2) + pride file convention (E3) + exports (E5)

**Files:**
- Modify: `halloween.css`, `thanksgiving.css`, `christmas.css`, `new-year.css` → combined dark selector incl. `--foreground`/`--muted-foreground` (easter template)
- Create: `src/styles/seasons/pride.css` (move `.pride-month` logo gradient + `.dark.pride-month` sidebar rules from theme.css; class name `pride-month` unchanged — app contract)
- Modify: `theme.css` (import pride.css, remove moved blocks, add comment that `--brand` is deliberately season-invariant), `package.json` (exports `"./seasons/*.css": "./dist/seasons/*.css"`)

**Steps:**
- [ ] Normalize the 4 files; create pride.css; wire import; add exports entry
- [ ] `npm run build` → dist/seasons contains pride.css; commit `refactor: normalize season CSS structure; pride follows the per-file convention`

### Task 7: Consolidate sidebar auroras (C2) + react-bits cn (C1)

**Files:**
- Create: `src/components/chrome/aurora-canvas.ts` — exports `SNOISE_GLSL` (shared permute/snoise), `hexToRgb`, and `useAuroraCanvas(canvasRef, fragSource, colors)` containing the WebGL bootstrap/resize/RAF effect verbatim from today's components
- Modify: `sidebar-aurora.tsx`, `sidebar-aurora-horizontal.tsx` → keep only their FRAG main() (built as `FRAG_PREFIX + SNOISE_GLSL + MAIN`) and the JSX wrapper; public exports unchanged
- Modify: `react-bits/decrypted-text.tsx` line 151 → `cn("inline-block", parentClassName)` (import cn)

**Steps:**
- [ ] Extract, rebuild both components on the shared hook, verify no behavior change by reading the diff
- [ ] `npm run typecheck && npm run build` → PASS; commit `refactor: shared WebGL core for sidebar auroras; cn in DecryptedText`

### Task 8: Storybook brand showcase (F)

**Files:**
- Modify: `.storybook/theme.ts` (fontBase → `'"Geist Variable", system-ui, sans-serif'`, fontCode → `'"Geist Mono Variable", ui-monospace, monospace'`, `brandImage: FIESTA_ICON_DATA_URI` imported from `../src/components/chrome/fiesta-icon`), `seasons.stories.tsx` (`Preview` → `Default`)
- Create: `src/components/chrome/board-icon.stories.tsx` (title `Chrome/BoardIcon`, Default story rendering sizes/colors)

**Steps:**
- [ ] Apply; `npm run build-storybook` → PASS; commit `feat: Storybook shell wears the brand (Geist, taco mark); BoardIcon story`

### Task 9: Docs + verification

**Steps:**
- [ ] Update `docs/brand-cohesion-review.md` with a Status column: done-in-PR / deferred (C3 authoring pattern, F3 light manager theme, B4 full motion tokens, E1 seasonal brand accent = documented decisions)
- [ ] `npm run lint && npm run typecheck && npm run build && npm run build-storybook` all PASS
- [ ] Commit `docs: mark review items implemented/deferred`; push; update PR body
