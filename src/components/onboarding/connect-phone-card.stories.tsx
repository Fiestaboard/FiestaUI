import type { Meta, StoryObj } from "@storybook/react";
import { Info, RotateCw } from "lucide-react";

import { PairingQrStandIn } from "../../stories/pairing-qr-stand-in";
import { Alert, AlertDescription, AlertTitle } from "../feedback/alert";
import { Button } from "../forms/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../forms/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../overlays/dialog";
import { ConnectPhoneCard } from "./connect-phone-card";

/* Copy is 07e's (`323:14595`). The component ships none but the hub-line default. */
const STEPS = [
  { text: "Open the FiestaBoard app on your phone." },
  { text: "Tap Connect a hub, then Scan QR code." },
  { text: "Point the camera at this code and tap Connect to Maya’s FiestaPi." },
];
const FOOTNOTE =
  "Anyone who scans this in the next few minutes can control your displays. Only show it to a phone you own.";

const meta = {
  title: "App/Onboarding/ConnectPhoneCard",
  component: ConnectPhoneCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    qr: <PairingQrStandIn />,
    qrLabel: "Pairing code for fiestapi.local",
    hubAddress: "fiestapi.local",
    expiresLabel: "Expires in 4:12 · works once",
    timeLeft: 0.84,
    steps: STEPS,
    footnote: FOOTNOTE,
  },
  decorators: [
    (Story) => (
      // 510 = the 07e dialog's content width.
      <div className="w-full max-w-[510px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConnectPhoneCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07e `323:16724`: the live code beside the phone steps. Stacks below `sm` (07e `324:21027`). */
export const Live: Story = {};

/**
 * 07e `323:18641`: opened at localhost, so the code is built from the hub's
 * network name, an inline warning says so, and the steps give way to the
 * address picker (localhost is never offered).
 */
export const OnLocalhost: Story = {
  args: {
    hubLabel: "Connects to fiestapi.local (not localhost)",
    footnote: undefined,
    notice: (
      <Alert variant="warning">
        <Info />
        <AlertTitle>Use the address of your hub, not localhost</AlertTitle>
        <AlertDescription>
          You opened FiestaBoard at localhost:4420, which only works on the hub itself. Your phone can’t reach it, so
          this code uses fiestapi.local (192.168.1.50) instead.
        </AlertDescription>
      </Alert>
    ),
    aside: (
      <div className="flex w-full flex-col gap-2.5 sm:w-[230px]">
        <label htmlFor="pair-address" className="text-sm font-medium">
          Address in this code
        </label>
        <Select defaultValue="fiestapi.local">
          <SelectTrigger id="pair-address">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fiestapi.local">fiestapi.local</SelectItem>
            <SelectItem value="192.168.1.50">192.168.1.50</SelectItem>
            <SelectItem value="fiestapi.example.net">fiestapi.example.net</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Other choices: 192.168.1.50, fiestapi.example.net. localhost is never offered.
        </p>
      </div>
    ),
  },
};

/** 07e `323:22216`: the code is spent; the QR is a dimmed placeholder and nothing was connected. */
export const Expired: Story = {
  args: {
    state: "expired",
    footnote: undefined,
    aside: (
      <div className="flex flex-col gap-2.5 sm:w-[230px]">
        <p className="text-sm font-medium">Nothing was connected.</p>
        <p className="text-xs text-muted-foreground">
          An expired code can’t be scanned or reused, even by a phone that already read it.
        </p>
      </div>
    ),
  },
};

/**
 * H18: a loopback address draws no code at all (and logs an error). The
 * hub line says why ("No code: a phone can’t reach localhost:4420"), the
 * card drops the countdown and bar; the host swaps its steps for what to do
 * instead, since there is nothing to point a camera at.
 */
export const RefusesLoopback: Story = {
  args: {
    hubAddress: "localhost:4420",
    qrLabel: "Pairing code for localhost:4420",
    footnote: undefined,
    steps: [
      { text: "Open FiestaBoard from your hub’s network address, for example fiestapi.local." },
      { text: "Then open Settings › Connect a phone again." },
    ],
  },
};

/** The whole 07e dialog: title and footer are the host's. */
export const InDialog: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <Story />],
  render: (args) => (
    <Dialog defaultOpen>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Connect a phone</DialogTitle>
          <DialogDescription>
            Scan this with the FiestaBoard app. The code works once and expires in 5 minutes.
          </DialogDescription>
        </DialogHeader>
        <ConnectPhoneCard {...args} />
        {/* 07e `323:16724`: left-aligned, ghost "Make a new code" then secondary "Done". */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost">
            <RotateCw />
            Make a new code
          </Button>
          <Button variant="secondary">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
