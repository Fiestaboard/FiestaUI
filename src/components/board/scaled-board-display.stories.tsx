import type { Meta, StoryObj } from "@storybook/react";

import { ScaledBoardDisplay } from "./scaled-board-display";

const meta = {
  title: "App/Board/ScaledBoardDisplay",
  component: ScaledBoardDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    // ScaledBoardDisplay scales to the closest ancestor that genuinely caps
    // width. In Storybook there is no such ancestor by default:
    // `#storybook-root` is a shrink-to-fit flex item of `body.sb-main-centered`
    // (see #191), so every wrapper above the board — including the component's
    // own `w-full` container — is sized *by the board* and the scaler correctly
    // concludes it has all the room it needs. That is why these stories still
    // overflowed a 390px phone even though the component exists to prevent
    // exactly that (issue #192).
    //
    // A viewport-relative cap is the one kind that survives shrink-to-fit,
    // since it does not resolve against a parent the content sized. The
    // subtracted chrome is the preview decorator's padding (`p-4 sm:p-8`) plus
    // Storybook's own 1rem on the root; at desktop widths the cap never binds,
    // so desktop rendering is unchanged.
    (Story) => (
      <div className="max-w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-6rem)]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    message: {
      control: "text",
      description: "Board message; lines split on \\n, colors via {red}…{/red} or {63} markers",
    },
    isLoading: {
      control: "boolean",
      description: "Loading state — all tiles cycle through the character set continuously",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant of the underlying BoardDisplay",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white)",
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Board hardware family; note arrays get the Fit / Actual size toggle",
    },
    notesWide: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes wide (note_array only)",
    },
    notesTall: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes tall (note_array only)",
    },
    animationsEnabled: {
      control: "boolean",
      description: "Run the split-flap animation; when false tiles snap to their targets",
    },
    previewSizeLabel: {
      control: "text",
      description: "Accessible label for the Fit / Actual size toggle group",
    },
    fitModeLabel: {
      control: "text",
      description: "Fit-mode toggle button label",
    },
    actualModeLabel: {
      control: "text",
      description: "Actual-size toggle button label",
    },
  },
} satisfies Meta<typeof ScaledBoardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessage = "HELLO WORLD\nWELCOME TO\nFIESTABOARD\n{red}SCALED{/red} {blue}TO FIT{/blue}";

export const Default: Story = {
  args: {
    message: sampleMessage,
    size: "md",
  },
};

/**
 * The canonical reason this wrapper exists: the same board rendered into
 * progressively narrower slots. Each container has `overflow-hidden`, so
 * ScaledBoardDisplay measures it and applies `transform: scale()` — the
 * board never overflows and never scales past 100%.
 *
 * Below the `sm` breakpoint the three slots go full-width instead of holding
 * their pixel widths, since a 640px slot cannot be shown on a 390px phone; the
 * captions describe the `sm`-and-up geometry.
 */
export const Scaled = () => (
  <div className="flex flex-col items-center gap-8">
    {[
      { width: 640, w: "sm:w-[640px]" },
      { width: 440, w: "sm:w-[440px]" },
      { width: 280, w: "sm:w-[280px]" },
    ].map(({ width, w }) => (
      <div key={width} className="flex w-full flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">{width}px container</p>
        {/* `w-full sm:w-[Npx]` rather than a bare pixel width — see #191: at
            >= sm the declaration is literally `width: Npx`, so desktop is
            unchanged, while below it the slot follows the viewport. */}
        <div className={`w-full ${w} overflow-hidden rounded-lg border border-dashed border-border p-2`}>
          <ScaledBoardDisplay message={sampleMessage} size="md" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Issue #192: a 6×22 flagship board's smallest unscaled render is ~379px, and a
 * 390px phone leaves a ~311px content box — so `BoardDisplay` on its own cannot
 * render on a phone at any `size`. This is the fix that needs no new tile
 * geometry: the slot below is 311px, and the board is scaled into it whole, so
 * every proportion issue #176 made invariant is preserved exactly.
 */
export const PhoneWidth: Story = {
  args: {
    message: sampleMessage,
    size: "md",
  },
  render: (args) => (
    <div className="w-[311px] max-w-full overflow-hidden rounded-lg border border-dashed border-border">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};

/** Note arrays show the Fit / Actual size toggle above the preview. */
export const NoteArrayWithToggle: Story = {
  args: {
    message:
      "A VERY WIDE NOTE ARRAY MESSAGE SPANNING THREE NOTES SIDE BY SIDE\n{green}FIT MODE SCALES IT DOWN{/green} — ACTUAL MODE SCROLLS AT FULL SIZE\nTOGGLE ABOVE TO COMPARE THE TWO PREVIEW MODES RIGHT HERE OK",
    size: "md",
    deviceType: "note_array",
    notesWide: 3,
    notesTall: 1,
  },
  render: (args) => (
    // Fixed width on purpose: "actual" mode scrolls the three-note array at
    // full size, so a fluid container would be sized by that intrinsic width
    // instead of clipping it. `max-w-full` now has something to resolve
    // against — the meta decorator's viewport cap — so the slot follows the
    // phone instead of overflowing it.
    <div className="w-[560px] max-w-full overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
  // Regression guard for issue #197, asserted in a real layout because this is
  // a layout bug: `width: fit-content` clamped the board's own box to the
  // scroll container, so scrolling to the end left the tiles outside the frame
  // — the board's right edge sat 378px short of the container's.
  //
  // Runs in CI via the storybook test-runner (the a11y-tests job), which is the
  // only CI job with a browser and this build. The mode is restored to "fit" at
  // the end because the toggle persists to sessionStorage, which would
  // otherwise follow the tab into every later note-array story.
  play: async ({ canvasElement }) => {
    const buttonNamed = (label: string) =>
      Array.from(canvasElement.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

    const settle = async <T,>(read: () => T | null | undefined): Promise<T> => {
      for (let i = 0; i < 60; i++) {
        const value = read();
        if (value) return value;
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      throw new Error("timed out waiting for the actual-size preview to render");
    };

    (await settle(() => buttonNamed("Actual size"))).click();

    const scroll = await settle(() => canvasElement.querySelector<HTMLElement>('[data-testid="actual-size-scroll"]'));
    const board = await settle(() => scroll.querySelector<HTMLElement>('[data-slot="board-display"]'));

    if (scroll.scrollWidth <= scroll.clientWidth) {
      throw new Error(
        `this guard needs a board wider than its slot; got board ${scroll.scrollWidth}px in slot ${scroll.clientWidth}px`,
      );
    }

    scroll.scrollLeft = scroll.scrollWidth;
    const overshoot = scroll.getBoundingClientRect().right - board.getBoundingClientRect().right;
    scroll.scrollLeft = 0;

    // The bezel's right-hand padding is the classic follow-on failure: a board
    // that reaches the scroll end but has had its trailing padding collapsed is
    // still wrong. Measure it against the last tile in the top row.
    const tiles = board.querySelectorAll<HTMLElement>("[data-note-row] [data-note-tile]");
    const lastTile = tiles[tiles.length - 1];
    const trailingPadding = lastTile ? board.getBoundingClientRect().right - lastTile.getBoundingClientRect().right : 0;

    (await settle(() => buttonNamed("Fit"))).click();

    if (Math.abs(overshoot) > 1) {
      throw new Error(
        `issue #197: at the end of the scroll the board's right edge is ${overshoot.toFixed(1)}px from the ` +
          `container's; the frame must reach the end of the scroll (within 1px)`,
      );
    }
    if (!(trailingPadding > 0)) {
      throw new Error(
        `issue #197: the bezel's trailing padding collapsed to ${trailingPadding.toFixed(1)}px — the last tile must ` +
          `still sit inside the frame at the end of the scroll`,
      );
    }
  },
};

export const WhiteBoard: Story = {
  args: {
    message: sampleMessage,
    size: "md",
    boardType: "white",
  },
  render: (args) => (
    <div className="w-full sm:w-[420px] overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};

/** The full args surface with controls. */
export const Playground: Story = {
  args: {
    message: sampleMessage,
    isLoading: false,
    size: "md",
    boardType: "black",
    deviceType: "flagship",
    notesWide: 1,
    notesTall: 1,
    animationsEnabled: true,
    previewSizeLabel: "Preview size",
    fitModeLabel: "Fit",
    actualModeLabel: "Actual size",
  },
  render: (args) => (
    <div className="w-full sm:w-[480px] max-w-full overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};
