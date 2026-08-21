import type { Meta, StoryObj } from "@storybook/react";
import { Home, Slash } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

const meta = {
  title: "App/Chrome/Breadcrumb",
  component: Breadcrumb,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    "aria-label": {
      control: "text",
      description:
        "Localized accessible name for the nav landmark — required, because the repo ships no English default. " +
        'The English convention is "Breadcrumb".',
    },
    className: {
      control: "text",
      description: "Additional CSS classes on the nav element",
    },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every story demo shares this width so the trail wraps the way it will on a
// docs page: full-bleed on a phone, a content column above the sm breakpoint.
const DEMO_WIDTH = "w-full sm:w-[480px]";

/**
 * The canonical trail: links back up the hierarchy, then the current page as
 * plain `aria-current="page"` text — where you are is not a destination, so it
 * takes no tab stop.
 */
export const Default: Story = {
  args: { "aria-label": "Breadcrumb" },
  render: (args) => (
    <Breadcrumb {...args} className={DEMO_WIDTH}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#plugins">Plugins</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Weather</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

/**
 * A deep trail left to wrap. The list is `flex-wrap` + `break-words` on
 * purpose: at 390px a six-level docs path folds onto a second line instead of
 * forcing horizontal scroll, and separators travel with the crumb that
 * follows them.
 */
export const LongPath: Story = {
  args: { "aria-label": "Breadcrumb" },
  render: (args) => (
    <Breadcrumb {...args} className={DEMO_WIDTH}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#guides">Guides</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#integrations">Integrations</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#plugins">Plugins</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#weather">Weather</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Configuration reference</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

/**
 * The collapsed middle. `BreadcrumbEllipsis` is static — it marks that levels
 * were elided and says so to screen readers via its required sr-only `label`;
 * an expandable version is the consumer's composition (wrap it in a
 * DropdownMenu trigger), not a baked-in behaviour.
 */
export const WithEllipsis: Story = {
  args: { "aria-label": "Breadcrumb" },
  render: (args) => (
    <Breadcrumb {...args} className={DEMO_WIDTH}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis label="More pages" />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#plugins">Plugins</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Weather</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

/**
 * Separator children override the chevron — a slash here. It stays inside the
 * `aria-hidden` li either way, so the glyph choice is purely visual and never
 * reaches a screen reader.
 */
export const CustomSeparator: Story = {
  args: { "aria-label": "Breadcrumb" },
  render: (args) => (
    <Breadcrumb {...args} className={DEMO_WIDTH}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <Slash className="size-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#plugins">Plugins</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <Slash className="size-3" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Weather</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

/**
 * The docs-site shape this component exists for (#228 item 4): a home icon in
 * the first slot, `asChild` handing the anchor to the router's Link. The
 * plain function here stands in for Docusaurus's `<Link>` — the crumb keeps
 * the DS look, the router keeps navigation.
 */
export const DocsSite: Story = {
  args: { "aria-label": "Breadcrumb" },
  render: (args) => {
    // Stand-in for a router Link (Docusaurus, react-router, …).
    const RouterLink = ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>;
    return (
      <Breadcrumb {...args} className={DEMO_WIDTH}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <RouterLink href="#home" aria-label="Home page">
                <Home className="size-4" />
              </RouterLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <RouterLink href="#plugins">Plugins</RouterLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Weather</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  },
};
