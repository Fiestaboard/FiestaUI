import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard: any workflow step that pushes to the default branch must authenticate
// as the Claude bot app.
//
// `main-protection` requires a PR with a green `CI Success` for every change to
// `main`, and its ONLY bypass actor is the Claude bot GitHub App. GITHUB_TOKEN
// is the GitHub Actions app, which is not on that list — so a job that checks
// out with the default credentials and pushes to `main` bounces off the ruleset
// every single time. That is not a hypothetical: it is how the v1.3.3 and
// v1.4.0 releases published and tagged and then failed to land, and it is what
// vrt-update.yml would have hit the next time it was dispatched on `main`.
// (ci.yml's vrt-seed job shared that hazard until it was retired in favour of
// vrt-update.yml's sharded fan-out.)
//
// The fix is always the same shape (see release.yml): mint the token with
// actions/create-github-app-token, then hand it to actions/checkout so the
// push inherits app credentials.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WORKFLOW_DIR = path.join(ROOT, ".github", "workflows");

/** Strip `#` comments so prose about pushing to main never trips the scan. */
function stripComments(source) {
  return source
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");
}

// A push is "default-branch targeting" if it names main outright, or if it
// pushes back to whatever ref the run was dispatched on — which is `main`
// whenever someone dispatches the workflow from the default branch.
//
// A workflow that delegates the push to a script counts too: release.yml lands
// its version commit through scripts/release/land.mjs, which pushes
// `refs/heads/main` with whatever credentials the checkout left behind. Moving
// the git out of the YAML must not move it out of this guard.
const MAIN_PUSH_PATTERNS = [
  /git push[^\n]*\bHEAD:main\b/,
  /scripts\/release\/land\.mjs/,
  /git push[^\n]*refs\/heads\/main/,
  /git push[^\n]*HEAD:\$\{GITHUB_REF_NAME\}/,
  /git push[^\n]*HEAD:"?\$\{?GITHUB_REF_NAME\}?"?/,
];

const workflows = readdirSync(WORKFLOW_DIR)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .map((f) => ({ name: f, source: stripComments(readFileSync(path.join(WORKFLOW_DIR, f), "utf8")) }));

test("workflow files are present to scan", () => {
  assert.ok(workflows.length > 0, "no workflow files found — the guard would pass vacuously");
});

for (const { name, source } of workflows) {
  const pushesToMain = MAIN_PUSH_PATTERNS.some((re) => re.test(source));
  if (!pushesToMain) continue;

  test(`${name} mints the Claude bot app token before pushing to main`, () => {
    assert.match(
      source,
      /uses:\s*actions\/create-github-app-token@/,
      `${name} pushes to the default branch but never mints the app token. ` +
        `GITHUB_TOKEN is not a main-protection bypass actor, so that push will be rejected.`,
    );
  });

  test(`${name} checks out with the app token so the push inherits it`, () => {
    assert.match(
      source,
      /token:\s*\$\{\{\s*steps\.app-token\.outputs\.token/,
      `${name} mints an app token but does not pass it to actions/checkout. ` +
        `Without it the remote keeps GITHUB_TOKEN credentials and the push still bounces.`,
    );
  });
}
