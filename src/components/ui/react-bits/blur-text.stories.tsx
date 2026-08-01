import type { Meta, StoryObj } from "@storybook/react";

import BlurText from "./blur-text";

const meta = {
  title: "UI/React Bits/BlurText",
  component: BlurText,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    text: {
      control: "text",
      description: "Text to animate with the blur reveal effect",
    },
    delay: {
      control: { type: "range", min: 0, max: 500, step: 25 },
      description: "Stagger delay between each element in milliseconds",
    },
    animateBy: {
      control: "select",
      options: ["words", "letters"],
      description: "Split the text into words or individual letters",
    },
    direction: {
      control: "select",
      options: ["top", "bottom"],
      description: "Direction each element slides in from",
    },
    stepDuration: {
      control: { type: "number", min: 0.1, max: 2, step: 0.05 },
      description: "Duration of each element's transition in seconds",
    },
    threshold: {
      control: { type: "range", min: 0, max: 1, step: 0.05 },
      description: "IntersectionObserver visibility ratio (0-1) that triggers the animation",
    },
    rootMargin: {
      control: "text",
      description: "IntersectionObserver root margin (CSS margin syntax)",
    },
    className: {
      control: "text",
      description: "Additional classes applied to the wrapping span",
    },
    onAnimationComplete: {
      control: false,
      description: "Callback fired once every element has finished animating",
    },
  },
} satisfies Meta<typeof BlurText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Blur text animation",
    delay: 200,
    animateBy: "words",
    direction: "top",
    stepDuration: 0.35,
    threshold: 0.1,
    rootMargin: "0px",
    className: "text-2xl font-semibold text-foreground",
  },
};

export const ByLetters: Story = {
  args: {
    text: "Character by character",
    delay: 50,
    animateBy: "letters",
    direction: "top",
    className: "text-xl text-foreground",
  },
};

export const FromBottom: Story = {
  args: {
    text: "Appearing from below",
    delay: 200,
    animateBy: "words",
    direction: "bottom",
    className: "text-xl text-foreground",
  },
};

export const FastAnimation: Story = {
  args: {
    text: "Quick blur effect",
    delay: 50,
    animateBy: "words",
    stepDuration: 0.2,
    className: "text-xl text-foreground",
  },
};

export const SlowAnimation: Story = {
  args: {
    text: "Slow and smooth",
    delay: 300,
    animateBy: "words",
    stepDuration: 0.8,
    className: "text-xl text-foreground",
  },
};

export const LargeHeadline: Story = {
  args: {
    text: "Welcome to FiestaBoard",
    delay: 150,
    animateBy: "words",
    className: "text-4xl font-bold text-foreground",
  },
};

export const ColoredText: Story = {
  args: {
    text: "Colorful blur animation",
    delay: 200,
    animateBy: "words",
    className: "text-2xl font-semibold text-primary",
  },
};

export const LettersFromBottom: Story = {
  args: {
    text: "Rising letters",
    delay: 40,
    animateBy: "letters",
    direction: "bottom",
    stepDuration: 0.45,
    className: "text-3xl font-bold tracking-wide text-foreground",
  },
};

export const HeroSection: Story = {
  args: {
    text: "Meet your new message board",
    delay: 120,
    animateBy: "words",
    direction: "top",
  },
  render: (args) => (
    <div className="max-w-xl space-y-4 p-8 text-center">
      <h1>
        <BlurText {...args} className="justify-center text-4xl font-bold text-foreground" />
      </h1>
      <p>
        <BlurText
          text="Beautiful split-flap displays, driven by the plugins you choose."
          delay={60}
          animateBy="words"
          stepDuration={0.3}
          className="justify-center text-lg text-muted-foreground"
        />
      </p>
      <p>
        <BlurText
          text="No wiring required."
          delay={80}
          animateBy="letters"
          direction="bottom"
          stepDuration={0.25}
          className="justify-center text-sm font-medium tracking-widest text-primary uppercase"
        />
      </p>
    </div>
  ),
};
