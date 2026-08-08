import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard for #92: the content root (<main id="main-content"> and any wrapper
// rendered by main-content.tsx) must never transition layout-triggering
// properties (width/padding/margin/left/...). Every padding/width change on
// the content root relayouts the entire page subtree per animation frame
// (~18 full layout passes per sidebar toggle at 300ms/60fps). Only
// compositor-friendly properties (transform, opacity) may transition there.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const themeCss = readFileSync(join(root, "src", "styles", "theme.css"), "utf8");
const mainContentTsx = readFileSync(join(root, "src", "components", "chrome", "main-content.tsx"), "utf8");

const COMPOSITOR_SAFE = new Set(["transform", "opacity", "none"]);

/** All class names referenced anywhere in main-content.tsx (the content root). */
function classIsUsedByContentRoot(className) {
  return new RegExp(`(^|[^\\w-])${className}($|[^\\w-])`).test(mainContentTsx);
}

/**
 * Flat { selector -> [declaration blocks] } map of theme.css. The naive
 * regex intentionally matches innermost rules only, so rules nested inside
 * @media blocks are still captured with their own selectors.
 */
function cssRules(css) {
  const rules = new Map();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@")) continue;
    const existing = rules.get(selector) ?? [];
    existing.push(match[2]);
    rules.set(selector, existing);
  }
  return rules;
}

/** transition-property names from a declaration block's transition shorthand. */
function transitionedProperties(declarations) {
  const props = [];
  for (const decl of declarations.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
    for (const segment of decl[1].split(",")) {
      const first = segment.trim().split(/\s+/)[0];
      if (first) props.push(first);
    }
  }
  return props;
}

test("classes used by the content root never transition layout properties", () => {
  const offenders = [];
  let checkedSelectors = 0;
  for (const [selector, blocks] of cssRules(themeCss)) {
    const classNames = [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    if (!classNames.some((c) => classIsUsedByContentRoot(c))) continue;
    checkedSelectors += 1;
    for (const block of blocks) {
      for (const prop of transitionedProperties(block)) {
        if (!COMPOSITOR_SAFE.has(prop)) {
          offenders.push(`${selector} transitions "${prop}"`);
        }
      }
    }
  }
  assert.ok(checkedSelectors > 0, "expected theme.css rules matching classes used in main-content.tsx");
  assert.deepEqual(
    offenders,
    [],
    `content-root classes must only transition ${[...COMPOSITOR_SAFE].join("/")} (#92):\n${offenders.join("\n")}`,
  );
});

test("the content root slides via a transform-transitioning class", () => {
  // The compositor-only mechanism: main-content.tsx must reference a class
  // whose theme.css rule transitions transform (the FLIP slide, #92).
  const rules = cssRules(themeCss);
  const transformTransitioningClasses = [];
  for (const [selector, blocks] of rules) {
    for (const block of blocks) {
      if (transitionedProperties(block).includes("transform")) {
        for (const m of selector.matchAll(/\.([\w-]+)/g)) transformTransitioningClasses.push(m[1]);
      }
    }
  }
  assert.ok(
    transformTransitioningClasses.some((c) => classIsUsedByContentRoot(c)),
    "main-content.tsx must use a class that transitions transform (compositor-only slide)",
  );
});
