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
// It also proves the static literals hoisted out of cn() in switch.tsx and
// slider.tsx are fixed points of cn (cn(s) === s), i.e. dropping the wrapper is
// a no-op — and, separately, that the copies recorded here still match the
// literals those files actually declare.
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
// from the components named below; the assertions prove that wrapping them in
// cn() was a byte-identical no-op, so the hoist cannot change rendering.
//
// "Verbatim" is the whole point and nothing enforces it — these are copies, and
// a copy that silently drifts from its source proves a no-op for a string the
// component no longer renders. That already happened once: the switch thumb
// entry outlived the #158/#164 rewrite (thumb stopped inverting, size-4 -> 5,
// travel -2px -> +2px) and kept passing, because `cn(s) === s` holds for ANY
// string. Re-copy these whenever the source literal changes.
const HOISTED_STATICS = {
  "switch.tsx thumb": {
    source: "src/components/ui/switch.tsx",
    binding: "thumbClassName",
    value:
      "bg-background dark:bg-foreground pointer-events-none block size-5 rounded-full border border-input ring-0 transition-transform data-[checked]:translate-x-[calc(100%+2px)] data-[unchecked]:translate-x-0",
  },
  "slider.tsx thumb": {
    source: "src/components/ui/slider.tsx",
    binding: "thumbClassName",
    value:
      "block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] outline-none hover:ring-[3px] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 before:absolute before:top-1/2 before:left-1/2 before:size-6 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] group-aria-invalid/slider:border-destructive group-aria-invalid/slider:ring-destructive/20 dark:group-aria-invalid/slider:ring-destructive/40",
  },
};

/**
 * Read the `const <binding> = "…"` literal straight out of a source file.
 *
 * Only double-quoted single-line literals are supported, which is what
 * prettier produces for these; a template literal or a concatenation would
 * throw here rather than silently match nothing.
 */
function readHoistedLiteral({ source, binding }) {
  const text = readFileSync(path.join(repoRoot, source), "utf8");
  const match = new RegExp(String.raw`const\s+${binding}\s*=\s*("(?:[^"\\]|\\.)*")`).exec(text);
  assert.ok(match, `could not find a double-quoted \`const ${binding}\` literal in ${source}`);
  return JSON.parse(match[1]);
}

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
  for (const [where, { value }] of Object.entries(HOISTED_STATICS)) {
    assert.equal(cn(value), value, `cn() would alter the hoisted literal from ${where}`);
  }
});

// Without this, the test above proves a no-op for a string the component may no
// longer render — `cn(s) === s` holds for ANY string, so a drifted copy stays
// green forever. That is not hypothetical: the switch thumb entry survived the
// #158/#164 rewrite (thumb stopped inverting, size-4 -> size-5, travel
// -2px -> +2px) with the suite passing throughout.
test("hoisted copies still match the literal in their source file", () => {
  for (const [where, entry] of Object.entries(HOISTED_STATICS)) {
    assert.equal(
      readHoistedLiteral(entry),
      entry.value,
      `${where} has drifted from ${entry.source} — re-copy the literal into HOISTED_STATICS`,
    );
  }
});
