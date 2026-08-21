import type { Meta, StoryObj } from "@storybook/react";

import { TemplateEditorToolbar, type ToolbarTemplateVariables } from "./template-editor-toolbar";

/**
 * A realistic `/templates/variables` payload. The toolbar only inspects
 * `variables`, `colors` and `formatting` (to decide which dropdowns exist);
 * the rest is forwarded to the variable picker untouched.
 */
const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: {
    weather: ["temp", "condition", "high", "low"],
    calendar: ["next_event", "next_time"],
    home_assistant: ["porch_temp", "front_door"],
  },
  variable_metadata: {
    weather: {
      temp: { description: "Current temperature", type: "number", preview: "72°" },
      condition: { description: "Current conditions", max_length: 12, preview: "PARTLY CLOUDY" },
    },
  },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
  formatting: {
    fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line to the right edge" },
    center: { syntax: "{{center}}", description: "Center the line" },
  },
};

const meta = {
  title: "Editor/TemplateEditorToolbar",
  component: TemplateEditorToolbar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    currentAlignment: {
      control: "inline-radio",
      options: ["left", "center", "right"],
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
    },
    renderVariablePicker: {
      control: false,
      description:
        "Renders the Variables dropdown body. Omitted, the toolbar renders its own lazily-imported " +
        "`VariablePickerContent` from `templateVariables` / `pluginManifests` / `resolveIcon`. Supplying it moves " +
        "that fetching — and lucide's full icon barrel — into the host's own dropdown-open chunk; the toolbar still " +
        "owns the trigger, the disabled empty state and `onInsert` (insert at the caret, then close).",
    },
  },
  args: {
    // The stories exercise the toolbar's own chrome; every editor-backed
    // control is correctly disabled with no editor attached.
    editor: null,
    templateVariables: TEMPLATE_VARIABLES,
  },
} satisfies Meta<typeof TemplateEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No plugins configured — Variables is disabled and the dropdowns disappear. */
export const NoVariables: Story = {
  args: {
    templateVariables: undefined,
  },
};

/** Draw mode swaps the content controls for swatches, an eraser and a stamp picker. */
export const DrawMode: Story = {
  args: {
    drawMode: true,
    drawBrush: { kind: "color", color: "blue" },
    onDrawModeToggle: () => {},
    onDrawBrushChange: () => {},
  },
};

/** The optional sync-from-board affordance, mid-flight. */
export const SyncingFromBoard: Story = {
  args: {
    onSyncFromBoard: () => {},
    syncFromBoardPending: true,
  },
};

/**
 * Host-injected entity picker. The slot receives the open state and the
 * insert callback, so the host's dialog stays in the host.
 */
export const WithEntityPicker: Story = {
  args: {
    entityPickerSlot: ({ open }) => (open ? <p>Host entity picker dialog renders here</p> : null),
  },
};

/**
 * Host-supplied Variables panel. The slot exists so a host can keep the
 * picker's data fetching — and the lucide icon barrel `resolveIcon` needs —
 * inside the chunk that only loads when the dropdown opens, instead of
 * resolving both when the editor mounts. `templateVariables` is still what
 * decides whether the button is enabled at all, so it stays passed.
 */
export const WithInjectedVariablePicker: Story = {
  args: {
    renderVariablePicker: ({ onInsert }) => (
      <div className="p-3 min-w-[260px]">
        <p className="mb-2 text-sm text-muted-foreground">Host variable picker (loaded on open)</p>
        <button type="button" className="text-sm text-brand focus-ring" onClick={() => onInsert("{{weather.temp}}")}>
          Insert {"{{weather.temp}}"}
        </button>
      </div>
    ),
  },
};

/** Every string is a prop; here the toolbar speaks German. */
export const Localized: Story = {
  args: {
    labels: {
      undo: "Rückgängig (Strg+Z)",
      undoAriaLabel: "Rückgängig",
      redo: "Wiederholen (Strg+Umschalt+Z)",
      redoAriaLabel: "Wiederholen",
      cut: "Ausschneiden (Strg+X)",
      cutAriaLabel: "Ausschneiden",
      copy: "Kopieren (Strg+C)",
      copyAriaLabel: "Kopieren",
      paste: "Einfügen (Strg+V)",
      pasteAriaLabel: "Einfügen",
      variables: "Variablen",
      colors: "Farben",
      formatting: "Formatierung",
      insertFormula: "Formel einfügen",
      toggleWrap: "Umbruch für diese Zeile umschalten",
      alignLeft: "Linksbündig",
      alignCenter: "Zentriert",
      alignRight: "Rechtsbündig",
    },
  },
};
