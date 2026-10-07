import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useState } from "react";

import { DisplayPreview } from "../components/board/display-preview";
import { LedTransitionPicker } from "../components/board/led-transition-picker";
import { Badge } from "../components/feedback/badge";
import { Button } from "../components/forms/button";
import { Grid } from "../components/layout/grid";
import { Stack } from "../components/layout/stack";
import { Code } from "../components/typography/code";
import { Heading } from "../components/typography/heading";
import { Text } from "../components/typography/text";
import { type DeviceModel, validateDeviceModel } from "../lib/devices";
import { defaultTransitionIdForModel, type LedTransitionId } from "../lib/led-transition-registry";
import { FitToWidth } from "./display-outputs-showcase-support";
import { OUTPUT_PLUGINS, type OutputPluginData, PIXOO_FROM_PLUGIN, PIXOO_PLUGIN } from "./output-plugin-data";

/*
 * Showcase/Output Plugin Devices — real plugins' devices, from the data the
 * plugins publish. FiestaBoard's output plugins declare their devices as
 * JSON in a data-only npm package, and FiestaUI pins each one as a
 * devDependency (package.json) so that:
 *
 *   - these stories render the device from the PACKAGE data, never from a
 *     copy, captioned with the package and the commit or tag it is pinned
 *     to (src/stories/output-plugin-data.ts reads both);
 *   - src/lib/output-plugin-data.test.ts validates the same data against
 *     the schemas and validators as they are now, so a contract change
 *     that would break a published plugin fails here, before release.
 *
 * Nothing in a plugin's package is code: the models go through
 * `DisplayPreview` and `LedTransitionPicker` exactly as FiestaBoard passes
 * them. Under reduced motion (how VRT shoots) every story is a still.
 */

const meta = {
  title: "Showcase/Output Plugin Devices",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---- Small story-local pieces ------------------------------------------- */

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="1" className="max-w-3xl">
      <Heading level={2} size="lg">
        {title}
      </Heading>
      <Text tone="muted">{children}</Text>
    </Stack>
  );
}

/** A board with the package it came from under it. Scaled down to a phone, never up (the showcase's `FitToWidth`). */
function FromPackage({ plugin, children, note }: { plugin: OutputPluginData; children: ReactNode; note?: ReactNode }) {
  return (
    <figure className="flex w-full min-w-0 flex-col items-center gap-2">
      <FitToWidth>{children}</FitToWidth>
      <figcaption className="text-center text-xs text-muted-foreground">
        from <Code>{plugin.caption}</Code>
        {note ? <> — {note}</> : null}
      </figcaption>
    </figure>
  );
}

const PIXOO_PAGES: [string, string] = [
  "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{icon:sun} 72° SUNNY\n{black/white:3 LEFT}",
  "MON OCT 3\n\n16:00 REVIEW\n17:00 GYM\n19:00 DINNER ♥\n\n{icon:rain} 61° RAIN\n{black/white:ALL DONE}",
];

/* ---- Stories ------------------------------------------------------------- */

/** The Pixoo 64 from the plugin's own `output/device-models.json`, through `DisplayPreview`. */
export const Pixoo64: Story = {
  name: "Pixoo 64",
  render: () => (
    <Stack gap="6">
      <Intro title="Pixoo 64, from its plugin">
        The <Code>divoom_pixoo64</Code> model as <Code>{PIXOO_PLUGIN.name}</Code> publishes it: 64 × 64 RGB pixels, the{" "}
        <Code>led_3x5</Code> set in the 3×5 face, square diffused dots, and a still push rate of 2 a second — the device
        snaps; its camera-timed hardware lab notes and their sources are in the plugin's declaration. The package is a
        devDependency; the model is passed as the object, not by id.
      </Intro>
      <FromPackage plugin={PIXOO_PLUGIN}>
        <DisplayPreview model={PIXOO_FROM_PLUGIN} message={PIXOO_PAGES[0]} />
      </FromPackage>
    </Stack>
  ),
};

function FlipDemo() {
  const [index, setIndex] = useState(0);
  return (
    <Stack gap="4" className="items-center">
      <FromPackage
        plugin={PIXOO_PLUGIN}
        note="flip asked for; the declaration resolves it to none, so the change snaps"
      >
        <DisplayPreview model={PIXOO_FROM_PLUGIN} message={PIXOO_PAGES[index]} transition="flip" />
      </FromPackage>
      <Button variant="outline" size="sm" data-testid="next-message" onClick={() => setIndex((i) => (i + 1) % 2)}>
        Next message
      </Button>
    </Stack>
  );
}

/** A flip asked of the plugin's Pixoo: the model's `animation` decides, and it says the flip is coarse. */
export const Pixoo64Flip: Story = {
  name: "Pixoo 64, flip transition",
  render: () => (
    <Stack gap="6">
      <Intro title="Flip, as the plugin's declaration resolves it">
        The plugin declares <Code>stream</Code> delivery at 5 frames a second — the rate its hardware labs measured for
        single-frame pushes, after finding uploaded animations loop forever behind a loading overlay — so an asked-for
        flip runs coarse, one frame per 200 ms step with no half-flaps, exactly as the device streams it. Press Next
        message to see it.
      </Intro>
      <FlipDemo />
    </Stack>
  ),
};

function PickerDemo() {
  const [choice, setChoice] = useState<LedTransitionId>(() => defaultTransitionIdForModel(PIXOO_FROM_PLUGIN));
  const [index, setIndex] = useState(0);
  return (
    <Grid cols="1" lg="2" gap="6" className="items-start">
      <LedTransitionPicker
        model={PIXOO_FROM_PLUGIN}
        value={choice}
        onValueChange={setChoice}
        columns="2"
        previewMessages={["72° {66}OK", "68° {65}UV2"]}
      />
      <Stack gap="4" className="items-center">
        <FromPackage plugin={PIXOO_PLUGIN} note={<>transition: {choice}</>}>
          <DisplayPreview model={PIXOO_FROM_PLUGIN} message={PIXOO_PAGES[index]} transition={choice} />
        </FromPackage>
        <Button variant="outline" size="sm" data-testid="next-message" onClick={() => setIndex((i) => (i + 1) % 2)}>
          Next message
        </Button>
      </Stack>
    </Grid>
  );
}

/** The transition menu for the plugin's Pixoo: every entry compressed into its declared budget, wired to a preview. */
export const Pixoo64TransitionPicker: Story = {
  name: "Pixoo 64, transition picker",
  render: () => (
    <Stack gap="6">
      <Intro title="The menu the plugin's model earns">
        <Code>LedTransitionPicker</Code> reads the same declaration: at 2 frames a second only None is available, and
        every other entry says why, in its card and in the list under the group. The choice drives the board on the
        right.
      </Intro>
      <PickerDemo />
    </Stack>
  ),
};

function Verdict({ model }: { model: DeviceModel }) {
  const r = validateDeviceModel(model);
  return (
    <Badge variant={r.ok ? "success" : "destructive"}>
      validateDeviceModel: {r.ok ? "ok" : `${r.errors.length} error${r.errors.length === 1 ? "" : "s"}`}
    </Badge>
  );
}

/** Every model every pinned plugin declares, with the validator's verdict and the package each came from. */
export const EveryPluginModel: Story = {
  name: "Every plugin model",
  render: () => (
    <Stack gap="6">
      <Intro title="Every pinned plugin, every model">
        Each output plugin FiestaUI pins (<Code>@fiestaboard/output-*</Code> in package.json's devDependencies), with
        every model its <Code>output/device-models.json</Code> declares, rendered from that file. The contract test
        validates the same files against the current schemas on every run.
      </Intro>
      <Grid cols="1" lg="2" gap="6">
        {OUTPUT_PLUGINS.flatMap((plugin) =>
          plugin.models.map((model) => (
            <Stack key={`${plugin.name}/${model.id}`} gap="2" className="items-center">
              <Heading level={3} size="sm">
                {model.label}{" "}
                <Text as="span" tone="muted" size="xs">
                  {model.id}
                </Text>
              </Heading>
              <Verdict model={model} />
              <FromPackage plugin={plugin}>
                <DisplayPreview model={model} message={PIXOO_PAGES[0]} size="sm" />
              </FromPackage>
            </Stack>
          )),
        )}
      </Grid>
    </Stack>
  ),
};
