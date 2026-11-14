import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import { userEvent, within } from "storybook/test";

import { ScaledBoardDisplay } from "../board/scaled-board-display";
import { Button } from "../forms/button";
import { Switch } from "../forms/switch";
import { EditorPreview } from "./editor-preview";
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

/* ------------------------------------------------------------------ *
 * size="touch" — slice 1.6b (C5, WEB-04, C6). Figma 07 `315:99828`
 * "Web / Editor toolbar · touch"; the sheets are 07c `306:36342`
 * (Formatting) and 07 `57:65460` (Colors).
 *
 * Each story is the 07c phone composition: the docked live preview (1.6a),
 * the template, and the 60 px bar docked to the bottom (`layout="docked"`),
 * which rides on top of an open sheet. The page is `position: fixed`,
 * so VRT captures the viewport and the portalled sheet is in the shot
 * (the 1.3 convention). Sheets open in `play`.
 * ------------------------------------------------------------------ */

const PHONE_MESSAGE = "GOOD MORNING\n72° {red}\nNICE OUT\nN JUDAH 4 MIN\nHAVE A GREAT DAY";
const TEMPLATE_LINES = ["GOOD MORNING", "{{weather.temp}}°{red}", "NICE OUT", "N JUDAH {{muni.n_judah.next}}"];

function TouchEditor(props: Partial<ComponentProps<typeof TemplateEditorToolbar>>) {
  return (
    <div className="fixed inset-0 flex justify-center bg-background text-foreground">
      {/* pb-15: room for the docked 60 px bar. */}
      <div className="flex w-full max-w-[390px] flex-col pb-15">
        <EditorPreview variant="docked" boardName="Kitchen board">
          <ScaledBoardDisplay message={PHONE_MESSAGE} size="sm" animationsEnabled={false} />
        </EditorPreview>
        <ol className="flex-1 space-y-2 px-4 py-3 font-mono text-sm">
          {TEMPLATE_LINES.map((line, i) => (
            <li key={line} className="flex gap-3">
              <span className="w-4 text-right text-muted-foreground">{i + 1}</span>
              {line}
            </li>
          ))}
        </ol>
        <TemplateEditorToolbar
          editor={null}
          templateVariables={TEMPLATE_VARIABLES}
          size="touch"
          layout="docked"
          {...props}
        />
      </div>
    </div>
  );
}

const openTool =
  (name: string): Story["play"] =>
  async ({ canvasElement }) => {
    // A tap, not a click: a touch-opened sheet keeps focus on itself (1.3),
    // so no picker tooltip opens over the sheet title, as on a phone.
    const tool = within(canvasElement).getByRole("button", { name });
    await userEvent.pointer([{ keys: "[TouchA]", target: tool }]);
  };

/** 07 `53:100602`: the split-flap tool set — Variables · Colors · Formatting · Formula │ Undo · Redo · More. */
export const Touch: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <TouchEditor />,
};

/** 07 `315:99783`: the LED tool set (CANON) — Variables · Text color · Icon · Size · Formula · More. */
export const TouchLed: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <TouchEditor
      charset="led_5x7"
      renderSizePicker={({ close }) => (
        <Button variant="outline" size="touch" onClick={close}>
          Large (5×7)
        </Button>
      )}
    />
  ),
};

/** Nothing to insert yet: the tools disable but the bar keeps its shape (the owner's "visible toolbar"). */
export const TouchNoVariables: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <TouchEditor templateVariables={undefined} />,
};

/** 07 `57:65460`: Colors in a bottom sheet — 48 px swatches; the sheet stays open for several tiles. */
export const TouchColorsSheet: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <TouchEditor />,
  play: openTool("Colors"),
};

/** 07c `306:36342`: Formatting — the snippets plus line alignment at 44 px; the tool fills accent. */
export const TouchFormattingSheet: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <TouchEditor currentAlignment="left" onAlignmentChange={() => {}} />,
  play: openTool("Formatting"),
};

/** More: the clipboard, Draw on board, sync, wrap, and the host's rows (2.5 adds the mirror switch). */
export const TouchMoreSheet: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <TouchEditor
      onDrawModeToggle={() => {}}
      onWrapToggle={() => {}}
      onSyncFromBoard={() => {}}
      moreContent={
        <div className="flex min-h-12 items-center gap-3">
          <span id="mirror-label" className="min-w-0 flex-1 text-base">
            Mirror to board while editing
          </span>
          <Switch size="touch" aria-labelledby="mirror-label" />
        </div>
      }
    />
  ),
  play: openTool("More"),
};

/** LED Icon: the set's icons only. */
export const TouchLedIconSheet: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <TouchEditor charset="led_5x7" />,
  play: openTool("Icon"),
};

/** Draw mode on touch (Jev brush_sheet 0.95): Brush · Undo · Redo · Done. */
export const TouchDrawMode: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <TouchEditor
      drawMode
      drawBrush={{ kind: "color", color: "blue" }}
      onDrawModeToggle={() => {}}
      onDrawBrushChange={() => {}}
    />
  ),
};

/** The Brush sheet: 48 px colour swatches, the eraser, and 44 px stamp cells. */
export const TouchBrushSheet: Story = {
  parameters: { layout: "fullscreen" },
  render: TouchDrawMode.render,
  play: openTool("Brush"),
};
