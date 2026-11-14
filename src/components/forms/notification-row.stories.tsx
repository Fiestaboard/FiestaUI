import type { Meta, StoryObj } from "@storybook/react";

import { ListRowGroup } from "../containment/list-row";
import { NotificationRow } from "./notification-row";

/*
 * NotificationRow (slice 1.8d, C26, WEB-13). Web: 07 PWA More ›
 * Notifications `59:13890` (allowed), 07e §8 `329:48335` (needs HTTPS) and
 * `337:60272` (blocked by the browser). Native: 06 `50:53263`. 08 C26
 * `65:31531`.
 */
const meta = {
  title: "Forms/NotificationRow",
  component: NotificationRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    permission: { control: "inline-radio", options: ["granted", "ask-on-first", "denied", "unavailable"] },
    size: { control: "inline-radio", options: ["touch", "default"] },
    title: { control: "text" },
    reason: { control: "text" },
  },
  args: { title: "A display goes offline", reason: "Kitchen board, Desk Pixoo, Entry TC001", defaultChecked: true },
} satisfies Meta<typeof NotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ListRowGroup aria-label="Notifications" className="w-full sm:w-[358px]">
      <NotificationRow {...args} />
    </ListRowGroup>
  ),
};

/** 07 PWA `59:13890`: allowed, each alert with its own switch. */
export const Allowed: Story = {
  render: () => (
    <ListRowGroup aria-label="Notifications" className="w-full sm:w-[358px]">
      <NotificationRow title="A display goes offline" reason="Kitchen board, Desk Pixoo, Entry TC001" defaultChecked />
      <NotificationRow
        title="An override ends"
        reason="“Dinner note ended. Schedule resumed with Good night.”"
        defaultChecked
      />
      <NotificationRow title="Update available" reason="FiestaBoard and plugin updates" />
      <NotificationRow title="Silence Schedule held a message" reason="So you can choose Show now" />
    </ListRowGroup>
  ),
};

/** Not asked yet: the switches work; turning one on is when the host asks. */
export const AskOnFirst: Story = {
  render: () => (
    <ListRowGroup aria-label="On this browser" className="w-full sm:w-[560px]">
      <NotificationRow
        permission="ask-on-first"
        title="An integration needs attention"
        reason="Checked when you open the app"
      />
      <NotificationRow permission="ask-on-first" title="A display can't be reached" reason="After 5 minutes offline" />
    </ListRowGroup>
  ),
};

/** 07e `329:48335`: on http the switches are off and say "needs HTTPS". */
export const NeedsHttps: Story = {
  render: () => (
    <ListRowGroup aria-label="On this browser" className="w-full sm:w-[560px]">
      <NotificationRow
        permission="unavailable"
        title="An integration needs attention"
        reason="Checked when you open the app"
        defaultChecked
      />
      <NotificationRow permission="unavailable" title="A display can't be reached" reason="After 5 minutes offline" />
      <NotificationRow
        permission="unavailable"
        title="Your held message is waiting"
        reason="During the Silence Schedule"
      />
    </ListRowGroup>
  ),
};

/** 07e `337:60272`: the browser blocked notifications. */
export const Blocked: Story = {
  render: () => (
    <ListRowGroup aria-label="On this browser" className="w-full sm:w-[560px]">
      <NotificationRow
        permission="denied"
        title="An integration needs attention"
        reason="Checked when you open the app"
      />
      <NotificationRow permission="denied" title="A display can't be reached" reason="After 5 minutes offline" />
      <NotificationRow permission="denied" title="Your held message is waiting" reason="During the Silence Schedule" />
    </ListRowGroup>
  ),
};

/** The desktop row size, with the switch at its default size. */
export const DefaultSize: Story = {
  render: () => (
    <ListRowGroup aria-label="On this browser" size="default" className="w-full sm:w-[560px]">
      <NotificationRow
        size="default"
        title="An integration needs attention"
        reason="Checked when you open the app"
        defaultChecked
      />
      <NotificationRow size="default" title="A display can't be reached" reason="After 5 minutes offline" />
    </ListRowGroup>
  ),
};
