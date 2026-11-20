"use client";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { FormulaAtom } from "./formula-atom";

const meta = {
  title: "Editor/FormulaAtom",
  component: FormulaAtom,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "C31 source/value content on Badge. The consumer supplies the formatted result or actual error tag; this component does not evaluate formulas. Both themes use semantic tokens (DD-W95). Error tags replace the stale Figma sample; long text ellipsizes while full strings remain in the DOM and native titles (DD-W103). Kind ink inherits Badge’s contrast-tested foreground tokens (DD-W111). No touch target or platform prop.",
      },
    },
  },
  args: { source: "IF(temp > 80, …)", value: "= 72", kind: "formula", state: "ok" },
  argTypes: {
    kind: { control: "inline-radio", options: ["formula", "variable"] },
    state: { control: "inline-radio", options: ["ok", "error", "fallback"] },
  },
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const atoms = canvasElement.querySelectorAll<HTMLElement>('[data-slot="formula-atom"]');
    await expect(atoms.length).toBeGreaterThan(0);
    for (const atom of atoms) {
      const source = atom.querySelector<HTMLElement>('[data-slot="formula-atom-source"]')!;
      const value = atom.querySelector<HTMLElement>('[data-slot="formula-atom-value"]')!;
      const icon = atom.querySelector("svg")!;
      const bounds = atom.getBoundingClientRect();
      // The shared page-enter translation can introduce fractional DOMRect
      // rounding (CI: 22.000003814697266). Four decimals allow <0.00005px
      // noise while preserving the 22px geometry requirement. Every state is
      // 22px (BB-FP-12): the error edge is an inset ring, not a border.
      await expect(bounds.height).toBeCloseTo(22, 4);
      await expect(getComputedStyle(atom).borderTopWidth).toBe("0px");
      // The source shows as written, whatever the host's text-transform (BB-FP-10).
      await expect(getComputedStyle(source).textTransform).toBe("none");
      await expect(icon.getBoundingClientRect().width).toBe(12);
      await expect(icon.getBoundingClientRect().height).toBe(12);
      await expect(value.getBoundingClientRect().height).toBe(18);
      await expect(getComputedStyle(atom).borderRadius).toBe("4px");
      await expect(getComputedStyle(value).borderRadius).toBe("3px");
      await expect(getComputedStyle(source).fontSize).toBe("12px");
      await expect(getComputedStyle(source).lineHeight).toBe("16px");
      await expect(source.getBoundingClientRect().right).toBeLessThanOrEqual(value.getBoundingClientRect().left);
      await expect(value.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
      await expect(atom.tabIndex).toBe(-1);
      await expect(atom.scrollWidth).toBeLessThanOrEqual(atom.clientWidth);
      if (atom.dataset.state !== "error") {
        // Badge's paired foreground keeps the translucent kind surface
        // legible; the raw tint used as ink failed hosted light-theme axe.
        const ink = document.createElement("span");
        ink.setAttribute("aria-hidden", "true");
        ink.style.cssText = `position:absolute;visibility:hidden;width:0;height:0;color:var(--tag-${atom.dataset.kind}-foreground)`;
        atom.appendChild(ink);
        try {
          await expect(getComputedStyle(source).color).toBe(getComputedStyle(ink).color);
        } finally {
          ink.remove();
        }
      }
      if (atom.dataset.state === "error") {
        // Resolve the semantic surface through the browser in this atom's
        // theme scope. A nonexistent utility otherwise silently leaves it
        // transparent after cn removes Badge's kind background (R1 M1).
        const tint = document.createElement("span");
        tint.setAttribute("aria-hidden", "true");
        tint.style.cssText = "position:absolute;visibility:hidden;width:0;height:0;background-color:var(--tint-danger)";
        atom.appendChild(tint);
        try {
          const expectedTint = getComputedStyle(tint).backgroundColor;
          await expect(expectedTint).not.toBe("rgba(0, 0, 0, 0)");
          await expect(getComputedStyle(atom).backgroundColor).toBe(expectedTint);
        } finally {
          tint.remove();
        }
      }
    }
  },
} satisfies Meta<typeof FormulaAtom>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read-only Figma variants: 109:2976 / 2982 / 2990 / 2996 / 3002 / 3010. */
export const FormulaOK: Story = {};
export const FormulaError: Story = { args: { state: "error", value: "#REF" } };
export const FormulaFallback: Story = { args: { state: "fallback" } };
export const VariableOK: Story = { args: { kind: "variable" } };
export const VariableError: Story = { args: { kind: "variable", state: "error", value: "#REF" } };
export const VariableFallback: Story = { args: { kind: "variable", state: "fallback" } };

export const AllStates: Story = {
  render: (args) => (
    <div className="flex max-w-full flex-col items-start gap-3">
      {(["formula", "variable"] as const).map((kind) =>
        (["ok", "error", "fallback"] as const).map((state) => (
          <FormulaAtom
            {...args}
            key={`${kind}-${state}`}
            kind={kind}
            state={state}
            value={state === "error" ? "#REF" : "= 72"}
          />
        )),
      )}
    </div>
  ),
};

export const ErrorTags: Story = {
  render: (args) => (
    <div className="flex max-w-full flex-wrap gap-3">
      {["#REF", "#VALUE", "#DIV/0", "#NAME?", "#NUM", "#SYNTAX:12", "???"].map((value) => (
        <FormulaAtom {...args} key={value} state="error" value={value} />
      ))}
    </div>
  ),
};

export const NarrowLongContent: Story = {
  args: {
    source: "COALESCE(weather.forecast.tomorrow.temperature, weather.current.temperature, 72)",
    value: "= A very long unbroken result: abcdefghijklmnopqrstuvwxyz0123456789",
  },
  render: (args) => (
    <div data-testid="narrow-atoms" className="flex w-44 max-w-full flex-col items-start gap-3">
      <FormulaAtom {...args} />
      <FormulaAtom {...args} kind="variable" state="fallback" />
      <FormulaAtom {...args} state="error" value="#SYNTAX:123456789" />
    </div>
  ),
  play: async (context) => {
    await meta.play(context);
    const host = context.canvasElement.querySelector<HTMLElement>('[data-testid="narrow-atoms"]')!;
    const atoms = host.querySelectorAll<HTMLElement>('[data-slot="formula-atom"]');
    for (const atom of atoms) {
      await expect(atom.getBoundingClientRect().width).toBeLessThanOrEqual(host.getBoundingClientRect().width);
      const source = atom.querySelector<HTMLElement>('[data-slot="formula-atom-source"]')!;
      await expect(source.scrollWidth).toBeGreaterThan(source.clientWidth);
      await expect(getComputedStyle(source).textOverflow).toBe("ellipsis");
    }
    const longValue = atoms[0].querySelector<HTMLElement>('[data-slot="formula-atom-value"]')!;
    await expect(longValue.scrollWidth).toBeGreaterThan(longValue.clientWidth);
    await expect(getComputedStyle(longValue).textOverflow).toBe("ellipsis");
  },
};

export const Inline: Story = {
  render: () => (
    <p className="max-w-full text-sm leading-8">
      Today's forecast is <FormulaAtom kind="variable" source="weather.temperature" value="= 72°" /> with a high of{" "}
      <FormulaAtom source="MAX(forecast)" value="= 80°" />.
    </p>
  ),
};

/**
 * BB-FP-10: the template editor surface is uppercase. The atom resets
 * text-transform itself, so identifiers and string literals read as written;
 * only the value (board output) is uppercase, because the caller passes it so.
 */
export const InUppercaseHost: Story = {
  render: () => (
    <p className="max-w-full font-mono text-sm uppercase leading-8">
      good <FormulaAtom source="UPPER(date_time.day_of_week)" value="= MONDAY" />{" "}
      <FormulaAtom kind="variable" source="weather.temperature" value="= 72" />{" "}
      <FormulaAtom state="error" source='IF(x, "Morning", 1/0)' value="#DIV/0" />
    </p>
  ),
  play: async (context) => {
    await meta.play(context);
    const source = context.canvasElement.querySelector<HTMLElement>('[data-slot="formula-atom-source"]')!;
    await expect(getComputedStyle(source.parentElement!.parentElement!).textTransform).toBe("uppercase");
    await expect(source.innerText).toBe("UPPER(date_time.day_of_week)");
  },
};

/**
 * BB-FP-12: a COLOR() result shows as the board colour's tile, not the raw
 * "{66}" code. `valueColor` takes a name, a code or "{code}"; `value` stays
 * the accessible text and title.
 */
export const ColorResult: Story = {
  render: () => (
    <div className="flex max-w-full flex-col items-start gap-3">
      <FormulaAtom source='COLOR("GREEN")' value="= green" valueColor="{66}" />
      <FormulaAtom source='IF(countdown.is_expired, COLOR("RED"), …)' value="= red" valueColor="red" />
      <FormulaAtom kind="variable" source="status.color" value="= white" valueColor="69" />
    </div>
  ),
  play: async (context) => {
    await meta.play(context);
    const tiles = context.canvasElement.querySelectorAll<HTMLElement>('[data-slot="formula-atom-color"]');
    await expect(tiles.length).toBe(3);
    for (const tile of tiles) {
      await expect(getComputedStyle(tile).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      await expect(tile.getBoundingClientRect().height).toBe(12);
    }
    await expect(context.canvasElement.textContent).not.toContain("{66}");
  },
};
