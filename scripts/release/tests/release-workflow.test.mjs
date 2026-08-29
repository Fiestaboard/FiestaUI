import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard: release.yml must not grow a second opinion about which commit a
// release describes.
//
// The gate reasons over a range ending at one sha, the build publishes that
// sha's tree, and the tag has to agree with both. v5.12.3 is what happens when
// it does not: the landing step re-checked-out `main`'s tip and tagged there,
// so a breaking `fix(feedback)!` that merged mid-release got covered by a patch
// tag, was absent from the tarball the notes described, and was then stranded
// under a tag no later gate could see past.
//
// The rule those three now share is enforced in scripts/release/land.mjs and
// exercised against a real git remote in land.test.mjs. This file only keeps
// the workflow wired to it — a hand-rolled `git push ... main` here would slip
// straight past those tests.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const source = readFileSync(path.join(ROOT, ".github", "workflows", "release.yml"), "utf8");

/** Strip `#` comments so prose about the old shape never trips the scan. */
const stripped = source
  .split("\n")
  .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
  .join("\n");

test("the release job builds the sha the gate reasoned over", () => {
  assert.match(
    stripped,
    /ref:\s*\$\{\{\s*needs\.gate\.outputs\.sha\s*\}\}/,
    "the tarball must be built from the commit whose range produced the bump",
  );
});

test("landing is delegated to scripts/release/land.mjs", () => {
  assert.match(
    stripped,
    /node scripts\/release\/land\.mjs/,
    "release.yml must land through land.mjs, where the tag-on-the-published-tree rule is tested",
  );
});

test("the landing step is handed the gated sha, not main's tip", () => {
  assert.match(
    stripped,
    /RELEASE_SHA:\s*\$\{\{\s*needs\.gate\.outputs\.sha\s*\}\}/,
    "land.mjs bases the version commit on --sha; that sha must be the gate's, or the tag can cover uninspected commits",
  );
  assert.match(stripped, /land\.mjs[^\n]*--sha="\$RELEASE_SHA"/);
});

test("release.yml never pushes a branch or tag by hand", () => {
  // Any of these is a landing path that bypasses land.mjs, and the one that
  // caused the incident (`checkout -B version-bump origin/main`) is among them.
  for (const pattern of [/git push/, /git tag/, /checkout -f -B [^\n]*origin\/main/]) {
    assert.doesNotMatch(
      stripped,
      pattern,
      `release.yml must not run \`${pattern.source}\` itself — land.mjs owns the refs`,
    );
  }
});

test("the GitHub Release is created from the tag the landing step pushed", () => {
  // --generate-notes builds the notes from the tag's range, so the notes only
  // describe the published tree if the tag already exists. Without --verify-tag
  // a missing tag is created here, at the default branch's tip.
  assert.match(stripped, /gh release create[\s\S]{0,200}--verify-tag/);
});
