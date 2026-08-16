// The editor's ProseMirror surface is styled by a real stylesheet that the
// package deliberately does NOT import at runtime (see the header comment on
// template-editor.tsx). Storybook is a consumer like any other, so it does
// here exactly what an app does next to `theme.css` — without this import the
// stories render as unstyled proportional text with no placeholder and no
// caret colour.
import "../../styles/editor.css";

import type { Meta, StoryObj } from "@storybook/react";
import { Clock, Cloud, TrainFront, TrendingUp } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "../forms/button";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Stack } from "../layout/stack";
import { Text } from "../typography/text";
import {
  type LineAlignment,
  TemplateEditor,
  type TemplateEditorHandle,
  type TemplateEditorProps,
  type TemplateEditorToolbarSlotProps,
} from "./template-editor";
import type { ToolbarTemplateVariables } from "./template-editor-toolbar";
import type { DrawBrush } from "./utils/draw-mode";
import { createLucideIconResolver, type PluginManifest } from "./variable-picker-content";

/**
 * The app resolves manifest icon names against the whole Lucide set; a story
 * only needs the four the mock manifests ask for.
 */
const resolveIcon = createLucideIconResolver({ Cloud, Clock, TrendingUp, TrainFront });

/**
 * A realistic `/templates/variables` payload — what the app hands the toolbar
 * once it has resolved the plugin catalog. `colors` are the board's hardware
 * codes (63–70); `formatting` are the engine's layout tokens.
 */
const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: {
    weather: ["temperature", "condition", "high", "low", "humidity"],
    datetime: ["time", "date", "day"],
    stocks: ["price", "change_percent", "symbol"],
  },
  variable_metadata: {
    weather: {
      temperature: { description: "Current temperature in the configured unit.", preview: "72" },
      condition: { description: "Short description of the sky.", max_length: 12, preview: "PARTLY CLOUDY" },
      high: { description: "Forecast high for today.", preview: "78" },
      low: { description: "Forecast low for today.", preview: "61" },
    },
    datetime: {
      time: { description: "Current local time.", preview: "9:41 AM" },
      date: { description: "Current local date.", preview: "AUG 15" },
    },
  },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
  formatting: {
    fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line to the right edge" },
    center: { syntax: "{{center}}", description: "Center the line" },
  },
};

const PLUGIN_MANIFESTS: Record<string, PluginManifest> = {
  weather: { icon: "cloud" },
  datetime: { icon: "clock" },
  stocks: { icon: "trending-up" },
};

/** Everything the editor forwards verbatim to its built-in toolbar. */
const TOOLBAR_PROPS: TemplateEditorToolbarSlotProps = {
  templateVariables: TEMPLATE_VARIABLES,
  pluginManifests: PLUGIN_MANIFESTS,
  resolveIcon,
};

/**
 * A flagship-shaped template exercising the node views: a color tile, several
 * variables, a fill_space and a formula.
 */
const SAMPLE_TEMPLATE = [
  "{{blue}} GOOD MORNING",
  "{{datetime.time}}{{fill_space}}{{datetime.date}}",
  "",
  "{{weather.condition}}",
  "NOW {{weather.temperature}} HI {{weather.high}}",
  "{{= IF(weather.high > 80, 'HOT', 'MILD') }}",
].join("\n");

/**
 * `value`/`onChange` is a controlled contract — a story that fed the editor a
 * literal string would revert every keystroke on the next render. This wrapper
 * seeds local state from the `value` arg and still forwards edits to the arg's
 * `onChange`, so the Actions panel logs them.
 */
function ControlledEditor({ value: initialValue, onChange, ...rest }: TemplateEditorProps) {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      onChange(next);
    },
    [onChange],
  );

  return (
    <Box className="w-full max-w-[46rem]">
      <TemplateEditor value={value} onChange={handleChange} {...rest} />
    </Box>
  );
}

const meta = {
  title: "Editor/TemplateEditor",
  component: TemplateEditor,
  parameters: {
    // The toolbar's dropdowns open downward and the editor is a full-width
    // form control, so it wants the page rather than a centred card.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "Controlled template string, lines separated by `\\n`. Editing it reseeds the editor.",
    },
    onChange: { control: false },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Resolves the board grid (width × lines) that the editor validates against.",
    },
    boardLines: { control: { type: "range", min: 1, max: 12, step: 1 } },
    boardWidth: { control: { type: "range", min: 8, max: 44, step: 1 } },
    showToolbar: { control: "boolean" },
    showAlignmentControls: { control: "boolean" },
    drawMode: { control: "boolean" },
    placeholder: { control: "text" },
    toolbarProps: { control: false },
    labels: { control: false },
    lineAlignments: { control: false },
    lineWrapEnabled: { control: false },
  },
  args: {
    value: SAMPLE_TEMPLATE,
    onChange: () => {},
    deviceType: "flagship",
    toolbarProps: TOOLBAR_PROPS,
  },
  // Re-keyed on `value` so editing the control reseeds the wrapper's state
  // instead of being swallowed by it.
  render: function Render(args) {
    return <ControlledEditor key={args.value} {...args} />;
  },
} satisfies Meta<typeof TemplateEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default flagship editor, pre-filled with a template that uses every node view. */
export const Default: Story = {};

/** Nothing typed yet: the gutter still shows all six flagship rows and the placeholder sits on line 1. */
export const Empty: Story = {
  args: { value: "" },
};

/**
 * A Note is a 3-line board. The editor resolves its own geometry from
 * `deviceType`, so the gutter, the minimum height and the line counter all
 * shrink without the host restating any dimensions.
 */
export const NoteDevice: Story = {
  args: {
    value: "MEETING AT 3\n{{datetime.time}}\nCONF ROOM B",
    deviceType: "note",
  },
};

/** Blank Note, to compare the empty geometry against the flagship above. */
export const NoteEmpty: Story = {
  args: { value: "", deviceType: "note" },
};

/**
 * More lines than the board can show. The border turns warning-toned and the
 * counter appends the over-limit explanation — the template still edits, and
 * the host decides whether to block saving.
 */
export const OverLineLimit: Story = {
  args: {
    value: ["LINE ONE", "LINE TWO", "LINE THREE", "LINE FOUR", "LINE FIVE"].join("\n"),
    deviceType: "note",
  },
};

/**
 * `showToolbar={false}` hides the toolbar and reveals the standalone alignment
 * row underneath instead — the two are deliberately never shown together.
 */
export const WithoutToolbar: Story = {
  args: { showToolbar: false },
};

/** Neither chrome: a bare editing surface plus its line counter. */
export const EditorOnly: Story = {
  args: { showToolbar: false, showAlignmentControls: false },
};

/** No plugins installed: Variables is disabled and the colors/formatting dropdowns disappear. */
export const NoVariablesAvailable: Story = {
  args: {
    value: "PLAIN TEXT ONLY",
    toolbarProps: {},
  },
};

/** Cold cache — the toolbar shows its loading affordance while the host fetches. */
export const LoadingVariables: Story = {
  args: {
    value: "PLAIN TEXT ONLY",
    toolbarProps: { isLoadingVariables: true, isLoadingManifests: true },
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
 * An explicit grid, which is the only way to describe a `note_array` — its
 * dimensions depend on how many notes wide and tall the array is, which the
 * component is never told.
 */
export const ExplicitGrid: Story = {
  args: {
    value: ["ARRAY OF NOTES", "44 CHARACTERS WIDE", "SIX ROWS TALL"].join("\n"),
    deviceType: "note_array",
    boardWidth: 44,
    boardLines: 6,
  },
};

/**
 * Every user-visible string is an optional prop. The editor owns its own
 * slice; the toolbar and the pickers receive theirs through `toolbarProps`, so
 * a localized editor is assembled from label bags rather than a global catalog.
 */
export const Localized: Story = {
  args: {
    value: "GUTEN MORGEN\n{{datetime.time}}",
    deviceType: "note",
    placeholder: "Text eingeben oder Variablen einfügen…",
    labels: {
      lineCount: (used, max) => `${used} / ${max} Zeilen`,
      overLineLimit: (max) => ` — überschreitet das ${max}-Zeilen-Limit`,
      currentLine: (line) => `(Zeile ${line})`,
      alignment: "Ausrichtung:",
      alignLeft: "Linksbündig",
      alignCenter: "Zentriert",
      alignRight: "Rechtsbündig",
      editorAriaLabel: "Vorlagen-Editor",
    },
    toolbarProps: {
      ...TOOLBAR_PROPS,
      labels: {
        undo: "Rückgängig (Strg+Z)",
        redo: "Wiederholen (Strg+Umschalt+Z)",
        variables: "Variablen",
        colors: "Farben",
        formatting: "Formatierung",
      },
    },
  },
};

/**
 * Per-line alignment lives outside the ProseMirror document — it is a
 * serialization concern — so the host owns the array and the editor reports
 * edits back through `onLineAlignmentChange`.
 */
function AlignmentDemo() {
  const [value, setValue] = useState("LEFT\nCENTERED\nRIGHT");
  const [alignments, setAlignments] = useState<LineAlignment[]>(["left", "center", "right"]);

  return (
    <Stack gap="3" className="w-full max-w-[46rem]">
      <TemplateEditor
        value={value}
        onChange={setValue}
        deviceType="note"
        lineAlignments={alignments}
        onLineAlignmentChange={(lineIndex, alignment) =>
          setAlignments((prev) => {
            const next = [...prev];
            next[lineIndex] = alignment;
            return next;
          })
        }
        toolbarProps={TOOLBAR_PROPS}
      />
      <Text size="xs" tone="muted">
        Host-held alignments: {alignments.join(", ")}
      </Text>
    </Stack>
  );
}

export const PerLineAlignment: Story = {
  render: () => <AlignmentDemo />,
};

/**
 * Draw mode collapses the text surface but keeps the editor mounted, so the
 * host's canvas can paint cells through the imperative `applyStroke` (one
 * stroke = one undo step) while the toolbar swaps to swatches, an eraser and a
 * stamp picker.
 */
function DrawModeDemo() {
  const [value, setValue] = useState(SAMPLE_TEMPLATE);
  const [drawMode, setDrawMode] = useState(true);
  const [brush, setBrush] = useState<DrawBrush>({ kind: "color", color: "blue" });
  const [log, setLog] = useState<string[]>([]);
  const ref = useRef<TemplateEditorHandle>(null);

  return (
    <Stack gap="3" className="w-full max-w-[46rem]">
      <TemplateEditor
        ref={ref}
        value={value}
        onChange={setValue}
        deviceType="flagship"
        drawMode={drawMode}
        onDrawModeToggle={() => setDrawMode((d) => !d)}
        drawBrush={brush}
        onDrawBrushChange={setBrush}
        onDrawHistoryEvent={(event) =>
          setLog((prev) => [`${event.action} (stroke: ${event.stroke})`, ...prev].slice(0, 4))
        }
        toolbarProps={TOOLBAR_PROPS}
      />
      {/* Stands in for the host's drawing canvas, which this package does not own. */}
      <Flex gap="2" align="center" wrap>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            ref.current?.applyStroke(
              [
                { row: 0, col: 0 },
                { row: 0, col: 1 },
              ],
              brush,
            )
          }
        >
          Paint (0,0) + (0,1)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => ref.current?.undo()}>
          Undo
        </Button>
        <Button size="sm" variant="secondary" onClick={() => ref.current?.redo()}>
          Redo
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDrawMode((d) => !d)}>
          drawMode: {String(drawMode)}
        </Button>
      </Flex>
      <Text size="xs" tone="muted">
        History events: {log.length ? log.join(" · ") : "none yet"}
      </Text>
    </Stack>
  );
}

export const DrawMode: Story = {
  render: () => <DrawModeDemo />,
};
