import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardContent, CardHeader, CardTitle } from "../containment/card";
import { PageLayout } from "./page-layout";

/** Sample page content so the responsive container padding is visible. */
function SampleContent() {
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Page content</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active page</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sample content inside the responsive container — PageLayout owns the horizontal padding and max width.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Up next</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Padding steps up with the viewport: px-3 on phones through px-6 on desktop.
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const meta = {
  title: "App/Chrome/PageLayout",
  component: PageLayout,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    children: <SampleContent />,
  },
  argTypes: {
    fillHeight: {
      description:
        "Pin the layout to the viewport height (desktop) so inner content — e.g. the schedule calendar — scrolls independently. Phones fall back to normal page scroll.",
      control: "boolean",
    },
    children: { control: false },
    className: { control: false },
    outerClassName: { control: false },
  },
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FillHeight: Story = {
  args: { fillHeight: true },
};
