import { create } from "storybook/theming/create";

import { FIESTA_ICON_DATA_URI } from "../src/components/chrome/fiesta-icon";

export default create({
  base: "dark",
  brandTitle: "FiestaUI",
  brandUrl: "https://github.com/Fiestaboard/FiestaUI",
  brandImage: FIESTA_ICON_DATA_URI,
  brandTarget: "_self",

  // UI
  appBg: "#0a0a0a",
  appContentBg: "#1a1a1a",
  appBorderColor: "#2a2a2a",
  appBorderRadius: 8,

  // Typography — the same self-hosted Geist the design system ships
  // (theme.css --font-geist-sans / --font-geist-mono), so the Storybook
  // shell wears the brand it showcases.
  fontBase: '"Geist Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontCode: '"Geist Mono Variable", ui-monospace, SFMono-Regular, "SF Mono", Monaco, Menlo, monospace',

  // Text colors
  textColor: "#f0f0f0",
  textInverseColor: "#0a0a0a",

  // Toolbar default and active colors
  barTextColor: "#9ca3af",
  barSelectedColor: "#f0f0f0",
  barBg: "#0a0a0a",

  // Form colors
  inputBg: "#1a1a1a",
  inputBorder: "#2a2a2a",
  inputTextColor: "#f0f0f0",
  inputBorderRadius: 6,
});
