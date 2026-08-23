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
    // `.ds-sync/**` and `.worktrees/**` are gitignored, so CI never sees them —
    // but flat config does not read .gitignore, so locally they were linted.
    // That made `npx eslint` emit ~16k errors from generated tooling, which is
    // indistinguishable from "lint is broken here" and is why real errors in
    // src went unnoticed between CI runs. Local lint should match CI's.
    ignores: [
      "node_modules/**",
      "dist/**",
      "storybook-static/**",
      ".design-sync/**",
      ".ds-sync/**",
      "ds-bundle/**",
      ".worktrees/**",
      ".claude/worktrees/**",
    ],
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
      ...jsxA11y.flatConfigs.recommended.rules,
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
    // Radius role scale (theme.css "Radius role scale" table): every component
    // corner picks a documented role — control-inset/control/surface/card/pill
    // — never a raw size. Bare `rounded` is Tailwind's 4px default and sits
    // below the smallest role (control-inset / rounded-sm / 6px); `rounded-none`
    // is likewise off-table. `rounded-[...]` arbitrary values are deliberately
    // NOT matched: the table allowlists a few (scroll-area `rounded-[inherit]`,
    // board tile `rounded-[3px]`) as true one-offs.
    //
    // Stories are in scope too (#194): a demo that hand-rolls an off-scale
    // corner is exactly the drift this rule exists to catch, and stories are
    // what VRT photographs. The only strings that legitimately contain the
    // English word "rounded" are Storybook doc prose, which always lives under
    // a `description` key (`parameters.docs.description.story|component`,
    // `argTypes.*.description`) — so that subtree, and only that subtree, is
    // excluded.
    //
    // The match itself stays a plain `Literal`/`TemplateElement` scan rather
    // than something narrower like `JSXAttribute[name.name='className']`:
    // class strings in this repo live in cva bases and variant maps, `cn()`
    // arguments, module-level `const FOO_BASE = "..."` constants, string
    // concatenations and ternaries — a JSX-attribute-scoped selector would
    // silently stop guarding nearly all of them.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(?:^|\\s)rounded(?:-none)?(?:\\s|$)/]:not(Property[key.name='description'] Literal, Property[key.value='description'] Literal)",
          message:
            "Off-scale corner radius: use a radius role class (rounded-sm | rounded-md | rounded-lg | rounded-xl | rounded-full) from the role table in theme.css instead of bare `rounded`/`rounded-none`.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:^|\\s)rounded(?:-none)?(?:\\s|$)/]:not(Property[key.name='description'] TemplateElement, Property[key.value='description'] TemplateElement)",
          message:
            "Off-scale corner radius: use a radius role class (rounded-sm | rounded-md | rounded-lg | rounded-xl | rounded-full) from the role table in theme.css instead of bare `rounded`/`rounded-none`.",
        },
      ],
    },
  },
  {
    // These primitives are headless wrappers around a single native element
    // whose content — and, for the label, its control association — is
    // forwarded from the call site through `children`/`{...props}`. The
    // jsx-a11y rules below inspect the literal JSX at the definition site and
    // cannot follow props, so they false-positive here. The rules stay `error`
    // everywhere else, so a genuinely empty heading, an unassociated label, or
    // a contentless anchor in real markup is still caught.
    files: ["src/components/feedback/alert.tsx"],
    rules: { "jsx-a11y/heading-has-content": "off" },
  },
  {
    files: ["src/components/forms/label.tsx"],
    rules: { "jsx-a11y/label-has-associated-control": "off" },
  },
  {
    files: ["src/components/typography/text-link.tsx"],
    rules: { "jsx-a11y/anchor-has-content": "off" },
  },
  {
    // ActionCard's `asChild` form takes the caller's element and REPLACES its
    // children with the card's own content (medallion, title, description), so
    // the documented call shape is a deliberately empty `<a href="…" />`. The
    // rule reads the literal JSX and cannot see the content injected at render
    // time; action-card.test.tsx asserts the rendered anchor really is named
    // and really is announced as a link.
    files: ["src/components/containment/action-card.stories.tsx", "src/components/containment/action-card.test.tsx"],
    rules: { "jsx-a11y/anchor-has-content": "off" },
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
