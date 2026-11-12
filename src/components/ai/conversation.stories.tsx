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
 * Deterministic, not timed (#395 Fable M1: a two-frame guess lost the race
 * to the log's own re-pin on one CI leg). Conversation pins the log from a
 * ResizeObserver registered in its effect; this story's observer is
 * registered after it (a parent's effect runs after its child's), so in any
 * frame it runs after the pin. Once the log is pinned and scrollable, it
 * scrolls to the top and dispatches the scroll event itself, so
 * Conversation's handler marks "not at bottom" synchronously, before any
 * later resize could re-pin.
 */
export const ScrolledUp: Story = {
  render: function Render(args) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const viewport = rootRef.current?.querySelector<HTMLElement>("[data-slot=conversation-viewport]");
      if (!viewport || typeof ResizeObserver === "undefined") return;
      const scrollUp = () => {
        const pinned = viewport.scrollTop > 0 && viewport.scrollHeight > viewport.clientHeight;
        if (!pinned) return false;
        viewport.scrollTop = 0;
        viewport.dispatchEvent(new Event("scroll"));
        return true;
      };
      const observer = new ResizeObserver(() => {
        if (scrollUp()) observer.disconnect();
      });
      for (const child of Array.from(viewport.children)) observer.observe(child);
      return () => observer.disconnect();
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
