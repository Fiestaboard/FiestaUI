import assert from "node:assert/strict";
import { test } from "node:test";

import { compareReports, packageNameOf } from "../compare.mjs";

const report = (overrides = {}) => ({
  schemaVersion: 1,
  ref: "abc123",
  barrel: { externals: ["clsx"], firstPartyBytes: 10000, totalBytes: 50000 },
  exports: {
    Button: { externals: ["clsx"], firstPartyBytes: 1000, totalBytes: 20000 },
  },
  ...overrides,
});

const entry = (overrides = {}) => ({
  externals: ["clsx"],
  firstPartyBytes: 1000,
  totalBytes: 20000,
  ...overrides,
});

test("packageNameOf reduces specifiers to package names", () => {
  assert.equal(packageNameOf("clsx"), "clsx");
  assert.equal(packageNameOf("react-dom/client"), "react-dom");
  assert.equal(packageNameOf("@base-ui/react"), "@base-ui/react");
  assert.equal(packageNameOf("@base-ui/react/menu"), "@base-ui/react");
});

test("identical reports pass with no findings", () => {
  const result = compareReports(report(), report());
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test("a newly reachable external fails", () => {
  const head = report({
    exports: { Button: entry({ externals: ["clsx", "ogl"] }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].kind, "new-external");
  assert.match(result.failures[0].detail, /ogl/);
});

test("entry growth past both thresholds fails", () => {
  const head = report({
    exports: { Button: entry({ firstPartyBytes: 1300 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].kind, "entry-bytes");
});

test("large percentage but tiny absolute growth does not fail", () => {
  const base = report({ exports: { Tiny: entry({ firstPartyBytes: 100 }) } });
  const head = report({ exports: { Tiny: entry({ firstPartyBytes: 150 }) } });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
});

test("large absolute but tiny percentage growth does not fail", () => {
  const base = report({
    exports: { Big: entry({ firstPartyBytes: 100000 }) },
  });
  const head = report({
    exports: { Big: entry({ firstPartyBytes: 100300 }) },
  });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
});

test("barrel growth past 1 percent fails", () => {
  const head = report({
    barrel: { externals: ["clsx"], firstPartyBytes: 10200, totalBytes: 50000 },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.kind === "barrel-bytes"));
});

test("a new export is reported but never fails", () => {
  const head = report({
    exports: { Button: entry(), Sparkline: entry({ firstPartyBytes: 9999 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.ok(result.rows.some((r) => r.entry === "Sparkline" && r.added));
});

test("a removed export warns but does not fail", () => {
  const head = report({ exports: {} });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.equal(result.warnings[0].kind, "removed-export");
});

test("shrinking and dropping an external are recorded as wins", () => {
  const head = report({
    exports: { Button: entry({ externals: [], firstPartyBytes: 500 }) },
  });
  const result = compareReports(report(), head);
  assert.equal(result.ok, true);
  assert.ok(result.wins.some((w) => w.kind === "dropped-external"));
  assert.ok(result.wins.some((w) => w.kind === "shrink"));
});

test("css growth past both thresholds fails", () => {
  const base = report({ css: { "theme.css": { bytes: 10000 } } });
  const head = report({ css: { "theme.css": { bytes: 10300 } } });
  const result = compareReports(base, head);
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].kind, "css-bytes");
  assert.equal(result.failures[0].entry, "theme.css");
});

test("css growth under the absolute floor does not fail", () => {
  const base = report({ css: { "theme.css": { bytes: 10000 } } });
  const head = report({ css: { "theme.css": { bytes: 10150 } } });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
});

test("css shrink is recorded as a win", () => {
  const base = report({ css: { "theme.css": { bytes: 10000 } } });
  const head = report({ css: { "theme.css": { bytes: 9000 } } });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
  assert.ok(result.wins.some((w) => w.kind === "css-shrink"));
});

test("a new css asset is reported but never fails", () => {
  const base = report({ css: { "theme.css": { bytes: 10000 } } });
  const head = report({
    css: { "theme.css": { bytes: 10000 }, "seasons/pride.css": { bytes: 9999 } },
  });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
  assert.ok(result.cssRows.some((r) => r.entry === "seasons/pride.css" && r.added));
});

test("a removed css asset warns but does not fail", () => {
  const base = report({ css: { "theme.css": { bytes: 10000 } } });
  const head = report({ css: {} });
  const result = compareReports(base, head);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.kind === "removed-css"));
});

test("reports without a css section compare cleanly", () => {
  const result = compareReports(report(), report());
  assert.deepEqual(result.cssRows, []);
  assert.equal(result.ok, true);
});
