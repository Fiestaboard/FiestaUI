import type { Meta, StoryObj } from "@storybook/react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  title: "Containment/Table",
  component: Table,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plugin</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Weather</TableCell>
          <TableCell>Enabled</TableCell>
          <TableCell>2.1.0</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Muni</TableCell>
          <TableCell>Disabled</TableCell>
          <TableCell>1.4.2</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
