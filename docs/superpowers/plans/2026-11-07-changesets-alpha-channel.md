# Changesets Releases + Alpha Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the publish-on-every-merge release flow with Changesets, and add a long-lived `alpha` branch that publishes prereleases to the `alpha` npm dist-tag while `main` keeps publishing to `latest`.

**Architecture:** Contributors add a `.changeset/*.md` file per PR. On every push to `main` or `alpha`, `changesets/action` either opens/updates one "Version Packages" PR (when changesets are pending) or publishes whatever version `package.json` declares that npm does not have yet. A release therefore happens only when a maintainer merges that PR, so many merges share one npm build. `alpha` runs in Changesets pre mode (`.changeset/pre.json`, tag `alpha`). Guards in CI stop pre mode from reaching `main` and stop `alpha` from publishing a stable version.

**Tech Stack:** `@changesets/cli` v3 (3.0.3), `@changesets/changelog-github`, `changesets/action@v2` (v2.1.2; v1 only supports Changesets v2 and would publish without tagging, releasing or reporting `published`), GitHub Actions, npm Trusted Publishing (OIDC), node:test for the repo's dependency-free scripts.

**Spec:** This plan (no separate spec). It replaces the design in `docs/superpowers/specs/2026-08-07-continuous-release-design.md`. Mark that spec superseded in Task 6.

## Global Constraints

- Package: `@fiestaboard/ui`, a single package, not a monorepo. Tags stay `vX.Y.Z` (Changesets' single-package default), so `downstream-upgrade.yml`'s `git rev-parse "v$VERSION"` keeps working.
- Base for the work: `origin/main` (package.json `8.16.0`, npm `latest` = `8.16.0`). The local checkout is behind, with unrelated perf work in progress. Start this work in a fresh worktree off `origin/main`.
- The workflow file stays named `.github/workflows/release.yml`. The npm trusted-publisher record is bound to that filename, and renaming it breaks OIDC publishing.
- Keep `permissions: id-token: write`, `npm install -g npm@latest` (Trusted Publishing needs npm ≥ 11.5.1), and the `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` fallback, as release.yml has today.
- Every PR or tag that a workflow creates uses the Claude bot app token (`CLAUDE_BOT_APP_ID` / `CLAUDE_BOT_APP_PRIVATE_KEY`), never `GITHUB_TOKEN`. CI on a PR opened with `GITHUB_TOKEN` starts gated in `action_required`, so `CI Success` needs a manual approval before the PR can merge.
- npm dist-tags: `main` publishes to `latest`, and `alpha` publishes to `alpha` (versions like `9.0.0-alpha.0`).
- The downstream upgrade dispatch runs only for stable releases published from `main`.
- New scripts follow the existing style: dependency-free ESM in `scripts/release/`, pure exported functions, a CLI guarded by `import.meta.url === \`file://${process.argv[1]}\``, and tests in `scripts/release/tests/*.test.mjs`that`npm run release:test` runs.

## Review Focus

1. **`pre.json` merges into `main`.** Merging `alpha` into `main` while it is still in pre mode would make `main` publish prereleases to `latest`. Expected: the PR fails CI unless `pre.json` has `"mode": "exit"`. Task 3 test: `"main rejects pre.json in pre mode"`.
2. **A stable publish from `alpha`.** After `changeset pre exit` on `alpha`, the action would open a stable Version PR against `alpha` and publish `9.0.0` to `latest` from the wrong branch. Expected: release.yml skips the changesets step on `alpha` in exit mode and fails when `pre.json` is missing or has a different tag. Task 3 test: `"alpha publish requires pre mode with tag alpha"`, wired into the workflow in Task 4.
3. **A PR that changes shipped code without a changeset.** Without a changeset the change silently never releases. Expected: CI fails with a message telling the author to run `npx changeset`, or `npx changeset --empty` for no release. Task 2 tests.
4. **The Version PR, or a sync PR, trips the changeset check.** The Version PR deletes changesets and edits package.json, which counts as a shipped path. Expected: it passes. Task 2 test: `"changeset-release/* branches are exempt"`.
5. **Downstream upgrade fires for an alpha.** Expected: no dispatch when `github.ref_name == 'alpha'`. Pinned by the updated `release-decoupled.test.mjs` in Task 4.

---

### Task 1: Install and configure Changesets

**Files:**

- Modify: `package.json` (devDependencies, scripts)
- Create: `.changeset/config.json`, `.changeset/README.md`
- Modify: `.prettierignore` (only if the generated `CHANGELOG.md` fails `format:check`)

**Interfaces:**

- Produces: the npm scripts `changeset` (`changeset`), `version-packages` (`changeset version && npm install --package-lock-only --ignore-scripts --no-audit`) and `release` (`npm run build && changeset publish`). Task 4 calls `version-packages` and `release`.

- [ ] **Step 1:** `npm i -D @changesets/cli @changesets/changelog-github`, then `npx changeset init`.
- [ ] **Step 2:** Set `.changeset/config.json`: `"changelog": ["@changesets/changelog-github", { "repo": "Fiestaboard/FiestaUI" }]`, `"commit": false`, `"access": "public"`, `"baseBranch": "main"`, `"updateInternalDependencies": "patch"`, `"ignore": []`.
- [ ] **Step 3:** Remove the `release:npmjs` script, which would bypass Changesets, and add the three scripts above.
- [ ] **Step 4:** Add this PR's own changeset with `npx changeset --empty`. The PR changes package.json, and `changeset status` exits 1 for changed packages that have no changeset. Verify: `git fetch origin main:main` (a fresh worktree has no local `main` for `baseBranch`), then `npx changeset status --since=main` exits 0. `npm run format:check` and `npm run lint` pass.
- [ ] **Step 5:** Commit `chore(release): add changesets tooling`.

### Task 2: Changeset-required check

**Files:**

- Create: `scripts/release/changeset-check.mjs`
- Test: `scripts/release/tests/changeset-check.test.mjs`
- Modify: `.github/workflows/ci.yml` (add a step to the `automation` job, or a new job `changeset` that `ci-success` needs, on `pull_request` and `merge_group` only)

**Interfaces:**

- Consumes: `classifyFiles(files)` from `scripts/ci/classify-changes.mjs` (its `shipped` flag).
- Produces: `checkChangeset({ files: string[], headRef: string, labels: string[] }) => { ok: boolean, reason: string }`. Exempt head refs: `changeset-release/*` (Version PRs) and `main` (main→alpha sync PRs, whose changesets were consumed on main). `files` is `git diff --name-status`-derived: changed paths plus the added `.changeset/*.md` paths. A changeset counts when an added path matches `^\.changeset/[^/]+\.md$` and is not `README.md`.

- [ ] **Step 1: Write failing tests** with these assertions:
  - `"shipped change without a changeset fails"`: files `["src/components/forms/button.tsx"]` gives `ok: false`, and `reason` contains `npx changeset`.
  - `"shipped change with a changeset passes"`: adding `.changeset/brave-otters-sing.md` gives `ok: true`.
  - `"an empty changeset counts"`: same as above. The file's content is irrelevant to the check.
  - `"unshipped-only change needs no changeset"`: files `[".github/workflows/ci.yml", "docs/x.md"]` gives `ok: true`.
  - `"changeset-release/* branches are exempt"`: headRef `changeset-release/main` with `package.json` changed gives `ok: true`.
  - `"a main→alpha sync is exempt"`: headRef `main` with `src/` changed gives `ok: true`.
  - `"no-changeset label is an escape hatch"`: labels `["no-changeset"]` gives `ok: true`.
  - `".changeset/README.md does not count as a changeset"`.
  - `"reason is single-line"` (it goes into `$GITHUB_OUTPUT`).
- [ ] **Step 2:** Run `node --test scripts/release/tests/changeset-check.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `checkChangeset`, plus a CLI: `node scripts/release/changeset-check.mjs <base-sha> <head-sha>` reads `HEAD_REF` and `PR_LABELS` (comma-separated) from env and exits 1 on `ok: false`.
- [ ] **Step 4:** Run `npm run release:test`. Expected: PASS.
- [ ] **Step 5:** Wire it into ci.yml with `BASE_SHA`/`HEAD_SHA` from `github.event.pull_request.*`, `HEAD_REF: ${{ github.head_ref }}` and `PR_LABELS: ${{ join(github.event.pull_request.labels.*.name, ',') }}`. Give the step `if: github.event_name == 'pull_request'`, because `head_ref` and `pull_request.*` are empty in `merge_group`, and the PR already passed. Set `pull_request: types: [opened, synchronize, reopened, labeled, unlabeled]`. Listing `types` replaces the defaults, so leaving any of the first three out would stop CI (and `CI Success`) on pushes.
- [ ] **Step 5b: VRT on alpha PRs.** Visual baselines are published only from `main` pushes, so PRs into `alpha` have no baseline. Add `github.base_ref != 'alpha'` to the `if` of `visual-regression` and `vrt-report`. Confirm that `ci-success` treats those skipped jobs as passing, as it already does for content-only PRs. Visual coverage for alpha is a follow-up.
- [ ] **Step 6:** Commit `ci(release): require a changeset for shipped changes`.

### Task 3: Pre-mode guards

**Files:**

- Create: `scripts/release/pre-mode.mjs`
- Test: `scripts/release/tests/pre-mode.test.mjs`
- Modify: `.github/workflows/ci.yml` (run `checkPreModeForBase` on `pull_request` and `merge_group`, using `github.base_ref`, or `merge_group.base_ref` stripped of `refs/heads/`)

**Interfaces:**

- Produces:
  - `checkPreModeForBase({ baseRef: string, preJson: object|null }) => { ok, reason }`. Rule: base `main` passes when `preJson` is `null` or has `mode === "exit"`. Base `alpha` passes when `preJson.tag === "alpha"` and `mode` is `"pre"` or `"exit"`. Exit is what the promotion's `pre exit` PR looks like. Any other base passes.
  - `alphaReleaseAction(preJson) => "release" | "skip"`. Returns `"release"` for `{mode:"pre",tag:"alpha"}` and `"skip"` for `{mode:"exit",tag:"alpha"}` (promotion in progress: neither version nor publish on alpha). Throws for anything else. Task 4 uses it to gate the changesets step on `alpha`.
  - CLI: `node scripts/release/pre-mode.mjs check-base <baseRef>`, and `node scripts/release/pre-mode.mjs alpha-action`, which prints `action=release|skip` for `$GITHUB_OUTPUT` and exits 1 on throw. Both read `.changeset/pre.json` when it exists.

- [ ] **Step 1: Write failing tests:** `"main accepts no pre.json"`, `"main rejects pre.json in pre mode"`, `"main accepts pre.json in exit mode"` (the promotion PR), `"alpha rejects missing pre.json"`, `"alpha rejects a non-alpha tag"` (`tag: "beta"`), `"alpha accepts exit mode"` (the `pre exit` PR), `"alpha publish requires pre mode with tag alpha"` (`alphaReleaseAction` throws for `null` and for `{mode:"pre",tag:"beta"}`, returns `"skip"` for exit and `"release"` for pre/alpha), `"other bases are unchecked"`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Make error messages name the fix: `run "npx changeset pre exit" on alpha before promoting`, or `run "npx changeset pre enter alpha"`.
- [ ] **Step 4:** Run `npm run release:test`. Expected: PASS.
- [ ] **Step 5:** Commit `ci(release): guard changesets pre mode per branch`.

### Task 4: Rewrite release.yml around changesets/action

**Files:**

- Modify: `.github/workflows/release.yml`
- Delete: `scripts/release/gate.mjs`, `scripts/release/land.mjs`, `scripts/release/tests/gate.test.mjs`, `scripts/release/tests/land.test.mjs`
- Rewrite: `scripts/release/tests/release-workflow.test.mjs`
- Modify: `scripts/ci/tests/release-decoupled.test.mjs`, and `scripts/ci/tests/main-push-app-token.test.mjs` if its workflow list includes `release.yml` (release.yml no longer pushes to `main`)

**Interfaces:**

- Consumes: the npm scripts from Task 1 and `pre-mode.mjs alpha-action` from Task 3.

- [ ] **Step 1: Write failing workflow tests** (string/YAML-shape assertions, the same style as today):
  - `"release runs on push to main and alpha"`: `on.push.branches` equals `[main, alpha]`, with no `workflow_run` trigger.
  - `"concurrency is per branch and never cancels"`: the group contains `github.ref_name`, and `cancel-in-progress: false`.
  - `"changesets/action uses the bot app token"`: `with.github-token` is `steps.app-token.outputs.token`, and the step sets no different `GITHUB_TOKEN` env. v2 throws when the env and input disagree.
  - `"version and publish commands are the npm scripts"`: `version-script: npm run version-packages`, `publish-script: npm run release`.
  - `"changesets/action is v2"`: `uses: changesets/action@v2`.
  - `"alpha guard runs before the action on alpha"`: a step `id: alpha` with `if: github.ref_name == 'alpha'` that runs `node scripts/release/pre-mode.mjs alpha-action >> "$GITHUB_OUTPUT"`, placed before the changesets step. The changesets step has `if: github.ref_name != 'alpha' || steps.alpha.outputs.action == 'release'`.
  - `"trusted publishing is kept"`: `id-token: write`, `npm install -g npm@latest`, `NPM_CONFIG_PROVENANCE: "true"`.
  - `release-decoupled.test.mjs`: the dispatch job's `if` requires `published == 'true'` and `github.ref_name == 'main'`, and passes the version from `fromJSON(needs.release.outputs.published-packages)[0].version`. The job outputs map `published: ${{ steps.changesets.outputs.published }}` and `published-packages: ${{ steps.changesets.outputs.published-packages }}`.
- [ ] **Step 2:** Run `npm run release:test`. Expected: FAIL.
- [ ] **Step 3: Rewrite release.yml.** One `release` job: mint the app token, then checkout with that token and `fetch-depth: 0`, then setup-node 24 with `registry-url`, then `npm ci --no-audit`, then the alpha guard, then `npm install -g npm@latest`, then `changesets/action@v2` (id `changesets`) with `github-token` (app token), `version-script`/`publish-script` as above, `pr-title: "chore: release"`, `commit-message: "chore: release"` and `create-github-releases: true`, and env `NODE_AUTH_TOKEN` (`secrets.NPM_TOKEN` fallback) and `NPM_CONFIG_PROVENANCE: "true"`. v2 does no `.npmrc` handling of its own. Auth comes from setup-node's `.npmrc` plus npm's OIDC exchange, which npm tries first. Job outputs are `published` and `published-packages`. Keep the `downstream-upgrade` dispatch job, gated as tested. Keep `workflow_dispatch` (no inputs) as the re-run lever. Rewrite the header comment to explain the new flow and why `push` replaced `workflow_run`: the merge queue already tests the merged commit, and `workflow_run` runs with `GITHUB_REF` set to the default branch, so changesets/action would treat an `alpha` run as `main`.
- [ ] **Step 4:** Delete gate/land and their tests. Grep for `gate.mjs`, `land.mjs` and `release:npmjs`, then update the remaining hits: comments in the `scripts/ci/classify-changes.mjs` header and `ci.yml`, the comment and the `MAIN_PUSH_PATTERNS` entry in `scripts/ci/tests/main-push-app-token.test.mjs` (its assertions still pass), and the README (Task 6). `classify-changes.test.mjs` string tests can stay. The superseded spec keeps its mentions.
- [ ] **Step 5:** Run `npm run release:test` and `act -n -W .github/workflows/release.yml`. Expected: tests PASS, and the dry run shows one `release` job plus the dispatch job.
- [ ] **Step 6:** Commit `ci(release)!: release through changesets version PRs`.

### Task 5: Update Claude automations to write changesets

**Files:**

- Modify: the prompt text in `.github/workflows/claude-perf-audit.yml`, `claude-a11y-audit.yml`, `claude-perf-explore.yml` and `claude-issue-triage.yml`, at the "open a PR" instructions. Also `.github/prompts/downstream-upgrade-fix.md` if it opens FiestaUI PRs. Check this; it most likely targets the downstream repos and needs no change.

- [ ] **Step 1:** In each prompt that opens a PR touching `src/`, add: "Before committing, write `.changeset/<kebab-slug>.md` with frontmatter `"@fiestaboard/ui": patch` (`minor` for new props or components; never `major` without a human) and a one-line, user-facing summary." The `Write` tool is already allowed, so no `--allowed-tools` change is needed.
- [ ] **Step 2:** Run `npm run release:test` and `npm run format:check`. Expected: PASS.
- [ ] **Step 3:** Commit `ci(claude): add changesets to automated PRs`.

### Task 6: Documentation

**Files:**

- Modify: `README.md` (the "Releases are continuous…" paragraph at ~line 224)
- Modify: `docs/superpowers/specs/2026-08-07-continuous-release-design.md` (add a "Superseded by" banner at the top)
- Create: `docs/releasing.md`

- [ ] **Step 1:** Write `docs/releasing.md`, covering:
  - The day-to-day flow: `npx changeset`, then merge, then the Version PR accumulates, then merge it to publish.
  - Installing an alpha (`npm i @fiestaboard/ui@alpha`).
  - **Alpha lifecycle:**
    1. Create the branch. From `main` after a release: `git switch -c alpha && npx changeset pre enter alpha`, commit, then push.
    2. Sync `main` into `alpha` with a merge commit, only right after a `main` release, when `main` has no pending `.changeset/*.md`. Otherwise a stable changeset is consumed twice and appears in both CHANGELOGs. On a mid-cycle `package.json` version conflict, keep alpha's version.
    3. Promote. On `alpha`, run `npx changeset pre exit` and merge that PR into `alpha`. Close alpha's stale "chore: release (alpha)" PR; the release run skips on exit mode. Then open a PR from `alpha` to `main`. `main`'s Version PR then computes the stable version and deletes `pre.json`.
    4. Restart alpha. After main publishes, delete `alpha` and recreate it from `main` (step 1). **Never merge main back into the old alpha.** main's squash merge leaves `.changeset/pre/` and stale `initialVersions` on alpha, and the next alpha would re-release old changesets at a version below the new stable.
  - The `no-changeset` label.
  - How to re-run a failed publish: re-run the workflow. `changeset publish` skips versions that already exist on npm. Caveat: while only empty changesets are pending, the action logs "All changesets are empty" and runs neither version nor publish. Retry before merging an empty-changeset PR, or wait for the next Version PR.
- [ ] **Step 2:** Replace the README paragraph with three sentences and a link to `docs/releasing.md`.
- [ ] **Step 3:** Run `npm run format:check`, then commit `docs(release): document changesets and the alpha channel`.

### Task 7 (optional): Alpha Storybook at `/alpha/`

**Files:**

- Modify: `.github/workflows/deploy-storybook.yml`

- [ ] **Step 1:** Trigger on push to `[main, alpha]`. In `build`, check out `main` and build into `storybook-static/`. Then check out `alpha` into a subdirectory, if `git ls-remote --heads origin alpha` finds it, and build it into `storybook-static/alpha/`. Upload a single Pages artifact. Pages replaces the whole site on each deploy, so both trees must ship together every time.
- [ ] **Step 2:** Run `act -n -W .github/workflows/deploy-storybook.yml`, then dispatch the workflow manually after merge. Check that `https://fiestaboard.github.io/FiestaUI/alpha/` loads.
- [ ] **Step 3:** Commit `ci(storybook): publish the alpha catalog under /alpha/`.

### Task 8: Rollout (manual, ordered; human-run repo settings)

- [ ] **Step 1:** Merge Tasks 1–6 as one PR, with its `--empty` changeset from Task 1. Expected run log: "All changesets are empty. Not creating PR". Nothing versions or publishes, and `latest` stays `8.16.0`. The empty changeset is consumed by the first real Version PR.
- [ ] **Step 2: Rulesets.** Leave `main-protection` (20204390) and `PR policy` (20826375) unchanged. `main-protection` carries a squash-only merge queue and `deletion`/`non_fast_forward` rules, which would break merge-commit syncs and the delete-and-recreate step. Create a new `alpha` ruleset targeting `refs/heads/alpha` with only `pull_request` + `required_status_checks` (`CI Success`), no merge queue, and bypass actors admin role 5 + Integration 4139279 (the Claude bot). Allow merge commits for PRs into alpha.
- [ ] **Step 3: Validate OIDC on low stakes first.** Create `alpha` (docs step 1). Merge a PR with a `patch` changeset into `alpha`, then merge the resulting "chore: release (alpha)" PR. Check: `npm view @fiestaboard/ui dist-tags` shows `alpha: 8.16.1-alpha.0` with `latest` unchanged, the `v8.16.1-alpha.0` tag exists, the GitHub Release is marked prerelease, and no downstream dispatch ran.
- [ ] **Step 4:** Make the first stable release from `main` the same way, then check that the downstream dispatch fired with the right version.
- [ ] **Step 5:** Once OIDC has published cleanly from changesets, remove the `NPM_TOKEN` fallback in a follow-up, as release.yml's existing comment already plans.
