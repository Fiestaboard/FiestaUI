# FiestaUI

FiestaUI is the [FiestaBoard](https://github.com/Fiestaboard/FiestaBoard) design system: React components built on [Base UI](https://base-ui.com) with Tailwind v4 design tokens, published as [`@fiestaboard/ui`](https://www.npmjs.com/package/@fiestaboard/ui).

**Component catalog:** the Storybook is deployed to GitHub Pages on every push to `main`.

## Installation

```bash
npm install @fiestaboard/ui
```

Peer dependencies: `react` / `react-dom` ^19, `lucide-react`, and `tailwindcss` ^4 in the consuming app.

## Styling contract

FiestaUI ships **no compiled utility CSS**. The consuming app runs Tailwind v4 and generates utilities for the class strings inside this package. In your Tailwind entry CSS:

```css
@import "tailwindcss";
@import "@fiestaboard/ui/theme.css";
@source "../node_modules/@fiestaboard/ui/dist";
```

- `theme.css` carries the design tokens (`@theme inline`, `:root` / `.dark` custom properties), the base layer, the component animation keyframes, the Geist font-face registrations, and the `dark` custom variant.
- The `@source` line is **mandatory** — Tailwind v4 does not scan `node_modules` by default, and without it component styles silently vanish. Adjust the relative path to wherever your CSS file lives.
- Dark mode is class-based: toggle the `dark` class on `<html>`. FiestaUI only defines the variant; your app owns the toggle.

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

Publishing authenticates via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (GitHub Actions OIDC) — no long-lived tokens, nothing to rotate, automatic provenance. Bootstrap history: trusted publishing can't create a brand-new package, and bypass-2FA tokens are [deprecated](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/), so the very first (placeholder) version was published manually with a 2FA OTP; every release since comes from the workflow via OIDC.

## License

MIT
