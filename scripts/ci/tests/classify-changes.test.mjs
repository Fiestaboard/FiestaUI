import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyFiles, isCodeFile } from "../classify-changes.mjs";

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
