import type { Meta, StoryObj } from "@storybook/react";
import { ExternalLink, Search } from "lucide-react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../overlays/dropdown-menu";
import { Text } from "../typography/text";
import { FiestaLogo } from "./fiesta-logo";
import { ThemeToggle } from "./theme-toggle";
import { TopNav, TopNavActions, TopNavBrand, TopNavItem, TopNavLink, TopNavList, TopNavMenuTrigger } from "./top-nav";

const meta = {
  title: "App/Chrome/TopNav",
  component: TopNav,
  parameters: {
    // The bar is `w-full`. Centered layout makes #storybook-root shrink-to-fit,
    // which would size the bar to its own content and hide exactly the thing
    // the component is for.
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: false,
      description:
        "`TopNavBrand`, a `TopNavList` of `TopNavItem`/`TopNavLink` rows, and a `TopNavActions` trailing group. " +
        "The bar renders no landmark of its own — pass `asChild` with your own `<nav aria-label={…}>` when it " +
        "should be one.",
    },
    asChild: {
      control: "boolean",
      description:
        "Render your element instead of the default `<div>` — this is how the bar becomes a `<nav>` or `<header>` " +
        "landmark, with your localized name and no extra DOM node.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes. Applied last, so `sticky top-0 z-…` at the call site wins.",
    },
  },
} satisfies Meta<typeof TopNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The docs-site navbar this component was requested for, part for part. */
function DocsBar() {
  return (
    <>
      <TopNavBrand href="#home">
        <FiestaLogo size="sm" />
      </TopNavBrand>
      <TopNavList>
        <TopNavItem>
          <TopNavLink href="#docs" active>
            Docs
          </TopNavLink>
        </TopNavItem>
        <TopNavItem>
          <TopNavLink href="#components">Components</TopNavLink>
        </TopNavItem>
        <TopNavItem>
          <TopNavLink href="#blog">Blog</TopNavLink>
        </TopNavItem>
        <TopNavItem>
          {/*
           * The dropdown is the SHIPPED DropdownMenu — the same --popover
           * surface every other menu in the package renders on, replacing the
           * docs site's hand-rolled `.dropdown__menu` rules. The only new part
           * is the trigger, which has to match the links beside it.
           */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TopNavMenuTrigger>5.8.0</TopNavMenuTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem render={<a href="#v5">5.8.0 (current)</a>} />
              <DropdownMenuItem render={<a href="#v4">4.0.0</a>} />
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<a href="#versions">All versions</a>} />
            </DropdownMenuContent>
          </DropdownMenu>
        </TopNavItem>
      </TopNavList>
      <TopNavActions>
        {/* Search is a slot, not a part: the field belongs to whoever owns the
            index (Algolia, on the docs site). */}
        <div className="relative hidden sm:block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input type="search" aria-label="Search docs" placeholder="Search" className="w-44 pl-8" />
        </div>
        <ThemeToggle theme="dark" onToggle={() => {}} label="Toggle theme" />
        {/* Trailing icon links are the shipped Button, `size="icon"` + asChild. */}
        <Button variant="ghost" size="icon" asChild>
          <a href="#github" aria-label="GitHub repository">
            <ExternalLink />
          </a>
        </Button>
      </TopNavActions>
    </>
  );
}

/**
 * Brand, a horizontal link list with the active pill, a `DropdownMenu`, and a
 * trailing group holding search, `ThemeToggle` and an icon link. Every part
 * except the container, the row and the brand already existed.
 */
export const Default: Story = {
  render: (args) => (
    <TopNav {...args}>
      <DocsBar />
    </TopNav>
  ),
};

/**
 * **The landmark is opt-in.** `TopNav` renders a `<div>`, because its primary
 * consumer swizzles Docusaurus's `Navbar/Content` — which already renders
 * inside `<nav aria-label="Main">`, and a nav inside a nav puts two
 * indistinguishable entries in every landmark list. Where the bar IS the
 * landmark, `asChild` makes it one in a line, with the caller's localized name
 * (this package ships no user-facing copy) and no extra DOM node.
 */
export const AsALandmark: Story = {
  render: (args) => (
    <TopNav {...args} asChild>
      <nav aria-label="Main">
        <DocsBar />
      </nav>
    </TopNav>
  ),
};

/**
 * **The bar owns no positioning** — no `fixed`, no `sticky`, no `z-index`, no
 * stacking context — so it can be dropped into a shell someone else positions.
 * Pinning it is a `className` at the call site, and `cn()` puts that last so it
 * wins. The z-index comes from theme.css's documented ladder rather than a
 * literal.
 */
export const Pinned: Story = {
  render: (args) => (
    <div className="h-[420px] overflow-y-auto">
      <TopNav {...args} className="sticky top-0 z-[var(--z-mobile-header)]">
        <DocsBar />
      </TopNav>
      <div className="space-y-4 p-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Text key={i} tone="muted">
            Scroll: the bar stays because the page pinned it, not because the component did.
          </Text>
        ))}
      </div>
    </div>
  ),
};

/**
 * Inside a host shell that already paints its own surface — a `Navbar/Content`
 * swizzle still wrapped in Infima's `.navbar`. `border-0 bg-transparent`
 * un-paints the bar's ground and hairline so the host's chrome is not drawn
 * twice; everything about the rows is unchanged.
 */
export const InsideAHostPaintedShell: Story = {
  render: (args) => (
    <div className="border-b border-border bg-card px-2 shadow-sm">
      <TopNav {...args} className="border-0 bg-transparent">
        <DocsBar />
      </TopNav>
    </div>
  ),
};

/**
 * When the current page lives inside a dropdown, the trigger takes the pill —
 * `active` — but not `aria-current`: it opens a menu, it is not that page. The
 * `aria-current` goes on the menu item pointing at the page.
 *
 * The links here are `asChild`, the shape a router `Link` (Docusaurus's, or
 * FiestaBoard's ViewTransitionLink) plugs into: it keeps prefetch and
 * base-path handling, this keeps the row's look and its ARIA.
 */
export const SectionActiveInAMenu: Story = {
  render: (args) => (
    <TopNav {...args}>
      <TopNavBrand href="#home">
        <FiestaLogo size="sm" />
      </TopNavBrand>
      <TopNavList>
        <TopNavItem>
          <TopNavLink asChild>
            <a href="#docs">Docs</a>
          </TopNavLink>
        </TopNavItem>
        <TopNavItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TopNavMenuTrigger active>Components</TopNavMenuTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                render={
                  <a href="#button" aria-current="page">
                    Button
                  </a>
                }
              />
              <DropdownMenuItem render={<a href="#nav-list">NavList</a>} />
            </DropdownMenuContent>
          </DropdownMenu>
        </TopNavItem>
      </TopNavList>
    </TopNav>
  ),
};

/**
 * A phone-width bar. The row WRAPS rather than scrolling sideways — the same
 * call the rail's mobile header makes — because `overflow-x-auto` would clip
 * `.focus-ring`, which is a box-shadow painted outside the row. A site that
 * wants Docusaurus's hamburger hides the list below its breakpoint
 * (`className="hidden md:flex"`) and puts the links in a `Sheet`; which links
 * matter on a phone is a call-site decision.
 */
export const NarrowAndWrapping: Story = {
  render: (args) => (
    <div className="w-full sm:w-[420px]">
      <TopNav {...args}>
        <DocsBar />
      </TopNav>
    </div>
  ),
};
