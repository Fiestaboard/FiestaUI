# FiestaUI

FiestaUI is the [FiestaBoard](https://github.com/Fiestaboard/FiestaBoard) design system: React components built on [Base UI](https://base-ui.com) with Tailwind v4 design tokens, published as [`@fiestaboard/ui`](https://www.npmjs.com/package/@fiestaboard/ui).

**Component catalog:** the Storybook is deployed to GitHub Pages on every push to `main`.

## Installation

The package is published to the **GitHub Packages npm registry** (not npmjs.com — yet). GitHub Packages requires authentication to install, even for public packages, so consumers need a one-time setup:

1. Create a [personal access token](https://github.com/settings/tokens) with the `read:packages` scope.
2. Configure npm (in `~/.npmrc`, NOT committed to any repo):

   ```ini
   @fiestaboard:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN
   ```

3. Install:

   ```bash
   npm install @fiestaboard/ui
   ```

In GitHub Actions, use the workflow's `GITHUB_TOKEN` (with `packages: read`) as `NODE_AUTH_TOKEN` via `actions/setup-node`'s `registry-url`/`scope` options instead of a PAT.

Peer dependencies: `react` / `react-dom` ^19, `lucide-react`, and `tailwindcss` ^4 in the consuming app.

## Styling contract

FiestaUI ships **no compiled utility CSS**. The consuming app runs Tailwind v4 and generates utilities for the class strings inside this package. In your Tailwind entry CSS:

```css
@import "tailwindcss";
@import "@fiestaboard/ui/fonts.css";
@import "@fiestaboard/ui/theme.css";
@source "../node_modules/@fiestaboard/ui/dist";
```

- `theme.css` carries the design tokens (`@theme inline`, `:root` / `.dark` custom properties), the base layer, the component animation keyframes, and the `dark` custom variant.
- `fonts.css` is the **opt-in** Geist font registration (`@fontsource-variable/geist` + `@fontsource-variable/geist-mono` `@font-face` rules, ~52 KB fetched for a Latin-only page). Import it alongside `theme.css` unless your app supplies Geist itself — e.g. via `next/font`, a CDN, or a self-hosted subset. If you self-host, skip `fonts.css` and register faces named `"Geist Variable"` / `"Geist Mono Variable"` (the names `theme.css`'s `--font-geist-sans` / `--font-geist-mono` tokens reference); without either, the tokens degrade gracefully to the system font stack.
- The `@source` line is **mandatory** — Tailwind v4 does not scan `node_modules` by default, and without it component styles silently vanish. Adjust the relative path to wherever your CSS file lives.
- Dark mode is class-based: toggle the `dark` class on `<html>`. FiestaUI only defines the variant; your app owns the toggle.

### Seasonal theming

`theme.css` inlines only the **live** season (Pride) — it activates automatically when the app shell stamps `.pride-month` on `<html>`. The other seasons are design drafts and are shipped as **opt-in** stylesheets rather than bundled into every consumer, so you only pay for the ones you use:

```css
@import "@fiestaboard/ui/seasons/christmas.css";
```

Import the file for a season only once you've promoted it (moved its entry into `SEASONS` and taught the app shell to stamp its `htmlClass`). All drafts are previewable in Storybook's **Season** toolbar without any consumer setup.

> **Migration (breaking):** the draft season data (`DRAFT_SEASONS`, `ALL_SEASONS`) is no longer exported from `"@fiestaboard/ui"` — it's Storybook-only data and now tree-shakes out of production bundles. If you previewed drafts, import them from the subpath instead: `import { ALL_SEASONS } from "@fiestaboard/ui/lib/seasons-drafts"`. The live-season API (`SEASONS`, `getActiveSeason`, `useActiveSeason`, …) is unchanged.

## Usage

```tsx
import { Button, Card, CardContent, cn } from "@fiestaboard/ui";

export function Example() {
  return (
    <Card>
      <CardContent className={cn("flex gap-2 p-4")}>
        <Button variant="brand">Save</Button>
        <Button variant="outline">Cancel</Button>
      </CardContent>
    </Card>
  );
}
```

## Development

```bash
npm install
npm run storybook        # component workbench on :6006
npm run build            # dist/ — ESM + d.ts + theme.css
npm run lint && npm run typecheck && npm run format:check
npm run build-storybook && npm run test-storybook   # axe a11y sweep (needs the static build served on :6006)
```

### Visual parity rule

This package was extracted from FiestaBoard's `web/src/components/ui` with a pixel-parity guarantee. Token values in `src/styles/theme.css` and component class strings are contract, not implementation detail — changes to them are visible in every consumer. Change intentionally and version accordingly (patch: fixes, minor: additive components/variants, major: breaking API or visual changes).

### Testing against a local consumer

Don't point FiestaBoard's Docker build at an unpublished version. For local iteration:

```bash
npm run build && npm pack   # produces fiestaboard-ui-<version>.tgz
# in the consumer: npm install /path/to/fiestaboard-ui-<version>.tgz
```

## Releasing

Releases are manual: **Actions → Release → Run workflow**, choosing a `patch` / `minor` / `major` bump. The workflow bumps the version, tags `v<version>`, publishes to npm, and creates a GitHub Release.

Publishing authenticates with the workflow's built-in `GITHUB_TOKEN` (`packages: write`) — no npm account, no long-lived secrets, nothing to rotate.

If the package later moves to registry.npmjs.org (which would allow anonymous installs), switch the release workflow to [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC); note that npm's [bypass-2FA token deprecation](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) means the first npmjs publish must be done manually, satisfying 2FA interactively (see below).

### Bootstrapping the npmjs publish

`npm run release:npmjs` performs that manual first publish. It is a local, human-run
command by design: Trusted Publishing can only be configured on a package that already
exists on npmjs, and the 2FA challenge cannot come from CI.

```bash
npm login                            # once — web-based, completes 2FA in the browser
npm run release:npmjs -- --dry-run   # inspect the tarball contents first
npm run release:npmjs                # publish; completes 2FA interactively
```

The account's 2FA mode is `auth-and-writes` (check with `npm profile get`), so the
publish itself needs a second factor. **Do not pass `--otp`** unless you have a TOTP
authenticator app — with a passkey or hardware security key there is no code to type.
With `auth-type=web` (npm's default) the CLI instead prints a
`https://www.npmjs.com/login/<uuid>` URL; open it, satisfy the passkey, and the publish
continues. `--otp=<code>` remains valid only for authenticator-app users.

The script rebuilds before publishing (`files` ships only `dist`, and there is no
`prepack` hook, so a stale `dist/` would otherwise publish silently-wrong contents) and
passes `--access public` because scoped packages default to `restricted`. The
`--registry` flag overrides `publishConfig.registry`, so this leaves the GitHub Packages
release workflow untouched — both registries serve the same version until the migration
completes.

Publish from an up-to-date `main`. The version comes from `package.json`, so a stale
checkout would point npmjs's `latest` tag at a superseded release.

## Downstream upgrade automation

Every release triggers `.github/workflows/downstream-upgrade.yml`, which keeps
a single evergreen PR open on `Fiestaboard/FiestaBoard` (branch
`fiestaui-upgrade`) pinning `@fiestaboard/ui` to the newest version. If the
bump breaks FiestaBoard, Claude (Opus) TDD-fixes it (max 3 attempts) and
FiestaBoard CI must pass before the PR is labeled `upgrade-green`; otherwise
it's labeled `upgrade-blocked` and the maintainer is pinged. A human on
FiestaBoard always does the merge.

Manual run / backfill: **Actions → Downstream Upgrade → Run workflow**
(optionally set `version`; `dry_run` computes the bump without pushing).

Required repo secrets: `CLAUDE_BOT_APP_ID`, `CLAUDE_BOT_APP_PRIVATE_KEY`
(GitHub App with write access to FiestaBoard), `CLAUDE_CODE_OAUTH_TOKEN`.
Design: `docs/superpowers/specs/2026-08-01-downstream-upgrade-design.md`.

## License

MIT
