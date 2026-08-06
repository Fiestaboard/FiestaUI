# A11y Audit Feedback Loop

The a11y-audit cron (`.github/workflows/claude-a11y-audit.yml`) sweeps
FiestaUI's shipped source once a week looking for accessibility barriers. It
opens ready-for-review PRs for fixes it can prove safe, and files issues for
everything that needs a human's judgement.

Sometimes those fixes are wrong. When that happens, the maintainer closes the
PR.

**Closing an a11y-audit PR without merging is the teaching action.** This folder
is the bot's memory of those teaching moments.

Rejections matter a lot in an accessibility loop, because bad a11y advice is
usually bad in a _generalizable_ way. "Base UI already manages focus here — you
duplicated it and broke it", "that icon is decorative by design", "that ARIA
attribute isn't valid on this role" — none of those retire one finding, they
retire a whole class of them. One well-explained close is worth a lot of future
review time.

## Why this loop exists when axe already runs

This is the first thing to understand about the a11y-audit, and the thing that
keeps it from being noise.

CI's `a11y-tests` job (`.github/workflows/ci.yml`) builds Storybook and runs
`axe-playwright` over **every story in both dark and light themes**, on every
pull request. It is a required check. All 52 components have stories. So the
repo is already clean against the default axe ruleset, by construction.

The audit is therefore explicitly forbidden from re-reporting what axe catches.
Its entire mandate is the space axe cannot reach:

| Blind spot              | Why axe misses it                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard & focus        | axe inspects a static DOM snapshot. It cannot press Tab, so focus order, focus traps, focus restoration, Escape handling, and roving tabindex are unseen. |
| Disabled rules          | `.storybook/test-runner.ts` turns off `page-has-heading-one`, `heading-order`, and `color-contrast-enhanced` (AAA) for CI. Nothing enforces them.         |
| Non-default states      | axe only sees the state a story renders. An unrendered open-dialog or invalid-input state has never been inspected.                                       |
| Motion preference in JS | `prefers-reduced-motion` is honored in CSS only. A `requestAnimationFrame` or `setInterval` loop is invisible to a media query.                           |
| Semantic _quality_      | axe checks a name exists, not that it helps. `aria-label="button"` passes.                                                                                |
| Inert lint config       | `eslint.config.mjs` registers `eslint-plugin-jsx-a11y` but enables zero `jsx-a11y/*` rules.                                                               |

Two of these were live findings when the loop was built: Aurora's free-running
WebGL loop ignoring reduced motion (documented in `vrt/skip.json` as the reason
it can't be screenshot-tested), and the jsx-a11y plugin being loaded but inert.

There is also a divergence worth knowing about: `.storybook/preview.tsx`
**enables** `color-contrast-enhanced` for the interactive addon panel while
`test-runner.ts` **disables** it for CI. A developer browsing Storybook sees AAA
contrast findings the pipeline will never fail on.

## The governing constraints

**Never weaken the referee.** The audit, the triage worker, and the auto-review
are all forbidden from disabling an axe rule, extending the disabled-rules list
in `.storybook/test-runner.ts`, relaxing `.storybook/preview.tsx`, or adding an
`eslint-disable jsx-a11y/*` comment. Making the check stop asking is not making
the library accessible. The auto-review treats any diff that does one of these
as a headline finding.

**Never "fix" by hiding from assistive technology.** `aria-hidden` on a
focusable element, `role="presentation"` on an interactive one, or
`tabIndex={-1}` to silence a checker are all regressions wearing a fix's
clothing.

**Inline fixes must be visually neutral.** Unlike the perf loop, an
accessibility fix legitimately _may_ need to change pixels — raising focus-ring
contrast or enlarging a hit target are real fixes. But `vrt/` baselines are a
required check and reseeding them is a human decision. So anything that moves a
pixel gets filed as an issue describing the visual delta, never applied inline.
Nothing in this loop may edit `vrt/` at all, `vrt/skip.json` least of all.

## Claude runs the real suite

The audit doesn't guess whether its fixes work. Before opening any PR it runs:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
bash .github/a11y-audit/verify-a11y.sh
```

`verify-a11y.sh` builds Storybook, serves it, and runs the axe suite in both
dark and light themes — the same check CI runs, collapsed into one command so
the bot doesn't have to orchestrate a background server across tool calls. All
five must pass or no PR is opened. The workflow pre-installs dependencies and
the Playwright chromium build so the script is the only thing Claude invokes.

You can run it locally the same way.

## How the feedback loop works

1. **`claude-a11y-audit-feedback.yml`** triggers on
   `pull_request_target.closed`. If the PR is unmerged and the head branch
   starts with `a11y-audit/` or `a11y/issue-`, it runs `build_rejection.py` to
   bundle the PR's diff plus every comment, review, and inline comment into a
   single JSON object, appends that object as one line to
   `rejected-edits.jsonl`, and commits the change to `main`.
2. **The audit prompt** reads `rejected-edits.jsonl` at the start of every run.
   The bot is instructed to (a) never re-propose the same `removed → added`
   swap anywhere in the repo, and (b) generalize from the human's close
   comment. The triage worker is pointed at this file too.
3. **Re-running capture** is idempotent. If the maintainer adds an explanatory
   comment after closing, dispatch `claude-a11y-audit-feedback.yml` with the PR
   number and the existing line is replaced rather than duplicated.

## Writing a useful close comment

The bot reads your reasoning, not just your rejection. A close with no comment
teaches it only "not this exact diff." A close with one sentence of _why_
teaches it a rule. Worth the extra ten seconds:

> Closing — Base UI's `Dialog.Popup` already restores focus to the trigger on
> close. Adding our own `onCloseAutoFocus` handler double-moves focus and makes
> it flicker.

## File: `rejected-edits.jsonl`

One JSON object per line. Schema:

| Field             | Type   | Notes                                                                    |
| ----------------- | ------ | ------------------------------------------------------------------------ |
| `pr`              | int    | PR number. Acts as the primary key — re-capture replaces the prior line. |
| `title`           | string | Original PR title.                                                       |
| `head_ref`        | string | `a11y-audit/round-<n>-run-<id>` or `a11y/issue-<N>-<slug>`.              |
| `closed_at`       | string | ISO 8601.                                                                |
| `author`          | string | `github-actions[bot]` for the cron, or whoever pushed.                   |
| `body`            | string | PR description as opened by the bot.                                     |
| `files`           | array  | `[{path, patch}]` — raw unified diff per file.                           |
| `comments`        | array  | Issue-style PR comments: `{author, body, created_at}`.                   |
| `reviews`         | array  | Review-level comments.                                                   |
| `inline_comments` | array  | Per-line review comments.                                                |

## File: `build_rejection.py`

The script the workflow runs. Can be invoked locally with `DRY_RUN=1` to print
the record to stdout without modifying the log:

```bash
DRY_RUN=1 python3 .github/a11y-audit/build_rejection.py 42
```

It refuses to record a merged PR as a rejection.

## Manually clearing a stale rejection

If a rejected change is later determined to have been correct (the close was
wrong, or the codebase has changed and the fix now makes sense), hand-delete
that line from `rejected-edits.jsonl` and commit. The file is plain JSONL; any
text editor can do this.

## Related

- `.github/a11y-audit-state.json` — the sweep's progress (round, files
  remaining, files audited). Deleting `files_remaining` forces a fresh round.
- `.github/workflows/claude-a11y-audit.yml` — the audit cron.
- `.github/workflows/claude-a11y-audit-review.yml` — the a11y auto-review that
  runs on every PR touching `src/`, `.storybook/`, or `eslint.config.mjs`.
- `.github/workflows/claude-issue-triage.yml` — the shared worker that turns an
  `a11y-audit` issue into a focused fix PR.
- `.github/perf-audit/README.md` — the sibling perf loop. Same shape, different
  constraint: perf fixes must be pixel-identical, a11y fixes may not be.
