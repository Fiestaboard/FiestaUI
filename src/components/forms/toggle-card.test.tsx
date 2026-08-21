import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToggleCard, ToggleCardGroup } from "./toggle-card";

/*
 * ToggleCard is the component issue #217 asked for under the name
 * "SelectableCard": the thirteen hand-rolled cards downstream announce the
 * same visual three different ways (`aria-pressed`, `role="radio"` +
 * `aria-checked`, and a bare trailing check with no ARIA at all). Everything
 * that fixes lives in the accessibility tree, so it belongs here rather than
 * in VRT:
 *
 *   • a card inside a group is a `radio` and cannot be talked into anything
 *     else from the call site,
 *   • a card on its own with `pressed` is an `aria-pressed` toggle button,
 *   • a card with no `pressed` announces no state at all,
 *   • the group owns the radiogroup name, the single tab stop, the roving
 *     arrow keys and Home/End — so day-selector.tsx can drop its radioRefs,
 *   • the check indicator is decorative in BOTH placements and must never
 *     leak into an accessible name.
 *
 * The indicator is queried by `data-slot` / `data-placement`: it is
 * `aria-hidden` by design, so it has no role to query by, and those
 * attributes are published API here. How it looks is VRT's job.
 */

/**
 * Typed with only the props the tests vary. `ToggleCardGroupProps` requires
 * `aria-label` or `aria-labelledby` through a union, so the name is supplied
 * here and is deliberately not overridable — spreading a partial over that
 * union does not typecheck.
 */
function BoardTypeGroup(props: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  indicator?: boolean | "corner" | "trailing";
}) {
  return (
    <ToggleCardGroup aria-label="Board type" {...props}>
      <ToggleCard value="flagship" title="Flagship" />
      <ToggleCard value="note" title="Note" />
      <ToggleCard value="panel" title="Panel" />
    </ToggleCardGroup>
  );
}

const indicatorsIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="toggle-card-indicator"]'));

describe("ToggleCardGroup", () => {
  it("names the group and announces every card as a radio", () => {
    render(<BoardTypeGroup defaultValue="note" />);

    const group = screen.getByRole("radiogroup", { name: "Board type" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Note" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveAttribute("aria-checked", "false");
  });

  it("keeps one tab stop for the whole group and lands on the checked card", async () => {
    const user = userEvent.setup();
    render(<BoardTypeGroup defaultValue="note" />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Note" })).toHaveFocus();

    // Tabbing again must leave the group entirely — that is the roving
    // tabindex, and it is what replaces day-selector.tsx's manual radioRefs.
    await user.tab();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toHaveFocus();
    }
  });

  it("moves AND selects with the arrow keys, reporting one argument", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardTypeGroup defaultValue="flagship" onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: "Note" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Note" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveAttribute("aria-checked", "false");
    // One argument, not Base UI's `(value, eventDetails)` pair: the wrapper
    // narrows it so `onValueChange={setValue}` is not handed a bogus second
    // setState argument.
    expect(onValueChange.mock.calls).toEqual([["note"]]);
  });

  it("wraps at both ends rather than dead-ending", async () => {
    const user = userEvent.setup();
    render(<BoardTypeGroup defaultValue="panel" />);

    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Panel" })).toHaveAttribute("aria-checked", "true");
  });

  it("jumps to the first and last option with Home and End", async () => {
    const user = userEvent.setup();
    render(<BoardTypeGroup defaultValue="note" />);

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Panel" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Panel" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveAttribute("aria-checked", "true");
  });

  it("skips a disabled option when End lands on the end of the list", async () => {
    const user = userEvent.setup();
    render(
      <ToggleCardGroup aria-label="Board type" defaultValue="flagship">
        <ToggleCard value="flagship" title="Flagship" />
        <ToggleCard value="note" title="Note" />
        <ToggleCard value="panel" title="Panel" disabled />
      </ToggleCardGroup>,
    );

    await user.tab();
    await user.keyboard("{End}");

    // "Last option" means last *selectable* option — End must never park
    // focus on something that cannot be chosen.
    expect(screen.getByRole("radio", { name: "Note" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Note" })).toHaveAttribute("aria-checked", "true");
  });

  it("cannot be emptied by re-activating the checked card", async () => {
    const user = userEvent.setup();
    render(<BoardTypeGroup defaultValue="note" />);

    await user.click(screen.getByRole("radio", { name: "Note" }));

    // The documented difference from ToggleGroup: "none of these" is not
    // expressible in a radiogroup.
    expect(screen.getByRole("radio", { name: "Note" })).toHaveAttribute("aria-checked", "true");
  });

  it("disables every card when the group is disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardTypeGroup defaultValue="flagship" disabled onValueChange={onValueChange} />);

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    await user.click(screen.getByRole("radio", { name: "Note" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps a single disabled card announced but unselectable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ToggleCardGroup aria-label="Board type" defaultValue="flagship" onValueChange={onValueChange}>
        <ToggleCard value="flagship" title="Flagship" />
        <ToggleCard value="note" title="Note" disabled />
      </ToggleCardGroup>,
    );

    const unavailable = screen.getByRole("radio", { name: "Note" });
    expect(unavailable).toBeInTheDocument();
    expect(unavailable).toBeDisabled();

    await user.click(unavailable);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Flagship" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("ToggleCard selection semantics", () => {
  it("is an aria-pressed toggle button when standalone", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<ToggleCard title="Show board previews" pressed={false} onPressedChange={onPressedChange} />);

    const card = screen.getByRole("button", { name: "Show board previews" });
    expect(card).toHaveAttribute("aria-pressed", "false");

    await user.click(card);
    expect(onPressedChange.mock.calls).toEqual([[true]]);
  });

  it("announces no state at all when `pressed` is omitted", () => {
    render(<ToggleCard title="Open the editor" />);

    // A card that merely navigates is not a toggle: `aria-pressed="false"`
    // would announce a state it does not have.
    const card = screen.getByRole("button", { name: "Open the editor" });
    expect(card).not.toHaveAttribute("aria-pressed");
    expect(card).not.toHaveAttribute("aria-checked");
  });

  it("cannot be given toggle semantics inside a group", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const onValueChange = vi.fn();
    render(
      <ToggleCardGroup aria-label="Board type" defaultValue="flagship" onValueChange={onValueChange}>
        <ToggleCard value="flagship" title="Flagship" />
        {/* A call site reaching for the wrong mode. The mode is decided by
            where the card is rendered, so `pressed` here is inert. */}
        <ToggleCard value="note" title="Note" pressed onPressedChange={onPressedChange} />
      </ToggleCardGroup>,
    );

    const card = screen.getByRole("radio", { name: "Note" });
    expect(card).not.toHaveAttribute("aria-pressed");
    expect(card).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    await user.click(card);
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith("note");
  });
});

describe("ToggleCard content", () => {
  it("renders the description and the trailing meta slot", () => {
    render(<ToggleCard title="Welcome board" description="Updated 2 hours ago" meta={<span>22 x 6</span>} />);

    const card = screen.getByRole("button", { name: /Welcome board/ });
    expect(within(card).getByText("Updated 2 hours ago")).toBeInTheDocument();
    expect(within(card).getByText("22 x 6")).toBeInTheDocument();
    // Description and meta are part of the card's own name, not separate
    // stops: there is one control here, not three.
    expect(card).toHaveAccessibleName(/Welcome board.*Updated 2 hours ago.*22 x 6/);
  });

  it("keeps the icon out of the accessible name", () => {
    render(<ToggleCard title="Flagship" icon={<span>ICON</span>} />);

    expect(screen.getByRole("button", { name: "Flagship" })).toBeInTheDocument();
  });
});

describe("ToggleCard indicator", () => {
  it("floats the check in the corner by default and keeps it out of the name", () => {
    const { container } = render(<ToggleCard title="Flagship" pressed />);

    const [indicator] = indicatorsIn(container);
    expect(indicator).toHaveAttribute("data-placement", "corner");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    // Decorative in every placement: the check must never rename the card.
    expect(screen.getByRole("button", { name: "Flagship" })).toBeInTheDocument();
  });

  it('moves the check onto the title row with indicator="trailing"', () => {
    const { container } = render(<ToggleCard title="Flagship" pressed indicator="trailing" />);

    const [indicator] = indicatorsIn(container);
    expect(indicator).toHaveAttribute("data-placement", "trailing");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    // The picker-dialog shape: in flow at the end of the row, not floating
    // over the card's corner.
    expect(container.querySelector('[data-slot="toggle-card-header"]')).toContainElement(indicator);
    expect(screen.getByRole("button", { name: "Flagship" })).toBeInTheDocument();
  });

  it("treats indicator={true} as the corner placement", () => {
    const { container } = render(<ToggleCard title="Flagship" pressed indicator />);

    expect(indicatorsIn(container)[0]).toHaveAttribute("data-placement", "corner");
  });

  it("renders no indicator at all when indicator={false}", () => {
    const { container } = render(<ToggleCard title="Flagship" pressed indicator={false} />);

    expect(indicatorsIn(container)).toHaveLength(0);
  });

  it("inherits the placement from the group, and lets one card override it", () => {
    const { container } = render(
      <ToggleCardGroup aria-label="Active page" defaultValue="welcome" indicator="trailing">
        <ToggleCard value="welcome" title="Welcome board" />
        <ToggleCard value="menu" title="Daily menu" />
        <ToggleCard value="rotation" title="Weekly rotation" indicator="corner" />
      </ToggleCardGroup>,
    );

    expect(indicatorsIn(container).map((el) => el.dataset.placement)).toEqual(["trailing", "trailing", "corner"]);
  });

  it("lets a group turn the check off wholesale", () => {
    const { container } = render(<BoardTypeGroup defaultValue="note" indicator={false} />);

    expect(indicatorsIn(container)).toHaveLength(0);
  });
});
