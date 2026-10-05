/**
 * Story-only support for Showcase/Display Outputs: the device catalogue the
 * playground picks from, a realistic FiestaBoard template for each device,
 * the stand-in that turns a template into the message markup
 * `DisplayPreview` reads, and the facts the device card shows.
 *
 * Nothing here is exported from the package. Everything it describes is:
 * the stories compose `DisplayPreview`, `TemplateEditor`,
 * `LedTransitionPicker`, `CharacterSetSpecimen` and `TvFrame` as an app
 * would, with the device data (`src/lib/devices`, the plugin fixtures) as
 * FiestaBoard hands it over.
 */

import { Clock, Cloud, TrainFront, TrendingUp } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import type { TvFrameOptions } from "../components/board/tv-frame";
import type { TemplateEditorToolbarSlotProps } from "../components/editor/template-editor";
import type { ToolbarTemplateVariables } from "../components/editor/template-editor-toolbar";
import { createLucideIconResolver, type PluginManifest } from "../components/editor/variable-picker-content";
import { type Code62Glyph, parseLine } from "../lib/board-characters";
import { type CharacterSet, materializeCharacterSet } from "../lib/character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL } from "../lib/charset-golden-cases";
import {
  characterSetForModel,
  DEVICE_FAMILIES,
  type DeviceFamilyId,
  type DeviceModel,
  type DeviceModelRef,
  ledSpecForModel,
  resolveDeviceModel,
} from "../lib/devices";
import { ledGridLayout, type LedLetterCase } from "../lib/led-matrix";
import { defaultTransitionIdForModel, type LedTransitionId, transitionsForModel } from "../lib/led-transition-registry";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../lib/plugin-model-fixtures";
import { cn } from "../lib/utils";

/* ---- Plugin-declared models, as FiestaBoard hands them over ------------- */

/** The ACME sign: the declared JSON with its declared set made whole. */
export const ACME_MODEL: DeviceModel = {
  ...(JSON.parse(JSON.stringify(ACME_SIGN_MODEL)) as Omit<DeviceModel, "charset">),
  charset: materializeCharacterSet(ACME_SIGN_CHARSET),
};
export const FIESTAPANEL_SPLIT_FLAP = FIESTAPANEL_SPLIT_FLAP_MODEL as DeviceModel;
export const FIESTAPANEL_LED = FIESTAPANEL_LED_MATRIX_MODEL as DeviceModel;

/* ---- The template toolbar's inputs --------------------------------------- */

const resolveIcon = createLucideIconResolver({ Cloud, Clock, TrendingUp, TrainFront });

/** A `/templates/variables` payload: the plugins the seed templates draw on. */
export const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: {
    weather: ["temperature", "condition", "high", "low"],
    datetime: ["time", "date", "day"],
    transit: ["line", "eta", "line2", "eta2"],
    stocks: ["symbol", "price", "change_percent"],
  },
  variable_metadata: {
    weather: {
      temperature: { description: "Current temperature.", preview: "72" },
      condition: { description: "Short description of the sky.", max_length: 12, preview: "SUNNY" },
      high: { description: "Forecast high.", preview: "78" },
      low: { description: "Forecast low.", preview: "61" },
    },
    datetime: {
      time: { description: "Local time.", preview: "9:41" },
      date: { description: "Local date.", preview: "OCT 3" },
      day: { description: "Day of the week.", preview: "FRI" },
    },
    transit: {
      line: { description: "Next line to arrive.", preview: "N JUDAH" },
      eta: { description: "Minutes until it arrives.", preview: "2" },
      line2: { description: "The line after that.", preview: "KT" },
      eta2: { description: "Its minutes.", preview: "6" },
    },
    stocks: {
      symbol: { description: "Ticker symbol.", preview: "AAPL" },
      price: { description: "Last price.", preview: "182.5" },
      change_percent: { description: "Change today.", preview: "+1.2" },
    },
  },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
  formatting: {
    fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line to the right edge" },
  },
};

const PLUGIN_MANIFESTS: Record<string, PluginManifest> = {
  weather: { icon: "cloud" },
  datetime: { icon: "clock" },
  transit: { icon: "train-front" },
  stocks: { icon: "trending-up" },
};

export const TOOLBAR_PROPS: TemplateEditorToolbarSlotProps = {
  templateVariables: TEMPLATE_VARIABLES,
  pluginManifests: PLUGIN_MANIFESTS,
  resolveIcon,
};

/** The sample values the previews substitute for the variables above. */
export const SAMPLE_VALUES: Record<string, string> = {
  "weather.temperature": "72",
  "weather.condition": "SUNNY",
  "weather.high": "78",
  "weather.low": "61",
  "datetime.time": "9:41",
  "datetime.date": "OCT 3",
  "datetime.day": "FRI",
  "transit.line": "N JUDAH",
  "transit.eta": "2",
  "transit.line2": "KT",
  "transit.eta2": "6",
  "stocks.symbol": "AAPL",
  "stocks.price": "182.5",
  "stocks.change_percent": "+1.2",
};

/**
 * Template text → the board markup `DisplayPreview` reads: variables get
 * their sample values, formulas show as `…`, `{{fill_space}}` pads the line
 * to the device's columns, and the double-braced tokens become the
 * single-braced message markup. A stand-in for FiestaBoard's template
 * engine, not the engine itself.
 */
export function previewFromTemplate(template: string, cols: number): string {
  return template
    .split("\n")
    .map((line) => {
      const substituted = line
        .replace(/\{\{=[^}]*\}\}/g, "…")
        .replace(/\{\{([a-z_]+\.[a-z_.0-9]+)(\|[^}]*)?\}\}/gi, (_m, path: string) => SAMPLE_VALUES[path] ?? "?")
        .replaceAll("{{", "{")
        .replaceAll("}}", "}");
      const fill = substituted.indexOf("{fill_space}");
      if (fill === -1) return substituted;
      const left = substituted.slice(0, fill);
      const right = substituted.slice(fill + "{fill_space}".length);
      // The parser counts cells exactly: an icon is one, a span its letters.
      const used =
        parseLine(left, Infinity, { extendedMarkup: true }).length +
        parseLine(right, Infinity, { extendedMarkup: true }).length;
      return `${left}${" ".repeat(Math.max(1, cols - used))}${right}`;
    })
    .join("\n");
}

/* ---- The device catalogue ------------------------------------------------ */

export type ShowcaseGroup = "Split-flap" | "LED matrix" | "Plugin-declared";

export interface ShowcaseDevice {
  /** The select's value and the editor's key. */
  key: string;
  label: string;
  group: ShowcaseGroup;
  /** A built-in id, or a plugin's model object. */
  model: DeviceModelRef;
  code62Glyph?: Code62Glyph;
  /** Note array / panel: the board's own geometry. */
  notesWide?: number;
  notesTall?: number;
  gridRows?: number;
  gridCols?: number;
  /** On a television (the FiestaPanel models). */
  tv?: TvFrameOptions;
  /** Renderer size for the playground preview. */
  size?: "sm" | "md" | "lg";
  /** The seed template and the one "Next message" swaps in. */
  templates: [string, string];
}

const FLAGSHIP_HEADER = "{{datetime.day}} {{datetime.date}}{{fill_space}}{{datetime.time}}";
const UV_BAR = "{{65}}{{65}}{{65}}{{65}}{{65}}{{65}}{{70}}{{70}}{{70}}{{70}}";

export const SHOWCASE_DEVICES: readonly ShowcaseDevice[] = [
  /* Split-flap built-ins */
  {
    key: "flagship_v1",
    label: "Vestaboard Flagship v1 (degree flap)",
    group: "Split-flap",
    model: "vestaboard_flagship",
    code62Glyph: "degree",
    templates: [
      [
        "{{66}} GOOD MORNING {{66}}",
        FLAGSHIP_HEADER,
        "",
        "{{weather.condition}} {{weather.temperature}}°",
        "HI {{weather.high}} LO {{weather.low}} UV 6",
        `${UV_BAR} AQI 42`,
      ].join("\n"),
      [
        "{{63}} HEAT ADVISORY {{63}}",
        FLAGSHIP_HEADER,
        "",
        "HOT AND DRY 91°",
        "HI 95 LO 70 UV 10",
        "{{63}}{{63}}{{63}}{{63}}{{63}}{{63}}{{63}}{{63}}{{63}}{{63}} AQI 88",
      ].join("\n"),
    ],
  },
  {
    key: "flagship_v2",
    label: "Vestaboard Flagship v2 (heart flap)",
    group: "Split-flap",
    model: "vestaboard_flagship",
    code62Glyph: "heart",
    templates: [
      [
        "{{64}} HAPPY BIRTHDAY ♥",
        FLAGSHIP_HEADER,
        "",
        "CAKE AT 3PM, KITCHEN",
        "{{weather.condition}} {{weather.temperature}}° OUTSIDE",
        "♥ ♥ ♥ {{63}}{{64}}{{65}}{{66}}{{67}}{{68}}",
      ].join("\n"),
      [
        "{{67}} SEE YOU TONIGHT ♥",
        FLAGSHIP_HEADER,
        "",
        "DINNER AT 7, PATIO",
        "BRING A JACKET 61°",
        "{{68}}{{67}}{{66}}{{65}}{{64}}{{63}} ♥ ♥ ♥",
      ].join("\n"),
    ],
  },
  {
    key: "note",
    label: "Vestaboard Note",
    group: "Split-flap",
    model: "vestaboard_note",
    templates: [
      "{{datetime.time}} {{weather.temperature}}° ♥\n{{weather.condition}}\n{{66}}{{66}}{{66}} AQI 42",
      "{{datetime.time}} 68° ♥\nCLOUDY\n{{65}}{{65}} AQI 55",
    ],
  },
  {
    key: "note_array",
    label: "Vestaboard Note array (2 × 1)",
    group: "Split-flap",
    model: "vestaboard_note_array",
    notesWide: 2,
    notesTall: 1,
    templates: [
      [
        "{{66}} GOOD MORNING {{datetime.day}}{{fill_space}}{{datetime.time}}",
        "{{weather.condition}} {{weather.temperature}}° HI {{weather.high}} LO {{weather.low}}",
        "{{65}}{{65}}{{65}}{{65}}{{65}}{{65}} UV 6 ♥ AQI 42 GOOD",
      ].join("\n"),
      [
        "{{67}} GOOD EVENING {{datetime.day}}{{fill_space}}{{datetime.time}}",
        "CLEAR 64° LOW TONIGHT 55",
        "{{68}}{{68}} UV 0 ♥ AQI 30 GOOD",
      ].join("\n"),
    ],
  },
  {
    key: "panel",
    label: "Virtual panel (4 × 20)",
    group: "Split-flap",
    model: "vestaboard_panel",
    gridRows: 4,
    gridCols: 20,
    templates: [
      [
        "DEPARTURES {{datetime.time}}",
        "{{transit.line}}{{fill_space}}{{transit.eta}} MIN",
        "{{transit.line2}}{{fill_space}}{{transit.eta2}} MIN",
        "{{66}} ALL ON TIME",
      ].join("\n"),
      [
        "DEPARTURES {{datetime.time}}",
        "{{transit.line}}{{fill_space}}DUE",
        "{{transit.line2}}{{fill_space}}12 MIN",
        "{{65}} KT RUNNING LATE",
      ].join("\n"),
    ],
  },
  /* LED built-ins */
  {
    key: "pixoo64",
    label: "Divoom Pixoo 64",
    group: "LED matrix",
    model: "divoom_pixoo64",
    templates: [
      [
        "{{datetime.day}} {{datetime.date}}",
        "{{yellow:{{datetime.time}}}}",
        "",
        "{{icon:sun}} {{weather.temperature}}° Sunny",
        "Hi {{weather.high}} Lo {{weather.low}}",
        "",
        "{{green:09:30}} Standup",
        "{{blue:12:00}} Lunch",
        "{{red:15:00}} 1:1 ♥",
        "{{black/white:3 left}}",
      ].join("\n"),
      [
        "{{datetime.day}} {{datetime.date}}",
        "{{yellow:{{datetime.time}}}}",
        "",
        "{{icon:rain}} 61° Rain",
        "Hi 64 Lo 55",
        "",
        "{{green:16:00}} Review",
        "{{blue:17:00}} Gym",
        "{{red:19:00}} Dinner ♥",
        "{{black/white:all done}}",
      ].join("\n"),
    ],
  },
  {
    key: "hub75_64x32",
    label: "HUB75 64×32",
    group: "LED matrix",
    model: "hub75_64x32",
    size: "md",
    templates: [
      [
        "{{icon:sun}} {{yellow:{{weather.temperature}}°}}",
        "{{weather.condition}}",
        "H{{weather.high}} L{{weather.low}}",
        "{{black/white:AQI 42}} ok",
      ].join("\n"),
      ["{{icon:rain}} {{blue:61°}}", "RAIN", "H64 L55", "{{black/white:AQI 30}} ok"].join("\n"),
    ],
  },
  {
    key: "hub75_64x64",
    label: "HUB75 64×64",
    group: "LED matrix",
    model: "hub75_64x64",
    size: "md",
    templates: [
      [
        "{{icon:train}} TRANSIT",
        "{{blue:N}} JUDAH {{transit.eta}}m",
        "{{red:KT}} 3RD {{transit.eta2}}m",
        "{{icon:bus}} {{orange:22}} 4m",
        "",
        "{{icon:sun}} {{weather.temperature}}° UV6",
        "H{{weather.high}} L{{weather.low}}",
        "{{66}} on time",
      ].join("\n"),
      [
        "{{icon:train}} TRANSIT",
        "{{blue:N}} JUDAH DUE",
        "{{red:KT}} 3RD 12m",
        "{{icon:bus}} {{orange:22}} 9m",
        "",
        "{{icon:cloud}} 68° UV2",
        "H70 L58",
        "{{65}} KT late",
      ].join("\n"),
    ],
  },
  {
    key: "hub75_128x64",
    label: "HUB75 128×64",
    group: "LED matrix",
    model: "hub75_128x64",
    templates: [
      [
        "{{icon:sun}} SAN FRANCISCO {{yellow:{{datetime.time}}}}",
        "{{red:{{weather.temperature}}°}} feels 70°",
        "HI {{orange:{{weather.high}}}} LO {{blue:{{weather.low}}}}",
        "UV {{65}}{{65}}{{65}}{{65}}{{65}}{{65}} 6/11",
        "AQI {{green:42}} good",
        "",
        "{{icon:train}} {{blue:N}} JUDAH{{fill_space}}{{transit.eta}} MIN",
        "{{icon:bus}} {{orange:22}} FILLMORE{{fill_space}}4 MIN",
      ].join("\n"),
      [
        "{{icon:rain}} SAN FRANCISCO {{yellow:{{datetime.time}}}}",
        "{{blue:61°}} feels 58°",
        "HI {{orange:64}} LO {{blue:55}}",
        "UV {{65}} 1/11",
        "AQI {{green:30}} good",
        "",
        "{{icon:train}} {{blue:N}} JUDAH{{fill_space}}DUE",
        "{{icon:bus}} {{orange:22}} FILLMORE{{fill_space}}9 MIN",
      ].join("\n"),
    ],
  },
  {
    key: "awtrix",
    label: "AWTRIX (Ulanzi TC001)",
    group: "LED matrix",
    model: "ulanzi_tc001_awtrix",
    size: "lg",
    templates: ["{{icon:sun}} {{weather.temperature}}°", "{{icon:rain}} 61°"],
  },
  {
    key: "wled_32x32",
    label: "WLED 32×32",
    group: "LED matrix",
    model: "wled_32x32",
    size: "lg",
    templates: [
      [
        "{{yellow:{{datetime.time}}}}",
        "{{icon:sun}} {{weather.temperature}}°",
        "{{weather.condition}}",
        "{{66}}{{66}}{{66}} aqi",
        "{{black/white:hi {{weather.high}}}}",
      ].join("\n"),
      ["{{yellow:{{datetime.time}}}}", "{{icon:rain}} 61°", "RAIN", "{{66}}{{66}} aqi", "{{black/white:hi 64}}"].join(
        "\n",
      ),
    ],
  },
  {
    key: "max7219",
    label: "MAX7219 4-in-1 (red)",
    group: "LED matrix",
    model: "max7219_4in1",
    size: "lg",
    templates: ["{{red:HOT}} {{weather.temperature}}°", "{{icon:check}} ok 68°"],
  },
  {
    key: "p10",
    label: "P10 DMD 32×16 (red)",
    group: "LED matrix",
    model: "p10_hub12_32x16",
    size: "lg",
    templates: ["{{black/white:OPEN}}\n{{datetime.time}}", "{{red:SHUT}}\n{{icon:cross}} 5PM"],
  },
  {
    key: "tronbyt",
    label: "Tidbyt / Tronbyt",
    group: "LED matrix",
    model: "tidbyt_tronbyt",
    size: "md",
    templates: [
      [
        "{{stocks.symbol}} {{green:{{stocks.change_percent}}%}}",
        "${{stocks.price}}",
        "{{icon:up}} 52w high",
        "{{datetime.time}} {{66}}",
      ].join("\n"),
      ["{{stocks.symbol}} {{red:-0.8%}}", "$179.0", "{{icon:down}} off high", "{{datetime.time}} {{63}}"].join("\n"),
    ],
  },
  /* Plugin-declared */
  {
    key: "fiestapanel_split_flap",
    label: "FiestaPanel, split-flap style (plugin, on a TV)",
    group: "Plugin-declared",
    model: FIESTAPANEL_SPLIT_FLAP,
    tv: { diagonalInches: 55 },
    templates: [
      [
        "{{66}} DEPARTURES {{datetime.time}}",
        "",
        "{{transit.line}}{{fill_space}}{{transit.eta}} MIN",
        "{{transit.line}}{{fill_space}}14 MIN",
        "{{transit.line2}} INGLESIDE{{fill_space}}{{transit.eta2}} MIN",
        "",
        "{{weather.condition}} {{weather.temperature}}° AQI 42",
        "HI {{weather.high}} LO {{weather.low}}",
        `${UV_BAR} UV 6`,
        "",
        "{{datetime.day}} {{datetime.date}}{{fill_space}}♥",
      ].join("\n"),
      [
        "{{65}} DEPARTURES {{datetime.time}}",
        "",
        "{{transit.line}}{{fill_space}}DUE",
        "{{transit.line}}{{fill_space}}12 MIN",
        "{{transit.line2}} INGLESIDE{{fill_space}}DELAYED",
        "",
        "CLOUDY 68° AQI 55",
        "HI 70 LO 58",
        "{{65}}{{65}}{{70}}{{70}}{{70}}{{70}}{{70}}{{70}}{{70}}{{70}} UV 2",
        "",
        "{{datetime.day}} {{datetime.date}}{{fill_space}}♥",
      ].join("\n"),
    ],
  },
  {
    key: "fiestapanel_led_matrix",
    label: "FiestaPanel, LED-matrix style (plugin, on a TV)",
    group: "Plugin-declared",
    model: FIESTAPANEL_LED,
    tv: { diagonalInches: 65 },
    templates: [
      [
        "{{icon:train}} DEPARTURES{{fill_space}}{{yellow:{{datetime.time}}}}",
        "",
        "{{blue:N}} JUDAH{{fill_space}}{{transit.eta}} MIN",
        "{{blue:N}} JUDAH{{fill_space}}14 MIN",
        "{{red:KT}} INGLESIDE{{fill_space}}{{transit.eta2}} MIN",
        "",
        "{{icon:sun}} {{weather.temperature}}° {{weather.condition}}{{fill_space}}{{black/white:AQI 42}}",
        "HI {{orange:{{weather.high}}}} LO {{blue:{{weather.low}}}}",
        "UV {{65}}{{65}}{{65}}{{65}}{{65}}{{65}} 6/11",
        "",
        "{{datetime.day}} {{datetime.date}}{{fill_space}}{{66}} all on time",
      ].join("\n"),
      [
        "{{icon:train}} DEPARTURES{{fill_space}}{{yellow:{{datetime.time}}}}",
        "",
        "{{blue:N}} JUDAH{{fill_space}}DUE",
        "{{blue:N}} JUDAH{{fill_space}}12 MIN",
        "{{red:KT}} INGLESIDE{{fill_space}}{{red:DELAYED}}",
        "",
        "{{icon:cloud}} 68° CLOUDY{{fill_space}}{{black/white:AQI 55}}",
        "HI {{orange:70}} LO {{blue:58}}",
        "UV {{65}}{{65}} 2/11",
        "",
        "{{datetime.day}} {{datetime.date}}{{fill_space}}{{65}} KT running late",
      ].join("\n"),
    ],
  },
  {
    key: "acme_sign",
    label: "ACME amber sign 48×12 (plugin)",
    group: "Plugin-declared",
    model: ACME_MODEL,
    size: "lg",
    templates: [
      "€{{stocks.price}} {{icon:up}}\n{{black/white:OPEN}} 9-5",
      "€179.0 {{icon:down}}\n{{black/white:SHUT}} {{icon:check}}",
    ],
  },
];

export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = ["Split-flap", "LED matrix", "Plugin-declared"];

export function showcaseDevice(key: string): ShowcaseDevice {
  const device = SHOWCASE_DEVICES.find((d) => d.key === key);
  if (!device) throw new Error(`Showcase: no device "${key}"`);
  return device;
}

/* ---- Facts about a device, for the editor's grid and the device card --- */

export interface DeviceGrid {
  rows: number;
  cols: number;
}

/** The character grid the device shows, with the board's own geometry applied. */
export function gridFor(device: ShowcaseDevice): DeviceGrid {
  const model = resolveDeviceModel(device.model);
  const g = model.geometry;
  switch (g.kind) {
    case "cells":
      return { rows: g.rows, cols: g.cols };
    case "note_array":
      return { rows: 3 * (device.notesTall ?? 1), cols: 15 * (device.notesWide ?? 1) };
    case "panel":
      return { rows: device.gridRows ?? g.rows ?? 3, cols: device.gridCols ?? g.cols ?? 15 };
    case "pixels": {
      const spec = ledSpecForModel(model);
      if (!spec) return { rows: 0, cols: 0 };
      const { rows, cols } = ledGridLayout(spec);
      return { rows, cols };
    }
  }
}

/** The set the device draws, with the board's flap glyph applied. */
export function charsetFor(device: ShowcaseDevice): CharacterSet {
  return characterSetForModel(resolveDeviceModel(device.model), device.code62Glyph);
}

/** The case to preview in: a face that draws lowercase keeps it, as the editor does. */
export function letterCaseFor(device: ShowcaseDevice): LedLetterCase {
  return charsetFor(device).mixedCase ? "mixed" : "upper";
}

export interface DeviceFacts {
  model: DeviceModel;
  set: CharacterSet;
  technology: string;
  family: string;
  geometry: string;
  colour: string;
  charset: string;
  animation: string;
  defaultTransition: LedTransitionId;
  defaultWhy: string;
  appearance: string;
}

/** What the device card shows, in words. All of it is read from the model and the registry. */
export function deviceFacts(device: ShowcaseDevice): DeviceFacts {
  const model = resolveDeviceModel(device.model);
  const set = charsetFor(device);
  const grid = gridFor(device);
  const g = model.geometry;
  const geometry =
    g.kind === "pixels"
      ? `${g.width} × ${g.height} px — ${grid.cols} × ${grid.rows} cells in the ${model.font ?? "5x7"} face`
      : g.kind === "note_array"
        ? `${device.notesWide ?? 1} × ${device.notesTall ?? 1} Notes — ${grid.cols} × ${grid.rows} cells`
        : g.kind === "panel"
          ? `${grid.cols} × ${grid.rows} cells (a panel; the board sets its size)`
          : `${grid.cols} × ${grid.rows} cells`;
  const c = model.color;
  const colour =
    c.kind === "tiles"
      ? "painted flaps: eight tile colours, no mixing"
      : c.kind === "rgb"
        ? `RGB, ${c.bitDepth}-bit`
        : `one colour, ${c.color}, ${c.bitDepth === 1 ? "on or off" : "8-bit brightness"}`;
  const a = model.animation;
  const animation =
    model.technology === "split_flap"
      ? `written frame by frame, about ${a.maxFps} a second; the flaps cascade each write`
      : a.delivery === "none"
        ? "takes one message; the hardware changes by itself"
        : a.delivery === "stream"
          ? `streamed, about ${a.maxFps} frames a second`
          : `uploaded sequences of up to ${a.maxFrames ?? "any number of"} frames, ${a.minFrameMs ?? "?"} ms each (${a.maxFps} fps)`;
  const defaultTransition = defaultTransitionIdForModel(model);
  const flip = transitionsForModel(model).find((t) => t.id === "flip");
  const defaultWhy =
    defaultTransition === "flip"
      ? (flip?.reason ?? `the device shows every half-flap (${animation})`)
      : (flip?.reason ?? "the device cannot show a flip");
  const ap = model.appearance ?? {};
  const appearance = [
    ap.pixelShape && `${ap.pixelShape} pixels`,
    ap.dotRatio !== undefined && `dot ${Math.round(ap.dotRatio * 100)}% of pitch`,
    ap.offColor && `off LED ${ap.offColor}`,
    ap.boardColors && `housing ${ap.boardColors.join(" or ")}`,
    ap.options && `board may set ${Object.keys(ap.options).join(", ")}`,
  ]
    .filter(Boolean)
    .join("; ");
  const family = DEVICE_FAMILIES[model.family as DeviceFamilyId]?.label ?? `${model.family} (the plugin's own)`;
  return {
    model,
    set,
    technology: model.technology === "split_flap" ? "split-flap" : "LED matrix",
    family,
    geometry,
    colour,
    charset: `${set.label} (${set.id} v${set.version})`,
    animation,
    defaultTransition,
    defaultWhy,
    appearance: appearance || "the preview's defaults",
  };
}

/* ---- Layout helpers ------------------------------------------------------ */

/**
 * Scales its child down to the width it is given, never up. A tile board's
 * natural width is its own (viewport breakpoints), so a Flagship at phone
 * width would overflow the page; this measures both and transforms, before
 * the first paint, the way `TvFrame` fits a board to its screen.
 */
export function FitToWidth({ children, className }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let rafId: number | null = null;
    const compute = () => {
      rafId = null;
      const natural = inner.offsetWidth;
      const scale = natural > 0 ? Math.min(1, outer.clientWidth / natural) : 1;
      const height = inner.offsetHeight * scale;
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.0005 && Math.abs(prev.height - height) < 0.5 ? prev : { scale, height },
      );
    };
    const recompute = () => {
      if (rafId === null) rafId = requestAnimationFrame(compute);
    };
    compute();
    const ro = new ResizeObserver(recompute);
    ro.observe(outer);
    ro.observe(inner);
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
  return (
    <div ref={outerRef} className={cn("w-full overflow-x-clip", className)} style={{ height: fit.height || undefined }}>
      <div
        ref={innerRef}
        // Centred when it fits; scaled from the left edge when it does not,
        // so the scaled box starts where the outer does. The layout box keeps
        // its natural width (a transform never changes layout), which the
        // outer's clip keeps off the page's scroll width.
        className={fit.scale < 1 ? undefined : "mx-auto"}
        style={{ width: "max-content", transformOrigin: "top left", transform: `scale(${fit.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
