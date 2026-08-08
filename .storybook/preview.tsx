import "../src/styles/storybook.css";

import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";

import { ALL_SEASONS, SEASONS } from "../src/lib/seasons";

// Same class-based dark mode contract as the app: the `dark` class on
// <html>. (FiestaBoard's use-theme hook does this at runtime; Storybook
// only needs the class toggled.)
function ThemeSync({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

// Seasonal theming preview: stamps the selected season's htmlClass on
// <html>, exactly like the app shell does in production (June → pride).
function SeasonSync({ seasonId }: { seasonId: string }) {
  useEffect(() => {
    const root = document.documentElement;
    for (const s of ALL_SEASONS) root.classList.toggle(s.htmlClass, s.id === seasonId);
  }, [seasonId]);
  return null;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme for components",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "dark", icon: "moon", title: "Dark" },
          { value: "light", icon: "sun", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
    season: {
      description: "Seasonal theming",
      toolbar: {
        title: "Season",
        icon: "calendar",
        items: [
          { value: "none", title: "None" },
          ...ALL_SEASONS.map((s) => ({
            value: s.id,
            title: SEASONS.includes(s) ? s.label : `${s.label} (draft)`,
          })),
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
    season: "none",
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // a11y is enforced in the test-runner path (.storybook/test-runner.ts,
      // run by the a11y-tests CI job), not in the preview iframe. Without
      // `test: "off"` the addon's default (`test: "todo"`) runs a full axe
      // pass from its `afterEach` on every story render, so the runtime bench
      // (frameP95/longTasks) and VRT would be partly measuring axe rather than
      // the component. Off here keeps the manual addon panel available while
      // taking axe off the render hot path.
      test: "off",
      config: {
        rules: [
          { id: "page-has-heading-one", enabled: false },
          { id: "heading-order", enabled: false },
          { id: "color-contrast-enhanced", enabled: true },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme || "dark") as "light" | "dark";
      const seasonId = (context.globals.season || "none") as string;
      // Fullscreen stories (app chrome) render their own landmarks — a
      // <main> wrapper here would nest/duplicate theirs and fail axe.
      const fullscreen = context.parameters.layout === "fullscreen";
      return (
        <>
          <ThemeSync theme={theme} />
          <SeasonSync seasonId={seasonId} />
          {fullscreen ? (
            <div className="bg-background text-foreground">
              <Story />
            </div>
          ) : (
            <main className="min-h-screen bg-background text-foreground p-8">
              <Story />
            </main>
          )}
        </>
      );
    },
  ],
};

export default preview;
