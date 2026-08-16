// Static conformance test for src/components/effects/aurora.tsx (issue #72).
//
// These are *source-text* assertions, not behavioral tests: the component
// drives a WebGL canvas via rAF, which node:test cannot exercise. What we can
// pin down statically is the shape of the two fixes:
//
//   (a) render purity — the `propsRef.current = ...` sync must live inside a
//       useLayoutEffect callback, never in the component's render body
//       (render-phase ref mutation is unsafe under concurrent rendering);
//   (b) the window "resize" listener must register a rAF-coalesced handler
//       (in-flight guard variable + requestAnimationFrame + cancel in
//       cleanup), mirroring scaled-board-display.tsx, instead of calling
//       renderer.setSize synchronously per event.
//
// The parsing is deliberately simple (regex over file order, not an AST), so
// a sufficiently creative refactor could fool it — but it will catch the
// realistic regression of someone moving the assignment back to the render
// body or re-registering the raw resize() function on the event.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const auroraPath = resolve(repoRoot, "src/components/effects/aurora.tsx");
const src = readFileSync(auroraPath, "utf8");

test("aurora syncs propsRef inside useLayoutEffect, not in the render body", () => {
  const layoutEffectIdx = src.indexOf("useLayoutEffect(");
  assert.notEqual(
    layoutEffectIdx,
    -1,
    "aurora.tsx must contain a useLayoutEffect( call that syncs propsRef before paint",
  );

  // Every *assignment* to propsRef.current (reads like `propsRef.current.foo`
  // or `const p = propsRef.current;` are fine) must appear after the first
  // useLayoutEffect opener in file order — i.e. inside an effect callback,
  // never in the render body, which runs before any hook callback in source
  // order within the component function.
  const assignment = /propsRef\.current\s*=(?!=)/g;
  const assignments = [...src.matchAll(assignment)];
  assert.ok(assignments.length > 0, "expected a propsRef.current assignment somewhere in the file");
  for (const match of assignments) {
    assert.ok(
      match.index > layoutEffectIdx,
      `propsRef.current assignment at offset ${match.index} appears before the ` +
        "useLayoutEffect( opener — i.e. in the component's render body (render-phase side effect)",
    );
  }

  // Belt and braces: the render body between the component function's opening
  // brace and its first hook call must contain no `.current =` mutation.
  const componentIdx = src.indexOf("export function Aurora(");
  assert.notEqual(componentIdx, -1, "expected `export function Aurora(` in aurora.tsx");
  const firstHookIdx = src.slice(componentIdx).search(/\buse[A-Z]/) + componentIdx;
  const preHookBody = src.slice(componentIdx, firstHookIdx);
  assert.ok(
    !/\.current\s*=(?!=)/.test(preHookBody),
    "found a `.current =` mutation before the first hook call — a render-phase side effect",
  );
});

test("aurora's window resize listener is rAF-coalesced with an in-flight guard", () => {
  // The listener must not be the raw resize() function.
  const listenerMatch = src.match(/window\.addEventListener\(\s*["']resize["']\s*,\s*(\w+)\s*\)/);
  assert.ok(listenerMatch, 'expected window.addEventListener("resize", <handler>) in aurora.tsx');
  const handler = listenerMatch[1];
  assert.notEqual(
    handler,
    "resize",
    "the raw resize() function is registered directly on the resize event — it must be rAF-coalesced",
  );

  // An in-flight guard variable (the scaled-board-display.tsx pattern):
  //   let <x>RafId: number | null = null;
  //   if (<x>RafId !== null) return;   ... requestAnimationFrame(...)
  const guardDecl = src.match(/let\s+(\w*[rR]af\w*)\s*:\s*number\s*\|\s*null\s*=\s*null/);
  assert.ok(guardDecl, "expected a rAF guard variable (`let <x>RafId: number | null = null`)");
  const guardVar = guardDecl[1];
  assert.ok(
    new RegExp(`if\\s*\\(\\s*${guardVar}\\s*!==\\s*null\\s*\\)\\s*return`).test(src),
    `expected an in-flight guard (\`if (${guardVar} !== null) return\`) in the resize handler`,
  );
  assert.ok(
    new RegExp(`${guardVar}\\s*=\\s*requestAnimationFrame\\(`).test(src),
    `expected \`${guardVar} = requestAnimationFrame(...)\` scheduling the coalesced resize`,
  );
  assert.ok(
    new RegExp(`cancelAnimationFrame\\(${guardVar}\\)`).test(src),
    `expected the effect cleanup to cancelAnimationFrame(${guardVar})`,
  );
});
