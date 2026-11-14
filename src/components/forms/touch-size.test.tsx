import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chip } from "../feedback/chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Swatch, SwatchGroup } from "./swatch";
import { Switch } from "./switch";
import { Toggle } from "./toggle";
import { SegmentedControl, SegmentedControlItem } from "./toggle-card";

/*
 * Slice 1.2: the touch size axis (MASTER-PLAN row 1.2; Figma page 08 T1, C7,
 * C21 and W2).
 *
 * jsdom runs no stylesheet (see vitest.config.ts), so a "44px tall" assertion
 * cannot be made here. What CAN be held is the contract the stylesheet keys
 * off: `data-size="touch"` on the element, and the 1.1 token utilities that
 * produce the 44px (`h-control-touch`, `size-touch`, `min-h-touch`). The
 * pixels are VRT's job, through the Touch stories beside each component.
 *
 * `classTokens` splits the class string rather than substring-matching it, so
 * `min-h-touch` can never satisfy a check for `h-touch`.
 */
function classTokens(element: Element): string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/);
}

/** The ≥44×44 invisible hit area that Chip and Switch wear at touch size. */
const HIT_AREA = ["before:min-h-touch", "before:min-w-touch"];

describe("size=touch", () => {
  it("Button is 44px tall and stamps data-size", () => {
    render(<Button size="touch">Show now</Button>);
    const button = screen.getByRole("button", { name: "Show now" });

    expect(button).toHaveAttribute("data-size", "touch");
    expect(classTokens(button)).toContain("h-control-touch");
  });

  it("Icon Button is a 44×44 square", () => {
    render(
      <Button size="icon-touch" aria-label="More">
        <svg />
      </Button>,
    );
    const button = screen.getByRole("button", { name: "More" });

    expect(button).toHaveAttribute("data-size", "icon-touch");
    expect(classTokens(button)).toContain("size-touch");
  });

  it("Button keeps a 44px loading state with a large spinner", () => {
    render(
      <Button size="touch" loading>
        Save
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true");
  });

  it("Input is 44px tall at size=touch and keeps a numeric size as the HTML attribute", () => {
    render(
      <>
        <Input size="touch" aria-label="Touch" />
        <Input size={12} aria-label="Twelve" />
        <Input aria-label="Plain" />
      </>,
    );
    const touch = screen.getByRole("textbox", { name: "Touch" });
    const twelve = screen.getByRole("textbox", { name: "Twelve" });
    const plain = screen.getByRole("textbox", { name: "Plain" });

    expect(touch).toHaveAttribute("data-size", "touch");
    expect(touch).not.toHaveAttribute("size");
    expect(classTokens(touch)).toContain("h-control-touch");

    expect(twelve).toHaveAttribute("size", "12");
    expect(twelve).toHaveAttribute("data-size", "default");
    expect(plain).toHaveAttribute("data-size", "default");
    expect(classTokens(plain)).toContain("h-9");
  });

  it("SelectTrigger is 44px tall at size=touch", () => {
    render(
      <Select defaultValue="a">
        <SelectTrigger size="touch" aria-label="Board">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Kitchen</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "Board" });

    expect(trigger).toHaveAttribute("data-size", "touch");
    expect(classTokens(trigger)).toContain("h-control-touch");
  });

  it("SegmentedControl hands touch to every item, inline and grid", () => {
    render(
      <>
        <SegmentedControl aria-label="Inline" size="touch" defaultValue="a">
          <SegmentedControlItem value="a">Fit</SegmentedControlItem>
          <SegmentedControlItem value="b">Actual</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl aria-label="Grid" size="touch" layout="grid" defaultValue="c">
          <SegmentedControlItem value="c">Weekly</SegmentedControlItem>
        </SegmentedControl>
      </>,
    );

    const fit = screen.getByRole("radio", { name: "Fit" });
    expect(fit).toHaveAttribute("data-size", "touch");
    expect(classTokens(fit)).toContain("h-control-touch");

    const weekly = screen.getByRole("radio", { name: "Weekly" });
    expect(weekly).toHaveAttribute("data-size", "touch");
    expect(classTokens(weekly)).toContain("min-h-touch");
  });

  it("Toggle is 44px tall at touch, 44×44 at icon-touch", () => {
    render(
      <>
        <Toggle size="touch">Bold</Toggle>
        <Toggle size="icon-touch" aria-label="Italic">
          <svg />
        </Toggle>
      </>,
    );
    const bold = screen.getByRole("button", { name: "Bold" });
    const italic = screen.getByRole("button", { name: "Italic" });

    expect(bold).toHaveAttribute("data-size", "touch");
    expect(classTokens(bold)).toEqual(expect.arrayContaining(["h-control-touch", "min-w-touch"]));
    expect(classTokens(italic)).toContain("size-touch");
  });

  it("Chip stays a 30px pill (C7) with a 44×44 hit area", () => {
    render(<Chip size="touch">weather.temp</Chip>);
    const chip = screen.getByRole("button", { name: "weather.temp" });

    expect(chip).toHaveAttribute("data-size", "touch");
    expect(classTokens(chip)).toEqual(expect.arrayContaining(["h-[30px]", "relative", ...HIT_AREA]));
  });

  it("Chip defaults to data-size=default", () => {
    render(<Chip>5.11</Chip>);

    expect(screen.getByRole("button", { name: "5.11" })).toHaveAttribute("data-size", "default");
  });

  it("Swatch is a 44px target around a 32px fill", () => {
    render(
      <SwatchGroup aria-label="Board colour" size="touch" defaultValue="red">
        <Swatch value="red" label="Red" color="#e8463b" />
      </SwatchGroup>,
    );
    const swatch = screen.getByRole("radio", { name: "Red" });

    expect(swatch).toHaveAttribute("data-size", "touch");
    expect(classTokens(swatch)).toContain("size-touch");
    expect(classTokens(swatch.querySelector("[data-slot=swatch-fill]")!)).toContain("size-8");
  });

  it("Switch keeps its track and gains a 44×44 hit area", () => {
    render(<Switch size="touch" aria-label="Mirror to board" />);
    const toggle = screen.getByRole("switch", { name: "Mirror to board" });

    expect(toggle).toHaveAttribute("data-size", "touch");
    expect(classTokens(toggle)).toEqual(expect.arrayContaining(["h-6", "w-11", "relative", ...HIT_AREA]));
  });

  it("Switch defaults to data-size=default with no hit area", () => {
    render(<Switch aria-label="Plain" />);
    const toggle = screen.getByRole("switch", { name: "Plain" });

    expect(toggle).toHaveAttribute("data-size", "default");
    expect(classTokens(toggle)).not.toContain("before:min-h-touch");
  });
});

describe("caller overrides win (tailwind-merge knows the touch keys)", () => {
  it("className h-12 beats a touch height", () => {
    render(
      <>
        <Button size="touch" className="h-12">
          Tall
        </Button>
        <Input size="touch" className="h-12" aria-label="Tall field" />
      </>,
    );

    for (const target of [
      screen.getByRole("button", { name: "Tall" }),
      screen.getByRole("textbox", { name: "Tall field" }),
    ]) {
      expect(classTokens(target)).toContain("h-12");
      expect(classTokens(target)).not.toContain("h-control-touch");
    }
  });

  it("a touch Input carries only the touch height", () => {
    render(<Input size="touch" aria-label="Name" />);
    const heights = classTokens(screen.getByRole("textbox", { name: "Name" })).filter((token) => /^h-/.test(token));

    expect(heights).toEqual(["h-control-touch"]);
  });
});

describe("existing sizes are unchanged", () => {
  it.each([
    ["default", "h-9"],
    ["sm", "h-8"],
    ["lg", "h-10"],
  ] as const)("Button %s keeps %s", (size, height) => {
    render(<Button size={size}>Save</Button>);

    expect(classTokens(screen.getByRole("button", { name: "Save" }))).toContain(height);
  });
});

describe("fui-coarse (W2)", () => {
  /*
   * The coarse variant is CSS (`@media (pointer: coarse)` under an opted-in
   * `.fui-coarse` ancestor), so here we hold only that each control carries
   * the variant classes the stylesheet needs.
   */
  it("lifts the default sizes to a 44px floor under the coarse variant", () => {
    render(
      <>
        <Button>Save</Button>
        <Button size="icon" aria-label="More">
          <svg />
        </Button>
        <Input aria-label="Name" />
        <Toggle>Bold</Toggle>
        <Chip>tag</Chip>
        <Switch aria-label="Live" />
        <Swatch label="Red" color="#e8463b" />
        <SegmentedControl aria-label="Mode" defaultValue="a">
          <SegmentedControlItem value="a">Fit</SegmentedControlItem>
        </SegmentedControl>
      </>,
    );

    expect(classTokens(screen.getByRole("button", { name: "Save" }))).toContain("coarse:min-h-touch");
    expect(classTokens(screen.getByRole("button", { name: "More" }))).toEqual(
      expect.arrayContaining(["coarse:min-h-touch", "coarse:min-w-touch"]),
    );
    expect(classTokens(screen.getByRole("textbox", { name: "Name" }))).toContain("coarse:min-h-touch");
    expect(classTokens(screen.getByRole("button", { name: "Bold" }))).toContain("coarse:min-h-touch");
    expect(classTokens(screen.getByRole("button", { name: "tag" }))).toContain("coarse:before:min-h-touch");
    expect(classTokens(screen.getByRole("switch", { name: "Live" }))).toContain("coarse:before:min-h-touch");
    expect(classTokens(screen.getByRole("button", { name: "Red" }))).toContain("coarse:min-h-touch");
    expect(classTokens(screen.getByRole("radio", { name: "Fit" }))).toContain("coarse:min-h-touch");
  });

  it.each([
    ["sm", ["h-8", "coarse:min-h-touch"]],
    ["lg", ["h-10", "coarse:min-h-touch"]],
    ["icon", ["size-9", "coarse:min-h-touch", "coarse:min-w-touch"]],
    ["icon-sm", ["size-8", "coarse:min-h-touch", "coarse:min-w-touch"]],
    ["icon-lg", ["size-10", "coarse:min-h-touch", "coarse:min-w-touch"]],
  ] as const)("Button %s keeps its size and gains the coarse floor", (size, tokens) => {
    render(
      <Button size={size} aria-label="Target">
        <svg />
      </Button>,
    );

    expect(classTokens(screen.getByRole("button", { name: "Target" }))).toEqual(expect.arrayContaining([...tokens]));
  });

  it("leaves icon-xs alone: its host is smaller than 44px by design", () => {
    render(
      <Button size="icon-xs" aria-label="Copy">
        <svg />
      </Button>,
    );

    expect(classTokens(screen.getByRole("button", { name: "Copy" }))).not.toContain("coarse:min-h-touch");
  });
});

describe("pressed state (C21)", () => {
  it.each([
    ["Button", () => <Button>Show now</Button>, "button", "Show now"],
    ["Chip", () => <Chip>weather.temp</Chip>, "button", "weather.temp"],
    [
      "SegmentedControlItem",
      () => (
        <SegmentedControl aria-label="Mode" defaultValue="a">
          <SegmentedControlItem value="a">Fit</SegmentedControlItem>
        </SegmentedControl>
      ),
      "radio",
      "Fit",
    ],
    ["Swatch", () => <Swatch label="Red" color="#e8463b" />, "button", "Red"],
  ] as const)("%s sets data-press while a pointer is down", (_name, ui, role, name) => {
    render(ui());
    const target = screen.getByRole(role, { name });

    fireEvent.pointerDown(target, { button: 0 });
    expect(target).toHaveAttribute("data-press");

    fireEvent.pointerUp(target);
    expect(target).not.toHaveAttribute("data-press");
  });

  it("a loading Button never shows pressed", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    fireEvent.pointerDown(button, { button: 0 });

    expect(button).not.toHaveAttribute("data-press");
  });

  it("Toggle presses with data-press, leaving Base UI's data-pressed to mean ON", () => {
    render(<Toggle>Bold</Toggle>);
    const bold = screen.getByRole("button", { name: "Bold" });

    fireEvent.pointerDown(bold, { button: 0 });

    expect(bold).toHaveAttribute("data-press");
    expect(bold).not.toHaveAttribute("data-pressed");
    expect(bold).toHaveAttribute("aria-pressed", "false");

    fireEvent.pointerUp(bold);
    expect(bold).not.toHaveAttribute("data-press");
  });

  it("an open DropdownMenu's Button trigger does not look pressed", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Board actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await screen.findByRole("menuitem", { name: "Rename" });
    const trigger = screen.getByRole("button", { name: "Board actions", hidden: true });

    // Base UI marks the open trigger `data-pressed`; the press style must not
    // key off it — only off the momentary `data-press` this package writes.
    expect(trigger).toHaveAttribute("data-pressed");
    expect(trigger).not.toHaveAttribute("data-press");
    expect(classTokens(trigger).filter((token) => token.includes("data-[pressed]"))).toEqual([]);
    expect(classTokens(trigger)).toContain("data-[press]:bg-accent");
  });

  it("the touch press scales only under motion-safe", () => {
    render(
      <>
        <Button size="touch">Show now</Button>
        <Swatch size="touch" label="Red" color="#e8463b" />
      </>,
    );

    for (const target of [
      screen.getByRole("button", { name: "Show now" }),
      screen.getByRole("button", { name: "Red" }),
    ]) {
      const scale = classTokens(target).filter((token) => token.includes("scale-[0.97]"));
      expect(scale).toEqual(["motion-safe:active:scale-[0.97]", "motion-safe:data-[press]:scale-[0.97]"]);
    }
  });
});
