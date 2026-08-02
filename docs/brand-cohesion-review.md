# FiestaUI Brand & Design Cohesion Review

_Review date: 2026-08-01. Scope: full `src/` tree (ui + chrome components, react-bits, styles, seasonal themes, lib/seasons), `.storybook/`, packaging (`package.json` exports/build), and README._

## Status (updated 2026-08-01, same PR — v1.0.0: all workstreams closed)

Implemented in this PR:

- **B4** — motion token system: `--motion-duration-{fast,control,base,exit,slow,slower,slowest}` + `--motion-ease-{out,spring,in,out-cubic,standard}` in theme.css, all values lifted verbatim; keyframe timing, sheet inline animation strings, and the mobile-menu transition migrated. Deliberate one-offs stay literal with comments.
- **B3 (complete)** — radius role scale (control-inset/control/surface/card/pill + chrome 14px/chrome-mobile 16px) and a documented z-index layer scale (--z-popover 50 → --z-confetti 9999); chrome magic numbers and ui overlay z-indexes now reference tokens; stacking rationale documented.
- **C3** — one authoring pattern across ui/: plain function components + data-slot everywhere (React 19 ref-as-prop; forwardRef/displayName tier fully migrated; button/badge stay on useRender by design). DOM identical except added data-slot attributes.
- **G** — pixel-taco redrawn as tokenized SVG: 330 rect runs over a 15-slot `--fiesta-icon-*` semantic palette (source PNG had AA noise — parity proven 0-diff against the quantized design target); `FIESTA_ICON_DATA_URI` stays backward-compatible; crisp at all sizes.
- **Board Preview extraction** — BoardDisplay/ScaledBoardDisplay/StaticBoardDisplay + character/color/dimension data modules moved into the package as fully presentational components; flip-animation values byte-identical; 33 axe-clean stories under Board/.

- **A1, A2** — fiesta gradient single-sourced to `--fiesta-*` (mobile header unified to desktop values); pride palette reduced to two sources (CSS `--icon-g*` ramp in `seasons/pride.css`, JS `PRIDE_SEASON.colors`) with auroras/logo deriving from them.
- **A3** — every draft season's `colors[]` now mirrors its CSS `--icon-g*` ramp; Halloween's logo/icon purple ramps aligned.
- **A4** — `--fiesta-purple` documented as deliberately desaturated from board violet.
- **B1** — one focus recipe everywhere (`outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`); close buttons moved off `focus:`.
- **B2** — `--tag-formula` tokens replace raw amber; slider thumb `bg-background`; sidebar edge toggle on semantic tokens; lucide `X` replaces the hand-rolled SVG.
- **B3 (partial)** — Dialog/AlertDialog on `shadow-modal`, dropdown sub-content matches parent `shadow-md`, Select `h-9`, label disabled opacity 50, close buttons gain disabled opacity. Radius role scale and z-index scale deferred (parity risk).
- **C1 (partial)** — unused react-bits removed; `DecryptedText` uses `cn`; `FadeContent` passes `className` through untouched. Full cva/token adoption deferred.
- **C2** — sidebar auroras share one WebGL core (`aurora-canvas.ts`); `ui/aurora.tsx` (ogl) kept as-is — it is used by the app's setup wizard.
- **D** — Badge `brand` variant (on `bg-brand-emphasis`, same fill as Button's brand — `bg-brand` + white failed AA at 2.04:1 in dark); Alert `info`/`success`/`warning`; AlertTitle semibold; AlertDialogTitle leading/tracking aligned.
- **E2, E3, E5** — all season files share one structural template; pride follows the per-file convention (`seasons/pride.css`, class name unchanged); `./seasons/*.css` added to package exports.
- **E1, E4** — documented decisions: `--brand` is season-invariant by design (comment in pride.css); June pride/fathers-day collision annotated in `seasons.tsx`.
- **E6** — reduced-motion authored in every season file (guards against future season edits out-specificing the base rules); the WebGL aurora core now freezes on a single static frame under `prefers-reduced-motion`; the flagged contrast claims verified — Halloween `#8a6cae` 4.84:1, New Year `#8790c9` 6.86:1 under black text, both AA.
- **F1, F2, F4** — Storybook shell on Geist + taco `brandImage`; `Chrome/Seasons` primary story renamed to `Default`; `BoardIcon` story added.
- **F3** — light manager theme (`fiestaLight` mirrors theme.css's light neutrals); the shell follows the preview's Theme toolbar toggle via a small manager addon.
- **Removals (breaking — next release is a major):** `Checkbox`, `BlurText`, `CountUp`, `SpotlightCard`, deprecated `PRIDE_COLORS`/`firePrideBurst` — verified unused in FiestaBoard `web/src`. **Kept by product decision:** `PageHeader`/`PageLayout`/`PageToolbar` (and their `--icon-g*`/`.page-title` plumbing) — currently unused by the app but they are the preferred page scaffolding; adopting them in FiestaBoard is the follow-up.

Post-review polish (same PR, from design walkthrough feedback):

- Collapsed sidebar: board-selector trigger centered on the rail line (was 8px off — phantom flex gaps + fixed-width trigger in a full-width slot); theme toggle centered; version number shown centered beneath the toggle when collapsed, side-by-side row when expanded.
- Mobile header: board selector compacts to icon + caret below 480px (no board name fits beside the wordmark on portrait phones); header can wrap as a safety net, publishing its measured height as `--mobile-header-height` for the menu/content offsets (replaces hardcoded 72px).
- Sidebar/AppShell stories now wire `mobileBoardSelector` — the phone-width Storybook header previously had no board switcher at all.

Remaining (minor, tracked in their sections): C1's full cva/token adoption for the surviving react-bits pieces; C2's decision on `ui/aurora.tsx` (kept — used by the app's setup wizard).

## Executive summary

The token architecture is fundamentally sound: semantic colors, radius scale, elevation shadows, and the brand/board palettes are all defined in `src/styles/theme.css`, and most shipped components consume them correctly. Product naming (FiestaBoard the app, FiestaUI the design system, `@fiestaboard/ui` the package, "Fiesta" the brand word) is consistent, and the board official colors have zero drift.

Cohesion breaks down in four places:

1. **The brand's signature visuals have no single source of truth.** The fiesta gradient exists as 3+ independently hardcoded palettes (and the mobile header's differs from desktop). The pride rainbow is copy-pasted in 5 locations. The seasonal aurora/confetti palettes in `lib/seasons.tsx` disagree with the season CSS files they're paired with.
2. **Interaction states are fragmented.** Five different focus-ring treatments, mixed shadow/radius choices for the same roles, and durations/easings spread across three animation mechanisms.
3. **A second-class tier of components ignores the system.** The `react-bits/` folder (and `ui/aurora.tsx`) uses inline styles, hardcoded colors, no `cn`, no tokens — it reads as vendored code, not FiestaUI.
4. **The showcase doesn't match the brand.** Storybook's shell is styled with fonts the package doesn't ship (Inter/Fira Code instead of Geist), has no brand image, and is dark-only.

The work below is grouped into workstreams, ordered by impact on brand cohesion. Each item lists the concrete files involved so it can be split into PRs.

---

## Workstream A — One source of truth for brand palettes (highest impact)

### A1. Unify the fiesta gradient into shared tokens

The core brand gradient is maintained as separate hardcoded hex sets that already disagree:

- Page-icon gradient `--fiesta-red/orange/purple`: `#c97a72 / #c99662 / #9b7bb0` (`theme.css:200-202`)
- Desktop sidebar `--sidebar-fiesta-*`: `#c97a72 / #c99662 / #9b7bb0` (`theme.css:807-809`)
- **Mobile header** `--sidebar-fiesta-*`: `#c98a82 / #c9a070 / #9b7bb0` (`theme.css:852-854`) — red and orange are warmer than desktop
- Dark-mode sidebar values duplicated twice: `#7a2a24 / #6d5014 / #4e3070` (`theme.css:835-837` and `885-887`)

**Change:** define the gradient once (`--fiesta-red/orange/purple` in `:root` / `.dark`) and have the sidebar, horizontal header, and page-icon gradients all reference it. Decide deliberately whether the mobile header's warmer tint is intentional; if so, derive it (e.g. `color-mix`) instead of forking hexes.

### A2. Single source for the pride palette

The rainbow `#e40303 #ff8c00 #ffed00 #008026 #004dff #750787` is hardcoded in five places: `lib/seasons.tsx:34`, `sidebar-aurora.tsx:5`, `sidebar-aurora-horizontal.tsx:5`, `theme.css:278-283` (icon gradient), `theme.css:566` (logo text gradient).

**Change:** make `lib/seasons.tsx` (or CSS custom properties) the canonical palette; the aurora `DEFAULT_COLORS` are dead fallbacks (Sidebar always passes `season.colors`) and should be removed or derived.

### A3. Reconcile season CSS palettes with `lib/seasons.tsx` `colors[]`

Each season's look is defined in two disconnected places — CSS (logo/icon/sidebar) and `colors[]` (aurora + confetti) — and they diverge, worst for **Mother's Day**: the CSS explicitly targets "garden-rose rather than candy pink" (`mothers-day.css:12-26`) while `colors[]` is candy pink `#ff69b4 #ffc0cb…` (`seasons.tsx:90`). Easter, New Year, and Halloween have similar (milder) mismatches, and Halloween's own logo purples (`halloween.css:11`) don't match its icon purples (`halloween.css:22-25`).

**Change:** per season, pick one palette and derive both surfaces from it. Add a comment convention (or generator) linking each `seasons/<id>.css` to its `DRAFT_SEASONS` entry.

### A4. Decide the brand-violet relationship

`--fiesta-purple` `#9b7bb0` is commented "board violet hue, light" but board violet is `#9b59b6` — two independent hexes that can drift. Either derive one from the other or document them as intentionally separate.

---

## Workstream B — Unify interaction states across `ui/` components

### B1. One focus-ring recipe (most visible inconsistency)

Five treatments coexist:

| Treatment                                                  | Components                |
| ---------------------------------------------------------- | ------------------------- |
| `focus-visible:ring-[3px] ring-ring/50 + border-ring`      | button, badge, switch     |
| `focus-visible:ring-1 ring-ring` (full opacity, no offset) | input, textarea, checkbox |
| `focus-visible:ring-2 ring-ring ring-offset-2`             | select, tabs, scroll-area |
| `focus:ring-2 ring-offset-2` (fires on mouse click)        | dialog close, sheet close |
| `hover/focus-visible:ring-4`                               | slider thumb              |

An Input next to a Select renders visibly different focus states. **Change:** standardize on one recipe (recommend the modern 3px soft ring), switch `focus:` → `focus-visible:` on the close buttons, and unify the outline reset (`outline-none` vs `outline-hidden` are both used).

### B2. Eliminate off-token colors in shipped components

- `badge.tsx:22` `formula` variant: raw `amber-500/amber-700/amber-400` — the only raw-palette variant; promote to a `--tag-formula` token like its `variable`/`success` siblings.
- `slider.tsx:67` thumb: `bg-white` (won't adapt in dark mode) — Switch uses `bg-background`; match it.
- `sidebar.tsx:383` edge collapse toggle: raw `gray-200/700/500/400/100/800` — the only off-token control in the chrome; move to semantic tokens.
- `sidebar.tsx:289-291`: hand-rolled close-X SVG where lucide `X` would match the `Menu` icon imported two lines below.

### B3. Converge elevation, radius, and control sizing

- **Shadows:** Dialog/AlertDialog use raw `shadow-lg` while Sheet correctly uses the `shadow-modal` token; popovers mix `shadow-md` and `shadow-lg` (dropdown sub-content differs from its own parent). Route all surfaces through `shadow-card`/`shadow-modal` (add a `--shadow-popover` if needed).
- **Radius:** containers span `rounded-xl` (card) / `rounded-lg` (alert, modals) / mixed internals (tabs list `md` vs trigger `sm`; dialog close `sm` vs sheet close `full`). Define a role-based radius convention (container / control / pill) on the existing `--radius` scale.
- **Heights:** Select trigger is `h-10` while Input and Button default are `h-9` — form rows misalign. Also normalize `disabled:opacity-50` (label uses `70`) and add missing disabled opacity to modal close buttons.
- **z-index:** `z-50 / z-[110] / z-[120] / z-[130] / z-[140]` are ad hoc; introduce a documented layering scale.

### B4. One motion vocabulary

Durations span `150/200/500ms`, several transitions have no duration, Sheet hardcodes `400ms cubic-bezier(0.25,0.1,0.25,1)` inline in JS while Dialog uses Tailwind `animate-in` utilities, and react-bits use inline `Ns ease`. Define token-level motion values (e.g. `--motion-fast/base/slow` + standard easing) and use one mechanism per role (modal, popover, micro-interaction).

---

## Workstream C — Bring second-class components into the system

### C1. Adopt `react-bits/` (blur-text, count-up, decrypted-text, fade-content, spotlight-card)

They bypass every convention: template-literal class concatenation instead of `cn` (consumer `className` can't reliably override), no `cva`/variants, inline `style` objects, default exports, hardcoded colors (`spotlight-card.tsx:12` white spotlight). **Change:** either refactor onto `cn` + tokens + named exports, or explicitly quarantine them (separate entry point + Storybook section labelled as effects, with a documented exemption).

### C2. Consolidate the three auroras

`chrome/sidebar-aurora.tsx` and `chrome/sidebar-aurora-horizontal.tsx` are ~95% identical hand-written WebGL2 (shared GLSL, `hexToRgb`, bootstrap); `ui/aurora.tsx` is a third implementation on `ogl` with off-brand default stops `#5227FF/#7cff67`. **Change:** extract the shared WebGL core (axis as a prop), and either retire `ui/aurora.tsx` or re-point its defaults at brand/season palettes. Also resolves the `Chrome/*` vs `UI/*` split-tier confusion for the same concept.

### C3. Standardize component authoring

Three patterns coexist in `ui/`: Base UI `useRender` + `data-slot` (button, badge), plain functions + `data-slot` (card, switch, dropdown), and `React.forwardRef` + `displayName` without `data-slot` (alert, input, select, tabs…). Pick the target pattern and migrate incrementally.

---

## Workstream D — Variant vocabulary completeness

- `brand` variant exists only on Button. Badge and Alert have no on-brand variant — there is currently no way to render a brand-colored badge or alert.
- Alert has only `default`/`destructive` despite semantic tokens (`--info/--success/--warning` + foregrounds) already existing in the theme; add `info`/`success`/`warning` variants.
- "success" currently means a green _tag_ on Badge with no counterpart elsewhere; align the semantic-variant vocabulary (destructive/success/warning/info + brand) across Button/Badge/Alert.
- Title typography role: `text-lg font-semibold` (dialog/alert-dialog/sheet) vs `font-medium` no size (AlertTitle) vs `font-semibold` no size (CardTitle) vs `.page-title` (`font-medium`). Define one title scale (the `.page-title`/`.page-description` pattern in theme.css is a good model to extend).

---

## Workstream E — Seasonal theming architecture

- **E1. Seasons never touch `--brand`.** Every season retints the chrome (logo, icon gradient, sidebar) but leaves `--brand`/`--brand-emphasis` at base gold-orange, so links/active states stay un-seasonal next to a purple Halloween sidebar. Decide: either seasons override `--brand` (with AA-checked values) or document that brand accent is deliberately season-invariant.
- **E2. Normalize the season CSS structure.** Two structural camps: halloween/thanksgiving/christmas/new-year use split dark selectors (and omit `--foreground/--muted-foreground` on the horizontal header) while easter/mothers-day/fathers-day use a combined selector that sets both. Pick one template (the combined one is tighter) and apply to all 7 + pride.
- **E3. Promote pride to the file convention.** Pride is the only live season and the only one without a `seasons/pride.css` (styled inline in theme.css) and the only one with an `-month` suffix (`pride-month` vs `*-season`). Normalize naming and location so promoting a draft doesn't require re-plumbing.
- **E4. June collision:** `PRIDE_SEASON.months=[5]` and draft `fathers-day.months=[5]` — `getActiveSeason` is first-match-wins, so these are mutually exclusive if Father's Day ships. Decide precedence/stacking now.
- **E5. Season CSS packaging:** the `exports` map only exposes `./theme.css`, so consumers get all 7 drafts bundled (via theme.css's relative imports) and _cannot_ opt into a single season. If per-season opt-in is desired, add `"./seasons/*.css": "./dist/seasons/*.css"` to `exports`.
- **E6. Author reduced-motion/contrast in season files.** A11y coverage currently works only by inheritance from base rules; any season that re-declares `animation` would silently lose it. Also verify the asserted contrast claims for Halloween light purple `#8a6cae` and New Year periwinkle `#8790c9` under black text.

---

## Workstream F — Storybook as the brand showcase

- **F1. Fonts:** `.storybook/theme.ts` sets Inter/Fira Code — neither is installed, so the shell falls back to system fonts while the canvas renders Geist. Point `fontBase`/`fontCode` at Geist Variable / Geist Mono Variable.
- **F2. Brand image:** no `brandImage` is set; the shell shows plain text "FiestaUI" while the package ships `FiestaIcon`/`FiestaLogo`. Add the mark (an SVG export would also fix the favicon story).
- **F3. Light manager theme:** manager is hardcoded `base: "dark"` and doesn't follow the preview's light/dark toggle.
- **F4. Story conventions:** standardize the primary story name (`Playground` vs `Preview` vs `Default` currently coexist); add the missing `BoardIcon` story; make demo headings use the real `.page-title` scale instead of `text-3xl/4xl font-bold` (they currently misrepresent the system's actual title weight).

---

## Workstream G — Brand mark

- `FiestaIcon` is a base64 raster PNG: un-themeable, can't follow dark mode or seasons, and the "brand orange from taco icon #f5a623" claim in theme.css is unenforceable against a PNG. Longer-term: redraw the taco as SVG with tokenized fills (also enables a proper Storybook `brandImage` and crisp rendering at all sizes). Until then, document the PNG as a fixed-color asset.

---

## Suggested sequencing

| Phase | Items                      | Rationale                                                                                                                                                  |
| ----- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | A1, A2, B1, B2             | Biggest visible wins; low-risk token/class swaps. Visual-parity rule applies — coordinate with the FiestaBoard app and version as minor/major accordingly. |
| 2     | B3, B4, D                  | Systematizes elevation/radius/motion/variants; mostly additive.                                                                                            |
| 3     | A3, E1–E4                  | Seasonal coherence before any draft season ships.                                                                                                          |
| 4     | C1–C3, F1–F4, A4, E5–E6, G | Structural refactors and showcase polish.                                                                                                                  |

**Note on the visual-parity contract:** README §"Visual parity rule" makes token values and class strings contract. Several Phase 1–2 items (focus rings, Select height, slider thumb, shadows) are intentional visual changes and need a coordinated FiestaBoard-side check plus an appropriate version bump.

## What's already healthy (don't churn)

- Board official colors: exact, drift-free (`theme.css:102-109`).
- Product naming across code, stories, aria-labels, and README.
- Grayscale discipline: no zinc/gray/slate mixing in `ui/` primitives (the one `gray-*` exception is `sidebar.tsx:383`, covered in B2).
- `page-title`/`page-description` centralization; `src/index.ts` barrel is complete; no emoji-as-UI; lucide as the single icon family (BoardIcon deliberately drawn in lucide style).
