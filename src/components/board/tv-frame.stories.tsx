import type { Meta, StoryObj } from "@storybook/react";

import { type DeviceModel } from "../../lib/devices";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import { DisplayPreview } from "./display-preview";
import { TvFrame } from "./tv-frame";

/*
 * The television FiestaPanel shows on, around the board it shows. Every
 * story wraps a `DisplayPreview` of one of FiestaPanel's two models (the
 * plugin-declared fixtures, passed as objects) in a `TvFrame`, or asks
 * `DisplayPreview` for `frame="tv"` directly. The TV fills its container,
 * so each story sits in a sized column: at desktop a comfortable set, on a
 * 390px phone the same set shrunk to the page, with nothing overflowing.
 *
 * A split-flap board on the TV is bare flaps on the black — no board frame —
 * as the Apple TV app shows FiestaPanel: `bezel={false}` when a `TvFrame` is
 * given the board directly, automatic through `DisplayPreview frame="tv"`.
 * The LED board keeps its housing, with the bare alternative shown as the
 * open question it is (spec §7.5).
 */

const SPLIT_FLAP = FIESTAPANEL_SPLIT_FLAP_MODEL as DeviceModel;
const LED = FIESTAPANEL_LED_MATRIX_MODEL as DeviceModel;

const DEPARTURES_FLAP =
  "DEPARTURES\n\nN JUDAH      2 MIN\nN JUDAH     14 MIN\nKT INGLESIDE 6 MIN\n\n72° SUNNY  AQI 42\n{66}{66}{66} GOOD";
const DEPARTURES_LED =
  "DEPARTURES\n\nN JUDAH      2 MIN\n{red:N JUDAH     14 MIN}\nKT INGLESIDE 6 MIN\n\n{icon:sun} 72° SUNNY\n{black/white:AQI 42} GOOD";

const SplitFlapBoard = () => <DisplayPreview model={SPLIT_FLAP} message={DEPARTURES_FLAP} bezel={false} />;
const LedBoard = ({ bezel }: { bezel?: boolean }) => (
  <DisplayPreview model={LED} message={DEPARTURES_LED} size="sm" bezel={bezel} />
);

const meta = {
  title: "App/Board/TvFrame",
  component: TvFrame,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-4xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    diagonalInches: {
      control: { type: "number", min: 3, max: 200 },
      description: "Screen diagonal in inches (FiestaBoard's screen_diagonal_inches); scales the bezel and stand",
    },
    aspect: { control: "number", description: "Screen aspect, w/h (or { w, h } in code)" },
    dimmed: { control: { type: "range", min: 0, max: 1, step: 0.05 }, description: "The viewer's auto-dim level" },
    offline: { control: "boolean", description: "The viewer could not fetch a frame" },
    stand: { control: "boolean", description: "Centre stand; off for a wall mount" },
    offlineLabel: { control: "text" },
    children: { control: false },
  },
  args: { children: <SplitFlapBoard /> },
} satisfies Meta<typeof TvFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** FiestaPanel in its split-flap style on the default set: 55", 16:9, on its stand. Bare flaps on the screen's black, no board frame, filling the screen to its margin — the Apple TV app's look. */
export const SplitFlap55: Story = {
  name: "FiestaPanel split-flap, 55″ 16:9",
  args: { diagonalInches: 55, aspect: 16 / 9 },
};

/** FiestaPanel in its LED-matrix style on a 65" set: a slightly thinner bezel, a slightly smaller stand. The LED board keeps its housing on the screen for now. */
export const LedMatrix65: Story = {
  name: "FiestaPanel LED matrix, 65″",
  args: { diagonalInches: 65, children: <LedBoard /> },
};

/**
 * Open question (spec §7.5): should an LED board inside the TV go bare too —
 * the substrate and its dots on the screen's black, as the flaps do — or keep
 * its housing, as `DisplayPreview frame="tv"` does today? This is the bare
 * alternative, `bezel={false}` on the LED renderer, for the owner to decide.
 */
export const LedMatrixBare: Story = {
  name: "FiestaPanel LED matrix, bare (open question)",
  args: { diagonalInches: 65, children: <LedBoard bezel={false} /> },
};

/** A portrait set (9:16): the board fills the width and the screen's height is left black above and below. */
export const Portrait: Story = {
  name: "Portrait TV, 9:16",
  args: { aspect: { w: 9, h: 16 }, diagonalInches: 43 },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

/** The same board on a 32" and an 85" set, side by side at the same width: the diagonal moves the bezel and the stand, never the board. */
export const SmallAndLarge: Story = {
  name: "32″ beside 85″",
  render: (args) => (
    <div className="grid gap-6 sm:grid-cols-2">
      <figure className="flex flex-col items-center gap-2">
        <TvFrame {...args} diagonalInches={32} />
        <figcaption className="text-xs text-muted-foreground">32″</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <TvFrame {...args} diagonalInches={85} />
        <figcaption className="text-xs text-muted-foreground">85″</figcaption>
      </figure>
    </div>
  ),
};

/** The viewer's auto-dim at 0.6: a veil over the screen only, never the cabinet. */
export const Dimmed: Story = {
  args: { dimmed: 0.6 },
};

/** The viewer could not fetch a frame: the screen is off, the standby LED is amber, and the status is announced. */
export const Offline: Story = {
  args: { offline: true },
};

/** A wall mount: no stand. */
export const WallMount: Story = {
  args: { stand: false },
};

/** `DisplayPreview frame="tv"`: the dispatcher wraps the split-flap renderer itself, with the set in `tv`, and turns the board's housing off — bare flaps on the black, nothing passed. */
export const DisplayPreviewSplitFlap: Story = {
  name: "DisplayPreview frame=tv, split-flap",
  render: () => <DisplayPreview model={SPLIT_FLAP} message={DEPARTURES_FLAP} frame="tv" tv={{ diagonalInches: 55 }} />,
};

/** `DisplayPreview frame="tv"` around the LED renderer, as the viewer passes it: diagonal, aspect, dim level. */
export const DisplayPreviewLedMatrix: Story = {
  name: "DisplayPreview frame=tv, LED matrix",
  render: () => (
    <DisplayPreview
      model={LED}
      message={DEPARTURES_LED}
      size="sm"
      frame="tv"
      tv={{ diagonalInches: 65, aspect: { w: 16, h: 9 }, dimmed: 0.2 }}
    />
  ),
};
