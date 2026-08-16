// Component inventory coverage.
//
// `Foundations/Inventory → AllComponents` is the page that answers "what is in
// this design system?". It was hand-authored, and it drifted: at the time this
// test was written it rendered 11 of ~73 exported components — no layout
// primitives, no typography, no overlays, no chrome, no board preview, no
// plugin cards, no editor — and even the components it did show were stale
// (six of Button's seven variants, four of Badge's eight, two of Alert's
// five). Nothing failed, because nothing was checking.
//
// This asserts coverage instead of trusting authorship, the same way
// token-registry.test.mjs keeps the colour inventory honest (issue #169). It
// resolves what the package actually exports by IMPORTING the built barrel and
// inspecting the values — not by parsing source text — so a component counts
// as exported only if it really is, and TipTap extensions, label constants and
// board character tables are excluded by what they are at runtime rather than
// by a naming convention that would rot.
//
// The other half of the guarantee is in TypeScript: `DEMOS` in
// component-inventory-demos.tsx is typed `Record<InventoryName, …>`, so a name
// inventoried here without a demo — or a demo for a name not inventoried — is
// a compile error. This test closes the remaining gap, which is a component
// that is exported but never inventoried at all.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// Exported, component-like, and deliberately NOT inventoried. Every entry
// needs a reason: the point of the test is that omissions are decisions
// someone made on purpose, not components that quietly fell off the page.
//
// Sub-parts (CardHeader, DialogTrigger, SelectItem, …) are NOT listed here —
// they are recognised structurally, by sharing a prefix with an inventoried
// root, and they are covered by that root's demo.
const EXCLUDED = {
  ScrollBar: "Rendered by ScrollArea; never mounted on its own, so it has no standalone demo.",
  PageIconGradientDefs:
    "An <svg width=0> holding the gradient PageHeader's icon strokes reference. It has no visual of its own — the PageHeader demo mounts it.",
  NodeViewInjectionProvider: "Context provider for the editor's node views. Renders nothing.",
  ColorTileNodeView: "TipTap NodeViewRenderer — only mountable inside a ProseMirror document, via TemplateEditor.",
  FillSpaceNodeView: "TipTap NodeViewRenderer — only mountable inside a ProseMirror document, via TemplateEditor.",
  FormulaNodeView: "TipTap NodeViewRenderer — only mountable inside a ProseMirror document, via TemplateEditor.",
  VariableNodeView: "TipTap NodeViewRenderer — only mountable inside a ProseMirror document, via TemplateEditor.",
  WrappedTextView: "TipTap NodeViewRenderer — only mountable inside a ProseMirror document, via TemplateEditor.",
};

const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(path.join(cacheDir, "component-inventory-coverage-"));

/** Bundle a source module to ESM and import it. Dependencies stay external. */
async function load(entry, outname) {
  const outfile = path.join(workDir, outname);
  await build({
    entryPoints: [path.join(repoRoot, entry)],
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: ["import", "default"],
    jsx: "automatic",
    // The barrel's graph reaches stylesheets and SVG assets. Neither affects
    // which names are exported, and neither is loadable in Node.
    loader: { ".css": "empty", ".svg": "empty" },
    packages: "external",
    outfile,
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

const barrel = await load("src/index.ts", "barrel.mjs");
const registry = await load("src/stories/component-inventory.ts", "inventory.mjs");

// What counts as a component at runtime: a function, or the object React hands
// back from memo()/forwardRef(). Everything else exported in PascalCase from
// the barrel is data — TipTap Extension instances (VariableNode, FormulaNode,
// …), label defaults, colour tables — and is not something an inventory page
// could render.
const MEMO = Symbol.for("react.memo");
const FORWARD_REF = Symbol.for("react.forward_ref");
const isComponent = (value) =>
  typeof value === "function" ||
  (typeof value === "object" && value !== null && (value.$$typeof === MEMO || value.$$typeof === FORWARD_REF));

const exportedComponents = Object.entries(barrel)
  .filter(([name, value]) => /^[A-Z]/.test(name) && isComponent(value))
  .map(([name]) => name)
  .sort();

const inventoried = new Set(registry.INVENTORY_ENTRIES.map((entry) => entry.name));

/**
 * `CardHeader` is Card's, `DialogTrigger` is Dialog's. A name that is not
 * inventoried itself but extends one that is belongs to that component and is
 * demonstrated with it.
 *
 * Longest match wins, and inventoried names are checked before prefixes, so
 * `AlertDialog` resolves to itself rather than being swallowed as a part of
 * `Alert`, and `AlertDialogTrigger` resolves to `AlertDialog`.
 */
const subPartRoot = (name) =>
  [...inventoried].filter((root) => name.startsWith(root) && name !== root).sort((a, b) => b.length - a.length)[0];

test("every exported component is inventoried", () => {
  const uncovered = exportedComponents.filter(
    (name) => !inventoried.has(name) && !subPartRoot(name) && !(name in EXCLUDED),
  );

  assert.deepEqual(
    uncovered,
    [],
    `Exported but missing from the component inventory: ${uncovered.join(", ")}.\n` +
      "Add an entry to src/stories/component-inventory.ts (and its demo in " +
      "component-inventory-demos.tsx), or add it to EXCLUDED here with the reason it cannot be shown.",
  );
});

test("the inventory names components that are actually exported", () => {
  const exported = new Set(exportedComponents);
  const phantom = [...inventoried].filter((name) => !exported.has(name)).sort();

  assert.deepEqual(
    phantom,
    [],
    `Inventoried but not exported from src/index.ts: ${phantom.join(", ")}. ` +
      "The component was renamed or removed and the inventory was left behind.",
  );
});

test("EXCLUDED does not outlive its entries", (t) => {
  const exported = new Set(exportedComponents);

  const gone = Object.keys(EXCLUDED).filter((name) => !exported.has(name));
  assert.deepEqual(gone, [], `EXCLUDED lists names the package no longer exports: ${gone.join(", ")}. Drop them.`);

  // An excluded name that later gets inventoried is not a failure — whoever
  // added the demo should not have to land a change to this file too. Say so
  // and let them tidy up.
  const nowShown = Object.keys(EXCLUDED).filter((name) => inventoried.has(name));
  if (nowShown.length > 0) {
    t.diagnostic(`EXCLUDED is stale — ${nowShown.join(", ")} is now inventoried; drop the entry.`);
  }
});

test("every inventory section is non-empty and uniquely named", () => {
  const names = registry.INVENTORY_ENTRIES.map((entry) => entry.name);
  const duplicated = names.filter((name, i) => names.indexOf(name) !== i);
  assert.deepEqual(duplicated, [], `Inventoried twice: ${duplicated.join(", ")}`);

  for (const section of registry.INVENTORY) {
    assert.ok(section.entries.length > 0, `Inventory section "${section.id}" is empty — drop it or fill it.`);
  }
});
