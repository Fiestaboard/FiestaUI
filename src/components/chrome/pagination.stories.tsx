import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { useState } from "react";

import { Text } from "../typography/text";
import { Pagination, type PaginationLabels } from "./pagination";

/**
 * English copy for the stories only. The component ships no defaults — the
 * consumer owns every user-facing string (Sidebar's `labels` rule).
 */
const LABELS: PaginationLabels = {
  navigation: "Blog pages",
  previous: "Previous page",
  next: "Next page",
  page: (page) => `Page ${page}`,
  ellipsis: "More pages",
};

const meta = {
  title: "App/Chrome/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    page: 1,
    totalPages: 12,
    labels: LABELS,
    // A plain <a> stands in for the router here. Real consumers pass
    // Docusaurus's <Link> or the app's ViewTransitionLink — which is the
    // entire reason this is a prop.
    renderLink: ({ children, ...props }, item) => (
      <a href={`#page-${item.page}`} {...props}>
        {children}
      </a>
    ),
  },
  argTypes: {
    renderLink: { control: false },
    labels: { control: false },
    siblingCount: { control: { type: "number", min: 0, max: 4 } },
    boundaryCount: { control: { type: "number", min: 1, max: 4 } },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Page 1 of 12. Previous is dead furniture — present so the strip keeps its
 * width, `aria-hidden` because it goes nowhere.
 */
export const Default: Story = {};

/** Mid-range: an ellipsis on both sides, and the strip is the same width as page 1. */
export const Middle: Story = {
  args: { page: 6 },
};

/** The far end, where Next is the control that goes dark. */
export const LastPage: Story = {
  args: { page: 12 },
};

/** Short enough to render whole — no ellipsis, because nothing is elided. */
export const NoTruncation: Story = {
  args: { page: 3, totalPages: 5 },
};

/**
 * A one-page list renders nothing at all: an empty named `<nav>` in the
 * landmark list is worse than no pager.
 */
export const SinglePage: Story = {
  args: { totalPages: 1 },
  render: (args) => (
    <div className="flex flex-col items-center gap-2">
      <Pagination {...args} />
      <Text size="sm" tone="muted">
        (nothing rendered — totalPages is 1)
      </Text>
    </div>
  ),
};

/**
 * `siblingCount` and `boundaryCount` set how wide the window is. Both are
 * constant per page, so widening them widens the strip once rather than
 * making it breathe as the reader walks.
 */
export const WiderWindow: Story = {
  args: { page: 24, totalPages: 48, siblingCount: 2, boundaryCount: 2 },
};

/** Long numbers: page targets grow with the numeral instead of clipping it. */
export const ManyPages: Story = {
  args: { page: 137, totalPages: 250 },
};

/**
 * Wired up. `renderLink` returns a button-shaped anchor whose click is
 * intercepted, which is what a router Link does under the hood — the
 * component never owns the page state.
 */
export const Interactive: Story = {
  render: (args) => <InteractivePager {...args} />,
};

function InteractivePager(args: React.ComponentProps<typeof Pagination>) {
  const [page, setPage] = useState(4);
  return (
    <Pagination
      {...args}
      page={page}
      renderLink={({ children, ...props }, item) => (
        <a
          href={`#page-${item.page}`}
          {...props}
          onClick={(event) => {
            event.preventDefault();
            setPage(item.page);
          }}
        >
          {children}
        </a>
      )}
    />
  );
}
