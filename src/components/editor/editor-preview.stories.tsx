import type { Meta, StoryObj } from "@storybook/react";
import { Play } from "lucide-react";
import { useState } from "react";

import { ScaledBoardDisplay } from "../board/scaled-board-display";
import { Button } from "../forms/button";
import { EditorPreview } from "./editor-preview";

/*
 * EditorPreview (slice 1.6a, W1 / WEB-03). Figma `ZQ8RMELCO6qEOFZUnQu36e`:
 * 07 `53:137378` (desktop editor, Live preview pane), 07 `57:64661` (mobile
 * Chrome, Docked live preview), 07c `306:34342` / `316:92430` (Mirror on),
 * 08 `59:65635` (W1 "Always-visible live preview below 1024").
 */
const meta = {
  title: "Editor/EditorPreview",
  component: EditorPreview,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["pane", "docked"] },
    dotStatus: { control: "select", options: ["success", "warning", "danger", "info", "neutral"] },
    live: { control: "boolean" },
    children: { control: false },
    headerAction: { control: false },
    liveAction: { control: false },
  },
} satisfies Meta<typeof EditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const MESSAGE = "GOOD MORNING\n72° {red}\nNICE OUT\nN JUDAH 4 MIN\nHAVE A GREAT DAY";

const board = (size: "sm" | "md") => <ScaledBoardDisplay message={MESSAGE} size={size} animationsEnabled={false} />;

const replay = (
  <Button variant="outline">
    <Play aria-hidden />
    Replay
  </Button>
);

const SCROLLER = "h-[420px] overflow-y-auto rounded-md border border-border focus-ring";

/** The page behind the preview: px padding so the mobile shot keeps its gutter. */
function Page({ children, width }: { children: React.ReactNode; width: string }) {
  return (
    <div className="min-h-dvh bg-background p-4">
      <div className={width}>{children}</div>
    </div>
  );
}

/** 07 `53:137378`: the desktop editor's sticky pane, mirroring off. */
export const Pane: Story = {
  args: {
    boardName: "Kitchen board",
    details: "Flagship 22 × 6",
    children: board("md"),
    liveAction: replay,
    statusLine: "Off by default every time the editor opens.",
  },
  render: (args) => (
    <Page width="w-full max-w-[822px]">
      <EditorPreview {...args} />
    </Page>
  ),
};

/** 07c `306:34342`: Mirror on. The switch carries the state; the status line says what it does. */
export const PaneMirroring: Story = {
  args: {
    ...Pane.args,
    children: board("md"),
    defaultLive: true,
    liveLabel: "Mirror to board while editing · the Kitchen board shows your edits",
    statusLine:
      "Sends after each pause in typing (about once a second, as the hub allows). Turn it off, Save, or leave the editor and the board returns to what the Schedule says.",
  },
  render: Pane.render,
};

/** 07 `57:64661`: the phone editor's dock. No switch: it lives in the More sheet. */
export const Docked: Story = {
  args: {
    variant: "docked",
    boardName: "Kitchen board",
    children: board("sm"),
  },
  render: (args) => (
    <Page width="w-full max-w-[390px]">
      <EditorPreview {...args} />
    </Page>
  ),
};

/** 07c `316:92430`: mirroring is on, so the dock shows the Mirroring badge. */
export const DockedMirroring: Story = {
  args: {
    ...Docked.args,
    children: board("sm"),
    live: true,
  },
  render: Docked.render,
};

/**
 * Never collapses: the dock stays stuck while the template scrolls under it
 * (08 W1). The scroller is the story's own box so the shot is deterministic.
 */
export const DockedOverTemplate: Story = {
  args: {
    ...Docked.args,
    children: board("sm"),
    statusLine: "5 / 6 lines",
  },
  render: (args) => (
    <Page width="w-full max-w-[390px]">
      {/* A scroll container must be keyboard-reachable (axe scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div role="region" aria-label="Template" tabIndex={0} className={SCROLLER}>
        <EditorPreview {...args} />
        <ol className="space-y-3 p-4 font-mono text-sm text-foreground">
          {["GOOD MORNING", "72°", "NICE OUT", "N JUDAH 4 MIN", "HAVE A GREAT DAY", "", "", "", ""].map(
            (line, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-4 text-right text-muted-foreground">{index + 1}</span>
                <span>{line}</span>
              </li>
            ),
          )}
        </ol>
      </div>
    </Page>
  ),
};

/** A note array: ScaledBoardDisplay's own Fit / Actual size toggle comes with the board. */
export const NoteArray: Story = {
  args: {
    boardName: "Hallway notes",
    details: "Note array 3 × 1",
    children: (
      <ScaledBoardDisplay
        message={"HELLO\nWORLD\n\n"}
        size="md"
        deviceType="note_array"
        notesWide={3}
        notesTall={1}
        animationsEnabled={false}
      />
    ),
    liveAction: replay,
  },
  render: Pane.render,
};

/** Long names truncate on one line instead of pushing the header to two. */
export const LongNames: Story = {
  args: {
    boardName: "Upstairs kitchen board by the window over the sink",
    details: "Flagship 22 × 6 · focused: ← → scroll, F Fit",
    children: board("md"),
    liveAction: replay,
  },
  render: (args) => (
    <Page width="w-full max-w-[520px]">
      <div className="flex flex-col gap-4">
        <EditorPreview {...args} />
        <EditorPreview {...args} variant="docked" live>
          {board("sm")}
        </EditorPreview>
      </div>
    </Page>
  ),
};

/** Controlled: the editor owns the mirror state and drives the status line from it. */
export const Controlled: Story = {
  args: { children: board("md") },
  render: function ControlledStory(args) {
    const [live, setLive] = useState(false);
    return (
      <Page width="w-full max-w-[822px]">
        <EditorPreview
          {...args}
          boardName="Kitchen board"
          details="Flagship 22 × 6"
          live={live}
          onLiveChange={setLive}
          liveAction={replay}
          statusLine={live ? "Mirroring to the Kitchen board." : "The Kitchen board shows what the Schedule says."}
        />
      </Page>
    );
  },
};
