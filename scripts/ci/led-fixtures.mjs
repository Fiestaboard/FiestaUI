// Emit the board/LED contract as data for FiestaBoard's Python port and its
// output plugins, so a port can prove it reads and renders a message exactly
// like FiestaUI. Today that is the icon registry; the LED data-layer PRs add
// the font tables, the built-in character sets and device models, and the
// golden layout / transition cases to this same script.
//
//   node scripts/ci/led-fixtures.mjs          # regenerate scripts/ci/tests/fixtures/*.json
//
// src/lib/led-fixtures.test.ts recomputes every fixture and fails when they
// drift from the code; regenerate on purpose, then commit both.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { format, resolveConfig } from "prettier";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = path.join(repoRoot, "scripts/ci/tests/fixtures");
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(path.join(cacheDir, "led-fixtures-"));

async function load(entry) {
  const outfile = path.join(workDir, path.basename(entry).replace(/\.ts$/, ".mjs"));
  await build({
    entryPoints: [path.join(repoRoot, entry)],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile,
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

const icons = await load("src/lib/board-icons.ts");

// Written through prettier so `format:check` accepts the fixtures as committed.
const write = async (name, data) => {
  const file = path.join(fixtures, name);
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(JSON.stringify(data), { ...options, filepath: file }));
  console.log("wrote", name);
};

// Icons: names, labels, colours, flap fallbacks, aliases.
await write("board-icons.json", { icons: icons.BOARD_ICONS, aliases: icons.BOARD_ICON_ALIASES });
