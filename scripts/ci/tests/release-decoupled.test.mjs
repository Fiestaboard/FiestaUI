import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard: a release must not wait for the downstream upgrade.
//
// release.yml runs under `concurrency: release` with cancel-in-progress off, so
// releases queue one behind another. When it called downstream-upgrade.yml as a
// job (`uses:`), the upgrade was part of the release run, and its FiestaBoard
// leg runs Claude to fix the bump, routinely 45+ minutes. Every merge after it
// waited for that LLM before it could publish: v8.1.0's upgrade ran
// 04:06–04:53 while the next release, a one-minute publish, sat queued.
//
// So the release dispatches the upgrade as its own run, which has its own
// concurrency group where the newest version cancels an older in-flight one.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (name) => readFileSync(path.join(ROOT, ".github", "workflows", name), "utf8");

/** Strip `#` comments so prose about the old wiring never trips the scan. */
const code = (source) =>
  source
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");

const release = code(read("release.yml"));
const upgrade = code(read("downstream-upgrade.yml"));

test("release.yml does not run the downstream upgrade inside its own run", () => {
  assert.doesNotMatch(
    release,
    /uses:\s*\.\/\.github\/workflows\/downstream-upgrade\.yml/,
    "release.yml calls downstream-upgrade.yml as a job, so every release queues behind the upgrade's Claude run",
  );
});

test("release.yml dispatches the downstream upgrade with the released version", () => {
  assert.match(
    release,
    /gh workflow run downstream-upgrade\.yml/,
    "release.yml no longer starts the downstream upgrade",
  );
  assert.match(release, /-f version="?\$\{?VERSION\}?"?/, "the dispatch does not pass the released version");
  assert.match(release, /actions:\s*write/, "dispatching a workflow needs `actions: write`");
});

test("the downstream upgrade can be dispatched with a version", () => {
  assert.match(
    upgrade,
    /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*version:/,
    "downstream-upgrade.yml takes no dispatched version",
  );
});

test("the downstream upgrade queues in its own group, newest version winning", () => {
  const group = upgrade.match(/concurrency:\s*\n\s*group:\s*(\S+)\s*\n\s*cancel-in-progress:\s*(\S+)/);
  assert.ok(group, "downstream-upgrade.yml has no concurrency group");
  assert.notEqual(group[1], "release", "the upgrade shares the release's queue again");
  assert.equal(group[2], "true", "an upgrade for an older version must give way to a newer one");
});
