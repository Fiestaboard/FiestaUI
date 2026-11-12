import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { LedMatrixDisplay } from "../board/led-matrix-display";
import { StaticBoardDisplay } from "../board/static-board-display";
import { Badge } from "../feedback/badge";
import { ChoiceCard, ChoiceCardGroup, ChoiceCardPreview } from "./choice-card";

/**
 * 08 C17 (`61:25808`) — the live component is 05 "Setup / Display type card"
 * (`37:42722`): choose a display by what it looks like. Previews are real
 * boards at actual size, cropped with an edge fade, never shrunk.
 */
const meta = {
  title: "Forms/ChoiceCard",
  component: ChoiceCardGroup,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ChoiceCardGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const FLAGSHIP = "\n   GOOD MORNING\n   72° SUNNY  HI 78\n   N JUDAH  4 MIN";
const NOTE = "     HELLO\n{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}\n     TACO";
const PANEL = "SUNNY\nAH\n{63}{64}{65}{66}{67}{68}{63}{64}";

function FlagshipPreview() {
  return (
    <ChoiceCardPreview offsetX={-72} offsetY={-40}>
      <StaticBoardDisplay size="sm" deviceType="flagship" message={FLAGSHIP} />
    </ChoiceCardPreview>
  );
}

function NotePreview() {
  return (
    <ChoiceCardPreview offsetX={-80} offsetY={-6}>
      <StaticBoardDisplay size="sm" deviceType="note" message={NOTE} />
    </ChoiceCardPreview>
  );
}

function PixooPreview() {
  return (
    <ChoiceCardPreview offsetX={0} offsetY={0}>
      <LedMatrixDisplay preset="pixoo64" message={"MON OCT\n09:30 ST"} size="sm" />
    </ChoiceCardPreview>
  );
}

function Tc001Preview({ tbd = false }: { tbd?: boolean }) {
  return (
    <ChoiceCardPreview
      offsetX={0}
      offsetY={0}
      overlay={
        tbd ? (
          <Badge variant="secondary" className="font-mono">
            TBD
          </Badge>
        ) : undefined
      }
    >
      <LedMatrixDisplay preset="awtrix" message="72° {66}OK" size="sm" />
    </ChoiceCardPreview>
  );
}

function PanelPreview() {
  return (
    <ChoiceCardPreview offsetX={-8} offsetY={-8}>
      <StaticBoardDisplay size="sm" deviceType="panel" gridRows={3} gridCols={12} message={PANEL} />
    </ChoiceCardPreview>
  );
}

function DisplayTypeOptions() {
  return (
    <>
      <ChoiceCard
        value="flagship"
        media={<FlagshipPreview />}
        title="Vestaboard Flagship"
        description="Split-flap · 22 × 6 characters"
        meta="Local API · Cloud API"
      />
      <ChoiceCard
        value="note"
        media={<NotePreview />}
        title="Vestaboard Note"
        description="Split-flap · 15 × 3 characters"
        meta="Local API · Cloud API"
      />
      <ChoiceCard
        value="pixoo"
        media={<PixooPreview />}
        title="Divoom Pixoo 64"
        description="LED matrix · 64 × 64 pixels"
        meta="Wi-Fi · Find my Pixoo"
      />
      <ChoiceCard
        value="tc001"
        media={<Tc001Preview />}
        title="Ulanzi TC001"
        description="Pixel clock · 32 × 8 · AWTRIX NG"
        meta="Community · Untested on hardware"
      />
      <ChoiceCard
        value="tc002"
        media={<Tc001Preview tbd />}
        title="Ulanzi TC002"
        description="Pixel clock · size TBD"
        meta="Community · Separate plugin"
      />
      <ChoiceCard
        value="panel"
        media={<PanelPreview />}
        title="FiestaPanel TV"
        description="Any TV or browser, sized to fit"
        meta="TV app · Panel URL"
      />
    </>
  );
}

/** "Add a display": one of N, a radiogroup. Arrow keys move and select. */
export const DisplayTypes: Story = {
  args: { "aria-label": "Display type" },
  render: (args) => (
    <ChoiceCardGroup {...args} className="w-full max-w-[370px]">
      <DisplayTypeOptions />
    </ChoiceCardGroup>
  ),
};

/** Selected: 2px primary ring, the selected tint and a filled mark — never colour alone. */
export const Selected: Story = {
  args: { "aria-label": "Display type" },
  render: function Render() {
    const [value, setValue] = useState<string | null>("flagship");
    return (
      <ChoiceCardGroup
        aria-label="Display type"
        value={value}
        onValueChange={setValue}
        className="w-full max-w-[370px]"
      >
        <DisplayTypeOptions />
      </ChoiceCardGroup>
    );
  },
};

/** Any of N: a group of checkboxes, each its own tab stop; the mark is square. */
export const Multiple: Story = {
  args: { "aria-label": "Show on" },
  render: function Render() {
    const [value, setValue] = useState<string[]>(["flagship", "panel"]);
    return (
      <ChoiceCardGroup
        multiple
        aria-label="Show on"
        value={value}
        onValueChange={setValue}
        className="w-full max-w-[370px]"
      >
        <ChoiceCard
          value="flagship"
          media={<FlagshipPreview />}
          title="Kitchen"
          description="Vestaboard Flagship"
          meta="Online"
        />
        <ChoiceCard value="note" media={<NotePreview />} title="Hallway" description="Vestaboard Note" meta="Online" />
        <ChoiceCard
          value="panel"
          media={<PanelPreview />}
          title="Living room TV"
          description="FiestaPanel TV"
          meta="Last seen 2 min ago"
        />
      </ChoiceCardGroup>
    );
  },
};

/** A disabled option keeps its place and is skipped by the arrow keys. */
export const Disabled: Story = {
  args: { "aria-label": "Display type", defaultValue: "flagship" },
  render: (args) => (
    <ChoiceCardGroup {...args} className="w-full max-w-[370px]">
      <ChoiceCard
        value="flagship"
        media={<FlagshipPreview />}
        title="Vestaboard Flagship"
        description="Split-flap · 22 × 6 characters"
        meta="Local API · Cloud API"
      />
      <ChoiceCard
        value="tc002"
        disabled
        media={<Tc001Preview tbd />}
        title="Ulanzi TC002"
        description="Pixel clock · size TBD"
        meta="Coming soon"
      />
    </ChoiceCardGroup>
  ),
};

/** Text-only choices: the media slot is optional. */
export const WithoutMedia: Story = {
  args: { "aria-label": "Connection", defaultValue: "local" },
  render: (args) => (
    <ChoiceCardGroup {...args} className="w-full max-w-[370px]">
      <ChoiceCard value="local" title="Local API" description="Fastest; the board and hub share a network." />
      <ChoiceCard value="cloud" title="Cloud API" description="Works anywhere; needs a read/write key." />
    </ChoiceCardGroup>
  ),
};
