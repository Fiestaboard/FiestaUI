import { create } from "storybook/theming/create";

import { FIESTA_ICON_SVG } from "../src/components/chrome/fiesta-icon";

// Brand lockup: the taco mark + FiestaBoard wordmark as one SVG data URI
// (with brandImage set, Storybook shows only the image — text next to the
// taco has to live inside it). "Board" is theme-colored, so each manager
// theme gets its own lockup.
function brandLockup(boardColor: string): string {
  const icon = FIESTA_ICON_SVG.replace("<svg ", '<svg width="30" height="30" y="1" ');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="152" height="32" viewBox="0 0 152 32">${icon}` +
    `<text x="38" y="22.5" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="700">` +
    `<tspan fill="#e8a520">Fiesta</tspan><tspan fill="${boardColor}">Board</tspan></text></svg>`;
  return `data:image/svg+xml,${svg.replace(/"/g, "'").replace(/[%#<>]/g, (c) => encodeURIComponent(c))}`;
}

// Brand constants shared by both manager themes. Typography is the same
// self-hosted Geist the design system ships (theme.css --font-geist-sans /
// --font-geist-mono), so the Storybook shell wears the brand it showcases.
const brand = {
  brandTitle: "FiestaUI",
  brandUrl: "https://github.com/Fiestaboard/FiestaUI",
  brandTarget: "_self" as const,
  appBorderRadius: 8,
  inputBorderRadius: 6,
  fontBase: '"Geist Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontCode: '"Geist Mono Variable", ui-monospace, SFMono-Regular, "SF Mono", Monaco, Menlo, monospace',
};

export const fiestaDark = create({
  base: "dark",
  ...brand,
  brandImage: brandLockup("#f0f0f0"),

  // UI
  appBg: "#0a0a0a",
  appContentBg: "#1a1a1a",
  appBorderColor: "#2a2a2a",

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
});

// Light counterpart — same neutral ladder as theme.css's light tokens
// (--background oklch(0.985 0 0) ≈ #fafafa, cards white, ~92% borders).
export const fiestaLight = create({
  base: "light",
  ...brand,
  brandImage: brandLockup("#1a1a1a"),

  // UI
  appBg: "#fafafa",
  appContentBg: "#ffffff",
  appBorderColor: "#e5e5e5",

  // Text colors
  textColor: "#1a1a1a",
  textInverseColor: "#fafafa",

  // Toolbar default and active colors
  barTextColor: "#6b7280",
  barSelectedColor: "#1a1a1a",
  barBg: "#fafafa",

  // Form colors
  inputBg: "#ffffff",
  inputBorder: "#e5e5e5",
  inputTextColor: "#1a1a1a",
});

export default fiestaDark;
