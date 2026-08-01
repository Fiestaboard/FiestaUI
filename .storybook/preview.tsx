import "../src/styles/storybook.css";

import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";

// Same class-based dark mode contract as the app: the `dark` class on
// <html>. (FiestaBoard's use-theme hook does this at runtime; Storybook
// only needs the class toggled.)
function ThemeSync({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
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
  },
  initialGlobals: {
    theme: "dark",
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
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
      return (
        <>
          <ThemeSync theme={theme} />
          <main className="min-h-screen bg-background text-foreground p-8">
            <Story />
          </main>
        </>
      );
    },
  ],
};

export default preview;
