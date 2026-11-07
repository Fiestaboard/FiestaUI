import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard: release.yml keeps the shape the changesets flow depends on.
//
// Each assertion below is a way the release can quietly go wrong without any
// test of scripts/release noticing, because the mistake lives in the YAML:
// a trigger that makes the action mistake alpha for main, a token whose PRs
// never get CI, an alpha run that publishes stable, or a lost OIDC setting.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const source = readFileSync(path.join(ROOT, ".github", "workflows", "release.yml"), "utf8");

/** Strip `#` comments so prose about the old shape never trips the scan. */
const stripped = source
  .split("\n")
  .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
  .join("\n");

/** The text of one step, from its `- name:` line to the next step or job. */
function step(name) {
  const start = stripped.indexOf(`- name: ${name}`);
  assert.notEqual(start, -1, `release.yml has no step named "${name}"`);
  const rest = stripped.slice(start + 1);
  const end = rest.search(/\n\s*- (name|uses):|\n {2}[a-z-]+:\n/);
  return end === -1 ? rest : rest.slice(0, end);
}

test("release runs on push to main and alpha", () => {
  assert.match(stripped, /\bon:\s*\n\s*push:\s*\n\s*branches:\s*\[main, alpha\]/);
  // workflow_run sets GITHUB_REF to the default branch, and changesets/action
  // derives its branch from it — an alpha run would version against main.
  assert.doesNotMatch(stripped, /workflow_run:/);
});

test("concurrency is per branch and never cancels", () => {
  const block = stripped.match(/\nconcurrency:\s*\n\s*group:\s*(.+)\n\s*cancel-in-progress:\s*(\S+)/);
  assert.ok(block, "release.yml has no top-level concurrency block");
  assert.match(block[1], /github\.ref_name/, "main and alpha must not queue behind each other");
  assert.equal(block[2], "false", "cancelling a run mid-publish can strand a published version untagged");
});

test("changesets/action is v2", () => {
  // v1 supports Changesets v2 only; against the v3 CLI it publishes but never
  // reports `published`, so no tag, no GitHub Release, no downstream dispatch.
  assert.match(stripped, /uses:\s*changesets\/action@v2\b/);
  assert.doesNotMatch(stripped, /changesets\/action@v1\b/);
});

test("changesets/action uses the bot app token", () => {
  const changesets = step("Version PR or publish");
  assert.match(
    changesets,
    /github-token:\s*\$\{\{\s*steps\.app-token\.outputs\.token\s*\}\}/,
    "a Version PR opened with GITHUB_TOKEN starts its CI gated in action_required",
  );
  // v2 throws when a GITHUB_TOKEN env disagrees with the github-token input.
  assert.doesNotMatch(changesets, /GITHUB_TOKEN:/);
});

test("version and publish commands are the npm scripts", () => {
  const changesets = step("Version PR or publish");
  assert.match(changesets, /version-script:\s*npm run version-packages/);
  assert.match(changesets, /publish-script:\s*npm run release/);
  assert.match(changesets, /create-github-releases:\s*true/);
});

test("alpha guard runs before the action on alpha", () => {
  const guard = stripped.indexOf("- name: Check alpha prerelease mode");
  const action = stripped.indexOf("- name: Version PR or publish");
  assert.ok(guard !== -1 && guard < action, "the alpha guard must run before changesets/action");

  const guardStep = step("Check alpha prerelease mode");
  assert.match(guardStep, /id:\s*alpha/);
  assert.match(guardStep, /if:\s*github\.ref_name == 'alpha'/);
  assert.match(guardStep, /node scripts\/release\/pre-mode\.mjs alpha-action >> "\$GITHUB_OUTPUT"/);

  assert.match(
    step("Version PR or publish"),
    /if:\s*github\.ref_name != 'alpha' \|\| steps\.alpha\.outputs\.action == 'release'/,
  );
});

test("trusted publishing is kept", () => {
  assert.match(stripped, /id-token:\s*write/);
  assert.match(stripped, /npm install -g npm@latest/);
  assert.match(step("Version PR or publish"), /NPM_CONFIG_PROVENANCE:\s*"true"/);
});

test("nothing pushes to main by hand", () => {
  // Version commits reach main only through the Version PR and the merge queue.
  for (const pattern of [/git push/, /scripts\/release\/land\.mjs/, /scripts\/release\/gate\.mjs/]) {
    assert.doesNotMatch(stripped, pattern, `release.yml must not run \`${pattern.source}\``);
  }
});

test("the downstream upgrade is dispatched only for stable releases from main", () => {
  const job = stripped.slice(stripped.indexOf("\n  downstream-upgrade:"));
  assert.match(job, /needs\.release\.outputs\.published == 'true'/);
  assert.match(job, /github\.ref_name == 'main'/);
  assert.match(job, /needs\.release\.outputs\.published-packages/);
  assert.match(stripped, /published-packages:\s*\$\{\{\s*steps\.changesets\.outputs\.published-packages\s*\}\}/);
});
