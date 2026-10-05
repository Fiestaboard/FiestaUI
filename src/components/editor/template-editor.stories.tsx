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

import { CHARACTER_SET_IDS, materializeCharacterSet } from "../../lib/character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL } from "../../lib/charset-golden-cases";
import {
  DEVICE_MODEL_IDS,
  type DeviceModel,
  type DeviceModelRef,
  ledSpecForModel,
  resolveDeviceModel,
} from "../../lib/devices";
import { ledGridLayout } from "../../lib/led-matrix";
import { DisplayPreview } from "../board/display-preview";
import { Button } from "../forms/button";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Stack } from "../layout/stack";
import { Text } from "../typography/text";
import { resolveDimensions } from "./constants";
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
    deviceModel: {
      control: "select",
      options: [undefined, ...DEVICE_MODEL_IDS],
      description: "A device model id (or, in code, a plugin's model object): implies the character set and the grid.",
    },
    charset: {
      control: "select",
      options: [undefined, ...CHARACTER_SET_IDS],
      description: "The character set, when it is not the one the model implies.",
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

/* ── Device-aware editing (Task 8) ──────────────────────────────────────────
 * `deviceModel` (or `charset`) tells the editor which board it is writing
 * for: the grid comes from the model, the toolbar offers only the forms the
 * board's character set supports (colour spans, block spans, icons), icons
 * are drawn the way that board will draw them, and every cell the set
 * cannot draw as written is underlined with what will draw instead.
 */

/**
 * A plugin's model as FiestaBoard would hand it over: the declared model with
 * its declared set made whole (`materializeCharacterSet`), never a built-in id.
 */
const ACME_MODEL: DeviceModel = {
  ...(JSON.parse(JSON.stringify(ACME_SIGN_MODEL)) as Omit<DeviceModel, "charset">),
  charset: materializeCharacterSet(ACME_SIGN_CHARSET),
};

/** A template using every form an RGB LED set supports, plus the flap-era nodes. */
const LED_TEMPLATE = [
  "{{icon:sun}} {{yellow:72°}} {{weather.condition}}",
  "{{black/white:OPEN}} {{green:{{datetime.time}}}}",
  "{{red:HOT}} {{blue:COLD}} {{red}}{{blue}}",
].join("\n");

/** A Flagship built before 2026: its code-62 flap is the degree sign, so a typed ♥ is warned. */
export const FlagshipV1: Story = {
  name: "Flagship v1 (degree)",
  args: {
    value: "72° SUNNY ♥\n{{datetime.time}}{{fill_space}}{{datetime.date}}",
    deviceType: undefined,
    deviceModel: "vestaboard_flagship",
    code62Glyph: "degree",
  },
};

/** A Flagship built since: the same editor, and the flap draws a heart, so the ° is warned instead. */
export const FlagshipV2Heart: Story = {
  name: "Flagship v2 (heart)",
  args: {
    value: "72° SUNNY ♥\n{{datetime.time}}{{fill_space}}{{datetime.date}}",
    deviceType: undefined,
    deviceModel: "vestaboard_flagship",
    code62Glyph: "heart",
  },
};

/** A Note by model: three lines, the heart flap, no extended forms on offer. */
export const NoteModel: Story = {
  name: "Note (model)",
  args: {
    value: "MEETING AT 3\n{{datetime.time}}\nCONF ROOM B",
    deviceType: undefined,
    deviceModel: "vestaboard_note",
  },
};

/** A Pixoo 64 in its 3×5 face: 16 × 10 cells, RGB, every icon, colour and block spans. */
export const Pixoo64: Story = {
  args: { value: LED_TEMPLATE, deviceType: undefined, deviceModel: "divoom_pixoo64" },
};

/** A HUB75 64×32 panel in the 5×7 face: 10 × 4 cells, the same forms. */
export const Hub75: Story = {
  name: "HUB75 64×32",
  args: { value: LED_TEMPLATE, deviceType: undefined, deviceModel: "hub75_64x32" },
};

/** An AWTRIX clock: 8 × 1 cells of the 3×5 face, the small set — the editor's grid follows it. */
export const Awtrix: Story = {
  name: "AWTRIX (small set)",
  args: { value: "{{icon:sun}} 72°", deviceType: undefined, deviceModel: "ulanzi_tc001_awtrix" },
};

/** A MAX7219 4-in-1: monochrome red, so colour is lit-or-not; the picker's glyphs show that. */
export const Max7219: Story = {
  name: "MAX7219 (mono)",
  args: { value: "{{red:HOT}} 72°", deviceType: undefined, deviceModel: "max7219_4in1" },
};

/**
 * A plugin's model, passed as the object its manifest carries: the ACME
 * amber sign's set is uppercase-only, has block spans but no colour spans,
 * and three icons. The toolbar offers exactly that.
 */
export const AcmePluginSet: Story = {
  name: "ACME plugin set",
  args: {
    value: "{{icon:up}} 12.50€\n{{black/white:OPEN}}",
    deviceType: undefined,
    deviceModel: ACME_MODEL,
  },
};

/** Sample values the live preview substitutes for the story's variables. */
const SAMPLE_VALUES: Record<string, string> = {
  "weather.condition": "SUNNY",
  "weather.temperature": "72",
  "weather.high": "78",
  "weather.low": "61",
  "datetime.time": "9:41",
  "datetime.date": "AUG 15",
  "datetime.day": "FRI",
  "stocks.price": "182.5",
  "stocks.change_percent": "+1.2",
  "stocks.symbol": "AAPL",
};

/**
 * Template text → the board markup `DisplayPreview` reads: variables get
 * sample values, `fill_space` pads the line, formulas show as `…`, and the
 * double-braced tokens become the single-braced message markup. A story
 * stand-in for FiestaBoard's template engine, not the engine itself.
 */
function previewFromTemplate(template: string, cols: number): string {
  return template
    .split("\n")
    .map((line) => {
      let out = line
        .replace(/\{\{=[^}]*\}\}/g, "…")
        .replace(/\{\{([a-z_]+\.[a-z_.0-9]+)(\|[^}]*)?\}\}/gi, (_m, path: string) => SAMPLE_VALUES[path] ?? "?");
      const fill = out.indexOf("{{fill_space}}");
      if (fill !== -1) {
        const rest = out.replace("{{fill_space}}", "");
        const visible = rest
          .replace(/\{\{[^:}]+:/g, "")
          .replace(/\{\{[^}]+\}\}/g, "#")
          .replace(/\}\}/g, "").length;
        out = out.replace("{{fill_space}}", " ".repeat(Math.max(1, cols - visible)));
      }
      return out.replaceAll("{{", "{").replaceAll("}}", "}");
    })
    .join("\n");
}

function BesideLivePreviewDemo({ model }: { model: DeviceModelRef }) {
  const [value, setValue] = useState(LED_TEMPLATE);
  const resolved = resolveDeviceModel(model);
  const spec = ledSpecForModel(resolved);
  const cols = spec ? ledGridLayout(spec).cols : resolveDimensions(resolved.legacy?.deviceType ?? "flagship").cols;
  return (
    <Flex gap="4" wrap align="start" className="w-full">
      <Box className="w-full max-w-[40rem] flex-1">
        <TemplateEditor value={value} onChange={setValue} deviceModel={model} toolbarProps={TOOLBAR_PROPS} />
      </Box>
      <Stack gap="2" className="min-w-[16rem]">
        <Text size="xs" tone="muted">
          Live preview: {resolved.label}
        </Text>
        {/* Every preview reads the extended markup by default: a flap draws
            the degradation (plain letters, fallback tiles), which is exactly
            what the editor's per-cell warnings say draws there. */}
        <DisplayPreview model={model} message={previewFromTemplate(value, cols)} size="sm" />
      </Stack>
    </Flex>
  );
}

/**
 * The editor beside a live `DisplayPreview` of the same device, re-rendered
 * from the editor's value on every edit (variables get sample values).
 */
export const BesideLivePreview: Story = {
  render: () => <BesideLivePreviewDemo model="divoom_pixoo64" />,
};

/** The same pairing on a split-flap board: spans and icons degrade to tiles there. */
export const BesideLivePreviewSplitFlap: Story = {
  name: "Beside live preview (split-flap)",
  render: () => <BesideLivePreviewDemo model="vestaboard_flagship" />,
};

/**
 * Cells the target cannot draw as written: on the ACME sign, `°` and `$`
 * draw as blank, the colour span draws without its colour, and the sun has
 * no glyph (its yellow tile fallback is drawn, marked). Each cell carries
 * a title with what draws instead; the summary under the surface is the
 * textbox's accessible description.
 */
export const UnsupportedCharacters: Story = {
  args: {
    value: "72° {{red:HOT}} {{icon:sun}} $\n{{icon:check}} {{black/white:OK}}",
    deviceType: undefined,
    deviceModel: ACME_MODEL,
  },
};

/**
 * The extended forms on a split-flap target: the flap draws the span's
 * letters without the colour and the sun as its yellow tile, and each marked
 * cell's title says so. (Before the coordinated major that shipped with
 * FiestaBoard's parser parity the board drew these markers literally, and the
 * summary said so instead.)
 */
export const FlapWithExtendedMarkup: Story = {
  name: "Split-flap with extended markup",
  args: {
    value: "{{red:HOT}} {{icon:sun}} 72°",
    deviceType: undefined,
    deviceModel: "vestaboard_flagship",
    code62Glyph: "heart",
  },
};
