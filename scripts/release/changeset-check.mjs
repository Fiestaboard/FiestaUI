// Decides whether a PR must carry a changeset.
//
// Under changesets a change that ships without a `.changeset/*.md` file merges
// cleanly and then never releases — nothing fails, the code just sits on main
// unpublished. This check turns that silent miss into a red PR.
//
// Pure functions over plain data, like the rest of scripts/release: the CLI
// below does the git plumbing and hands `checkChangeset` path lists.
//
// Dependency-free ESM so CI can run it with bare `node`, no `npm ci`.
//
//   node scripts/release/changeset-check.mjs <base-sha> <head-sha>
//   (reads HEAD_REF and PR_LABELS — comma-separated — from the environment)

import { execFileSync } from "node:child_process";

import { isPublishPathFile, isShippedFile } from "../ci/classify-changes.mjs";

/** The label that waives the check, for changes that genuinely release nothing. */
export const SKIP_LABEL = "no-changeset";

/**
 * Head refs that never need a changeset of their own.
 *
 * - `changeset-release/*` is the Version PR: it consumes changesets and edits
 *   package.json, so it would otherwise fail its own check.
 * - `main` is a main→alpha sync: main's changesets were consumed by main's own
 *   release before the sync, so the shipped diff arrives with none attached.
 * - `alpha` is the promotion PR into main: alpha's changesets were consumed by
 *   its prereleases (Changesets v3 keeps them in `.changeset/pre/`), and
 *   main's next Version PR turns them into the stable changelog.
 *
 * Only for branches in this repository: a contributor's fork PR from their own
 * `main` is ordinary work, not a sync.
 */
const EXEMPT_HEAD_REFS = [/^changeset-release\//, /^main$/, /^alpha$/];

const MAX_LISTED = 5;

/**
 * True for a changeset file: `.changeset/<name>.md` at the top level, but not
 * the README `changeset init` writes, and not `.changeset/pre/` (where
 * Changesets v3 keeps consumed prerelease changesets).
 *
 * @param {string} path repo-relative path
 * @returns {boolean}
 */
export function isChangesetFile(path) {
  return /^\.changeset\/[^/]+\.md$/.test(path) && path !== ".changeset/README.md";
}

/**
 * True when changing this path changes the tarball consumers install — shipped,
 * but not merely publish-path infrastructure.
 *
 * @param {string} path
 * @returns {boolean}
 */
function needsChangeset(path) {
  return isShippedFile(path) && !isPublishPathFile(path);
}

/**
 * @param {{files: string[], addedFiles: string[], headRef: string, labels: string[], sameRepo?: boolean}} input
 *   sameRepo: the head branch lives in this repository (default true).
 *   files: every path the PR changes; addedFiles: paths the PR adds.
 * @returns {{ok: boolean, reason: string}} reason is always one line.
 */
export function checkChangeset({ files, addedFiles, headRef, labels, sameRepo = true }) {
  if (sameRepo && EXEMPT_HEAD_REFS.some((pattern) => pattern.test(headRef))) {
    return { ok: true, reason: `Head ref ${headRef} is exempt from the changeset check.` };
  }
  if (labels.includes(SKIP_LABEL)) {
    return { ok: true, reason: `The ${SKIP_LABEL} label waives the changeset check.` };
  }

  const changesets = addedFiles.filter(isChangesetFile);
  if (changesets.length > 0) {
    return { ok: true, reason: `Changeset found: ${changesets.join(", ")}.` };
  }

  const shipped = files.filter(needsChangeset);
  if (shipped.length === 0) {
    return { ok: true, reason: "Nothing in the published tarball changed — no changeset needed." };
  }

  const listed = shipped.slice(0, MAX_LISTED).join(", ");
  const more = shipped.length > MAX_LISTED ? ` and ${shipped.length - MAX_LISTED} more` : "";
  return {
    ok: false,
    reason:
      `This PR changes shipped code (${listed}${more}) but adds no changeset. ` +
      `Run "npx changeset" and commit the file it writes, or "npx changeset --empty" ` +
      `(or add the ${SKIP_LABEL} label) if this should not release.`,
  };
}

/** @param {string[]} args */
function gitLines(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [baseSha, headSha] = process.argv.slice(2);
  if (!baseSha || !headSha) {
    console.error("usage: node scripts/release/changeset-check.mjs <base-sha> <head-sha>");
    process.exit(2);
  }

  // Three-dot: what the PR introduces relative to where it branched, not what
  // the base has gained since.
  const range = `${baseSha}...${headSha}`;
  const result = checkChangeset({
    files: gitLines(["diff", "--name-only", range]),
    addedFiles: gitLines(["diff", "--name-only", "--diff-filter=A", range]),
    headRef: process.env.HEAD_REF ?? "",
    sameRepo: (process.env.HEAD_REPO ?? process.env.GITHUB_REPOSITORY ?? "") === (process.env.GITHUB_REPOSITORY ?? ""),
    labels: (process.env.PR_LABELS ?? "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean),
  });

  console.log(`ok=${result.ok}`);
  console.log(`reason=${result.reason}`);
  if (!result.ok) {
    console.error(`::error title=Missing changeset::${result.reason}`);
    process.exit(1);
  }
  console.error(result.reason);
}
