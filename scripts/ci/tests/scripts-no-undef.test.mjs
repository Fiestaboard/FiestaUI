import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

// Guard: undefined names in scripts/ are a lint error (slice 1.0c, from the
// 1.0b gap). scripts/vrt/vrt.mjs once called `clampClip` without importing it.
// Nothing caught it: ESLint did not check undefined identifiers in scripts/,
// and the CLI tests use `--shots`, which skips the code path. Only a manual
// browser run surfaced it. This file pins the rule with ESLint's own API,
// against the repo's real config, so softening it (off, warn, or a scripts/
// override that drops it) fails here, not in a future harness run.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const eslint = new ESLint({ cwd: ROOT });

async function lint(code, file) {
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  return result.messages;
}

for (const file of ["scripts/vrt/x.mjs", "scripts/ci/x.mjs", "scripts/release/x.mjs", "scripts/perf/x.mjs"]) {
  test(`no-undef is an error in ${path.dirname(file)}/`, async () => {
    const messages = await lint("export const clip = clampClip({ x: 0 });\n", file);
    const undef = messages.filter((m) => m.ruleId === "no-undef");
    assert.equal(undef.length, 1, JSON.stringify(messages));
    assert.equal(undef[0].severity, 2, "an error, not a warning");
    assert.match(undef[0].message, /clampClip/);
  });
}

test("Node globals are known in scripts/, so the rule only flags real mistakes", async () => {
  const code = [
    'import path from "node:path";',
    "export const x = [process.env.CI, Buffer.from(''), new URL('file:///'), path.sep];",
    "export const y = [setTimeout, structuredClone, fetch, console, globalThis, import.meta.url];",
    "",
  ].join("\n");
  assert.deepEqual(
    (await lint(code, "scripts/ci/x.mjs")).filter((m) => m.ruleId === "no-undef"),
    [],
  );
});

test("browser globals are NOT ambient in scripts/: in-page code must declare them", async () => {
  // Node scripts that hand a function to page.evaluate() run part of their
  // code in the browser. Making `document` global for all of scripts/ would
  // hide a Node-side `document` typo, so in-page code names what it uses with
  // a `/* global ... */` comment instead.
  const messages = await lint("export const el = document.body;\n", "scripts/vrt/x.mjs");
  assert.equal(messages.filter((m) => m.ruleId === "no-undef").length, 1, JSON.stringify(messages));
  const declared = await lint("/* global document */\nexport const el = document.body;\n", "scripts/vrt/x.mjs");
  assert.deepEqual(
    declared.filter((m) => m.ruleId === "no-undef"),
    [],
  );
});
