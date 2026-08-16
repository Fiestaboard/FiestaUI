import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardContent, CardFooter, CardHeader } from "../containment/card";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Tailwind classes controlling the placeholder's size and shape",
    },
    children: {
      control: false,
      description: "Optional content rendered inside the placeholder block",
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "w-[200px] h-[20px]",
  },
};

export const Circle: Story = {
  args: {
    className: "h-12 w-12 rounded-full",
  },
};

export const TextLines: Story = {
  render: () => (
    <div className="w-full sm:w-[400px] space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};

export const ImageCard: Story = {
  render: () => (
    <div className="flex w-[250px] flex-col space-y-3">
      <Skeleton className="h-[125px] w-[250px] rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};

export const ProfileCard: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};

export const TableRows: Story = {
  render: () => (
    <div className="w-full sm:w-[400px] space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      ))}
    </div>
  ),
};

export const AllShapes: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Text Lines</h3>
        <div className="space-y-2 w-full sm:w-[400px]">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Shapes</h3>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-20 w-20" />
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-20 w-32 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-md" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Common Patterns</h3>
        <div className="space-y-4 w-full sm:w-[400px]">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const CardLoading: Story = {
  render: () => (
    <Card className="w-full sm:w-[320px]">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      <CardFooter className="justify-between">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </CardFooter>
    </Card>
  ),
};
