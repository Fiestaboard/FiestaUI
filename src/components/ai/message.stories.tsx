import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles } from "lucide-react";

import { Message, MessageAvatar, MessageContent } from "./message";

const meta = {
  title: "AI/Message",
  component: Message,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    from: {
      control: "radio",
      options: ["user", "assistant"],
      description: "Who the turn is from. Stamped as `data-from`; the bubble treatment follows it.",
    },
    children: { control: false, description: "`MessageContent`, optionally preceded by a `MessageAvatar`." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The user's turn: a right-aligned bubble on the accent surface. */
export const User: Story = {
  args: { from: "user" },
  render: (args) => (
    <div className="w-full sm:w-[360px]">
      <Message {...args}>
        <MessageContent>Show the temperature on line 2.</MessageContent>
      </Message>
    </div>
  ),
};

/** The assistant's turn: full-width page ink with a glyph avatar, because it carries markdown, tool cards and timelines. */
export const Assistant: Story = {
  args: { from: "assistant" },
  render: (args) => (
    <div className="w-full sm:w-[360px]">
      <Message {...args}>
        <MessageAvatar>
          <Sparkles />
        </MessageAvatar>
        <MessageContent>Done — line 2 now reads the weather plugin&apos;s temperature, centred.</MessageContent>
      </Message>
    </div>
  ),
};

/** An initial stands in when there is no glyph. */
export const AvatarInitial = () => (
  <Message from="assistant">
    <MessageAvatar name="FiestaBot" />
    <MessageContent>Hello!</MessageContent>
  </Message>
);
