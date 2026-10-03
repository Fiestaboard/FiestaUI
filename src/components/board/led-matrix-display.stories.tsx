import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useEffect, useState } from "react";

import { deviceModelForPreset } from "../../lib/devices";
import { LED_MATRIX_PRESETS, LED_MONO_COLORS, type LedMatrixPresetId } from "../../lib/led-matrix";
import { transitionsForModel } from "../../lib/led-transition-registry";
import { LED_TRANSITION_KINDS, type LedTransitionKind } from "../../lib/led-transitions";
import { LedMatrixDisplay, type LedMatrixDisplayProps } from "./led-matrix-display";
import { StaticBoardDisplay } from "./static-board-display";

const meta = {
  title: "App/Board/LedMatrixDisplay",
  component: LedMatrixDisplay,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description:
        "Board message — the same markup a split-flap board takes: lines on \\n, {red} / {63} colour tiles, plus {red:TEXT} colour spans and {icon:sun} icons",
    },
    preset: { control: "select", options: Object.keys(LED_MATRIX_PRESETS) },
    matrixWidth: { control: { type: "number", min: 8, max: 256 } },
    matrixHeight: { control: { type: "number", min: 8, max: 256 } },
    font: { control: "select", options: ["3x5", "5x7"] },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "sm 4 / md 6 / lg 9 CSS px per LED, or a number of px",
    },
    pixelShape: { control: "select", options: ["round", "square"] },
    glow: { control: "boolean" },
    textColor: { control: "color" },
    monochrome: { control: "color", description: "Set for a single-colour panel: every lit LED is this colour" },
    letterCase: { control: "select", options: ["upper", "mixed"] },
    transition: {
      control: "select",
      options: [undefined, "none", ...LED_TRANSITION_KINDS],
      description: "Unset: the preset's device model decides (flip when its API is fast enough, else snap)",
    },
  },
} satisfies Meta<typeof LedMatrixDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const WEATHER = "72° SUNNY\nHI 78 LO 61\n{65}{65} UV 6\nAQI 42 {66}";

export const Default: Story = {
  args: { message: WEATHER, preset: "hub75_64x32" },
};

/** An 8-pixel-tall clock: one row of eight characters in the 3×5 face. */
export const Awtrix: Story = {
  args: { message: "72° {66}OK", preset: "awtrix", size: "lg" },
};

export const Hub75_128x64: Story = {
  name: "HUB75 128×64",
  args: {
    message: "N JUDAH  2 MIN\nN JUDAH 14 MIN\nKT        6 MIN\n\n{63}{64}{65}{66}{67}{68}\nHAVE A GOOD DAY!",
    preset: "hub75_128x64",
    size: "sm",
  },
};

export const Square64: Story = {
  name: "Pixoo 64 (small font)",
  args: {
    message: "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
    preset: "pixoo64",
    font: "3x5",
  },
};

export const AmberText: Story = {
  args: { message: WEATHER, preset: "hub75_64x32", textColor: "#ffb000" },
};

export const NoGlow: Story = {
  args: { message: WEATHER, preset: "hub75_64x32", glow: false },
};

export const Empty: Story = {
  args: { message: null, preset: "hub75_64x32" },
};

/** Narrow slot: the canvas scales down by its own aspect ratio, no JS. */
export const PhoneWidth: Story = {
  args: { message: WEATHER, preset: "hub75_128x64", size: "lg" },
  decorators: [
    (Story) => (
      <div style={{ width: 311 }}>
        <Story />
      </div>
    ),
  ],
};

/** The same message on both kinds of board. */
export const BesideSplitFlap: Story = {
  args: { message: "GOOD MORNING\n72° SUNNY\n{66}{66}{66} AQI 42", preset: "hub75_128x64", size: "sm" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <StaticBoardDisplay message={args.message} size="md" deviceType="note" />
      {/* The Note's code-62 flap is a heart, so the LED draws one too. */}
      <LedMatrixDisplay {...args} code62Glyph="heart" />
    </div>
  ),
};

/* ---- Colour text ------------------------------------------------------- */

/**
 * `{red:TEXT}` colours the letters; `{red}` is still a tile. Both are one
 * message string, and a split-flap board draws the span as plain letters.
 */
export const ColorText: Story = {
  args: {
    message: "72° {orange:WARM}\nH {red:91}  L {blue:61}\nUV{yellow:6} AQI{green:42}\n{#ff6ad5:ANY HEX} {66}",
    preset: "hub75_64x32",
  },
};

/**
 * The span degrades: on the flap the letters stay, the colour goes. The flap
 * side passes `extendedMarkup` explicitly — the **future state**, once
 * FiestaBoard's Python renderer parses spans. Today's hardware would draw the
 * braces literally; see `TodaysSplitFlap`.
 */
export const ColorTextBesideSplitFlap: Story = {
  args: { message: "{red:RED} ALERT {red}\n{green:ALL CLEAR}", preset: "hub75_64x32", size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <figure className="flex flex-col items-center gap-2">
        <StaticBoardDisplay message={args.message} size="md" deviceType="note" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">Note, extendedMarkup (future state)</figcaption>
      </figure>
      <LedMatrixDisplay {...args} />
    </div>
  ),
};

/** What a split-flap board draws for the new markup *today*: literal text. */
export const TodaysSplitFlap: Story = {
  args: { message: "{red:RED} ALERT\n{icon:sun} 72°", preset: "hub75_64x32", size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <figure className="flex flex-col items-center gap-2">
        <StaticBoardDisplay message={args.message} size="md" deviceType="note" />
        <figcaption className="text-xs text-muted-foreground">
          Note today: the Python renderer has no span or icon grammar yet
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <StaticBoardDisplay message={args.message} size="md" deviceType="note" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">
          Note with extendedMarkup: the planned degradation
        </figcaption>
      </figure>
      <LedMatrixDisplay {...args} />
    </div>
  ),
};

/* ---- Icons and character sets ------------------------------------------ */

/** `{icon:name}` is one cell, drawn in the icon's own colour. */
export const Icons: Story = {
  args: {
    message:
      "{icon:sun}{icon:cloud}{icon:rain}{icon:snow}{icon:bolt}{icon:bell}{icon:music}\n{icon:check}{icon:cross}{icon:up}{icon:down}{icon:star}{icon:bus}{icon:train}\n\n{icon:sun} 72° {icon:up}3\n{icon:bus} 14  {icon:train} 2\n{icon:check} ALL CLEAR",
    preset: "hub75_64x64",
    size: "md",
  },
};

/**
 * On the flap, every icon becomes its fallback: a tile that means the same
 * thing, or a character. The flap side passes `extendedMarkup` (future state).
 */
export const IconsBesideSplitFlap: Story = {
  args: {
    message: "{icon:sun} 72° UV 6\n{icon:rain} LATER\nAQI {icon:up} 42 {icon:check}",
    preset: "hub75_64x32",
    size: "lg",
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <figure className="flex flex-col items-center gap-2">
        <StaticBoardDisplay message={args.message} size="md" deviceType="note" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">Note, extendedMarkup (future state)</figcaption>
      </figure>
      <LedMatrixDisplay {...args} />
    </div>
  ),
};

/** `letterCase="mixed"` keeps the message's case; the faces carry lowercase. */
export const MixedCase: Story = {
  args: {
    message:
      "Now playing\n{violet:Bad Guy}\nBillie Eilish\n{icon:music} 2:14 / 3:14\n\nthe quick brown fox\njumps over the lazy dog",
    preset: "hub75_128x64",
    letterCase: "mixed",
    size: "sm",
  },
};

export const MixedCaseSmallFont: Story = {
  name: "Mixed case, 3×5",
  args: {
    message: "Hello world\nabcdefghijklm\nnopqrstuvwxyz\nNow playing ♥",
    preset: "pixoo64",
    font: "3x5",
    letterCase: "mixed",
  },
};

/* ---- Monochrome panels ------------------------------------------------- */

/** A red MAX7219 ticker: tiles, spans and icons all become "lit". */
export const Monochrome: Story = {
  args: { message: "{66}72°{red:HOT}{icon:sun}", preset: "max7219", size: "lg" },
};

/** The preset's colour can be overridden — an amber P10 module. */
export const MonochromeAmber: Story = {
  args: { message: "OPEN\n{green:9-5}", preset: "p10_32x16", monochrome: LED_MONO_COLORS.amber, size: "lg" },
};

/** One message, an RGB clock and a red 1-bit ticker of the same size. */
export const MonochromeBesideRgb: Story = {
  args: { message: "{63}{red:HI} 72°{66}", preset: "awtrix", size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <LedMatrixDisplay {...args} />
      <LedMatrixDisplay {...args} preset="max7219" />
      <LedMatrixDisplay {...args} preset="max7219" monochrome={LED_MONO_COLORS.green} />
    </div>
  ),
};

/* ---- Transitions ------------------------------------------------------- */

/** Cycles through messages: a "Next message" button, and optionally a timer. */
function Cycler({
  messages,
  intervalMs,
  children,
}: {
  messages: string[];
  intervalMs?: number;
  children: (message: string) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, messages.length]);
  return (
    <div className="flex flex-col items-center gap-4">
      {children(messages[index])}
      <button
        type="button"
        data-testid="next-message"
        className="rounded-md border px-3 py-1 text-sm"
        onClick={() => setIndex((i) => (i + 1) % messages.length)}
      >
        Next message
      </button>
    </div>
  );
}

const TRANSIT_A = "N JUDAH  2 MIN\nN JUDAH 14 MIN\nKT        6 MIN\n\n{66} ON TIME";
const TRANSIT_B = "N JUDAH  1 MIN\nN JUDAH 13 MIN\nKT        5 MIN\n\n{65} 2 MIN LATE";
const TRANSIT_C = "N JUDAH DUE\nN JUDAH 12 MIN\nKT        4 MIN\n\n{63} DELAYED";

const transitionStory = (transition: LedTransitionKind, extra: Partial<LedMatrixDisplayProps> = {}): Story => ({
  args: { message: TRANSIT_A, preset: "hub75_128x64", size: "sm", transition, ...extra },
  render: (args) => (
    <Cycler messages={[TRANSIT_A, TRANSIT_B, TRANSIT_C]}>
      {(message) => <LedMatrixDisplay {...args} message={message} announceUpdates />}
    </Cycler>
  ),
});

/**
 * The FiestaBoard flip: every changing cell scrambles through six glyphs
 * drawn from the board's own character set — letters, digits, tiles, icons —
 * one per 80 ms with a half-flap between them, then lands on its target.
 * Cells start up to six steps apart, so the board settles as a cascade. The
 * scramble is seeded from the cell and the change, so it is the same every
 * time; it does not walk Vestaboard's character order.
 */
export const FlipTransition: Story = transitionStory("flip");
/** One flip per changed cell, in reading order, across 480ms. */
export const CascadeTransition: Story = transitionStory("cascade");
/** The new frame pushes the old one up — AWTRIX's default app switch. */
export const SlideTransition: Story = transitionStory("slide");
/** A left-to-right curtain. */
export const WipeTransition: Story = transitionStory("wipe");
/** A crossfade: on hardware, a real brightness ramp. */
export const FadeTransition: Story = transitionStory("fade");
/** Pixels switch in a fixed pseudo-random order — the same order on every device. */
export const DissolveTransition: Story = transitionStory("dissolve");

/** A quicker flip: `{ kind: "flip", stepMs: 40 }`. */
export const FlipQuick: Story = transitionStory("flip", { transition: { kind: "flip", stepMs: 40 } });

/** Every kind at once, retargeting every 4 s. */
export const AllTransitions: Story = {
  args: { message: TRANSIT_A, preset: "hub75_64x32", size: "sm" },
  render: (args) => (
    <Cycler
      messages={[
        "72° SUNNY\nUV 6 {65}\nAQI 42 {66}",
        "68° CLOUDY\nUV 2 {66}\nAQI 55 {65}",
        "61° RAIN\nUV 1 {66}\nAQI 30 {66}",
      ]}
      intervalMs={4000}
    >
      {(message) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LED_TRANSITION_KINDS.map((kind) => (
            <figure key={kind} className="flex flex-col items-center gap-1">
              <LedMatrixDisplay {...args} message={message} transition={kind} />
              <figcaption className="text-xs text-muted-foreground">{kind}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </Cycler>
  ),
};

/** The flip on a mono ticker: the scramble in one colour. */
export const FlipMonochrome: Story = {
  args: { message: "72° {66}OK", preset: "max7219", size: "lg", transition: "flip" },
  render: (args) => (
    <Cycler messages={["72° {66}OK", "68° {65}UV2", "{red:61°} RAIN"]}>
      {(message) => <LedMatrixDisplay {...args} message={message} />}
    </Cycler>
  ),
};

/* ---- FiestaBoard examples ---------------------------------------------- */

/** A weather page with icons, coloured temperatures and a tile UV bar. */
export const WeatherDashboard: Story = {
  args: {
    message:
      "{icon:sun} SAN FRANCISCO\n{red:72°} FEELS 70°\nHI {orange:78} LO {blue:61}\nUV {65}{65}{65}{65}{65}{65} 6/11\nAQI {green:42} GOOD\n\nTUE {icon:cloud} 68° {icon:rain} 40%\nWED {icon:sun} 75° {icon:up}",
    preset: "hub75_128x64",
    size: "sm",
  },
};

/** Arrivals with line colours as spans — Muni's N is blue, the KT red. */
export const TransitArrivals: Story = {
  args: {
    message:
      "{icon:train} {blue:N} JUDAH    2 MIN\n{icon:train} {red:KT} 3RD     6 MIN\n{icon:bus} {orange:22} FILLMORE 4 MIN\n{icon:bus} {green:38} GEARY   DUE\n\n{65} 22 RUNNING LATE\n{66} ALL OTHERS ON TIME",
    preset: "hub75_128x64",
    size: "sm",
  },
};

/** A scoreboard on a 64×32 — the second row is the live state. */
export const SportsScore: Story = {
  args: {
    message: "{orange:SF} 4 {blue:LAD} 2\nTOP 7TH\n{icon:up} GIANTS\n{66}{66}{66}{66}{66}{66}{66}{65}{65}{65}",
    preset: "hub75_64x32",
  },
};

/** An agenda on a Pixoo, in mixed case. */
export const CalendarAgenda: Story = {
  args: {
    message:
      "Mon Oct 3\n\n{63}  09:30 Standup\n{66}  12:00 Lunch\n{67}  15:00 1:1 ♥\n{65}  17:00 Gym\n\n{red:3 left today}",
    preset: "pixoo64",
    font: "3x5",
    letterCase: "mixed",
  },
};

/** A countdown with a tile progress bar. */
export const Countdown: Story = {
  args: {
    message: "{icon:star} 12 DAYS\nTO LAUNCH\n{66}{66}{66}{66}{66}{66}{66}{70}{70}{70}\n{green:70%} DONE",
    preset: "hub75_64x32",
    size: "lg",
  },
};

/** Colour-tile art, straight from a FiestaBoard template: a sunrise. */
export const ColorTileArt: Story = {
  args: {
    message: [
      "{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}{68}",
      "{68}{68}{68}{68}{68}{68}{67}{67}{67}{67}{68}{68}{68}{68}{68}{68}",
      "{68}{68}{68}{68}{64}{64}{65}{65}{65}{65}{64}{64}{68}{68}{68}{68}",
      "{68}{68}{68}{64}{65}{65}{65}{65}{65}{65}{65}{65}{64}{68}{68}{68}",
      "{63}{63}{64}{64}{65}{65}{65}{65}{65}{65}{65}{65}{64}{64}{63}{63}",
      "{63}{63}{63}{64}{64}{64}{64}{64}{64}{64}{64}{64}{64}{63}{63}{63}",
      "{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}",
      "{67}{67}{69}{67}{67}{67}{67}{69}{67}{67}{67}{67}{67}{69}{67}{67}",
      "   GOOD MORNING",
      "  {icon:sun} 72° SUNNY",
    ].join("\n"),
    preset: "hub75_64x64",
    font: "3x5",
    pixelShape: "square",
  },
};

/** The same transit message on a 32×8 clock and a 6×22 flagship. */
export const SmallMatrixVsFlagship: Story = {
  args: { message: "N 2 MIN\nKT 6 MIN\n{66} ON TIME", preset: "awtrix", size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <StaticBoardDisplay message={args.message} size="sm" deviceType="flagship" />
      <LedMatrixDisplay {...args} />
    </div>
  ),
};

/** One plugin message, every board FiestaBoard drives. The Note passes `extendedMarkup` (future state). */
export const OnePluginEveryBoard: Story = {
  args: { message: "{icon:sun} 72° SUNNY\nUV {65}{65}{65} 6\nAQI {green:42}", preset: "hub75_64x32" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <StaticBoardDisplay message={args.message} size="md" deviceType="note" extendedMarkup />
      <div className="flex flex-wrap items-start justify-center gap-6">
        <LedMatrixDisplay {...args} />
        <LedMatrixDisplay {...args} preset="pixoo64" font="3x5" size="sm" />
      </div>
      <div className="flex flex-wrap items-start justify-center gap-6">
        <LedMatrixDisplay {...args} preset="awtrix" size="lg" />
        <LedMatrixDisplay {...args} preset="max7219" size="lg" />
      </div>
    </div>
  ),
};

/* ---- Revision 5: Pixoo 64 first, block text, charsets, device defaults --- */

const PIXOO_PAGES = [
  "{icon:sun} SAN FRANCISCO\n{red:72°} FEELS 70°\nHI {orange:78} LO {blue:61}\nUV {65}{65}{65} 6/11\nAQI {green:42} GOOD\n\n{black/white: TUE } {icon:cloud} 68°\n{black/white: WED } {icon:sun} 75°",
  "{icon:train} {blue:N} JUDAH 2 MIN\n{icon:train} {red:KT} 3RD  6 MIN\n{icon:bus} {orange:22} FILL 4 MIN\n\n{white/red: DELAYED }\n22 FILLMORE +12",
  "Now playing\n{violet:Bad Guy}\nBillie Eilish\n{icon:music} 2:14 / 3:14\n\n{black/green: PLAYING }",
];

/**
 * The first test device. A Pixoo 64 takes a whole animation (`Draw/SendHttpGif`,
 * ≤ 32 frames at `PicSpeed` ms) and plays it locally, so its default is a
 * coarse flip: 80 ms a step, one frame per step, no half-flaps — exactly what
 * the uploaded sequence will show. Press "Next message" to see it.
 */
export const Pixoo64Featured: Story = {
  args: { message: PIXOO_PAGES[0], preset: "pixoo64", letterCase: "mixed", size: "md" },
  render: (args) => (
    <Cycler messages={PIXOO_PAGES}>
      {(message) => <LedMatrixDisplay {...args} message={message} announceUpdates />}
    </Cycler>
  ),
};

/**
 * Block spans: `{fg/bg:TEXT}` lights the cell background. `{black/white:…}` is
 * inverse video — a status pill, a ticker label, a highlighted transit line.
 */
export const BlockText: Story = {
  args: {
    message:
      "{black/white: ON AIR }  STUDIO 2\n{white/red: LIVE } 14:02\n\n{black/yellow: 22 } FILLMORE  4 MIN\n{black/blue: N } JUDAH     2 MIN\n{white/green: OK } ALL CLEAR",
    preset: "hub75_128x64",
    // Inverse glyphs need the pitch: at `sm` the bloom of a lit block fills
    // the unlit glyph pixels. Six px per LED reads; so does `glow={false}`.
    size: "md",
  },
};

/** The same spans on a 1-bit panel: a block is always inverse video there. */
export const BlockTextMonochrome: Story = {
  args: { message: "{black/white:OPEN}9-5", preset: "p10_32x16", monochrome: LED_MONO_COLORS.amber, size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <LedMatrixDisplay {...args} />
      <LedMatrixDisplay {...args} preset="max7219" monochrome={LED_MONO_COLORS.red} message="{red/blue:HOT} 72°" />
    </div>
  ),
};

/** Block text beside the flap: the letters survive, the block does not (future state). */
export const BlockTextBesideSplitFlap: Story = {
  args: { message: "{black/white: ON AIR } 2\n{white/red:LATE} 22", preset: "hub75_64x32", size: "lg" },
  render: (args) => (
    <div className="flex flex-col items-center gap-6">
      <figure className="flex flex-col items-center gap-2">
        <StaticBoardDisplay message={args.message} size="md" deviceType="note" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">Note, extendedMarkup (future state)</figcaption>
      </figure>
      <LedMatrixDisplay {...args} />
    </div>
  ),
};

const CHARSET_MESSAGE = "{icon:sun} 72° Sunny\n{red:HOT} {black/white:UV 6}\nAQI {green:42} {icon:up}";

/**
 * One message across device models with their character sets applied:
 * Flagship v1 draws °, Note draws ♥ (and both drop spans and icons to their
 * fallbacks, shown as the future state behind `extendedMarkup`); the Pixoo
 * draws everything; the AWTRIX 3×5 face has fewer icons; the MAX7219 is one
 * colour and inverse video for the block.
 */
export const OneMessageEveryCharset: Story = {
  args: { message: CHARSET_MESSAGE, preset: "pixoo64", letterCase: "mixed", size: "md" },
  render: (args) => (
    <div className="flex flex-col items-center gap-5">
      <figure className="flex flex-col items-center gap-1">
        <StaticBoardDisplay message={args.message} size="sm" deviceType="flagship" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">
          Flagship · vestaboard_v1 (° flap) · extendedMarkup, future state
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-1">
        <StaticBoardDisplay message={args.message} size="sm" deviceType="note" extendedMarkup />
        <figcaption className="text-xs text-muted-foreground">Note · vestaboard_v2 (♥ flap)</figcaption>
      </figure>
      <div className="flex flex-wrap items-start justify-center gap-5">
        <figure className="flex flex-col items-center gap-1">
          <LedMatrixDisplay {...args} />
          <figcaption className="text-xs text-muted-foreground">Pixoo 64 · led_3x5 (its default face)</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <LedMatrixDisplay {...args} preset="awtrix" size="lg" />
          <figcaption className="text-xs text-muted-foreground">AWTRIX · led_3x5</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <LedMatrixDisplay {...args} preset="max7219" size="lg" />
          <figcaption className="text-xs text-muted-foreground">MAX7219 · led_3x5, monochrome</figcaption>
        </figure>
      </div>
    </div>
  ),
};

const LED_MODEL_IDS = Object.keys(LED_MATRIX_PRESETS) as LedMatrixPresetId[];
const describeDefault = (id: LedMatrixPresetId) => {
  const flip = transitionsForModel(deviceModelForPreset(id)).find((t) => t.id === "flip")!;
  if (!flip.available || flip.spec === null || flip.spec === "none") return "snap";
  const spec = flip.spec;
  const how = spec.maxFrames ? `${spec.maxFrames} frames` : spec.halfFlap === false ? "coarse" : "half-flaps";
  return `flip, ${spec.stepMs ?? 80} ms, ${how}`;
};

/**
 * Every LED model with the transition its API earns by default: full flip
 * for streams at ≥ 25 fps (HUB75, WLED, local MAX7219/P10), a coarse flip for
 * sequence players (Pixoo 64, Tronbyt), a snap for AWTRIX. Press "Next
 * message" and compare.
 */
export const DefaultTransitionByDevice: Story = {
  args: { message: "72° {66}OK", size: "sm" },
  render: (args) => (
    <Cycler messages={["72° {66}OK", "68° {65}UV2", "61° {63}RAIN"]}>
      {(message) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LED_MODEL_IDS.map((id) => (
            <figure key={id} className="flex flex-col items-center gap-1">
              <LedMatrixDisplay {...args} message={message} preset={id} size={id === "hub75_128x64" ? 2 : "sm"} />
              <figcaption className="text-xs text-muted-foreground">
                {deviceModelForPreset(id).label} · {describeDefault(id)}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Cycler>
  ),
};

const STATUS_PAGES = [
  "{black/white: OPEN }  9-5\n{black/green: OK } ALL CLEAR\n\n{white/red: SF } 4  {white/blue: LAD } 2",
  "{black/yellow: BUSY } 9-5\n{black/green: OK } ALL CLEAR\n\n{white/red: SF } 5  {white/blue: LAD } 2",
  "{white/red: CLOSED }\n{black/yellow: !! } 1 ALERT\n\n{white/red: SF } 5  {white/blue: LAD } 3",
];

/** Block-colour text flipping: the pill's field stays lit while its glyphs turn. */
export const BlockFlip: Story = {
  args: { message: STATUS_PAGES[0], preset: "hub75_64x32", transition: "flip", size: "md" },
  render: (args) => (
    <Cycler messages={STATUS_PAGES}>{(message) => <LedMatrixDisplay {...args} message={message} />}</Cycler>
  ),
};

/**
 * The Pixoo's hard 32-frame budget: a long flip (`scrambleSteps: 40`,
 * `stagger: 20` would be 62 frames) is compressed into exactly 32 — stagger
 * first, then scramble — and still lands on the final frame.
 */
export const Pixoo64Budget: Story = {
  args: {
    message: PIXOO_PAGES[0],
    preset: "pixoo64",
    letterCase: "mixed",
    size: "md",
    transition: { kind: "flip", scrambleSteps: 40, stagger: 20 },
  },
  render: (args) => (
    <Cycler messages={PIXOO_PAGES}>{(message) => <LedMatrixDisplay {...args} message={message} />}</Cycler>
  ),
};
