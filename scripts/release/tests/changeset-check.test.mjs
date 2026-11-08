import assert from "node:assert/strict";
import { test } from "node:test";

import { checkChangeset, isChangesetFile } from "../changeset-check.mjs";

const SRC = ["src/components/forms/button.tsx"];
const base = { files: SRC, addedFiles: [], headRef: "feat/button", labels: [] };

test("shipped change without a changeset fails", () => {
  const result = checkChangeset(base);
  assert.equal(result.ok, false);
  assert.match(result.reason, /npx changeset/);
  assert.match(result.reason, /src\/components\/forms\/button\.tsx/);
});

test("shipped change with a changeset passes", () => {
  const added = [".changeset/brave-otters-sing.md"];
  const result = checkChangeset({ ...base, files: [...SRC, ...added], addedFiles: added });
  assert.equal(result.ok, true);
});

test("an empty changeset counts — the check never reads its content", () => {
  // `npx changeset --empty` writes a file whose frontmatter is just `---\n---`.
  const added = [".changeset/quiet-moles-nap.md"];
  assert.equal(checkChangeset({ ...base, addedFiles: added }).ok, true);
});

test("unshipped-only change needs no changeset", () => {
  const files = [".github/workflows/ci.yml", "docs/x.md", "src/components/forms/button.test.tsx"];
  assert.equal(checkChangeset({ ...base, files }).ok, true);
});

test("publish-path infrastructure needs no changeset", () => {
  // These decide HOW a release happens, not what is in it. Under changesets
  // the version is explicit, so editing them must not force a release.
  const files = [".github/workflows/release.yml", "scripts/release/pre-mode.mjs", ".changeset/config.json"];
  assert.equal(checkChangeset({ ...base, files }).ok, true);
});

test("package.json still needs a changeset — a dependency range ships", () => {
  assert.equal(checkChangeset({ ...base, files: ["package.json"] }).ok, false);
});

test("changeset-release/* branches are exempt", () => {
  // The Version PR deletes changesets and edits package.json.
  const result = checkChangeset({
    ...base,
    files: ["package.json", "CHANGELOG.md"],
    headRef: "changeset-release/main",
  });
  assert.equal(result.ok, true);
  assert.equal(checkChangeset({ ...base, headRef: "changeset-release/alpha" }).ok, true);
});

test("a main→alpha sync is exempt", () => {
  // main's changesets were consumed by main's own release before the sync.
  assert.equal(checkChangeset({ ...base, headRef: "main" }).ok, true);
});

test("no-changeset label is an escape hatch", () => {
  assert.equal(checkChangeset({ ...base, labels: ["dependencies", "no-changeset"] }).ok, true);
});

test(".changeset/README.md does not count as a changeset", () => {
  assert.equal(isChangesetFile(".changeset/README.md"), false);
  assert.equal(checkChangeset({ ...base, addedFiles: [".changeset/README.md"] }).ok, false);
});

test("only top-level .changeset/*.md files are changesets", () => {
  assert.equal(isChangesetFile(".changeset/brave-otters-sing.md"), true);
  assert.equal(isChangesetFile(".changeset/pre/brave-otters-sing.md"), false);
  assert.equal(isChangesetFile(".changeset/config.json"), false);
  assert.equal(isChangesetFile("docs/brave-otters-sing.md"), false);
});

test("reason is single-line for $GITHUB_OUTPUT", () => {
  const many = Array.from({ length: 12 }, (_, i) => `src/c${i}.tsx`);
  for (const input of [
    base,
    { ...base, files: many },
    { ...base, headRef: "main" },
    { ...base, files: ["docs/a.md"] },
  ]) {
    assert.doesNotMatch(checkChangeset(input).reason, /\n/);
  }
});

test("the alpha promotion PR is exempt — its changesets were consumed by the prereleases", () => {
  assert.equal(checkChangeset({ ...base, headRef: "alpha" }).ok, true);
});

test("fork PRs are never exempt by branch name", () => {
  for (const headRef of ["main", "alpha", "changeset-release/main"]) {
    assert.equal(checkChangeset({ ...base, headRef, sameRepo: false }).ok, false, headRef);
  }
});
