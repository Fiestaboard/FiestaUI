import type { Meta, StoryObj } from "@storybook/react";

import { List, ListItem } from "./list";

const meta = {
  title: "Primitives/Typography/List",
  component: List,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["ul", "ol"],
      description: "Rendered list element",
    },
    marker: {
      control: "select",
      options: ["none", "disc", "decimal"],
      description: "List marker style (none is the app default)",
    },
    gap: {
      control: "select",
      options: ["0", "1", "2", "3", "4"],
      description: "Vertical gap between items (space-y-*)",
    },
  },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <List>
      <ListItem>First unmarked item</ListItem>
      <ListItem>Second unmarked item</ListItem>
      <ListItem>Third unmarked item</ListItem>
    </List>
  ),
};

export const Markers: Story = {
  render: () => (
    <List as="ol" marker="decimal" gap="2">
      <ListItem>Enable the plugin</ListItem>
      <ListItem>Paste the API key</ListItem>
      <ListItem>Save and view the board</ListItem>
    </List>
  ),
};

export const DiscMarker: Story = {
  render: () => (
    <List marker="disc" gap="2">
      <ListItem>First bulleted item</ListItem>
      <ListItem>Second bulleted item</ListItem>
      <ListItem>Third bulleted item</ListItem>
    </List>
  ),
};
