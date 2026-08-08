import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard for issue #57: the sidebar gradient loop must run on the compositor.
// Animating `background-position` (or any background-* property) invalidates
// paint every frame for the whole session, so no @keyframes in theme.css may
// touch it — the sidebar-gradient-flow loops must animate `transform` only.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const css = readFileSync(path.join(ROOT, "src", "styles", "theme.css"), "utf8");

/** Extract every @keyframes block: [{ name, body }] (brace-matched). */
function extractKeyframes(source) {
  const blocks = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    blocks.push({ name: m[1], body: source.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return blocks;
}

/** Property names declared anywhere inside a keyframes body (comments stripped). */
function declaredProperties(body) {
  const noComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
  const props = [];
  const re = /(?:^|[{;])\s*([a-zA-Z-]+)\s*:/g;
  let m;
  while ((m = re.exec(noComments)) !== null) props.push(m[1].toLowerCase());
  return props;
}

const keyframes = extractKeyframes(css);

test("no @keyframes in theme.css animates background-position (issue #57)", () => {
  const offenders = keyframes.filter((k) => declaredProperties(k.body).includes("background-position"));
  assert.deepEqual(
    offenders.map((k) => k.name),
    [],
    "background-position is not compositor-accelerated; these keyframes force a full repaint every frame",
  );
});

test("sidebar-gradient-flow keyframes exist and animate transform only", () => {
  for (const name of ["sidebar-gradient-flow", "sidebar-gradient-flow-h"]) {
    const block = keyframes.find((k) => k.name === name);
    assert.ok(block, `@keyframes ${name} should exist in theme.css`);
    const props = declaredProperties(block.body);
    assert.ok(props.length > 0, `@keyframes ${name} should declare at least one property`);
    assert.deepEqual(
      props.filter((p) => p !== "transform"),
      [],
      `@keyframes ${name} must animate transform only (compositor-friendly)`,
    );
  }
});
