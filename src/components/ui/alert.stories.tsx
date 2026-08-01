import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

const meta = {
  title: "UI/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "info", "success", "warning"],
      description: "Visual style variant",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the alert container",
    },
    children: {
      control: false,
      description: "Alert content — typically an icon, AlertTitle, and AlertDescription",
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "default",
    className: "w-[450px]",
    children: (
      <>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
      </>
    ),
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    className: "w-[450px]",
    children: (
      <>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
      </>
    ),
  },
};

export const InfoVariant: Story = {
  args: {
    variant: "info",
    className: "w-[450px]",
    children: (
      <>
        <Info className="h-4 w-4" />
        <AlertTitle>Scheduled update</AlertTitle>
        <AlertDescription>The board restarts tonight at 02:00 for a firmware update.</AlertDescription>
      </>
    ),
  },
};

export const SuccessVariant: Story = {
  args: {
    variant: "success",
    className: "w-[450px]",
    children: (
      <>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Connected</AlertTitle>
        <AlertDescription>Your board is online and synced.</AlertDescription>
      </>
    ),
  },
};

export const WarningVariant: Story = {
  args: {
    variant: "warning",
    className: "w-[450px]",
    children: (
      <>
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Weak signal</AlertTitle>
        <AlertDescription>The board's Wi-Fi signal is weak; updates may lag.</AlertDescription>
      </>
    ),
  },
};

export const WithIcon: Story = {
  args: {
    variant: "default",
    className: "w-[450px]",
    children: (
      <>
        <Info className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>This is an informational alert with an icon.</AlertDescription>
      </>
    ),
  },
};

export const TitleOnly: Story = {
  args: {
    variant: "default",
    className: "w-[450px]",
    children: (
      <>
        <Info className="h-4 w-4" />
        <AlertTitle>Scheduled maintenance tonight at 11 PM.</AlertTitle>
      </>
    ),
  },
};

export const Success = () => (
  <Alert className="w-[450px]">
    <CheckCircle2 className="h-4 w-4" />
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>Your changes have been saved successfully.</AlertDescription>
  </Alert>
);

export const Warning = () => (
  <Alert className="w-[450px]">
    <TriangleAlert className="h-4 w-4" />
    <AlertTitle>Warning</AlertTitle>
    <AlertDescription>Your account is about to reach its usage limit.</AlertDescription>
  </Alert>
);

export const AllVariants = () => (
  <div className="flex flex-col gap-4 w-[450px]">
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Default Alert</AlertTitle>
      <AlertDescription>This is the default variant.</AlertDescription>
    </Alert>
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Destructive Alert</AlertTitle>
      <AlertDescription>This is the destructive variant.</AlertDescription>
    </Alert>
  </div>
);

export const ConnectionLost = () => (
  <Alert variant="destructive" className="w-[450px]">
    <WifiOff className="h-4 w-4" />
    <AlertTitle>Board offline</AlertTitle>
    <AlertDescription>
      <p>The board at 192.0.2.10 has not responded for 5 minutes. Messages will be queued until it reconnects.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="destructive">
          Retry now
        </Button>
        <Button size="sm" variant="outline">
          View diagnostics
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);
