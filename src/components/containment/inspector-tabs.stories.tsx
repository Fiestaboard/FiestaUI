import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../forms/button";
import { Text } from "../typography/text";
import { type InspectorTab, InspectorTabs, InspectorTabsContent } from "./inspector-tabs";

const phoneTabs: InspectorTab[] = [
  { value: "data", label: "Data" },
  { value: "logic", label: "Logic" },
  { value: "page", label: "Page" },
  { value: "shows-on", label: "Shows on" },
  { value: "problems", label: "Problems" },
  { value: "history", label: "History" },
];
const desktopTabs = phoneTabs.filter((tab) => tab.value !== "problems");
const panels = phoneTabs.map((tab) => (
  <InspectorTabsContent value={tab.value} key={tab.value}>
    <Text size="sm" tone="muted">
      {tab.label} Inspector content.
    </Text>
  </InspectorTabsContent>
));

const meta = {
  title: "Containment/InspectorTabs",
  component: InspectorTabs,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    tabs: desktopTabs,
    "aria-label": "Inspector",
    defaultValue: "page",
    children: panels,
    className: "w-full max-w-[472px]",
  },
  argTypes: {
    tabs: {
      control: false,
      description: "Host-selected entries: five desktop or six phone; localized labels and stable values.",
    },
    counts: { control: "object", description: "Optional nonnegative finite count per tab; zero is visible." },
    size: { control: "select", options: ["default", "touch"] },
    value: { control: false },
    onValueChange: { control: false },
    children: { control: false, description: "InspectorTabsContent panels sharing the entries' values." },
  },
} satisfies Meta<typeof InspectorTabs>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Web 04d: five equal-width triggers, 472 × 38px at full width. */
export const Desktop: Story = {};

/** The host supplies Problems on phone; Core retains the web tab language. */
export const Phone: Story = {
  args: { tabs: phoneTabs, defaultValue: "data", size: "touch", className: "w-full max-w-[352px]" },
};
export const Counts: Story = {
  args: { tabs: phoneTabs, counts: { problems: 2, history: 0 }, defaultValue: "problems" },
};
export const History: Story = { args: { ...Phone.args, defaultValue: "history" } };
export const Disabled: Story = {
  args: { tabs: phoneTabs.map((tab) => ({ ...tab, disabled: tab.value === "logic" || tab.value === "history" })) },
};
export const AllDisabled: Story = { args: { disabled: true } };
export const LongLabels: Story = {
  args: {
    ...Phone.args,
    tabs: phoneTabs.map((tab) => ({ ...tab, label: `${tab.label} and configuration` })),
    defaultValue: "problems",
    counts: { problems: 128 },
  },
};

function ControlledExample() {
  const [value, setValue] = useState<string | null>("data");
  return (
    <div className="flex w-full max-w-[352px] flex-col gap-4">
      <Button variant="outline" onClick={() => setValue("history")}>
        Open History
      </Button>
      <InspectorTabs
        tabs={phoneTabs}
        value={value}
        onValueChange={setValue}
        aria-label="Inspector"
        counts={{ problems: 2 }}
        size="touch"
      >
        {panels}
      </InspectorTabs>
    </div>
  );
}
export const Controlled: Story = {
  render: () => <ControlledExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open History" }));
    // Base UI mounts a newly opened panel in its starting state and clears it
    // on the next animation frame. Re-query and verify the complete settled
    // outcome rather than asserting visibility on the first matching DOM node.
    await waitFor(async () => {
      const tab = canvas.getByRole("tab", { name: "History" });
      const panel = canvas.getByRole("tabpanel", { name: "History" });
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(panel).not.toHaveAttribute("data-starting-style");
      await expect(panel).toBeVisible();
      await expect(within(panel).getByText("History Inspector content.")).toBeVisible();
      await expect(tab).toHaveAttribute("aria-controls", panel.id);
      await expect(canvas.queryByRole("tabpanel", { name: "Data" })).not.toBeInTheDocument();
      const target = tab.getBoundingClientRect();
      const viewport = canvasElement.querySelector("[data-slot=inspector-tabs-viewport]")!.getBoundingClientRect();
      await expect(target.left).toBeGreaterThanOrEqual(viewport.left);
      await expect(target.right).toBeLessThanOrEqual(viewport.right);
    });
  },
};
export const Focused: Story = {
  args: { ...Phone.args },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const canvas = within(canvasElement);
    const bar = canvasElement.querySelector<HTMLElement>("[data-slot=inspector-tabs-bar]")!;
    const viewport = canvasElement.querySelector<HTMLElement>("[data-slot=inspector-tabs-viewport]")!;
    // Check actual clipping geometry for first, middle, and last keyboard focus.
    // The runner executes this story in both themes; bounding boxes are browser
    // measurements, not jsdom class-name assertions.
    for (const [name, keys] of [
      ["Data", "{Home}"],
      ["Page", "{ArrowRight}{ArrowRight}"],
      ["History", "{End}"],
    ]) {
      await userEvent.keyboard(keys);
      const tab = canvas.getByRole("tab", { name });
      await expect(tab).toHaveFocus();
      await waitFor(() => {
        const visual = bar.getBoundingClientRect();
        const clip = viewport.getBoundingClientRect();
        const target = tab.getBoundingClientRect();
        expect(visual.height).toBe(
          canvasElement.querySelector("[data-slot=inspector-tabs]")?.getAttribute("data-size") === "touch" ? 50 : 38,
        );
        expect(clip.height).toBe(visual.height + 2);
        expect(target.left - 4).toBeGreaterThanOrEqual(clip.left - 0.5);
        expect(target.right + 4).toBeLessThanOrEqual(clip.right + 0.5);
        expect(target.top - 4).toBeGreaterThanOrEqual(clip.top - 0.5);
        expect(target.bottom + 4).toBeLessThanOrEqual(clip.bottom + 0.5);
        const style = getComputedStyle(tab);
        if (matchMedia("(forced-colors: active)").matches) {
          expect(style.outlineStyle).toBe("solid");
          expect(style.outlineWidth).toBe("2px");
          expect(style.outlineOffset).toBe("2px");
        } else {
          expect(style.boxShadow).toContain("4px");
        }
        const leftFade = canvasElement.querySelector("[data-slot=inspector-tabs-fade-left]");
        const rightFade = canvasElement.querySelector("[data-slot=inspector-tabs-fade-right]");
        if (leftFade) expect(target.left - 4).toBeGreaterThanOrEqual(leftFade.getBoundingClientRect().right - 0.5);
        if (rightFade) expect(target.right + 4).toBeLessThanOrEqual(rightFade.getBoundingClientRect().left + 0.5);
      });
    }
  },
};
export const FocusedDefault: Story = { play: Focused.play };

export const RightToLeft: Story = {
  args: { ...Phone.args, defaultValue: "history" },
  decorators: [
    (Story) => (
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <Story />
        </div>
      </DirectionProvider>
    ),
  ],
};
