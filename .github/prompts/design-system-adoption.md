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
- `gh issue create -R {{UI_REPO}} --label component-request --title "Component request: <Name>" --body <...>`
  where the body lists the FiestaBoard usage sites (file:line), what the
  pattern does, and a suggested prop API.

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
