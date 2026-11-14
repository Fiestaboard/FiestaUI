import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import type { BoardPreviewMode } from "./board-preview-mode";
import { BoardPreviewModeToggle } from "./board-preview-mode-toggle";
import { BoardViewport } from "./board-viewport";
import { ScaledBoardDisplay } from "./scaled-board-display";

/*
 * BoardPreviewModeToggle (slice 1.5d). Figma `ScaledBoardDisplay / Size
 * toggle` 36:32551, as placed in 07 `57:64661` (the docked preview header) and
 * `53:137378` (the pane header): 114 × 22, two 22 px pills 4 px apart.
 *
 * The toggle is controlled; each story owns its mode, and every board below
 * passes `persist={false}` so the shared session key cannot leak between
 * captures.
 */
const meta = {
  title: "App/Board/BoardPreviewModeToggle",
  component: BoardPreviewModeToggle,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    mode: { control: "inline-radio", options: ["fit", "actual"] },
    size: { control: "inline-radio", options: ["default", "touch"] },
  },
  args: { mode: "actual", onModeChange: () => {} },
  render: function ToggleStory(args) {
    const [mode, setMode] = useState<BoardPreviewMode>(args.mode);
    return <BoardPreviewModeToggle {...args} mode={mode} onModeChange={setMode} />;
  },
} satisfies Meta<typeof BoardPreviewModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07: Actual size active (the editor's default). */
export const Default: Story = {};

/** Fit active. */
export const FitActive: Story = { args: { mode: "fit" } };

/**
 * `size="touch"`: the same 22 px pills; each has a 44 × 44 target on any
 * pointer. The dashed boxes are story-only and show those targets, which are
 * otherwise invisible. `size="default"` gets the same targets only under the
 * opted-in `coarse:` layer (#385).
 */
export const TouchTargets: Story = {
  args: { size: "touch" },
  render: function TouchStory(args) {
    const [mode, setMode] = useState<BoardPreviewMode>(args.mode);
    return (
      <div className="p-4">
        <BoardPreviewModeToggle
          {...args}
          mode={mode}
          onModeChange={setMode}
          className="[&>button]:before:outline-1 [&>button]:before:outline-muted-foreground/40 [&>button]:before:outline-dashed"
        />
      </div>
    );
  },
};

/** Localised labels. */
export const Localised: Story = {
  args: { labels: { previewSize: "Taille de l'aperçu", fit: "Ajuster", actual: "Taille réelle" } },
};

const LOBBY_3X1 =
  "    LOBBY      COFFEE  $3     WIFI: FIESTA\n   WELCOME       TEA  $2      OPEN 7-7\n{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}";

/**
 * One state, two inputs: the header pills and the viewport's F key. The board
 * hides its own pills (`showModeToggle={false}`), so there is one toggle.
 */
export const WithBoardViewport: Story = {
  render: function SyncedStory() {
    const [mode, setMode] = useState<BoardPreviewMode>("actual");
    return (
      <div className="flex w-[370px] max-w-[calc(100vw-4rem)] flex-col gap-2">
        <div className="flex min-h-5.5 items-center justify-between gap-3">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Note array 3×1</span>
          <BoardPreviewModeToggle mode={mode} onModeChange={setMode} />
        </div>
        <BoardViewport
          deviceType="note_array"
          notesWide={3}
          message={LOBBY_3X1}
          size="sm"
          animationsEnabled={false}
          persist={false}
          mode={mode}
          onModeChange={setMode}
          showModeToggle={false}
        />
      </div>
    );
  },
};

/** The same with ScaledBoardDisplay, whose own pills are hidden. */
export const WithScaledBoardDisplay: Story = {
  render: function ScaledStory() {
    const [mode, setMode] = useState<BoardPreviewMode>("fit");
    return (
      <div className="flex w-[370px] max-w-[calc(100vw-4rem)] flex-col gap-2 overflow-hidden">
        <div className="flex min-h-5.5 items-center justify-end">
          <BoardPreviewModeToggle mode={mode} onModeChange={setMode} />
        </div>
        <ScaledBoardDisplay
          deviceType="note_array"
          notesWide={3}
          message={LOBBY_3X1}
          size="sm"
          animationsEnabled={false}
          persist={false}
          mode={mode}
          onModeChange={setMode}
          showModeToggle={false}
        />
      </div>
    );
  },
};
