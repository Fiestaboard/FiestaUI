import type { Meta, StoryObj } from "@storybook/react";

import DecryptedText from "./decrypted-text";

const meta = {
  title: "Effects/React Bits/DecryptedText",
  component: DecryptedText,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    text: {
      control: "text",
      description: "Text to scramble and decrypt",
    },
    speed: {
      control: { type: "number", min: 10, max: 200, step: 10 },
      description: "Milliseconds between scramble frames",
    },
    maxIterations: {
      control: { type: "number", min: 1, max: 30, step: 1 },
      description: "Scramble frames before settling (non-sequential mode only)",
    },
    sequential: {
      control: "boolean",
      description: "Reveal characters one at a time instead of all at once",
    },
    revealDirection: {
      control: "select",
      options: ["start", "end", "center"],
      description: "Where the sequential reveal begins",
    },
    animateOn: {
      control: "select",
      options: ["view", "hover", "both"],
      description: "Trigger: on scroll into view, on hover, or both",
    },
    characters: {
      control: "text",
      description: "Character pool used for the scrambled glyphs",
    },
    className: {
      control: "text",
      description: "Classes applied to revealed characters",
    },
    encryptedClassName: {
      control: "text",
      description: "Classes applied to still-scrambled characters",
    },
    parentClassName: {
      control: "text",
      description: "Classes applied to the outer wrapper span",
    },
  },
} satisfies Meta<typeof DecryptedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Hover to decrypt",
    speed: 50,
    maxIterations: 10,
    sequential: false,
    revealDirection: "start",
    animateOn: "hover",
    characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
    className: "text-2xl font-semibold text-foreground",
    encryptedClassName: "text-2xl font-semibold text-muted-foreground",
  },
};

export const AnimateOnView: Story = {
  args: {
    text: "Animates on scroll into view",
    speed: 50,
    maxIterations: 10,
    animateOn: "view",
    className: "text-xl text-foreground",
  },
};

export const Sequential: Story = {
  args: {
    text: "Letter by letter reveal",
    speed: 50,
    sequential: true,
    revealDirection: "start",
    animateOn: "hover",
    className: "text-xl text-foreground",
  },
};

export const SequentialFromEnd: Story = {
  args: {
    text: "Reveals from the end",
    speed: 50,
    sequential: true,
    revealDirection: "end",
    animateOn: "hover",
    className: "text-xl text-foreground",
  },
};

export const SequentialFromCenter: Story = {
  args: {
    text: "Reveals from the center outward",
    speed: 50,
    sequential: true,
    revealDirection: "center",
    animateOn: "hover",
    className: "text-xl text-foreground",
  },
};

export const FastDecryption: Story = {
  args: {
    text: "Quick decrypt effect",
    speed: 20,
    maxIterations: 5,
    animateOn: "hover",
    className: "text-xl text-foreground",
  },
};

export const SlowDecryption: Story = {
  args: {
    text: "Slow methodical decrypt",
    speed: 100,
    maxIterations: 20,
    animateOn: "hover",
    className: "text-xl text-foreground",
  },
};

export const BinaryCharacters: Story = {
  args: {
    text: "CUSTOM CHARACTER POOL",
    speed: 40,
    maxIterations: 15,
    animateOn: "hover",
    characters: "01",
    className: "font-mono text-xl text-foreground",
    encryptedClassName: "font-mono text-xl text-primary",
  },
};

export const LargeHeadline: Story = {
  args: {
    text: "WELCOME",
    speed: 50,
    sequential: true,
    revealDirection: "start",
    animateOn: "hover",
    className: "text-6xl font-bold text-foreground",
  },
};

export const TerminalAccessPanel: Story = {
  args: {
    text: "ACCESS GRANTED",
    speed: 60,
    sequential: true,
    revealDirection: "center",
    animateOn: "view",
  },
  render: (args) => (
    <div className="w-full sm:w-96 space-y-4 rounded-lg border bg-card p-6 font-mono text-card-foreground shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>secure-terminal</span>
        <span aria-hidden>[]</span>
      </div>
      <div className="text-2xl font-bold tracking-widest">
        <DecryptedText {...args} className="text-success" encryptedClassName="text-muted-foreground" />
      </div>
      <p className="text-sm">
        <DecryptedText
          text="Decrypting payload from node 07..."
          speed={30}
          sequential
          revealDirection="start"
          animateOn="view"
          className="text-foreground"
          encryptedClassName="text-muted-foreground"
        />
      </p>
      <p className="text-xs text-muted-foreground">
        Hover:{" "}
        <DecryptedText
          text="re-scramble this line"
          speed={40}
          maxIterations={8}
          animateOn="hover"
          className="text-primary"
          encryptedClassName="text-muted-foreground"
        />
      </p>
    </div>
  ),
};
