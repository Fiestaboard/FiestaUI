import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guard for #306: the a11y matrix's light leg must actually render light.
 *
 * ci.yml used to select the theme by appending `?globals=theme:light` to the
 * runner's `--url`. `@storybook/test-runner` then built the story page with
 * `new URL("iframe.html", targetURL)`, and a relative resolution keeps the
 * base's PATH but drops its QUERY — so both legs visited `/iframe.html` with
 * default globals (`initialGlobals: { theme: "dark" }`) and the light half of
 * the palette was never checked by axe. #304's 1.71:1 checked label is what
 * that hid: a color-contrast violation in light, zero violations in dark.
 *
 * The theme now travels as the `THEME` env, and `.storybook/test-runner.ts`
 * owns the URL: it puts the global on iframe.html's OWN query, where nothing
 * re-resolves it, and asserts the rendered theme before axe runs so the leg
 * can never silently report the wrong palette again. This file pins each
 * half of that contract so a refactor of either file cannot reopen the gap.
 *
 * Picked up by `npm run release:test` (`node --test scripts/ci/tests/*.test.mjs`).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CI_YML = readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
const RUNNER = readFileSync(path.join(ROOT, ".storybook", "test-runner.ts"), "utf8");

/** Strip `#` comments so prose describing the old recipe never trips the scan. */
function stripYamlComments(source) {
  return source
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");
}

/** Strip `//` and `/* *\/` comments from the runner for the same reason. */
function stripTsComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** The `Run Storybook a11y tests` step of the a11y-tests job, comments removed. */
function a11yStep() {
  const start = CI_YML.indexOf("name: Run Storybook a11y tests");
  assert.notEqual(start, -1, "ci.yml no longer has a 'Run Storybook a11y tests' step — update this guard with it");
  const rest = CI_YML.slice(start);
  const end = rest.search(/\n\s*- name:/);
  return stripYamlComments(end === -1 ? rest : rest.slice(0, end));
}

test("ci.yml does not select the theme by appending a query to the runner's --url", () => {
  assert.doesNotMatch(
    a11yStep(),
    /globals=theme/,
    "ci.yml puts the theme global on the --url base. new URL('iframe.html', base) drops a base's query, " +
      "so that leg renders the default (dark) theme whatever it is named.",
  );
});

test("ci.yml hands the matrix theme to the runner as THEME", () => {
  assert.match(
    a11yStep(),
    /THEME:\s*\$\{\{\s*matrix\.theme\s*\}\}/,
    "the a11y step must export THEME from the matrix — it is the only channel the runner reads the theme from.",
  );
});

test("the runner reads THEME and puts the theme global on iframe.html's own query", () => {
  const runner = stripTsComments(RUNNER);
  assert.match(runner, /process\.env\.THEME/, ".storybook/test-runner.ts never reads THEME.");
  assert.match(
    runner,
    /searchParams\.set\(\s*["']globals["']\s*,\s*`theme:\$\{/,
    "the runner must set `globals=theme:<THEME>` on the iframe URL it navigates to (via `prepare`), " +
      "not rely on the --url base carrying it.",
  );
  assert.match(runner, /\bprepare\s*\(/, "the URL is built in the runner's `prepare` hook, which owns page.goto.");
});

test("the runner asserts the rendered theme before axe runs", () => {
  const runner = stripTsComments(RUNNER);
  assert.match(
    runner,
    /documentElement\.classList\.contains\(\s*["']dark["']\s*\)/,
    "postVisit must read the `dark` class off <html> and fail the story when it disagrees with THEME — " +
      "that check is what turns a silently-dark light leg into a red one.",
  );
});
