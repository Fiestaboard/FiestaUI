import type { Meta, StoryObj } from "@storybook/react";
import { Check, Ellipsis, Plus } from "lucide-react";

import { Button } from "../forms/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../overlays/sheet";
import { InstallSteps } from "./install-steps";

/* Safari's real controls, as 07 `58:35303` names them. */
const SAFARI_STEPS = [
  { text: "Tap ⋯ in Safari’s address bar, then Share.", icon: <Ellipsis /> },
  { text: "Scroll down and tap Add to Home Screen.", icon: <Plus /> },
  { text: "Leave Open as Web App on, then tap Add.", icon: <Check /> },
];

const meta = {
  title: "App/Onboarding/InstallSteps",
  component: InstallSteps,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    steps: SAFARI_STEPS,
    "aria-label": "Add to your Home Screen",
  },
  decorators: [
    (Story) => (
      // 358 = the 07 sheet's content width.
      <div className="w-full max-w-[358px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InstallSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three step rows of 07 `58:35303`. */
export const Default: Story = {};

/** Steps whose control has no glyph worth drawing. */
export const WithoutIcons: Story = {
  args: {
    steps: SAFARI_STEPS.map(({ text }) => ({ text })),
  },
};

/**
 * 07 `58:34465`: the whole Add to Home Screen sheet, composed from the 1.3
 * bottom sheet. Safari has no install prompt, so the same success moment that
 * shows the InstallCard on Chrome opens this instead.
 */
export const InSheet: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Story />],
  render: (args) => (
    <div className="min-h-dvh bg-background">
      <Sheet defaultOpen>
        <SheetContent side="bottom" grabber>
          <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
            <SheetTitle>Add to your Home Screen</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 pt-2 pb-6">
            <SheetDescription>
              iPhone doesn’t let websites install themselves, so here is how. It takes about 10 seconds and you can
              remove it like any app.
            </SheetDescription>
            <InstallSteps {...args} />
            <div className="flex flex-wrap items-center gap-2">
              {/* TODO(#385): size="touch" once slice 1.2 is on alpha. */}
              <Button variant="secondary" size="lg" className="h-11">
                Got it
              </Button>
              <Button variant="ghost" size="lg" className="h-11">
                Don’t show again
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
};
