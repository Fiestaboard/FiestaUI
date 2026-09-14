import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles } from "lucide-react";

import { Conversation, ConversationContent, ConversationScrollButton } from "./conversation";
import { Message, MessageAvatar, MessageContent } from "./message";

const meta = {
  title: "AI/Conversation",
  component: Conversation,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    labels: {
      control: false,
      description: "Accessible names: `conversation` for the log region, `scrollToBottom` for the jump button.",
    },
    children: {
      control: false,
      description: "A `ConversationContent` stack of `Message`s, plus an optional `ConversationScrollButton`.",
    },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Conversation>;

export default meta;
type Story = StoryObj<typeof meta>;

const turns = [
  ["user", "Make a morning page with the weather and the time."],
  ["assistant", "On it — I'll create a page called Morning with the temperature on line 2 and the clock on line 6."],
  ["user", "Add the next Muni departure too."],
  ["assistant", "Done. Line 4 now shows the next departure from your configured stop."],
  ["user", "Schedule it for weekday mornings."],
  ["assistant", "Scheduled Morning for 7:00–9:00, Monday to Friday."],
] as const;

/** A short transcript. The log region is named and polite; the assistant's turns are page ink, the user's are bubbles. */
export const Default: Story = {
  render: (args) => (
    <div className="w-full sm:w-[380px]">
      <Conversation {...args} className="h-72 rounded-lg border">
        <ConversationContent>
          {turns.map(([from, text], i) => (
            <Message key={i} from={from}>
              {from === "assistant" ? (
                <MessageAvatar>
                  <Sparkles />
                </MessageAvatar>
              ) : null}
              <MessageContent>{text}</MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  ),
};
