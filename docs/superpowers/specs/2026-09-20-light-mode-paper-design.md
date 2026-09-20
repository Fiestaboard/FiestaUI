# Light mode as paper, not as a lightbox

_Design date: 2026-09-20. Scope: `src/styles/theme.css` light palette + a new
texture layer; `src/stories/token-registry.ts`; `scripts/ci/tests/theme-contrast.test.mjs`._

## The report

> "I am a dark mode user but when I pop over to light mode it's not light, it
> feels too bright. I think some texture and adjustment of colors might help."

That is a precise complaint, and it is reproducible from the token file alone.

## Diagnosis — three measurable causes

Measured with the same colour math CI uses (`theme-contrast.test.mjs`), so every
figure below is computed from `theme.css`, not estimated.

**1. The page is near the top of the luminance range and the cards are above
it.** Light surfaces today span `L 0.925 – 0.995`:

| token                  | value                   | sRGB      |
| ---------------------- | ----------------------- | --------- |
| `--card` / `--popover` | `oklch(0.995 0.003 73)` | `#fffdfb` |
| `--background`         | `oklch(0.965 0.003 73)` | `#f5f3f1` |
| `--accent`             | `oklch(0.945 0.003 73)` | `#eeeceb` |
| `--muted`              | `oklch(0.935 0.003 73)` | `#ebe9e7` |
| `--sidebar`            | `oklch(0.93 0.003 73)`  | `#e9e7e6` |
| `--secondary`          | `oklch(0.925 0.003 73)` | `#e7e6e4` |

Cards are `#fffdfb` — a hair off pure white — and they cover most of the
screen. The product's dominant pixel is therefore very nearly the brightest
colour a display can emit. "Too bright" is literal.

**2. There is no warmth to carry.** The hue lock (#231) gave surfaces a warm
cast at hue 73, but at **chroma 0.003** that cast is below the threshold of
perception on most displays. The file says the neutrals "read as chosen rather
than inherited"; at 0.003 they read as grey. The intent shipped; the pigment
did not.

**3. Nothing has an edge, so nothing has a shape.** Every light surface sits
within a **1.13:1** band of every other, and `--border` is 11% of `--foreground`
= **1.26:1**. Cards, rails and table rules separate from the page by almost
nothing, which is exactly the "flat" the report describes. The border's own
comment defends this ("deliberately allowed to stay whisper-subtle"), and that
defence is sound — decoration has no WCAG floor — but "no floor" is not an
argument for the specific value 11%.

## Design

### A. Tone the paper, and let the card be the bright thing

Move the page down and give the neutrals real (still quiet) warmth. Keep the
existing ordering of surfaces intact.

| token          | before                            | after                             |
| -------------- | --------------------------------- | --------------------------------- |
| `--background` | `oklch(0.965 0.003 73)` `#f5f3f1` | `oklch(0.945 0.010 73)` `#f1ece6` |
| `--card`       | `oklch(0.995 0.003 73)` `#fffdfb` | `oklch(0.988 0.006 73)` `#fefbf7` |
| `--popover`    | `oklch(0.995 0.003 73)`           | `oklch(0.992 0.005 73)` `#fffcf9` |
| `--accent`     | `oklch(0.945 0.003 73)`           | `oklch(0.928 0.012 73)` `#ece6df` |
| `--muted`      | `oklch(0.935 0.003 73)`           | `oklch(0.915 0.012 73)` `#e8e2da` |
| `--sidebar`    | `oklch(0.93 0.003 73)`            | `oklch(0.912 0.013 73)` `#e7e1d9` |
| `--secondary`  | `oklch(0.925 0.003 73)`           | `oklch(0.905 0.013 73)` `#e5ded6` |

Two things happen at once. The page stops being a light source, and the
page→card step grows from **1.09:1 to 1.14:1** — so the card finally reads as an
object laid _on_ something rather than a slightly whiter patch of the same
thing. Popover is pulled a step above card for the same reason.

### B. The ink plateau follows the page down

This is the part that cannot be skipped. `--hue-*`, `--destructive`, `--info`
and `--success` all sit at `L 0.52`, a plateau chosen because it is where those
six hues clear AA **against the old page**. Darkening the page under a fixed
plateau costs contrast: `--hue-green` lands at **4.46:1**, below AA, and falsifies
the file's own "every one clears 4.7:1 on `--background`" claim.

So the plateau moves with the page: **`L 0.52 → 0.50`**. Hue and chroma are
untouched, so the hue lock is intact. Every chromatic ink token ends up with
_more_ headroom than it has today:

| token                      | before (on `--background`) | after      |
| -------------------------- | -------------------------- | ---------- |
| `--hue-green` (worst cell) | 4.73:1                     | **4.85:1** |
| `--hue-yellow`             | 4.92:1                     | **5.05:1** |
| `--hue-blue`               | 4.99:1                     | **5.10:1** |
| `--hue-orange` / `--brand` | 5.09:1                     | **5.21:1** |
| `--hue-red`                | 5.39:1                     | **5.53:1** |
| `--hue-violet`             | 5.40:1                     | **5.55:1** |
| `--success` fill           | 4.73:1                     | **4.85:1** |
| `--info` fill              | 4.99:1                     | **5.10:1** |
| `--destructive` fill       | 5.39:1                     | **5.53:1** |

`--warning` is the one token that must move _against_ the plateau. It is a fill,
icon and border colour (never text — Alert enforces this), so its job is SC
1.4.11's 3:1 against the page, and a darker page erodes that: 3.25:1 → 3.06:1.
Dropping it to **`L 0.62 → 0.61`** restores the headroom (**3.19:1**) while its
board-ink label stays above AA (**4.79:1**). `L 0.60` was measured and rejected:
the label falls to 4.60:1, too close to the floor to defend.

### C. Give the edges back

`--border`: **11% → 14%** of `--foreground` (**1.26:1 → 1.35:1** in light). Still
decoration, still well under the 3:1 that SC 1.4.11 asks of _controls_, but
enough that a card has a perimeter. `--input` is untouched at 50% — it is the
control boundary, it already clears 3:1 on both surfaces, and it is the one
number in this file with an actual floor under it.

Dark gets the same 14% (**12% → 14%**, 1.31:1 → 1.39:1 on the page, 1.38:1 →
1.47:1 on a card). The light/dark split existed because contrast ramps
differently for light-on-dark; that reasoning belongs to `--input` and its 3:1
floor, not to a decorative rule with no floor at all.

Elevation is retuned for the new paper — the old alphas (0.05/0.07) were tuned
against a page that was nearly white and are too faint to register on a toned
one.

### D. Texture: grain as a surface property

A new two-token layer, and the reason the report says "texture" rather than
"darker":

- `--texture-grain` — a tiled `url()` of an inline-SVG `feTurbulence` fractal
  noise, declared per theme so each can carry its own strength.
- `--texture-grain-blend` — `soft-light`.

`soft-light` is the load-bearing choice. The noise averages to mid-grey, and
mid-grey under `soft-light` is a **no-op** — so the grain adds texture with
_zero net luminance shift_. Every ratio in this document stays true with the
grain painted on. A `multiply` or plain-alpha overlay would dim the page by
~0.01 L and quietly invalidate the whole table above.

It is applied as a **`background-image` layer on the element that already paints
the surface** — no pseudo-element, no overlay, no stacking context, no blend
mode over content. Two surfaces get it by default:

- `body` — the page is the ground, so the ground is what should have tooth.
- `.sidebar-gradient` / `.sidebar-gradient-horizontal` — the largest flat
  chrome in the product.

Cards deliberately do **not** get grain. Textured ground with clean objects on
it is the hierarchy; grain on everything is just noise. `.surface-grain` is
exported for surfaces that want to opt in.

Disabling is one declaration: `--texture-grain: none`. It is also switched off
under `forced-colors: active`, where a decorative image over a
system-substituted palette is nothing but interference.

### E. Dark mode

Deliberately small — the report is about light. Dark gets the `--border` bump
(C) and a weaker grain (D). Its surfaces, ink and plateau are untouched.

## What this costs

- **Every VRT baseline changes.** That is inherent to a palette PR, not a
  regression; baselines are CI artifacts from `main`, so the visual-regression
  workflow needs a review-and-accept pass.
- **68 published ratios in `theme.css`** — the ones describing _current_ light
  measurements are recomputed and rewritten. Historical narrative ratios
  (what a token used to be, why it was rejected) are left exactly as written.
- **Pinned calibration numbers** in `theme-contrast.test.mjs` move
  (`--brand` 5.09 → 5.21, `--primary` 1.83 → 1.72), as does the `#238` error
  string that quotes them.
- **`token-registry.ts`** gains a `texture` non-colour category, or the
  totality assertion fails on the new tokens.

## Verification

1. `npm run release:test` — contrast matrix, token registry, dark-selector pairing.
2. `npm test` — unit suite.
3. `npm run lint` / `format:check` / `typecheck`.
4. Built Storybook, screenshotted light + dark before/after across the app-shell
   and page-composition stories, for visual review.
