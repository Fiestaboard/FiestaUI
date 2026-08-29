// Lands a release: builds the version commit, tags it, and pushes.
//
// The one invariant this file exists to hold:
//
//   The tag points at the tree that was published.
//
// Everything else here is in service of that. The gate computes a bump over
// `<highest tag>..<gated sha>` and the release job builds the tarball from that
// same gated sha, so the bump and the tarball already agree. The tag is the
// third thing that has to agree, and it used to be computed independently: the
// landing step re-checked-out `main`'s *current* tip and put the version commit
// (and therefore the tag) on top of that. When `main` had moved since the gate
// ran, the tag covered commits no bump had ever inspected.
//
// That is not hypothetical — it is v5.12.3. #300 (a `fix`) and #301
// (a `fix(feedback)!` — breaking) merged minutes apart. #300's CI went green
// first and started a release; the coalescing check saw a tip (#301) whose own
// CI was still running, so it correctly proceeded rather than standing down.
// The gate then said `patch` over a range that ended at #300, the tarball was
// built from #300, and the landing step put v5.12.3 on top of #301. Result:
//   - npm's 5.12.3 has none of #301's code, while the generated release notes
//     credited #301, because notes are generated from the tag's range;
//   - a *breaking* change shipped under a patch tag;
//   - and worst of all #301 was stranded — the tag sat above it, so every later
//     gate run saw an empty range and skipped. Merged, tagged over, never
//     publishable.
//
// So: the version commit is always a child of the gated sha. If `main` is still
// on that sha (the overwhelmingly common case) the commit and tag fast-forward
// onto `main` exactly as before. If `main` has moved, we push the tag only and
// leave `main` alone.
//
// Two things that push shape is deliberately NOT:
//
//   - It is not "rebase the bump onto the tip". That is the bug above.
//   - It is not "force the version commit onto main". `main`'s tip is other
//     people's merged work; a non-fast-forward push would delete it. Leaving
//     the newer commits untagged is what makes them releasable: the next green
//     CI on `main` gates `<this tag>..<tip>`, sees them, and ships them at the
//     bump they actually argue for. A tag behind the tip strands nothing; a tag
//     ahead of it strands everything under it.
//
// It is also not "tag the gated sha itself and land the bump commit on the
// tip". The tag must be on the version commit: the empty-range check in
// gate.mjs is the release loop guard, and it only closes because the tag sits
// on the commit the release itself pushed.
//
// Dependency-free ESM so the workflow can run it with bare `node`.
//
//   node scripts/release/land.mjs --version=5.12.3 --sha=<gated sha>

import { execFileSync } from "node:child_process";

/** `main` is still on the gated sha: commit + tag fast-forward onto it. */
export const FAST_FORWARD = "fast-forward";
/** `main` has moved past the gated sha: push the tag, leave the branch alone. */
export const DETACHED = "detached";

/**
 * Where this release's version commit and tag may be pushed.
 *
 * The base is ALWAYS the gated sha — the plan only decides whether `main` can
 * also be moved to it. Any tip other than the gated sha means the branch push
 * would carry the tag over commits the bump never saw, so it is off the table.
 *
 * @param {{tip: string, sha: string}} input resolved commit shas
 * @returns {{mode: string, base: string, pushBranch: boolean, reason: string}}
 */
export function landingPlan({ tip, sha }) {
  if (!sha) throw new Error("landingPlan needs the gated sha");
  if (!tip) throw new Error("landingPlan needs main's tip");

  if (tip === sha) {
    return {
      mode: FAST_FORWARD,
      base: sha,
      pushBranch: true,
      reason: `main is still on the released sha ${short(sha)} — landing the version commit and tag on main.`,
    };
  }

  return {
    mode: DETACHED,
    base: sha,
    pushBranch: false,
    reason:
      `main has moved to ${short(tip)} since ${short(sha)} was gated and built — tagging the released tree only. ` +
      `Moving main's tip would put this tag over commits the bump never inspected; they stay untagged and the next release ships them.`,
  };
}

const short = (sha) => sha.slice(0, 7);

/**
 * A ruleset refusal, not a race. Retrying cannot talk a standing config problem
 * round, and calling it "main moved under us" buries the real cause under a
 * wall of identical rejections.
 *
 * @param {string} output combined stdout/stderr of a failed push
 */
export function isRulesetRefusal(output) {
  return /GH013|repository rule violations/.test(output);
}

/**
 * The tag already exists on the remote. Also not a race: the same version
 * cannot be landed twice, and npm would refuse the republish anyway.
 *
 * @param {string} output combined stdout/stderr of a failed push
 */
export function isTagConflict(output) {
  return /already exists|cannot lock ref 'refs\/tags/.test(output);
}

const MAX_BUFFER = 32 * 1024 * 1024;

const capture = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER });
const git = (args, cwd) => capture("git", args, cwd).trim();

/** Run a command without throwing, keeping stdout and stderr together. */
function tryRun(cmd, args, cwd) {
  try {
    return { ok: true, output: execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` || String(error) };
  }
}

/**
 * Create the version commit on the released sha, tag it, and push.
 *
 * @param {object} input
 * @param {string} input.version bare version, e.g. "5.12.3"
 * @param {string} input.sha the gated sha whose tree was published
 * @param {string} [input.cwd] repo to work in
 * @param {string} [input.remote]
 * @param {string} [input.branch]
 * @param {number} [input.attempts] retries for the fast-forward race
 * @param {(line: string) => void} [input.log]
 * @param {(ms: number) => Promise<void>} [input.sleep]
 * @param {(state: object) => void} [input.onBeforePush] test seam for the race
 * @returns {Promise<{mode: string, tag: string, commit: string, base: string, tip: string, attempts: number, summary: string}>}
 */
export async function land({
  version,
  sha,
  cwd = process.cwd(),
  remote = "origin",
  branch = "main",
  attempts = 5,
  log = (line) => console.error(line),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onBeforePush = () => {},
}) {
  if (!version) throw new Error("land() needs a version");
  if (!sha) throw new Error("land() needs the gated sha");
  const tag = `v${version}`;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    git(["fetch", remote, branch, "--no-tags"], cwd);
    const tip = git(["rev-parse", "FETCH_HEAD"], cwd);
    const base = git(["rev-parse", `${sha}^{commit}`], cwd);
    const plan = landingPlan({ tip, sha: base });
    log(plan.reason);

    if (!plan.pushBranch) {
      const behind = git(["rev-list", "--count", `${base}..${tip}`], cwd);
      log(
        `${behind} commit(s) on ${branch} after ${short(base)} stay unreleased for now — the next green CI on ${branch} gates ${tag}..${branch} and ships them.`,
      );
    }

    // -f discards the publish-time package.json edit; it has already shipped in
    // the tarball and `npm version` below recreates it. The checkout target is
    // the plan's base, never the fetched tip.
    git(["checkout", "-f", "-B", "version-bump", plan.base], cwd);
    tryRun("git", ["tag", "-d", tag], cwd);
    // `npm version` rather than a hand-rolled commit: it keeps package.json and
    // package-lock.json in step and writes the annotated tag.
    capture("npm", ["version", version, "-m", "chore: release v%s"], cwd);

    const commit = git(["rev-parse", "HEAD"], cwd);
    // Belt and braces on the whole point of this module. If the version commit
    // is ever not a direct child of the released sha, the tag is about to cover
    // a tree that was never built — fail instead of publishing that mismatch.
    const parent = git(["rev-parse", "HEAD^"], cwd);
    if (parent !== plan.base) {
      throw new Error(
        `Refusing to tag ${tag}: the version commit's parent is ${short(parent)}, not the released sha ${short(plan.base)}.`,
      );
    }

    onBeforePush({ attempt, plan, commit });

    // --atomic: without it a rejected branch ref still leaves the tag pushed,
    // so the tag ends up on a commit that never reached main and the next
    // attempt's `git tag -d` cannot take it back. The v3.0.0 release stranded
    // its tag exactly that way. Both refs land together or neither does.
    const refspecs = plan.pushBranch
      ? [`version-bump:refs/heads/${branch}`, `refs/tags/${tag}:refs/tags/${tag}`]
      : [`refs/tags/${tag}:refs/tags/${tag}`];
    const push = tryRun("git", ["push", "--atomic", remote, ...refspecs], cwd);
    log(push.output.trim());

    if (push.ok) {
      const summary =
        plan.mode === FAST_FORWARD
          ? `Landed ${tag} on ${branch} at ${short(commit)} (attempt ${attempt}).`
          : `Tagged ${tag} at ${short(commit)}, on the released tree ${short(plan.base)}. ${branch} has moved on and keeps its tip; its newer commits are untagged and release next.`;
      log(summary);
      return { mode: plan.mode, tag, commit, base: plan.base, tip, attempts: attempt, summary };
    }

    if (isRulesetRefusal(push.output)) {
      throw new Error(
        "Push was refused by a branch ruleset, not a race. The Claude bot app must be a bypass actor on every " +
          "ruleset targeting main; check the rules URL in the push output above.",
      );
    }
    if (isTagConflict(push.output)) {
      throw new Error(`${tag} already exists on ${remote} — this version has been landed once already.`);
    }

    log(`${branch} moved under us — retrying (attempt ${attempt}).`);
    await sleep(attempt * 5000);
  }

  throw new Error(`Could not land ${tag} after ${attempts} attempt(s)`);
}

// CLI: key/value lines on stdout for $GITHUB_OUTPUT, rationale on stderr for
// the job log — the same shape as gate.mjs.
//
//   node scripts/release/land.mjs --version=X.Y.Z --sha=<gated sha>
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const flag = (name) =>
    argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.split("=")
      .slice(1)
      .join("=");

  const version = flag("version");
  const sha = flag("sha");
  if (!version || !sha) {
    console.error("usage: node scripts/release/land.mjs --version=X.Y.Z --sha=<gated sha>");
    process.exit(2);
  }

  try {
    const result = await land({
      version,
      sha,
      remote: flag("remote") ?? "origin",
      branch: flag("branch") ?? "main",
      attempts: Number(flag("attempts") ?? 5),
    });
    console.log(`mode=${result.mode}`);
    console.log(`tag=${result.tag}`);
    console.log(`commit=${result.commit}`);
    console.log(`summary=${result.summary}`);
  } catch (error) {
    // Annotation on stderr, not stdout: stdout is redirected into
    // $GITHUB_OUTPUT by the workflow, and Actions parses workflow commands out
    // of either stream.
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
