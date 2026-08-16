import type { Meta, StoryObj } from "@storybook/react";
import { Clock, Cloud, TrendingUp } from "lucide-react";
import type { ComponentProps } from "react";

import { Box } from "../../layout/box";
import {
  createLucideIconResolver,
  type PluginManifest,
  type TemplateVariables,
  VariablePickerContent,
} from "../variable-picker-content";
import { FormulaEditorPanel, type FormulaFunction, type FormulaValidationResult } from "./formula-editor-panel";

/**
 * The five FiestaBoard categories, each of which gets an icon and an accent
 * colour. `signature` and `summary` are what the list row and its hover
 * tooltip show; clicking a row scaffolds `NAME()` into the CodeMirror input.
 */
const FORMULA_FUNCTIONS: FormulaFunction[] = [
  {
    name: "IF",
    category: "logic",
    signature: "IF(condition, then, else)",
    summary: "Returns `then` when the condition is truthy, otherwise `else`.",
  },
  {
    name: "AND",
    category: "logic",
    signature: "AND(a, b, ...)",
    summary: "True when every argument is truthy.",
  },
  {
    name: "OR",
    category: "logic",
    signature: "OR(a, b, ...)",
    summary: "True when any argument is truthy.",
  },
  {
    name: "NOT",
    category: "logic",
    signature: "NOT(value)",
    summary: "Inverts the truthiness of its argument.",
  },
  {
    name: "ROUND",
    category: "math",
    signature: "ROUND(number, digits)",
    summary: "Rounds to the given number of decimal places.",
  },
  {
    name: "MIN",
    category: "math",
    signature: "MIN(a, b, ...)",
    summary: "Smallest of its arguments.",
  },
  {
    name: "MAX",
    category: "math",
    signature: "MAX(a, b, ...)",
    summary: "Largest of its arguments.",
  },
  {
    name: "ABS",
    category: "math",
    signature: "ABS(number)",
    summary: "Absolute value.",
  },
  {
    name: "UPPER",
    category: "text",
    signature: "UPPER(text)",
    summary: "Uppercases the text — the board renders uppercase characters only.",
  },
  {
    name: "TRUNCATE",
    category: "text",
    signature: "TRUNCATE(text, length)",
    summary: "Clips the text to at most `length` characters.",
  },
  {
    name: "CONCAT",
    category: "text",
    signature: "CONCAT(a, b, ...)",
    summary: "Joins its arguments into one string.",
  },
  {
    name: "PAD",
    category: "text",
    signature: "PAD(text, width)",
    summary: "Pads the text with spaces out to `width` board cells.",
  },
  {
    name: "NUMBER",
    category: "convert",
    signature: "NUMBER(text)",
    summary: "Parses text as a number.",
  },
  {
    name: "TEXT",
    category: "convert",
    signature: "TEXT(value)",
    summary: "Renders any value as text.",
  },
  {
    name: "COLOR",
    category: "color",
    signature: "COLOR(name)",
    summary: "Emits the board colour tile for a palette name (red, blue, …).",
  },
  {
    name: "COLOR_SCALE",
    category: "color",
    signature: "COLOR_SCALE(value, min, max)",
    summary: "Picks a palette colour by where `value` falls between `min` and `max`.",
  },
];

const TEMPLATE_VARIABLES: TemplateVariables = {
  variables: {
    weather: ["temperature", "condition", "high", "low", "humidity"],
    datetime: ["time", "date", "day"],
    stocks: ["price", "change_percent", "symbol"],
  },
};

const PLUGIN_MANIFESTS: Record<string, PluginManifest> = {
  weather: { icon: "cloud" },
  datetime: { icon: "clock" },
  stocks: { icon: "trending-up" },
};

const resolveIcon = createLucideIconResolver({ Cloud, Clock, TrendingUp });

/**
 * The Variables tab is a slot rather than a direct import so the host can hand
 * over the same lazy chunk its toolbar already loaded (FiestaBoard #1575).
 * These stories pass the picker eagerly, which is what that slot is for.
 */
const renderVariablePicker: ComponentProps<typeof FormulaEditorPanel>["renderVariablePicker"] = ({ onInsert }) => (
  <VariablePickerContent
    onInsert={onInsert}
    templateVariables={TEMPLATE_VARIABLES}
    pluginManifests={PLUGIN_MANIFESTS}
    resolveIcon={resolveIcon}
    // Several panels render at once on the autodocs page; letting each one
    // grab focus scrolls the page around.
    autoFocusSearch={false}
  />
);

/**
 * Stands in for the app's `/templates/validate` round-trip. Deliberately
 * slower than instant so the "validating" state is observable, and it rejects
 * unbalanced parentheses so the invalid path is reachable by typing.
 */
async function validateExpression(expr: string): Promise<FormulaValidationResult> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  let depth = 0;
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return { valid: false, error: "Unexpected ')'" };
  }
  if (depth > 0) return { valid: false, error: "Unclosed '(' in expression" };
  return { valid: true };
}

/** Always fails, to hold the panel in its error state for review. */
async function alwaysInvalid(): Promise<FormulaValidationResult> {
  return { valid: false, error: "Unknown function 'FOO' at position 0" };
}

const meta = {
  title: "Editor/FormulaEditorPanel",
  component: FormulaEditorPanel,
  parameters: {
    // 560px tall on desktop with its own two-column layout — it wants the page.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "inline-radio",
      options: ["create", "edit"],
      description: "`create` → Insert button; `edit` → Done plus Close.",
    },
    initialExpr: {
      control: "text",
      description: "Read once when the CodeMirror document is created. Re-key the panel to reopen on another formula.",
    },
    isLoadingFunctions: { control: "boolean" },
    formulaFunctions: { control: false },
    validateExpression: { control: false },
    renderVariablePicker: { control: false },
    onConfirm: { control: false },
    onCancel: { control: false },
    labels: { control: false },
  },
  args: {
    mode: "create",
    formulaFunctions: FORMULA_FUNCTIONS,
    onConfirm: (expr: string) => console.log("Confirm:", expr),
    onCancel: () => console.log("Cancel"),
  },
  decorators: [
    (Story) => (
      <Box className="max-w-[820px] overflow-hidden rounded-xl border bg-popover shadow-card">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof FormulaEditorPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Opened from the toolbar's Formulas button. With no validator the Confirm
 * button enables on any non-empty expression — a panel that cannot validate
 * must not present a permanently disabled Confirm.
 */
export const Default: Story = {};

/** With the Variables tab injected, the tab strip appears above the function list. */
export const WithVariablePicker: Story = {
  args: {
    renderVariablePicker,
  },
};

/**
 * Opened by clicking an existing formula pill: the expression is pre-filled,
 * Confirm reads "Done" and the dismiss button reads "Close".
 */
export const EditExisting: Story = {
  args: {
    mode: "edit",
    initialExpr: "IF(weather.high > 80, 'HOT', 'MILD')",
    renderVariablePicker,
  },
};

/**
 * A validator wired up. It debounces 300 ms and discards stale results, so
 * typing an unbalanced parenthesis flips the indicator and disables Confirm.
 */
export const WithValidation: Story = {
  args: {
    mode: "edit",
    initialExpr: "ROUND(stocks.price, 2)",
    validateExpression,
    renderVariablePicker,
  },
};

/** The invalid state: the message from the host's validator, under the input. */
export const InvalidExpression: Story = {
  args: {
    mode: "edit",
    initialExpr: "FOO(weather.temperature)",
    validateExpression: alwaysInvalid,
  },
};

/** A long nested expression, pretty-printed across lines by the panel. */
export const NestedExpression: Story = {
  args: {
    mode: "edit",
    initialExpr: "IF(AND(weather.high > 80, NOT(weather.condition == 'RAIN')), CONCAT('HOT ', weather.high), 'MILD')",
    validateExpression,
    renderVariablePicker,
  },
};

/** Placeholders while the host fetches the built-in function reference. */
export const LoadingFunctions: Story = {
  args: {
    formulaFunctions: undefined,
    isLoadingFunctions: true,
  },
};

/**
 * A payload whose categories are not the five FiestaBoard ones. They still
 * render, in a neutral group after the known categories.
 */
export const UnknownCategory: Story = {
  args: {
    formulaFunctions: [
      ...FORMULA_FUNCTIONS.slice(0, 4),
      {
        name: "SPARKLINE",
        category: "experimental",
        signature: "SPARKLINE(values)",
        summary: "Renders a tiny bar chart from a list of numbers.",
      },
    ],
  },
};

/** Every user-visible string is an overridable label. */
export const Localized: Story = {
  args: {
    mode: "edit",
    initialExpr: "ROUND(weather.temperature, 0)",
    renderVariablePicker,
    labels: {
      functionsTab: "Funktionen",
      variablesTab: "Variablen",
      loading: "Wird geladen…",
      formulaExpression: "Formelausdruck",
      insert: "Einfügen",
      done: "Fertig",
      cancel: "Abbrechen",
      close: "Schließen",
      categoryLogic: "Logik",
      categoryMath: "Mathematik",
      categoryText: "Text",
      categoryConversion: "Umwandlung",
      categoryColor: "Farbe",
    },
  },
};
