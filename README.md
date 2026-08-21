# FiestaUI

FiestaUI is the [FiestaBoard](https://github.com/Fiestaboard/FiestaBoard) design system: React components built on [Base UI](https://base-ui.com) with Tailwind v4 design tokens, published as [`@fiestaboard/ui`](https://www.npmjs.com/package/@fiestaboard/ui).

**Component catalog:** the Storybook is deployed to GitHub Pages on every push to `main`.

## Installation

```bash
npm install @fiestaboard/ui
```

No token, no `.npmrc`, no registry configuration — the package is public on
[registry.npmjs.org](https://www.npmjs.com/package/@fiestaboard/ui) and installs anonymously,
in CI and Docker builds as much as locally.

> Before 1.6.3 this package lived on the GitHub Packages npm registry, which requires
> authentication for every read even when the package is public. If you still have a
> `@fiestaboard:registry=https://npm.pkg.github.com` line in an `.npmrc` anywhere, delete it —
> it will pin you to the old registry and to versions no longer published there.

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
- `fonts.css` is the **opt-in** font registration (`@fontsource-variable/archivo` + `@fontsource-variable/spline-sans-mono` `@font-face` rules, ~70 KB fetched for a Latin-only page). Import it alongside `theme.css` unless your app supplies the faces itself — e.g. via `next/font`, a CDN, or a self-hosted subset. If you self-host, skip `fonts.css` and register faces named `"Archivo Variable"` / `"Spline Sans Mono Variable"` (the names `theme.css`'s `--font-sans-stack` / `--font-mono-stack` tokens reference); without either, the tokens degrade gracefully to the system font stack.
- The `@source` line is **mandatory** — Tailwind v4 does not scan `node_modules` by default, and without it component styles silently vanish. Adjust the relative path to wherever your CSS file lives.
- Dark mode is class-based: toggle the `dark` class on `<html>`. FiestaUI only defines the variant; your app owns the toggle.

### Typeface

The sans face is **Archivo** as of 5.0.0, replacing Geist. Archivo is drawn from American grotesque signage — the same world the split-flap hardware lives in — and carries a `wdth` 62–125 axis, so headings can run expanded into departure-board territory while UI text stays at normal width, from one family.

`fonts.css` registers the **weight-only** Archivo file (`wght` 100–900, ~34 KB Latin). The width axis lives in the larger `@fontsource-variable/archivo/wdth.css` entrypoint (~88 KB Latin) and is not imported, because nothing in this package sets `font-stretch` yet. Swap the import when expanded display type ships — the family name is identical, so no token or consumer change is needed.

The token names `--font-sans-stack` / `--font-mono-stack` name the **role**, not the vendor. The former `--font-geist-sans` / `--font-geist-mono` names are aliased to them for one minor and will be removed in the next major; nothing in this package references the old names.

Archivo's vertical metrics are meaningfully tighter than Geist's — a 1.089em natural line box against Geist's 1.30em — so text set without an explicit `line-height` renders more compactly. Tailwind's `text-*` utilities set line-height, so most surfaces are unaffected; `heading.stories.tsx` documents where the difference does bite.

The mono face is **Spline Sans Mono**, also as of 5.0.0. It is not a code-editor setting: every split-flap glyph the product draws is `font-mono font-semibold` (`board-display.tsx`, `static-board-display.tsx`), and the template editor that previews the board follows the same token. It was picked on the two metrics that govern a fixed character cell read from a distance — cap height 72.7% of em against Geist Mono's 71.0%, at the same 60.0% glyph advance. Its weight range is 300–700; the only weights paired with `font-mono` in this package are 500 and 600, so no weight synthesizes.

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
npm test                 # unit tests (Vitest + jsdom), single run
npm run test:watch       # the same suite, watching
npm run build-storybook && npm run test-storybook   # axe a11y sweep (needs the static build served on :6006)
```

### Unit tests

Vitest + Testing Library on jsdom, configured in `vitest.config.ts` (deliberately a separate file from the library build's `vite.config.ts`) with globals bootstrapped in `src/test/setup.ts`.

Tests are **colocated**: the test for `src/components/forms/button.tsx` is `src/components/forms/button.test.tsx`. Only `src/**/*.test.{ts,tsx}` is collected — the harness suites under `scripts/` keep their own runners (`npm run perf:test`, `npm run release:test`).

**Tailwind does not run in jsdom.** No stylesheet is loaded, so class strings are inert and `getComputedStyle` reports UA defaults for every component in this package; an assertion on a colour or a size there passes for the wrong reason. Assert on what jsdom actually models — roles, accessible names, ARIA state, focus, keyboard, events and `data-*` props. Appearance is covered twice already, by VRT (`docs/VISUAL_REGRESSION.md`) and by the Storybook a11y sweep, both of which run a real browser.

Three files are maintained as exemplars of the house pattern; copy the nearest one:

| Exemplar                                    | Pattern it models                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `src/components/chrome/breadcrumb.test.tsx` | presentational — landmark, list semantics, `aria-current`, `asChild`    |
| `src/components/forms/button.test.tsx`      | interactive — `userEvent`, keyboard activation, busy/disabled semantics |
| `src/components/forms/toggle.test.tsx`      | ARIA state and selection — `aria-pressed`, roving tabindex, arrow keys  |

### Visual parity rule

This package was extracted from FiestaBoard's `web/src/components/ui` with a pixel-parity guarantee. Token values in `src/styles/theme.css` and component class strings are contract, not implementation detail — changes to them are visible in every consumer. Change intentionally and version accordingly (patch: fixes, minor: additive components/variants, major: breaking API or visual changes).

### Testing against a local consumer

Don't point FiestaBoard's Docker build at an unpublished version. For local iteration:

```bash
npm run build && npm pack   # produces fiestaboard-ui-<version>.tgz
# in the consumer: npm install /path/to/fiestaboard-ui-<version>.tgz
```

## Releasing

Releases are continuous: every merge to `main` that changes shipped code bumps the version, tags `v<version>`, publishes to [registry.npmjs.org](https://www.npmjs.com/package/@fiestaboard/ui), and creates a GitHub Release. `scripts/release/gate.mjs` decides whether a merge earns a release and how big a bump; CI-only changes (workflows, `scripts/ci`, VRT baselines) mint nothing. **Actions → Release → Run workflow** remains the manual override.

Publishing uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). The workflow's `id-token: write` permission mints a short-lived credential that npm exchanges for publish rights, so there is no npm token anywhere — nothing to store, leak, or rotate. Provenance is attested from the OIDC claims, linking each tarball to the workflow run that built it.

This requires a **trusted publisher configured on the npmjs package** — repository `Fiestaboard/FiestaUI`, workflow `release.yml`. Without it the publish step fails outright; it does not fall back to a token.

### Publishing by hand

`npm run release:npmjs` builds and publishes from a local checkout. It exists as an escape hatch for when the workflow is broken — normal releases should go through CI.

```bash
npm login                            # once — web-based, completes 2FA in the browser
npm run release:npmjs -- --dry-run   # inspect the tarball contents first
npm run release:npmjs                # publish; completes 2FA interactively
```

The account's 2FA mode is `auth-and-writes` (check with `npm profile get`), so the publish needs a second factor. **Do not pass `--otp`** unless you have a TOTP authenticator app — with a passkey or hardware security key there is no code to type. With `auth-type=web` (npm's default) the CLI prints a `https://www.npmjs.com/login/<uuid>` URL; open it, satisfy the passkey, and the publish continues.

The script rebuilds first because `files` ships only `dist` and there is no `prepack` hook, so a stale `dist/` would otherwise publish silently-wrong contents — unrecoverable, since npm forbids republishing a version. Publish from an up-to-date `main`: the version comes from `package.json`, so a stale checkout would point npmjs's `latest` tag at a superseded release.

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
