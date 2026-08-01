import type { Meta, StoryObj } from "@storybook/react";
import { FileText, Inbox, Plus, Search, WifiOff } from "lucide-react";

import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { EmptyState } from "./empty-state";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: false,
      description: "Lucide icon component rendered inside the tinted circle",
    },
    title: {
      control: "text",
      description: "Short heading describing the empty state",
    },
    description: {
      control: "text",
      description: "Optional supporting copy shown below the title",
    },
    action: {
      control: false,
      description: "Optional call-to-action slot (e.g. a Button)",
    },
    illustration: {
      control: false,
      description: "Optional illustration (e.g. inline SVG) shown instead of the icon",
    },
    className: {
      control: "text",
      description: "Additional Tailwind classes merged onto the container",
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: "No pages yet",
    description: "Create your first page to start displaying content on the board.",
  },
};

export const TitleOnly: Story = {
  args: {
    icon: FileText,
    title: "Nothing to show",
  },
};

export const WithAction: Story = {
  args: {
    icon: Inbox,
    title: "No pages yet",
    description: "Create your first page to start displaying content on the board.",
    action: (
      <Button>
        <Plus aria-hidden="true" />
        Create page
      </Button>
    ),
  },
};

export const NoSearchResults: Story = {
  args: {
    icon: Search,
    title: "No results found",
    description: 'No plugins match "weathr". Try a different search term.',
    action: <Button variant="outline">Clear search</Button>,
  },
};

export const WithIllustration: Story = {
  args: {
    icon: Inbox,
    title: "You're offline",
    description: "Check your network connection and try again.",
    illustration: (
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
        <ellipse cx="60" cy="66" rx="42" ry="8" fill="currentColor" opacity="0.15" />
        <path
          d="M30 52a18 18 0 0 1 3-35.7A24 24 0 0 1 79 22a20 20 0 0 1 11 30"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M44 40l32 20M76 40L44 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    action: (
      <Button variant="outline">
        <WifiOff aria-hidden="true" />
        Retry connection
      </Button>
    ),
  },
};

export const InCardExample: Story = {
  render: (args) => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Collections</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState {...args} />
      </CardContent>
    </Card>
  ),
  args: {
    icon: FileText,
    title: "No collections yet",
    description: "Group related pages into a collection to rotate them on a schedule.",
    action: (
      <Button size="sm">
        <Plus aria-hidden="true" />
        New collection
      </Button>
    ),
  },
};
