import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guards issue #71: theme.css must not re-grow the dead animation CSS that
 * was deleted in the css-paint-budget cleanup.
 *
 * Two classes of dead code are banned by name:
 *
 * 1. Keyframes that NEVER shipped — tw-animate-css (imported first in
 *    theme.css) registers @theme keyframes with the same names, and the
 *    Tailwind v4 build emits exactly one @keyframes per name (tw-animate's).
 *    theme.css's `accordion-down`/`accordion-up` (grid-template-rows
 *    technique) and `enter`/`exit` were silently discarded at build time.
 *
 * 2. Keyframes + plain utility classes with zero references in src/
 *    (components and stories): fade-in/fade-out and the 8 slide-* pairs,
 *    plus the bare `.animate-in`/`.animate-out`/`.fade-in-0`/`.fade-out-0`/
 *    `.slide-*` utility rules that only referenced them. All shipped usage
 *    is variant-prefixed (e.g. `data-[open]:animate-in`), which resolves to
 *    tw-animate's generated utilities, not these plain rules.
 *
 * The bare `.animate-accordion-down`/`.animate-accordion-up` CLASSES are
 * deliberately kept (they now resolve to tw-animate's keyframes, exactly as
 * shipped before the cleanup) — only the colliding keyframes are banned.
 */

const themeCssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "src",
  "styles",
  "theme.css",
);
const themeCss = readFileSync(themeCssPath, "utf8");

// Exact names of the removed dead code — hardcoded on purpose.
const BANNED_KEYFRAMES = [
  // Colliding with tw-animate-css @theme keyframes; never shipped.
  "accordion-down",
  "accordion-up",
  "enter",
  "exit",
  // Zero references in src/ (including stories).
  "fade-in",
  "fade-out",
  "slide-in-from-right",
  "slide-out-to-right",
  "slide-in-from-left",
  "slide-out-to-left",
  "slide-in-from-top",
  "slide-out-to-top",
  "slide-in-from-bottom",
  "slide-out-to-bottom",
];

const BANNED_UTILITY_CLASSES = [
  ".animate-in",
  ".animate-out",
  ".fade-in-0",
  ".fade-out-0",
  ".slide-in-from-right",
  ".slide-out-to-right",
  ".slide-in-from-left",
  ".slide-out-to-left",
  ".slide-in-from-top",
  ".slide-out-to-top",
  ".slide-in-from-bottom",
  ".slide-out-to-bottom",
];

const declaredKeyframes = [...themeCss.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);

test("theme.css declares no keyframes that collide with tw-animate-css or are unreferenced", () => {
  for (const name of BANNED_KEYFRAMES) {
    assert.ok(
      !declaredKeyframes.includes(name),
      `theme.css declares dead @keyframes ${name} (issue #71): either it collides with ` +
        `tw-animate-css and never ships, or nothing in src/ references it. ` +
        `Use a fui- prefix (and wire it up) if the animation is really wanted.`,
    );
  }
});

test("theme.css declares no dead bare animation utility classes", () => {
  for (const selector of BANNED_UTILITY_CLASSES) {
    // Match the selector as a whole class token at a rule boundary so kept
    // classes like .animate-card-fade-in and .animate-accordion-down never
    // false-positive.
    const pattern = new RegExp(`${selector.replace(/[.\-]/g, "\\$&")}\\s*[,{]`);
    assert.ok(
      !pattern.test(themeCss),
      `theme.css declares dead utility ${selector} (issue #71): zero references in src/. ` +
        `Shipped components use tw-animate's variant-prefixed utilities instead.`,
    );
  }
});

test("the keyframes that ARE referenced survived the cleanup", () => {
  // Spot-check the live neighbors so an over-eager deletion fails loudly.
  for (const name of [
    "sheet-overlay-in",
    "sheet-slide-in-right",
    "sheet-slide-in-left",
    "sheet-slide-in-top",
    "sheet-slide-in-bottom",
    "pride-burst",
    "card-fade-in",
    "sidebar-gradient-flow",
  ]) {
    assert.ok(declaredKeyframes.includes(name), `expected live @keyframes ${name} to remain in theme.css`);
  }
});

test("the bare accordion animation classes are kept as-shipped", () => {
  // They resolve to tw-animate's accordion keyframes (the only ones that ever
  // shipped). Restoring the grid technique is a separate, visual-review PR.
  assert.ok(/\.animate-accordion-down\s*\{/.test(themeCss));
  assert.ok(/\.animate-accordion-up\s*\{/.test(themeCss));
});
