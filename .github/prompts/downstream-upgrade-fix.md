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
