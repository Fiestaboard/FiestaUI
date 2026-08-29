import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { decideForRange } from "../gate.mjs";
import { DETACHED, FAST_FORWARD, isRulesetRefusal, isTagConflict, land, landingPlan } from "../land.mjs";

// The scenario every test in this file is about, and the one that produced
// v5.12.3: two PRs merge minutes apart, the first one's CI goes green and
// starts a release, and the second one carries a `!` breaking marker.
//
//   #300  fix(feedback): ...            <- gated, built, published
//   #301  fix(feedback)!: ...           <- merged while that release was running
//
// The release must tag the tree it published (#300) and must leave #301 both on
// `main` and releasable. Tagging over #301 is what shipped a breaking change
// under a patch version, described it in notes for a tarball that did not
// contain it, and then stranded it: with the tag above #301 every later gate
// run saw an empty range and skipped.

const FIX_300 = "fix(feedback): let the Alert variant choose its announcement politeness (#300)";
const FIX_301 = "fix(feedback)!: require dismissLabel when a Badge is dismissible (#301)";

// stderr piped rather than inherited: git narrates every clone and fetch, and
// a fixture's narration in the test output buries the assertion that failed.
const QUIET = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
const git = (args, cwd) => execFileSync("git", args, { ...QUIET, cwd }).trim();
const npm = (args, cwd) => execFileSync("npm", args, { ...QUIET, cwd });

/** Does `ancestor` appear in `descendant`'s history? */
const contains = (cwd, ancestor, descendant) => {
  try {
    git(["merge-base", "--is-ancestor", ancestor, descendant], cwd);
    return true;
  } catch {
    return false;
  }
};

function write(cwd, file, contents) {
  mkdirSync(path.join(cwd, path.dirname(file)), { recursive: true });
  writeFileSync(path.join(cwd, file), contents);
}

function commit(cwd, message) {
  git(["add", "-A"], cwd);
  git(["commit", "-m", message], cwd);
  return git(["rev-parse", "HEAD"], cwd);
}

/** Run something with the process cwd pointed at a fixture repo. */
function inRepo(cwd, fn) {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return fn();
  } finally {
    process.chdir(previous);
  }
}

/**
 * A repo shaped like the incident: a `v5.12.2` release, then #300, then #301.
 *
 * `origin` is a bare remote, `dev` is where the two merges are made, and
 * `pushMain` publishes them one at a time so a test can put the remote in the
 * exact state the release job would have found.
 */
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "fiestaui-land-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const origin = path.join(root, "origin.git");
  const dev = path.join(root, "dev");
  execFileSync("git", ["init", "--bare", "--initial-branch=main", origin], QUIET);
  execFileSync("git", ["clone", origin, dev], QUIET);
  git(["config", "user.name", "test"], dev);
  git(["config", "user.email", "test@example.com"], dev);

  write(
    dev,
    "package.json",
    `${JSON.stringify({ name: "@fiestaboard/ui", version: "5.12.2", private: true }, null, 2)}\n`,
  );
  write(dev, "src/components/ui/alert/alert.tsx", "export const Alert = () => null;\n");
  commit(dev, "chore: release v5.12.2");
  git(["tag", "-a", "v5.12.2", "-m", "chore: release v5.12.2"], dev);
  git(["push", "origin", "main", "--follow-tags"], dev);

  write(dev, "src/components/ui/alert/alert.tsx", "export const Alert = ({ politeness }) => politeness;\n");
  const sha300 = commit(dev, FIX_300);

  write(dev, "src/components/ui/badge/badge.tsx", "export const Badge = ({ dismissLabel }) => dismissLabel;\n");
  const sha301 = commit(dev, FIX_301);

  const pushMain = (sha) => git(["push", "origin", `${sha}:refs/heads/main`], dev);

  /** The release job's checkout: detached at the gated sha, all tags present. */
  const checkout = (sha) => {
    const runner = path.join(root, `runner-${sha.slice(0, 7)}`);
    execFileSync("git", ["clone", origin, runner], QUIET);
    git(["config", "user.name", "github-actions[bot]"], runner);
    git(["config", "user.email", "github-actions[bot]@users.noreply.github.com"], runner);
    git(["checkout", "--detach", sha], runner);
    return runner;
  };

  /** What the `Set version` step leaves behind: a dirty package.json. */
  const setVersion = (runner, version) => npm(["version", "--no-git-tag-version", version], runner);

  return { root, origin, dev, sha300, sha301, pushMain, checkout, setVersion };
}

const silent = { log: () => {}, sleep: async () => {} };

test("landingPlan only moves main when main is still on the released sha", () => {
  const plan = landingPlan({ tip: "a".repeat(40), sha: "a".repeat(40) });
  assert.equal(plan.mode, FAST_FORWARD);
  assert.equal(plan.pushBranch, true);
  assert.equal(plan.base, "a".repeat(40));
});

test("landingPlan tags without moving main once main has moved on", () => {
  const plan = landingPlan({ tip: "b".repeat(40), sha: "a".repeat(40) });
  assert.equal(plan.mode, DETACHED);
  assert.equal(plan.pushBranch, false);
  // The base is the released sha either way — that is the whole invariant.
  assert.equal(plan.base, "a".repeat(40));
});

test("landingPlan reasons stay single-line for the job log", () => {
  for (const tip of ["a".repeat(40), "b".repeat(40)]) {
    assert.doesNotMatch(landingPlan({ tip, sha: "a".repeat(40) }).reason, /\n/);
  }
});

test("a ruleset refusal is not mistaken for a race", () => {
  assert.equal(isRulesetRefusal("remote: error: GH013: Repository rule violations found"), true);
  assert.equal(isRulesetRefusal("! [rejected] main -> main (fetch first)"), false);
  assert.equal(isTagConflict("! [rejected] v5.12.3 -> v5.12.3 (already exists)"), true);
  assert.equal(isTagConflict("! [rejected] main -> main (non-fast-forward)"), false);
});

test("a burst tags the tree that was published, not main's tip", async (t) => {
  const repo = fixture(t);
  // Both merges are on main; the release job is still working on #300.
  repo.pushMain(repo.sha301);
  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  const result = await land({ version: "5.12.3", sha: repo.sha300, cwd: runner, ...silent });

  assert.equal(result.mode, DETACHED);
  const tagged = git(["rev-parse", "v5.12.3^{commit}"], runner);
  assert.equal(tagged, result.commit, "the tag must point at the version commit this run created");
  assert.equal(
    git(["rev-parse", `${tagged}^`], runner),
    repo.sha300,
    "the version commit must sit directly on the released sha",
  );
  assert.equal(
    contains(runner, repo.sha301, tagged),
    false,
    "v5.12.3 must not cover #301 — its bump never inspected it and its tree was never built",
  );
});

test("a burst leaves the later merge on main and releasable", async (t) => {
  const repo = fixture(t);
  repo.pushMain(repo.sha301);
  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  await land({ version: "5.12.3", sha: repo.sha300, cwd: runner, ...silent });

  // The stranding check, and the headline of this whole file: the next gate run
  // must see #301 rather than an empty range. With the tag above #301 the range
  // is empty, and the breaking change is merged, tagged over, and never
  // publishable by any later run.
  const next = repo.checkout(repo.sha301);
  const decision = inRepo(next, () => decideForRange("v5.12.3", "origin/main"));
  assert.equal(decision.release, true, "#301 must still be releasable after the release that raced it");
  assert.equal(decision.bump, "major", "the `!` marker must be seen by the range that ships it");
  assert.equal(decision.version, "6.0.0");

  // And main keeps its tip: a release may never drop merged work to make its
  // own push a fast-forward.
  assert.equal(git(["rev-parse", "refs/heads/main"], repo.origin), repo.sha301);
});

test("the tagged tree is the published tree, modulo the version bump", async (t) => {
  const repo = fixture(t);
  repo.pushMain(repo.sha301);
  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  const result = await land({ version: "5.12.3", sha: repo.sha300, cwd: runner, ...silent });

  // The tarball was built from the released sha's tree with package.json set to
  // the new version. Anything else in this diff is code the tag claims and the
  // tarball does not have.
  const changed = git(["diff", "--name-only", repo.sha300, result.commit], runner).split("\n").filter(Boolean);
  const beyondTheBump = changed.filter((file) => !["package.json", "package-lock.json"].includes(file));
  assert.deepEqual(beyondTheBump, [], "the version commit may only carry the version bump");
  assert.ok(changed.includes("package.json"));
  assert.equal(JSON.parse(git(["show", `${result.commit}:package.json`], runner)).version, "5.12.3");
});

test("with main still on the released sha the commit and tag land on main", async (t) => {
  const repo = fixture(t);
  repo.pushMain(repo.sha300);
  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  const result = await land({ version: "5.12.3", sha: repo.sha300, cwd: runner, ...silent });

  assert.equal(result.mode, FAST_FORWARD);
  assert.equal(git(["rev-parse", "refs/heads/main"], repo.origin), result.commit);
  assert.equal(git(["rev-parse", `${result.commit}^`], runner), repo.sha300);

  // The loop guard still closes: the tag is on the commit the release pushed,
  // so the range from it is empty and the version commit's own CI run releases
  // nothing.
  const next = repo.checkout(result.commit);
  assert.equal(inRepo(next, () => decideForRange("v5.12.3", "origin/main")).release, false);
});

test("a merge that lands inside the push window is retried into the safe shape", async (t) => {
  const repo = fixture(t);
  repo.pushMain(repo.sha300);
  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  // The narrowest version of the race: main is the released sha when land()
  // fetches, and #301 merges before the push goes out.
  const result = await land({
    version: "5.12.3",
    sha: repo.sha300,
    cwd: runner,
    ...silent,
    onBeforePush: ({ attempt }) => {
      if (attempt === 1) repo.pushMain(repo.sha301);
    },
  });

  assert.equal(result.mode, DETACHED, "the rejected push must be re-planned, never forced");
  assert.equal(result.attempts, 2);
  assert.equal(git(["rev-parse", "refs/heads/main"], repo.origin), repo.sha301);
  assert.equal(contains(runner, repo.sha301, result.commit), false);
});

test("a tag that already exists on the remote fails fast, not as a race", async (t) => {
  const repo = fixture(t);
  repo.pushMain(repo.sha301);
  // A previous run of this version already put the tag on the remote.
  git(["tag", "-a", "v5.12.3", "-m", "chore: release v5.12.3", repo.sha301], repo.dev);
  git(["push", "origin", "refs/tags/v5.12.3"], repo.dev);

  const runner = repo.checkout(repo.sha300);
  repo.setVersion(runner, "5.12.3");

  // Retrying cannot help: the same version cannot be landed twice, and npm
  // refuses a republish anyway. Five attempts reported as "main moved under us"
  // would bury the real cause, which is the mistake the ruleset branch above
  // already exists to avoid.
  await assert.rejects(
    () => land({ version: "5.12.3", sha: repo.sha300, cwd: runner, ...silent }),
    /already exists on origin/,
  );
});
