import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Stack } from "./stack";

const box = "rounded-md bg-muted px-4 py-2 text-sm text-foreground";

const meta = {
  title: "UI/Stack",
  component: Stack,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    gap: {
      control: "select",
      options: ["0", "0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "12"],
      description: "Vertical gap between children (Tailwind spacing scale)",
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "stretch"],
      description: "Horizontal alignment of children (items-*)",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    children: {
      control: false,
      description: "Stack children",
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    gap: "2",
    children: (
      <>
        <div className={box}>One</div>
        <div className={box}>Two</div>
        <div className={box}>Three</div>
      </>
    ),
  },
};

/** Recreates the app's `space-y-4` form sections with `space-y-1.5` field groups. */
export const FormStack = () => (
  <Stack gap="4" className="w-full sm:w-[360px]">
    <Stack gap="1.5">
      <Label htmlFor="stack-board-name">Board name</Label>
      <Input id="stack-board-name" placeholder="Kitchen board" />
    </Stack>
    <Stack gap="1.5">
      <Label htmlFor="stack-board-key">API key</Label>
      <Input id="stack-board-key" placeholder="your-api-key-here" />
    </Stack>
    <Button className="w-fit">Save</Button>
  </Stack>
);

export const GapScale = () => (
  <div className="flex items-start gap-8">
    {(["1", "2", "4", "6"] as const).map((gap) => (
      <Stack key={gap} gap="2" className="w-full sm:w-[120px]">
        <span className="text-sm font-medium">gap=&quot;{gap}&quot;</span>
        <Stack gap={gap}>
          <div className={box} />
          <div className={box} />
          <div className={box} />
        </Stack>
      </Stack>
    ))}
  </div>
);

export const AlignmentOptions = () => (
  <div className="flex items-start gap-8">
    {(["stretch", "start", "center", "end"] as const).map((align) => (
      <Stack key={align} gap="2" className="w-full sm:w-[160px]">
        <span className="text-sm font-medium">align=&quot;{align}&quot;</span>
        <Stack gap="2" align={align} className="rounded-md border border-dashed p-2">
          <div className={box}>Wide item</div>
          <div className={box}>Short</div>
        </Stack>
      </Stack>
    ))}
  </div>
);
