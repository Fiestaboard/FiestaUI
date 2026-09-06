#!/usr/bin/env node
/**
 * Prove a merged sharded-shoot tree is complete before it is compared.
 *
 * Screenshots are compared wholesale by fiestaboard/visual-regression-action,
 * so a shard whose artifact never arrived would read as "these stories were
 * REMOVED" — a false alarm indistinguishable from a real deletion. Every
 * `shoot` shard writes a manifest recording what the whole run should produce
 * and what that shard produced; this script refuses the tree unless the
 * manifests account for every shot. Same property `adopt` used to enforce
 * when baselines were committed.
 *
 * Usage: node scripts/vrt/verify-shots.mjs <dir>
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { verifyManifests } from "./shard.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/vrt/verify-shots.mjs <dir>");
  process.exit(2);
}

const names = (await readdir(dir)).filter((n) => /^manifest-\d+-of-\d+\.json$/.test(n));
const manifests = [];
for (const name of names) {
  manifests.push(JSON.parse(await readFile(path.join(dir, name), "utf8")));
}

const { total, expected, errors } = verifyManifests(manifests);
if (errors.length > 0) {
  for (const e of errors) console.error(`::error::${e}`);
  process.exit(1);
}
console.log(`Shot tree complete: ${expected.length} shot(s) across ${total} shard(s).`);
