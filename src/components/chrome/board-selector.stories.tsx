import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { TooltipProvider } from "../overlays/tooltip";
import { BoardSelector, type BoardSelectorHubStatus } from "./board-selector";

const BOARDS = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen" },
  { id: "office", name: "" },
];

const LABELS = {
  boardSelector: "Select board",
  selectBoard: "Select a board",
  unnamedBoard: "Unnamed board",
  boardError: "Unavailable",
  hubStatus: { online: "Online", remote: "Remote", unreachable: "Can’t reach" },
};

/** The 07a Display switcher's household: one display, three hub states. */
const KITCHEN = [{ id: "kitchen", name: "Kitchen board" }];
const HUB_STATES: { status: BoardSelectorHubStatus; host: string }[] = [
  { status: "online", host: "fiestapi.local" },
  { status: "remote", host: "fiestapi.example.net" },
  { status: "unreachable", host: "fiestapi.local" },
];

/** One board whose client failed to initialize — badged with a status dot. */
const BOARDS_WITH_STATUS = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen", status: "error" as const },
  { id: "office", name: "" },
];

const meta = {
  title: "App/Chrome/BoardSelector",
  component: BoardSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    boards: {
      description: "Boards to offer, in menu order — empty names fall back to the unnamedBoard label.",
      control: "object",
    },
    value: {
      description: "id of the currently selected board.",
      control: "select",
      options: BOARDS.map((b) => b.id),
    },
    onChange: { description: "Called with the newly selected board id.", control: false },
    labels: {
      description: "Localized strings: trigger aria-label, empty placeholder, and unnamed-board fallback.",
      control: "object",
    },
    collapsed: {
      description: "Sidebar-collapsed mode: icon-only trigger with a tooltip naming the current board.",
      control: "boolean",
    },
    variant: {
      description: "Where the selector lives — the sidebar or the compact mobile header bar.",
      control: "inline-radio",
      options: ["sidebar", "mobileHeader"],
    },
    host: {
      description: "The hub this app talks to, e.g. fiestapi.local. Shown on the hub line.",
      control: "text",
    },
    status: {
      description:
        "Hub reachability. Always words (labels.hubStatus) beside a StatusDot, or a glyph on the collapsed rail.",
      control: "inline-radio",
      options: [undefined, "online", "remote", "unreachable"],
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={0}>
        {/* The selector reads sidebar tokens — show it on the gradient. */}
        <div className="sidebar-gradient w-64 rounded-xl p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof BoardSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keyed on args.value so the `value` control re-seeds local selection state. */
function ControlledBoardSelector(args: React.ComponentProps<typeof BoardSelector>) {
  const [value, setValue] = useState(args.value);
  return <BoardSelector {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    boards: BOARDS,
    value: "living-room",
    onChange: () => {},
    labels: LABELS,
    collapsed: false,
    variant: "sidebar",
  },
  render: function Render(args) {
    return <ControlledBoardSelector key={args.value} {...args} />;
  },
};

export const Collapsed: Story = {
  args: {
    boards: BOARDS,
    value: "kitchen",
    onChange: () => {},
    labels: LABELS,
    collapsed: true,
  },
};

export const MobileHeader: Story = {
  args: {
    boards: BOARDS,
    value: "living-room",
    onChange: () => {},
    labels: LABELS,
    variant: "mobileHeader",
  },
};

/**
 * A board with `status: "error"` shows a destructive dot beside its name in
 * the list — and in the trigger when it is the selected board — so an
 * unavailable board is flagged on the surface that enumerates the fleet.
 */
export const WithStatus: Story = {
  args: {
    boards: BOARDS_WITH_STATUS,
    value: "kitchen",
    onChange: () => {},
    labels: LABELS,
    variant: "sidebar",
  },
  render: function Render(args) {
    return <ControlledBoardSelector key={args.value} {...args} />;
  },
};

/**
 * FiestaBoard BB-A-11 (07a `310:34278`): each display's "Type W×H · <page>"
 * under its name, as the option's description; an errored display adds its
 * `boardError` description. The list is portaled, so VRT (which shoots
 * `#storybook-root`) does not capture it; `play` holds the contract.
 */
export const WithDetail: Story = {
  args: {
    boards: [
      { id: "kitchen", name: "Kitchen board", description: "Flagship 22 × 6 · Dinner note" },
      { id: "fridge", name: "Fridge note", description: "Note 15 × 3 · Grocery list" },
      { id: "den", name: "Den TV", description: "FiestaPanel 34 × 14 · Family board", status: "error" as const },
    ],
    value: "kitchen",
    onChange: () => {},
    labels: LABELS,
    variant: "sidebar",
  },
  render: function Render(args) {
    return <ControlledBoardSelector key={args.value} {...args} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    const list = within(await within(document.body).findByRole("listbox"));
    await expect(list.getByRole("option", { name: "Kitchen board" })).toHaveAccessibleDescription(
      "Flagship 22 × 6 · Dinner note",
    );
    await expect(list.getByRole("option", { name: "Den TV" })).toHaveAccessibleDescription(/FiestaPanel 34 × 14/);
  },
};

/**
 * Slice 1.4c: the hub line. Under the sidebar trigger it reads "host · State"
 * beside a StatusDot (07a `302:2055`). The state is words first; the dot
 * only repeats them.
 */
export const HubOnline: Story = {
  args: {
    boards: KITCHEN,
    value: "kitchen",
    onChange: () => {},
    labels: LABELS,
    host: "fiestapi.local",
    status: "online",
  },
};

/** Reached through a remote address: an info dot and the word "Remote". */
export const HubRemote: Story = {
  args: { ...HubOnline.args, host: "fiestapi.example.net", status: "remote" } as Story["args"],
};

/** The hub is not answering: a destructive dot and "Can’t reach". */
export const HubUnreachable: Story = {
  args: { ...HubOnline.args, status: "unreachable" } as Story["args"],
};

/**
 * On the 48px rail there is no room for words beside the trigger, so a 12px
 * glyph whose SHAPE differs per state (wifi, globe, wifi-off) sits under it,
 * and the words move into the tooltip and the trigger's description.
 */
export const HubCollapsed: Story = {
  args: { ...HubUnreachable.args, collapsed: true } as Story["args"],
};

/** The mobile header's two-line pill: the display, then "State · host", which truncates. */
export const HubMobileHeader: Story = {
  args: { ...HubRemote.args, variant: "mobileHeader" } as Story["args"],
};

/**
 * Every layout × hub state of the 07a Display switcher (`302:2146`, State =
 * Default) in one frame: sidebar, rail, mobile header.
 */
export const HubStates: Story = {
  args: { boards: KITCHEN, value: "kitchen", onChange: () => {}, labels: LABELS },
  render: function Render(args) {
    return (
      <div className="flex flex-col gap-4">
        {HUB_STATES.map((hub) => (
          <BoardSelector key={`sidebar-${hub.status}`} {...args} {...hub} />
        ))}
        <div className="flex gap-3">
          {HUB_STATES.map((hub) => (
            <div key={`rail-${hub.status}`} className="w-12">
              <BoardSelector {...args} {...hub} collapsed />
            </div>
          ))}
        </div>
        {HUB_STATES.map((hub) => (
          <div key={`mobile-${hub.status}`}>
            <BoardSelector {...args} {...hub} variant="mobileHeader" />
          </div>
        ))}
      </div>
    );
  },
};
