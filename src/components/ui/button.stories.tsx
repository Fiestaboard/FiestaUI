import type { Meta, StoryObj } from "@storybook/react";
import { ChevronLeft, ChevronRight, Mail, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "brand", "destructive", "outline", "secondary", "ghost", "link"],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
      description: "Size variant (icon sizes are square)",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    loading: {
      control: "boolean",
      description:
        "Busy state. Swaps the label for a Spinner without changing the button's width, and marks it " +
        "`aria-busy` + `aria-disabled` (never `disabled`, which would drop focus). Activation is " +
        "suppressed while set, so a second click cannot double-submit.",
    },
    children: {
      control: "text",
      description: "Button label content",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    asChild: {
      control: false,
      description: "Render the button styles onto a single child element (e.g. an anchor)",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    disabled: false,
  },
};

export const Brand: Story = {
  args: {
    children: "Get started",
    variant: "brand",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

export const Small: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large",
    size: "lg",
  },
};

export const Icon: Story = {
  args: {
    children: <Plus className="h-4 w-4" />,
    size: "icon",
    variant: "outline",
    "aria-label": "Add",
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="h-4 w-4" />
        Login with Email
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: "Save changes",
  },
};

/**
 * The label keeps its place at `opacity: 0` while the spinner sits on top, so
 * the button is exactly as wide loading as it is idle and nothing beside it
 * shifts. It also keeps its accessible name — the button announces as
 * "Save changes, busy", not as "Loading".
 */
export const LoadingWidthIsStable = () => (
  <div className="flex flex-col items-start gap-4">
    <div className="flex items-center gap-3">
      <Button>Save changes</Button>
      <Button loading>Save changes</Button>
      <span className="text-sm text-muted-foreground">text only</span>
    </div>
    <div className="flex items-center gap-3">
      <Button variant="brand">
        <Save className="h-4 w-4" />
        Publish
      </Button>
      <Button variant="brand" loading>
        <Save className="h-4 w-4" />
        Publish
      </Button>
      <span className="text-sm text-muted-foreground">icon + label</span>
    </div>
    <div className="flex items-center gap-3">
      <Button size="icon" variant="outline" aria-label="Add">
        <Plus className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="outline" loading aria-label="Add">
        <Plus className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">icon only</span>
    </div>
  </div>
);

/** Spinner size tracks the button height across the whole scale. */
export const LoadingSizes = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button size="sm" loading>
      Small
    </Button>
    <Button size="default" loading>
      Default
    </Button>
    <Button size="lg" loading>
      Large
    </Button>
  </div>
);

/**
 * `loading` is not `disabled`. The button stays in the tab order and stays
 * focusable — tab through this row while the middle button is busy and focus
 * lands on it as usual — but clicking it (or pressing Enter/Space) does
 * nothing, so the submit cannot fire twice.
 */
export const LoadingStaysFocusable = () => (
  <div className="flex items-center gap-3">
    <Button variant="outline">Before</Button>
    <Button loading onClick={() => console.log("this never fires while loading")}>
      Submitting
    </Button>
    <Button variant="outline">After</Button>
  </div>
);

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

export const AsLink = () => (
  <Button asChild variant="outline">
    <a href="#docs">Read the docs</a>
  </Button>
);

export const AllVariants = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button variant="default">Default</Button>
    <Button variant="brand">Brand</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
);

export const AllSizes = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon" aria-label="Add">
      <Plus className="h-4 w-4" />
    </Button>
    <Button size="icon-sm" aria-label="Add">
      <Plus className="h-4 w-4" />
    </Button>
    <Button size="icon-lg" aria-label="Add">
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

export const DestructiveWithIcon = () => (
  <Button variant="destructive">
    <Trash2 className="h-4 w-4" />
    Delete Account
  </Button>
);

export const IconButtons = () => (
  <div className="flex items-center gap-4">
    <Button variant="outline" size="icon" aria-label="Next">
      <ChevronRight className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" aria-label="Email">
      <Mail className="h-4 w-4" />
    </Button>
    <Button variant="secondary" size="icon" aria-label="Add">
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

export const PaginationToolbar = () => (
  <div className="flex w-[420px] items-center justify-between rounded-lg border p-3">
    <Button variant="outline" size="sm">
      <ChevronLeft className="h-4 w-4" />
      Previous
    </Button>
    <span className="text-sm text-muted-foreground">Page 2 of 10</span>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="brand" size="sm">
        <Plus className="h-4 w-4" />
        New page
      </Button>
    </div>
  </div>
);
