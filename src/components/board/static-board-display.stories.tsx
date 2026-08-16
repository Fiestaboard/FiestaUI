import type { Meta, StoryObj } from "@storybook/react";

import { StaticBoardDisplay } from "./static-board-display";

// Single-board stories here render wider than a 390px phone and are meant to:
// StaticBoardDisplay is the unscaled primitive, and a 22-column board's width
// is `cols x (tile + gutter) + bezel` — 379px at `sm`, 393px at `md` — against
// the ~326px a phone leaves. Wrapping these in a scroll container would hide
// the primitive's real constraint behind story chrome; the design system's
// answer for a slot narrower than the board is `ScaledBoardDisplay`, whose
// `PhoneWidth` story shows a full board in a 311px box (issue #192).
const meta = {
  title: "App/Board/StaticBoardDisplay",
  component: StaticBoardDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description: "Board message; lines split on \\n, colors via {red}…{/red} or {63} markers",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant (defaults to sm — this is the thumbnail/list renderer)",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white)",
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Board hardware family",
    },
    notesWide: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes wide (note_array only)",
    },
    notesTall: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes tall (note_array only)",
    },
    previewLabel: {
      control: "text",
      description:
        "Fixed accessible label for a shown message, overriding the derived one. Leave unset unless a hand-written description beats the board's own text — every board given the same string announces identically (issue #205).",
    },
    messageLabel: {
      control: false,
      description:
        "Builds the accessible label for a shown message, color markup already stripped. Defaults to `Board preview: ${message}`, the same contract as BoardDisplay's prop of this name.",
    },
    emptyLabel: {
      control: "text",
      description: "Accessible label when the board is empty",
    },
    className: {
      control: "text",
      description: "Additional CSS classes on the board bezel",
    },
  },
} satisfies Meta<typeof StaticBoardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessage =
  "HELLO WORLD\nWELCOME TO\nFIESTABOARD\n{red}NO{/red} {blue}ANIMATION{/blue}\n{63}{64}{65}{66}{67}{68}";

export const Default: Story = {
  args: {
    message: sampleMessage,
    size: "sm",
  },
};

export const MediumSize: Story = {
  args: {
    message: sampleMessage,
    size: "md",
  },
};

export const WhiteBoard: Story = {
  args: {
    message: sampleMessage,
    size: "md",
    boardType: "white",
  },
};

export const NoteDevice: Story = {
  args: {
    message: "STATIC NOTE\n{green}CHEAP TILES{/green}\nFOR LISTS °",
    size: "sm",
    deviceType: "note",
  },
};

export const Empty: Story = {
  args: {
    message: null,
    size: "sm",
  },
};

/**
 * Thumbnail grid — the use case this variant exists for: many boards at once.
 *
 * It is also the case that made issue #205 concrete: with a constant default
 * label these four boards all announced "Board preview, image" and a
 * screen-reader user had no way to tell them apart. Each now announces its own
 * message — "Board preview: PAGE ONE ALERTS", and so on. Inspect the four
 * `role="img"` names in the a11y panel to see it.
 *
 * Two 22-column thumbnails need ~774px, so on a phone the grid scrolls rather
 * than squeezing the boards: a `sm` board's 379px floor is not negotiable
 * (issue #192), and until `shrink-0` was added to the tiles a squeezed cell
 * silently rendered 4.2px-wide tiles instead. Above `sm` there is room for both
 * columns, so the scroll container is switched off and the tile shadows paint
 * outside their box as before.
 */
export const ThumbnailGrid = () => (
  <div className="max-w-[calc(100vw-4rem)] overflow-x-auto sm:max-w-none sm:overflow-x-visible">
    <div className="grid w-max grid-cols-2 gap-4">
      {[
        "PAGE ONE\n{red}ALERTS{/red}",
        "PAGE TWO\n{blue}WEATHER{/blue}",
        "PAGE THREE\n{green}TRANSIT{/green}",
        "PAGE FOUR\n{yellow}QUOTES{/yellow}",
      ].map((msg) => (
        <StaticBoardDisplay key={msg} message={msg} size="sm" />
      ))}
    </div>
  </div>
);

// Browser-side half of the #205 guard: four boards, four different names. The
// behavioural detail (what each name says, which prop wins) is asserted in
// jsdom by scripts/ci/tests/board-accessible-name.test.mjs; this holds the
// property a user actually depends on in a real render — that the boards in a
// grid are distinguishable by name at all.
ThumbnailGrid.play = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const names = Array.from(canvasElement.querySelectorAll('[data-slot="static-board-display"]')).map(
    (board) => board.getAttribute("aria-label") ?? "",
  );

  if (names.length !== 4) throw new Error(`expected four thumbnails, found ${names.length}`);
  if (new Set(names).size !== names.length) {
    throw new Error(
      `the thumbnails announce duplicate names (${names.join(" / ")}) — a screen-reader user cannot tell them ` +
        "apart (issue #205)",
    );
  }
  const missing = names.filter((name) => !/PAGE (ONE|TWO|THREE|FOUR)/.test(name));
  if (missing.length > 0) {
    throw new Error(`these names do not carry their board's message: ${missing.join(" / ")} (issue #205)`);
  }
};
