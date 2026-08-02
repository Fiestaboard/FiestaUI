# Downstream Upgrade Automation — Design

**Date:** 2026-08-01
**Status:** Approved
**Owner:** FiestaUI (`Fiestaboard/FiestaUI`)

## Purpose

When FiestaUI releases a new version, proactively open (or update) a single
evergreen upgrade PR on `Fiestaboard/FiestaBoard` so the downstream app can
always merge one current, green PR to pick up the latest `@fiestaboard/ui`.
When the upgrade breaks FiestaBoard, Claude (Opus) fixes the breakage using
TDD and validates FiestaBoard CI before the PR is labeled good to go.

FiestaUI owns the whole loop: it has the component source, the exact
`vPrev..vNew` diff, CLAUDE.md, and local skills — the best context for
understanding its own breaking changes.

## Scope

- Target consumer: `Fiestaboard/FiestaBoard` only (the `web/` app). The
  design should not preclude adding more consumers later, but nothing beyond
  FiestaBoard is built now.
- The automation never merges the downstream PR; a human on FiestaBoard does.

## Architecture

One new workflow in FiestaUI: `.github/workflows/downstream-upgrade.yml`.

### Triggers

- **`workflow_call`** — invoked as a final job in `release.yml` after publish
  succeeds (same run; sidesteps the GitHub rule that events created with
  `GITHUB_TOKEN`, like our `gh release create`, do not trigger other
  workflows).
- **`workflow_dispatch`** — inputs: optional `version` (defaults to latest
  release) and `dry_run` (boolean). Used for backfills, retries, and testing.

### Credentials

- **`CLAUDE_BOT_APP_ID` / `CLAUDE_BOT_APP_PRIVATE_KEY`** (new FiestaUI
  secrets; same GitHub App FiestaBoard's automation already uses) → mints an
  installation token with write access to FiestaBoard. Pushes from this
  identity run FiestaBoard CI without the "Approve workflows" gate.
- **FiestaUI's own `GITHUB_TOKEN`** → `read:packages` for installing
  `@fiestaboard/ui` from GitHub Packages (the package is published from this
  repo).
- **`ANTHROPIC_API_KEY`** (new FiestaUI secret, same credential family as
  FiestaBoard's Claude workflows) → headless Claude runs.

### Job 1 — mechanical bump & evergreen PR

1. Check out `Fiestaboard/FiestaBoard` into a subdirectory at `main`.
2. Reset the fixed branch `fiestaui-upgrade` from `main`. A fixed branch is
   what makes the PR evergreen: each release discards stale branch state and
   jumps straight to the newest version.
3. Pin `@fiestaboard/ui` to the exact released version in
   `web/package.json`; run `npm install` to refresh the lockfile.
4. Force-push (`--force-with-lease`) with the App token.
5. Create the PR if none is open for `fiestaui-upgrade`; otherwise update the
   existing PR in place. Title: `chore(deps): upgrade @fiestaboard/ui to
vX.Y.Z`. Body: FiestaUI release notes for the version range plus a log of
   what the automation did. Initial label: `upgrade-pending`.

### Job 2 — validate → fix loop (Claude Opus, TDD)

Runs in the same workflow with both repos on disk.

1. **Baseline check:** run FiestaBoard `web` typecheck + `test:run` on
   unbumped `main` first. If the baseline is red, label `upgrade-blocked`
   with "baseline failure, not an upgrade issue", comment, and stop — no
   Claude tokens spent on someone else's breakage.
2. **Local validation:** run typecheck + tests on the bumped branch. Green →
   skip Claude entirely (Claude is invoked only when something fails).
3. **Claude fix (only on failure):** headless `claude` CLI, `--model opus`,
   with a tailored prompt. Context available: FiestaUI full source,
   `git diff vPrev..vNew`, FiestaUI CLAUDE.md/skills, the FiestaBoard
   checkout, and the failing output. Instructions: follow TDD — first
   write/adjust failing FiestaBoard tests that capture the breakage, then fix
   call sites to the new API, re-run typecheck + tests until locally green.
   Commits to the upgrade branch use a `[fiestaui-upgrade]` message prefix.
4. **Real CI confirmation:** push, then poll the FiestaBoard PR checks
   (`gh pr checks --watch`). If FiestaBoard CI fails on something not
   reproduced locally, fetch the failing logs and loop back to step 3.
5. **Caps:** maximum 3 Claude attempts per run; hard job timeout ~90
   minutes.

### PR state signaling (always ready + labels)

The PR is always open and ready for review — never draft. Labels carry
state:

| Label             | Meaning                                               |
| ----------------- | ----------------------------------------------------- |
| `upgrade-pending` | Bump pushed; validation/fixing in progress            |
| `upgrade-green`   | FiestaBoard CI confirmed passing; PR is good to merge |
| `upgrade-blocked` | Attempts exhausted or baseline red; needs a human     |

On `upgrade-green`, a comment summarizes what (if anything) Claude changed.
On `upgrade-blocked`, a sticky comment @-mentions `jeffredodd` with failing
logs and what was tried.

## Edge cases & safety

- **New release mid-fix:** concurrency group `downstream-upgrade`,
  `cancel-in-progress: true`. The newest release wins; the branch reset
  discards in-flight fixes, which is correct because fixes must target the
  newest API.
- **Loop safety:** all retries happen inside one synchronous job (poll, not
  event-driven), so a simple attempt counter + timeout bounds the loop. No
  cross-workflow re-fire chains.
- **Fork/secret safety:** the workflow only runs from FiestaUI `main`
  (release-triggered or manual dispatch); it never executes downstream PR
  code with secrets in scope beyond FiestaBoard's own CI, which runs under
  FiestaBoard's existing rules.
- **No auto-merge:** the automation only keeps the single PR current and
  green.

## Error handling

- Any infrastructure failure (token minting, checkout, npm install) fails
  the workflow loudly; `release.yml` marks the run red so it is visible next
  to the release.
- Claude giving up → `upgrade-blocked` label + maintainer mention, workflow
  exits 0 (the release itself succeeded; the upgrade needs a human).

## Testing

- `actionlint` on FiestaUI workflows in CI.
- `dry_run: true` dispatch input: performs checkout, reset, bump, install,
  and local validation but skips push/PR/Claude; prints the diff it would
  have pushed.
- First live validation: manual dispatch against the current released
  version, observing the PR get created, then dispatching again to observe
  the in-place update path.

## Out of scope (YAGNI)

- Additional consumers (HA app, plugins) — the dispatch design doesn't
  preclude them, but nothing is built for them.
- Auto-merge of green PRs.
- Visual regression checks beyond FiestaBoard's existing CI.
