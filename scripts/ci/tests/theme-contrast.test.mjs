import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guards the three contrast recipes that #238, #231 and #228 (item 5) settled.
 *
 * All three failures had the same shape: a contrast decision that lived in a
 * class string or a consumer stylesheet instead of in `theme.css`, so nothing
 * noticed when the palette moved underneath it. 4.0.0 repointed `--ring` and
 * `--primary` at the literal #f5a623 tile; every call site still spelling the
 * old alpha-ring recipe silently dropped to ~1.36:1, and every consumer that
 * forked a tag colour into a hex to "fix" AA stopped tracking the tokens.
 * Review cannot catch that — each file looks fine on its own — so it is
 * asserted here.
 *
 * Four subjects, seven assertions:
 *
 *   1. #238 — the banned `ring-ring/<alpha>` focus recipe and `--primary`-as-
 *      text are pinned to an allowlist that may shrink and never grow.
 *   2. #231 — the three tag-tint Badge pairs clear 4.5:1 (WCAG 1.4.3, AA) on
 *      EVERY opaque surface in the palette, in BOTH themes, at both the rest
 *      and hover tint strengths. Computed from theme.css itself, so retuning a
 *      token re-runs the proof.
 *   3. #228 item 5 — the focus ring's three-stop recipe is written once, as
 *      `--focus-ring-shadow`, and `.focus-ring` consumes it like any other
 *      caller.
 *   4. Rings that paint NOTHING, in the two ways they can. A `ring-<colour>`
 *      utility on its own only sets `--tw-ring-color`, so with no ring WIDTH
 *      in the file nothing emits a box-shadow (Lightbox's close chip, after
 *      OverlayClose moved to `.focus-ring`); and an OUTSET ring on an element
 *      that fills an `overflow-hidden` parent is clipped away in full
 *      (ScrollArea's viewport). Both look correct at the call site.
 *
 * This file is picked up by `npm run release:test`
 * (`node --test scripts/ci/tests/*.test.mjs`), which CI's `automation` job
 * runs on every PR.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THEME_CSS = path.join(ROOT, "src", "styles", "theme.css");
const SCAN_DIRS = [path.join(ROOT, "src", "components"), path.join(ROOT, "src", "stories")];

const themeCss = await readFile(THEME_CSS, "utf8");

/* ------------------------------------------------------------------ *
 * 1. #238 — the banned recipes, pinned
 * ------------------------------------------------------------------ */

/** `ring-ring/50`, `focus-visible:ring-ring/30`, … — the pre-4.0.0 alpha ring. */
const ALPHA_RING = /(?<![\w-])ring-ring\/\d+/g;

/**
 * `text-primary`, but not `text-primary-foreground`. `--primary` is the
 * literal tile at 1.83:1 on a light page: legal as a field or an icon,
 * illegal as text. `--brand` is the same hue at the ink plateau.
 */
const PRIMARY_AS_TEXT = /(?<![\w-])text-primary(?!-|\w)/g;

/**
 * Sites that still spell a banned recipe, each with the reason it was left
 * alone. This map may SHRINK, never grow: a new entry means someone
 * re-introduced a defect the palette cannot express safely.
 */
const KNOWN_OFFENDERS = new Map([
  [
    "src/components/forms/input.tsx",
    "The paired control recipe `focus-visible:border-ring focus-visible:ring-ring/50`, where the solid border " +
      "carries the boundary and the band is decoration. Converting the eight form controls to `.focus-ring` is a " +
      "design change to every input in the system and belongs in its own PR.",
  ],
  ["src/components/forms/select.tsx", "Paired control recipe — see input.tsx."],
  ["src/components/forms/textarea.tsx", "Paired control recipe — see input.tsx."],
  ["src/components/forms/checkbox.tsx", "Paired control recipe — see input.tsx."],
  ["src/components/forms/switch.tsx", "Paired control recipe — see input.tsx."],
  ["src/components/forms/slider.tsx", "Paired control recipe on the thumb, plus a hover ring — see input.tsx."],
  [
    "src/components/forms/time-picker.tsx",
    "`focus:ring-inset` inside the scrolling hour/minute listboxes. `.focus-ring` is an OUTSET box-shadow and " +
      "would be clipped by the scroll container, so this one needs a real design decision, not a swap.",
  ],
  [
    "src/components/forms/toggle-card.tsx",
    "Paired control recipe, plus `data-[checked]:text-primary` on the SegmentedControl label and " +
      "`group-data-[checked]:text-primary` on the ToggleCard icon (the icon is a GRAPHIC and legal at 3:1; the " +
      "label is not). This file is the source of truth for the #217/#240/#241/#245 selection-control PRs and is " +
      "being edited on four other branches — retouching it here would be a guaranteed conflict.",
  ],
  [
    "src/components/containment/media-frame.tsx",
    "`focus-visible:ring-inset` on a frame that is `overflow-hidden` by construction. Same clipping problem as " +
      "time-picker.tsx.",
  ],
  [
    "src/components/plugin/plugin-card.tsx",
    "The ring is drawn on an `::after` overlay that spans the whole card, and a utility class cannot reach a " +
      "pseudo-element. This is the canonical future consumer of `--focus-ring-shadow` (#228 item 5): once the " +
      "property exists, `after:shadow-[var(--focus-ring-shadow)]` stays in sync by construction.",
  ],
]);

/** Strips `/* *\/` and `//` comments so a file that DOCUMENTS a banned recipe is not flagged for it. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

/** relative path -> comment-stripped source, for every scanned file. */
const sources = new Map();
const offenders = new Map();
for (const dir of SCAN_DIRS) {
  for await (const file of walk(dir)) {
    const source = stripComments(await readFile(file, "utf8"));
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    sources.set(rel, source);
    const hits = [...source.matchAll(ALPHA_RING), ...source.matchAll(PRIMARY_AS_TEXT)].map((m) => m[0]);
    if (hits.length > 0) offenders.set(rel, [...new Set(hits)]);
  }
}

test("#238: no banned focus ring or --primary-as-text outside the pinned allowlist", () => {
  const unexpected = [...offenders].filter(([file]) => !KNOWN_OFFENDERS.has(file));
  assert.deepEqual(
    unexpected.map(([file, hits]) => `${file}: ${hits.join(", ")}`),
    [],
    "`ring-ring/<alpha>` composites to ~1.36:1 on a light page now that --ring is the #f5a623 tile, and it is " +
      "paired with `outline-none`, so the UA outline is suppressed and its replacement is invisible (SC 2.4.11). " +
      "Add the `focus-ring` class instead. `text-primary` is the tile at 1.83:1 — use `text-brand` for text and " +
      "links (5.09:1 light / 9.63:1 dark).",
  );
});

test("#238: the allowlist has no stale entries", () => {
  const stale = [...KNOWN_OFFENDERS.keys()].filter((file) => !offenders.has(file));
  assert.deepEqual(stale, [], "these files no longer carry a banned recipe — drop them from KNOWN_OFFENDERS");
});

/* ------------------------------------------------------------------ *
 * 2. #231 — the tag pairs, measured on every surface, in both themes
 * ------------------------------------------------------------------ */

/** Collects the custom properties of every TOP-LEVEL `selector { … }` block (skips `@media`-nested ones). */
function declarationsFor(css, selector) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const head = new RegExp(`(^|[};])\\s*${selector}\\s*\\{`, "g");
  const out = new Map();
  let match;
  while ((match = head.exec(stripped)) !== null) {
    let depth = 1;
    let i = head.lastIndex;
    for (; i < stripped.length && depth > 0; i += 1) {
      if (stripped[i] === "{") depth += 1;
      else if (stripped[i] === "}") depth -= 1;
    }
    for (const decl of stripped.slice(head.lastIndex, i - 1).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out.set(decl[1], decl[2].trim());
    }
    head.lastIndex = i;
  }
  return out;
}

/**
 * The dark token block's selector, spelled in full.
 *
 * Dark mode has carried TWO selectors since #228 item 6 — `.dark` and
 * `[data-theme="dark"]`, paired on every rule and gated by
 * `dark-selector-pairing.test.mjs`. A pattern matching the bare class stops
 * finding the block, and `declarationsFor` answers that with an EMPTY map
 * rather than an error: `darkTokens` then degrades to `lightTokens` and every
 * assertion below silently re-measures the light palette while still calling
 * itself dark. The `#231` calibration test catches it today, which is why this
 * is spelled out rather than loosened — a re-spelling should fail here, not
 * quietly change what "dark" means.
 */
const DARK_SELECTOR = String.raw`\.dark\s*,\s*\[data-theme="dark"\]`;

const lightTokens = declarationsFor(themeCss, ":root");
const darkOverrides = declarationsFor(themeCss, DARK_SELECTOR);
const darkTokens = new Map([...lightTokens, ...darkOverrides]);

test("the dark token block is found, and overrides the light one", () => {
  // Guards the degradation described above: without this, a selector change
  // makes the whole "both themes" half of this file assert light twice.
  assert.ok(darkOverrides.size > 20, `expected theme.css's dark token block, found ${darkOverrides.size} declarations`);
  assert.notEqual(darkTokens.get("--background"), lightTokens.get("--background"), "dark --background must differ");
});

function resolve(name, tokens) {
  let value = tokens.get(name);
  assert.ok(value, `theme.css declares no ${name}`);
  const seen = new Set();
  while (/^var\(\s*--[\w-]+\s*\)$/.test(value)) {
    const ref = value.slice(4, -1).trim();
    assert.ok(!seen.has(ref), `var() cycle at ${ref}`);
    seen.add(ref);
    value = tokens.get(ref);
  }
  return value;
}

/** oklch()/#hex -> sRGB in 0..1. Verified against theme.css's own published ratios. */
function toRgb(value) {
  const v = value.trim();
  if (v.startsWith("#")) return [0, 2, 4].map((i) => parseInt(v.slice(1 + i, 3 + i), 16) / 255);
  const parts = v
    .replace(/^oklch\(|\)$/g, "")
    .split(/[\s/]+/)
    .filter(Boolean)
    .map(Number);
  const [L, C, H] = parts;
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (u) =>
    Math.min(1, Math.max(0, u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(Math.max(u, 0), 1 / 2.4) - 0.055));
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Gamma-space alpha composite — what the compositor does painting `bg-tag-x/15` over an opaque surface. */
const composite = (fg, alpha, bg) => fg.map((c, i) => alpha * c + (1 - alpha) * bg[i]);

/** Every opaque surface a Badge can legitimately land on. */
const SURFACES = ["--background", "--card", "--popover", "--muted", "--secondary", "--accent", "--sidebar"];
/** badge.tsx paints the fill at 15% and lifts it to 25% on an anchor hover. */
const TINTS = [0.15, 0.25];
const TAGS = ["variable", "success", "formula"];

test("#231: every tag Badge pair clears AA (4.5:1) on every surface, in both themes", () => {
  const failures = [];
  for (const [theme, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ]) {
    for (const tag of TAGS) {
      const tint = toRgb(resolve(`--tag-${tag}`, tokens));
      const text = toRgb(resolve(`--tag-${tag}-foreground`, tokens));
      for (const surface of SURFACES) {
        for (const alpha of TINTS) {
          const fill = composite(tint, alpha, toRgb(resolve(surface, tokens)));
          const ratio = contrast(text, fill);
          if (ratio < 4.5) failures.push(`${theme} ${tag} on ${surface} @${alpha * 100}%: ${ratio.toFixed(2)}:1`);
        }
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    "A tag Badge's fill is a translucent tint, so its text pair is a function of whatever surface it lands on, " +
      "and a consumer whose surface was never measured forks the pair into hexes it then has to maintain by " +
      "hand (fiestaboard.github.io's `.newBadge` !important pair is exactly that). Retune --tag-*-foreground " +
      "and re-run this matrix; do not push the problem downstream.",
  );
});

test("#231: the arithmetic is calibrated against theme.css's own published ratios", () => {
  // If this drifts, every number above is fiction. --brand on --background is
  // documented as 5.08-5.09:1 light and 9.63:1 dark; --primary as 1.83:1 light.
  const near = (actual, expected) => Math.abs(actual - expected) < 0.02;
  const lightBg = toRgb(resolve("--background", lightTokens));
  const darkBg = toRgb(resolve("--background", darkTokens));
  assert.ok(near(contrast(toRgb(resolve("--brand", lightTokens)), lightBg), 5.09), "--brand light");
  assert.ok(near(contrast(toRgb(resolve("--brand", darkTokens)), darkBg), 9.63), "--brand dark");
  assert.ok(near(contrast(toRgb(resolve("--primary", lightTokens)), lightBg), 1.83), "--primary light");
});

/* ------------------------------------------------------------------ *
 * 3. #228 item 5 — one focus-ring recipe, not two
 * ------------------------------------------------------------------ */

test("#228 item 5: the focus ring recipe is declared once, as --focus-ring-shadow", () => {
  assert.ok(
    lightTokens.has("--focus-ring-shadow"),
    "theme.css must expose the focus ring as a single custom property so CSS-only consumers (MDX prose " +
      "anchors have no call site to add a class to) can write `box-shadow: var(--focus-ring-shadow)` instead " +
      "of hand-mirroring the three stops.",
  );
  assert.match(
    themeCss,
    /\.focus-ring:focus-visible\s*\{[^}]*box-shadow:\s*var\(--focus-ring-shadow\)/,
    "`.focus-ring` must consume the property it publishes — a class that keeps its own copy is exactly the " +
      "drift #228 item 5 exists to close.",
  );
  const stops = themeCss.match(/0 0 0 3px var\(--ring\)/g) ?? [];
  assert.equal(stops.length, 1, "the three-stop ring geometry is written more than once in theme.css");
});

/* ------------------------------------------------------------------ *
 * 4. No dead ring colour, and no ring painted into a clipped box
 * ------------------------------------------------------------------ */

/**
 * A ring utility that only names a COLOUR — `focus-visible:ring-white/60`,
 * `ring-ring/50` — compiles in Tailwind v4 to `--tw-ring-color: …` and nothing
 * else. The box-shadow comes from a ring WIDTH utility (`ring`, `ring-2`,
 * `ring-[3px]`). A colour with no width anywhere paints nothing, which is how
 * `lightbox.tsx` kept a `focus-visible:ring-white/60` override that read as a
 * deliberate design decision after `OverlayClose` moved to `.focus-ring` —
 * whose box-shadow reads `--focus-ring-shadow`, not `--tw-ring-color`.
 *
 * Deliberately a FILE-level check, not a per-class-string one: cva splits one
 * control's classes across several string literals (checkbox.tsx spells the
 * width and the invalid-state ring colour on different lines), so a per-literal
 * rule would be all false positives. That makes this a floor, not a ceiling —
 * it catches the whole-file case the Lightbox hit, and cannot catch a dead
 * colour in a file that rings something else.
 */
const RING_UTILITY = /(?<![\w-])ring-[\w./[\]-]+/g;
const RING_WIDTH = /^ring-(?:0|1|2|4|8|\[[\d.]+(?:px|rem|em)\])$/;
const RING_NON_COLOR = /^ring-(?:inset|offset-)/;

test("#238: no ring colour without a ring width to paint it", () => {
  const dead = [];
  for (const [file, source] of sources) {
    if (/(?<![\w-:])ring(?![\w-])/.test(source)) continue; // the bare `ring` utility is a 1px ring
    const utilities = [...source.matchAll(RING_UTILITY)].map((m) => m[0]);
    if (utilities.some((u) => RING_WIDTH.test(u))) continue;
    const colours = utilities.filter((u) => !RING_WIDTH.test(u) && !RING_NON_COLOR.test(u));
    if (colours.length > 0) dead.push(`${file}: ${[...new Set(colours)].join(", ")}`);
  }
  assert.deepEqual(
    dead,
    [],
    "these files set --tw-ring-color and never emit a box-shadow, so the override paints nothing while " +
      "looking like it works. Either add a ring width, or delete the colour and let the shared `.focus-ring` " +
      "recipe show through.",
  );
});

/**
 * `ScrollArea`'s viewport is a `tabIndex={0}` tab stop inside an
 * `overflow-hidden` Root that it fills exactly, so an OUTSET ring on the
 * viewport — `.focus-ring`, or the `focus-visible:ring-[3px]` before it — is
 * clipped away in full and the control has no visible focus indicator at all
 * (SC 2.4.7). The indicator therefore belongs on the Root, keyed to the
 * viewport's focus. Asserted because both spellings LOOK fixed at the call
 * site; only the parent's overflow says otherwise.
 */
test("#238: ScrollArea draws its focus ring on the Root, not inside the clipped viewport", () => {
  const source = sources.get("src/components/containment/scroll-area.tsx");
  assert.ok(source, "scroll-area.tsx moved — repoint this test");
  assert.doesNotMatch(
    source,
    /(?<![\w-])focus-ring(?![\w-])/,
    "`.focus-ring` is an outset box-shadow and every element in this file sits inside the Root's " +
      "`overflow-hidden`, so it would be clipped to nothing.",
  );
  assert.match(
    source,
    /has-\[\[data-slot=scroll-area-viewport\]:focus-visible\]:shadow-\[var\(--focus-ring-shadow\)\]/,
    "the Root must carry the ring on the viewport's focus, and it must read the published " +
      "`--focus-ring-shadow` (#228 item 5) rather than re-spelling the three stops.",
  );
});

/* ------------------------------------------------------------------ *
 * 4. #228 item 1 — the nav tokens, which had no gate at all
 *
 * `--nav-active-hover` is the last translucent token in chrome, and it was
 * the only one the matrix above never reached. That gap let a MEASUREMENT
 * error survive two majors in the file that argues hardest about ratios:
 * the four ratios documented beside the token were computed by mixing
 * LUMINANCES (a linear-space composite) rather than channel values.
 *
 * Browsers composite in gamma space. So does `composite()` above — its own
 * comment says so. The two methods agree when ink and ground are close in
 * luminance and diverge sharply when they are far apart, which is why only
 * the DARK-surface figures were wrong, and why they were wrong in the
 * flattering direction:
 *
 *     dark page   documented 3.36:1   actually 1.39:1
 *     dark rail   documented 3.07:1   actually 1.53:1
 *     light page  documented 1.15:1   actually 1.35:1
 *     light rail  documented 1.15:1   actually 1.35:1
 *
 * These are characterization assertions, not a threshold: a hover tint is a
 * supporting cue, and the state itself is carried by the opaque --nav-active
 * pill asserted below. Their job is to stop the numbers drifting silently
 * again, and to fail loudly if someone recomputes them the linear way.
 * ------------------------------------------------------------------ */

/**
 * Every mix percentage theme.css declares for --nav-active-hover, read from
 * the stylesheet rather than restated here.
 *
 * A literal would make this block measure a number the package no longer
 * ships: retuning the token would leave every assertion below green while
 * the rendered tint moved. There are two tiers on purpose — the resting mix
 * and the `prefers-contrast: more` lift — and both are measured, because the
 * high-contrast tier is the one that has already shipped a regression once
 * (see the active-pill test below).
 */
function declaredHoverMixes() {
  const found = new Map();
  for (const m of themeCss.matchAll(
    /--nav-active-hover:\s*color-mix\(\s*in oklch\s*,\s*var\(\s*(--[\w-]+)\s*\)\s*([\d.]+)%/g,
  )) {
    const alpha = Number(m[2]) / 100;
    if (!found.has(alpha)) found.set(alpha, new Set());
    found.get(alpha).add(m[1]);
  }
  return found;
}

test("#228 item 1: --nav-active-hover ships exactly the two tiers this file measures", () => {
  const mixes = declaredHoverMixes();
  assert.deepEqual(
    [...mixes.keys()].sort((a, b) => a - b),
    [0.14, 0.24],
    "the resting tint and its prefers-contrast lift are the two mixes measured below; if a third appears, or " +
      "one of these is retuned, add or update its row in NAV_HOVER_CASES rather than letting it go unmeasured",
  );
  for (const [alpha, inks] of mixes) {
    assert.deepEqual(
      [...inks].sort(),
      ["--foreground", "--sidebar-foreground"],
      `the ${alpha * 100}% tier must be declared for BOTH the page and the rail — a custom property substitutes ` +
        "var() on the element it is declared on, so a tier declared only at :root resolves against page ink and " +
        "then inherits that already-resolved value onto the rail",
    );
  }
});

/*
 * The rail RE-DECLARES the token from --sidebar-foreground in
 * `.sidebar-gradient`, for the substitution reason above. So the rail rows
 * name --sidebar-foreground / --sidebar; measuring them off :root would
 * silently measure the page's mix twice and call it rail coverage.
 *
 * [label, tokens, ink, surface, ratio @14%, ratio @24%]
 */
const NAV_HOVER_CASES = [
  ["dark page", () => darkTokens, "--foreground", "--background", 1.392, 1.97],
  ["light page", () => lightTokens, "--foreground", "--background", 1.352, 1.715],
  ["dark rail", () => darkTokens, "--sidebar-foreground", "--sidebar", 1.533, 2.161],
  ["light rail", () => lightTokens, "--sidebar-foreground", "--sidebar", 1.346, 1.702],
];

test("#228 item 1: --nav-active-hover measures what theme.css says it measures", () => {
  const drift = [];
  for (const [label, getTokens, ink, surface, resting, lifted] of NAV_HOVER_CASES) {
    const tokens = getTokens();
    const bg = toRgb(resolve(surface, tokens));
    const fg = toRgb(resolve(ink, tokens));
    for (const [alpha, expected] of [
      [0.14, resting],
      [0.24, lifted],
    ]) {
      const actual = contrast(composite(fg, alpha, bg), bg);
      if (Math.abs(actual - expected) > 0.02) {
        drift.push(`${label} @${alpha * 100}%: documented ${expected}:1, measured ${actual.toFixed(3)}:1`);
      }
    }
  }
  assert.deepEqual(
    drift,
    [],
    "The hover tint moved, or was recomputed the wrong way. Browsers composite alpha in GAMMA space — mix the " +
      "channel values, not the luminances. Mixing luminances overstates the tint on dark surfaces by ~2.4x, " +
      "which is exactly the error this test was added to catch. Update theme.css's comments and these " +
      "expectations together, and only after re-measuring with composite() above.",
  );
});

test("#228 item 1: mixing luminances is not the same as compositing, on a dark surface", () => {
  // Guards the guard: if this ever stops holding, the two methods have
  // converged and the test above has stopped discriminating between them.
  const bg = toRgb(resolve("--background", darkTokens));
  const ink = toRgb(resolve("--foreground", darkTokens));
  const alpha = 0.14;
  const gamma = contrast(composite(ink, alpha, bg), bg);

  const mixedLuminance = alpha * luminance(ink) + (1 - alpha) * luminance(bg);
  const linear = (mixedLuminance + 0.05) / (luminance(bg) + 0.05);

  assert.ok(
    linear > gamma * 2,
    `the linear-composite model should still overstate the dark-page tint (gamma ${gamma.toFixed(3)}, ` +
      `linear ${linear.toFixed(3)}) — if it no longer does, the pinned numbers above prove less than they claim`,
  );
});

test("#228 item 1: the active nav pill clears AA in both themes", () => {
  // Unlike the hover tint this one IS a threshold: --nav-active is an opaque
  // fill and --nav-active-foreground is the label on it, so it is ordinary
  // text contrast (SC 1.4.3). This is the pair the `prefers-contrast: more`
  // retune inverted in 4.0.0 — it lifted the fill assuming board ink under
  // it, which took the docs site's light-mode label to 1.40:1 for the users
  // who had explicitly asked for MORE contrast.
  const failures = [];
  for (const [theme, tokens] of [
    ["light", lightTokens],
    ["dark", darkTokens],
  ]) {
    const ratio = contrast(toRgb(resolve("--nav-active-foreground", tokens)), toRgb(resolve("--nav-active", tokens)));
    if (ratio < 4.5) failures.push(`${theme}: ${ratio.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, [], "--nav-active-foreground on --nav-active must clear 4.5:1 (SC 1.4.3)");
});
