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

## File: `build_rejection.py`

The script the workflow runs. Can be invoked locally with `DRY_RUN=1` to print
the record to stdout without modifying the log:

```bash
DRY_RUN=1 python3 .github/perf-audit/build_rejection.py 42
```

It refuses to record a merged PR as a rejection.

## Manually clearing a stale rejection

If a rejected change is later determined to have been correct (the close was
wrong, or the codebase has changed and the fix now makes sense), hand-delete
that line from `rejected-edits.jsonl` and commit. The file is plain JSONL; any
text editor can do this.

## Related

- `.github/perf-audit-state.json` — the sweep's progress (round, files
  remaining, files audited). Deleting `files_remaining` forces a fresh round.
- `.github/workflows/claude-perf-audit.yml` — the audit cron.
- `.github/workflows/claude-perf-audit-review.yml` — the perf auto-review that
  runs on every PR touching `src/`.
- `.github/workflows/claude-issue-triage.yml` — the shared worker that turns a
  `perf-audit` issue into a focused fix PR.
