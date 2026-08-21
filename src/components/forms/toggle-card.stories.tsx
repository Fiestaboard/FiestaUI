import type { Meta, StoryObj } from "@storybook/react";
import {
  Cloud,
  GalleryHorizontalEnd,
  HardDrive,
  LayoutTemplate,
  Monitor,
  Rows3,
  Shuffle,
  Sparkles,
  StickyNote,
  Zap,
} from "lucide-react";
import * as React from "react";

import { Badge } from "../feedback/badge";
import { SegmentedControl, SegmentedControlItem, ToggleCard, ToggleCardGroup } from "./toggle-card";

const meta = {
  title: "Forms/ToggleCard",
  component: ToggleCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Selectable-option tile, plus its compact pill sibling (`SegmentedControl`). Selection semantics are " +
          "structural, not a prop: a card inside `ToggleCardGroup` (or a pill inside `SegmentedControl`) is a " +
          "`radio` in a `radiogroup` — one tab stop, arrow keys move and select. The same card on its own with " +
          "`pressed` is an `aria-pressed` toggle button with its own tab stop. Multi-select is a set of " +
          "standalone toggles, never a group.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "Identifies the card inside a ToggleCardGroup. Ignored (and unnecessary) when standalone.",
    },
    pressed: {
      control: "boolean",
      description:
        "Standalone toggle state — sets `aria-pressed`. Only outside a group; inside one the group's `value` " +
        "decides. Leave undefined for a card with no on/off meaning (it then gets no aria-pressed at all).",
    },
    onPressedChange: {
      control: false,
      description: "Fired with the next pressed state when a standalone card is activated",
    },
    icon: {
      control: false,
      description: "Leading icon element; sized to 16px unless it carries its own size class",
    },
    title: {
      control: "text",
      description: "Primary label — provides the card's accessible name",
    },
    description: {
      control: "text",
      description: "Secondary line under the title",
    },
    meta: {
      control: false,
      description: "Trailing content on the title row (a badge, a size indicator)",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Tile scale; inherited from the group unless set per card",
    },
    align: {
      control: "select",
      options: ["start", "center"],
      description: "Content alignment — `center` stacks icon over title for square tiles",
    },
    indicator: {
      control: "select",
      options: ["corner", "trailing", false],
      description:
        'Where the selected-check goes, so the state is never carried by hue alone. `"corner"` (=== `true`, the ' +
        'default) floats it over the tile and reserves the space a long title would slide under; `"trailing"` ' +
        "puts it in flow at the end of the title row, for full-width picker rows. `false` removes it — only " +
        "when the tile already shows its own selected artwork.",
    },
    children: {
      control: false,
      description: "Extra body content below the title row — a preview, a thumbnail strip",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the card element",
    },
  },
} satisfies Meta<typeof ToggleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keyed on args.pressed so the `pressed` control re-seeds local state. */
function StandaloneToggleCard(args: React.ComponentProps<typeof ToggleCard>) {
  const [pressed, setPressed] = React.useState(args.pressed ?? false);
  return <ToggleCard {...args} pressed={pressed} onPressedChange={setPressed} />;
}

/**
 * A standalone card is a toggle button: `aria-pressed`, its own tab stop,
 * Space or Enter flips it. Use this shape only when the option genuinely
 * stands alone — one of N belongs in a `ToggleCardGroup`.
 */
export const Default: Story = {
  args: {
    title: "Show board previews",
    description: "Render a live thumbnail on every page card.",
    icon: <Sparkles />,
    pressed: true,
    size: "md",
    align: "start",
    indicator: "corner",
  },
  render: function Render(args) {
    return (
      <div className="w-full sm:w-80">
        <StandaloneToggleCard key={String(args.pressed)} {...args} />
      </div>
    );
  },
};

/**
 * The single-select case, and the reason this component exists: one
 * `radiogroup`, one tab stop, arrow keys move the selection and wrap.
 * Cards take a `value`; the group owns which one is checked.
 */
export const SingleSelectGroup = () => (
  <ToggleCardGroup aria-label="Board type" defaultValue="flagship" columns="2" className="w-full sm:w-[520px]">
    <ToggleCard value="flagship" icon={<Monitor />} title="Flagship" description="22 × 6 characters, mains powered." />
    <ToggleCard value="note" icon={<StickyNote />} title="Note" description="Custom grid, battery powered." />
  </ToggleCardGroup>
);

/**
 * `align="center"` stacks icon over title for square tiles — the shape the
 * setup wizard uses for device pickers.
 */
export const CenteredTiles = () => (
  <ToggleCardGroup
    aria-label="Board colour"
    defaultValue="black"
    columns="2"
    align="center"
    className="w-full sm:w-[420px]"
  >
    <ToggleCard value="black" icon={<Monitor />} title="Black" description="Classic split-flap" />
    <ToggleCard value="white" icon={<Monitor />} title="White" description="High contrast" />
  </ToggleCardGroup>
);

/**
 * `size="sm"` is the settings-panel scale: a two-up choice tucked inside a
 * card without dominating it.
 */
export const CompactGroup = () => (
  <div className="w-full rounded-xl border bg-card p-4 sm:w-[420px]">
    {/* A radiogroup is not a labelable element, so the group is named by
        reference (aria-labelledby) rather than by a <label for>. */}
    <span id="api-mode-label" className="mb-1 block text-sm font-medium">
      API mode
    </span>
    <p className="mb-3 text-xs text-muted-foreground">Where this board pulls its messages from.</p>
    <ToggleCardGroup aria-labelledby="api-mode-label" defaultValue="local" columns="2" size="sm">
      <ToggleCard value="local" icon={<HardDrive />} title="Local" description="On your network" />
      <ToggleCard value="cloud" icon={<Cloud />} title="Cloud" description="Via Fiesta servers" />
    </ToggleCardGroup>
  </div>
);

/**
 * `meta` fills the trailing end of the title row and `children` hangs a body
 * under it — the page/collection pickers, where each option carries a badge
 * and a preview.
 */
export const RichCards = () => (
  <ToggleCardGroup aria-label="Active page" defaultValue="welcome" size="lg" className="w-full sm:w-[440px]">
    <ToggleCard
      value="welcome"
      icon={<LayoutTemplate />}
      title="Welcome board"
      description="Updated 2 hours ago"
      meta={<Badge variant="secondary">22 × 6</Badge>}
    >
      <span className="mt-1 block h-16 w-full rounded-md bg-muted" />
    </ToggleCard>
    <ToggleCard
      value="menu"
      icon={<LayoutTemplate />}
      title="Daily menu"
      description="Updated yesterday"
      meta={<Badge variant="secondary">22 × 6</Badge>}
    >
      <span className="mt-1 block h-16 w-full rounded-md bg-muted" />
    </ToggleCard>
    <ToggleCard
      value="rotation"
      icon={<GalleryHorizontalEnd />}
      title="Weekly rotation"
      description="4 pages"
      meta={<Badge variant="secondary">Collection</Badge>}
    >
      <span className="mt-1 block h-16 w-full rounded-md bg-muted" />
    </ToggleCard>
  </ToggleCardGroup>
);

/** Every tile scale, side by side. */
export const Sizes = () => (
  <div className="flex w-full flex-col gap-6 sm:w-[420px]">
    {(["sm", "md", "lg"] as const).map((size) => (
      <ToggleCardGroup key={size} aria-label={`${size} example`} defaultValue="a" columns="2" size={size}>
        <ToggleCard value="a" icon={<Zap />} title={`Size ${size}`} description="Selected" />
        <ToggleCard value="b" icon={<Zap />} title={`Size ${size}`} description="Idle" />
      </ToggleCardGroup>
    ))}
  </div>
);

/**
 * `indicator="trailing"` moves the check into the title row instead of
 * floating it over the corner — the picker-dialog shape, where an option is a
 * full-width row and the top-right corner is nowhere near its label. Nothing
 * else changes: the row is still a `radio` inside a `radiogroup`, and it is
 * `aria-checked` that announces the state. The hand-rolled version of this row
 * downstream shows the same check with no ARIA at all, so the selection is
 * invisible to a screen reader — that bug is unreachable from here, because
 * the check is `aria-hidden` decoration in both placements.
 */
export const TrailingIndicatorRows = () => (
  <ToggleCardGroup aria-label="Page to show" defaultValue="menu" indicator="trailing" className="w-full sm:w-[420px]">
    <ToggleCard value="none" title="None" description="Leave this slot empty" />
    <ToggleCard
      value="welcome"
      icon={<LayoutTemplate />}
      title="Welcome board"
      meta={<Badge variant="secondary">22 × 6</Badge>}
    />
    <ToggleCard
      value="menu"
      icon={<LayoutTemplate />}
      title="Daily menu"
      meta={<Badge variant="secondary">22 × 6</Badge>}
    />
    <ToggleCard value="rotation" icon={<GalleryHorizontalEnd />} title="Weekly rotation" description="4 pages" />
  </ToggleCardGroup>
);

/**
 * Both placements at both alignments, checked and unchecked. `corner` floats
 * over the tile and reserves its room in the padding — on a centred tile,
 * symmetrically, so the content stays centred. `trailing` takes its room in
 * the row, after `meta`.
 */
export const IndicatorPlacements = () => (
  <div className="flex w-full flex-col gap-6 sm:w-[420px]">
    {(["corner", "trailing"] as const).map((placement) => (
      <ToggleCardGroup
        key={placement}
        aria-label={`Indicator ${placement}`}
        defaultValue="a"
        columns="2"
        indicator={placement}
      >
        <ToggleCard value="a" icon={<Zap />} title={placement} description="Selected" />
        <ToggleCard value="b" icon={<Zap />} title={placement} description="Idle" />
      </ToggleCardGroup>
    ))}
    <ToggleCardGroup aria-label="Indicator corner, centred" defaultValue="a" columns="2" align="center">
      <ToggleCard value="a" icon={<Monitor />} title="corner" description="Centred tile" />
      <ToggleCard value="b" icon={<Monitor />} title="corner" description="Centred tile" />
    </ToggleCardGroup>
  </div>
);

/**
 * `indicator={false}` drops the corner check where the tile already shows
 * its own selected artwork. Prefer keeping it: without it, selection is
 * signalled by border and fill colour alone.
 */
export const WithoutIndicator = () => (
  <ToggleCardGroup
    aria-label="Transition direction"
    defaultValue="column"
    columns="2"
    indicator={false}
    className="w-full sm:w-[420px]"
  >
    <ToggleCard value="column" icon={<Rows3 />} title="By column" />
    <ToggleCard value="random" icon={<Shuffle />} title="Random" />
  </ToggleCardGroup>
);

/**
 * A whole group can be disabled (e.g. while a save is in flight), or a single
 * option can be — an unavailable option stays announced, it just cannot be
 * chosen.
 */
export const Disabled = () => (
  <div className="flex w-full flex-col gap-6 sm:w-[420px]">
    <ToggleCardGroup aria-label="Disabled group" defaultValue="flagship" columns="2" disabled>
      <ToggleCard value="flagship" icon={<Monitor />} title="Flagship" description="Whole group disabled" />
      <ToggleCard value="note" icon={<StickyNote />} title="Note" description="Whole group disabled" />
    </ToggleCardGroup>
    <ToggleCardGroup aria-label="One disabled option" defaultValue="flagship" columns="2">
      <ToggleCard value="flagship" icon={<Monitor />} title="Flagship" description="Available" />
      <ToggleCard value="note" icon={<StickyNote />} title="Note" description="Not on this plan" disabled />
    </ToggleCardGroup>
  </div>
);

function ControlledGroup() {
  const [value, setValue] = React.useState("flagship");
  return (
    <div className="flex w-full flex-col gap-3 sm:w-[420px]">
      <ToggleCardGroup aria-label="Board type" value={value} onValueChange={setValue} columns="2">
        <ToggleCard value="flagship" icon={<Monitor />} title="Flagship" description="22 × 6 characters" />
        <ToggleCard value="note" icon={<StickyNote />} title="Note" description="Custom grid" />
      </ToggleCardGroup>
      <p className="text-sm text-muted-foreground">
        Selected: <code className="font-mono">{value}</code>
      </p>
    </div>
  );
}

/**
 * Controlled: `value` + `onValueChange`. The callback receives the new value
 * only, so `onValueChange={setValue}` is safe — no stray second argument.
 */
export const Controlled = () => <ControlledGroup />;

function MultiSelectCards() {
  const [enabled, setEnabled] = React.useState<string[]>(["previews"]);
  const toggle = (key: string) =>
    setEnabled((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <div role="group" aria-label="Board features" className="flex w-full flex-col gap-3 sm:w-80">
      <ToggleCard
        title="Board previews"
        description="Render a live thumbnail on every page card."
        icon={<Sparkles />}
        pressed={enabled.includes("previews")}
        onPressedChange={() => toggle("previews")}
      />
      <ToggleCard
        title="Auto rotate"
        description="Advance to the next page on a timer."
        icon={<GalleryHorizontalEnd />}
        pressed={enabled.includes("rotate")}
        onPressedChange={() => toggle("rotate")}
      />
    </div>
  );
}

/**
 * Multi-select is deliberately NOT a group: independent options are
 * independent toggle buttons (`aria-pressed`, one tab stop each) inside a
 * plain labelled `role="group"`. Putting them in a radiogroup would promise
 * arrow-key navigation and mutual exclusivity that do not exist.
 */
export const MultiSelectIsNotAGroup = () => <MultiSelectCards />;

/**
 * The compact flavour: same radiogroup semantics, toolbar scale. This is the
 * shape the animation and transition settings rows want.
 */
export const SegmentedControlDefault = () => (
  <SegmentedControl aria-label="Board animations" defaultValue="subtle">
    <SegmentedControlItem value="off">Off</SegmentedControlItem>
    <SegmentedControlItem value="subtle">Subtle</SegmentedControlItem>
    <SegmentedControlItem value="full">Full</SegmentedControlItem>
  </SegmentedControl>
);

/** Pill scales. `sm` still clears the 24×24 minimum target size. */
export const SegmentedControlSizes = () => (
  <div className="flex flex-col items-start gap-4">
    {(["sm", "md", "lg"] as const).map((size) => (
      <SegmentedControl key={size} aria-label={`Flap speed (${size})`} defaultValue="standard" size={size}>
        <SegmentedControlItem value="gentle">Gentle</SegmentedControlItem>
        <SegmentedControlItem value="standard">Standard</SegmentedControlItem>
        <SegmentedControlItem value="rapid">Rapid</SegmentedControlItem>
      </SegmentedControl>
    ))}
  </div>
);

/** Icons sit inline with the label and pick up the selected colour. */
export const SegmentedControlWithIcons = () => (
  <SegmentedControl aria-label="Transition strategy" defaultValue="column">
    <SegmentedControlItem value="column">
      <Rows3 />
      By column
    </SegmentedControlItem>
    <SegmentedControlItem value="random">
      <Shuffle />
      Random
    </SegmentedControlItem>
    <SegmentedControlItem value="instant">
      <Zap />
      Instant
    </SegmentedControlItem>
  </SegmentedControl>
);

/** Long option sets wrap by default rather than overflowing their panel. */
export const SegmentedControlWrapping = () => (
  <SegmentedControl aria-label="Transition strategy" defaultValue="row" className="w-full sm:w-[420px]">
    {["Column", "Reverse column", "Edges to centre", "Row", "Diagonal", "Random", "Instant"].map((option) => (
      <SegmentedControlItem key={option} value={option.toLowerCase()}>
        {option}
      </SegmentedControlItem>
    ))}
  </SegmentedControl>
);

function FilterChips() {
  const [tags, setTags] = React.useState<string[]>(["weather"]);
  const toggle = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));

  return (
    <div role="group" aria-label="Filter plugins by category" className="flex flex-wrap items-center gap-2">
      {["weather", "transit", "art", "home"].map((tag) => (
        <SegmentedControlItem key={tag} pressed={tags.includes(tag)} onPressedChange={() => toggle(tag)}>
          {tag}
        </SegmentedControlItem>
      ))}
    </div>
  );
}

/**
 * A pill outside a `SegmentedControl` is a filter chip: `aria-pressed`, its
 * own tab stop, independently on or off.
 */
export const SegmentedControlStandaloneChips = () => <FilterChips />;

/** A group can be disabled wholesale, or one option at a time. */
export const SegmentedControlDisabled = () => (
  <div className="flex flex-col items-start gap-4">
    <SegmentedControl aria-label="Disabled group" defaultValue="subtle" disabled>
      <SegmentedControlItem value="off">Off</SegmentedControlItem>
      <SegmentedControlItem value="subtle">Subtle</SegmentedControlItem>
      <SegmentedControlItem value="full">Full</SegmentedControlItem>
    </SegmentedControl>
    <SegmentedControl aria-label="One disabled option" defaultValue="subtle">
      <SegmentedControlItem value="off">Off</SegmentedControlItem>
      <SegmentedControlItem value="subtle">Subtle</SegmentedControlItem>
      <SegmentedControlItem value="full" disabled>
        Full (beta)
      </SegmentedControlItem>
    </SegmentedControl>
  </div>
);

/**
 * Keyboard contract, both shapes on one screen. Tab reaches the group once
 * and lands on the checked option; arrow keys (all four) move the selection
 * and wrap at the ends, and Home/End jump to the first and last option,
 * moving the selection with them. Tab again leaves the whole group — then the
 * standalone toggle below takes its own stop, where Space or Enter flips it
 * in place.
 */
export const KeyboardNavigation = () => (
  <div className="flex w-full flex-col gap-6 sm:w-[460px]">
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">One tab stop, arrows select</span>
      <ToggleCardGroup aria-label="Transition strategy" defaultValue="column" columns="2">
        <ToggleCard value="column" icon={<Rows3 />} title="By column" />
        <ToggleCard value="random" icon={<Shuffle />} title="Random" />
        <ToggleCard value="instant" icon={<Zap />} title="Instant" />
        <ToggleCard value="stack" icon={<GalleryHorizontalEnd />} title="Stack" />
      </ToggleCardGroup>
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Same contract at pill scale</span>
      <SegmentedControl aria-label="Flap speed" defaultValue="standard">
        <SegmentedControlItem value="gentle">Gentle</SegmentedControlItem>
        <SegmentedControlItem value="standard">Standard</SegmentedControlItem>
        <SegmentedControlItem value="rapid">Rapid</SegmentedControlItem>
      </SegmentedControl>
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Its own tab stop, Space toggles</span>
      <MultiSelectCards />
    </div>
  </div>
);
