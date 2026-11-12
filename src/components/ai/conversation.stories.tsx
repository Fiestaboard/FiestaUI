import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { expect, waitFor, within } from "storybook/test";

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

/**
 * Scrolled up to read, so the "Jump to latest" pill shows: a floating
 * `shadow-card` button over the log (#395 R2-S1 — `cn` now merges theme
 * shadows, so this is the first time the pill wears the elevation its code
 * asks for, instead of Button outline's `shadow-xs`).
 *
 * The scroll is done after two frames: the log starts pinned by its
 * ResizeObserver, and only a real scroll away from the bottom (which fires a
 * scroll event) flips it to "not at bottom".
 */
export const ScrolledUp: Story = {
  render: function Render(args) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          const viewport = rootRef.current?.querySelector<HTMLElement>("[data-slot=conversation-viewport]");
          if (viewport) viewport.scrollTop = 0;
        });
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }, []);
    return (
      <div ref={rootRef} className="w-full sm:w-[380px]">
        <Conversation {...args} className="h-56 rounded-lg border">
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
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const jump = await canvas.findByRole("button", { name: "Jump to latest" });
    await waitFor(() => expect(jump).toBeVisible());
    const classes = jump.className.split(/\s+/);
    await expect(classes).toContain("shadow-card");
    await expect(classes).not.toContain("shadow-xs");
    await expect(getComputedStyle(jump).boxShadow).not.toBe("none");
  },
};
