import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bumpForCommit,
  bumpForCommits,
  COMMIT_SEPARATOR,
  decide,
  highestTag,
  nextVersion,
  parseCommits,
  parseTag,
} from "../gate.mjs";

const CODE = ["src/components/ui/button/button.tsx"];

test("feat is a minor", () => {
  assert.equal(bumpForCommit("feat: add Tooltip"), "minor");
  assert.equal(bumpForCommit("feat(board): add Tooltip"), "minor");
});

test("fix, perf, chore, ci, and docs are patches", () => {
  assert.equal(bumpForCommit("fix: correct focus ring"), "patch");
  assert.equal(bumpForCommit("perf: pause aurora rAF loops"), "patch");
  assert.equal(bumpForCommit("chore: bump deps"), "patch");
  assert.equal(bumpForCommit("ci(release): grant issues write"), "patch");
  assert.equal(bumpForCommit("docs: explain the gate"), "patch");
});

test("a bang marker is a major regardless of type", () => {
  assert.equal(bumpForCommit("feat!: drop Checkbox"), "major");
  assert.equal(bumpForCommit("fix!: rename the theme token"), "major");
  assert.equal(bumpForCommit("refactor(api)!: reshape props"), "major");
});

test("a BREAKING CHANGE footer is a major", () => {
  const message = [
    "feat: reshape the Select API",
    "",
    "BREAKING CHANGE: onValueChange now receives the item, not the id.",
  ].join("\n");
  assert.equal(bumpForCommit(message), "major");
});

test("the hyphenated BREAKING-CHANGE synonym also counts", () => {
  const message = ["fix: tighten types", "", "BREAKING-CHANGE: drops any."].join("\n");
  assert.equal(bumpForCommit(message), "major");
});

test("BREAKING CHANGE must start its own line to count", () => {
  // Prose mentioning the phrase mid-sentence must not silently cut a major.
  const message = [
    "docs: explain what a BREAKING CHANGE: footer does",
    "",
    "Describes the convention; introduces no BREAKING CHANGE: of its own.",
  ].join("\n");
  assert.equal(bumpForCommit(message), "patch");
});

test("a bang after the scope but not before the colon does not count", () => {
  assert.equal(bumpForCommit("feat(board): add ! to labels"), "minor");
  assert.equal(bumpForCommit("fix: handle ! in selectors"), "patch");
});

test("off-convention subjects fall through to patch", () => {
  assert.equal(bumpForCommit("Merge branch 'main' into thing"), "patch");
  assert.equal(bumpForCommit("update stuff"), "patch");
  assert.equal(bumpForCommit(""), "patch");
});

test("the highest bump across the range wins", () => {
  assert.equal(bumpForCommits(["fix: a", "perf: b", "chore: c"]), "patch");
  assert.equal(bumpForCommits(["fix: a", "feat: b", "chore: c"]), "minor");
  assert.equal(bumpForCommits(["fix: a", "feat: b", "feat!: c"]), "major");
  assert.equal(bumpForCommits([]), "patch");
});

test("parseCommits splits on NUL and drops empties", () => {
  const raw = ["feat: a\n\nbody", "fix: b", ""].join(COMMIT_SEPARATOR);
  assert.deepEqual(parseCommits(raw), ["feat: a\n\nbody", "fix: b"]);
});

test("parseCommits keeps multi-line bodies intact", () => {
  const raw = `feat: a\n\nBREAKING CHANGE: x${COMMIT_SEPARATOR}fix: b`;
  const commits = parseCommits(raw);
  assert.equal(commits.length, 2);
  assert.equal(bumpForCommits(commits), "major");
});

test("code changes release at the derived bump", () => {
  const result = decide({
    commits: ["perf: pause rAF", "feat: add Tooltip"],
    files: CODE,
    lastTag: "v1.2.1",
  });
  assert.equal(result.release, true);
  assert.equal(result.bump, "minor");
  assert.match(result.reason, /minor release/);
});

test("an empty commit range skips — this is the loop guard", () => {
  // What a release's own version commit landing looks like: it is pushed
  // straight to main with the tag on that same commit, so the range from the
  // tag has nothing in it.
  const result = decide({ commits: [], files: [], lastTag: "v1.2.1" });
  assert.equal(result.release, false);
  assert.equal(result.bump, null);
  assert.match(result.reason, /nothing to release/);
});

test("a content-only range skips", () => {
  const result = decide({
    commits: ["docs: rewrite the README"],
    files: ["README.md", "docs/guide.md"],
    lastTag: "v1.2.1",
  });
  assert.equal(result.release, false);
  assert.equal(result.bump, null);
  assert.match(result.reason, /only content/);
});

test("an audit sweep-state commit skips", () => {
  const result = decide({
    commits: ["chore(perf-audit): advance sweep state"],
    files: [".github/perf-audit-state.json"],
    lastTag: "v1.2.1",
  });
  assert.equal(result.release, false);
});

test("a CI-only range skips even though it runs the full suite", () => {
  // The v1.6.1 lesson: these paths are worth 20 minutes of CI (editing ci.yml
  // is editing the suite) but cannot move a byte of dist/. Releasing for them
  // mints a version identical to the last, which npm then refuses
  // to ever accept again.
  const result = decide({
    commits: ["fix(ci): mint the app token before pushing baselines to main"],
    files: [
      ".github/workflows/ci.yml",
      ".github/workflows/vrt-update.yml",
      "scripts/ci/tests/main-push-app-token.test.mjs",
    ],
    lastTag: "v1.6.0",
  });
  assert.equal(result.release, false);
  assert.equal(result.bump, null);
  assert.match(result.reason, /CI infrastructure/);
});

test("a change to the publish path still releases", () => {
  // release.yml and scripts/release/ never land in the tarball, but they decide
  // how it is built and versioned — so they stay release-worthy.
  for (const file of [".github/workflows/release.yml", "scripts/release/gate.mjs"]) {
    const result = decide({
      commits: ["fix(release): correct the bump rule"],
      files: [file],
      lastTag: "v1.6.0",
    });
    assert.equal(result.release, true, `${file} should earn a release`);
    assert.equal(result.bump, "patch");
  }
});

test("one code file among content changes still releases", () => {
  const result = decide({
    commits: ["docs: notes", "fix: correct focus ring"],
    files: ["README.md", ...CODE],
    lastTag: "v1.2.1",
  });
  assert.equal(result.release, true);
  assert.equal(result.bump, "patch");
});

test("commits with no file list are treated as code", () => {
  // Defensive: an empty diff alongside real commits means something upstream
  // is wrong, and shipping beats silently skipping a real change.
  const result = decide({
    commits: ["fix: something"],
    files: [],
    lastTag: "v1.2.1",
  });
  assert.equal(result.release, true);
});

test("parseTag accepts vX.Y.Z and rejects everything else", () => {
  assert.deepEqual(parseTag("v1.2.1"), { major: 1, minor: 2, patch: 1 });
  assert.deepEqual(parseTag("v10.0.34"), { major: 10, minor: 0, patch: 34 });
  assert.equal(parseTag("1.2.1"), null);
  assert.equal(parseTag("v1.2"), null);
  assert.equal(parseTag("v1.2.1-rc.1"), null);
  assert.equal(parseTag("release/v1.2.1"), null);
});

test("highestTag orders by semver, not lexically", () => {
  // The bug this guards: sorted as strings, v1.10.0 < v1.9.0 and the next
  // release would regenerate an already-published version.
  assert.equal(highestTag(["v1.9.0", "v1.10.0", "v1.2.1"]), "v1.10.0");
  assert.equal(highestTag(["v0.1.0", "v1.0.0", "v0.4.0"]), "v1.0.0");
  assert.equal(highestTag(["v2.0.0", "v1.99.99"]), "v2.0.0");
});

test("highestTag ignores non-version tags and blank lines", () => {
  assert.equal(highestTag(["v1.2.1", "nightly", "", "  v1.3.0  "]), "v1.3.0");
  assert.equal(highestTag(["nightly", ""]), null);
  assert.equal(highestTag([]), null);
});

test("highestTag is not fooled by the nearest-ancestor tag", () => {
  // The real scenario: v1.3.0 landed while this sha's CI was running, so it is
  // not in this sha's ancestry and `git describe` would answer v1.2.1.
  assert.equal(highestTag(["v1.2.1", "v1.3.0"]), "v1.3.0");
});

test("nextVersion bumps from the tag", () => {
  assert.equal(nextVersion("v1.2.1", "patch"), "1.2.2");
  assert.equal(nextVersion("v1.2.1", "minor"), "1.3.0");
  assert.equal(nextVersion("v1.2.1", "major"), "2.0.0");
  assert.equal(nextVersion("v0.4.0", "minor"), "0.5.0");
});

test("nextVersion zeroes the lower components", () => {
  assert.equal(nextVersion("v1.9.7", "minor"), "1.10.0");
  assert.equal(nextVersion("v1.9.7", "major"), "2.0.0");
});

test("nextVersion rejects a tag it cannot parse", () => {
  assert.throws(() => nextVersion("nightly", "patch"), /Not a vX\.Y\.Z tag/);
});

test("the reason stays single-line for $GITHUB_OUTPUT", () => {
  for (const input of [
    { commits: [], files: [] },
    { commits: ["docs: x"], files: ["README.md"] },
    { commits: ["feat: x"], files: CODE },
  ]) {
    assert.doesNotMatch(decide(input).reason, /\n/);
  }
});
