# Fix {{DOWNSTREAM_NAME}} breakage from the @fiestaboard/ui v{{NEW_VERSION}} upgrade

You are running inside FiestaUI's downstream-upgrade automation
(attempt {{ATTEMPT}} of {{MAX_ATTEMPTS}}). The {{DOWNSTREAM_NAME}} checkout at
`{{DOWNSTREAM_DIR}}` was bumped from `@fiestaboard/ui` v{{PREV_VERSION}} to
v{{NEW_VERSION}} on branch `fiestaui-upgrade`, and its validation now fails.

The failing output is in `{{LOG_FILE}}` — read it first.

FiestaUI's full source for the new version is at `{{FIESTAUI_DIR}}`. To see
exactly what changed in the design system, run:

    git -C {{FIESTAUI_DIR}} diff v{{PREV_VERSION}}..v{{NEW_VERSION}} -- src

Check the release notes for a `!`-marked breaking change before assuming an
API is gone: a major bump may only move files inside `dist/`, in which case
imports from the package root are unaffected and the real breakage is
elsewhere.

## Rules

1. Work ONLY inside `{{DOWNSTREAM_DIR}}` (the npm app lives at `{{APP_DIR}}`).
   Never edit FiestaUI source, and never change other dependencies or pin
   `@fiestaboard/ui` back.
2. Follow TDD where the repo has tests: for each breakage, first write or
   adjust a test that captures the NEW expected behavior (it should fail),
   then fix the call sites to FiestaUI's new API, then re-run. If this
   consumer has no unit suite, the build/typecheck IS the test — make it
   fail for the right reason before you fix it.
3. No papering over: no `as any`, no `@ts-ignore`/`@ts-expect-error`, no
   `.skip`, no deleting assertions to get green, no loosening lint or
   formatting config to dodge a failure.
4. Validate with: `cd {{DOWNSTREAM_DIR}}/{{APP_DIR}} && {{VALIDATE_HINT}}`
5. Commit to the current branch in small commits, each message prefixed
   `[fiestaui-upgrade] `. Do NOT push — the automation pushes.

When validation passes locally, stop and print a short summary of what you
changed and why.
