import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guard for issue #94: the reduced-motion "freeze pose" for the sidebar
 * gradients must be a SINGLE background-position. The gradients are
 * single-layer backgrounds, so a comma-separated multi-position list is
 * invalid CSS — browsers keep only the first position (`0 0`) and drop the
 * rest, leaving reduced-motion users on the raw first color stop instead of
 * the intended mid-gradient pose.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const THEME_CSS = path.join(ROOT, "src", "styles", "theme.css");

/** Extract the body of every rule whose selector matches `selectorRe`. */
function ruleBodies(css, selectorRe) {
  const bodies = [];
  const re = new RegExp(`(^|[}{;\\n])\\s*(${selectorRe.source})\\s*\\{`, "g");
  let m;
  while ((m = re.exec(css)) !== null) {
    const start = re.lastIndex;
    const end = css.indexOf("}", start);
    assert.notEqual(end, -1, `unterminated rule for ${m[2]}`);
    bodies.push({ selector: m[2].trim(), body: css.slice(start, end) });
  }
  return bodies;
}

/** Get the background-position value from a rule body, or null. */
function backgroundPosition(body) {
  const m = body.match(/background-position\s*:\s*([^;]+);/);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

const css = await readFile(THEME_CSS, "utf8");

// Both reduced-motion contexts: the media query and the .reduce-motion class.
const rules = [
  ...ruleBodies(css, /\.sidebar-gradient(?:-horizontal)?/),
  ...ruleBodies(css, /\.reduce-motion \.sidebar-gradient(?:-horizontal)?/),
].filter(({ body }) => body.includes("animation: none"));

test("reduced-motion sidebar freeze poses exist for both contexts and both variants", () => {
  const selectors = rules.map((r) => r.selector);
  for (const sel of [
    ".sidebar-gradient",
    ".sidebar-gradient-horizontal",
    ".reduce-motion .sidebar-gradient",
    ".reduce-motion .sidebar-gradient-horizontal",
  ]) {
    assert.ok(selectors.includes(sel), `missing reduced-motion freeze rule for "${sel}"`);
  }
});

test("freeze poses are a single background-position (single-layer background)", () => {
  for (const { selector, body } of rules) {
    const pos = backgroundPosition(body);
    assert.ok(pos, `"${selector}" freeze rule has no background-position`);
    assert.ok(
      !pos.includes(","),
      `"${selector}" declares a comma-separated multi-position list ("${pos}") ` +
        "against a single-layer background — browsers drop everything after the " +
        "first position, so the intended freeze pose never renders (issue #94)",
    );
  }
});
