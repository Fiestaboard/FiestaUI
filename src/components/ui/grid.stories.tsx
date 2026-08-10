import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardDescription, CardHeader, CardTitle } from "./card";
import { Grid } from "./grid";
import { Input } from "./input";
import { Label } from "./label";
import { Stack } from "./stack";

const box = "rounded-md bg-muted px-4 py-2 text-sm text-foreground";

const meta = {
  title: "UI/Grid",
  component: Grid,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    cols: {
      control: "select",
      options: ["1", "2", "3", "4", "5", "6", "8"],
      description: "Base (mobile-first) column count",
    },
    sm: {
      control: "select",
      options: ["1", "2", "3", "4", "5", "6", "8"],
      description: "Column count at the sm breakpoint",
    },
    md: {
      control: "select",
      options: ["1", "2", "3", "4", "5", "6", "8"],
      description: "Column count at the md breakpoint",
    },
    lg: {
      control: "select",
      options: ["1", "2", "3", "4", "5", "6", "8"],
      description: "Column count at the lg breakpoint",
    },
    gap: {
      control: "select",
      options: ["0", "0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "12"],
      description: "Gap between cells (Tailwind spacing scale)",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    children: {
      control: false,
      description: "Grid children",
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    cols: "3",
    gap: "4",
    children: (
      <>
        <div className={box}>1</div>
        <div className={box}>2</div>
        <div className={box}>3</div>
        <div className={box}>4</div>
        <div className={box}>5</div>
        <div className={box}>6</div>
      </>
    ),
  },
};

/** Recreates the dashboard card grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. */
export const CardGrid = () => (
  <Grid cols="1" sm="2" lg="3" gap="4" className="w-full sm:w-[720px] max-w-full">
    {["Weather", "Muni arrivals", "Stocks", "Air quality", "Surf report", "Date & time"].map((name) => (
      <Card key={name}>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>Plugin enabled</CardDescription>
        </CardHeader>
      </Card>
    ))}
  </Grid>
);

/** Recreates two-column settings forms: `grid grid-cols-2 gap-4`. */
export const FormGrid = () => (
  <Grid cols="2" gap="4" className="w-full sm:w-[480px]">
    <Stack gap="1.5">
      <Label htmlFor="grid-lat">Latitude</Label>
      <Input id="grid-lat" placeholder="40.7128" />
    </Stack>
    <Stack gap="1.5">
      <Label htmlFor="grid-lon">Longitude</Label>
      <Input id="grid-lon" placeholder="-74.0060" />
    </Stack>
  </Grid>
);

/** Recreates dense swatch rows like the board color picker: `grid grid-cols-8 gap-1`. */
export const SwatchGrid = () => (
  <Grid cols="8" gap="1" className="w-fit">
    {Array.from({ length: 16 }, (_, i) => (
      <div key={i} className="size-8 rounded-md border bg-muted" />
    ))}
  </Grid>
);
