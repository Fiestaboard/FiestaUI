// Decides whether a merge to main earns a release, and how big a bump.
//
// Pure functions over plain data: the workflow does the git and API plumbing
// and hands this module a list of commit messages and a list of changed paths.
// That keeps the interesting logic testable without git, network, or mocking.
//
// Dependency-free ESM so the workflow can run it with bare `node`, no `npm ci`.
//
// Run directly to decide from a range, for debugging a skip locally:
//   node scripts/release/gate.mjs v1.2.1 HEAD

import { execFileSync } from "node:child_process";

import { classifyFiles } from "../ci/classify-changes.mjs";

/** Separator for `git log --format=%B%x00`; %B spans lines, so NUL it is. */
export const COMMIT_SEPARATOR = "\0";

const BUMP_RANK = { patch: 0, minor: 1, major: 2 };

// `type(scope)!: subject` and `type!: subject`. The `!` is the conventional
// -commits breaking marker and must sit immediately before the colon.
const BREAKING_SUBJECT = /^[a-zA-Z]+(\([^)]*\))?!:/;
const FEAT_SUBJECT = /^feat(\([^)]*\))?:/;
// A footer, so it must start its own line. `BREAKING-CHANGE` is the
// hyphenated synonym the spec allows.
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

/**
 * The bump a single commit message argues for.
 *
 * Unrecognized subjects fall through to patch. That is deliberate: an
 * off-convention commit should still ship, just conservatively.
 *
 * @param {string} message full commit message (subject + body)
 * @returns {"patch"|"minor"|"major"}
 */
export function bumpForCommit(message) {
  const text = message.trim();
  const subject = text.split("\n", 1)[0];

  if (BREAKING_SUBJECT.test(subject) || BREAKING_FOOTER.test(text)) {
    return "major";
  }
  if (FEAT_SUBJECT.test(subject)) return "minor";
  return "patch";
}

/**
 * The highest bump across every commit in the range.
 *
 * @param {string[]} messages full commit messages
 * @returns {"patch"|"minor"|"major"}
 */
export function bumpForCommits(messages) {
  return messages.reduce((highest, message) => {
    const bump = bumpForCommit(message);
    return BUMP_RANK[bump] > BUMP_RANK[highest] ? bump : highest;
  }, /** @type {"patch"|"minor"|"major"} */ ("patch"));
}

/**
 * Split `git log --no-merges --format=%B%x00` output into messages.
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function parseCommits(raw) {
  return raw
    .split(COMMIT_SEPARATOR)
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * The release decision.
 *
 * Both skip paths are normal operation, not errors. The empty-commits skip is
 * the loop guard: the release pushes its version commit straight to main with
 * the tag on that same commit, so the range from the tag is empty. Nothing here
 * inspects the actor or the commit subject to detect our own release — it falls
 * out of where the tag sits.
 *
 * @param {{commits: string[], files: string[], lastTag?: string}} input
 * @returns {{release: boolean, bump: "patch"|"minor"|"major"|null, reason: string}}
 */
export function decide({ commits, files, lastTag = "the last tag" }) {
  if (commits.length === 0) {
    return {
      release: false,
      bump: null,
      reason: `No non-merge commits since ${lastTag} — nothing to release (this is what a release's own version commit landing looks like).`,
    };
  }

  const { code, nonCodeFiles } = classifyFiles(files);
  if (!code) {
    return {
      release: false,
      bump: null,
      reason: `${commits.length} commit(s) since ${lastTag} touched only content (${nonCodeFiles.length} path(s)) — nothing shipped changed.`,
    };
  }

  const bump = bumpForCommits(commits);
  return {
    release: true,
    bump,
    reason: `${commits.length} commit(s) since ${lastTag} changed shipped code — ${bump} release.`,
  };
}

const VERSION_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parse a `vX.Y.Z` tag. Returns null for anything else (pre-release tags,
 * `v1.2`, junk), so callers can filter rather than throw.
 *
 * @param {string} tag
 * @returns {{major: number, minor: number, patch: number}|null}
 */
export function parseTag(tag) {
  const match = VERSION_TAG.exec(tag.trim());
  if (!match) return null;
  const [, major, minor, patch] = match;
  return { major: +major, minor: +minor, patch: +patch };
}

/**
 * The highest `vX.Y.Z` tag by semver precedence.
 *
 * Deliberately NOT `git describe --tags --abbrev=0`, which finds the nearest
 * tag reachable from HEAD. The commit being released is the sha CI verified,
 * and a release that landed while its CI was running is not in that sha's
 * ancestry — so `describe` would return a stale tag and the bump would
 * regenerate an already-published version. GitHub Packages does not allow
 * republishing a version, so that failure is unrecoverable without a manual
 * bump. Tags are global; version precedence should be too.
 *
 * @param {string[]} tags
 * @returns {string|null}
 */
export function highestTag(tags) {
  return (
    tags
      .map((tag) => ({ tag: tag.trim(), parsed: parseTag(tag) }))
      .filter((entry) => entry.parsed !== null)
      .sort(
        (a, b) => a.parsed.major - b.parsed.major || a.parsed.minor - b.parsed.minor || a.parsed.patch - b.parsed.patch,
      )
      .at(-1)?.tag ?? null
  );
}

/**
 * The version a bump produces, computed from the tag rather than from the
 * checked-out `package.json` — see `highestTag` for why that distinction is
 * load-bearing.
 *
 * @param {string} tag e.g. "v1.2.1"
 * @param {"patch"|"minor"|"major"} bump
 * @returns {string} bare version, e.g. "1.3.0"
 */
export function nextVersion(tag, bump) {
  const parsed = parseTag(tag);
  if (!parsed) throw new Error(`Not a vX.Y.Z tag: ${tag}`);

  const { major, minor, patch } = parsed;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

/**
 * Read a range out of the local repo and decide. Used by the workflow and by
 * anyone debugging a skip locally.
 *
 * The commit list uses a two-dot range (commits in HEAD but not in the tag) but
 * the file list uses three-dot (merge-base vs HEAD), matching ci.yml. With
 * two-dot, `git diff` compares the two endpoints directly, so a release that
 * landed outside this sha's ancestry would show up as `package.json` reverting
 * — a phantom code change that would cut a needless release.
 *
 * @param {string} baseTag
 * @param {string} head
 */
export function decideForRange(baseTag, head = "HEAD") {
  const result = decide({
    commits: parseCommits(git(["log", "--no-merges", "--format=%B%x00", `${baseTag}..${head}`])),
    files: git(["diff", "--name-only", `${baseTag}...${head}`]).split("\n"),
    lastTag: baseTag,
  });

  return {
    ...result,
    baseTag,
    version: result.bump ? nextVersion(baseTag, result.bump) : null,
  };
}

// CLI: key/value lines on stdout for $GITHUB_OUTPUT, rationale on stderr for
// the job log.
//
//   node scripts/release/gate.mjs <head> [--bump=patch|minor|major] [--base-tag=vX.Y.Z]
//
// `--bump` forces a release at that bump, skipping the decision entirely. The
// manual `workflow_dispatch` path uses it so both paths compute the version the
// same way, from the highest tag.
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const flag = (name) =>
    argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.split("=")
      .slice(1)
      .join("=");
  const head = argv.find((a) => !a.startsWith("--")) ?? "HEAD";

  const baseTag = flag("base-tag") ?? highestTag(git(["tag", "-l", "v*"]).split("\n"));
  if (!baseTag) {
    console.error("No vX.Y.Z tag found to bump from.");
    process.exit(2);
  }

  const forced = flag("bump");
  if (forced && !(forced in BUMP_RANK)) {
    console.error(`Not a bump type: ${forced}`);
    process.exit(2);
  }

  const result = forced
    ? {
        release: true,
        bump: forced,
        baseTag,
        version: nextVersion(baseTag, forced),
        reason: `Forced ${forced} release from ${baseTag}.`,
      }
    : decideForRange(baseTag, head);

  console.error(`Base tag: ${result.baseTag}`);
  console.error(result.reason);
  console.log(`release=${result.release}`);
  console.log(`bump=${result.bump ?? ""}`);
  console.log(`version=${result.version ?? ""}`);
  console.log(`base_tag=${result.baseTag}`);
  console.log(`reason=${result.reason}`);
}
