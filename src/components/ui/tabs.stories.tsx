import type { Meta, StoryObj } from "@storybook/react";
import { Bell, CreditCard, User } from "lucide-react";

import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "text",
      description: "Value of the tab selected by default (uncontrolled)",
    },
    value: {
      control: false,
      description: "Controlled selected tab value; pair with onValueChange",
    },
    onValueChange: {
      control: false,
      description: "Callback fired when the selected tab changes",
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout and arrow-key navigation direction",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
    children: {
      control: false,
      description: "TabsList (with TabsTrigger items) and TabsContent panels",
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: "account",
    orientation: "horizontal",
    className: "w-full sm:w-[400px]",
    children: (
      <>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p className="text-sm text-muted-foreground">Make changes to your account settings here.</p>
        </TabsContent>
        <TabsContent value="password">
          <p className="text-sm text-muted-foreground">Change your password here.</p>
        </TabsContent>
      </>
    ),
  },
};

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full sm:w-[400px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground pt-2">Your project overview and summary information.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm text-muted-foreground pt-2">View detailed analytics and insights.</p>
      </TabsContent>
      <TabsContent value="reports">
        <p className="text-sm text-muted-foreground pt-2">Download and view your reports.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-full sm:w-[400px]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="other">Other</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground pt-2">This tab is active.</p>
      </TabsContent>
      <TabsContent value="other">
        <p className="text-sm text-muted-foreground pt-2">Another tab content.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-full sm:w-[450px]">
      <TabsList>
        <TabsTrigger value="account">
          <User className="mr-2 h-4 w-4" />
          Account
        </TabsTrigger>
        <TabsTrigger value="billing">
          <CreditCard className="mr-2 h-4 w-4" />
          Billing
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-muted-foreground pt-2">Manage your account details.</p>
      </TabsContent>
      <TabsContent value="billing">
        <p className="text-sm text-muted-foreground pt-2">Review invoices and payment methods.</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm text-muted-foreground pt-2">Choose which alerts you receive.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="profile" orientation="vertical" className="flex w-full sm:w-[480px] items-start gap-6">
      <TabsList className="h-auto flex-col items-stretch">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="display">Display</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-0 flex-1">
        <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
      </TabsContent>
      <TabsContent value="notifications" className="mt-0 flex-1">
        <p className="text-sm text-muted-foreground">Configure how and when you are notified.</p>
      </TabsContent>
      <TabsContent value="display" className="mt-0 flex-1">
        <p className="text-sm text-muted-foreground">Adjust theme and layout preferences.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const AllVariations: Story = {
  render: () => (
    <div className="space-y-8 w-full sm:w-[500px]">
      <div>
        <h3 className="text-sm font-medium mb-3">Two Tabs</h3>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="pt-3">
            Content for tab 1
          </TabsContent>
          <TabsContent value="tab2" className="pt-3">
            Content for tab 2
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Many Tabs</h3>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">One</TabsTrigger>
            <TabsTrigger value="tab2">Two</TabsTrigger>
            <TabsTrigger value="tab3">Three</TabsTrigger>
            <TabsTrigger value="tab4">Four</TabsTrigger>
            <TabsTrigger value="tab5">Five</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="pt-3">
            Tab 1 content
          </TabsContent>
          <TabsContent value="tab2" className="pt-3">
            Tab 2 content
          </TabsContent>
          <TabsContent value="tab3" className="pt-3">
            Tab 3 content
          </TabsContent>
          <TabsContent value="tab4" className="pt-3">
            Tab 4 content
          </TabsContent>
          <TabsContent value="tab5" className="pt-3">
            Tab 5 content
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">With Disabled Tab</h3>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Disabled
            </TabsTrigger>
            <TabsTrigger value="tab3">Available</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="pt-3">
            Active tab content
          </TabsContent>
          <TabsContent value="tab3" className="pt-3">
            Available tab content
          </TabsContent>
        </Tabs>
      </div>
    </div>
  ),
};

export const SettingsTabs: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-full sm:w-[420px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Update your display name and username.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input id="settings-name" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-username">Username</Label>
              <Input id="settings-username" placeholder="@your-username" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password. You will be signed out on other devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-current">Current password</Label>
              <Input id="settings-current" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-new">New password</Label>
              <Input id="settings-new" type="password" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save password</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};
