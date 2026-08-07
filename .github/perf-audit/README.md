# Perf Audit Feedback Loop

The perf-audit cron (`.github/workflows/claude-perf-audit.yml`) sweeps
FiestaUI's shipped source once a day looking for rendering cost, memory
retention, and bundle weight. It opens ready-for-review PRs for trivial
mechanical fixes and files issues for everything else.

Sometimes those fixes are wrong. When that happens, the maintainer closes the
PR.

**Closing a perf-audit PR without merging is the teaching action.** This folder
is the bot's memory of those teaching moments.

Rejections matter more in a perf loop than almost anywhere else, because bad
performance advice is usually bad in a _generalizable_ way. "This allocation
was never in a hot path" or "that memo costs more than it saves" doesn't just
retire one finding — it retires a whole class of them. One well-explained close
is worth a lot of future review time.

## The governing constraint

Every fix this loop proposes must leave the rendered output **pixel-identical**.
The visual regression baselines in `vrt/` are the referee, and both the audit
and the triage worker are forbidden from touching them. A change that requires
a baseline update is a design change, not a performance change, and belongs in
a human-authored PR.

### The referee has blind spots

`vrt/skip.json` excludes some stories from visual regression, and those
exclusions are not randomly distributed — they cluster on animated
rAF/WebGL/timer-driven components, because those are the hardest to screenshot
deterministically. Which means the components with the **most** performance
headroom have the **least** visual coverage.

As of this writing the skip list covers `ui-aurora--*` (a free-running WebGL
loop that lands on an arbitrary frame) and two `board-boarddisplay--loading*`
stories (an 80ms `setInterval` cycling glyphs). For those components, a green
`visual-regression` check proves nothing.

All three prompts are told to read `vrt/skip.json` and react to it:

- The **audit** may never put a VRT-skipped component in bucket A, however
  trivial the fix looks. It files an issue instead, flagged for manual visual
  verification.
- The **triage worker** keeps changes to skipped components smaller, and must
  say in the PR body what a human needs to check by hand.
- The **auto-review** calls out any PR touching a skipped component, and treats
  a diff that _adds_ to `vrt/skip.json` as a significant finding — that is a
  change escaping its own guard.

None of them may edit `vrt/skip.json`. Widening the skip list to get a change
past the visual gate would defeat the entire loop.

> Worth noting: Aurora's skip reason is that its rAF loop "does not honor
> prefers-reduced-motion." That is itself a legitimate performance and
> accessibility defect. Fixing it would make the component baseline-able and
> close the coverage hole — the audit is instructed to file it if it isn't
> already tracked.

## How it works

1. **`claude-perf-audit-feedback.yml`** triggers on `pull_request_target.closed`.
   If the PR is unmerged and the head branch starts with `perf-audit/` or
   `perf/issue-`, it runs `build_rejection.py` to bundle the PR's diff plus
   every comment, review, and inline comment into a single JSON object, appends
   that object as one line to `rejected-edits.jsonl`, and commits the change to
   `main`.
2. **The audit prompt** reads `rejected-edits.jsonl` at the start of every run.
   The bot is instructed to (a) never re-propose the same `removed → added`
   swap anywhere in the repo, and (b) generalize from the human's close
   comment. The triage worker is pointed at this file too, before it proposes
   any memoization.
3. **Re-running capture** is idempotent. If the maintainer adds an explanatory
   comment after closing, dispatch `claude-perf-audit-feedback.yml` with the PR
   number and the existing line is replaced rather than duplicated.
4. **Rejected issues** feed a second log. The same workflow triggers on
   `issues.closed`; when the issue carries `perf-explore` and was closed as
   **not planned**, it records the issue body and comments into
   `rejected-findings.jsonl`. This exists because the perf-explore loop only
   files issues and never opens a PR — with PR capture alone it would have no
   rejection signal at all and would refile the same wrong conclusion each time
   its theme came round. Issues closed as **completed** are deliberately not
   recorded: those were fixed, not rejected, and logging them would train the
   loop to stop reporting real problems.

## Writing a useful close comment

The bot reads your reasoning, not just your rejection. A close with no comment
teaches it only "not this exact diff." A close with one sentence of _why_
teaches it a rule. Worth the extra ten seconds:

> Closing — `boardColors` is rebuilt once per mount, not per frame, so hoisting
> it saves nothing and makes the theme override path harder to follow.

## File: `rejected-edits.jsonl`

One JSON object per line. Schema:

| Field             | Type   | Notes                                                                    |
| ----------------- | ------ | ------------------------------------------------------------------------ |
| `pr`              | int    | PR number. Acts as the primary key — re-capture replaces the prior line. |
| `title`           | string | Original PR title.                                                       |
| `head_ref`        | string | `perf-audit/round-<n>-run-<id>` or `perf/issue-<N>-<slug>`.              |
| `closed_at`       | string | ISO 8601.                                                                |
| `author`          | string | `github-actions[bot]` for the cron, or whoever pushed.                   |
| `body`            | string | PR description as opened by the bot.                                     |
| `files`           | array  | `[{path, patch}]` — raw unified diff per file.                           |
| `comments`        | array  | Issue-style PR comments: `{author, body, created_at}`.                   |
| `reviews`         | array  | Review-level comments.                                                   |
| `inline_comments` | array  | Per-line review comments.                                                |

## File: `rejected-findings.jsonl`

One JSON object per line, for issues rejected rather than fixed. Schema:

| Field          | Type   | Notes                                                                |
| -------------- | ------ | -------------------------------------------------------------------- |
| `issue`        | int    | Issue number. Primary key — re-capture replaces the prior line.      |
| `title`        | string | Original issue title.                                                |
| `closed_at`    | string | ISO 8601.                                                            |
| `state_reason` | string | Always `not_planned`; completed issues are never recorded.           |
| `author`       | string | Who filed it — `github-actions[bot]` for the explorer.               |
| `labels`       | array  | Label names at close time.                                           |
| `body`         | string | Issue body as filed by the bot.                                      |
| `comments`     | array  | `{author, body, created_at}` — where the reason for the close lives. |

## File: `build_rejection.py`

The script the workflow runs, in two modes. Can be invoked locally with
`DRY_RUN=1` to print the record to stdout without modifying either log:

```bash
DRY_RUN=1 python3 .github/perf-audit/build_rejection.py 42          # a PR
DRY_RUN=1 python3 .github/perf-audit/build_rejection.py --issue 71  # an issue
```

It refuses to record a merged PR, an open issue, or an issue closed as
completed — none of those are rejections.

## Manually clearing a stale rejection

If a rejected change is later determined to have been correct (the close was
wrong, or the codebase has changed and the fix now makes sense), hand-delete
that line from `rejected-edits.jsonl` and commit. The file is plain JSONL; any
text editor can do this.

## Related

- `.github/perf-audit-state.json` — the sweep's progress (round, files
  remaining, files audited). Deleting `files_remaining` forces a fresh round.
- `.github/perf-explore-state.json` — the thematic loop's backlog. See
  `docs/superpowers/specs/2026-08-07-perf-explore-loop-design.md`.
- `.github/workflows/claude-perf-audit.yml` — the audit cron.
- `.github/workflows/claude-perf-audit-review.yml` — the perf auto-review that
  runs on every PR touching `src/`.
- `.github/workflows/claude-issue-triage.yml` — the shared worker that turns a
  `perf-audit` issue into a focused fix PR.
