// The single definition of "does this path affect what we ship?".
//
// Two consumers depend on this answer and would drift if each kept its own
// copy: ci.yml's `changes` job uses it to decide whether the expensive suite is
// worth 20 minutes, and release.yml's `gate` job uses it to decide whether a
// merge is worth a version. A drifted copy fails silently in the worst
// direction — cutting a release for every audit-cron bookkeeping commit, or
// skipping one for a real change.
//
// Dependency-free ESM so both callers can run it with bare `node`, no `npm ci`.
//
// Run directly to classify a newline-separated file list on stdin:
//   git diff --name-only main...HEAD | node scripts/ci/classify-changes.mjs

/**
 * Paths that cannot move a pixel or a byte of dist/.
 *
 * Prose is still fully checked elsewhere — `npm run format:check` is
 * `prettier --check .`, which covers *.md and *.json — and lint and the
 * automation job always run. This list only governs the build/a11y/VRT/bundle
 * jobs and the release decision.
 */
const NON_CODE_MATCHERS = [
  { label: "markdown", test: (p) => p.endsWith(".md") },
  { label: "docs", test: (p) => p === "docs" || p.startsWith("docs/") },
  {
    label: "audit sweep state",
    test: (p) => /^\.github\/[^/]*-audit-state\.json$/.test(p),
  },
  {
    label: "audit rejection log",
    test: (p) => /^\.github\/[^/]*-audit\/rejected-edits\.jsonl$/.test(p),
  },
];

/**
 * True when a path is a build input. Anything unrecognized counts as code:
 * the safe failure is running the full suite / cutting a release, never
 * silently skipping one.
 *
 * @param {string} path repo-relative path
 * @returns {boolean}
 */
export function isCodeFile(path) {
  return !NON_CODE_MATCHERS.some((matcher) => matcher.test(path));
}

/**
 * The publish path: infrastructure that decides HOW the tarball is built,
 * versioned, and pushed to consumers. It never lands *in* dist/, but changing
 * it can change what consumers receive (a runner's node version, the gate's
 * bump rule), so it stays release-worthy.
 */
const PUBLISH_PATH_MATCHERS = [
  { label: "release workflow", test: (p) => p === ".github/workflows/release.yml" },
  { label: "downstream upgrade workflow", test: (p) => p === ".github/workflows/downstream-upgrade.yml" },
  { label: "release gate", test: (p) => p === "scripts/release" || p.startsWith("scripts/release/") },
];

/**
 * Paths that cannot change a byte of the published tarball.
 *
 * package.json ships only `dist`, so the question "is this worth 20 minutes of
 * CI?" and "does this earn a version?" are genuinely different for CI-only
 * infrastructure: editing ci.yml *is* editing the suite, so it must still run
 * — but it cannot move dist/, so publishing for it mints a version whose
 * contents are byte-identical to the last one. That is exactly what the
 * app-token fix (#148) did: an empty v1.6.1, unreleasable ever again because
 * npm will not accept a republish.
 *
 * Everything in NON_CODE_MATCHERS is non-shipping too — if it is not even
 * worth building, it cannot have changed the build.
 */
const NON_SHIPPING_MATCHERS = [
  ...NON_CODE_MATCHERS,
  {
    label: "CI infrastructure",
    test: (p) => p === ".github" || p.startsWith(".github/"),
  },
  {
    label: "CI automation",
    test: (p) => p === "scripts/ci" || p.startsWith("scripts/ci/"),
  },
  { label: "VRT baselines", test: (p) => p === "vrt" || p.startsWith("vrt/") },
  { label: "Storybook config", test: (p) => p === ".storybook" || p.startsWith(".storybook/") },
];

/**
 * True when a path can change what consumers install. Anything unrecognized
 * ships, for the same reason anything unrecognized is code: the safe failure
 * is an extra release, never a silently skipped one.
 *
 * Invariant: everything that ships is also code. A release must never be cut
 * from a commit whose suite was skipped — `classify-changes.test.mjs` asserts
 * this directly.
 *
 * @param {string} path repo-relative path
 * @returns {boolean}
 */
export function isShippedFile(path) {
  if (PUBLISH_PATH_MATCHERS.some((matcher) => matcher.test(path))) return true;
  return !NON_SHIPPING_MATCHERS.some((matcher) => matcher.test(path));
}

/**
 * Classify a list of changed paths.
 *
 * An empty list is treated as code. Callers reach this with an empty diff only
 * when something upstream is wrong (a bad base ref, an orphaned sha), and the
 * safe reading of "I don't know what changed" is "assume everything did".
 *
 * @param {string[]} files repo-relative paths
 * @returns {{code: boolean, codeFiles: string[], nonCodeFiles: string[],
 *            shipped: boolean, shippedFiles: string[], unshippedFiles: string[]}}
 */
export function classifyFiles(files) {
  const paths = files.map((f) => f.trim()).filter(Boolean);
  if (paths.length === 0) {
    return { code: true, codeFiles: [], nonCodeFiles: [], shipped: true, shippedFiles: [], unshippedFiles: [] };
  }

  const codeFiles = paths.filter(isCodeFile);
  const shippedFiles = paths.filter(isShippedFile);
  return {
    code: codeFiles.length > 0,
    codeFiles,
    nonCodeFiles: paths.filter((p) => !isCodeFile(p)),
    shipped: shippedFiles.length > 0,
    shippedFiles,
    unshippedFiles: paths.filter((p) => !isShippedFile(p)),
  };
}

// CLI: read the file list from stdin, print `code=<bool>` for $GITHUB_OUTPUT
// and a human-readable rationale on stderr so it lands in the job log without
// polluting stdout.
if (import.meta.url === `file://${process.argv[1]}`) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const result = classifyFiles(chunks.join("").split("\n"));

  for (const f of result.codeFiles) console.error(`Build input touched: ${f}`);
  console.error(result.code ? "Running the full suite." : "Content-only change — lint and automation cover this.");
  console.error(
    result.shipped
      ? `Shipped path touched (${result.shippedFiles.length}) — this earns a release.`
      : "Nothing shipped changed — CI-only, no release.",
  );
  console.log(`code=${result.code}`);
  console.log(`shipped=${result.shipped}`);
}
