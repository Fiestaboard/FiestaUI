import type { Meta, StoryObj } from "@storybook/react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "./prompt-input";

const meta = {
  title: "AI/PromptInput",
  component: PromptInput,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "radio",
      options: ["ready", "submitted", "streaming", "error"],
      description:
        "`ready` sends; `submitted` disables Send; `streaming` turns Send into Stop; `error` allows sending again.",
    },
    labels: {
      control: false,
      description: "`send` and `stop` — the accessible names of the two forms of the submit button.",
    },
    onSubmit: {
      control: false,
      description: "The native form submit. Enter in the textarea triggers it; Shift+Enter is a newline.",
    },
    children: { control: false },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const Composer = (args: React.ComponentProps<typeof PromptInput>) => (
  <div className="w-full sm:w-[420px]">
    <PromptInput {...args} onSubmit={(event) => event.preventDefault()}>
      <PromptInputTextarea
        aria-label="Message"
        placeholder="Ask FiestaBot…"
        defaultValue="Make a weather page for the kitchen board"
      />
      <PromptInputToolbar>
        <PromptInputTools>
          <span className="px-1 text-xs text-muted-foreground">gpt-4.1</span>
        </PromptInputTools>
        <PromptInputSubmit onStop={() => undefined} />
      </PromptInputToolbar>
    </PromptInput>
  </div>
);

/** Ready to send. */
export const Ready: Story = { args: { status: "ready" }, render: Composer };

/** While a reply streams the submit becomes a Stop button — `type="button"`, so it cannot submit the form. */
export const Streaming: Story = { args: { status: "streaming" }, render: Composer };

/** Sent, nothing back yet: Send is disabled so the same message cannot go twice. */
export const Submitted: Story = { args: { status: "submitted" }, render: Composer };
