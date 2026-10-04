import type { Meta, StoryObj } from "@storybook/react";

import { BOARD_ICON_NAMES } from "../../lib/board-icons";
import { CHARACTER_SET_IDS } from "../../lib/character-sets";
import { ACME_SIGN_MODEL, goldenCharacterSet } from "../../lib/charset-golden-cases";
import { DEVICE_MODEL_IDS, type DeviceModel } from "../../lib/devices";
import { CharacterGlyph } from "./character-glyph";

const meta = {
  title: "App/Board/CharacterGlyph",
  component: CharacterGlyph,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    token: {
      control: "text",
      description:
        "A character, a tile (63 / red / {red}), an icon (sun / {icon:sun}), or one-cell markup ({red:A}, {black/white:A})",
    },
    charset: { control: "select", options: CHARACTER_SET_IDS },
    model: { control: "select", options: [undefined, ...DEVICE_MODEL_IDS] },
    code62Glyph: { control: "select", options: [undefined, "degree", "heart"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    height: { control: { type: "number", min: 8, max: 120 } },
    pixelShape: { control: "select", options: [undefined, "round", "square"] },
    markUnsupported: { control: "boolean" },
    decorative: { control: "boolean" },
  },
} satisfies Meta<typeof CharacterGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { token: "{icon:sun}", charset: "led_5x7", size: "md" },
};

const TOKENS = [
  "A",
  "a",
  "7",
  "°",
  "♥",
  "{63}",
  "{66}",
  "{icon:sun}",
  "{icon:bus}",
  "{red:A}",
  "{black/white:A}",
  "{white/red:7}",
];

/** The same tokens on every set: dots for LED sets, tiles for Vestaboard sets, fallbacks where a set cannot draw one. */
export const SplitFlapVersusLed: Story = {
  args: { token: "A", size: "md", markUnsupported: true },
  render: (args) => (
    <table className="text-xs">
      <thead>
        <tr>
          <th className="pr-3 text-left font-medium text-muted-foreground">set</th>
          {TOKENS.map((t) => (
            <th key={t} className="px-1 font-mono font-normal text-muted-foreground">
              {t}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CHARACTER_SET_IDS.map((id) => (
          <tr key={id}>
            <td className="pr-3 font-mono">{id}</td>
            {TOKENS.map((t) => (
              <td key={t} className="px-1 py-1">
                <CharacterGlyph {...args} token={t} charset={id} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/** Every icon in each LED set; the 3×5 face draws ten and falls back for the rest. */
export const EveryIcon: Story = {
  args: { token: "{icon:sun}", size: "lg", markUnsupported: true },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(["led_5x7", "led_3x5"] as const).map((id) => (
        <div key={id} className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted-foreground">{id}</span>
          <div className="flex flex-wrap gap-2">
            {BOARD_ICON_NAMES.map((name) => (
              <CharacterGlyph key={name} {...args} token={`{icon:${name}}`} charset={id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

/** Unsupported tokens draw the set's fallback, marked, with the name saying what is drawn instead. */
export const UnsupportedFallbacks: Story = {
  args: { token: "a", charset: "vestaboard_v1", markUnsupported: true, size: "lg" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <CharacterGlyph {...args} token="a" />
      <CharacterGlyph {...args} token="{icon:sun}" />
      <CharacterGlyph {...args} token="{icon:bus}" />
      <CharacterGlyph {...args} token="♥" />
      <CharacterGlyph {...args} token="{red:A}" />
      <CharacterGlyph {...args} token="{icon:bus}" charset="led_3x5" />
      <CharacterGlyph {...args} token="~" charset="led_5x7" />
    </div>
  ),
};

/** Three sizes, matched to the split-flap tile scale at every breakpoint so a glyph sits beside a tile; and an explicit height for a picker button. */
export const Sizes: Story = {
  args: { token: "{icon:rain}", charset: "led_5x7" },
  render: (args) => (
    <div className="flex items-end gap-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-end gap-1">
          <CharacterGlyph {...args} size={size} />
          <CharacterGlyph {...args} size={size} charset="vestaboard_v2" token="{66}" />
          <CharacterGlyph {...args} size={size} charset="vestaboard_v2" token="R" />
        </div>
      ))}
      <CharacterGlyph {...args} height={30} />
    </div>
  ),
};

/** From a device model: a monochrome MAX7219 draws every token in its one colour; a Pixoo in square pixels; a Flagship's flap follows `code62Glyph`. */
export const FromDeviceModel: Story = {
  args: { token: "{red:A}", size: "lg" },
  render: (args) => (
    <div className="flex items-center gap-3">
      <CharacterGlyph {...args} model="max7219_4in1" />
      <CharacterGlyph {...args} model="max7219_4in1" token="{icon:sun}" />
      <CharacterGlyph {...args} model="divoom_pixoo64" />
      <CharacterGlyph {...args} model="divoom_pixoo64" token="{black/white:A}" />
      <CharacterGlyph {...args} model="vestaboard_flagship" token="°" />
      <CharacterGlyph {...args} model="vestaboard_flagship" code62Glyph="heart" token="°" />
    </div>
  ),
};

const ACME_SET = goldenCharacterSet("acme_sign_v1");
const ACME_MODEL: DeviceModel = {
  ...ACME_SIGN_MODEL,
  charset: ACME_SET,
  animation: { ...ACME_SIGN_MODEL.animation, sources: [] },
};
const ACME_TOKENS = ["A", "7", "0", "€", "{icon:up}", "{icon:check}", "a", "♥", "{icon:sun}", "{red:A}"];

/** A plugin's own set and model, passed as objects: the 48×12 ACME sign's `€` from its bitmap, its own icons, and — marked — the lowercase and heart it does not have. The model row adds its amber monochrome and its own LED look. */
export const PluginSet: Story = {
  args: { token: "€", size: "lg", markUnsupported: true, labels: { symbols: { "€": "euro sign" } } },
  render: (args) => (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-28 font-mono text-muted-foreground">{ACME_SET.id}</span>
        {ACME_TOKENS.map((t) => (
          <CharacterGlyph key={t} {...args} token={t} charset={ACME_SET} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-28 font-mono text-muted-foreground">{ACME_MODEL.id}</span>
        {ACME_TOKENS.map((t) => (
          <CharacterGlyph key={t} {...args} token={t} model={ACME_MODEL} />
        ))}
      </div>
    </div>
  ),
};
