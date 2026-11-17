import type { Meta, StoryObj } from "@storybook/react";
import { Monitor } from "lucide-react";
import * as React from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { DisplayPreview } from "../board/display-preview";
import { Button } from "../forms/button";
import { type OtherDisplayItem, OtherDisplaysCard, ScheduleModeCard, UpNextCard } from "./home-supporting-cards";

const event = {
  id: "next",
  time: "9:00 PM",
  dateTime: "2026-11-17T21:00:00-08:00",
  title: "Good night",
  description: "Schedule · Page",
};
const scheduleAction = (
  <Button variant="ghost" size="sm">
    View Schedule
  </Button>
);
const displaysAction = (
  <Button variant="ghost" size="sm">
    <Monitor aria-hidden="true" />
    All displays
  </Button>
);
const peers: OtherDisplayItem[] = [
  {
    id: "desk",
    name: "Desk Pixoo",
    description: "Collection · Desk agenda",
    status: "success",
    statusLabel: "Online",
    preview: (
      <span className="block w-[75px]">
        <DisplayPreview model="divoom_pixoo64" content="sample" />
      </span>
    ),
  },
  {
    id: "clock",
    name: "Entry clock",
    description: "Schedule Mode · Clock",
    status: "success",
    statusLabel: "Online",
    preview: (
      <span className="block w-[95px]">
        <DisplayPreview model="ulanzi_tc001_awtrix" content="sample" />
      </span>
    ),
  },
];

/**
 * 07a 53:143037 / 303:22566 / 305:25799; phone 57:63379. Dark uses the
 * Storybook theme toolbar. DD-W74: one authoritative event, never invented
 * extra Schedule rows. The host owns the fixed 274px desktop pane and hides
 * peer cards below768; these standalone cards have no viewport policy.
 */
const meta = {
  title: "Feedback/HomeSupportingCards",
  component: UpNextCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { display: "Kitchen board", items: [event], actions: scheduleAction },
  decorators: [
    (Story, context) => (
      <div className="w-full" style={{ maxWidth: context.parameters.supportingWidth ?? 274 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpNextCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Override: Story = {
  args: { items: [{ ...event, title: "Schedule resumes", description: "Good night · Schedule" }] },
};

export const Empty: Story = { args: { items: [] } };

export const OtherDisplays: Story = {
  render: () => <OtherDisplaysCard items={peers} actions={displaysAction} />,
};

export const UnknownAndOffline: Story = {
  render: () => (
    <OtherDisplaysCard
      items={[
        { ...peers[0], status: "danger", statusLabel: "Offline", description: "Last shown · Desk agenda" },
        { ...peers[1], status: undefined, statusLabel: undefined, description: "Status unavailable" },
      ]}
      actions={displaysAction}
    />
  ),
};

export const NoOtherDisplays: Story = {
  render: () => <OtherDisplaysCard items={[]} actions={displaysAction} />,
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).queryByRole("region")).not.toBeInTheDocument();
  },
};

const selectPeer = fn();
export const SelectDisplay: Story = {
  render: () => <OtherDisplaysCard items={[{ ...peers[0], onSelect: selectPeer }]} actions={displaysAction} />,
  play: async ({ canvasElement }) => {
    selectPeer.mockClear();
    const button = within(canvasElement).getByRole("button", { name: /Desk Pixoo/ });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(selectPeer).toHaveBeenCalledTimes(1);
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    button.blur();
  },
};

const manualDescription =
  "Nothing changes on its own. Evening commute stays up until you Change Page, Compose a message, or turn Schedule Mode back on.";

function ManualExample() {
  const [checked, setChecked] = React.useState(false);
  return (
    <ScheduleModeCard
      checked={checked}
      onCheckedChange={setChecked}
      description={checked ? "Pages change according to the Schedule." : manualDescription}
      actions={scheduleAction}
    />
  );
}

export const ManualMode: Story = {
  render: () => <ManualExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const control = canvas.getByRole("switch", { name: "Schedule Mode" });
    await userEvent.click(control);
    expect(control).toBeChecked();
    await userEvent.click(control);
    expect(control).not.toBeChecked();
    control.blur();
  },
};

export const ManualPending: Story = {
  render: () => (
    <ScheduleModeCard
      checked={false}
      disabled
      aria-busy="true"
      onCheckedChange={fn()}
      description={manualDescription}
      actions={scheduleAction}
    />
  ),
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  // Fullscreen bypasses both Storybook's padded canvas and the global
  // padded main. This fixture supplies its own landmark and one 16px inset.
  parameters: { layout: "fullscreen", supportingWidth: 390 },
  render: () => (
    <main className="flex w-[390px] flex-col gap-4 p-4">
      <UpNextCard size="compact" items={[event]} actions={scheduleAction} />
      <ScheduleModeCard
        size="compact"
        checked={false}
        onCheckedChange={fn()}
        description={manualDescription}
        actions={scheduleAction}
      />
    </main>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("main");
    const card = within(frame).getByRole("region", { name: "Up next" });
    const time = within(card).getByText("9:00 PM");
    const frameRect = frame.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    expect(frameRect.width).toBe(390);
    expect(cardRect.width).toBe(358);
    expect(cardRect.left - frameRect.left).toBe(16);
    expect(within(frame).getByRole("region", { name: "Schedule Mode is off" }).getBoundingClientRect().width).toBe(358);
    expect(getComputedStyle(card).padding).toBe("16px");
    expect(getComputedStyle(card).gap).toBe("10px");
    expect(time.getBoundingClientRect().width).toBe(70);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
  },
};

export const LongContent: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <UpNextCard
        display="Cuisine et salle à manger de la maison"
        labels={{ title: "Prochain changement" }}
        items={[
          {
            id: "long",
            time: "Demain à 21:00",
            title: "Informations sur le prochain départ du quartier",
            description: "Collection · Informationsdestransportsenmétropole",
          },
        ]}
        actions={
          <Button size="sm" variant="ghost">
            Voir le programme
          </Button>
        }
      />
      <OtherDisplaysCard
        labels={{ title: "Autres écrans" }}
        items={[
          {
            ...peers[0],
            name: "Affichagedelabibliothèquefamiliale",
            description: "Collection · Informations de la semaine",
          },
        ]}
      />
      <ScheduleModeCard
        checked={false}
        onCheckedChange={fn()}
        labels={{ off: "Le mode Programme est désactivé", switch: "Activer le mode Programme" }}
        description="La page reste affichée jusqu’au prochain changement demandé depuis cette maison."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    for (const element of canvasElement.querySelectorAll<HTMLElement>(
      "section, li, [data-slot=list-row], [data-slot=list-row-text]",
    )) {
      expect(element.scrollWidth, element.outerHTML).toBeLessThanOrEqual(element.clientWidth + 1);
    }
  },
};
