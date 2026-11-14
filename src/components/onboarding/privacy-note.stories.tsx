import type { Meta, StoryObj } from "@storybook/react";

import { PrivacyNote } from "./privacy-note";

const meta = {
  title: "App/Onboarding/PrivacyNote",
  component: PrivacyNote,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    title: "Your data stays on your network",
    children:
      "This app talks straight to your FiestaBoard hub over Wi‑Fi. There is no FiestaBoard cloud account. Keys you enter are saved on your hub, not in this app.",
  },
  decorators: [
    (Story) => (
      // 370 = 05 `36:6336`.
      <div className="w-full max-w-[370px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PrivacyNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 05 `36:6336`. */
export const Default: Story = {};

/** Where a key is asked for: the same promise, scoped to the key. */
export const ForAKey: Story = {
  args: {
    title: "This key stays on your hub",
    children: "FiestaBoard sends it only to the service it belongs to. It is never sent to FiestaBoard.",
  },
};

/** Body only, for a tight host that already titles the section. */
export const WithoutTitle: Story = {
  args: { title: undefined },
};
