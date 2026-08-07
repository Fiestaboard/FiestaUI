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
 * Classify a list of changed paths.
 *
 * An empty list is treated as code. Callers reach this with an empty diff only
 * when something upstream is wrong (a bad base ref, an orphaned sha), and the
 * safe reading of "I don't know what changed" is "assume everything did".
 *
 * @param {string[]} files repo-relative paths
 * @returns {{code: boolean, codeFiles: string[], nonCodeFiles: string[]}}
 */
export function classifyFiles(files) {
  const paths = files.map((f) => f.trim()).filter(Boolean);
  if (paths.length === 0) {
    return { code: true, codeFiles: [], nonCodeFiles: [] };
  }

  const codeFiles = paths.filter(isCodeFile);
  return {
    code: codeFiles.length > 0,
    codeFiles,
    nonCodeFiles: paths.filter((p) => !isCodeFile(p)),
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
  console.log(`code=${result.code}`);
}
