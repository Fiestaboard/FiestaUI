# Releasing

`@fiestaboard/ui` releases through [Changesets](https://github.com/changesets/changesets). There are two channels:

| Branch  | npm dist-tag | Versions        | Install                       |
| ------- | ------------ | --------------- | ----------------------------- |
| `main`  | `latest`     | `8.17.0`        | `npm i @fiestaboard/ui`       |
| `alpha` | `alpha`      | `9.0.0-alpha.3` | `npm i @fiestaboard/ui@alpha` |

## Day to day

1. **In your PR, add a changeset.** Run `npx changeset`, pick `patch` / `minor` / `major`, and write one user-facing line. That line goes into `CHANGELOG.md` and the GitHub Release. Commit the `.changeset/*.md` file it writes.
   - If the change releases nothing, run `npx changeset --empty` or add the **`no-changeset`** label.
   - CI's **Release guards** job fails a PR that changes shipped code (anything that ends up in the tarball) without a changeset. Tests, docs, CI and release infrastructure don't need one.
2. **Merge as usual.** Nothing publishes yet. The Release workflow opens or updates one **"chore: release"** PR (branch `changeset-release/main`), which consumes every pending changeset, bumps `package.json` and writes the changelog.
3. **When you want a release, merge the "chore: release" PR.** The Release workflow publishes to npm (Trusted Publishing, with provenance), pushes the `vX.Y.Z` tag, creates the GitHub Release, and dispatches the downstream upgrade.

Many merges therefore share one npm build, and the Version PR's diff shows exactly what will ship.

### Re-running a failed publish

Re-run the Release workflow, or use **Actions → Release → Run workflow** on the branch. `changeset publish` skips any version npm already has, so a re-run is safe.

One caveat: while the only pending changesets are empty ones, the action logs "All changesets are empty" and runs neither version nor publish. Retry a failed publish before merging an empty-changeset PR, or wait for the next Version PR.

## The alpha channel

`alpha` is a long-lived branch in Changesets **pre mode**: `.changeset/pre.json` has `"mode": "pre", "tag": "alpha"`. PRs into `alpha` follow the same day-to-day flow. Its Version PR is titled "chore: release (alpha)" and publishes `X.Y.Z-alpha.N` to the `alpha` dist-tag. Alpha releases don't trigger the downstream upgrade.

Guards (`scripts/release/pre-mode.mjs`):

- A PR into `main` fails if it would bring `pre.json` in pre mode. Exit mode is allowed, because that's the promotion.
- A PR into `alpha` fails if `pre.json` is missing or has a tag other than `alpha`.
- The Release workflow on `alpha` fails without alpha pre mode, and skips versioning and publishing in exit mode, so `alpha` never publishes a stable version.

### Lifecycle

1. **Create.** From `main`, right after a release:

   ```bash
   git switch -c alpha origin/main
   npx changeset pre enter alpha
   git commit -am "chore(release): enter alpha prerelease mode"
   git push -u origin alpha
   ```

2. **Sync `main` into `alpha`** with a merge commit (not a squash), and only right after a `main` release, when `main` has no pending `.changeset/*.md`. Otherwise a stable changeset is consumed on both branches and appears in both changelogs. If `package.json`'s version conflicts mid-cycle, keep alpha's. Sync PRs from `main` are exempt from the changeset check.

3. **Promote to stable.**
   1. Open a PR into `alpha` that runs `npx changeset pre exit`, and merge it. Close alpha's open "chore: release (alpha)" PR; the Release workflow now skips on `alpha`.
   2. Open a PR from `alpha` into `main`. Its `pre.json` is in exit mode, which `main` accepts.
   3. `main`'s next Version PR computes the stable version (say `9.0.0`), writes the changelog and deletes `pre.json`. Merge it to publish to `latest`.

4. **Restart alpha.** Delete `alpha` and recreate it from `main` (step 1). **Never merge `main` back into the old `alpha`.** `main` squash-merges, so the old branch keeps `.changeset/pre/` and its stale prerelease state, and its next alpha would re-release old changesets at a version below the new stable one.

## Repository settings this depends on

- **npm trusted publisher** on `@fiestaboard/ui`: repository `Fiestaboard/FiestaUI`, workflow **`release.yml`**. Renaming the workflow breaks publishing. `NPM_TOKEN` remains as a fallback that npm uses only if the OIDC exchange fails.
- **Claude bot app** (`CLAUDE_BOT_APP_ID` / `CLAUDE_BOT_APP_PRIVATE_KEY`) opens the Version PRs and pushes tags. A PR opened with `GITHUB_TOKEN` would have its CI gated in `action_required`.
- **Rulesets.** `main-protection` and `PR policy` target `main` only (merge queue, squash). `alpha` has its own ruleset: PR plus the required `CI Success` check, no merge queue, merge commits allowed (for syncs), and deletion allowed (for restarts).
- **Visual regression** runs on PRs into `alpha` against alpha's own baseline, which every push to `alpha` publishes. Seed it once after creating or restarting `alpha`, and reseed it if `alpha` has been quiet for about 10 days (artifacts expire after 14): `gh workflow run ci.yml --ref alpha`. See [VISUAL_REGRESSION.md](VISUAL_REGRESSION.md#the-alpha-channel).

## Publishing by hand

This is an escape hatch for when the workflow is broken. Normal releases go through CI.

```bash
npm login                                   # once — web-based, completes 2FA in the browser
npm run build && npm publish --dry-run      # inspect the tarball contents first
npm run release                             # build + changeset publish for package.json's version
git push origin --tags                      # changeset publish tags locally; push the tag
```

The account's 2FA mode is `auth-and-writes` (check with `npm profile get`), so the publish needs a second factor. **Do not pass `--otp`** unless you have a TOTP authenticator app; with a passkey or hardware security key there is no code to type. With `auth-type=web` (npm's default), the CLI prints a `https://www.npmjs.com/login/<uuid>` URL. Open it, satisfy the passkey, and the publish continues.
