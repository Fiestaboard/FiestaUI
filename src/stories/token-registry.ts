/**
 * Token registry for `Design System/Inventory → ColorTokens` (issue #169).
 *
 * The old story hand-listed eight swatches. Anything added to `theme.css`
 * after it was written silently never appeared, so the system's own palette
 * reference documented 8 of ~30 tokens.
 *
 * The fix is to stop hand-listing. This module is the single source of the
 * swatch list, and it *derives* that list from `theme.css` itself:
 *
 *   - the story imports `src/styles/theme.css?raw` and calls
 *     `buildColorTokenRegistry()` on it, then reads each token's live value
 *     with `getComputedStyle` (so the values follow the active theme);
 *   - `scripts/ci/tests/token-registry.test.mjs` calls the *same* function on
 *     the *same* file from Node and asserts the partition is total.
 *
 * Because both sides run this one parser over the one stylesheet, a token
 * added to (or deleted from) `:root` changes the story with no edit here.
 * Nothing in this file names an individual token, so a deleted token cannot
 * leave a dangling reference behind. Groups are matched by *family prefix*,
 * so a new member of an existing family lands in the right section
 * automatically, and anything unrecognised still renders — under "Other" —
 * rather than disappearing.
 *
 * ## Scope: colour tokens only
 *
 * `:root` also declares font stacks, the radius scale, motion tokens, the
 * z-index scale and elevation shadows. A "Color Token Inventory" that showed
 * a swatch for `--z-tooltip` would be nonsense, so the registry covers colour
 * tokens only — but membership is decided by *value*, not by name: a
 * declaration is a colour iff its whole value is a single colour literal
 * (`#hex`, `oklch(...)`, `color-mix(...)`, a named colour, or a `var()` chain
 * that ends at one of those). That is what makes the scope non-brittle: a new
 * `--foo: oklch(...)` is classified as colour without anyone updating a list,
 * and `--elevation-card: 0 1px 2px rgb(...)` is not a colour even though it
 * contains `rgb(`, because the value as a whole is a shadow.
 *
 * The non-colour remainder is not ignored either: every non-colour token must
 * fall into one of the documented categories below, and the CI test fails on
 * anything that matches neither. So a genuinely new *kind* of token still
 * forces a decision instead of vanishing.
 */

/** One `--name: value` declaration read out of a `:root` block. */
export type TokenDeclaration = {
  name: string;
  /** Verbatim declared value, e.g. `oklch(0.13 0 0)` or `var(--fiesta-red)`. */
  value: string;
  /** `value` with any `var()` chain followed within `:root`. */
  resolved: string;
};

/** A colour token plus everything the story needs to render its row. */
export type ColorToken = TokenDeclaration & {
  groupId: string;
  /**
   * The token this one is meant to be seen against. Foreground tokens pair
   * with their surface; surfaces pair with their `-foreground`, or with the
   * page text/background colour when they have none.
   */
  pairedWith: string;
  /** True when this token is the text half of the pair. */
  isForeground: boolean;
  /**
   * Which WCAG threshold the pairing should be judged against. Hairlines,
   * focus rings and gradient stops never carry text, so grading them at the
   * 4.5:1 text threshold would print a scary red "fail" next to a border
   * that is deliberately a 10% tint — the 3:1 non-text threshold (WCAG 1.4.11)
   * is the one that applies.
   */
  contrastBasis: "text" | "non-text";
};

export type TokenGroup = {
  id: string;
  title: string;
  description: string;
  tokens: ColorToken[];
};

export type NonColorToken = TokenDeclaration & { categoryId: string; categoryLabel: string };

export type TokenRegistry = {
  /** Every `:root` declaration, in stylesheet order. */
  declarations: TokenDeclaration[];
  /**
   * THE swatch list — the single array the story renders from. Derived, never
   * hand-maintained.
   */
  colorTokens: ColorToken[];
  /** `colorTokens` bucketed into ordered, non-empty sections. */
  groups: TokenGroup[];
  /** Declarations deliberately outside the colour registry, with their reason. */
  nonColorTokens: NonColorToken[];
  /** Non-colour declarations matching no documented category. CI fails if non-empty. */
  unclassified: TokenDeclaration[];
  /** The radius role scale, in stylesheet order (replaces the old `default/md/sm/full` row). */
  radiusTokens: TokenDeclaration[];
};

/* ------------------------------------------------------------------ *
 * CSS parsing
 * ------------------------------------------------------------------ */

const COMMENT = /\/\*[\s\S]*?\*\//g;

/** Returns the body of every top-level `:root { ... }` block, comments stripped. */
function rootBlocks(css: string): string[] {
  const stripped = css.replace(COMMENT, "");
  const blocks: string[] = [];
  const selector = /(^|[};])\s*:root\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = selector.exec(stripped)) !== null) {
    let depth = 1;
    let i = selector.lastIndex;
    for (; i < stripped.length && depth > 0; i += 1) {
      if (stripped[i] === "{") depth += 1;
      else if (stripped[i] === "}") depth -= 1;
    }
    blocks.push(stripped.slice(selector.lastIndex, i - 1));
    selector.lastIndex = i;
  }
  return blocks;
}

/** Splits a declaration block on top-level `;`, ignoring those inside `()` or quotes. */
function splitDeclarations(block: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i];
    if (quote) {
      if (ch === quote && block[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === ";" && depth === 0) {
      out.push(block.slice(start, i));
      start = i + 1;
    }
  }
  out.push(block.slice(start));
  return out;
}

const VAR_ONLY = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([\s\S]*))?\)$/;

/** Follows a `var()`-only value through the declarations of the same block. */
function resolveVarChain(value: string, byName: Map<string, string>, seen = new Set<string>()): string {
  const trimmed = value.trim();
  const match = VAR_ONLY.exec(trimmed);
  if (!match) return trimmed;
  const [, ref, fallback] = match;
  const target = byName.get(ref);
  if (target !== undefined && !seen.has(ref)) {
    seen.add(ref);
    return resolveVarChain(target, byName, seen);
  }
  return fallback === undefined ? trimmed : resolveVarChain(fallback, byName, seen);
}

/**
 * Every custom property declared in `theme.css`'s `:root`, in source order.
 * Later re-declarations of the same name win, as they do in CSS.
 */
export function parseRootDeclarations(css: string): TokenDeclaration[] {
  const byName = new Map<string, string>();
  const order: string[] = [];
  for (const block of rootBlocks(css)) {
    for (const decl of splitDeclarations(block)) {
      const colon = decl.indexOf(":");
      if (colon === -1) continue;
      const name = decl.slice(0, colon).trim();
      if (!name.startsWith("--")) continue;
      if (!byName.has(name)) order.push(name);
      byName.set(name, decl.slice(colon + 1).trim());
    }
  }
  return order.map((name) => {
    const value = byName.get(name) as string;
    return { name, value, resolved: resolveVarChain(value, byName) };
  });
}

/* ------------------------------------------------------------------ *
 * Colour classification (by value, not by name)
 * ------------------------------------------------------------------ */

const COLOR_FUNCTIONS = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
  "light-dark",
]);

const NAMED_COLORS = new Set(["transparent", "currentcolor", "white", "black"]);

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** True when the value *in its entirety* is one colour literal. */
export function isColorValue(value: string): boolean {
  const v = value.trim();
  if (v === "") return false;
  if (HEX.test(v)) return true;
  if (NAMED_COLORS.has(v.toLowerCase())) return true;

  const open = v.indexOf("(");
  if (open === -1 || !v.endsWith(")")) return false;
  const fn = v.slice(0, open).trim().toLowerCase();
  if (!COLOR_FUNCTIONS.has(fn)) return false;

  // The opening paren must close only at the very end, otherwise this is a
  // list (`rgb(...) , rgb(...)`) or a shadow, not a single colour.
  let depth = 0;
  for (let i = open; i < v.length; i += 1) {
    if (v[i] === "(") depth += 1;
    else if (v[i] === ")") {
      depth -= 1;
      if (depth === 0) return i === v.length - 1;
    }
  }
  return false;
}

/**
 * The kinds of `:root` token that are deliberately NOT colour swatches.
 * Every non-colour declaration must match one of these; the CI test fails on
 * anything left over, so a new *category* of token can't slip through
 * unnoticed just because it isn't a colour.
 */
export const NON_COLOR_TOKEN_CATEGORIES: ReadonlyArray<{
  id: string;
  label: string;
  matches: (name: string) => boolean;
}> = [
  { id: "font", label: "Font stacks", matches: (n) => n.startsWith("--font-") },
  { id: "radius", label: "Radius role scale", matches: (n) => n === "--radius" || n.startsWith("--radius-") },
  { id: "motion", label: "Motion durations & easings", matches: (n) => n.startsWith("--motion-") },
  { id: "z", label: "Z-index layer scale", matches: (n) => n.startsWith("--z-") },
  { id: "elevation", label: "Elevation shadows", matches: (n) => n.startsWith("--elevation-") },
];

/* ------------------------------------------------------------------ *
 * Grouping — by family prefix, so new family members self-file
 * ------------------------------------------------------------------ */

const family =
  (...prefixes: string[]) =>
  (name: string) =>
    prefixes.some((p) => name === `--${p}` || name.startsWith(`--${p}-`));

const GROUP_DEFINITIONS: ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  matches: (name: string) => boolean;
  /** Tokens here are drawn *on* the page background rather than carrying text. */
  pairsWithBackground?: boolean;
}> = [
  {
    id: "surface",
    title: "Surfaces & text",
    description: "The page, cards, popovers and the text that sits on them.",
    matches: family("background", "foreground", "card", "popover", "overlay"),
  },
  {
    id: "action",
    title: "Actions & emphasis",
    description: "Button, badge and hover fills, plus the subdued and destructive scales.",
    matches: family("primary", "secondary", "accent", "muted", "destructive"),
  },
  {
    id: "brand",
    title: "Brand",
    description: "FiestaBoard orange — links, the wordmark, and the tile the primary button fills with.",
    matches: family("brand"),
  },
  {
    id: "hue",
    title: "The six board hues",
    description:
      "The hardware's six inks at an ink lightness, for icons, rules and text. The raw tiles cannot do this job: board yellow is 1.15:1 on light paper.",
    matches: family("hue"),
  },
  {
    id: "status",
    title: "Status & intent",
    description: "Success, warning and info surfaces with their paired text colour.",
    matches: family("success", "warning", "info"),
  },
  {
    id: "control",
    title: "Borders, inputs & focus",
    description: "Hairlines and focus rings. These are drawn on the background, so they are measured against it.",
    matches: family("border", "input", "ring"),
    pairsWithBackground: true,
  },
  {
    id: "nav",
    title: "Navigation active state",
    description: "Indigo palette for the current route.",
    matches: family("nav-active"),
  },
  {
    id: "sidebar",
    title: "Sidebar",
    description: "The sidebar shell has its own surface scale so it can sit slightly off the page background.",
    matches: family("sidebar"),
  },
  {
    id: "tag",
    title: "Tags",
    description: "Formula-editor token chips.",
    matches: family("tag"),
  },
  {
    id: "category",
    title: "Plugin categories",
    description: "One hue per plugin category, shared by the marketplace and the docs directory.",
    matches: family("category"),
  },
  {
    id: "chart",
    title: "Charts",
    description: "Categorical series colours.",
    matches: family("chart"),
  },
  {
    id: "gradient",
    title: "Gradient palette",
    description: "Stops for the sidebar aurora and the page icon gradient.",
    matches: family("fiesta", "icon-g1", "icon-g2", "icon-g3", "icon-g4", "icon-g5", "icon-g6"),
    pairsWithBackground: true,
  },
  {
    id: "other",
    title: "Other",
    description: "Colour tokens that do not belong to a known family yet. Give them a group in token-registry.ts.",
    matches: () => true,
    pairsWithBackground: true,
  },
];

const FOREGROUND_SUFFIX = "-foreground";

function pairFor(
  name: string,
  names: Set<string>,
  pairsWithBackground: boolean,
): Pick<ColorToken, "pairedWith" | "isForeground" | "contrastBasis"> {
  const own = `${name}${FOREGROUND_SUFFIX}`;
  if (names.has(own)) return { pairedWith: own, isForeground: false, contrastBasis: "text" };
  if (name.endsWith(FOREGROUND_SUFFIX)) {
    const base = name.slice(0, -FOREGROUND_SUFFIX.length);
    const pairedWith = names.has(base) ? base : "--background";
    return { pairedWith, isForeground: true, contrastBasis: "text" };
  }
  return pairsWithBackground
    ? { pairedWith: "--background", isForeground: false, contrastBasis: "non-text" }
    : { pairedWith: "--foreground", isForeground: false, contrastBasis: "text" };
}

/* ------------------------------------------------------------------ *
 * The registry
 * ------------------------------------------------------------------ */

/**
 * Builds the whole registry from `theme.css` source text.
 *
 * Pure and DOM-free on purpose: the story feeds it `theme.css?raw` in the
 * browser and the CI test feeds it `readFileSync(theme.css)` in Node, so the
 * two can never disagree about what the palette contains.
 */
export function buildColorTokenRegistry(css: string): TokenRegistry {
  const declarations = parseRootDeclarations(css);
  const names = new Set(declarations.map((d) => d.name));

  const colorTokens: ColorToken[] = [];
  const nonColorTokens: NonColorToken[] = [];
  const unclassified: TokenDeclaration[] = [];

  for (const declaration of declarations) {
    if (isColorValue(declaration.resolved)) {
      const group = GROUP_DEFINITIONS.find((g) => g.matches(declaration.name)) as (typeof GROUP_DEFINITIONS)[number];
      colorTokens.push({
        ...declaration,
        groupId: group.id,
        ...pairFor(declaration.name, names, group.pairsWithBackground === true),
      });
      continue;
    }
    const category = NON_COLOR_TOKEN_CATEGORIES.find((c) => c.matches(declaration.name));
    if (category) nonColorTokens.push({ ...declaration, categoryId: category.id, categoryLabel: category.label });
    else unclassified.push(declaration);
  }

  const groups = GROUP_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    tokens: colorTokens.filter((t) => t.groupId === definition.id),
  })).filter((group) => group.tokens.length > 0);

  const radiusTokens = declarations.filter((d) => d.name === "--radius" || d.name.startsWith("--radius-"));

  return { declarations, colorTokens, groups, nonColorTokens, unclassified, radiusTokens };
}

/* ------------------------------------------------------------------ *
 * Runtime colour resolution (browser only)
 * ------------------------------------------------------------------ */

export type Rgb = { r: number; g: number; b: number };

let cachedContext: CanvasRenderingContext2D | null | undefined;

function canvasContext(): CanvasRenderingContext2D | null {
  if (cachedContext !== undefined) return cachedContext;
  if (typeof document === "undefined") {
    cachedContext = null;
    return cachedContext;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  cachedContext = canvas.getContext("2d", { willReadFrequently: true });
  return cachedContext;
}

/** True when the 2D canvas accepts `value` as a colour (so `oklch()`, `#rgb`, …). */
function isPaintable(ctx: CanvasRenderingContext2D, value: string): boolean {
  ctx.fillStyle = "#000000";
  ctx.fillStyle = value;
  const fromBlack = ctx.fillStyle;
  ctx.fillStyle = "#ffffff";
  ctx.fillStyle = value;
  return fromBlack === ctx.fillStyle;
}

/**
 * Paints `value` (optionally over `backdrop`) on a 1×1 canvas and reads the
 * pixel back, which resolves *any* CSS colour syntax the browser supports and
 * composites alpha for free — `--border: oklch(1 0 0 / 10%)` comes back as the
 * colour a reader actually sees, not as a number that needs alpha maths.
 */
export function resolveColor(value: string, backdrop?: Rgb): Rgb | null {
  const ctx = canvasContext();
  if (!ctx || !isPaintable(ctx, value)) return null;
  ctx.clearRect(0, 0, 1, 1);
  if (backdrop) {
    ctx.fillStyle = `rgb(${backdrop.r} ${backdrop.g} ${backdrop.b})`;
    ctx.fillRect(0, 0, 1, 1);
  }
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.2 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.2 contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
