import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle2, ChevronLeft, ChevronRight, Cloud, Send } from "lucide-react";
import { useState } from "react";

import { FiestaIcon } from "../chrome/fiesta-icon";
import { FiestaLogo } from "../chrome/fiesta-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../containment/card";
import { Alert, AlertDescription, AlertTitle } from "../feedback/alert";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import { Switch } from "../forms/switch";
import { WizardShell } from "./wizard-shell";

const meta = {
  title: "App/Wizard/WizardShell",
  component: WizardShell,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WizardShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const STEPS = ["Connect", "Customize", "Finish"];

/**
 * The phrase pool the backdrop packs its rows from — real board lines, the kind
 * this product actually displays. More phrases than fit on purpose: the variety
 * across the field comes from the size of this pool, not from the row count.
 */
const BACKDROP_PHRASES = [
  "WELCOME",
  "GOOD MORNING",
  "72 AND CLEAR",
  "N JUDAH 4 MIN",
  "AAPL +1.88%",
  "SUNSET 8 04",
  "AQI 21 GOOD",
  "TIDE LOW 6 12",
  "ISS OVERHEAD",
  "WAXING GIBBOUS",
  "BART 12 MIN",
  "HAPPY BIRTHDAY",
  "GAME DAY 7 PM",
  "SURF 3 FT",
  "LAUNCH 04 20",
  "COFFEE",
  "WFH TODAY",
  "SF 61 NY 48",
  "RAIN AT NOON",
  "STARDATE 4523",
  "TACO TUESDAY",
  "MARKET OPEN",
  "UV INDEX 7",
  "TRASH NIGHT",
];

const SHELL = {
  icon: <FiestaIcon className="size-8 sm:size-10" />,
  wordmark: <FiestaLogo />,
  // The lockup already says FiestaBoard, so the heading says what happens next
  // instead of repeating the name two lines apart.
  title: "Let's set up your board",
  description: "Three steps, about two minutes, and your board is showing something.",
  steps: STEPS,
  progressLabel: "Setup progress",
  backdropPhrases: BACKDROP_PHRASES,
};

/** Footer matching the real wizard's controls, so the story is honest about density. */
function Footer({
  current,
  total,
  onBack,
  onNext,
  canProceed = true,
}: {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  canProceed?: boolean;
}) {
  return (
    <>
      <div>
        {current > 1 && (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          Step {current} of {total}
        </span>
        {current === 1 && (
          <Button variant="ghost" size="lg">
            Skip for now
          </Button>
        )}
        {current < total && (
          <Button size="lg" onClick={onNext} disabled={!canProceed}>
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </>
  );
}

function StepConnect() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="wizard-key">Vestaboard API key</Label>
        <Input id="wizard-key" placeholder="Paste the key from your Vestaboard account" />
        <p className="text-muted-foreground text-xs">
          Read/Write key, found under Settings → API in the Vestaboard app.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-host">Local host (optional)</Label>
        <Input id="wizard-host" placeholder="vestaboard.local" />
      </div>
      <Alert variant="success">
        <CheckCircle2 className="size-4" />
        <AlertTitle>Connected</AlertTitle>
        <AlertDescription>Found a Flagship board on your network.</AlertDescription>
      </Alert>
    </div>
  );
}

function StepCustomize() {
  const rows = [
    { name: "Date & Time", desc: "The current time, in your timezone.", on: true },
    { name: "Weather", desc: "Conditions and today's high and low.", on: true },
    { name: "Transit", desc: "Next departures from your stop.", on: false },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.name}>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud className="size-4" />
                {r.name}
              </CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </div>
            <Switch defaultChecked={r.on} aria-label={r.name} />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function StepFinish() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Flagship</Badge>
        <Badge variant="secondary">3 plugins</Badge>
        <Badge variant="brand">Ready</Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Everything is configured. Send a welcome message to make sure the board is listening.
      </p>
      <Button size="lg" className="w-full">
        <Send className="mr-2 size-4" />
        Send welcome message
      </Button>
    </div>
  );
}

const STEP_COPY = [
  { title: "Connect your board", description: "Enter your credentials so FiestaBoard can reach the display." },
  { title: "Add data sources", description: "Pick what your board should show. You can change these later." },
  { title: "You're all set", description: "Send a test message and you're done." },
];

/** Walkable: click Next/Back to move through all three steps. */
export const Default: Story = {
  args: { ...SHELL, current: 1, stepTitle: "", children: null },
  render: function Render() {
    const [step, setStep] = useState(1);
    const copy = STEP_COPY[step - 1];
    return (
      <WizardShell
        {...SHELL}
        current={step}
        stepTitle={copy.title}
        stepDescription={copy.description}
        footer={
          <Footer
            current={step}
            total={STEPS.length}
            onBack={() => setStep((s) => Math.max(1, s - 1))}
            onNext={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          />
        }
      >
        {step === 1 && <StepConnect />}
        {step === 2 && <StepCustomize />}
        {step === 3 && <StepFinish />}
      </WizardShell>
    );
  },
};

/** No backdrop — the plain shell, for a wizard that is not a first run. */
export const NoBackdrop: Story = {
  args: {
    ...SHELL,
    backdropPhrases: undefined,
    current: 1,
    stepTitle: STEP_COPY[0].title,
    stepDescription: STEP_COPY[0].description,
    children: <StepConnect />,
    footer: <Footer current={1} total={3} onBack={() => {}} onNext={() => {}} />,
  },
};

/** Step 1 held still, for visual review and VRT. */
export const Connect: Story = {
  args: {
    ...SHELL,
    current: 1,
    stepTitle: STEP_COPY[0].title,
    stepDescription: STEP_COPY[0].description,
    children: <StepConnect />,
    footer: <Footer current={1} total={3} onBack={() => {}} onNext={() => {}} />,
  },
};

export const Customize: Story = {
  args: {
    ...SHELL,
    current: 2,
    stepTitle: STEP_COPY[1].title,
    stepDescription: STEP_COPY[1].description,
    children: <StepCustomize />,
    footer: <Footer current={2} total={3} onBack={() => {}} onNext={() => {}} />,
  },
};

export const Finish: Story = {
  args: {
    ...SHELL,
    current: 3,
    stepTitle: STEP_COPY[2].title,
    stepDescription: STEP_COPY[2].description,
    children: <StepFinish />,
    footer: <Footer current={3} total={3} onBack={() => {}} onNext={() => {}} />,
  },
};
