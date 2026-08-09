import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyFiles, isCodeFile, isShippedFile } from "../classify-changes.mjs";

test("prose and docs are not code", () => {
  assert.equal(isCodeFile("README.md"), false);
  assert.equal(isCodeFile("docs/VISUAL_REGRESSION.md"), false);
  assert.equal(isCodeFile("docs/superpowers/specs/whatever-design.md"), false);
  assert.equal(isCodeFile("src/components/ui/button/README.md"), false);
});

test("the audit crons' bookkeeping files are not code", () => {
  assert.equal(isCodeFile(".github/perf-audit-state.json"), false);
  assert.equal(isCodeFile(".github/a11y-audit-state.json"), false);
  assert.equal(isCodeFile(".github/perf-audit/rejected-edits.jsonl"), false);
  assert.equal(isCodeFile(".github/a11y-audit/rejected-edits.jsonl"), false);
});

test("audit directories are only exempt for their rejection log", () => {
  assert.equal(isCodeFile(".github/perf-audit/build_rejection.py"), true);
  assert.equal(isCodeFile(".github/a11y-audit/verify-a11y.sh"), true);
});

test("state-file exemption does not extend to nested paths", () => {
  assert.equal(isCodeFile(".github/nested/perf-audit-state.json"), true);
  assert.equal(isCodeFile(".github/workflows/ci.yml"), true);
});

test("source, config, and lockfiles are code", () => {
  assert.equal(isCodeFile("src/index.ts"), true);
  assert.equal(isCodeFile("package.json"), true);
  assert.equal(isCodeFile("package-lock.json"), true);
  assert.equal(isCodeFile("vite.config.ts"), true);
  assert.equal(isCodeFile("src/styles/theme.css"), true);
});

test("an unrecognized path counts as code", () => {
  assert.equal(isCodeFile("some/brand/new/thing.rs"), true);
  assert.equal(isCodeFile("Dockerfile"), true);
});

test("a list of only non-code paths classifies as non-code", () => {
  const result = classifyFiles(["README.md", "docs/guide.md", ".github/perf-audit-state.json"]);
  assert.equal(result.code, false);
  assert.deepEqual(result.codeFiles, []);
  assert.equal(result.nonCodeFiles.length, 3);
});

test("one code path among many non-code paths wins", () => {
  const result = classifyFiles(["README.md", "docs/guide.md", "src/components/ui/button/button.tsx"]);
  assert.equal(result.code, true);
  assert.deepEqual(result.codeFiles, ["src/components/ui/button/button.tsx"]);
});

test("blank lines and surrounding whitespace are ignored", () => {
  const result = classifyFiles(["", "  README.md  ", "", "docs/guide.md"]);
  assert.equal(result.code, false);
  assert.deepEqual(result.nonCodeFiles, ["README.md", "docs/guide.md"]);
});

test("an empty list is treated as code", () => {
  // Reaching the classifier with nothing to classify means something upstream
  // is wrong; assume everything changed rather than skip the suite.
  assert.equal(classifyFiles([]).code, true);
  assert.equal(classifyFiles(["", "   "]).code, true);
});

// --- shipping classification -------------------------------------------------
// `code` and `shipped` answer different questions. Editing ci.yml must still run
// the full suite (the workflow *is* the suite), but it cannot change a byte of
// dist/, so it must not cut a version. Conflating the two is what made the
// app-token fix (#148) publish an empty v1.6.1.

test("CI-only infrastructure is code but does not ship", () => {
  for (const p of [
    ".github/workflows/ci.yml",
    ".github/workflows/vrt-update.yml",
    ".github/workflows/claude-perf-audit.yml",
    ".github/workflows/deploy-storybook.yml",
    "scripts/ci/classify-changes.mjs",
    "scripts/ci/tests/main-push-app-token.test.mjs",
    "vrt/baselines/light/chrome-sidebar--default.png",
    "vrt/skip.json",
    ".storybook/preview.ts",
  ]) {
    assert.equal(isCodeFile(p), true, `${p} should still run the full suite`);
    assert.equal(isShippedFile(p), false, `${p} cannot change dist/ and must not cut a release`);
  }
});

test("the publish path itself still ships", () => {
  // These decide HOW the tarball is built and versioned, so a change to them
  // can change what consumers receive. Safe direction is to cut a release.
  for (const p of [
    ".github/workflows/release.yml",
    ".github/workflows/downstream-upgrade.yml",
    "scripts/release/gate.mjs",
    "scripts/release/tests/gate.test.mjs",
  ]) {
    assert.equal(isShippedFile(p), true, `${p} affects what gets published`);
  }
});

test("source, config, and lockfiles ship", () => {
  for (const p of ["src/index.ts", "src/styles/theme.css", "package.json", "package-lock.json", "vite.config.ts"]) {
    assert.equal(isShippedFile(p), true);
  }
});

test("anything already non-code is also non-shipping", () => {
  for (const p of ["README.md", "docs/guide.md", ".github/perf-audit-state.json"]) {
    assert.equal(isShippedFile(p), false);
  }
});

test("an unrecognized path ships", () => {
  // Same doctrine as isCodeFile: the safe failure is an extra release, never a
  // silently skipped one.
  assert.equal(isShippedFile("some/brand/new/thing.rs"), true);
  assert.equal(isShippedFile("Dockerfile"), true);
});

test("classifyFiles reports shipping separately from code", () => {
  const ciOnly = classifyFiles([".github/workflows/ci.yml", "scripts/ci/tests/x.test.mjs"]);
  assert.equal(ciOnly.code, true, "still worth the full suite");
  assert.equal(ciOnly.shipped, false, "but nothing shipped changed");
  assert.deepEqual(ciOnly.shippedFiles, []);
  assert.equal(ciOnly.unshippedFiles.length, 2);

  const mixed = classifyFiles([".github/workflows/ci.yml", "src/components/ui/button/button.tsx"]);
  assert.equal(mixed.code, true);
  assert.equal(mixed.shipped, true, "one shipped path is enough");
  assert.deepEqual(mixed.shippedFiles, ["src/components/ui/button/button.tsx"]);
});

test("an empty list is treated as shipping", () => {
  assert.equal(classifyFiles([]).shipped, true);
  assert.equal(classifyFiles(["", "   "]).shipped, true);
});

test("a non-code list is never a shipping list", () => {
  // shipped must imply code: anything that can change dist/ is by definition
  // worth running the suite over. This invariant is what keeps a release from
  // ever being cut on a commit whose suite never ran.
  const paths = [
    "README.md",
    "docs/guide.md",
    ".github/perf-audit-state.json",
    ".github/workflows/ci.yml",
    "scripts/ci/classify-changes.mjs",
    "vrt/skip.json",
    "src/index.ts",
    "package.json",
    ".github/workflows/release.yml",
    "Dockerfile",
  ];
  for (const p of paths) {
    if (isShippedFile(p)) {
      assert.equal(isCodeFile(p), true, `${p} ships but would skip the suite — a release could go out untested`);
    }
  }
});
