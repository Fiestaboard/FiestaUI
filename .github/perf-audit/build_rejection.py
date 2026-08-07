#!/usr/bin/env python3
"""Capture why a perf finding was rejected.

Run as:
    build_rejection.py <pr_number>          # a PR closed without merging
    build_rejection.py --issue <number>     # an issue closed as "not planned"

Two loops feed two logs, because they produce two different kinds of output:

  * The perf-audit sweep and the triage worker open PRs. A closed-unmerged PR
    means "this change was wrong", and the record keeps the diff so the next
    run can avoid re-proposing the same swap. -> rejected-edits.jsonl
  * The perf-explore loop only ever files issues. It has no PR to close, so
    without issue capture it would have no rejection signal at all and would
    refile the same wrong conclusion every time its theme came round again.
    -> rejected-findings.jsonl

Only issues closed as NOT PLANNED count. An issue closed as completed was
fixed, not rejected, and recording it would teach the loop to stop reporting
things that turned out to be real.

Idempotent: a re-run for the same PR or issue replaces that record's existing
line rather than appending a duplicate. This lets the GitHub Action be
triggered manually (workflow_dispatch) after a maintainer has added a later
explanatory comment without polluting the log.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

LOG_PATH = Path(".github/perf-audit/rejected-edits.jsonl")
FINDINGS_LOG_PATH = Path(".github/perf-audit/rejected-findings.jsonl")


def gh_json(*args: str):
    out = subprocess.check_output(["gh", *args], text=True)
    return json.loads(out)


def gh_text(*args: str) -> str:
    return subprocess.check_output(["gh", *args], text=True)


def parse_diff(diff: str) -> list[dict]:
    """Split a unified diff into per-file `{path, patch}` records."""
    files: list[dict] = []
    current: dict | None = None
    for line in diff.splitlines():
        if line.startswith("diff --git "):
            if current is not None:
                current["patch"] = "\n".join(current["patch"])
                files.append(current)
            path = line.split(" b/", 1)[-1] if " b/" in line else line
            current = {"path": path, "patch": [line]}
        elif current is not None:
            current["patch"].append(line)
    if current is not None:
        current["patch"] = "\n".join(current["patch"])
        files.append(current)
    return files


def build_record(pr: str) -> dict:
    meta = gh_json(
        "pr", "view", pr,
        "--json", "number,title,headRefName,closedAt,author,body,state",
    )
    if meta.get("state") == "MERGED":
        raise SystemExit(f"PR #{pr} was merged — refusing to record as rejection.")

    diff = gh_text("pr", "diff", pr)
    files = parse_diff(diff)

    repo = repo_name()

    issue_comments = gh_json(
        "api", f"repos/{repo}/issues/{pr}/comments",
        "--jq", "[.[] | {author: .user.login, body: .body, created_at: .created_at}]",
    )
    reviews = gh_json(
        "api", f"repos/{repo}/pulls/{pr}/reviews",
        "--jq",
        '[.[] | select((.body // "") != "") | '
        '{author: .user.login, body: .body, state: .state, submitted_at: .submitted_at}]',
    )
    inline = gh_json(
        "api", f"repos/{repo}/pulls/{pr}/comments",
        "--jq",
        "[.[] | {author: .user.login, body: .body, path: .path, "
        "created_at: .created_at, diff_hunk: .diff_hunk}]",
    )

    return {
        "pr": meta["number"],
        "title": meta["title"],
        "head_ref": meta["headRefName"],
        "closed_at": meta["closedAt"],
        "author": (meta.get("author") or {}).get("login"),
        "body": meta.get("body") or "",
        "comments": issue_comments,
        "reviews": reviews,
        "inline_comments": inline,
        "files": files,
    }


def repo_name() -> str:
    return subprocess.check_output(
        ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
        text=True,
    ).strip()


def build_issue_record(number: str) -> dict:
    """Capture an issue a maintainer closed as 'not planned'."""
    meta = gh_json(
        "issue", "view", number,
        "--json", "number,title,closedAt,author,body,state,stateReason,labels",
    )
    if meta.get("state") != "CLOSED":
        raise SystemExit(f"Issue #{number} is not closed — nothing to record.")

    # `gh` reports this as NOT_PLANNED; the REST API uses lowercase.
    reason = (meta.get("stateReason") or "").upper()
    if reason != "NOT_PLANNED":
        raise SystemExit(
            f"Issue #{number} was closed as {reason or 'COMPLETED'} — that is a fix, not a rejection."
        )

    comments = gh_json(
        "api", f"repos/{repo_name()}/issues/{number}/comments",
        "--jq", "[.[] | {author: .user.login, body: .body, created_at: .created_at}]",
    )

    return {
        "issue": meta["number"],
        "title": meta["title"],
        "closed_at": meta["closedAt"],
        "state_reason": "not_planned",
        "author": (meta.get("author") or {}).get("login"),
        "labels": [label["name"] for label in meta.get("labels") or []],
        "body": meta.get("body") or "",
        "comments": comments,
    }


def write_log(record: dict, path: Path = LOG_PATH, key: str = "pr") -> None:
    """Replace any prior line for this record; append the new one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    existing: list[str] = []
    if path.exists():
        existing = [ln for ln in path.read_text().splitlines() if ln.strip()]

    def keep(line: str) -> bool:
        try:
            return json.loads(line).get(key) != record[key]
        except json.JSONDecodeError:
            return True  # preserve hand-edited lines

    kept = [ln for ln in existing if keep(ln)]
    kept.append(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
    path.write_text("\n".join(kept) + "\n")


def main() -> None:
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--issue":
        record = build_issue_record(args[1])
        path, key, label = FINDINGS_LOG_PATH, "issue", f"issue #{record['issue']}"
    elif len(args) == 1 and not args[0].startswith("-"):
        record = build_record(args[0])
        path, key, label = LOG_PATH, "pr", f"PR #{record['pr']}"
    else:
        sys.exit("usage: build_rejection.py <pr_number> | build_rejection.py --issue <number>")

    if os.environ.get("DRY_RUN") == "1":
        print(json.dumps(record, ensure_ascii=False, indent=2))
        return
    write_log(record, path, key)
    print(f"Captured {label} into {path}")


if __name__ == "__main__":
    main()
