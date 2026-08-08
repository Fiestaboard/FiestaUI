import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
  core: {
    // CI runs build-storybook ahead of VRT and bench; the outbound telemetry
    // call is pure overhead and a hang risk on restricted runners.
    disableTelemetry: true,
  },
  typescript: {
    // react-docgen-typescript spins up a full TS program on every build (the
    // well-known multi-minute build-storybook penalty, paid by CI's VRT/a11y
    // builds and the bench). The fast AST-based react-docgen still populates
    // the Controls panel and autodocs prop tables; it only forgoes the richer
    // TS-type resolution, which nothing in CI reads.
    reactDocgen: "react-docgen",
  },
};

export default config;
