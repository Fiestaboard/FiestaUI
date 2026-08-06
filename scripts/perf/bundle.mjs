#!/usr/bin/env node
/**
 * FiestaUI bundle-cost harness.
 *
 * Measures what a consumer actually pays to import from the built library.
 * dist/ is a preserveModules tree rather than a bundle, so its own size means
 * nothing; instead we bundle one synthetic entry per public export and record
 * what each one drags in.
 *
 * Modes:
 *
 *   node scripts/perf/bundle.mjs measure --out <file> [--dist <path>]
 *     Enumerate the barrel's exports, bundle each one, write a JSON report.
 *     Requires a built dist/. --dist defaults to <cwd>/dist.
 *
 *   node scripts/perf/bundle.mjs compare --base <file> --head <file> [--markdown <file>]
 *     Diff two reports, print a table, exit nonzero on regression.
 *
 * --dist is explicit rather than resolved relative to this file so the same
 * harness can measure a dist/ built from any revision. CI relies on that: it
 * rebuilds dist/ in place from the base commit's sources, then from head, and
 * measures both with this one copy of the script.
 *
 * See docs/superpowers/specs/2026-08-05-perf-bundle-harness-design.md.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";

import { compareReports, packageNameOf } from "./compare.mjs";

// The consumer always already has these; everything else is cost we impose.
const CONSUMER_PROVIDED = ["react", "react/*", "react-dom", "react-dom/*"];

const log = (msg) => process.stdout.write(`${msg}\n`);

function parseArgs(argv) {
  const args = {
    mode: argv[2],
    out: null,
    dist: path.resolve(process.cwd(), "dist"),
    base: null,
    head: null,
    markdown: null,
  };
  for (let i = 3; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--out") args.out = argv[++i];
    else if (flag === "--dist") args.dist = path.resolve(argv[++i]);
    else if (flag === "--base") args.base = argv[++i];
    else if (flag === "--head") args.head = argv[++i];
    else if (flag === "--markdown") args.markdown = argv[++i];
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(2);
    }
  }
  return args;
}

/** esbuild plugin: mark every bare specifier external. */
const externalizeBare = {
  name: "externalize-bare",
  setup(builder) {
    builder.onResolve({ filter: /^[^./]/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

/**
 * Externals actually reachable from the FINAL bundle.
 *
 * This must come from the metafile's output imports, not from an onResolve
 * hook. onResolve fires during resolution, which happens before tree-shaking,
 * so collecting there reports every package in the module graph — which for a
 * barrel entry is every package the library uses, for every export. The
 * metafile's outputs[].imports reflect what survived into the bundle.
 */
function externalsFromMetafile(metafile) {
  const names = new Set();
  for (const output of Object.values(metafile.outputs)) {
    for (const imported of output.imports ?? []) {
      if (imported.external) names.add(packageNameOf(imported.path));
    }
  }
  return [...names].sort();
}

function gzippedSize(outputFiles) {
  const source = outputFiles.map((file) => file.text).join("");
  return gzipSync(Buffer.from(source), { level: 9 }).length;
}

/** Bundle with all third-party code external: FiestaUI's own byte cost. */
async function measureFirstParty(contents, resolveDir) {
  const result = await build({
    stdin: { contents, resolveDir, loader: "js" },
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
    metafile: true,
    plugins: [externalizeBare],
    logLevel: "silent",
  });
  return {
    bytes: gzippedSize(result.outputFiles),
    externals: externalsFromMetafile(result.metafile),
  };
}

/** Bundle with only react/react-dom external: total delivered cost. */
async function measureTotal(contents, resolveDir) {
  const result = await build({
    stdin: { contents, resolveDir, loader: "js" },
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
    external: CONSUMER_PROVIDED,
    logLevel: "silent",
  });
  return gzippedSize(result.outputFiles);
}

async function listExports(distEntry) {
  const result = await build({
    entryPoints: [distEntry],
    bundle: true,
    format: "esm",
    write: false,
    metafile: true,
    plugins: [externalizeBare],
    logLevel: "silent",
  });
  const output = Object.values(result.metafile.outputs).find((candidate) => Array.isArray(candidate.exports));
  return (output?.exports ?? []).slice().sort();
}

async function measureEntry(contents, resolveDir) {
  const firstParty = await measureFirstParty(contents, resolveDir);
  const totalBytes = await measureTotal(contents, resolveDir);
  return {
    externals: firstParty.externals,
    firstPartyBytes: firstParty.bytes,
    totalBytes,
  };
}

async function measure(args) {
  if (!args.out) {
    console.error("measure requires --out <file>");
    process.exit(2);
  }
  const distEntry = path.join(args.dist, "index.js");
  const resolveDir = args.dist;

  const exportNames = await listExports(distEntry);
  log(`Measuring ${exportNames.length} export(s) from ${distEntry}`);

  const barrelSource = `export * from ${JSON.stringify(distEntry)};`;
  const barrel = await measureEntry(barrelSource, resolveDir);

  const exports = {};
  for (const name of exportNames) {
    const source = `import { ${name} } from ${JSON.stringify(distEntry)};\n` + `export default ${name};\n`;
    exports[name] = await measureEntry(source, resolveDir);
  }

  const report = {
    schemaVersion: 1,
    ref: process.env.GITHUB_SHA ?? "local",
    barrel,
    exports,
  };
  await writeFile(args.out, `${JSON.stringify(report, null, 2)}\n`);
  log(`Wrote ${args.out} — barrel ${barrel.firstPartyBytes}B first-party`);
}

function renderMarkdown(result) {
  const lines = ["## Bundle budget", ""];

  if (result.failures.length > 0) {
    lines.push("### Regressions", "");
    for (const item of result.failures) {
      lines.push(`- **${item.entry}** — ${item.kind}: ${item.detail}`);
    }
    lines.push("");
  }
  if (result.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const item of result.warnings) {
      lines.push(`- **${item.entry}** — ${item.detail}`);
    }
    lines.push("");
  }
  if (result.wins.length > 0) {
    lines.push("### Improvements", "");
    for (const item of result.wins) {
      lines.push(`- **${item.entry}** — ${item.kind}: ${item.detail}`);
    }
    lines.push("");
  }

  const changed = result.rows.filter(
    (row) => row.added || row.deltaBytes !== 0 || row.newExternals.length > 0 || row.removedExternals.length > 0,
  );

  lines.push("### Entries with a delta", "");
  if (changed.length === 0) {
    lines.push("No entry changed size or dependency reachability.");
  } else {
    lines.push("| Entry | First-party base | head | Delta | New externals |", "| --- | ---: | ---: | ---: | --- |");
    for (const row of changed) {
      const base = row.baseBytes === null ? "—" : `${row.baseBytes}B`;
      const delta = row.added ? "new" : `${row.deltaBytes >= 0 ? "+" : ""}${row.deltaBytes}B`;
      const externals = row.newExternals.length > 0 ? row.newExternals.join(", ") : "—";
      lines.push(`| \`${row.entry}\` | ${base} | ${row.headBytes}B | ${delta} | ${externals} |`);
    }
  }

  lines.push("", `_${result.rows.length} entries measured._`);
  return `${lines.join("\n")}\n`;
}

async function compare(args) {
  if (!args.base || !args.head) {
    console.error("compare requires --base <file> and --head <file>");
    process.exit(2);
  }
  const base = JSON.parse(await readFile(args.base, "utf8"));
  const head = JSON.parse(await readFile(args.head, "utf8"));
  const result = compareReports(base, head);
  const markdown = renderMarkdown(result);

  log(markdown);
  if (args.markdown) await writeFile(args.markdown, markdown);

  if (!result.ok) {
    log(`FAIL — ${result.failures.length} bundle regression(s).`);
    process.exit(1);
  }
  log("PASS — no bundle regressions.");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "measure") {
    await measure(args);
    return;
  }
  if (args.mode === "compare") {
    await compare(args);
    return;
  }
  console.error(
    "Usage:\n" +
      "  bundle.mjs measure --out <file> [--dist <path>]\n" +
      "  bundle.mjs compare --base <file> --head <file> [--markdown <file>]",
  );
  process.exit(2);
}

await main();
