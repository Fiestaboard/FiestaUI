# Continuous Release — Design

**Date:** 2026-08-07
**Status:** Approved
**Related:** `.github/workflows/release.yml`, `.github/workflows/ci.yml`,
`.github/workflows/downstream-upgrade.yml`

## Problem

Releases are manual and have been since the repo's first commit. `release.yml`
has carried `on: workflow_dispatch:` and nothing else since `da251f0`, and
every tag from `v0.1.0` through `v1.2.1` was dispatched by hand:

| Tag    | Created          | Trigger                         |
| ------ | ---------------- | ------------------------------- |
| v1.2.1 | 2026-08-07 04:54 | manual dispatch by `jeffredodd` |
| v1.2.0 | 2026-08-06 05:00 | manual dispatch by `jeffredodd` |
| v1.1.0 | 2026-08-02 20:47 | manual dispatch by `jeffredodd` |
| v1.0.x | 2026-08-02       | manual dispatch by `jeffredodd` |
| v0.x   | 2026-08-01       | manual dispatch by `jeffredodd` |

The repo felt continuously released on Aug 1–2 because the owner was
dispatching several times a day while iterating. That cadence stopped; no
automation broke.

The cost of manual release is that merged work sits unpublished for an
unbounded time. `downstream-upgrade.yml` keeps an evergreen upgrade PR open on
`Fiestaboard/FiestaBoard` pointed at the latest release, so an unreleased
`main` means the downstream consumer is pinned to increasingly stale code, and
the perf and a11y audit loops' merged improvements never reach it.

## Goal

Every merge to `main` that changes shipped code publishes a version, with no
human in the loop, without publishing broken code and without the release
process re-triggering itself.

## Constraints

The `main-protection` ruleset is the dominant constraint. It requires a pull
request and a passing `CI Success` check for every human change. Its one bypass
actor is the **GitHub Actions app**, added specifically so the release can push
its version commit and tag straight to `main`.

That bypass replaced an auto-merged version PR, which was never stable. The
lessons that killed it, and that must survive any change:

- A bot-created PR's `pull_request` CI run is born `action_required` and must be
  explicitly approved, and only checks from the `pull_request` suite count
  toward the PR's required check (learned on v1.0.2). Polling for that gated run
  is a race: on v1.3.1 it did not appear inside the 120s window, so the version
  published and tagged but its commit never landed, and the orphaned PR went
  permanently `CONFLICTING` the moment v1.3.2 landed.
- The version commit must be replayed on `main`'s current tip, not pushed from
  the detached gate sha — `main` can move while CI verifies that sha, and the
  push has to stay a fast-forward.
- An explicit `permissions` block zeroes everything unlisted, and the called
  `downstream-upgrade.yml` cannot request more than its caller grants.

## Decisions (owner-confirmed)

- **Trigger scope:** code changes only. Skip the release's own commits and
  non-code churn, reusing CI's existing classifier rules rather than inventing
  a second definition of "code".
- **Bump rule:** derived from conventional commits since the last tag. `!` or a
  `BREAKING CHANGE` footer is the only path to a major, keeping majors
  deliberate.
- **CI gate:** wait for CI to go green on `main` before publishing. The PR's
  required check tests the PR head, not the merge result; two independently
  green PRs can combine into a red `main`, and that must not ship downstream.
- **Burst behavior:** coalesce. A burst of merges produces one version covering
  all of them. A run that is already publishing is never cancelled.

## Design

### Trigger

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
  workflow_dispatch:
    inputs:
      bump: { patch | minor | major }
```

The gate exits unless `workflow_run.conclusion == 'success'` **and**
`workflow_run.event == 'push'`. CI also runs on `pull_request`; those runs would
otherwise leak through and release from a PR branch's CI.

`workflow_dispatch` is retained unchanged as the manual override — for forcing a
major, or for re-running a release after an infrastructure failure. A dispatched
run bypasses the gate entirely and uses the `bump` input.

### A release's own landing never triggers CI

Verified against run history, and load-bearing for everything below: the release
merge `200fddd` has **no CI run at all**, and neither does any earlier one. The
version commit is pushed with `GH_TOKEN: ${{ github.token }}`, and
GitHub does not create workflow runs for events caused by the default
`GITHUB_TOKEN`. That is the platform's own loop-prevention rule.

So the release loop cannot start: no CI run means no `workflow_run` event means
no gate evaluation. The empty-range check below is still implemented, as
defence in depth and because it is also the correct answer for a range with
nothing in it, but it is not the only thing standing between us and a runaway
publish loop.

The corollary is the trap: **"the tip has no CI run" must mean proceed, not
skip.** A tip that is a release merge will never be green, and treating that as
"not ready" would strand any work merged during a release.

(Separately, `00a07be` also has no CI run — its subject contains the literal
string `[skip ci]`, which GitHub matches anywhere in the message. That commit is
the one that fixed skip-ci markers blocking merges. Nothing in this design
depends on it; it is noted so the next person reading the run history is not
misled about why some `main` commits have no CI.)

### The gate releases the sha CI verified, not `main`'s tip

Releasing the tip would publish a commit whose CI has not finished, defeating
the whole point of the CI gate. So the gate operates on
`workflow_run.head_sha`, which is green by construction — no API query, no race
between checking and publishing.

That choice creates one problem, which the next section solves.

### The version comes from the highest tag, not from `package.json`

`npm version <bump>` bumps whatever `package.json` says on the checked-out ref.
When a release lands while another commit's CI is still running, that release is
**not in the running commit's ancestry** — so its `package.json` is stale, and so
is `git describe --tags --abbrev=0`, which only finds tags reachable from HEAD.
A relative bump from either would regenerate an already-published version, and
GitHub Packages does not permit republishing. The tag would already be pushed by
then, so escaping costs a manual bump.

The fix is to treat version precedence as global, because tags are global:

- Base = the highest `vX.Y.Z` tag in the repo by **semver** precedence (not
  lexical — `v1.10.0` must beat `v1.9.0`).
- The workflow passes `npm version` an **explicit version**, computed from that
  base, never a bump type.

The commit range `BASE_TAG..HEAD` still works when the base tag is not an
ancestor: `A..B` is a set difference, "reachable from B but not from A", which
is exactly the unreleased work. The file range uses three-dot
(`BASE_TAG...HEAD`, merge-base vs HEAD) to match `ci.yml`; two-dot would compare
the endpoints directly and show `package.json` reverting, a phantom code change
that would cut a needless release.

### Gate algorithm

1. Check out `workflow_run.head_sha` at full depth with tags.
2. **Coalesce:** if that sha is not `main`'s tip and the tip's own CI is green,
   skip — the tip's release run covers this work too. If the tip has no CI run,
   proceed (see the trap above).
3. `BASE_TAG` = highest `vX.Y.Z` tag by semver.
4. Commit messages: `git log --no-merges --format=%B%x00 "$BASE_TAG..$SHA"`.
   **If empty, skip.**
5. Changed files: `git diff --name-only "$BASE_TAG...$SHA"`. If every path
   classifies as non-code, skip.
6. Bump = highest across those messages: `!` or `BREAKING CHANGE` → major,
   `feat` → minor, everything else → patch. Version = `BASE_TAG` bumped.

### Why the empty-range check is the right shape

The version commit is pushed straight to `main` with the tag on that same
commit, so the range from the tag is empty by construction. No actor check, no
`[skip ci]` marker, no commit-subject pattern to keep in sync.

### Worked trace

```
#50 (perf) merges         -> CI green on sha1 -> sha1 is tip -> [#50] code    -> release v1.2.2
#51 merges during #50's CI -> gate for sha1: tip=sha2 and green -> SKIP (coalesce)
                          -> gate for sha2: [#50,#51] code                    -> release v1.3.0
release lands V + merge M -> no CI run on M at all                            -> never triggers
docs-only merge           -> CI green -> [docs:] no code                      -> skip
audit state-file merge    -> CI green -> [chore:] no code                     -> skip
CI red on main            -> conclusion != success                            -> gate does not run
work merged during release -> gate for sha51: tip=M, CI "none" -> proceed     -> release (no stranding)
```

### Concurrency

`concurrency: { group: release, cancel-in-progress: false }` is retained
unchanged. Runs serialize and a publishing run is never cancelled. Coalescing
comes from the gate's idempotency, not from cancellation: a queued run that
finds nothing new since the last tag simply skips.

### Components

| Unit                              | Responsibility                                                        |
| --------------------------------- | --------------------------------------------------------------------- |
| `scripts/ci/classify-changes.mjs` | Sole definition of "is this path shipped code?" Pure, testable.       |
| `scripts/release/gate.mjs`        | Commit messages + files → `{release, bump, version}`; semver on tags. |
| `release.yml` `gate` job          | Git and API plumbing; calls the two modules above.                    |
| `release.yml` `release` job       | Publish/tag/PR-landing steps, now `needs: gate` and given a version.  |

Both modules are dependency-free ESM with `node --test` suites, matching
`scripts/perf/`. The decision logic is pure functions over plain data, so the
tests need no git, no network, and no mocking.

`classify-changes.mjs` is extracted from the inline `case` statement in
`ci.yml`'s `changes` job, which becomes its first consumer. This is deliberate:
two copies of the code/non-code rule would drift, and a drifted copy fails
silently in the worst direction — either releasing on every audit bookkeeping
commit or skipping real changes. The bash guards already in `changes` for
degenerate inputs (empty diff, unknown shas, first push) stay in bash; only the
path-classification loop moves.

### Error handling

- **Uncertainty resolves toward doing the safe thing.** `classify-changes.mjs`
  treats any path it does not recognize as code, so an unfamiliar file causes a
  release rather than a silent skip — and, in CI's `changes` job, causes the
  full suite to run rather than be skipped.
- **A skipped gate is a success, not a failure.** Skips are the common path
  (every docs merge, every release's own landing) and must not page anyone.
  The reason is written to the job summary.
- **Publish failures stay loud.** The commit and its tag land in one push, so
  they never disagree. If that push cannot be made after five replay attempts,
  the step fails with the version published but neither tagged nor on `main`;
  a human lands the bump and tag, and nothing else is lost.

### Testing

- `scripts/release/tests/gate.test.mjs` — bump precedence across mixed commit
  sets, `!` and `BREAKING CHANGE` majors, `BREAKING CHANGE` in prose _not_
  counting, empty-range skip, non-code skip, semver-vs-lexical tag ordering.
- `scripts/ci/tests/classify-changes.test.mjs` — each non-code pattern, the
  unknown-path-is-code default, mixed lists.
- Both run in CI's `automation` job via `npm run release:test`.

Validated against real history before merge: replaying `v1.2.0..v1.2.1^`
derives `patch` → `1.2.1`, and `v1.1.0..v1.2.0^` derives `minor` — matching the
versions actually shipped. Replaying `v1.2.1..main` skips, which is the
release's own landing.

## Out of scope

- CHANGELOG generation. `gh release create --generate-notes` already produces
  per-release notes.
- Changing what `downstream-upgrade.yml` does. It will simply fire more often;
  it maintains one evergreen PR rather than opening a new one per release.
- Publishing to `registry.npmjs.org`. The existing note about switching to npm
  Trusted Publishing (OIDC) still stands and is unaffected.
