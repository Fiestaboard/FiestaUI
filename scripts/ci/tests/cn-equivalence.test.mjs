// Equivalence test for the issue #82 cn() call-site refactors.
//
// It compiles the real src modules (button.tsx, switch.tsx, utils.ts) with
// esbuild and proves, for a matrix of (variant, size, className) including
// conflicting utilities, that:
//
//   OLD button form  cn(buttonVariants({ variant, size, className }))
//   NEW button form  cn(buttonVariants({ variant, size }), className)
//
// produce byte-identical strings — both live (old vs new computed side by
// side) and against a snapshot recorded from the pre-refactor tree
// (scripts/ci/tests/fixtures/cn-equivalence.snapshot.json). The snapshot was
// generated at HEAD *before* the refactor and committed together with this
// test, so a refactor that changed any output would turn the suite red.
//
// It also proves the static literals hoisted out of cn() in switch.tsx are
// fixed points of cn (cn(s) === s), i.e. dropping the wrapper is a no-op.
//
// Regenerate the snapshot (only when button/switch classes intentionally
// change): UPDATE_CN_SNAPSHOT=1 node --test scripts/ci/tests/cn-equivalence.test.mjs

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSync } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const snapshotPath = path.join(repoRoot, "scripts/ci/tests/fixtures/cn-equivalence.snapshot.json");

// Compile the real source modules to an ESM file and import it. The bundle
// keeps react/@base-ui external, so it must live under the repo's
// node_modules for those bare specifiers to resolve at import time.
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const outfile = path.join(mkdtempSync(path.join(cacheDir, "cn-equivalence-")), "bundle.mjs");
buildSync({
  stdin: {
    contents: `
      export { buttonVariants } from "./src/components/ui/button.tsx";
      export { cn } from "./src/lib/utils.ts";
    `,
    resolveDir: repoRoot,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  conditions: ["import", "default"],
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime", "@base-ui/react/*"],
  outfile,
  logLevel: "silent",
});
const { buttonVariants, cn } = await import(pathToFileURL(outfile).href);

const variants = [undefined, "default", "brand", "destructive", "outline", "secondary", "ghost", "link"];
const sizes = [undefined, "default", "sm", "lg", "icon", "icon-sm", "icon-lg"];
// Includes overrides that conflict with the button base/size classes, so the
// test exercises twMerge's conflict resolution, not just concatenation.
const classNames = [
  undefined,
  "",
  "px-9",
  "h-11 px-9 rounded-full",
  "bg-red-500 text-white hover:bg-red-600",
  "p-2 p-4", // internally conflicting — twMerge collapses this to p-4
  "w-full justify-between font-semibold",
];

const cases = [];
for (const variant of variants) {
  for (const size of sizes) {
    for (const className of classNames) {
      cases.push({ variant, size, className });
    }
  }
}

const caseKey = ({ variant, size, className }) => JSON.stringify([variant ?? null, size ?? null, className ?? null]);

const oldForm = ({ variant, size, className }) => cn(buttonVariants({ variant, size, className }));
const newForm = ({ variant, size, className }) => cn(buttonVariants({ variant, size }), className);

// Static literals hoisted out of cn() (issue #82 pattern 2). Kept verbatim
// from src/components/ui/switch.tsx; the assertions prove that wrapping them
// in cn() was a byte-identical no-op, so the hoist cannot change rendering.
const HOISTED_STATICS = {
  "switch.tsx thumb": [
    "bg-background dark:data-[unchecked]:bg-foreground dark:data-[checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[checked]:translate-x-[calc(100%-2px)] data-[unchecked]:translate-x-0",
  ],
};

if (process.env.UPDATE_CN_SNAPSHOT) {
  const snapshot = {};
  for (const c of cases) snapshot[caseKey(c)] = oldForm(c);
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
}

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

test("sanity: cn of a single string still resolves internal conflicts", () => {
  // This is why utils.ts got no single-argument fast path (issue #82
  // pattern 4): skipping twMerge for one input would change output.
  assert.equal(cn("p-2 p-4"), "p-4");
});

test("button: cva-with-className and cn(base, className) forms are byte-identical", () => {
  for (const c of cases) {
    assert.equal(newForm(c), oldForm(c), `forms diverge for ${caseKey(c)}`);
  }
});

test("button: output matches the pre-refactor snapshot", () => {
  assert.equal(Object.keys(snapshot).length, cases.length, "snapshot is stale — case matrix changed");
  for (const c of cases) {
    assert.equal(newForm(c), snapshot[caseKey(c)], `snapshot mismatch for ${caseKey(c)}`);
  }
});

test("hoisted static class strings are fixed points of cn()", () => {
  for (const [where, strings] of Object.entries(HOISTED_STATICS)) {
    for (const s of strings) {
      assert.equal(cn(s), s, `cn() would alter the hoisted literal from ${where}`);
    }
  }
});
