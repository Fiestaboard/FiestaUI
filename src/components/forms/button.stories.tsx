import type { Meta, StoryObj } from "@storybook/react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Mail, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "Forms/Button",
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
      options: ["default", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
      description:
        "Size variant (icon sizes are square: 24 / 32 / 36 / 40px). `icon-xs` is the 24px floor — WCAG 2.2 " +
        "SC 2.5.8's minimum target, for affordances that sit inside a chip, a code block or a dense row.",
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

/**
 * The 24px icon affordance, for the control that lives *inside* something
 * else. 24 is not a rounded-down 32: it is WCAG 2.2 SC 2.5.8 (Target Size,
 * Minimum) exactly, and it is the floor for the whole package — the versions
 * this replaces measure ~20px, which fails that criterion. Below 24px the
 * answer is not a smaller button, it is a bigger host.
 *
 * It is a full `Button`, so it brings the one thing the hand-rolled versions
 * lost: a visible focus ring. Tab to it.
 */
export const IconXs: Story = {
  args: {
    children: <X className="size-3" />,
    size: "icon-xs",
    variant: "ghost",
    "aria-label": "Clear override",
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
    <Button size="icon-xs" aria-label="Add">
      <Plus className="size-3" />
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

/**
 * The hosts `icon-xs` exists for: a dense rule row and a share-string block,
 * where a 32px `icon-sm` would double the row height. `ghost` is the variant
 * every one of these sites wants — no field of its own, so the affordance
 * belongs to the row rather than sitting on top of it.
 *
 * The glyphs are 12px: the size variant supplies that automatically, and a
 * caller who writes their own `size-3.5` still wins, because the base rule
 * only matches an svg with no `size-*` class of its own.
 *
 * The host must not clip. `Badge` is `overflow-hidden`, so a 24px button
 * inside a 20px badge clips both the button and the outward focus ring —
 * which is the defect this size exists to remove, not an example of it. Those
 * sites want `Chip` (26px, operable, 2.5.8-clean) or a padded row like the
 * ones below.
 */
export const IconXsInDenseHosts = () => (
  <div className="flex w-full sm:w-[420px] flex-col gap-4">
    <div className="flex flex-col gap-1 rounded-lg border p-2">
      {["Status is Blocked", "Owner is unset"].map((rule, index) => (
        <div key={rule} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
          <span className="flex-1 truncate">{rule}</span>
          <Button variant="ghost" size="icon-xs" aria-label={`Move ${rule} up`} disabled={index === 0}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Move ${rule} down`} disabled={index === 1}>
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Delete ${rule}`}>
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 py-1 pl-3 pr-1 font-mono text-xs">
      <span className="flex-1 truncate">fiesta.board/p/9f3c2a</span>
      <Button variant="ghost" size="icon-xs" aria-label="Copy share link">
        <Copy />
      </Button>
    </div>
  </div>
);

export const PaginationToolbar = () => (
  <div className="flex w-full sm:w-[420px] items-center justify-between rounded-lg border p-3">
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
