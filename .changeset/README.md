# Changesets

Every PR that changes what ships in `@fiestaboard/ui` adds one file here. Run:

```bash
npx changeset
```

Pick `patch`, `minor` or `major` and write a one-line, user-facing summary. It goes into
`CHANGELOG.md` and the GitHub Release. For a change that should not release anything, run
`npx changeset --empty` or add the `no-changeset` label to the PR.

See [docs/releasing.md](../docs/releasing.md) for how releases and the `alpha` channel work.
