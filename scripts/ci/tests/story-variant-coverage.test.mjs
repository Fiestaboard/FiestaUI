// Aggregate-story variant coverage (issue #170).
//
// `Alert` declared five variants and its `AllVariants` story rendered two, so
// info/success/warning had no side-by-side review, no VRT baseline and no
// autodocs presence for months. That is a class of bug, not an Alert bug: any
// component whose cva config grows a variant can silently leave its aggregate
// story behind, and the only thing stopping it was authorship discipline.
//
// This asserts coverage instead of trusting authorship. For each registered
// component it renders the aggregate story for real (esbuild-compiled from
// src/, rendered with react-dom/server) and checks that every variant key
// declared in the cva config actually appears in the output. "Appears" is
// decided by class strings, not by reading the JSX: for each key it derives
// the classes unique to that key and requires some rendered element to carry
// all of them. That survives refactors of how the story is authored, and it
// notices a variant that renders identically to another one.
//
// Components with no cva variants (Input, Switch) are deliberately absent:
// their aggregate stories enumerate HTML input types and interaction states,
// neither of which is declared anywhere a test can read, so there is nothing
// to assert against. Registering them would only add a vacuous pass.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// (component label, module basename, cva export, aggregate story export).
const REGISTRY = [
  { label: "Alert", module: "alert", variantsExport: "alertVariants", story: "AllVariants" },
  { label: "Badge", module: "badge", variantsExport: "badgeVariants", story: "AllVariants" },
  { label: "Button", module: "button", variantsExport: "buttonVariants", story: "AllVariants" },
  { label: "Button sizes", module: "button", variantsExport: "buttonVariants", story: "AllSizes", group: "size" },
];

// Gaps that exist on main and are owned by other work. The assertion is
// "no NEW gaps", not "exactly these gaps": a listed gap that gets closed is
// reported as a diagnostic rather than a failure, so whoever fixes it does
// not have to land a change to this file in the same commit. Deleting the
// entry afterwards is the tidy-up, and the diagnostic is the reminder.
const KNOWN_GAPS = {
  // badge.tsx declares a `brand` variant; badge.stories.tsx AllVariants
  // renders the other seven. Filed under issue #170.
  "Badge → AllVariants": ["brand"],
};

// Compile the real src modules — components and their story files — to one
// ESM bundle. React, Base UI and lucide stay external, so the bundle has to
// live under the repo's node_modules for those bare specifiers to resolve.
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(path.join(cacheDir, "story-variant-coverage-"));
const outfile = path.join(workDir, "bundle.mjs");

// cva closes over its config and exposes no way to read it back, so a
// component's declared variant keys are not reachable from the exported
// function. Rather than re-parsing the TSX (which would test the source text,
// not the config the component actually runs on), swap the package for a shim
// that hangs the config off the returned function. Behaviour is unchanged —
// the real cva does the work.
const shim = path.join(workDir, "cva-capture.mjs");
// esbuild resolves file paths, not file:// URLs.
const realCva = fileURLToPath(import.meta.resolve("class-variance-authority"));
writeFileSync(
  shim,
  `export * from ${JSON.stringify(realCva)};\n` +
    `import { cva as base } from ${JSON.stringify(realCva)};\n` +
    `export const cva = (baseClasses, config) => Object.assign(base(baseClasses, config), { config });\n`,
);

const modules = [...new Set(REGISTRY.map((entry) => entry.module))];
await build({
  stdin: {
    contents: modules
      .map(
        (name) =>
          `export * as ${name}Component from "./src/components/ui/${name}.tsx";\n` +
          `export * as ${name}Stories from "./src/components/ui/${name}.stories.tsx";`,
      )
      .join("\n"),
    resolveDir: repoRoot,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  conditions: ["import", "default"],
  jsx: "automatic",
  alias: { "class-variance-authority": shim },
  external: ["react", "react-dom", "react-dom/*", "react/jsx-runtime", "@base-ui/react/*", "lucide-react"],
  outfile,
  logLevel: "silent",
});
const bundle = await import(pathToFileURL(outfile).href);

// renderToStaticMarkup escapes attribute values, so arbitrary-variant classes
// come back as e.g. `[&amp;&gt;svg]:text-info`.
const unescape = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");

const renderedClassLists = (html) =>
  [...html.matchAll(/class="([^"]*)"/g)].map((m) => new Set(unescape(m[1]).split(/\s+/).filter(Boolean)));

// A Storybook CSF export is either a bare component (`export const X = () =>
// …`) or a story object with a `render`. Both shapes are in use in this repo.
const renderStory = (story, label) => {
  const Component = typeof story === "function" ? story : story?.render;
  assert.ok(typeof Component === "function", `${label}: story export is neither a component nor a { render } object`);
  return renderToStaticMarkup(React.createElement(Component, story.args ?? {}));
};

// The classes that identify one variant key: everything cva emits for it that
// it does not emit for at least one sibling. Base classes and classes shared
// by every key drop out, so the check is not fooled by a story that renders
// the same variant twice. If two keys are byte-identical the discriminator is
// empty for both — that is itself worth failing on, since one of them is dead.
const discriminators = (variantsFn, group, keys) => {
  const emitted = new Map(
    keys.map((key) => [
      key,
      new Set(
        variantsFn({ [group]: key })
          .split(/\s+/)
          .filter(Boolean),
      ),
    ]),
  );
  const out = new Map();
  for (const key of keys) {
    const own = emitted.get(key);
    const shared = new Set();
    for (const other of keys) {
      if (other === key) continue;
      for (const cls of emitted.get(other)) shared.add(cls);
    }
    out.set(key, new Set([...own].filter((cls) => !shared.has(cls))));
  }
  return out;
};

for (const entry of REGISTRY) {
  const group = entry.group ?? "variant";
  const label = `${entry.label} → ${entry.story}`;

  test(`${label} renders every declared ${group}`, (t) => {
    const variantsFn = bundle[`${entry.module}Component`][entry.variantsExport];
    assert.ok(typeof variantsFn === "function", `${entry.module}.tsx must export ${entry.variantsExport}`);

    const declared = Object.keys(variantsFn.config?.variants?.[group] ?? {});
    assert.ok(declared.length > 0, `${label}: no "${group}" group in the cva config — registry entry is stale`);

    const story = bundle[`${entry.module}Stories`][entry.story];
    assert.ok(story, `${label}: story export not found`);
    const classLists = renderedClassLists(renderStory(story, label));

    const marks = discriminators(variantsFn, group, declared);
    const missing = declared.filter((key) => {
      const wanted = marks.get(key);
      assert.ok(wanted.size > 0, `${label}: "${key}" emits no classes of its own — it duplicates another ${group}`);
      return !classLists.some((rendered) => [...wanted].every((cls) => rendered.has(cls)));
    });

    const known = KNOWN_GAPS[label] ?? [];
    const unexpected = missing.filter((key) => !known.includes(key));
    assert.deepEqual(
      unexpected,
      [],
      `${label} does not render: ${unexpected.join(", ")}. ` +
        `Add ${unexpected.length === 1 ? "it" : "them"} to the story, or the aggregate render is no longer aggregate.`,
    );

    const closed = known.filter((key) => !missing.includes(key));
    if (closed.length > 0) {
      t.diagnostic(`KNOWN_GAPS for "${label}" is stale — ${closed.join(", ")} now render(s); drop the entry.`);
    }
  });
}
