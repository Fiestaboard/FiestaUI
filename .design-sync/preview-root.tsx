import { useLayoutEffect } from "react";

// Preview wrapper for claude.ai/design.
//
// FiestaUI has no <ThemeProvider>: its theme is a *class on the document root*
// (`.dark`) plus Tailwind v4 design tokens, and `.storybook/preview` defaults
// every story to the dark theme. The design-sync converter could not bundle
// that decorator (its `storybook.css` import pulls in .woff2 fonts esbuild's
// decorator build has no loader for), so previews would otherwise render in the
// light default while the reference storybook renders dark — a global mismatch.
//
// This component reproduces exactly what the decorator does for a preview:
//   • add `.dark` to <html> so the `@custom-variant dark (&:is(.dark *))` token
//     overrides resolve to the dark palette for the whole tree, and
//   • paint the app's `bg-background` / `text-foreground` surface with the same
//     p-8 gutter the storybook decorator uses.
// Wired in as `cfg.provider` + `cfg.extraEntries` so it ships on the bundle
// global and every future sync reproduces it deterministically.
export function FiestaPreviewRoot({ children }: { children?: React.ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <div className="bg-background text-foreground p-8">{children}</div>;
}
