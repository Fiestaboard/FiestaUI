import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "../feedback/skeleton";
import { DisplayPreview } from "./display-preview";
import { PreviewSlot } from "./preview-slot";

const meta = { title: "Board/PreviewSlot", component: PreviewSlot, tags: ["autodocs"] } satisfies Meta<
  typeof PreviewSlot
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShapesAndStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PreviewSlot>
        <DisplayPreview model="divoom_pixoo64" message="HELLO" size="sm" />
      </PreviewSlot>
      <PreviewSlot>
        <DisplayPreview model="vestaboard_flagship" message="HELLO" size="sm" />
      </PreviewSlot>
      <PreviewSlot>
        <Skeleton className="h-20 w-48" />
      </PreviewSlot>
      <PreviewSlot>
        <p className="text-sm text-muted-foreground">Preview unavailable</p>
      </PreviewSlot>
    </div>
  ),
};
