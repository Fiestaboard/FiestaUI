import type { Meta, StoryObj } from "@storybook/react";
import { Globe, Info, Settings2, ShieldOff, Sparkles } from "lucide-react";

import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import { Switch } from "../forms/switch";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = {
  title: "Containment/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes (e.g. width, border color)",
    },
    children: {
      control: false,
      description: "Card sections — CardHeader, CardContent, CardFooter, etc.",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "w-full sm:w-[350px]",
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content area.</p>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">Card footer</p>
        </CardFooter>
      </>
    ),
  },
};

export const WithForm = () => (
  <Card className="w-full sm:w-[350px]">
    <CardHeader>
      <CardTitle>Create project</CardTitle>
      <CardDescription>Deploy your new project in one-click.</CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Name of your project" />
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline">Cancel</Button>
      <Button>Deploy</Button>
    </CardFooter>
  </Card>
);

export const WithAction = () => (
  <Card className="w-full sm:w-[350px]">
    <CardHeader>
      <CardTitle>Notifications</CardTitle>
      <CardDescription>You have 3 unread messages.</CardDescription>
      <CardAction>
        <Button variant="outline" size="sm">
          View all
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p className="text-sm">Check your inbox for new updates.</p>
    </CardContent>
  </Card>
);

export const Simple = () => (
  <Card className="w-full sm:w-[350px]">
    <CardContent>
      <p>A simple card with only content.</p>
    </CardContent>
  </Card>
);

export const MultipleCards = () => (
  <div className="grid grid-cols-2 gap-4 w-full sm:w-[700px]">
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>Overview of today&apos;s activity</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">12</p>
        <p className="text-sm text-muted-foreground">Tasks completed</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
        <CardDescription>Weekly summary</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">48</p>
        <p className="text-sm text-muted-foreground">Tasks completed</p>
      </CardContent>
    </Card>
  </div>
);

export const IntegrationCard = () => (
  <Card className="w-full sm:w-[380px]">
    <CardHeader>
      <CardTitle>Weather</CardTitle>
      <CardDescription>Current conditions and forecast for your board.</CardDescription>
      <CardAction>
        <Button variant="ghost" size="icon" aria-label="Weather settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="success">connected</Badge>
        <Badge variant="secondary">refreshes every 15 min</Badge>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="weather-enabled">Show on board</Label>
        <Switch id="weather-enabled" defaultChecked />
      </div>
    </CardContent>
    <CardFooter className="flex justify-between border-t">
      <p className="text-sm text-muted-foreground">Last updated 2 min ago</p>
      <Button variant="outline" size="sm">
        Preview
      </Button>
    </CardFooter>
  </Card>
);

export const AllLayouts = () => (
  <div className="space-y-6 max-w-4xl">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Basic Card</CardTitle>
          <CardDescription>Header with title and description</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Simple content area</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>With Footer</CardTitle>
          <CardDescription>Includes footer with actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content with footer below</p>
        </CardContent>
        <CardFooter>
          <Button size="sm" className="w-full">
            Action
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>With Action</CardTitle>
          <CardDescription>Header with inline action button</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Content area</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm">Card with content only (no header)</p>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Highlighted Card</CardTitle>
          <CardDescription>Custom border color</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Primary border styling</p>
        </CardContent>
      </Card>

      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle>Alert Card</CardTitle>
          <CardDescription>Styled for attention</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Custom styling for alerts</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

/**
 * The settings-card header (#274). `size="base"` plus `icon` replaces the
 * `className="flex items-center gap-2 text-base"` + hand-sized glyph that
 * FiestaBoard typed 19 times.
 *
 * The default glyph tone is `text-muted-foreground` — decoration beside a
 * semibold title. The last two cards show the two tones that stay reachable
 * by putting a class on the icon element itself, which is also how a call
 * site overrides the 16px default size.
 */
export const TitleWithIcon = () => (
  <div className="flex w-full max-w-md flex-col gap-4">
    <Card>
      <CardHeader>
        <CardTitle size="base" icon={<Info />}>
          About
        </CardTitle>
        <CardDescription>Default tone — muted, 16px.</CardDescription>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle icon={<Globe />}>Language</CardTitle>
        <CardDescription>The lg scale, which is the untouched default.</CardDescription>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle size="base" icon={<ShieldOff className="text-destructive" />}>
          Disable protection
        </CardTitle>
        <CardDescription>A tone the call site chose, overriding the muted default.</CardDescription>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle size="base" icon={<Sparkles className="size-5 text-brand" />}>
          Animations
        </CardTitle>
        <CardDescription>A 20px glyph — the consumer's `size-5` beats the default.</CardDescription>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle size="base">No icon</CardTitle>
        <CardDescription>Unchanged: no flex row, no wrapper element.</CardDescription>
      </CardHeader>
    </Card>
  </div>
);
