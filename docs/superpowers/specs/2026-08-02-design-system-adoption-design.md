# Design-System Adoption Automation — Design

**Date:** 2026-08-02
**Status:** Approved
**Prior art:** [2026-08-01-downstream-upgrade-design.md](2026-08-01-downstream-upgrade-design.md)

## Problem

FiestaBoard still contains hand-rolled components and raw styled elements that
duplicate what `@fiestaboard/ui` already provides. Today nothing converges the
app onto the design system; drift only grows. The downstream-upgrade workflow
keeps the *version* fresh but not the *usage*.

## Goal

After every FiestaUI release, proactively find FiestaBoard code that should be
using the design system and swap it, incrementally converging the app. Where
FiestaBoard has a repeated pattern the kit does not cover, file a FiestaUI
issue requesting the component instead of building anything downstream.

## Decisions (owner-confirmed)

- **Trigger:** part of every `downstream-upgrade` run (i.e. after every
  release, plus manual dispatch of that workflow).
- **Delivery:** folded into the evergreen `fiestaui-upgrade` PR — no separate
  adoption PR.
- **Scope:** (a) hand-rolled duplicates of existing kit exports, (b) raw
  styled elements (`<button>`, `<input>`, …) a kit component covers, and
  (c) repeated patterns the kit lacks → open a FiestaUI issue
  (`component-request` label), deduplicated against open issues.
- **Pace:** swap everything the model is confident about each run; no batch
  cap. Confidence bar: the kit component covers the same behavior and visual
  role without needing new props or new kit features.
- **Safety stance:** adoption must never block or degrade the upgrade itself.

## Architecture

One new step in `downstream-upgrade.yml` — **"Adopt design system
components"** — between "Validate bump, fix with Claude if needed" and "Push
fixes and confirm FiestaBoard CI". Gate:
`inputs.dry_run != true && steps.baseline.outputs.ok == 'true' && steps.fix.outputs.green == 'true' && inputs.adopt != false`.

Because adoption commits land on the same `fiestaui-upgrade` branch *before*
the existing push/CI-confirm step, they ride the workflow's existing PR sync,
CI polling, labels, and comment machinery unchanged.

```
bump green ──► adopt.sh (Claude swaps, one commit per component)
                 │ summary file
                 ▼
       push ► pr-sync ► FiestaBoard CI poll ─ red? ─► revert [fiestaui-adoption]
                 │                                     commits, re-push, re-poll
                 ▼                                     (before any Claude repair)
       PR comment: upgrade result + adoption section
```

## Components

### `scripts/downstream-upgrade/adopt.sh` (new)

Same conventions as `fix-loop.sh` (env-driven, shellcheck-clean, testable):

1. Record `PRE_ADOPTION_SHA=$(git rev-parse HEAD)` in the FiestaBoard checkout.
2. Render `.github/prompts/design-system-adoption.md` (same `sed` templating:
   `{{FIESTAUI_DIR}}`, `{{FIESTABOARD_DIR}}`, `{{LOG_FILE}}`,
   `{{SUMMARY_FILE}}`, `{{NEW_VERSION}}`, `{{UI_REPO}}` — the FiestaUI
   `owner/repo` slug used for issue filing).
3. Run headless Claude (`claude -p … --model opus --add-dir "$FIESTAUI_DIR"
   --dangerously-skip-permissions`) from `FIESTABOARD_DIR`. Claude exit code is
   advisory (same as fix-loop).
4. Re-run `validate.sh`. If red: `git reset --hard "$PRE_ADOPTION_SHA"`, note
   the rollback in the summary file, exit 0.
5. Always exit 0 unless the script itself malfunctions — adoption is
   best-effort by design.

Outputs: `SUMMARY_FILE` (markdown fragment for the PR comment listing
swapped / reverted / skipped components and issues filed; created even when
empty), adoption commits on the branch.

### `.github/prompts/design-system-adoption.md` (new)

Instructs Claude to:

1. **Inventory** actual exports from `{{FIESTAUI_DIR}}/src/index.ts` — never
   assume a component exists.
2. **Scan** FiestaBoard app code for (a) local components duplicating a kit
   export, (b) raw styled elements a kit component covers.
3. **Swap** each confident candidate: replace usages with the kit import,
   delete newly-dead local code, `npm run` FiestaBoard's own typecheck/tests
   via `{{FIESTAUI_DIR}}/scripts/downstream-upgrade/validate.sh`; one commit
   per component, message `[fiestaui-adoption] use <KitComponent> for <path>`;
   if validation goes red after a swap, revert that commit and record it as
   reverted. Skip (and record) anything below the confidence bar.
4. **File issues** for repeated non-covered patterns: check
   `gh issue list -R {{UI_REPO}} --label component-request --state open`
   first; create at most one issue per pattern with usage examples and
   suggested API. Never write kit-like components into FiestaBoard.
5. **Summarize** into `{{SUMMARY_FILE}}`: `### Design-system adoption` section
   with swapped/reverted/skipped/issues-filed lists, or "no candidates found".

### `downstream-upgrade.yml` changes

- New dispatch input `adopt` (boolean, default `true`).
- New step invoking `adopt.sh` with `CLAUDE_CODE_OAUTH_TOKEN`,
  `NODE_AUTH_TOKEN`, and `FIESTAUI_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (for
  issue creation on FiestaUI; workflow gains `issues: write`). FiestaBoard
  operations keep the existing app token.
- `adopt.sh` ensures a `component-request` label on the FiestaUI repo before
  running Claude (it holds the FiestaUI-scoped token; failure tolerated).
- The "Push fixes and confirm FiestaBoard CI" loop gains one rule: on CI
  failure, if `git log origin/main..HEAD --grep='\[fiestaui-adoption\]'` is
  non-empty, revert those commits (`git revert --no-edit` newest-first, or
  reset when they are HEAD-most), force-push, and continue polling — **before**
  consuming any Claude repair attempts. One revert pass per run.
- The final PR comment appends the `SUMMARY_FILE` fragment.

## Error handling

| Failure | Behavior |
| --- | --- |
| Claude session dies / times out | adopt.sh validates + resets if needed, exits 0; summary says adoption skipped |
| A swap breaks local validation | Claude (or adopt.sh backstop) reverts it; listed as reverted |
| Swaps pass locally, break FiestaBoard CI | CI loop reverts all adoption commits, re-pushes; upgrade proceeds untouched |
| Issue creation fails (token/labels) | Logged in summary; never fails the step |
| Upgrade itself not green | Adoption step skipped entirely |

Adoption can never set `upgrade-blocked`; only upgrade failures can.

## Testing

- `scripts/downstream-upgrade/tests/`: new cases with a stubbed `claude`
  binary — adoption commits created → kept when validation green; reset to
  `PRE_ADOPTION_SHA` when stub leaves validation red; summary file always
  produced; templating renders all placeholders.
- CI-loop revert logic exercised by a script test (git fixture with adoption
  commits + failing validate stub).
- Existing shellcheck + actionlint jobs cover the new script and workflow.
- First live run: dispatch `downstream-upgrade` manually and review the
  adoption commits in the evergreen PR by hand.

## Non-goals

- No separate adoption PR, no scheduled scan (rides releases only).
- No auto-merge of the evergreen PR; the maintainer still merges it.
- No new-component authoring in FiestaBoard or FiestaUI — gaps become issues.
- No visual-regression harness on the FiestaBoard side (its CI is the gate).

## Cost

One additional bounded Opus session per release run (plus normal CI time on
the evergreen PR).
