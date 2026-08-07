import prettierConfig from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const REACT_VERSION = "19";

// Mirrors FiestaBoard's web/eslint.config.mjs minus the app-specific rule
// blocks (i18next literal-string checks, HA-Ingress URL guards) — a design
// system has no user-facing copy of its own and no app routing.
const eslintConfig = [
  {
    // .design-sync/ holds claude.ai/design sync artifacts (owned previews use a
    // virtual `@ds-stories` alias and aren't part of the package build), so they
    // aren't linted as repo source.
    ignores: ["node_modules/**", "dist/**", "storybook-static/**", ".design-sync/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      react: { version: REACT_VERSION },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "smart"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    files: ["**/*.stories.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // scripts/ holds CLI tools whose job is to write to stdout — the CI
    // classifier and release gate emit `key=value` lines for $GITHUB_OUTPUT.
    // Routing that through console.error would put it in the log instead of
    // the output file, which is the opposite of what the workflows need.
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
  prettierConfig,
];

export default eslintConfig;
