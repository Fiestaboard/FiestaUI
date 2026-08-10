import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Guards issue #182: the component layer must reach the motion scale through
 * the named `duration-*` utilities, not bare numbers.
 *
 * `theme.css` defines seven duration tiers and exports them to Tailwind from
 * `@theme inline` (`--transition-duration-fast` … `--transition-duration-slowest`),
 * so `duration-base` compiles to `transition-duration: var(--motion-duration-base)`.
 * A bare `duration-200` compiles to a hard-coded `200ms`.
 *
 * Today the two agree, which is exactly why this needs a guard rather than a
 * review comment: retuning `--motion-duration-base` to 180ms would move the
 * four animations in theme.css that reference it and leave every
 * `duration-200` in the component layer at 200ms. Nothing looks wrong in
 * either file alone, so the drift is invisible in review.
 *
 * Scope note: only the BARE numeric form is banned. `duration-[…]` arbitrary
 * values are left alone — an intentional one-off (like the 220ms board-switch
 * exit) is a legitimate, reviewable escape hatch; silently re-typing a value
 * that already has a token is not.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPONENTS_DIR = path.join(ROOT, "src", "components");

/** `duration-200`, `hover:duration-150`, … but never `duration-base`. */
const BARE_DURATION = /(?<![\w-])duration-\d+\b/g;

/**
 * Files that still carry a bare duration ONLY because they were owned by a
 * parallel branch when the migration landed. This list may shrink, never
 * grow — a new entry means someone re-introduced the coupling this guard
 * exists to prevent.
 */
const KNOWN_UNMIGRATED = new Map([
  ["src/components/ui/tabs.tsx", "duration-200 → duration-base (issue #182 follow-up)"],
  ["src/components/ui/switch.tsx", "duration-150 → duration-control (issue #182 follow-up)"],
  ["src/components/ui/dialog.tsx", "duration-200 → duration-base (issue #182 follow-up)"],
]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|css)$/.test(entry.name)) yield full;
  }
}

const offenders = new Map();
for await (const file of walk(COMPONENTS_DIR)) {
  const source = await readFile(file, "utf8");
  const hits = [...source.matchAll(BARE_DURATION)].map((m) => m[0]);
  if (hits.length > 0) offenders.set(path.relative(ROOT, file).split(path.sep).join("/"), hits);
}

test("no bare duration-<number> utilities in src/components", () => {
  const unexpected = [...offenders].filter(([file]) => !KNOWN_UNMIGRATED.has(file));
  assert.deepEqual(
    unexpected.map(([file, hits]) => `${file}: ${[...new Set(hits)].join(", ")}`),
    [],
    "bare Tailwind duration utilities hard-code a millisecond value and drift away from the " +
      "--motion-duration-* scale the moment it is retuned (issue #182). Use the named tier " +
      "instead: duration-fast (100ms), duration-control (150ms), duration-base (200ms), " +
      "duration-exit (250ms), duration-slow (300ms), duration-slower (350ms), " +
      "duration-slowest (400ms).",
  );
});

test("the known-unmigrated allowlist has no stale entries", () => {
  const stale = [...KNOWN_UNMIGRATED.keys()].filter((file) => !offenders.has(file));
  assert.deepEqual(stale, [], "these files no longer contain a bare duration — drop them from KNOWN_UNMIGRATED");
});
