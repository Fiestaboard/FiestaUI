# Downstream Upgrade Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When FiestaUI releases, automatically open/update one evergreen upgrade PR on `Fiestaboard/FiestaBoard`, with Claude (Opus) TDD-fixing breakage and FiestaBoard CI confirmed green before the PR is labeled good to go.

**Architecture:** A reusable FiestaUI workflow (`downstream-upgrade.yml`) called from `release.yml` after publish (and manually dispatchable). Logic lives in small tested shell scripts under `scripts/downstream-upgrade/`; the workflow only wires them together. Claude runs headless via the `claude` CLI with a prompt template, bounded by a shared attempt counter.

**Tech Stack:** GitHub Actions, bash, `gh` CLI, `npm`, headless Claude Code CLI (`--model opus`), GitHub App token (`CLAUDE_BOT_APP`), GitHub Packages npm registry.

## Global Constraints

- Target consumer: `Fiestaboard/FiestaBoard`, app dir `web/`, default branch `main`.
- Evergreen branch name on FiestaBoard: `fiestaui-upgrade` (must NOT match FiestaBoard's `claude-ci-autofix` branch prefixes: `bug-hunt/`, `docs/`, `a11y/`, `claude/`).
- PR labels: `upgrade-pending` (#FBCA04), `upgrade-green` (#0E8A16), `upgrade-blocked` (#D93F0B). PR is never draft. Automation never merges.
- Max 3 Claude attempts total per workflow run (shared counter across local-fix and CI-repair phases); job timeout 90 minutes.
- Claude model: `opus`. Auth: `CLAUDE_CODE_OAUTH_TOKEN` secret (org convention; `ANTHROPIC_API_KEY` also honored if set).
- Cross-repo auth: `CLAUDE_BOT_APP_ID` + `CLAUDE_BOT_APP_PRIVATE_KEY` secrets (same App FiestaBoard uses).
- Package installs of `@fiestaboard/ui` authenticate with FiestaUI's own `GITHUB_TOKEN` (`packages: read`), registry `https://npm.pkg.github.com`, scope `@fiestaboard`.
- Maintainer to ping on `upgrade-blocked`: `jeffredodd`.
- Scripts must pass `shellcheck`; workflows must pass `actionlint`; script unit tests must run offline (no network, no real `claude`/`gh`).
- All work on branch `feat/downstream-upgrade`; conventional commits; PR to FiestaUI `main` at the end.

## File Structure

- `scripts/downstream-upgrade/bump.sh` — pin `@fiestaboard/ui` to an exact version in `web/package.json`, refresh lockfile.
- `scripts/downstream-upgrade/validate.sh` — run web typecheck + unit tests, tee output to a log; exit code = result.
- `scripts/downstream-upgrade/fix-loop.sh` — bounded Claude attempt loop: render prompt, run `claude`, re-validate; shared attempt counter file.
- `scripts/downstream-upgrade/pr-sync.sh` — ensure labels; create-or-update the evergreen PR; set state label; comment.
- `scripts/downstream-upgrade/tests/helpers.sh`, `tests/run.sh`, `tests/test_*.sh` — offline test harness (plain bash, no bats).
- `.github/prompts/downstream-upgrade-fix.md` — Claude TDD prompt template (`{{TOKEN}}` placeholders).
- `.github/workflows/downstream-upgrade.yml` — the orchestrating workflow (`workflow_call` + `workflow_dispatch` with `dry_run`).
- Modify `.github/workflows/release.yml` — expose `version` job output; add `downstream-upgrade` job.
- Modify `.github/workflows/ci.yml` — add `automation` job (actionlint + shellcheck + script tests); include it in `ci-success.needs`.
- Modify `README.md` — document the automation + required secrets.

---

### Task 1: Test harness + `bump.sh`

**Files:**
- Create: `scripts/downstream-upgrade/tests/helpers.sh`
- Create: `scripts/downstream-upgrade/tests/run.sh`
- Create: `scripts/downstream-upgrade/tests/test_bump.sh`
- Create: `scripts/downstream-upgrade/bump.sh`

**Interfaces:**
- Produces: `bump.sh <fiestaboard-dir> <version>`; env `SKIP_INSTALL=1` skips `npm install`. Exits non-zero on missing args or missing `web/package.json`.
- Produces (harness): `tests/run.sh` executes every `tests/test_*.sh` in a subshell, prints PASS/FAIL per file, exits non-zero if any fail. `helpers.sh` provides `assert_eq <expected> <actual> <msg>`, `assert_file_contains <file> <needle> <msg>`, `fail <msg>`, and `make_tmp` (mktemp dir under `${TMPDIR:-/tmp}`, auto-removed via trap).

- [ ] **Step 1: Write the harness**

`scripts/downstream-upgrade/tests/helpers.sh`:

```bash
#!/usr/bin/env bash
# Shared assertions for the offline script tests. Source from test_*.sh.
set -euo pipefail

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

assert_eq() { # expected actual msg
  [ "$1" = "$2" ] || fail "$3 (expected '$1', got '$2')"
}

assert_file_contains() { # file needle msg
  grep -qF -- "$2" "$1" || fail "$3 ('$2' not found in $1)"
}

make_tmp() {
  local d
  d=$(mktemp -d "${TMPDIR:-/tmp}/du-test.XXXXXX")
  # shellcheck disable=SC2064
  trap "rm -rf '$d'" EXIT
  echo "$d"
}
```

`scripts/downstream-upgrade/tests/run.sh`:

```bash
#!/usr/bin/env bash
# Run all offline tests for the downstream-upgrade scripts.
set -uo pipefail
cd "$(dirname "$0")"
rc=0
for t in test_*.sh; do
  if bash "$t"; then
    echo "PASS: $t"
  else
    echo "FAIL: $t"
    rc=1
  fi
done
exit $rc
```

- [ ] **Step 2: Write the failing test for bump.sh**

`scripts/downstream-upgrade/tests/test_bump.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/fb/web"
cat > "$tmp/fb/web/package.json" <<'EOF'
{
  "name": "web",
  "dependencies": { "@fiestaboard/ui": "^0.3.0" }
}
EOF

# Pins the dependency to the exact version without installing.
SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 0.4.0
assert_file_contains "$tmp/fb/web/package.json" '"@fiestaboard/ui": "0.4.0"' "exact pin written"

# Missing args → non-zero exit.
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 2>/dev/null; then
  fail "missing version should exit non-zero"
fi

# Missing web/package.json → non-zero exit.
mkdir -p "$tmp/empty"
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/empty" 0.4.0 2>/dev/null; then
  fail "missing web/package.json should exit non-zero"
fi
```

- [ ] **Step 3: Run to verify it fails** — `bash scripts/downstream-upgrade/tests/run.sh` → FAIL (bump.sh missing).

- [ ] **Step 4: Implement `bump.sh`**

```bash
#!/usr/bin/env bash
# Pin @fiestaboard/ui to an exact released version in the FiestaBoard web
# app and refresh the lockfile. SKIP_INSTALL=1 skips `npm install` (tests
# and dry runs that only need the manifest change).
#
# Usage: bump.sh <fiestaboard-dir> <version>   # version without leading v
set -euo pipefail

FB_DIR="${1:?usage: bump.sh <fiestaboard-dir> <version>}"
VERSION="${2:?usage: bump.sh <fiestaboard-dir> <version>}"
WEB_DIR="$FB_DIR/web"

[ -f "$WEB_DIR/package.json" ] || { echo "no package.json in $WEB_DIR" >&2; exit 1; }

(
  cd "$WEB_DIR"
  npm pkg set "dependencies.@fiestaboard/ui=$VERSION"
  if [ "${SKIP_INSTALL:-0}" != "1" ]; then
    npm install --no-audit --fund=false
  fi
)
```

- [ ] **Step 5: Run tests to verify pass** — `bash scripts/downstream-upgrade/tests/run.sh` → all PASS. Also `shellcheck scripts/downstream-upgrade/*.sh scripts/downstream-upgrade/tests/*.sh` → clean. `chmod +x` all scripts.

- [ ] **Step 6: Commit** — `feat: downstream-upgrade bump script + test harness`

---

### Task 2: `validate.sh`

**Files:**
- Create: `scripts/downstream-upgrade/validate.sh`
- Create: `scripts/downstream-upgrade/tests/test_validate.sh`

**Interfaces:**
- Produces: `validate.sh <fiestaboard-dir> <log-file>` — runs `npm run typecheck` then `npm run test:run` in `<fiestaboard-dir>/web`, appending all output (with `=== typecheck ===` / `=== test:run ===` markers) to `<log-file>`. Exit 0 iff both pass; runs both even if the first fails (Claude sees the full picture).

- [ ] **Step 1: Write the failing test**

`scripts/downstream-upgrade/tests/test_validate.sh` (fixtures use npm scripts that need no network):

```bash
#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

mk_fixture() { # dir typecheck_cmd test_cmd
  mkdir -p "$1/web"
  cat > "$1/web/package.json" <<EOF
{ "name": "web", "scripts": { "typecheck": "$2", "test:run": "$3" } }
EOF
}

mk_fixture "$tmp/green" "echo tc-ok" "echo test-ok"
"$SCRIPTS/validate.sh" "$tmp/green" "$tmp/green.log" || fail "green fixture should pass"
assert_file_contains "$tmp/green.log" "tc-ok" "typecheck output captured"
assert_file_contains "$tmp/green.log" "test-ok" "test output captured"

mk_fixture "$tmp/red" "echo tc-broke && exit 1" "echo test-broke && exit 1"
if "$SCRIPTS/validate.sh" "$tmp/red" "$tmp/red.log"; then
  fail "red fixture should fail"
fi
assert_file_contains "$tmp/red.log" "tc-broke" "typecheck failure captured"
assert_file_contains "$tmp/red.log" "test-broke" "tests still run after typecheck fails"
```

- [ ] **Step 2: Run to verify it fails** — `bash scripts/downstream-upgrade/tests/run.sh` → test_validate FAIL.

- [ ] **Step 3: Implement `validate.sh`**

```bash
#!/usr/bin/env bash
# Validate the FiestaBoard web app: typecheck + unit tests. All output is
# appended to <log-file> so a fix attempt can read the failure context.
# Both commands run even if the first fails. Exit 0 iff both pass.
#
# Usage: validate.sh <fiestaboard-dir> <log-file>
set -uo pipefail

FB_DIR="${1:?usage: validate.sh <fiestaboard-dir> <log-file>}"
LOG="${2:?usage: validate.sh <fiestaboard-dir> <log-file>}"

status=0
for target in typecheck test:run; do
  echo "=== $target ===" >> "$LOG"
  if ! (cd "$FB_DIR/web" && npm run "$target") >> "$LOG" 2>&1; then
    status=1
  fi
done
exit $status
```

- [ ] **Step 4: Run tests to verify pass**; shellcheck clean; `chmod +x`.
- [ ] **Step 5: Commit** — `feat: downstream-upgrade validate script`

---

### Task 3: Prompt template + `fix-loop.sh`

**Files:**
- Create: `.github/prompts/downstream-upgrade-fix.md`
- Create: `scripts/downstream-upgrade/fix-loop.sh`
- Create: `scripts/downstream-upgrade/tests/test_fix_loop.sh`

**Interfaces:**
- Consumes: `validate.sh` (as the default validate command).
- Produces: `fix-loop.sh` driven by env vars:
  - `FIESTAUI_DIR`, `FIESTABOARD_DIR`, `LOG_FILE`, `PREV_VERSION`, `NEW_VERSION` (required)
  - `PROMPT_FILE` (default `$FIESTAUI_DIR/.github/prompts/downstream-upgrade-fix.md`)
  - `ATTEMPTS_FILE` (default `$FIESTABOARD_DIR/.git/du-attempts`), `MAX_ATTEMPTS` (default 3)
  - `CLAUDE_BIN` (default `claude`), `CLAUDE_MODEL` (default `opus`)
  - `VALIDATE_CMD` (default `"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh" "$FIESTABOARD_DIR" "$LOG_FILE"`, run via `bash -c`)
  - Behavior: while counter < MAX_ATTEMPTS → increment counter file, render prompt (replace `{{FIESTAUI_DIR}}`, `{{FIESTABOARD_DIR}}`, `{{LOG_FILE}}`, `{{PREV_VERSION}}`, `{{NEW_VERSION}}`, `{{ATTEMPT}}`, `{{MAX_ATTEMPTS}}`), run `claude` headless from `FIESTABOARD_DIR`, run validate; exit 0 on green. Exit 1 when attempts exhausted (or already exhausted on entry).

- [ ] **Step 1: Write the prompt template**

`.github/prompts/downstream-upgrade-fix.md`:

```markdown
# Fix FiestaBoard breakage from the @fiestaboard/ui v{{NEW_VERSION}} upgrade

You are running inside FiestaUI's downstream-upgrade automation
(attempt {{ATTEMPT}} of {{MAX_ATTEMPTS}}). The FiestaBoard app checkout at
`{{FIESTABOARD_DIR}}` was bumped from `@fiestaboard/ui` v{{PREV_VERSION}} to
v{{NEW_VERSION}} on branch `fiestaui-upgrade`, and its typecheck and/or unit
tests now fail.

The failing output is in `{{LOG_FILE}}` — read it first.

FiestaUI's full source for the new version is at `{{FIESTAUI_DIR}}`. To see
exactly what changed in the design system, run:

    git -C {{FIESTAUI_DIR}} diff v{{PREV_VERSION}}..v{{NEW_VERSION}} -- src

## Rules

1. Work ONLY inside `{{FIESTABOARD_DIR}}` (the `web/` app). Never edit
   FiestaUI source, and never change other dependencies or pin
   `@fiestaboard/ui` back.
2. Follow TDD: for each breakage, first write or adjust a test under
   `web/` that captures the NEW expected behavior (it should fail), then fix
   the call sites to FiestaUI's new API, then re-run.
3. No papering over: no `as any`, no `@ts-ignore`/`@ts-expect-error`, no
   `.skip`, no deleting assertions to get green.
4. Validate with: `cd {{FIESTABOARD_DIR}}/web && npm run typecheck && npm run test:run`
5. Commit to the current branch in small commits, each message prefixed
   `[fiestaui-upgrade] `. Do NOT push — the automation pushes.

When typecheck and tests both pass locally, stop and print a short summary
of what you changed and why.
```

- [ ] **Step 2: Write the failing test**

`scripts/downstream-upgrade/tests/test_fix_loop.sh`. Stubs: a fake `claude` that logs its argv and, on configurable attempt N, creates a `fixed` marker; `VALIDATE_CMD` checks the marker.

```bash
#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS/../.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/fb/.git" "$tmp/ui" "$tmp/bin"

# Fake claude: records calls; "fixes" the app when the call count reaches
# $FIX_ON_ATTEMPT (0 = never).
cat > "$tmp/bin/claude" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$tmp/claude-calls.log"
calls=\$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')
if [ "\$FIX_ON_ATTEMPT" != "0" ] && [ "\$calls" -ge "\$FIX_ON_ATTEMPT" ]; then
  touch "$tmp/fixed"
fi
EOF
chmod +x "$tmp/bin/claude"

run_loop() {
  FIESTAUI_DIR="$REPO_ROOT" FIESTABOARD_DIR="$tmp/fb" LOG_FILE="$tmp/log" \
  PREV_VERSION=0.3.0 NEW_VERSION=0.4.0 \
  ATTEMPTS_FILE="$tmp/attempts" MAX_ATTEMPTS=3 \
  CLAUDE_BIN="$tmp/bin/claude" \
  VALIDATE_CMD="test -f '$tmp/fixed'" \
  FIX_ON_ATTEMPT="$1" "$SCRIPTS/fix-loop.sh"
}

# Fixed on attempt 2 → exit 0, exactly 2 claude calls, counter = 2.
touch "$tmp/log"
run_loop 2 || fail "should succeed when fixed on attempt 2"
assert_eq "2" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')" "claude called twice"
assert_eq "2" "$(cat "$tmp/attempts")" "counter persisted"
# Rendered prompt reached claude with substitutions applied.
assert_file_contains "$tmp/claude-calls.log" "v0.4.0" "version substituted into prompt"
assert_file_contains "$tmp/claude-calls.log" "--model opus" "opus model requested"

# Counter already at max → no further claude calls, exit 1.
: > "$tmp/claude-calls.log"; rm -f "$tmp/fixed"; echo 3 > "$tmp/attempts"
if run_loop 1; then fail "exhausted counter should fail without running claude"; fi
assert_eq "0" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ' || echo 0)" "no claude calls when exhausted"

# Never fixed → 3 attempts then exit 1.
: > "$tmp/claude-calls.log"; rm -f "$tmp/attempts"
if run_loop 0; then fail "unfixable should exit 1"; fi
assert_eq "3" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')" "all attempts used"
```

- [ ] **Step 3: Run to verify it fails.**

- [ ] **Step 4: Implement `fix-loop.sh`**

```bash
#!/usr/bin/env bash
# Bounded Claude fix loop. Renders the prompt template, runs headless
# Claude from the FiestaBoard checkout, and re-validates, up to
# MAX_ATTEMPTS total attempts tracked in ATTEMPTS_FILE (shared across the
# local-fix and CI-repair phases of one workflow run).
#
# Exit 0 = validation green. Exit 1 = attempts exhausted.
set -euo pipefail

: "${FIESTAUI_DIR:?}" "${FIESTABOARD_DIR:?}" "${LOG_FILE:?}"
: "${PREV_VERSION:?}" "${NEW_VERSION:?}"
PROMPT_FILE="${PROMPT_FILE:-$FIESTAUI_DIR/.github/prompts/downstream-upgrade-fix.md}"
ATTEMPTS_FILE="${ATTEMPTS_FILE:-$FIESTABOARD_DIR/.git/du-attempts}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
VALIDATE_CMD="${VALIDATE_CMD:-\"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh\" \"$FIESTABOARD_DIR\" \"$LOG_FILE\"}"

render_prompt() { # attempt
  sed -e "s|{{FIESTAUI_DIR}}|$FIESTAUI_DIR|g" \
      -e "s|{{FIESTABOARD_DIR}}|$FIESTABOARD_DIR|g" \
      -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
      -e "s|{{PREV_VERSION}}|$PREV_VERSION|g" \
      -e "s|{{NEW_VERSION}}|$NEW_VERSION|g" \
      -e "s|{{ATTEMPT}}|$1|g" \
      -e "s|{{MAX_ATTEMPTS}}|$MAX_ATTEMPTS|g" \
      "$PROMPT_FILE"
}

count=$(cat "$ATTEMPTS_FILE" 2>/dev/null || echo 0)
while [ "$count" -lt "$MAX_ATTEMPTS" ]; do
  count=$((count + 1))
  echo "$count" > "$ATTEMPTS_FILE"
  echo "--- Claude fix attempt $count/$MAX_ATTEMPTS ---"

  prompt=$(render_prompt "$count")
  (
    cd "$FIESTABOARD_DIR"
    "$CLAUDE_BIN" -p "$prompt" \
      --model "$CLAUDE_MODEL" \
      --add-dir "$FIESTAUI_DIR" \
      --dangerously-skip-permissions
  ) || echo "claude exited non-zero on attempt $count (continuing to validate)"

  : > "$LOG_FILE"
  if bash -c "$VALIDATE_CMD"; then
    echo "validation green after attempt $count"
    exit 0
  fi
done

echo "fix attempts exhausted ($MAX_ATTEMPTS)" >&2
exit 1
```

- [ ] **Step 5: Run tests to verify pass**; shellcheck clean; `chmod +x`.
- [ ] **Step 6: Commit** — `feat: Claude fix loop + TDD prompt template`

---

### Task 4: `pr-sync.sh`

**Files:**
- Create: `scripts/downstream-upgrade/pr-sync.sh`
- Create: `scripts/downstream-upgrade/tests/test_pr_sync.sh`

**Interfaces:**
- Produces: `pr-sync.sh <subcommand> [args]`, env `REPO` (default `Fiestaboard/FiestaBoard`), `BRANCH` (default `fiestaui-upgrade`), `GH_BIN` (default `gh`, for tests). Subcommands:
  - `ensure-labels` — idempotently create the three labels (`--force`).
  - `sync <version> <body-file>` — if an open PR for `BRANCH` exists, `gh pr edit` title/body; else `gh pr create` (base `main`, label `upgrade-pending`). Prints the PR number.
  - `set-state <pending|green|blocked>` — add that `upgrade-*` label, remove the other two.
  - `comment <body-file>` — comment on the open PR.

- [ ] **Step 1: Write the failing test**

`scripts/downstream-upgrade/tests/test_pr_sync.sh`. Stub `gh` logs argv; `pr list` returns `$PR_LIST_OUTPUT`:

```bash
#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/bin"
cat > "$tmp/bin/gh" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$tmp/gh-calls.log"
if [ "\$1 \$2" = "pr list" ]; then printf '%s' "\$PR_LIST_OUTPUT"; fi
EOF
chmod +x "$tmp/bin/gh"

run() { GH_BIN="$tmp/bin/gh" REPO=acme/app BRANCH=fiestaui-upgrade "$SCRIPTS/pr-sync.sh" "$@"; }
echo "release notes" > "$tmp/body.md"

# No open PR → create.
: > "$tmp/gh-calls.log"
PR_LIST_OUTPUT="" run sync 0.4.0 "$tmp/body.md"
assert_file_contains "$tmp/gh-calls.log" "pr create" "creates when none open"
assert_file_contains "$tmp/gh-calls.log" "upgrade-pending" "initial label applied"
assert_file_contains "$tmp/gh-calls.log" "chore(deps): upgrade @fiestaboard/ui to v0.4.0" "title has version"

# Open PR #7 → edit, not create.
: > "$tmp/gh-calls.log"
PR_LIST_OUTPUT="7" run sync 0.5.0 "$tmp/body.md"
assert_file_contains "$tmp/gh-calls.log" "pr edit 7" "edits existing PR"
if grep -q "pr create" "$tmp/gh-calls.log"; then fail "must not create when PR open"; fi

# set-state green swaps labels.
: > "$tmp/gh-calls.log"
PR_LIST_OUTPUT="7" run set-state green
assert_file_contains "$tmp/gh-calls.log" "--add-label upgrade-green" "adds green"
assert_file_contains "$tmp/gh-calls.log" "--remove-label upgrade-pending" "removes pending"
assert_file_contains "$tmp/gh-calls.log" "--remove-label upgrade-blocked" "removes blocked"

# ensure-labels creates all three idempotently.
: > "$tmp/gh-calls.log"
run ensure-labels
for l in upgrade-pending upgrade-green upgrade-blocked; do
  assert_file_contains "$tmp/gh-calls.log" "$l" "label $l ensured"
done
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement `pr-sync.sh`**

```bash
#!/usr/bin/env bash
# Manage the single evergreen upgrade PR on the downstream repo.
# Auth: expects GH_TOKEN (or GITHUB_TOKEN) in the environment — in the
# workflow this is the CLAUDE_BOT_APP installation token.
#
# Usage:
#   pr-sync.sh ensure-labels
#   pr-sync.sh sync <version> <body-file>
#   pr-sync.sh set-state <pending|green|blocked>
#   pr-sync.sh comment <body-file>
set -euo pipefail

REPO="${REPO:-Fiestaboard/FiestaBoard}"
BRANCH="${BRANCH:-fiestaui-upgrade}"
GH_BIN="${GH_BIN:-gh}"

open_pr() {
  "$GH_BIN" pr list -R "$REPO" --head "$BRANCH" --state open \
    --json number --jq '.[0].number // empty'
}

case "${1:?usage: pr-sync.sh <ensure-labels|sync|set-state|comment>}" in
  ensure-labels)
    "$GH_BIN" label create upgrade-pending -R "$REPO" --force \
      --color FBCA04 --description "FiestaUI upgrade: validation in progress"
    "$GH_BIN" label create upgrade-green -R "$REPO" --force \
      --color 0E8A16 --description "FiestaUI upgrade: CI confirmed green, good to merge"
    "$GH_BIN" label create upgrade-blocked -R "$REPO" --force \
      --color D93F0B --description "FiestaUI upgrade: needs a human"
    ;;
  sync)
    VERSION="${2:?sync <version> <body-file>}"
    BODY_FILE="${3:?sync <version> <body-file>}"
    TITLE="chore(deps): upgrade @fiestaboard/ui to v$VERSION"
    pr=$(open_pr)
    if [ -n "$pr" ]; then
      "$GH_BIN" pr edit "$pr" -R "$REPO" --title "$TITLE" --body-file "$BODY_FILE"
    else
      "$GH_BIN" pr create -R "$REPO" --head "$BRANCH" --base main \
        --title "$TITLE" --body-file "$BODY_FILE" --label upgrade-pending
      pr=$(open_pr)
    fi
    echo "$pr"
    ;;
  set-state)
    STATE="${2:?set-state <pending|green|blocked>}"
    pr=$(open_pr)
    [ -n "$pr" ] || { echo "no open PR for $BRANCH" >&2; exit 1; }
    add="upgrade-$STATE"
    remove=()
    for l in upgrade-pending upgrade-green upgrade-blocked; do
      [ "$l" = "$add" ] || remove+=(--remove-label "$l")
    done
    "$GH_BIN" pr edit "$pr" -R "$REPO" --add-label "$add" "${remove[@]}"
    ;;
  comment)
    BODY_FILE="${2:?comment <body-file>}"
    pr=$(open_pr)
    [ -n "$pr" ] || { echo "no open PR for $BRANCH" >&2; exit 1; }
    "$GH_BIN" pr comment "$pr" -R "$REPO" --body-file "$BODY_FILE"
    ;;
  *)
    echo "unknown subcommand: $1" >&2; exit 1
    ;;
esac
```

Note: the stub `gh` in tests doesn't implement `--jq`, so `open_pr` output in tests is whatever the stub prints for `pr list` — the test sets `PR_LIST_OUTPUT` to the bare number, matching. Removing labels that aren't on the PR: `gh pr edit --remove-label` on an absent label is a no-op server-side; acceptable.

- [ ] **Step 4: Run tests to verify pass**; shellcheck clean; `chmod +x`.
- [ ] **Step 5: Commit** — `feat: evergreen PR sync script`

---

### Task 5: `downstream-upgrade.yml` workflow

**Files:**
- Create: `.github/workflows/downstream-upgrade.yml`

**Interfaces:**
- Consumes: all four scripts + prompt template.
- Produces: reusable workflow with `workflow_call` input `version` (required string) and `workflow_dispatch` inputs `version` (optional) + `dry_run` (boolean, default false). Secrets used: `CLAUDE_BOT_APP_ID`, `CLAUDE_BOT_APP_PRIVATE_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` (via `secrets: inherit` from the caller).

- [ ] **Step 1: Write the workflow**

```yaml
name: Downstream Upgrade

# Keeps ONE evergreen upgrade PR open on Fiestaboard/FiestaBoard pinning
# @fiestaboard/ui to the newest FiestaUI release. Mechanical bump first;
# Claude (Opus) TDD-fixes breakage only when validation fails; FiestaBoard
# CI is polled and must be green before the PR is labeled upgrade-green.
# See docs/superpowers/specs/2026-08-01-downstream-upgrade-design.md.

on:
  workflow_call:
    inputs:
      version:
        description: "Released FiestaUI version (X.Y.Z, no leading v)"
        required: true
        type: string
  workflow_dispatch:
    inputs:
      version:
        description: "FiestaUI version to upgrade to (defaults to latest release)"
        required: false
        type: string
      dry_run:
        description: "Compute the bump and validate locally, but do not push, PR, or run Claude"
        required: false
        type: boolean
        default: false

# Newest release wins; an in-flight run for an older version is cancelled.
concurrency:
  group: downstream-upgrade
  cancel-in-progress: true

permissions:
  contents: read
  packages: read

env:
  TARGET_REPO: Fiestaboard/FiestaBoard
  UPGRADE_BRANCH: fiestaui-upgrade
  MAINTAINER: jeffredodd
  MAX_ATTEMPTS: "3"
  FIESTAUI_DIR: ${{ github.workspace }}/fiestaui
  FIESTABOARD_DIR: ${{ github.workspace }}/fiestaboard
  LOG_FILE: ${{ github.workspace }}/validate.log
  ATTEMPTS_FILE: ${{ github.workspace }}/du-attempts

jobs:
  upgrade:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - name: Checkout FiestaUI
        uses: actions/checkout@v7
        with:
          path: fiestaui
          fetch-depth: 0 # need tags for the vPrev..vNew diff

      - name: Resolve versions and release notes
        id: meta
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          cd "$FIESTAUI_DIR"
          VERSION="${{ inputs.version }}"
          if [ -z "$VERSION" ]; then
            VERSION=$(gh release view --json tagName --jq '.tagName' | sed 's/^v//')
          fi
          git rev-parse "v$VERSION" >/dev/null # fail fast on unknown version
          PREV=$(git tag --sort=-v:refname | grep -x -A1 "v$VERSION" | tail -1 | sed 's/^v//')
          [ "$PREV" != "$VERSION" ] || PREV=""
          gh release view "v$VERSION" --json body --jq '.body' > "$GITHUB_WORKSPACE/release-notes.md" || true
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "prev=$PREV" >> "$GITHUB_OUTPUT"
          echo "Upgrading FiestaBoard to v$VERSION (previous: v${PREV:-none})"

      - name: Mint FiestaBoard App token
        id: app-token
        uses: actions/create-github-app-token@v3
        with:
          app-id: ${{ secrets.CLAUDE_BOT_APP_ID }}
          private-key: ${{ secrets.CLAUDE_BOT_APP_PRIVATE_KEY }}
          owner: Fiestaboard
          repositories: FiestaBoard

      - name: Checkout FiestaBoard
        uses: actions/checkout@v7
        with:
          repository: Fiestaboard/FiestaBoard
          token: ${{ steps.app-token.outputs.token }}
          path: fiestaboard
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: "24"
          registry-url: "https://npm.pkg.github.com"
          scope: "@fiestaboard"

      # Baseline: if FiestaBoard main is already red, the upgrade isn't to
      # blame — mark blocked (when a PR exists) and stop before spending
      # Claude tokens.
      - name: Baseline check on FiestaBoard main
        id: baseline
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          (cd "$FIESTABOARD_DIR/web" && npm ci --no-audit)
          if "$FIESTAUI_DIR/scripts/downstream-upgrade/bump.sh" --help 2>/dev/null; then :; fi
          if "$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh" "$FIESTABOARD_DIR" "$LOG_FILE"; then
            echo "ok=true" >> "$GITHUB_OUTPUT"
          else
            echo "ok=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Reset evergreen branch and bump
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd "$FIESTABOARD_DIR"
          git config user.name "fiestaui-automation[bot]"
          git config user.email "fiestaui-automation[bot]@users.noreply.github.com"
          git checkout -B "$UPGRADE_BRANCH" origin/main
          "$FIESTAUI_DIR/scripts/downstream-upgrade/bump.sh" . "${{ steps.meta.outputs.version }}"
          git add web/package.json web/package-lock.json
          git commit -m "chore(deps): bump @fiestaboard/ui to v${{ steps.meta.outputs.version }}"

      - name: Dry run — show diff and stop
        if: inputs.dry_run == true
        run: |
          cd "$FIESTABOARD_DIR"
          git show --stat HEAD
          git diff origin/main..HEAD -- web/package.json
          echo "Baseline ok: ${{ steps.baseline.outputs.ok }}"
          echo "DRY RUN: skipping push, PR sync, validation loop."

      - name: Push branch and sync PR
        if: inputs.dry_run != true
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          REPO: ${{ env.TARGET_REPO }}
          BRANCH: ${{ env.UPGRADE_BRANCH }}
        run: |
          cd "$FIESTABOARD_DIR"
          git push --force-with-lease=... --force origin "$UPGRADE_BRANCH"
          "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" ensure-labels
          {
            echo "Automated upgrade of \`@fiestaboard/ui\` to **v${{ steps.meta.outputs.version }}**."
            echo
            echo "## FiestaUI release notes"
            cat "$GITHUB_WORKSPACE/release-notes.md" 2>/dev/null || echo "_none_"
            echo
            echo "_Maintained by FiestaUI's Downstream Upgrade workflow; this PR always tracks the newest release._"
          } > "$GITHUB_WORKSPACE/pr-body.md"
          "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" sync \
            "${{ steps.meta.outputs.version }}" "$GITHUB_WORKSPACE/pr-body.md"
          "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" set-state pending

      - name: Handle red baseline
        if: inputs.dry_run != true && steps.baseline.outputs.ok == 'false'
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          REPO: ${{ env.TARGET_REPO }}
          BRANCH: ${{ env.UPGRADE_BRANCH }}
        run: |
          {
            echo "@$MAINTAINER FiestaBoard \`main\` fails typecheck/tests **before** the"
            echo "v${{ steps.meta.outputs.version }} bump — baseline failure, not an upgrade issue."
            echo "The upgrade PR was still updated, but no fixes were attempted."
            echo
            echo '```'
            tail -c 4000 "$LOG_FILE"
            echo '```'
          } > "$GITHUB_WORKSPACE/comment.md"
          "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" comment "$GITHUB_WORKSPACE/comment.md"
          "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" set-state blocked
          echo "::warning::FiestaBoard baseline is red; marked upgrade-blocked."

      - name: Validate bump, fix with Claude if needed
        id: fix
        if: inputs.dry_run != true && steps.baseline.outputs.ok == 'true'
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          PREV_VERSION: ${{ steps.meta.outputs.prev }}
          NEW_VERSION: ${{ steps.meta.outputs.version }}
        run: |
          npm install -g @anthropic-ai/claude-code
          : > "$LOG_FILE"
          if "$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh" "$FIESTABOARD_DIR" "$LOG_FILE"; then
            echo "clean upgrade — no Claude needed"
            echo "green=true" >> "$GITHUB_OUTPUT"
          elif "$FIESTAUI_DIR/scripts/downstream-upgrade/fix-loop.sh"; then
            echo "green=true" >> "$GITHUB_OUTPUT"
          else
            echo "green=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Push fixes and confirm FiestaBoard CI
        id: ci
        if: inputs.dry_run != true && steps.baseline.outputs.ok == 'true'
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          REPO: ${{ env.TARGET_REPO }}
          BRANCH: ${{ env.UPGRADE_BRANCH }}
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PREV_VERSION: ${{ steps.meta.outputs.prev }}
          NEW_VERSION: ${{ steps.meta.outputs.version }}
        run: |
          cd "$FIESTABOARD_DIR"
          git push --force origin "$UPGRADE_BRANCH"
          pr=$("$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" sync \
            "$NEW_VERSION" "$GITHUB_WORKSPACE/pr-body.md")
          result=pending
          while true; do
            sleep 60 # give CI time to register checks on the new SHA
            if gh pr checks "$pr" -R "$TARGET_REPO" --watch --fail-fast; then
              result=green; break
            fi
            attempts=$(cat "$ATTEMPTS_FILE" 2>/dev/null || echo 0)
            if [ "${{ steps.fix.outputs.green }}" = "false" ] || [ "$attempts" -ge "$MAX_ATTEMPTS" ]; then
              result=blocked; break
            fi
            # Pull failing logs for Claude, then try one more bounded round.
            : > "$LOG_FILE"
            run_id=$(gh run list -R "$TARGET_REPO" --branch "$UPGRADE_BRANCH" \
              --status failure --limit 1 --json databaseId --jq '.[0].databaseId // empty')
            [ -n "$run_id" ] && gh run view "$run_id" -R "$TARGET_REPO" --log-failed \
              | tail -c 20000 >> "$LOG_FILE" || echo "no CI logs available" >> "$LOG_FILE"
            if ! "$FIESTAUI_DIR/scripts/downstream-upgrade/fix-loop.sh"; then
              result=blocked; break
            fi
            git push --force origin "$UPGRADE_BRANCH"
          done
          echo "result=$result" >> "$GITHUB_OUTPUT"

      - name: Final PR state
        if: inputs.dry_run != true && steps.baseline.outputs.ok == 'true'
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          REPO: ${{ env.TARGET_REPO }}
          BRANCH: ${{ env.UPGRADE_BRANCH }}
        run: |
          cd "$FIESTABOARD_DIR"
          if [ "${{ steps.ci.outputs.result }}" = "green" ]; then
            {
              echo "✅ FiestaBoard CI is green for **v${{ steps.meta.outputs.version }}**."
              fixes=$(git log origin/main..HEAD --oneline --grep='\[fiestaui-upgrade\]' || true)
              if [ -n "$fixes" ]; then
                echo; echo "Claude applied fixes:"; echo '```'; echo "$fixes"; echo '```'
              else
                echo; echo "Clean upgrade — no code changes were needed."
              fi
            } > "$GITHUB_WORKSPACE/comment.md"
            "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" comment "$GITHUB_WORKSPACE/comment.md"
            "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" set-state green
          else
            {
              echo "@$MAINTAINER automated fixes for v${{ steps.meta.outputs.version }} did not"
              echo "reach green (attempts exhausted). Last failure output:"
              echo '```'
              tail -c 4000 "$LOG_FILE"
              echo '```'
            } > "$GITHUB_WORKSPACE/comment.md"
            "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" comment "$GITHUB_WORKSPACE/comment.md"
            "$FIESTAUI_DIR/scripts/downstream-upgrade/pr-sync.sh" set-state blocked
            echo "::warning::Upgrade blocked; maintainer pinged. Workflow exits 0 (release itself succeeded)."
          fi
```

Fix before committing: the `Push branch and sync PR` step contains a placeholder-ish `git push --force-with-lease=... --force` line — use plain `git push --force origin "$UPGRADE_BRANCH"` (the branch is automation-owned; force is the evergreen reset semantics). Remove the stray `bump.sh --help` line in the baseline step (leftover guard, serves no purpose).

- [ ] **Step 2: Validate** — run `actionlint` on the file (download pinned binary to scratchpad if not installed: `bash <(curl -sSf https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)`), fix all findings. Re-run script tests.
- [ ] **Step 3: Commit** — `feat: downstream-upgrade workflow (evergreen PR + Claude fix loop)`

---

### Task 6: Wire into `release.yml` + CI checks for the automation itself

**Files:**
- Modify: `.github/workflows/release.yml` (job `release`, currently lines 34-78)
- Modify: `.github/workflows/ci.yml` (add job; extend `ci-success.needs`, currently line 106)

**Interfaces:**
- Consumes: `downstream-upgrade.yml` (`workflow_call`), `steps.version.outputs.version` already emitted in `release.yml`.

- [ ] **Step 1: Expose the version as a job output in `release.yml`**

In the `release` job header add:

```yaml
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      version: ${{ steps.version.outputs.version }}
```

- [ ] **Step 2: Append the downstream job at the end of `release.yml`**

```yaml
  # After a successful publish, keep the evergreen upgrade PR on
  # Fiestaboard/FiestaBoard pointed at this release.
  downstream-upgrade:
    needs: release
    uses: ./.github/workflows/downstream-upgrade.yml
    with:
      version: ${{ needs.release.outputs.version }}
    secrets: inherit
```

- [ ] **Step 3: Add the automation job to `ci.yml`** (after the `build` job):

```yaml
  automation:
    name: Automation scripts & workflows
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7

      - name: Shellcheck upgrade scripts
        run: shellcheck scripts/downstream-upgrade/*.sh scripts/downstream-upgrade/tests/*.sh

      - name: Run script tests
        run: bash scripts/downstream-upgrade/tests/run.sh

      - name: actionlint
        run: |
          bash <(curl -sSf https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)
          ./actionlint -color
```

- [ ] **Step 4: Extend `ci-success`** — change `needs: [lint, build, a11y-tests]` to `needs: [lint, build, a11y-tests, automation]`.
- [ ] **Step 5: Validate** — `actionlint` clean on all three workflows; script tests still pass.
- [ ] **Step 6: Commit** — `feat: wire downstream upgrade into release + CI checks`

---

### Task 7: Docs + secrets verification

**Files:**
- Modify: `README.md` (add a "Downstream upgrade automation" section near existing release docs)

**Interfaces:** none new.

- [ ] **Step 1: README section** (adapt placement to the existing README structure):

```markdown
## Downstream upgrade automation

Every release triggers `.github/workflows/downstream-upgrade.yml`, which keeps
a single evergreen PR open on `Fiestaboard/FiestaBoard` (branch
`fiestaui-upgrade`) pinning `@fiestaboard/ui` to the newest version. If the
bump breaks FiestaBoard, Claude (Opus) TDD-fixes it (max 3 attempts) and
FiestaBoard CI must pass before the PR is labeled `upgrade-green`;
otherwise it's labeled `upgrade-blocked` and the maintainer is pinged.
A human on FiestaBoard always does the merge.

Manual run / backfill: Actions → "Downstream Upgrade" → Run workflow
(optionally set `version`; `dry_run` computes the bump without pushing).

Required repo secrets: `CLAUDE_BOT_APP_ID`, `CLAUDE_BOT_APP_PRIVATE_KEY`
(GitHub App with write access to FiestaBoard), `CLAUDE_CODE_OAUTH_TOKEN`.
Design: `docs/superpowers/specs/2026-08-01-downstream-upgrade-design.md`.
```

- [ ] **Step 2: Verify secrets exist** — `gh secret list -R Fiestaboard/FiestaUI`. If any of the three are missing, report to the user exactly which (values can't be copied from FiestaBoard; they must set them, e.g. `gh secret set CLAUDE_BOT_APP_ID -R Fiestaboard/FiestaUI`). Missing secrets do NOT block merging this PR — the workflow simply can't run live until they're set.
- [ ] **Step 3: Commit** — `docs: downstream upgrade automation`

---

### Task 8: Ship — push, PR on FiestaUI, live dry-run

- [ ] **Step 1:** Full local check: `bash scripts/downstream-upgrade/tests/run.sh`, `shellcheck scripts/downstream-upgrade/*.sh scripts/downstream-upgrade/tests/*.sh`, actionlint on all workflows.
- [ ] **Step 2:** Push `feat/downstream-upgrade`; open a PR to FiestaUI `main` titled `feat: downstream upgrade automation (evergreen FiestaBoard PR + Claude fix loop)`, body summarizing design + link to the spec, ending with the standard generated-with footer.
- [ ] **Step 3:** Attempt a live dry run against the branch: `gh workflow run downstream-upgrade.yml --ref feat/downstream-upgrade -f dry_run=true`. If GitHub refuses because the workflow isn't on the default branch yet, note in the PR body that the first dry-run happens post-merge (`-f dry_run=true`), then manual dispatch against the current release to validate PR create + update paths.
- [ ] **Step 4:** Report results to the user: PR link, dry-run outcome, any missing secrets.

## Self-Review Notes

- Spec coverage: trigger (Task 6), evergreen mechanics (Tasks 1, 4, 5), validate/fix loop + caps (Tasks 2, 3, 5), labels/comments (Tasks 4, 5), baseline guard (Task 5), dry_run + actionlint + live validation (Tasks 5, 6, 8), docs/secrets (Task 7). No gaps found.
- Known intentional deviations from spec text: secret is `CLAUDE_CODE_OAUTH_TOKEN` (org convention) rather than `ANTHROPIC_API_KEY`; "Job 1/Job 2" are steps of one job (spec itself says "same workflow", and one job shares the checkouts).
- Type consistency: env var names (`FIESTAUI_DIR`, `FIESTABOARD_DIR`, `LOG_FILE`, `ATTEMPTS_FILE`, `MAX_ATTEMPTS`, `PREV_VERSION`, `NEW_VERSION`, `REPO`, `BRANCH`, `GH_BIN`, `CLAUDE_BIN`) match across Tasks 3-5.
