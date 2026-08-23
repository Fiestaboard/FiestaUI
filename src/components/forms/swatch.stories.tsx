import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { Swatch, SwatchGroup } from "./swatch";

const meta = {
  title: "Forms/Swatch",
  component: Swatch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Colour-only one-of-N picker: the swatch IS the option, so there is no label beside it and the fill is " +
          "the choice. Selection semantics are structural, not a prop — a swatch inside `SwatchGroup` is a " +
          "`radio` in a `radiogroup` (one tab stop, arrows move and select, Home/End jump to the ends), and the " +
          "same swatch alone with `pressed` is an `aria-pressed` toggle button. Unlike `ToggleCard` and " +
          "`SegmentedControl`, selection can never recolour the option: the fill is the payload, so the ring " +
          "lives outside it and a `--primary` check disc rides on top as the non-colour cue.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "color",
      description:
        "The colour being picked, as any CSS colour — a board-surface token, a plugin colour-rule hue or a raw " +
        "hex. Applied as an inline `background-color`, the only route an arbitrary runtime value has to the DOM.",
    },
    label: {
      control: "text",
      description:
        "Localized accessible name, and the swatch's ONLY name — it renders no text. Name the colour " +
        '("Black"), not its value; a hex string is not a name.',
    },
    value: {
      control: "text",
      description: "Identifies the swatch inside a SwatchGroup. Ignored (and unnecessary) when standalone.",
    },
    pressed: {
      control: "boolean",
      description:
        "Standalone toggle state — sets `aria-pressed`. Only outside a group; inside one the group's `value` " +
        "decides. Leave undefined for a swatch that merely opens a picker (it then gets no aria-pressed at all).",
    },
    onPressedChange: {
      control: false,
      description: "Fired with the next pressed state when a standalone swatch is activated",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description:
        "Fill diameter — 20 / 24 / 32px. The button around it is 28 / 32 / 40px, so every target clears WCAG " +
        "2.2 SC 2.5.8's 24×24 minimum. Inherited from the group unless set per swatch.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Swatch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The board's two hardware surfaces — the choice all three app copies make. */
const boardSurfaces = [
  { value: "black", color: "var(--color-board-surface-dark)", label: "Black" },
  { value: "white", color: "var(--color-board-surface-light)", label: "White" },
];

/** The six locked board hues, as the plugin colour rules offer them. */
const boardHues = [
  { value: "red", color: "var(--color-board-red)", label: "Red" },
  { value: "orange", color: "var(--color-board-orange)", label: "Orange" },
  { value: "yellow", color: "var(--color-board-yellow)", label: "Yellow" },
  { value: "green", color: "var(--color-board-green)", label: "Green" },
  { value: "blue", color: "var(--color-board-blue)", label: "Blue" },
  { value: "violet", color: "var(--color-board-violet)", label: "Violet" },
];

/** Keyed on args.pressed so the `pressed` control re-seeds local state. */
function StandaloneSwatch(args: React.ComponentProps<typeof Swatch>) {
  const [pressed, setPressed] = React.useState(args.pressed ?? false);
  return <Swatch {...args} pressed={pressed} onPressedChange={setPressed} />;
}

/**
 * A standalone swatch is a toggle button: `aria-pressed`, its own tab stop,
 * Space or Enter flips it. Use this shape only when the colour genuinely
 * stands alone — one of N belongs in a `SwatchGroup`.
 */
export const Default: Story = {
  args: {
    color: "var(--color-board-orange)",
    label: "Orange",
    pressed: true,
    size: "md",
  },
  render: function Render(args) {
    return <StandaloneSwatch key={String(args.pressed)} {...args} />;
  },
};

/**
 * The single-select case, and the reason this component exists: one
 * `radiogroup`, one tab stop, arrow keys move the selection and wrap. This
 * is the shape `display-settings` and the setup wizard hand-roll today — as
 * N separate `aria-pressed` buttons, which announces N unrelated toggles
 * with no group and no "1 of 2".
 */
export const BoardColour = () => (
  <SwatchGroup aria-label="Board colour" defaultValue="black">
    {boardSurfaces.map((swatch) => (
      <Swatch key={swatch.value} {...swatch} />
    ))}
  </SwatchGroup>
);

/**
 * Every diameter, each with a selection so the ring, its 4px offset and the
 * check disc are all visible at scale. Fills are 20 / 24 / 32px; the targets
 * around them are 28 / 32 / 40px — the issue's numbers survive as the circle
 * you see, not as the box a finger has to hit, because a 20px target fails
 * SC 2.5.8 outright.
 */
export const Sizes = () => (
  <div className="flex flex-col items-start gap-6">
    {(["sm", "md", "lg"] as const).map((size) => (
      <SwatchGroup key={size} aria-label={`Board hue (${size})`} size={size} defaultValue="green">
        {boardHues.map((swatch) => (
          <Swatch key={swatch.value} {...swatch} />
        ))}
      </SwatchGroup>
    ))}
  </div>
);

/**
 * A palette wraps rather than overflowing its panel. Arrow keys stay
 * LINEAR through the wrapped rows — Up/Down step by one, not by a column
 * count, because a `flex-wrap` row has no fixed column count to step by.
 */
export const WrappingPalette = () => (
  <div className="w-full sm:w-64">
    <span id="swatch-palette-label" className="mb-2 block text-sm font-medium">
      Colour rule
    </span>
    {/* A radiogroup is not a labelable element, so it is named by reference
        rather than by a <label for>. */}
    <SwatchGroup aria-labelledby="swatch-palette-label" defaultValue="blue">
      {[...boardHues, ...boardSurfaces].map((swatch) => (
        <Swatch key={swatch.value} {...swatch} />
      ))}
    </SwatchGroup>
  </div>
);

/**
 * The hostile fills, which are the whole reason selection lives outside the
 * circle. On a card surface: white (no edge of its own without the permanent
 * `--input` boundary), black, a fill that is exactly `--primary` — so a
 * `--primary` selection ring would vanish into it — and a fully transparent
 * one. Selected is the second: its ring is `--foreground` and its check disc
 * contrasts against itself, so both survive every fill above.
 */
export const HostileFills = () => (
  <div className="rounded-xl border border-border bg-card p-4">
    <SwatchGroup aria-label="Hostile fills" defaultValue="primary">
      <Swatch value="white" color="#ffffff" label="Pure white" />
      <Swatch value="primary" color="var(--primary)" label="Tile orange" />
      <Swatch value="black" color="#000000" label="Pure black" />
      <Swatch value="transparent" color="transparent" label="No colour" />
    </SwatchGroup>
  </div>
);

/**
 * A whole group can be disabled (e.g. while a save is in flight), or a
 * single colour can be — an unavailable colour stays announced and stays in
 * the group's count, it just cannot be chosen.
 */
export const Disabled = () => (
  <div className="flex flex-col items-start gap-6">
    <SwatchGroup aria-label="Disabled group" defaultValue="red" disabled>
      {boardHues.slice(0, 4).map((swatch) => (
        <Swatch key={swatch.value} {...swatch} />
      ))}
    </SwatchGroup>
    <SwatchGroup aria-label="One disabled colour" defaultValue="red">
      {boardHues.slice(0, 4).map((swatch, index) => (
        <Swatch key={swatch.value} {...swatch} disabled={index === 3} />
      ))}
    </SwatchGroup>
  </div>
);

function ControlledSwatches() {
  const [value, setValue] = React.useState("black");
  return (
    <div className="flex flex-col items-start gap-3">
      <SwatchGroup aria-label="Board colour" value={value} onValueChange={setValue}>
        {boardSurfaces.map((swatch) => (
          <Swatch key={swatch.value} {...swatch} />
        ))}
      </SwatchGroup>
      <p className="text-sm text-muted-foreground">
        Selected: <code className="font-mono">{value}</code>
      </p>
    </div>
  );
}

/**
 * Controlled: `value` + `onValueChange`. The callback receives the new value
 * only, so `onValueChange={setValue}` is safe — no stray second argument
 * from Base UI's `(value, eventDetails)` pair.
 */
export const Controlled = () => <ControlledSwatches />;

function SwatchFilters() {
  const [hues, setHues] = React.useState<string[]>(["red"]);
  const toggle = (hue: string) =>
    setHues((current) => (current.includes(hue) ? current.filter((h) => h !== hue) : [...current, hue]));

  return (
    <div role="group" aria-label="Filter plugins by hue" className="flex flex-wrap items-center gap-2">
      {boardHues.map((swatch) => (
        <Swatch
          key={swatch.value}
          color={swatch.color}
          label={swatch.label}
          pressed={hues.includes(swatch.value)}
          onPressedChange={() => toggle(swatch.value)}
        />
      ))}
    </div>
  );
}

/**
 * Any-of-N is deliberately NOT a group: independent colours are independent
 * toggle buttons (`aria-pressed`, one tab stop each) inside a plain labelled
 * `role="group"`. Putting them in a radiogroup would promise mutual
 * exclusivity and arrow-key navigation that do not exist.
 */
export const MultiSelectIsNotAGroup = () => <SwatchFilters />;

/**
 * A swatch may carry a CHARACTER instead of a fill (#261) — the Flagship
 * code-62 flap picker, whose two choices are `°` and `♥`.
 *
 * FiestaBoard hand-rolls this twice today (`display-settings`,
 * `wizard/step-board-setup`) as raw `<button aria-pressed>` circles: two
 * independent toggles standing in for one choice of two, with selection
 * carried by border colour alone. The board-colour pickers directly above
 * them in both files already moved to `SwatchGroup`, so those screens each
 * had two visually identical circle rows with different roles and different
 * selected treatments.
 *
 * The check disc is kept and corner-anchored rather than dropped: it is the
 * non-colour cue (SC 1.4.1), and it would otherwise sit on top of the
 * character it is confirming.
 */
export const GlyphSwatches = () => {
  const [glyph, setGlyph] = React.useState("degree");

  return (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-3">
          <span className="w-8 text-xs text-muted-foreground">{size}</span>
          <SwatchGroup size={size} value={glyph} onValueChange={setGlyph} aria-label={`Code 62 flap (${size})`}>
            <Swatch value="degree" label="Degrees">
              °
            </Swatch>
            <Swatch value="heart" label="Heart">
              ♥
            </Swatch>
          </SwatchGroup>
        </div>
      ))}
    </div>
  );
};

/**
 * A glyph over a colour fill — both may be given. The character takes the
 * ordinary ink, so pair it with a fill light enough to carry it.
 */
export const GlyphOverColour = () => (
  <SwatchGroup aria-label="Board ground" defaultValue="white">
    <Swatch value="white" color="#fafafa" label="White board">
      °
    </Swatch>
    <Swatch value="orange" color="#f5a623" label="Orange board">
      ♥
    </Swatch>
  </SwatchGroup>
);
