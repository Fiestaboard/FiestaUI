import assert from "node:assert/strict";
import { test } from "node:test";

import { alphaReleaseAction, checkPreModeForBase } from "../pre-mode.mjs";

// The shape `changeset pre enter alpha` writes in Changesets v3.
const PRE = { mode: "pre", tag: "alpha" };
const EXIT = { ...PRE, mode: "exit" };

test("main accepts no pre.json", () => {
  assert.equal(checkPreModeForBase({ baseRef: "main", preJson: null }).ok, true);
});

test("main rejects pre.json in pre mode", () => {
  const result = checkPreModeForBase({ baseRef: "main", preJson: PRE });
  assert.equal(result.ok, false);
  assert.match(result.reason, /changeset pre exit/);
});

test("main accepts pre.json in exit mode — the promotion PR", () => {
  assert.equal(checkPreModeForBase({ baseRef: "main", preJson: EXIT }).ok, true);
});

test("alpha rejects missing pre.json", () => {
  const result = checkPreModeForBase({ baseRef: "alpha", preJson: null });
  assert.equal(result.ok, false);
  assert.match(result.reason, /changeset pre enter alpha/);
});

test("alpha rejects a non-alpha tag", () => {
  assert.equal(checkPreModeForBase({ baseRef: "alpha", preJson: { ...PRE, tag: "beta" } }).ok, false);
});

test("alpha accepts pre mode with tag alpha", () => {
  assert.equal(checkPreModeForBase({ baseRef: "alpha", preJson: PRE }).ok, true);
});

test("alpha accepts exit mode — the pre exit PR", () => {
  assert.equal(checkPreModeForBase({ baseRef: "alpha", preJson: EXIT }).ok, true);
});

test("other bases are unchecked", () => {
  for (const preJson of [null, PRE, { mode: "pre", tag: "beta" }]) {
    assert.equal(checkPreModeForBase({ baseRef: "feat/x", preJson }).ok, true);
  }
});

test("alpha publish requires pre mode with tag alpha", () => {
  assert.equal(alphaReleaseAction(PRE), "release");
  // Promotion in progress: neither version nor publish on alpha, or the action
  // would open a stable Version PR against alpha and publish to `latest`.
  assert.equal(alphaReleaseAction(EXIT), "skip");
  assert.throws(() => alphaReleaseAction(null), /changeset pre enter alpha/);
  assert.throws(() => alphaReleaseAction({ ...PRE, tag: "beta" }), /beta/);
  assert.throws(() => alphaReleaseAction({ ...EXIT, tag: "beta" }), /beta/);
});

test("reasons are single-line", () => {
  for (const [baseRef, preJson] of [
    ["main", PRE],
    ["alpha", null],
    ["alpha", { ...PRE, tag: "beta" }],
    ["main", null],
  ]) {
    assert.doesNotMatch(checkPreModeForBase({ baseRef, preJson }).reason, /\n/);
  }
});
