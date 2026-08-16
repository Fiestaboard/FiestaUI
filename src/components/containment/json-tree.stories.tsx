import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { JsonTree } from "./json-tree";

const SAMPLE = {
  status: "ok",
  count: 3,
  cached: false,
  cursor: null,
  location: {
    city: "Austin",
    coordinates: { lat: 30.2672, lon: -97.7431 },
  },
  forecast: [
    { day: "Mon", high: 34, precipitation: 0.1 },
    { day: "Tue", high: 31, precipitation: 0.4 },
  ],
};

const meta = {
  title: "Containment/JsonTree",
  component: JsonTree,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      control: false,
      description: "Any JSON-shaped value. Objects and arrays branch; everything else renders as a leaf",
    },
    path: {
      control: "text",
      description: "Dot/bracket path of this node, prefixed onto every child path",
    },
    defaultExpanded: {
      control: "boolean",
      description: "Expand this node on first render",
    },
    defaultExpandedDepth: {
      control: { type: "number", min: 0, max: 5 },
      description: "Expand the first N levels on first render",
    },
    onSelect: {
      control: false,
      description: "Called with (path, value) when a leaf is picked. Omit for a read-only tree",
    },
    labels: {
      control: false,
      description: "Optional English-defaulted strings: selectPath, toggleNode, root, selected, empty",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
  },
} satisfies Meta<typeof JsonTree>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Collapsed on first render — the whole payload is one `{6}` summary until asked for. */
export const Default: Story = {
  args: {
    data: SAMPLE,
    path: "response",
    defaultExpanded: false,
    onSelect: () => {},
  },
};

/** One level open: leaves show their select affordance on hover or keyboard focus. */
export const Expanded: Story = {
  args: {
    data: SAMPLE,
    path: "response",
    defaultExpanded: true,
    onSelect: () => {},
  },
};

/** `defaultExpandedDepth` opens nested branches so the whole shape is visible at once. */
export const DeeplyExpanded: Story = {
  args: {
    data: SAMPLE,
    path: "response",
    defaultExpandedDepth: 4,
    onSelect: () => {},
  },
};

/**
 * Type-based colouring, with the glyph carrying the same information: strings
 * are quoted and green, numbers and booleans amber, nullish an italic muted
 * `null`. Colour is never the only cue.
 */
export const ValueTypes: Story = {
  args: {
    data: {
      string: "hello",
      emptyString: "",
      number: 42,
      negative: -97.7431,
      booleanTrue: true,
      booleanFalse: false,
      nullValue: null,
      undefinedValue: undefined,
      longString: "a value long enough that it has to truncate inside a narrow container",
    },
    path: "types",
    defaultExpanded: true,
    onSelect: () => {},
    className: "max-w-sm",
  },
};

/** Array indices get their own label tone, and paths use bracket notation. */
export const Arrays: Story = {
  args: {
    data: [{ id: "a1", score: 0.92 }, { id: "b2", score: 0.41 }, ["nested", "array", 3]],
    path: "items",
    defaultExpandedDepth: 3,
    onSelect: () => {},
  },
};

/** Empty objects and arrays still expand, and say so. */
export const EmptyContainers: Story = {
  args: {
    data: { results: [], meta: {}, error: null },
    path: "response",
    defaultExpandedDepth: 3,
    onSelect: () => {},
  },
};

/** Omitting `onSelect` drops the per-leaf buttons — a pure JSON viewer. */
export const ReadOnly: Story = {
  args: {
    data: SAMPLE,
    path: "response",
    defaultExpandedDepth: 2,
  },
};

/** A scalar root renders as a bare formatted value, with no toggle. */
export const ScalarRoot: Story = {
  args: {
    data: "just a string",
    path: "value",
  },
};

/** Every user-visible string is an optional prop; the app supplies its own copy. */
export const CustomLabels: Story = {
  args: {
    data: { plugin: { name: "weather", enabled: true }, tags: [] },
    path: "config",
    defaultExpandedDepth: 3,
    onSelect: () => {},
    labels: {
      selectPath: (path) => `Chemin : ${path}`,
      toggleNode: (path, count) => `${path} — ${count} élément(s)`,
      root: "racine",
      selected: "Chemin copié",
      empty: "vide",
    },
  },
};

/** The picker in context: the tree reports a path, the surface around it decides what that means. */
export const PathPicker = () => {
  const [picked, setPicked] = useState<{ path: string; value: unknown } | null>(null);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <JsonTree
        data={SAMPLE}
        path="response"
        defaultExpandedDepth={4}
        onSelect={(path, value) => setPicked({ path, value })}
      />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {picked ? (
          <>
            Selected <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">{picked.path}</code> ={" "}
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">{JSON.stringify(picked.value)}</code>
          </>
        ) : (
          "Hover or tab to a leaf, then activate its copy button."
        )}
      </p>
    </div>
  );
};
