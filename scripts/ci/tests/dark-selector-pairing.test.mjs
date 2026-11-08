import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guards issue #228 item 6: dark mode has TWO equivalent spellings in
 * theme.css — the `.dark` class and the `[data-theme="dark"]` attribute — and
 * every dark-scoped selector must carry both.
 *
 * Why a gate and not review. The pairing is all-or-nothing, and a half-applied
 * one is worse than none. A consumer that hosts on the attribute (Docusaurus,
 * Astro, Nuxt Color Mode) would get the token block but not the sidebar
 * gradient, or the `prefers-contrast` retune but not the base tokens — i.e.
 * most of dark mode arriving, which is indistinguishable from all of it until
 * the missing rule is the one that matters. fiestaboard.github.io hit exactly
 * that shape once already when a downstream regex missed one of Tailwind's
 * `@supports`-split fragments and left `--brand-hover` on its fallback: a link
 * whose hover state was its resting state, green in CI for a whole minor.
 *
 * Nothing else can catch it. VRT stamps `.dark` (`.storybook/preview.tsx`), so
 * an unpaired selector renders identically in every baseline; a unit test
 * renders in jsdom, which does not cascade. The proof has to be read off the
 * stylesheet, which is what this does.
 *
 * The check is symmetric on purpose. Adding a `.dark` rule without its
 * attribute twin fails, and so does adding an attribute rule without its class
 * twin — the second direction is what keeps a consumer that stamps the class
 * (FiestaBoard itself, Storybook) from quietly losing a rule.
 *
 * Picked up by `npm run release:test` (`node --test scripts/ci/tests/*.test.mjs`),
 * which CI's `automation` job runs on every PR.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THEME_CSS = join(ROOT, "src", "styles", "theme.css");

const raw = readFileSync(THEME_CSS, "utf8");
// Comments in this file discuss `.dark` at length. Strip them so prose can
// neither trip an assertion nor satisfy one.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

const CLASS_FORM = ".dark";
const ATTR_FORM = '[data-theme="dark"]';

/** `.dark`, but not `.darker` / `.dark-rail` — the class as a whole token. */
const CLASS_TOKEN = /\.dark(?![\w-])/g;

/**
 * Every selector list in the file, i.e. the text preceding each `{` that is
 * not an at-rule prelude. Scanned rather than regex-matched so a nested block
 * (`@media { … }`) yields its inner selectors too.
 */
function selectorLists(source) {
  const lists = [];
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch !== "{" && ch !== "}" && ch !== ";") continue;
    if (ch === "{") {
      const candidate = source.slice(start, i).trim();
      if (candidate && !candidate.startsWith("@")) lists.push(candidate);
    }
    start = i + 1;
  }
  return lists;
}

/** Split a selector list on its top-level commas (those outside `:is(…)` etc). */
function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

const lists = selectorLists(css);

test("theme.css declares at least one dark-scoped rule", () => {
  // Without this the pairing assertions below could pass vacuously if the
  // scanner ever stopped seeing the file.
  const darkLists = lists.filter((list) => list.includes(CLASS_FORM) || list.includes(ATTR_FORM));
  assert.ok(darkLists.length >= 3, `expected the dark-scoped rules to be found, saw ${darkLists.length}`);
});

test("every `.dark` selector has a `[data-theme=dark]` twin, and vice versa", () => {
  const unpaired = [];
  for (const list of lists) {
    const parts = splitTopLevel(list);
    const present = new Set(parts);
    for (const part of parts) {
      if (CLASS_TOKEN.test(part)) {
        CLASS_TOKEN.lastIndex = 0;
        const twin = part.replace(CLASS_TOKEN, ATTR_FORM);
        if (!present.has(twin)) unpaired.push({ part, twin, list });
      }
      CLASS_TOKEN.lastIndex = 0;
      if (part.includes(ATTR_FORM)) {
        const twin = part.split(ATTR_FORM).join(CLASS_FORM);
        if (!present.has(twin)) unpaired.push({ part, twin, list });
      }
    }
  }
  assert.deepEqual(
    unpaired.map(({ part, twin }) => `${part}  (missing: ${twin})`),
    [],
    "dark mode is spelled two ways in theme.css and every selector must carry both — see the note above " +
      "`@custom-variant dark`. A rule with only one spelling is invisible to half the consumers.",
  );
});

test("the `dark` custom variant matches both spellings", () => {
  // This is what `dark:` compiles to on every component utility in the
  // package, so it is the single highest-leverage line in the file.
  const variant = css.match(/@custom-variant\s+dark\s*\(([^)]*\)[^;]*)\);/);
  assert.ok(variant, "expected an `@custom-variant dark (…)` declaration in theme.css");
  const body = variant[1];
  assert.match(body, /\.dark\s+\*/, "`dark:` must still compile against the `.dark` class");
  assert.match(
    body,
    /\[data-theme="dark"\]\s+\*/,
    "`dark:` must also compile against `[data-theme=dark]` — otherwise the token block responds to the " +
      "attribute but no component utility does, which is the half-applied state #228 item 6 exists to prevent",
  );
});

test("no dark rule is qualified with a host element", () => {
  // `html.dark` would break scoped subtree theming (a dark card on a light
  // page) and, more quietly, would stop matching for a consumer that stamps
  // the signal on <body>. Specificity is deliberately left at 0-1-0; a
  // consumer whose pipeline appends `:root` blocks after this file raises it
  // there. Documented in the note above `@custom-variant dark`.
  const qualified = lists
    .flatMap(splitTopLevel)
    .filter((part) => /(^|\s)[a-z]+(\.dark(?![\w-])|\[data-theme)/.test(part));
  assert.deepEqual(qualified, [], "dark selectors must stay unqualified so they can scope a subtree");
});

/**
 * Slice 1.1 (T4): the tints are recipes over --card (`color-mix(in srgb, …)`),
 * and a custom property substitutes var() on the element it is DECLARED on.
 * A tint declared only in :root resolves against the light --card on <html>
 * and is inherited as that computed colour, so a dark subtree (a `.dark` card
 * on a light page) would paint the LIGHT tint. Every tint therefore carries
 * its dark pair in the dark block, under both spellings (the block above).
 */
function blockBody(source, selectorPattern) {
  const head = new RegExp(`(^|[};])\\s*${selectorPattern}\\s*\\{`, "g");
  const bodies = [];
  let match;
  while ((match = head.exec(source)) !== null) {
    let depth = 1;
    let i = head.lastIndex;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
    }
    bodies.push(source.slice(head.lastIndex, i - 1));
    head.lastIndex = i;
  }
  return bodies.join("\n");
}

const declared = (body) => new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

test("every --tint-* in :root has its dark pair in the dark block", () => {
  const light = [...declared(blockBody(css, ":root"))].filter((n) => n.startsWith("--tint-"));
  const dark = declared(blockBody(css, String.raw`\.dark\s*,\s*\[data-theme="dark"\]`));
  assert.ok(light.length >= 4, `expected the four T4 tints in :root, found ${light.join(", ") || "none"}`);
  assert.deepEqual(
    light.filter((n) => !dark.has(n)),
    [],
    "a tint is a recipe over --card; without a dark declaration a dark subtree inherits the light tint",
  );
});
