import type { Meta, StoryObj } from "@storybook/react";

import { CHARACTER_SET_IDS } from "../../lib/character-sets";
import { goldenCharacterSet } from "../../lib/charset-golden-cases";
import { CharacterSetSpecimen } from "./character-set-specimen";

const meta = {
  title: "App/Board/CharacterSetSpecimen",
  component: CharacterSetSpecimen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    charset: { control: "select", options: CHARACTER_SET_IDS },
    compareTo: { control: "select", options: [undefined, ...CHARACTER_SET_IDS] },
    font: { control: "select", options: [undefined, "3x5", "5x7"] },
    size: { control: "select", options: ["sm", "md"] },
  },
} satisfies Meta<typeof CharacterSetSpecimen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 5×7 LED set: the whole flap set, both code-62 glyphs, lowercase, all sixteen icons. */
export const Led5x7: Story = {
  name: "LED 5×7",
  args: { charset: "led_5x7" },
};

/** What an LED adds over a heart-flap Vestaboard: green rings mark the additions. */
export const LedVersusVestaboard: Story = {
  args: { charset: "led_5x7", compareTo: "vestaboard_v2" },
};

/** The 3×5 face against the 5×7: same characters, six icons it cannot draw. */
export const SmallFaceVersusLarge: Story = {
  args: { charset: "led_3x5", compareTo: "led_5x7" },
};

/** Two versions of one set: the 2026 heart flap replaced the degree. */
export const VestaboardV2VersusV1: Story = {
  args: { charset: "vestaboard_v2", compareTo: "vestaboard_v1" },
};

/** The original Vestaboard set, as tiles. */
export const VestaboardV1: Story = {
  args: { charset: "vestaboard_v1", size: "sm" },
};

/** A plugin's set, passed as an object: the 48×12 ACME sign extends the 3×5 face, adds a `€` drawn from its own bitmap, keeps three icons, and has no lowercase. Compared with the face it extends. */
export const PluginSet: Story = {
  args: {
    charset: goldenCharacterSet("acme_sign_v1"),
    compareTo: "led_3x5",
    glyphLabels: { symbols: { "€": "euro sign" } },
  },
};

/** Every set, for a device picker. */
export const AllSets: Story = {
  args: { charset: "led_5x7", size: "sm" },
  render: (args) => (
    <div className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
      {CHARACTER_SET_IDS.map((id) => (
        <CharacterSetSpecimen key={id} {...args} charset={id} />
      ))}
    </div>
  ),
};
