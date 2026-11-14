import type { Meta, StoryObj } from "@storybook/react";
import { House } from "lucide-react";
import { useEffect } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { ListRowGroup } from "../containment/list-row";
import { HubDiscoveryRow } from "./hub-discovery-row";

/** 05 Setup Row 35:17409 and Choose your hub 39:65267 (08 P3 61:42840). */
const meta = {
  title: "App/Onboarding/HubDiscoveryRow",
  component: HubDiscoveryRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { name: "FiestaPi", address: "fiestapi.local:4420", onSelect: fn() },
  argTypes: { name: { control: "text" }, icon: { control: false }, meta: { control: "text" } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HubDiscoveryRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list");
    const item = within(list).getByRole("listitem");
    const button = within(item).getByRole("button");
    expect(list.children[0]).toBe(item);
    expect(button).toHaveAccessibleName("FiestaPi fiestapi.local:4420");
    await userEvent.click(button);
    expect(args.onSelect).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Enter}");
    expect(args.onSelect).toHaveBeenCalledTimes(2);
    await userEvent.keyboard(" ");
    expect(args.onSelect).toHaveBeenCalledTimes(3);
    button.blur();
  },
  render: (args) => (
    <ListRowGroup aria-label="Hubs found on your network" variant="inset">
      <HubDiscoveryRow {...args} />
    </ListRowGroup>
  ),
};

/** Valid list semantics, one full-row button per discovered record. */
export const DiscoveredHubs: Story = {
  render: (args) => (
    <ListRowGroup aria-label="Hubs found on your network" variant="inset">
      <HubDiscoveryRow {...args} />
      <HubDiscoveryRow {...args} name="Studio" address="192.168.1.24:4420" />
    </ListRowGroup>
  ),
};

/** Disabled is host-controlled; discovery and reachability checks stay outside the kit. */
export const Disabled: Story = {
  ...Default,
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button");
    expect(button).toBeDisabled();
    // Native click is suppressed by disabled. userEvent's pointer guard
    // deliberately throws on the disabled pointer-events:none recipe.
    button.click();
    await userEvent.tab();
    expect(button).not.toHaveFocus();
    expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const LongNames: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    for (const element of canvasElement.querySelectorAll<HTMLElement>(
      '[data-slot="list-row"], [data-slot="list-row-text"]',
    )) {
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
    }
  },
  args: {
    name: "FiestaBoard in the upstairs shared studio and family room",
    address: "fiestaboard-upstairs-shared-studio-and-family-room.local:4420",
    meta: "12 displays",
  },
};

export const Touch: Story = {
  render: (args) => (
    <ListRowGroup aria-label="Hubs found on your network" size="touch" variant="inset">
      <HubDiscoveryRow {...args} icon={<House />} meta="2 displays" />
      <HubDiscoveryRow {...args} name="Studio" address="studio.local:4420" />
    </ListRowGroup>
  ),
};

/** A rem-sized text column allows the meta to move below at large text sizes. */
export const LargeText: Story = {
  ...LongNames,
  parameters: { layout: "fullscreen" },
  decorators: [
    function LargeTextDecorator(Story) {
      useEffect(() => {
        const root = document.documentElement;
        const before = root.style.fontSize;
        root.style.fontSize = "200%";
        return () => {
          root.style.fontSize = before;
        };
      }, []);
      return (
        <main style={{ padding: 16 }}>
          <Story />
        </main>
      );
    },
  ],
};
