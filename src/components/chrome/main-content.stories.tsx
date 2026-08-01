import type { Meta, StoryObj } from "@storybook/react";

import { MainContent } from "./main-content";

/** Dashed placeholder that makes the chrome padding shifts visible. */
function PlaceholderContent() {
  return (
    <div className="m-4 flex min-h-[60dvh] flex-col justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6">
      <h1 className="text-lg font-semibold">Main content area</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        MainContent is the app's single <code>&lt;main&gt;</code> landmark — pure layout math, no sidebar required.
        Toggle <code>collapsed</code> and <code>aiPanelOpen</code> to watch the left and right padding shift where the
        sidebar and AI panel would sit. <code>isAuthScreen</code> drops all chrome padding for edge-to-edge auth
        screens.
      </p>
    </div>
  );
}

const meta = {
  title: "Chrome/MainContent",
  component: MainContent,
  // MainContent renders its own <main> landmark — fullscreen keeps the
  // preview decorator from wrapping it in a duplicate one.
  parameters: {
    layout: "fullscreen",
  },
  args: {
    children: <PlaceholderContent />,
    collapsed: false,
    aiPanelOpen: false,
    isAuthScreen: false,
    maxWidth: 1680,
  },
  argTypes: {
    collapsed: {
      description: "Sidebar collapse state — drives the left padding (268px expanded, 76px collapsed).",
      control: "boolean",
    },
    aiPanelOpen: {
      description: "Whether the app-wide AI panel is open — reserves 384px of right padding.",
      control: "boolean",
    },
    isAuthScreen: { description: "Auth screens render edge-to-edge with no chrome padding.", control: "boolean" },
    maxWidth: { description: "App max width in px (FiestaBoard passes MAX_APP_WIDTH).", control: "number" },
    children: { control: false },
    transitioning: { control: false },
    onTransitionEnd: { control: false },
  },
} satisfies Meta<typeof MainContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SidebarCollapsed: Story = {
  args: { collapsed: true },
};

export const AiPanelOpen: Story = {
  args: { aiPanelOpen: true },
};

export const AuthScreen: Story = {
  args: { isAuthScreen: true },
};
