import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #89: ThemeToggle must not use a client-side
// mounted gate (double render + DOM swap per instance). SSR safety comes from
// rendering EVERY icon and selecting visibility via CSS, so server and client
// markup differ at most by one attribute value.
//
// Issue #221 added a second CSS signal — the ancestor `.dark` class — for
// statically rendered sites, whose server cannot know the visitor's theme and
// so bakes the wrong `data-resolved-theme` into the HTML. That signal and the
// prop-driven one CAN disagree (a story hardcoding theme="dark" under a light
// root; VRT caught exactly that), so the guard below is not "never key on
// `.dark`" but the stronger, still-checkable property that makes disagreement
// impossible: the two signals are selected by `iconSource`, exactly one set of
// classes is ever rendered, and neither set mixes the two.

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "../../../src/components/chrome/theme-toggle.tsx"), "utf8");
// Strip block and line comments so prose (e.g. "no mounted gate") can't
// trip the code-shape assertions below.
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * The brace-balanced body of the object literal that follows `marker`.
 * Used instead of a regex so a nested group can't be truncated at the first
 * `}` and quietly turn an assertion vacuous.
 */
function objectBodyAfter(text, marker) {
  const at = text.indexOf(marker);
  assert.notEqual(at, -1, `expected to find \`${marker}\` in theme-toggle.tsx`);
  const open = text.indexOf("{", at);
  assert.notEqual(open, -1, `\`${marker}\` is not followed by an object literal`);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  assert.fail(`unbalanced braces after \`${marker}\``);
}

const iconClasses = objectBodyAfter(source, "const ICON_CLASSES");
const propClasses = objectBodyAfter(iconClasses, "prop:");
const domClasses = objectBodyAfter(iconClasses, "dom:");

// Two copies on purpose: `assert.match` runs `regexp.test()`, which advances
// `lastIndex` on a global regex and would make reuse order-dependent.
const DARK_CLASS_VARIANT = /\bdark:(block|hidden)\b/;
const DARK_CLASS_VARIANT_ALL = /\bdark:(block|hidden)\b/g;

test("theme-toggle has no mounted gate", () => {
  assert.doesNotMatch(source, /useState\(\s*false\s*\)/, "found a useState(false) mounted gate — issue #89 regression");
  assert.doesNotMatch(source, /\bmounted\b/, "found a `mounted` flag — issue #89 regression");
  assert.doesNotMatch(source, /useEffect/, "found a mount effect — the CSS icon swap needs no effect");
});

test("theme-toggle has no disabled placeholder branch", () => {
  assert.doesNotMatch(
    source,
    /\bdisabled\b/,
    "found a disabled placeholder Button — first paint must be the real toggle",
  );
});

test("theme-toggle renders every icon unconditionally", () => {
  assert.match(source, /<Sun\b/, "Sun icon must be in the JSX");
  assert.match(source, /<Moon\b/, "Moon icon must be in the JSX");
  assert.match(source, /<Monitor\b/, "Monitor icon must be in the JSX");
  // Widened from the original dark-only check: `system` has the same hazard.
  // An element swapped on hydration is a subtree mismatch, which the Button's
  // attribute-level suppressHydrationWarning does NOT cover.
  assert.doesNotMatch(
    source,
    /theme\s*===\s*["'][a-z]+["']\s*\?\s*</,
    "icon choice must not conditionally render elements from the theme prop (SSR element-mismatch risk)",
  );
});

test("theme-toggle keys icon visibility on the prop-driven data attribute by default", () => {
  assert.match(source, /data-resolved-theme=\{theme\}/, "Button must carry data-resolved-theme={theme}");
  assert.match(source, /suppressHydrationWarning/, "attribute may differ server/client — must be hydration-suppressed");
  assert.match(
    source,
    /iconSource\s*=\s*["']prop["']/,
    "iconSource must DEFAULT to the prop signal — opting in is the consumer's call",
  );
  assert.match(
    propClasses,
    /\[\[data-resolved-theme=dark\]_&\]/,
    "the default icon classes must use the data-attribute variant",
  );
  assert.doesNotMatch(
    propClasses,
    DARK_CLASS_VARIANT,
    "the default icon classes must not key on the root .dark class — it can disagree with the prop",
  );
});

test("theme-toggle never lets the two icon signals be live at once", () => {
  // Whichever set is rendered, it carries ONE signal. That is what makes the
  // `.dark` opt-in safe: the signals cannot compete on the same element, so
  // there is no specificity tiebreak to get wrong and no way for a consumer
  // to end up with a prop and a root class silently fighting.
  assert.match(domClasses, DARK_CLASS_VARIANT, "the `dom` icon classes must key on the root .dark class");
  assert.doesNotMatch(
    domClasses,
    /data-resolved-theme/,
    "the `dom` icon classes must not also key on the prop-driven attribute",
  );

  const darkVariantsInFile = source.match(DARK_CLASS_VARIANT_ALL) ?? [];
  const darkVariantsInDomSet = domClasses.match(DARK_CLASS_VARIANT_ALL) ?? [];
  assert.equal(
    darkVariantsInFile.length,
    darkVariantsInDomSet.length,
    "dark:block / dark:hidden may appear only in the opt-in `dom` icon classes",
  );
});

test("theme-toggle selects the system glyph from the prop, in both icon sources", () => {
  // `system` is a stored CHOICE, not a resolved mode: no SSG stamps it into
  // the DOM before paint, so there is no DOM signal to read and the prop is
  // the only truth. Keying it on the attribute in both modes also keeps the
  // system rule off the elements the `.dark` rules style.
  assert.doesNotMatch(propClasses, /data-resolved-theme=system/, "system must not be keyed on the light/dark pair");
  assert.doesNotMatch(domClasses, /data-resolved-theme=system/, "system must not be keyed on the light/dark pair");
  assert.match(
    source,
    /<Monitor\s+className="[^"]*\[\[data-resolved-theme=system\]_&\]:block/,
    "Monitor must be revealed by the prop-driven system attribute",
  );
  assert.match(
    source,
    /className="contents [^"]*\[\[data-resolved-theme=system\]_&\]:hidden"/,
    "the light/dark pair must be hidden as one unit when system is selected",
  );
});
