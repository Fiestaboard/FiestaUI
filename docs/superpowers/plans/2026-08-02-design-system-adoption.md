# Design-System Adoption Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every FiestaUI release, the downstream-upgrade workflow also swaps FiestaBoard's hand-rolled UI onto `@fiestaboard/ui` (best-effort, never blocking the upgrade) and files FiestaUI issues for missing components.

**Architecture:** A new `adopt.sh` script (same shape as `fix-loop.sh`) runs headless Claude from the FiestaBoard checkout with a new prompt template; it lands `[fiestaui-adoption]`-prefixed commits on the existing `fiestaui-upgrade` branch between local validation and the push/CI-confirm step. The CI loop gains a "drop adoption commits first" recovery rule; the final PR comment gains an adoption summary section.

**Tech Stack:** Bash (shellcheck-clean), GitHub Actions, `gh`, headless Claude Code (Opus), offline stub-based script tests under `scripts/downstream-upgrade/tests/`.

**Spec:** `docs/superpowers/specs/2026-08-02-design-system-adoption-design.md`

## Global Constraints

- Adoption is best-effort: `adopt.sh` always exits 0; adoption can never set `upgrade-blocked`.
- One component per commit; commit messages (including reverts) prefixed `[fiestaui-adoption] `.
- Rollback target: the SHA recorded before Claude runs (`pre_sha`).
- Issue label on FiestaUI: `component-request`.
- Prompt placeholders use `{{NAME}}` and `sed` substitution exactly like `fix-loop.sh`.
- All work on branch `feat/design-system-adoption` (already exists, carries the spec commit).
- Scripts follow existing conventions: env-driven config with `VAR="${VAR:-default}"`, `set -uo pipefail`, testable via injected `CLAUDE_BIN`/`GH_BIN`/`VALIDATE_CMD`.

---

### Task 1: Adoption prompt template

**Files:**

- Create: `.github/prompts/design-system-adoption.md`

**Interfaces:**

- Produces: the template consumed by `adopt.sh` (Task 2) with placeholders `{{FIESTAUI_DIR}}`, `{{FIESTABOARD_DIR}}`, `{{LOG_FILE}}`, `{{SUMMARY_FILE}}`, `{{NEW_VERSION}}`, `{{UI_REPO}}` — no others.

- [ ] **Step 1: Write the template**

```markdown
# Converge FiestaBoard onto the @fiestaboard/ui design system (v{{NEW_VERSION}})

You are running inside FiestaUI's downstream-upgrade automation, after a
successful bump of `@fiestaboard/ui` to v{{NEW_VERSION}} on branch
`fiestaui-upgrade` of the FiestaBoard checkout at `{{FIESTABOARD_DIR}}`.
Typecheck and tests are currently green. Your job is design-system
adoption: find FiestaBoard code that re-implements what the kit already
provides and swap it onto the kit.

The kit's real API is `{{FIESTAUI_DIR}}/src/index.ts` — trust only what is
exported there; component sources are in `{{FIESTAUI_DIR}}/src/components/`.

## What to look for (in `{{FIESTABOARD_DIR}}/web`)

1. Hand-rolled components that duplicate a kit export (a local
   Button/Checkbox/Dialog/etc.).
2. Raw styled elements (`<button>`, `<input>`, `<select>`, ad-hoc cards or
   page chrome built from divs) that an existing kit component covers.
3. Repeated patterns the kit does NOT cover → file a FiestaUI issue (see
   below). Never build kit-like components inside FiestaBoard.

## Swap rules

1. Swap only when confident: the kit component reproduces the same behavior
   and visual role using its EXISTING props. If it would need new props or
   kit changes, it is an issue candidate, not a swap.
2. One component per commit: swap every usage, delete newly-dead local code
   (component file, styles, stories), then validate:
   `cd {{FIESTABOARD_DIR}}/web && npm run typecheck && npm run test:run`
3. Commit message: `[fiestaui-adoption] use <KitComponent> for <what it replaced>`.
4. If a swap goes red and the fix isn't obvious, revert it
   (`git revert --no-edit <sha>`, then amend the message so it starts with
   `[fiestaui-adoption] revert:`) and record it as reverted. Do not leave
   the tree red between commits.
5. No `as any`, no `@ts-ignore`/`@ts-expect-error`, no `.skip`, no deleted
   assertions. Never edit anything under `{{FIESTAUI_DIR}}`. Never push.
   Never touch dependencies or `package.json`.
6. Update FiestaBoard tests that referenced swapped internals to target the
   same user-visible behavior through the kit component.

## Issues for missing components

- Check open requests first:
  `gh issue list -R {{UI_REPO}} --label component-request --state open`
- Only for patterns used 2+ times in FiestaBoard. One issue per pattern;
  skip anything an open issue already covers.
- `gh issue create -R {{UI_REPO}} --label component-request
--title "Component request: <Name>" --body <...>` where the body lists
  the FiestaBoard usage sites (file:line), what the pattern does, and a
  suggested prop API.

## Summary file (required — write it even if you did nothing)

Write `{{SUMMARY_FILE}}` as markdown:

    ### Design-system adoption

    - Swapped: `<KitComponent>` ← `web/<path>` (one line per component)
    - Reverted: `<KitComponent>` — <why> (omit section if none)
    - Skipped (low confidence): `<candidate>` — <why> (omit if none)
    - Issues filed: <#N title> (omit if none)

If you found no candidates at all, write the header plus
"No swap candidates found this run."

When validation is green and the summary is written, stop.
```

- [ ] **Step 2: Commit**

```bash
git add .github/prompts/design-system-adoption.md
git commit -m "feat: adoption prompt template for design-system swaps"
```

---

### Task 2: `adopt.sh` with offline tests (TDD)

**Files:**

- Create: `scripts/downstream-upgrade/adopt.sh`
- Test: `scripts/downstream-upgrade/tests/test_adopt.sh`

**Interfaces:**

- Consumes: `.github/prompts/design-system-adoption.md` (Task 1), `validate.sh` (existing).
- Produces: `adopt.sh` invoked by the workflow (Task 3) with required env `FIESTAUI_DIR`, `FIESTABOARD_DIR`, `LOG_FILE`, `SUMMARY_FILE`, `NEW_VERSION`, `UI_REPO`; optional `CLAUDE_BIN`, `CLAUDE_MODEL`, `PROMPT_FILE`, `VALIDATE_CMD`, `GH_BIN`. Always exits 0; leaves `SUMMARY_FILE` non-empty; on red validation resets the FiestaBoard checkout to the pre-run SHA.

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS/../.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/bin"

# Real git repo standing in for the FiestaBoard checkout.
git init -q "$tmp/fb"
git -C "$tmp/fb" -c user.name=t -c user.email=t@t.t commit -q --allow-empty -m base
pre_sha=$(git -C "$tmp/fb" rev-parse HEAD)

# Fake claude: logs its argv (flattened); optionally commits a swap and/or
# writes the summary, controlled by DO_SWAP / WRITE_SUMMARY.
cat > "$tmp/bin/claude" <<EOF
#!/usr/bin/env bash
printf '%s ' "\$@" | tr '\n' ' ' >> "$tmp/claude-calls.log"
echo >> "$tmp/claude-calls.log"
if [ "\${DO_SWAP:-0}" = 1 ]; then
  echo hi > swapped.txt
  git add swapped.txt
  git -c user.name=t -c user.email=t@t.t commit -q -m '[fiestaui-adoption] use Button for web/foo'
fi
if [ "\${WRITE_SUMMARY:-0}" = 1 ]; then
  printf '### Design-system adoption\n\n- Swapped: Button\n' > "\$SUMMARY_FILE"
fi
EOF
chmod +x "$tmp/bin/claude"

# Fake gh: log invocations, succeed.
cat > "$tmp/bin/gh" <<EOF
#!/usr/bin/env bash
printf '%s ' "\$@" >> "$tmp/gh-calls.log"
echo >> "$tmp/gh-calls.log"
EOF
chmod +x "$tmp/bin/gh"

run_adopt() { # <validate-cmd> [ENV=val ...]
  local validate="$1"; shift
  FIESTAUI_DIR="$REPO_ROOT" FIESTABOARD_DIR="$tmp/fb" \
  LOG_FILE="$tmp/log" SUMMARY_FILE="$tmp/summary.md" \
  NEW_VERSION=1.2.3 UI_REPO=Fiestaboard/FiestaUI \
  CLAUDE_BIN="$tmp/bin/claude" GH_BIN="$tmp/bin/gh" \
  VALIDATE_CMD="$validate" env "$@" "$SCRIPTS/adopt.sh"
}

reset_fixture() {
  git -C "$tmp/fb" reset -q --hard "$pre_sha"
  rm -f "$tmp/summary.md" "$tmp/claude-calls.log" "$tmp/gh-calls.log" "$tmp/log"
}

# 1. Green path: swap kept, summary preserved, label ensured, prompt rendered.
reset_fixture
run_adopt true DO_SWAP=1 WRITE_SUMMARY=1 || fail "green path must exit 0"
[ "$(git -C "$tmp/fb" rev-parse HEAD)" != "$pre_sha" ] || fail "swap commit should be kept"
assert_file_contains "$tmp/summary.md" "Swapped: Button" "claude summary preserved"
assert_file_contains "$tmp/claude-calls.log" "v1.2.3" "version substituted into prompt"
assert_file_contains "$tmp/claude-calls.log" "$tmp/summary.md" "summary path substituted"
assert_file_contains "$tmp/claude-calls.log" "Fiestaboard/FiestaUI" "UI repo substituted"
assert_file_contains "$tmp/claude-calls.log" "--model opus" "opus model requested"
assert_file_contains "$tmp/gh-calls.log" "label create component-request -R Fiestaboard/FiestaUI" "label ensured"

# 2. Red validation: rolled back to pre_sha, summary says so, still exit 0.
reset_fixture
run_adopt false DO_SWAP=1 WRITE_SUMMARY=1 || fail "red path must still exit 0"
assert_eq "$pre_sha" "$(git -C "$tmp/fb" rev-parse HEAD)" "rolled back to pre-adoption SHA"
assert_file_contains "$tmp/summary.md" "rolled back" "summary reports rollback"

# 3. Claude writes nothing: fallback summary is created.
reset_fixture
run_adopt true || fail "no-op path must exit 0"
assert_file_contains "$tmp/summary.md" "No swap candidates found" "fallback summary written"

# 4. gh label failure is tolerated.
reset_fixture
FIESTAUI_DIR="$REPO_ROOT" FIESTABOARD_DIR="$tmp/fb" \
LOG_FILE="$tmp/log" SUMMARY_FILE="$tmp/summary.md" \
NEW_VERSION=1.2.3 UI_REPO=Fiestaboard/FiestaUI \
CLAUDE_BIN="$tmp/bin/claude" GH_BIN=false \
VALIDATE_CMD=true "$SCRIPTS/adopt.sh" || fail "gh failure must not fail adopt.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/downstream-upgrade/tests/test_adopt.sh`
Expected: FAIL (adopt.sh does not exist yet).

- [ ] **Step 3: Write `adopt.sh`**

```bash
#!/usr/bin/env bash
# Best-effort design-system adoption pass. Runs headless Claude from the
# FiestaBoard checkout to swap hand-rolled UI onto @fiestaboard/ui, one
# commit per component ([fiestaui-adoption] prefix), then re-validates.
# A red tree is reset to the pre-adoption SHA. Adoption is opportunistic:
# this script exits 0 no matter what — only the upgrade may block the PR.
# See docs/superpowers/specs/2026-08-02-design-system-adoption-design.md.
#
# Env (required): FIESTAUI_DIR FIESTABOARD_DIR LOG_FILE SUMMARY_FILE
#                 NEW_VERSION UI_REPO
# Env (optional): CLAUDE_BIN CLAUDE_MODEL PROMPT_FILE VALIDATE_CMD GH_BIN
set -uo pipefail

: "${FIESTAUI_DIR:?}" "${FIESTABOARD_DIR:?}" "${LOG_FILE:?}" "${SUMMARY_FILE:?}"
: "${NEW_VERSION:?}" "${UI_REPO:?}"
PROMPT_FILE="${PROMPT_FILE:-$FIESTAUI_DIR/.github/prompts/design-system-adoption.md}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
GH_BIN="${GH_BIN:-gh}"
VALIDATE_CMD="${VALIDATE_CMD:-\"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh\" \"$FIESTABOARD_DIR\" \"$LOG_FILE\"}"

pre_sha=$(git -C "$FIESTABOARD_DIR" rev-parse HEAD)

# The component-request label must exist before Claude files issues.
# Failure is tolerated: issue filing degrades, swaps still run.
"$GH_BIN" label create component-request -R "$UI_REPO" --force \
  --color 5319E7 --description "FiestaBoard needs a component the kit lacks" \
  || echo "warning: could not ensure component-request label on $UI_REPO" >&2

prompt=$(sed -e "s|{{FIESTAUI_DIR}}|$FIESTAUI_DIR|g" \
    -e "s|{{FIESTABOARD_DIR}}|$FIESTABOARD_DIR|g" \
    -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
    -e "s|{{SUMMARY_FILE}}|$SUMMARY_FILE|g" \
    -e "s|{{NEW_VERSION}}|$NEW_VERSION|g" \
    -e "s|{{UI_REPO}}|$UI_REPO|g" \
    "$PROMPT_FILE")

(
  cd "$FIESTABOARD_DIR"
  "$CLAUDE_BIN" -p "$prompt" \
    --model "$CLAUDE_MODEL" \
    --add-dir "$FIESTAUI_DIR" \
    --dangerously-skip-permissions
) || echo "claude exited non-zero during adoption (continuing)" >&2

: > "$LOG_FILE"
if ! bash -c "$VALIDATE_CMD"; then
  echo "adoption left validation red — rolling back to $pre_sha" >&2
  git -C "$FIESTABOARD_DIR" reset --hard "$pre_sha"
  {
    echo "### Design-system adoption"
    echo
    echo "Attempted swaps left validation red; all adoption commits were rolled back."
  } > "$SUMMARY_FILE"
fi

if [ ! -s "$SUMMARY_FILE" ]; then
  {
    echo "### Design-system adoption"
    echo
    echo "No swap candidates found this run."
  } > "$SUMMARY_FILE"
fi

exit 0
```

Then: `chmod +x scripts/downstream-upgrade/adopt.sh`

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash scripts/downstream-upgrade/tests/test_adopt.sh && bash scripts/downstream-upgrade/tests/run.sh`
Expected: no FAIL lines; run.sh prints `PASS: test_adopt.sh` among the others.

- [ ] **Step 5: Shellcheck**

Run: `shellcheck scripts/downstream-upgrade/adopt.sh scripts/downstream-upgrade/tests/test_adopt.sh`
Expected: clean (fix anything it flags; the `trap` disable pattern from helpers.sh is already handled there).

- [ ] **Step 6: Commit**

```bash
git add scripts/downstream-upgrade/adopt.sh scripts/downstream-upgrade/tests/test_adopt.sh
git commit -m "feat: adopt.sh — best-effort design-system adoption pass with rollback"
```

---

### Task 3: Wire adoption into `downstream-upgrade.yml`

**Files:**

- Modify: `.github/workflows/downstream-upgrade.yml`

**Interfaces:**

- Consumes: `adopt.sh` (Task 2) with its documented env contract.
- Produces: workflow behavior relied on by the spec — adoption step between local validation and push/CI-confirm; CI loop drops `[fiestaui-adoption]` commits once before Claude repair; final comment carries the summary.

- [ ] **Step 1: Add the `adopt` input to both triggers**

In the `on:` block, add to `workflow_call.inputs`:

```yaml
adopt:
  description: "Run the design-system adoption pass after a green bump"
  required: false
  type: boolean
  default: true
```

and the same block under `workflow_dispatch.inputs`.

- [ ] **Step 2: Add `issues: write` permission**

```yaml
permissions:
  contents: read
  packages: read
  issues: write # adoption pass files component-request issues on this repo
```

- [ ] **Step 3: Insert the adoption step**

Directly after the "Validate bump, fix with Claude if needed" step and before "Push fixes and confirm FiestaBoard CI":

```yaml
# Best-effort design-system adoption: swap FiestaBoard's hand-rolled
# UI onto @fiestaboard/ui while the tree is green. Never blocks the
# upgrade — adopt.sh always exits 0 and rolls back a red tree. See
# docs/superpowers/specs/2026-08-02-design-system-adoption-design.md.
- name: Adopt design-system components
  if: inputs.dry_run != true && steps.baseline.outputs.ok == 'true' && steps.fix.outputs.green == 'true' && inputs.adopt != false
  env:
    CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # FiestaUI-scoped: issue filing
    NEW_VERSION: ${{ steps.meta.outputs.version }}
    UI_REPO: ${{ github.repository }}
    SUMMARY_FILE: ${{ github.workspace }}/adoption-summary.md
  run: |
    # claude-code was installed globally by the validate/fix step.
    "$FIESTAUI_DIR/scripts/downstream-upgrade/adopt.sh"
```

- [ ] **Step 4: Teach the CI loop to drop adoption commits first**

In the "Push fixes and confirm FiestaBoard CI" step, immediately after the failed `gh pr checks` branch (i.e. right after the `result=green; break` line's `fi`) and before the attempts-exhausted check, insert:

```bash
            # Red CI with adoption commits present: drop the adoption first
            # (cheap, upgrade-protecting) before spending repair attempts.
            # Adoption commits are HEAD-most at this point (no repair
            # commits yet — this branch runs before fix-loop) and
            # contiguous, so resetting below the oldest one is exact.
            if [ ! -f "$GITHUB_WORKSPACE/adoption-dropped" ] && \
               git log --format=%H --grep='\[fiestaui-adoption\]' origin/main..HEAD | grep -q .; then
              first_adopt=$(git log --format=%H --grep='\[fiestaui-adoption\]' origin/main..HEAD | tail -1)
              git reset --hard "${first_adopt}^"
              touch "$GITHUB_WORKSPACE/adoption-dropped"
              {
                echo
                echo "FiestaBoard CI went red with adoption commits present;"
                echo "all adoption commits were dropped and CI re-run."
              } >> "$GITHUB_WORKSPACE/adoption-summary.md"
              git push --force origin "$UPGRADE_BRANCH"
              continue
            fi
```

- [ ] **Step 5: Append the summary to the final PR comment**

In the "Final PR state" step, in **both** the green and blocked branches, after the line that closes comment.md generation (`} > "$GITHUB_WORKSPACE/comment.md"`), insert:

```bash
            if [ -f "$GITHUB_WORKSPACE/adoption-summary.md" ]; then
              { echo; cat "$GITHUB_WORKSPACE/adoption-summary.md"; } >> "$GITHUB_WORKSPACE/comment.md"
            fi
```

- [ ] **Step 6: Sanity-check the workflow file**

Run: `bash scripts/downstream-upgrade/tests/run.sh` (unchanged scripts still pass) and, if available locally, `actionlint .github/workflows/downstream-upgrade.yml`; otherwise rely on CI's actionlint job.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/downstream-upgrade.yml
git commit -m "feat: run design-system adoption pass in downstream-upgrade"
```

---

### Task 4: PR, CI, merge

**Files:** none new (branch `feat/design-system-adoption` with Tasks 1–3 plus the spec commit).

- [ ] **Step 1: Full local verification**

Run: `bash scripts/downstream-upgrade/tests/run.sh && shellcheck scripts/downstream-upgrade/*.sh scripts/downstream-upgrade/tests/*.sh`
Expected: all PASS, shellcheck clean.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/design-system-adoption
gh pr create --base main \
  --title "feat: proactive design-system adoption in downstream-upgrade" \
  --body "Implements docs/superpowers/specs/2026-08-02-design-system-adoption-design.md: after a green bump, a bounded Claude pass swaps FiestaBoard's hand-rolled UI onto @fiestaboard/ui (one commit per component, rollback on red), files component-request issues on FiestaUI for gaps, and reports a summary on the evergreen PR. Adoption can never block the upgrade."
gh pr merge feat/design-system-adoption --auto --squash --delete-branch
```

- [ ] **Step 3: Watch CI (actionlint + script tests run in the `automation` job) until auto-merge lands**

Run: `gh pr checks feat/design-system-adoption --watch` then confirm merged.

---

### Task 5: Live end-to-end validation

- [ ] **Step 1: Dispatch the workflow manually against the current release**

```bash
gh workflow run downstream-upgrade.yml --field adopt=true
gh run list --workflow "Downstream Upgrade" --limit 1
```

- [ ] **Step 2: Watch the run; verify the adoption step executed**

`gh run watch <id>`; then inspect the `Adopt design-system components` step log, the evergreen PR's commits (`[fiestaui-adoption]` prefix), its comment (adoption summary section), and any `component-request` issues filed on FiestaUI.

- [ ] **Step 3: Report results to the maintainer (summary of swaps/issues; flag anything reverted or dropped)**
