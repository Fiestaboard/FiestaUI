import type { Meta, StoryObj } from "@storybook/react";

import { type BoardToken } from "../../lib/board-characters";
import { materializeCharacterSet } from "../../lib/character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL } from "../../lib/charset-golden-cases";
import { DEVICE_MODEL_IDS, type DeviceModel } from "../../lib/devices";
import { LED_TRANSITION_KINDS } from "../../lib/led-transitions";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import { DisplayPreview } from "./display-preview";

/*
 * One component, every device: each story below is the same call with a
 * different model. The built-ins are passed by id; the plugin-declared
 * models (FiestaPanel's two styles, the ACME sign) are passed as the
 * objects their manifests would carry, exactly as FiestaBoard will pass
 * them — none of them is a built-in, and their ids alone would throw.
 */

const meta = {
  title: "App/Board/DisplayPreview",
  component: DisplayPreview,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    model: {
      control: "select",
      options: DEVICE_MODEL_IDS,
      description: "A built-in model id, or (in code) a plugin's model object",
    },
    message: { control: "text", description: "Board markup; ignored when `cells` is given" },
    transition: {
      control: "select",
      options: [undefined, "none", ...LED_TRANSITION_KINDS],
      description: "LED: the transition menu entry. Split-flap: anything but none selects the animated BoardDisplay",
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    code62Glyph: { control: "select", options: ["degree", "heart"] },
    frame: { control: "select", options: ["none", "tv"], description: "Reserved: tv renders as none today" },
  },
} satisfies Meta<typeof DisplayPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const WEATHER = "72° SUNNY\nHI 78 LO 61\n{65}{65} UV 6\nAQI 42 {66}";

/* ---- Split-flap built-ins ------------------------------------------------ */

/** A Flagship built before 2026: its code-62 flap is the degree sign. */
export const FlagshipV1: Story = {
  name: "Flagship v1 (degree)",
  args: { model: "vestaboard_flagship", message: WEATHER, code62Glyph: "degree" },
};

/** A Flagship built since: the same message, and the flap draws a heart. */
export const FlagshipV2Heart: Story = {
  name: "Flagship v2 (heart)",
  args: { model: "vestaboard_flagship", message: WEATHER, code62Glyph: "heart" },
};

export const Note: Story = {
  args: { model: "vestaboard_note", message: "72° SUNNY\nAQI 42 GOOD\n{66}{66}{66}" },
};

/** Two Notes side by side: the model's `note_array` geometry takes the board's own notes wide × tall. */
export const NoteArray: Story = {
  args: {
    model: "vestaboard_note_array",
    message: "GOOD MORNING EVERYONE\n72° SUNNY  AQI 42",
    notesWide: 2,
    notesTall: 1,
  },
};

/** A virtual panel sized by the board: `gridRows` × `gridCols`. */
export const Panel: Story = {
  args: {
    model: "vestaboard_panel",
    message: "DEPARTURES\nN JUDAH   2 MIN\nKT        6 MIN",
    gridRows: 4,
    gridCols: 20,
  },
};

/* ---- LED built-ins ------------------------------------------------------- */

export const Pixoo64: Story = {
  name: "Pixoo 64",
  args: {
    model: "divoom_pixoo64",
    message: "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
  },
};

export const Hub75_128x64: Story = {
  name: "HUB75 128×64",
  args: {
    model: "hub75_128x64",
    message: "N JUDAH  2 MIN\nN JUDAH 14 MIN\nKT        6 MIN\n\n{63}{64}{65}{66}{67}{68}\nHAVE A GOOD DAY!",
    size: "sm",
  },
};

/** An 8-pixel-tall clock: eight characters of the 3×5 face. */
export const Awtrix: Story = {
  name: "AWTRIX (Ulanzi TC001)",
  args: { model: "ulanzi_tc001_awtrix", message: "72° {66}OK", size: "lg" },
};

/** Four chained 8×8 modules: one colour, every lit LED red. */
export const Max7219: Story = {
  name: "MAX7219 4-in-1",
  args: { model: "max7219_4in1", message: "{red:HOT} 91°", size: "lg" },
};

/* ---- Plugin-declared models --------------------------------------------- */

/**
 * FiestaPanel in its split-flap style, declared by FiestaBoard's plugin as
 * a `panel` with its size (12 × 29, a 55" TV) — not a built-in. The TV
 * bezel is not drawn yet: `frame="tv"` is reserved for it.
 */
export const FiestaPanelSplitFlap: Story = {
  name: "FiestaPanel (split-flap, plugin-declared)",
  args: {
    model: FIESTAPANEL_SPLIT_FLAP_MODEL as DeviceModel,
    message:
      "DEPARTURES\n\nN JUDAH      2 MIN\nN JUDAH     14 MIN\nKT INGLESIDE 6 MIN\n\n72° SUNNY  AQI 42\n{66}{66}{66} GOOD",
    frame: "tv",
  },
};

/** FiestaPanel in its LED-matrix style: 192 × 96 diffused pixels in the 5×7 face. */
export const FiestaPanelLedMatrix: Story = {
  name: "FiestaPanel (LED matrix, plugin-declared)",
  args: {
    model: FIESTAPANEL_LED_MATRIX_MODEL as DeviceModel,
    message:
      "DEPARTURES\n\nN JUDAH      2 MIN\n{red:N JUDAH     14 MIN}\nKT INGLESIDE 6 MIN\n\n{icon:sun} 72° SUNNY\n{black/white:AQI 42} GOOD",
    size: "sm",
    frame: "tv",
  },
};

/** A 48×12 amber sign nobody here has heard of, with a € glyph of its own. */
export const AcmeSign: Story = {
  name: "ACME sign (plugin-declared)",
  args: {
    model: {
      ...(JSON.parse(JSON.stringify(ACME_SIGN_MODEL)) as Omit<DeviceModel, "charset">),
      charset: materializeCharacterSet(ACME_SIGN_CHARSET),
    },
    message: "€12 {icon:up}",
    size: "lg",
  },
};

/* ---- Cells in ------------------------------------------------------------ */

const blank: BoardToken = { type: "char", value: " " };
/** One row of a cell grid, padded to the device's columns. */
const row = (cols: number, ...tokens: BoardToken[]): BoardToken[] =>
  Array.from({ length: cols }, (_, i) => tokens[i] ?? blank);
const chars = (text: string, span?: { color?: string; background?: string }): BoardToken[] =>
  [...text].map((value) => ({ type: "char", value, ...span }));

/**
 * The grid FiestaBoard core sends after parsing a message once: rich cells
 * with colour spans, a block, icons and tiles — never a message string. A
 * 64×64 Pixoo in the 3×5 face is 10 rows × 16 cells, every cell present.
 */
const PIXOO_CELLS: BoardToken[][] = [
  row(16, ...chars("MON OCT 3")),
  row(16),
  row(16, ...chars("09:30 ", { color: "orange" }), ...chars("STANDUP", { color: "orange" })),
  row(16, ...chars("12:00 LUNCH")),
  row(16, ...chars("15:00 1:1 "), { type: "char", value: "♥" }),
  row(16),
  row(16, ...chars("ON AIR", { color: "black", background: "white" })),
  row(16),
  row(16, { type: "char", value: " ", icon: "sun" }, ...chars(" 72° "), { type: "color", code: "65", icon: "up" }),
  row(
    16,
    { type: "color", code: "red" },
    { type: "color", code: "63" },
    { type: "color", code: "green" },
    ...chars(" 3 LEFT"),
  ),
];

/** A hand-built rich cell grid, as core would send it, on an LED matrix. */
export const CellsIn: Story = {
  name: "Cells in (rich grid from core)",
  args: { model: "divoom_pixoo64", cells: PIXOO_CELLS, size: "md" },
};

/** The same grid on a split-flap Note: spans lose their colour, icons draw their tile fallback. */
export const CellsInSplitFlap: Story = {
  name: "Cells in, split-flap",
  args: {
    model: "vestaboard_note",
    cells: [
      row(15, ...chars("MON OCT 3")),
      row(15, ...chars("ON AIR", { color: "black", background: "white" }), ...chars(" "), {
        type: "char",
        value: " ",
        icon: "sun",
      }),
      row(15, { type: "color", code: "red" }, { type: "color", code: "63" }, ...chars(" 3 LEFT ♥")),
    ],
  },
};

/* ---- Appearance options -------------------------------------------------- */

/** A board setting the model offers: the Vestaboard models list `board_color: black | white`. */
export const BoardColorOption: Story = {
  name: "Board colour (appearance.options)",
  args: { model: "vestaboard_note", message: "72° SUNNY\nAQI 42 GOOD\n{66}{66}{66}" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <figure className="flex flex-col items-center gap-2">
        <DisplayPreview {...args} appearance={{ board_color: "black" }} />
        <figcaption className="text-xs text-muted-foreground">board_color: black</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <DisplayPreview {...args} appearance={{ board_color: "white" }} />
        <figcaption className="text-xs text-muted-foreground">board_color: white</figcaption>
      </figure>
    </div>
  ),
};
