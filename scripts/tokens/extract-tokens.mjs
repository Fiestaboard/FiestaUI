#!/usr/bin/env node
// Extract FiestaUI design tokens from src/styles/theme.css into a
// platform-neutral token file (W3C Design Tokens Community Group format).
//
//   node scripts/tokens/extract-tokens.mjs [out.json]   (default: dist/tokens.json)
//
// Runs as the last step of `npm run build` and ships as
// `@fiestaboard/ui/tokens.json`. theme.css stays the single source of truth;
// tokens.json is derived from it on every build, so it can never drift. It
// feeds the FiestaUI Figma library's variables and is the input for native
// token builds (Style Dictionary → SwiftUI, Compose, XML) without anyone
// re-typing a value.
//
// Colours are authored in OKLCH. Figma, UIKit/SwiftUI and Compose all take
// sRGB, so every colour is converted here; the authored OKLCH string is kept
// under $extensions so nothing is lost, and colours that fall outside sRGB
// are flagged (and clipped) rather than silently shifted.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "src/styles/theme.css"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const outPath = resolve(root, process.argv[2] ?? "dist/tokens.json");

// ---------------------------------------------------------------- parsing

function block(selectorStart) {
  const at = css.indexOf(selectorStart);
  if (at < 0) throw new Error(`theme.css: ${selectorStart} not found`);
  const open = css.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`theme.css: unbalanced block ${selectorStart}`);
}

function declarations(body) {
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = {};
  let depth = 0,
    start = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      const decl = clean.slice(start, i).trim();
      start = i + 1;
      const m = decl.match(/^--([\w-]+)\s*:\s*([\s\S]+)$/);
      if (m) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
    }
  }
  return out;
}

const light = declarations(block("\n:root {"));
const dark = { ...light, ...declarations(block('.dark,\n[data-theme="dark"] {')) };

// ---------------------------------------------------------------- colour math

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h),
    b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const eps = 1e-4;
  const outOfGamut = lin.some((v) => v < -eps || v > 1 + eps);
  return {
    rgb: lin.map((v) => toGamma(Math.min(1, Math.max(0, v)))),
    // Extended (unclipped) sRGB: what CSS color-mix(in srgb) interpolates
    // before gamut-mapping the result. Sign-mirrored transfer function.
    ext: lin.map((v) => Math.sign(v) * toGamma(Math.abs(v))),
    outOfGamut,
  };
}

function srgbToOklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

const pct = (s) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

// Resolve a CSS colour expression to {rgb:[0-1], alpha, outOfGamut, aliasOf?}
function color(expr, vars, seen = []) {
  expr = expr.trim();
  let m;
  if ((m = expr.match(/^var\(--([\w-]+)\)$/))) {
    if (seen.includes(m[1])) throw new Error(`cycle: ${seen.join(" -> ")}`);
    if (vars[m[1]] === undefined) return null;
    const r = color(vars[m[1]], vars, [...seen, m[1]]);
    return r && { ...r, aliasOf: r.aliasOf ?? m[1] };
  }
  if (expr === "transparent") return { rgb: [0, 0, 0], alpha: 0, outOfGamut: false };
  if ((m = expr.match(/^#([0-9a-f]{6})$/i))) {
    const n = parseInt(m[1], 16);
    return { rgb: [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], alpha: 1, outOfGamut: false };
  }
  if ((m = expr.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/))) {
    const { rgb, ext, outOfGamut } = oklchToSrgb(+m[1], +m[2], +m[3]);
    return { rgb, ext, alpha: m[4] ? pct(m[4]) : 1, outOfGamut };
  }
  if ((m = expr.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/))) {
    return { rgb: [+m[1] / 255, +m[2] / 255, +m[3] / 255], alpha: m[4] ? pct(m[4]) : 1, outOfGamut: false };
  }
  // color-mix(in oklch, A p%, B) — the two forms theme.css actually uses.
  // color-mix(in srgb, A p%, B) — the T4 tints: an sRGB channel mix, which is
  // exactly the gamma-space alpha composite of A at p over B.
  if ((m = expr.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/))) {
    const p = +m[2] / 100;
    const a = color(m[1], vars, seen);
    const b = color(m[3], vars, seen);
    if (!a || !b) return null;
    // Mixed unclipped, as CSS does, then clipped once: an out-of-gamut source
    // (--info) blended over a card usually lands back inside sRGB.
    const ea = a.ext ?? a.rgb;
    const eb = b.ext ?? b.rgb;
    const mixed = ea.map((c, i) => c * p + eb[i] * (1 - p));
    return {
      rgb: mixed.map((c) => Math.min(1, Math.max(0, c))),
      alpha: a.alpha * p + b.alpha * (1 - p),
      outOfGamut: mixed.some((c) => c < -1e-4 || c > 1 + 1e-4),
    };
  }
  if ((m = expr.match(/^color-mix\(in oklch,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/))) {
    const p = +m[2] / 100;
    const a = color(m[1], vars, seen);
    if (m[3].trim() === "transparent")
      return { rgb: a.rgb, alpha: a.alpha * p, outOfGamut: a.outOfGamut, mixOf: a.aliasOf };
    const b = color(m[3], vars, seen);
    const [L1, C1, H1] = srgbToOklch(a.rgb),
      [L2, C2, H2] = srgbToOklch(b.rgb);
    let dh = H2 - H1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
    const H = C2 < 1e-4 ? H1 : C1 < 1e-4 ? H2 : H1 + dh * (1 - p);
    const r = oklchToSrgb(L1 * p + L2 * (1 - p), C1 * p + C2 * (1 - p), H);
    return { rgb: r.rgb, alpha: a.alpha * p + b.alpha * (1 - p), outOfGamut: r.outOfGamut };
  }
  return null;
}

const hex = (rgb) =>
  "#" +
  rgb
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const round = (v) => Math.round(v * 10000) / 10000;

function colorToken(name, vars) {
  const c = color(vars[name], vars);
  return {
    $type: "color",
    $value: { colorSpace: "srgb", components: c.rgb.map(round), alpha: round(c.alpha), hex: hex(c.rgb) },
    $extensions: {
      "app.fiestaboard": {
        css: `--${name}`,
        authored: vars[name],
        ...(c.aliasOf ? { aliasOf: `--${c.aliasOf}` } : {}),
        ...(c.outOfGamut ? { outOfGamut: true } : {}),
      },
    },
  };
}

function shadow(expr, vars) {
  // split on commas that are not inside parentheses
  const parts = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") depth++;
    else if (expr[i] === ")") depth--;
    else if (expr[i] === "," && depth === 0) {
      parts.push(expr.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts.map((p) => {
    p = p.trim();
    const inset = p.startsWith("inset ");
    if (inset) p = p.slice(6);
    const cm = p.match(/(oklch\([^)]*\)|rgba?\([^)]*\)|#[0-9a-f]{6}|var\([^)]*\))$/i);
    const nums = p
      .slice(0, cm.index)
      .trim()
      .split(/\s+/)
      .map((n) => parseFloat(n));
    const [offsetX, offsetY, blur = 0, spread = 0] = nums;
    const c = color(cm[1], vars);
    return {
      inset,
      offsetX,
      offsetY,
      blur,
      spread,
      color: { colorSpace: "srgb", components: c.rgb.map(round), alpha: round(c.alpha), hex: hex(c.rgb) },
    };
  });
}

// ---------------------------------------------------------------- tokens

// Colour tokens that are part of the public theme. Deprecated aliases and
// one-off internals are excluded on purpose so they don't spread to new
// platforms.
const DEPRECATED = new Set(["brand-tile", "brand-emphasis", "font-geist-sans", "font-geist-mono"]);
const colorNames = Object.keys(light).filter(
  (n) => !DEPRECATED.has(n) && color(light[n], light) !== null && !n.startsWith("icon-g"),
);

const out = {
  $description: `FiestaUI design tokens, generated from src/styles/theme.css of @fiestaboard/ui ${pkg.version}. Do not edit by hand.`,
  $extensions: { "app.fiestaboard": { package: pkg.name, version: pkg.version, modes: ["light", "dark"] } },
  color: { light: {}, dark: {} },
  radius: {},
  motion: { duration: {}, easing: {} },
  elevation: { light: {}, dark: {} },
  font: {},
  zIndex: {},
};

for (const n of colorNames) {
  out.color.light[n] = colorToken(n, light);
  out.color.dark[n] = colorToken(n, dark);
}

// Board hardware colours live in @theme as literal values: the split-flap
// pigments and the physical surfaces. They are theme-independent, so they
// get one value, not light/dark.
const themeBlock = declarations(block("@theme inline {"));
out.board = {};
for (const [n, v] of Object.entries(themeBlock)) {
  if (!n.startsWith("color-board-")) continue;
  const c = color(v, themeBlock);
  out.board[n.slice(12)] = {
    $type: "color",
    $value: { colorSpace: "srgb", components: c.rgb.map(round), alpha: round(c.alpha), hex: hex(c.rgb) },
    $extensions: { "app.fiestaboard": { css: `--${n}` } },
  };
}

const rem = 16;
const base = parseFloat(light.radius) * rem;
const radiusExpr = (v) => {
  if (v === "var(--radius)") return base;
  let m;
  if ((m = v.match(/^calc\(var\(--radius\) ([+-]) (\d+)px\)$/))) return base + (m[1] === "+" ? +m[2] : -m[2]);
  if ((m = v.match(/^(\d+)px$/))) return +m[1];
  if (v.includes("infinity")) return 9999;
  return null;
};
out.radius.base = {
  $type: "dimension",
  $value: { value: base, unit: "px" },
  $extensions: { "app.fiestaboard": { css: "--radius" } },
};
for (const [n, v] of Object.entries(light).filter(([n]) => n.startsWith("radius-"))) {
  const px = radiusExpr(v);
  if (px !== null)
    out.radius[n.slice(7)] = {
      $type: "dimension",
      $value: { value: px, unit: "px" },
      $extensions: { "app.fiestaboard": { css: `--${n}`, authored: v } },
    };
}

for (const [n, v] of Object.entries(light)) {
  if (n.startsWith("motion-duration-"))
    out.motion.duration[n.slice(16)] = {
      $type: "duration",
      $value: { value: parseFloat(v), unit: "ms" },
      $extensions: { "app.fiestaboard": { css: `--${n}` } },
    };
  if (n.startsWith("motion-ease-")) {
    const m = v.match(/cubic-bezier\(([^)]+)\)/);
    const curve = m ? m[1].split(",").map(Number) : v === "ease-out" ? [0, 0, 0.58, 1] : null;
    out.motion.easing[n.slice(12)] = {
      $type: "cubicBezier",
      $value: curve,
      $extensions: { "app.fiestaboard": { css: `--${n}`, authored: v } },
    };
  }
  if (n.startsWith("z-"))
    out.zIndex[n.slice(2)] = { $type: "number", $value: +v, $extensions: { "app.fiestaboard": { css: `--${n}` } } };
}

for (const n of ["elevation-card", "elevation-card-hover", "elevation-modal"]) {
  const key = n.slice(10);
  out.elevation.light[key] = {
    $type: "shadow",
    $value: shadow(light[n], light),
    $extensions: { "app.fiestaboard": { css: `--${n}` } },
  };
  out.elevation.dark[key] = {
    $type: "shadow",
    $value: shadow(dark[n], dark),
    $extensions: { "app.fiestaboard": { css: `--${n}` } },
  };
}

const family = (v) => v.match(/"([^"]+?)(?: Variable)?"/)[1];
out.font.sans = {
  $type: "fontFamily",
  $value: family(light["font-sans-stack"]),
  $extensions: { "app.fiestaboard": { css: "--font-sans-stack" } },
};
out.font.mono = {
  $type: "fontFamily",
  $value: family(light["font-mono-stack"]),
  $extensions: { "app.fiestaboard": { css: "--font-mono-stack" } },
};

// T1 Metrics (slice 1.1): platform-agnostic sizes in CSS px. The Android
// export maps touch-target to 48dp (G6); that mapping belongs to the native
// token build, so the value here is the web one.
out.metrics = {};
for (const [n, v] of Object.entries(light)) {
  if (!/^(touch-target|control-h-|toolbar-h-|sheet-grabber-)/.test(n)) continue;
  const m = v.match(/^([\d.]+)px$/);
  if (!m) throw new Error(`theme.css: metric --${n} must be a px length, got ${v}`);
  out.metrics[n] = {
    $type: "dimension",
    $value: { value: +m[1], unit: "px" },
    $extensions: { "app.fiestaboard": { css: `--${n}` } },
  };
}

// T6 Display/* and T8 Mono/editor/* (slice 1.1) as DTCG typography. They live
// in @theme as Tailwind text utilities (`--text-x` plus `--text-x--line-height`
// and friends); the family comes from which scale they belong to, the same
// pairing the @utility blocks in theme.css make.
out.typography = {};
const length = (v) => {
  const m = v.match(/^(-?[\d.]+)(rem|px|em)$/);
  if (!m) throw new Error(`theme.css: expected a length, got ${v}`);
  if (m[2] === "rem") return { value: +m[1] * rem, unit: "px" };
  return { value: +m[1], unit: m[2] };
};
// DTCG lineHeight is a multiplier: a unitless value passes through, a length
// becomes its ratio to the font size (the editor styles set whole-px boxes).
const ratio = (lh, size) =>
  /^[\d.]+$/.test(lh) ? +lh : Math.round((length(lh).value / length(size).value) * 10000) / 10000;
for (const [n, v] of Object.entries(themeBlock)) {
  const m = n.match(/^text-((display|mono-editor)-[\w]+)$/);
  if (!m) continue;
  const sub = (k) => themeBlock[`${n}--${k}`];
  out.typography[m[1]] = {
    $type: "typography",
    $value: {
      fontFamily: m[2] === "display" ? "{font.sans}" : "{font.mono}",
      fontSize: length(v),
      fontWeight: +sub("font-weight"),
      lineHeight: ratio(sub("line-height"), v),
      letterSpacing: length(sub("letter-spacing")),
    },
    $extensions: { "app.fiestaboard": { css: `--${n}`, utility: n } },
  };
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
const oog = Object.entries(out.color.light)
  .concat(Object.entries(out.color.dark))
  .filter(([, t]) => t.$extensions["app.fiestaboard"].outOfGamut);
console.log(
  `wrote ${outPath}: ${colorNames.length} colours x 2 modes, ${Object.keys(out.radius).length} radii, ${oog.length} out-of-sRGB`,
);
for (const [n] of oog) console.log(`  out of sRGB gamut (clipped): --${n}`);
