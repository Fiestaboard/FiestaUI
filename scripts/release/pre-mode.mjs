// Keeps Changesets pre mode on the branch it belongs to.
//
// `.changeset/pre.json` is a committed file, so git carries it wherever a merge
// goes. Two mistakes publish the wrong thing:
//
// - pre.json in pre mode reaching `main`: main starts publishing prereleases.
// - `alpha` leaving pre mode: the action opens a stable Version PR against
//   alpha and publishes it to `latest` from the wrong branch.
//
// `checkPreModeForBase` blocks the first at PR time (ci.yml); `alphaReleaseAction`
// stops the second at release time (release.yml).
//
// Dependency-free ESM so both workflows can run it with bare `node`.
//
//   node scripts/release/pre-mode.mjs check-base <base-ref>
//   node scripts/release/pre-mode.mjs alpha-action   # prints action=release|skip

import { existsSync, readFileSync } from "node:fs";

export const PRE_JSON = ".changeset/pre.json";
export const ALPHA_BRANCH = "alpha";
export const ALPHA_TAG = "alpha";

/**
 * @typedef {{mode: "pre"|"exit", tag: string}} PreJson  the fields we read
 */

/** @param {PreJson|null} preJson */
function describe(preJson) {
  return preJson ? `pre.json has mode "${preJson.mode}", tag "${preJson.tag}"` : "there is no pre.json";
}

/**
 * Whether a PR's resulting pre.json is legal for the branch it targets.
 *
 * @param {{baseRef: string, preJson: PreJson|null}} input
 * @returns {{ok: boolean, reason: string}} reason is always one line.
 */
export function checkPreModeForBase({ baseRef, preJson }) {
  if (baseRef === "main") {
    // Exit mode is the promotion PR from alpha: main's next Version PR
    // computes the stable version and deletes pre.json.
    if (preJson && preJson.mode !== "exit") {
      return {
        ok: false,
        reason: `main must not be in prerelease mode, but ${describe(preJson)}. Run "npx changeset pre exit" on alpha before promoting it.`,
      };
    }
    return { ok: true, reason: `main: ${describe(preJson)} — ok.` };
  }

  if (baseRef === ALPHA_BRANCH) {
    if (!preJson || preJson.tag !== ALPHA_TAG) {
      return {
        ok: false,
        reason: `alpha must stay in "${ALPHA_TAG}" prerelease mode, but ${describe(preJson)}. Run "npx changeset pre enter ${ALPHA_TAG}".`,
      };
    }
    return { ok: true, reason: `alpha: ${describe(preJson)} — ok.` };
  }

  return { ok: true, reason: `${baseRef} is not a release branch — pre mode unchecked.` };
}

/**
 * What release.yml may do on `alpha`.
 *
 * @param {PreJson|null} preJson
 * @returns {"release"|"skip"} skip while a promotion is in progress (exit mode)
 * @throws when alpha is not in alpha pre mode at all
 */
export function alphaReleaseAction(preJson) {
  if (!preJson || preJson.tag !== ALPHA_TAG) {
    throw new Error(
      `Refusing to release from alpha: ${describe(preJson)}. alpha publishes only in "${ALPHA_TAG}" prerelease mode — run "npx changeset pre enter ${ALPHA_TAG}".`,
    );
  }
  return preJson.mode === "exit" ? "skip" : "release";
}

/** @returns {PreJson|null} */
function readPreJson() {
  return existsSync(PRE_JSON) ? JSON.parse(readFileSync(PRE_JSON, "utf8")) : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, baseRef] = process.argv.slice(2);
  try {
    if (command === "check-base" && baseRef) {
      const result = checkPreModeForBase({ baseRef, preJson: readPreJson() });
      console.log(`reason=${result.reason}`);
      if (!result.ok) {
        console.error(`::error title=Prerelease mode::${result.reason}`);
        process.exit(1);
      }
      console.error(result.reason);
    } else if (command === "alpha-action") {
      const action = alphaReleaseAction(readPreJson());
      console.log(`action=${action}`);
      console.error(
        action === "skip"
          ? "alpha is exiting prerelease mode (promotion in progress) — not versioning or publishing here."
          : "alpha is in alpha prerelease mode — releasing.",
      );
    } else {
      console.error("usage: pre-mode.mjs check-base <base-ref> | pre-mode.mjs alpha-action");
      process.exit(2);
    }
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
