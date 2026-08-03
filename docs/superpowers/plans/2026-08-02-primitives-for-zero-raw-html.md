# Primitives for Zero-Raw-HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the seven primitives (`Text`, `Heading`, `Code`, `TextLink`, `List`/`ListItem`, `Table` set, `Box`) that let FiestaBoard eliminate raw HTML from its app code, then release a minor.

**Architecture:** Each primitive is one file in `src/components/ui/` in the existing cva-variant house style (enumerated variants only, so every emitted class is statically visible to the Tailwind v4 scanner), plus a Storybook story that doubles as its executable spec (a11y via `test-storybook`, pixels via VRT). Spec: FiestaBoard repo `docs/superpowers/specs/2026-08-02-fiestaui-primitives-adoption-design.md`.

**Tech Stack:** React 19, class-variance-authority, Tailwind v4, Storybook 8 (+ test-storybook a11y), custom VRT (`scripts/vrt/vrt.mjs`).

## Global Constraints

- No unit-test runner exists in this repo. The per-task verify cycle is: `npm run typecheck && npm run lint && npm run format:check && npm run build`, then `npm run build-storybook`, then `npm run vrt` (after `npm run vrt:update` for intentionally new/changed stories), then `npm run test-storybook:ci` if the environment supports it.
- Variants must be enumerated cva options — never string-interpolated class names.
- Every component: `function` declaration (not arrow), `data-slot` attribute, `cn` from `../../lib/utils`, named export (no default), export added to `src/index.ts`.
- Stories follow `src/components/ui/stack.stories.tsx` conventions: `title: "UI/<Name>"`, `tags: ["autodocs"]`, argTypes with control + description.
- Work on a feature branch off `main`; PR into `main`. Do NOT bump `package.json` version — the Release workflow does that.
- Status tokens that exist and may be used: `text-foreground`, `text-muted-foreground`, `text-destructive`, `text-info`, `text-success`, `text-warning`, `text-primary`, `ring-ring`, `bg-muted`.
- Canonical title recipe (from `AlertTitle`/`CardTitle`): `font-semibold leading-none tracking-tight`.
- Canonical focus ring (from Button, v1.0.0 unified recipe): `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.

---

### Task 1: `Text`

**Files:**

- Create: `src/components/ui/text.tsx`
- Create: `src/components/ui/text.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/text";` in the alphabetical ui block)

**Interfaces:**

- Produces: `Text` — props `{ as?: "p" | "span"; size?: "xs" | "sm" | "base" | "lg"; tone?: "default" | "muted" | "destructive" | "info" | "success" | "warning"; weight?: "normal" | "medium" | "semibold" } & React.HTMLAttributes<HTMLElement>`. Defaults: `as="p"`, `size="sm"`, `tone="default"`, `weight="normal"`. (`size` defaults to `"sm"` because dense `text-sm` body copy is the dominant style in FiestaBoard, mirroring how `Stack` defaults `gap="2"`.) Also exports `textVariants`.

- [ ] **Step 1: Write the story (the executable spec)**

```tsx
// src/components/ui/text.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Stack } from "./stack";
import { Text } from "./text";

const meta = {
  title: "UI/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["p", "span"],
      description: "Rendered element (block paragraph or inline span)",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "base", "lg"],
      description: "Font size step",
    },
    tone: {
      control: "select",
      options: ["default", "muted", "destructive", "info", "success", "warning"],
      description: "Text color from the status token set",
    },
    weight: {
      control: "select",
      options: ["normal", "medium", "semibold"],
      description: "Font weight",
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Body copy rendered as a paragraph at the app's default text-sm.",
  },
};

export const Tones: Story = {
  render: () => (
    <Stack gap="1">
      <Text>default — primary body copy</Text>
      <Text tone="muted">muted — secondary description text</Text>
      <Text tone="destructive">destructive — error message</Text>
      <Text tone="info">info — informational note</Text>
      <Text tone="success">success — confirmation</Text>
      <Text tone="warning">warning — caution</Text>
    </Stack>
  ),
};

export const InlineSpan: Story = {
  render: () => (
    <Text size="base">
      Sentence with an{" "}
      <Text as="span" weight="semibold">
        inline emphasized
      </Text>{" "}
      fragment.
    </Text>
  ),
};
```

- [ ] **Step 2: Verify it fails**

Run: `npm run typecheck`
Expected: FAIL — `Cannot find module './text'` (component doesn't exist yet).

- [ ] **Step 3: Implement `Text`**

```tsx
// src/components/ui/text.tsx
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      info: "text-info",
      success: "text-success",
      warning: "text-warning",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    },
  },
  defaultVariants: {
    size: "sm",
    tone: "default",
    weight: "normal",
  },
});

interface TextProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof textVariants> {
  /** Rendered element. `p` (default) for block copy, `span` for inline fragments. */
  as?: "p" | "span";
}

/**
 * Body text primitive — the design-system replacement for raw `<p>`/`<span>`.
 *
 * `size` defaults to `"sm"`, the dominant body size in FiestaBoard's dense
 * UI (the same reasoning as `Stack`'s `gap="2"` default). `tone` draws from
 * the status token set so message coloring stays on-token.
 */
function Text({ as = "p", className, size, tone, weight, ...props }: TextProps) {
  const Component = as;
  return <Component data-slot="text" className={cn(textVariants({ size, tone, weight }), className)} {...props} />;
}

export { Text, textVariants };
```

- [ ] **Step 4: Export from the barrel**

In `src/index.ts`, add alphabetically among the ui exports (after `switch`, before `textarea`):

```ts
export * from "./components/ui/text";
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run format:check && npm run build`
Expected: all PASS (run `npm run format` first if format:check complains).

- [ ] **Step 6: Storybook + VRT baseline**

Run: `npm run build-storybook && npm run vrt:update && npm run vrt`
Expected: new `UI/Text` baselines written, compare passes.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/text.tsx src/components/ui/text.stories.tsx src/index.ts vrt/
git commit -m "feat: Text primitive (p/span with size/tone/weight variants)"
```

---

### Task 2: `Heading`

**Files:**

- Create: `src/components/ui/heading.tsx`
- Create: `src/components/ui/heading.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/heading";` after `grid`, before `input`)

**Interfaces:**

- Produces: `Heading` — props `{ level?: 2 | 3 | 4; size?: "sm" | "base" | "lg" | "xl" } & React.HTMLAttributes<HTMLHeadingElement>`. Defaults `level={2}`, `size="base"`. Semantic level and visual size are decoupled. `h1` is intentionally NOT supported — page titles are `PageHeader`'s job. Also exports `headingVariants`.

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/heading.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./heading";
import { Stack } from "./stack";

const meta = {
  title: "UI/Heading",
  component: Heading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: "select",
      options: [2, 3, 4],
      description: "Semantic heading element (h2–h4); h1 belongs to PageHeader",
    },
    size: {
      control: "select",
      options: ["sm", "base", "lg", "xl"],
      description: "Visual size, decoupled from the semantic level",
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Section heading",
  },
};

export const Levels: Story = {
  render: () => (
    <Stack gap="3">
      <Heading level={2} size="xl">
        h2 rendered at size xl
      </Heading>
      <Heading level={3} size="lg">
        h3 rendered at size lg
      </Heading>
      <Heading level={3}>h3 at the default base size</Heading>
      <Heading level={4} size="sm">
        h4 rendered at size sm
      </Heading>
    </Stack>
  ),
};
```

- [ ] **Step 2: Verify it fails**

Run: `npm run typecheck`
Expected: FAIL — `Cannot find module './heading'`.

- [ ] **Step 3: Implement `Heading`**

```tsx
// src/components/ui/heading.tsx
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const headingVariants = cva("font-semibold leading-none tracking-tight text-foreground", {
  variants: {
    size: {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
  },
  defaultVariants: {
    size: "base",
  },
});

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  /** Semantic heading element. h1 is reserved for PageHeader. */
  level?: 2 | 3 | 4;
}

/**
 * Section heading primitive for h2–h4, carrying the unified title
 * typography (semibold + tight leading/tracking). Semantic `level` and
 * visual `size` are independent so document outline never fights layout.
 */
function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Component = `h${level}` as "h2" | "h3" | "h4";
  return <Component data-slot="heading" className={cn(headingVariants({ size }), className)} {...props} />;
}

export { Heading, headingVariants };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/heading";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/heading.tsx src/components/ui/heading.stories.tsx src/index.ts vrt/
git commit -m "feat: Heading primitive (h2-h4, size decoupled from level)"
```

---

### Task 3: `Code`

**Files:**

- Create: `src/components/ui/code.tsx`
- Create: `src/components/ui/code.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/code";` after `checkbox`, before `collapsible`)

**Interfaces:**

- Produces: `Code` — inline code chip, props `React.ComponentProps<"code">`, no variants.

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/code.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Code } from "./code";
import { Text } from "./text";

const meta = {
  title: "UI/Code",
  component: Code,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "npm run vrt:update",
  },
};

export const InSentence: Story = {
  render: () => (
    <Text size="base">
      Set <Code>{"{{weather.temp}}"}</Code> in the template, then save.
    </Text>
  ),
};
```

- [ ] **Step 2: Verify it fails** — `npm run typecheck` → FAIL (`Cannot find module './code'`)

- [ ] **Step 3: Implement `Code`**

```tsx
// src/components/ui/code.tsx
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Inline code chip — the replacement for raw `<code>` with ad-hoc
 * bg/rounded/font-mono classes. Block-level snippets keep raw `<pre>`
 * (allowlisted downstream).
 */
function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground", className)}
      {...props}
    />
  );
}

export { Code };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/code";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/code.tsx src/components/ui/code.stories.tsx src/index.ts vrt/
git commit -m "feat: Code primitive (inline code chip)"
```

---

### Task 4: `TextLink`

**Files:**

- Create: `src/components/ui/text-link.tsx`
- Create: `src/components/ui/text-link.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/text-link";` after `text`, before `textarea`)

**Interfaces:**

- Produces: `TextLink` — styled anchor, props `React.ComponentProps<"a">`. Consumers pass `href`/`target` as usual; router-integrated links downstream can wrap it or pass the router link via `render`-less composition (`TextLink` stays a plain `<a>`; FiestaBoard's react-router `<Link>` usages are out of scope for this primitive and keep using `Link` with `className`).

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/text-link.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "./text";
import { TextLink } from "./text-link";

const meta = {
  title: "UI/TextLink",
  component: TextLink,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Read the setup guide",
    href: "https://example.com",
  },
};

export const InSentence: Story = {
  render: () => (
    <Text size="base">
      Get an API key from the <TextLink href="https://example.com">provider dashboard</TextLink> first.
    </Text>
  ),
};
```

- [ ] **Step 2: Verify it fails** — `npm run typecheck` → FAIL (`Cannot find module './text-link'`)

- [ ] **Step 3: Implement `TextLink`**

```tsx
// src/components/ui/text-link.tsx
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Inline text anchor with the canonical link treatment and the unified
 * 3px soft focus ring. For router navigation, keep using the router's
 * `Link` component; this primitive is for plain anchors.
 */
function TextLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="text-link"
      className={cn(
        "rounded-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export { TextLink };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/text-link";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/text-link.tsx src/components/ui/text-link.stories.tsx src/index.ts vrt/
git commit -m "feat: TextLink primitive (canonical anchor + focus ring)"
```

---

### Task 5: `List` / `ListItem`

**Files:**

- Create: `src/components/ui/list.tsx`
- Create: `src/components/ui/list.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/list";` after `label`, before `scroll-area`)

**Interfaces:**

- Produces: `List` — props `{ as?: "ul" | "ol"; marker?: "none" | "disc" | "decimal"; gap?: "0" | "1" | "2" | "3" | "4" } & React.HTMLAttributes<HTMLUListElement | HTMLOListElement>`, defaults `as="ul"`, `marker="none"`, `gap="1"`. `ListItem` — props `React.ComponentProps<"li">`, unstyled pass-through. Also exports `listVariants`.

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/list.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { List, ListItem } from "./list";

const meta = {
  title: "UI/List",
  component: List,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["ul", "ol"],
      description: "Rendered list element",
    },
    marker: {
      control: "select",
      options: ["none", "disc", "decimal"],
      description: "List marker style (none is the app default)",
    },
    gap: {
      control: "select",
      options: ["0", "1", "2", "3", "4"],
      description: "Vertical gap between items (space-y-*)",
    },
  },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <List>
      <ListItem>First unmarked item</ListItem>
      <ListItem>Second unmarked item</ListItem>
      <ListItem>Third unmarked item</ListItem>
    </List>
  ),
};

export const Markers: Story = {
  render: () => (
    <List as="ol" marker="decimal" gap="2">
      <ListItem>Enable the plugin</ListItem>
      <ListItem>Paste the API key</ListItem>
      <ListItem>Save and view the board</ListItem>
    </List>
  ),
};
```

- [ ] **Step 2: Verify it fails** — `npm run typecheck` → FAIL (`Cannot find module './list'`)

- [ ] **Step 3: Implement `List` / `ListItem`**

```tsx
// src/components/ui/list.tsx
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const listVariants = cva("", {
  variants: {
    marker: {
      none: "list-none",
      disc: "list-disc pl-5",
      decimal: "list-decimal pl-5",
    },
    gap: {
      "0": "space-y-0",
      "1": "space-y-1",
      "2": "space-y-2",
      "3": "space-y-3",
      "4": "space-y-4",
    },
  },
  defaultVariants: {
    marker: "none",
    gap: "1",
  },
});

interface ListProps
  extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement>, VariantProps<typeof listVariants> {
  /** Rendered element: unordered (default) or ordered. */
  as?: "ul" | "ol";
}

/** Semantic list container — replaces raw `<ul>`/`<ol>` + space-y wrappers. */
function List({ as = "ul", className, marker, gap, ...props }: ListProps) {
  const Component = as;
  return <Component data-slot="list" className={cn(listVariants({ marker, gap }), className)} {...props} />;
}

/** Semantic list item — unstyled; compose Flex/Text inside as needed. */
function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="list-item" className={className} {...props} />;
}

export { List, ListItem, listVariants };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/list";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/list.tsx src/components/ui/list.stories.tsx src/index.ts vrt/
git commit -m "feat: List/ListItem primitives (ul/ol with marker and gap variants)"
```

---

### Task 6: `Table` set

**Files:**

- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/table.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/table";` after `switch`, before `text`)

**Interfaces:**

- Produces: `Table` (wraps itself in an `overflow-x-auto` container div), `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` — each `React.ComponentProps<"table"|"thead"|"tbody"|"tr"|"th"|"td">` respectively, no variants.

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/table.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plugin</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Weather</TableCell>
          <TableCell>Enabled</TableCell>
          <TableCell>2.1.0</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Muni</TableCell>
          <TableCell>Disabled</TableCell>
          <TableCell>1.4.2</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
```

- [ ] **Step 2: Verify it fails** — `npm run typecheck` → FAIL (`Cannot find module './table'`)

- [ ] **Step 3: Implement the `Table` set**

```tsx
// src/components/ui/table.tsx
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Data table set — the house style for the handful of real tables
 * (settings, debug). `Table` provides its own horizontal-scroll container
 * so wide tables never overflow the page.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b transition-colors duration-150 hover:bg-muted/50", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("h-9 px-2 text-left align-middle font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("p-2 align-middle", className)} {...props} />;
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/table";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/table.tsx src/components/ui/table.stories.tsx src/index.ts vrt/
git commit -m "feat: Table primitives (house data-table style with scroll container)"
```

---

### Task 7: `Box`

**Files:**

- Create: `src/components/ui/box.tsx`
- Create: `src/components/ui/box.stories.tsx`
- Modify: `src/index.ts` (add `export * from "./components/ui/box";` after `badge`, before `button`)

**Interfaces:**

- Produces: `Box` — props `{ as?: "div" | "section" | "main" | "nav" | "header" | "footer" | "form" | "aside" } & React.HTMLAttributes<HTMLElement>`, default `as="div"`. Deliberately unstyled: `className` passes through untouched. This is the typed escape hatch that keeps "zero raw HTML" honest downstream.

- [ ] **Step 1: Write the story**

```tsx
// src/components/ui/box.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { Box } from "./box";
import { Text } from "./text";

const meta = {
  title: "UI/Box",
  component: Box,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["div", "section", "main", "nav", "header", "footer", "form", "aside"],
      description: "Rendered element — semantic choice only, Box adds no styling",
    },
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box className="relative h-24 w-48 rounded-md border">
      <Box className="absolute right-2 top-2 size-3 rounded-full bg-success" />
      <Text tone="muted" className="p-2">
        Positioned overlay host — the kind of custom layout Box exists for.
      </Text>
    </Box>
  ),
};
```

- [ ] **Step 2: Verify it fails** — `npm run typecheck` → FAIL (`Cannot find module './box'`)

- [ ] **Step 3: Implement `Box`**

```tsx
// src/components/ui/box.tsx
import * as React from "react";

import { cn } from "../../lib/utils";

interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  /** Rendered element — a semantic choice only; Box never styles itself. */
  as?: "div" | "section" | "main" | "nav" | "header" | "footer" | "form" | "aside";
}

/**
 * The typed escape hatch. When no styled primitive fits (positioned
 * overlays, portal hosts, canvas wrappers), use Box instead of raw HTML —
 * it keeps the no-raw-elements lint rule honest without styling opinions.
 * If a Box pattern recurs across the app, promote it to a real primitive.
 */
function Box({ as = "div", className, ...props }: BoxProps) {
  const Component = as;
  return <Component data-slot="box" className={cn(className)} {...props} />;
}

export { Box };
```

- [ ] **Step 4: Export from the barrel** — `src/index.ts`: `export * from "./components/ui/box";`

- [ ] **Step 5: Verify** — `npm run typecheck && npm run lint && npm run format:check && npm run build` → PASS

- [ ] **Step 6: Storybook + VRT** — `npm run build-storybook && npm run vrt:update && npm run vrt` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/box.tsx src/components/ui/box.stories.tsx src/index.ts vrt/
git commit -m "feat: Box primitive (typed unstyled escape hatch)"
```

---

### Task 8: PR, release, downstream delivery

**Files:**

- None new — process task.

**Interfaces:**

- Consumes: Tasks 1–7 merged to `main`.
- Produces: a published `@fiestaboard/ui` **minor** release; the Downstream Upgrade workflow re-points FiestaBoard PR `Fiestaboard/FiestaBoard#1471` at it automatically.

- [ ] **Step 1: Push the branch and open the PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: Text/Heading/Code/TextLink/List/Table/Box primitives" \
  --body "Adds the seven primitives from FiestaBoard's zero-raw-HTML spec (docs/superpowers/specs/2026-08-02-fiestaui-primitives-adoption-design.md in the FiestaBoard repo). Stories + VRT baselines included. No breaking changes — additive exports only."
```

- [ ] **Step 2: Wait for CI green, then merge** (squash, matching repo history).

- [ ] **Step 3: Cut the minor release**

Run: `gh workflow run release.yml -f bump=minor` (or Actions → Release → Run workflow → bump: minor).
Expected: Release workflow publishes vX.Y+1.0 to GitHub Packages, lands the version PR via auto-merge, and its `downstream-upgrade` job updates FiestaBoard's `fiestaui-upgrade` PR.

- [ ] **Step 4: Verify downstream**

Run: `gh pr view 1471 --repo Fiestaboard/FiestaBoard --json title,labels`
Expected: title shows the new minor; after FiestaBoard CI completes, label `upgrade-green`. Known issue: the loop's baseline check sometimes false-positives on main's full-suite vitest flakes and labels `upgrade-blocked` — if FiestaBoard CI on the PR is actually green, remove the label manually and proceed.

---

## Self-Review Notes

- Spec coverage: all seven primitives from the spec table have a task; release + downstream delivery is Task 8. ✓
- Export-barrel positions are stated per task and alphabetical within the existing ui block. ✓
- Type consistency: `Text` tone set matches Alert's status tokens; `Heading` level type `2 | 3 | 4` matches the `"h2" | "h3" | "h4"` cast; story imports match produced names. ✓
- The spec's `TextLink` scope is narrowed explicitly: router `<Link>`s are out of scope (kept as-is downstream) — recorded in Task 4's Interfaces block and mirrored in the migration plan's recipe.
