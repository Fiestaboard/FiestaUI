import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import * as React from "react";

import { Badge } from "./badge";

const meta = {
  title: "Feedback/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "brand", "secondary", "destructive", "outline", "variable", "success", "formula"],
      description: "Visual style variant",
    },
    children: {
      control: "text",
      description: "Badge label content",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    asChild: {
      control: false,
      description: "Render the badge styles onto a single child element (e.g. an anchor)",
    },
    onDismiss: {
      control: false,
      description:
        "Renders a trailing dismiss button the badge owns. Type-paired with dismissLabel — one without the other is a compile error (#299).",
    },
    dismissLabel: {
      control: false,
      description:
        "Localized accessible name for the dismiss button. Required with onDismiss: the X glyph is aria-hidden, so this is the button's only name.",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Brand: Story = {
  args: {
    children: "Brand",
    variant: "brand",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Variable: Story = {
  args: {
    children: "{weather.temp}",
    variant: "variable",
  },
};

export const Success: Story = {
  args: {
    children: "connected",
    variant: "success",
  },
};

export const Formula: Story = {
  args: {
    children: "{=round(temp)}",
    variant: "formula",
  },
};

export const WithIcon: Story = {
  args: {
    variant: "success",
    children: (
      <>
        <CheckCircle2 aria-hidden="true" />
        Online
      </>
    ),
  },
};

export const AsLink = () => (
  <Badge asChild variant="outline">
    <a href="#releases">v8.11 release notes</a>
  </Badge>
);

export const AllVariants = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Badge variant="default">Default</Badge>
    <Badge variant="brand">Brand</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="variable">{"{variable}"}</Badge>
    <Badge variant="success">success</Badge>
    <Badge variant="formula">{"{=formula}"}</Badge>
  </div>
);

export const StatusList = () => (
  <div className="w-full sm:w-[380px] space-y-3">
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Kitchen board</span>
      <Badge variant="success">
        <CheckCircle2 aria-hidden="true" />
        Connected
      </Badge>
    </div>
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Office board</span>
      <Badge variant="secondary">
        <Clock aria-hidden="true" />
        Idle
      </Badge>
    </div>
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Lobby board</span>
      <Badge variant="destructive">
        <AlertCircle aria-hidden="true" />
        Offline
      </Badge>
    </div>
  </div>
);

/**
 * A badge that owns its dismiss button (#249).
 *
 * Three FiestaBoard sites (`active-page-display.tsx:549`, `:565`,
 * `ai-settings.tsx:338`) put an operable `X` *inside* a `Badge`. At 20px and
 * `overflow-hidden`, the badge clipped both the 24px `Button size="icon-xs"`
 * and `.focus-ring`, whose indicator is an outward `box-shadow` and is
 * therefore erased entirely by an overflow-hidden ancestor — the defect #240
 * exists to remove, reintroduced one level up.
 *
 * The badge stays content and is not itself interactive; it nests exactly one
 * control, so the call site nests none. Clipping moves from the root to the
 * label, so long tag text still stays inside the pill.
 *
 * `dismissLabel` is not optional here (#299). The X glyph is `aria-hidden`, so
 * the label is the button's ONLY accessible name — without it a row of these
 * announces as "button, button, button" with nothing to say which one removes
 * Weather. The props type pairs the two, so the nameless call no longer
 * compiles rather than merely being discouraged in a docstring.
 *
 * Tab to a badge below and check the focus ring is drawn in full.
 */
export const Dismissible = () => {
  const [tags, setTags] = React.useState(["Weather", "Transit", "A tag with a rather long label"]);

  return (
    <div className="flex max-w-sm flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          onDismiss={() => setTags((current) => current.filter((t) => t !== tag))}
          dismissLabel={`Remove ${tag}`}
        >
          {tag}
        </Badge>
      ))}
      {tags.length === 0 ? <span className="text-sm text-muted-foreground">All dismissed.</span> : null}
    </div>
  );
};

/** Every variant carries the dismiss button on its own ink. */
export const DismissibleVariants = () => (
  <div className="flex flex-wrap items-center gap-2">
    {(["default", "secondary", "destructive", "outline", "variable", "success", "formula"] as const).map((variant) => (
      <Badge key={variant} variant={variant} onDismiss={() => {}} dismissLabel={`Remove ${variant}`}>
        {variant}
      </Badge>
    ))}
  </div>
);
