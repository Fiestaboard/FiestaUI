import type { Meta } from "@storybook/react";
import { AlertCircle, CheckCircle2, Info, Mail, Plus, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../components/feedback/alert";
import { Badge } from "../components/feedback/badge";
import { Button } from "../components/forms/button";
import { Input } from "../components/forms/input";

const meta = {
  title: "Foundations/Variant Matrix",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

export const ButtonMatrix = () => {
  // `brand` is in this list on purpose: it is the one variant whose field is a
  // literal hardware tile, and it was previously absent from a matrix that
  // claims to show every combination — so the most brand-bearing control in
  // the system was the one nobody could review side by side.
  const variants = ["default", "brand", "secondary", "destructive", "outline", "ghost", "link"] as const;
  const sizes = ["sm", "default", "lg"] as const;

  return (
    <div className="p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Button Variant × Size Matrix</h1>
          <p className="text-muted-foreground">All button combinations in one view</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3 bg-muted text-left font-semibold">Variant / Size</th>
                {sizes.map((size) => (
                  <th key={size} className="border p-3 bg-muted text-center font-semibold">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant}>
                  <td className="border p-3 bg-muted/50 font-medium">{variant}</td>
                  {sizes.map((size) => (
                    <td key={size} className="border p-3 text-center">
                      <Button variant={variant} size={size}>
                        Button
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Icon Buttons */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Icon Buttons</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3 bg-muted text-left font-semibold">Variant</th>
                <th className="border p-3 bg-muted text-center font-semibold">icon-sm</th>
                <th className="border p-3 bg-muted text-center font-semibold">icon</th>
                <th className="border p-3 bg-muted text-center font-semibold">icon-lg</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant}>
                  <td className="border p-3 bg-muted/50 font-medium">{variant}</td>
                  <td className="border p-3 text-center">
                    <Button variant={variant} size="icon-sm" aria-label="Add">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="border p-3 text-center">
                    <Button variant={variant} size="icon" aria-label="Add">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="border p-3 text-center">
                    <Button variant={variant} size="icon-lg" aria-label="Add">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* With Icons */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Buttons with Icons</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {variants.map((variant) => (
              <Button key={variant} variant={variant}>
                <Mail className="h-4 w-4 mr-2" />
                {variant}
              </Button>
            ))}
          </div>
        </div>

        {/* Disabled States */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Disabled States</h2>
          <div className="flex flex-wrap gap-3">
            {variants.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                {variant}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BadgeMatrix = () => {
  const variants = ["default", "brand", "secondary", "destructive", "outline"] as const;
  const contexts = [
    { label: "Text only", content: (v: (typeof variants)[number]) => <Badge variant={v}>{v}</Badge> },
    {
      label: "With icon",
      content: (v: (typeof variants)[number]) => (
        <Badge variant={v}>
          <Info className="h-3 w-3 mr-1" />
          {v}
        </Badge>
      ),
    },
    { label: "Count", content: (v: (typeof variants)[number]) => <Badge variant={v}>42</Badge> },
    {
      label: "Status",
      content: (v: (typeof variants)[number]) => (
        <Badge variant={v}>
          <span className="h-2 w-2 rounded-full bg-current mr-1.5" />
          Active
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Badge Variant Matrix</h1>
          <p className="text-muted-foreground">All badge styles and use cases</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3 bg-muted text-left font-semibold">Context</th>
                {variants.map((variant) => (
                  <th key={variant} className="border p-3 bg-muted text-center font-semibold">
                    {variant}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contexts.map((context) => (
                <tr key={context.label}>
                  <td className="border p-3 bg-muted/50 font-medium">{context.label}</td>
                  {variants.map((variant) => (
                    <td key={variant} className="border p-3 text-center">
                      {context.content(variant)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AlertMatrix = () => {
  // These rows used to be labelled Success and Warning while passing
  // `variant: "default"`, so two of the five Alert variants had never been
  // rendered in Storybook at all — which is how a status variant that
  // coloured its own body text survived this long.
  const types = [
    {
      title: "Default Info",
      variant: "default" as const,
      icon: <Info className="h-4 w-4" />,
      message: "This is an informational alert with default styling.",
    },
    {
      title: "Info",
      variant: "info" as const,
      icon: <Info className="h-4 w-4" />,
      message: "A new version is available and ready to install.",
    },
    {
      title: "Success",
      variant: "success" as const,
      icon: <CheckCircle2 className="h-4 w-4" />,
      message: "Operation completed successfully.",
    },
    {
      title: "Warning",
      variant: "warning" as const,
      icon: <TriangleAlert className="h-4 w-4" />,
      message: "Please review this warning message.",
    },
    {
      title: "Error",
      variant: "destructive" as const,
      icon: <AlertCircle className="h-4 w-4" />,
      message: "An error occurred. Please try again.",
    },
  ];

  return (
    <div className="p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Alert Variants</h1>
          <p className="text-muted-foreground">All alert types and contexts</p>
        </div>

        <div className="space-y-4">
          {types.map((type, i) => (
            <Alert key={i} variant={type.variant}>
              {type.icon}
              <AlertTitle>{type.title}</AlertTitle>
              <AlertDescription>{type.message}</AlertDescription>
            </Alert>
          ))}
        </div>

        {/* An alert that asks for something needs a control, and a control
            inside a tinted status container is the composition most likely to
            go wrong: a brand-orange primary sitting on a yellow warning wash
            puts two saturated warm fills 20px apart, and neither wins.
            The rule this story exists to prove: INSIDE A STATUS ALERT, THE
            ACTION IS `outline` OR `ghost`. The alert already establishes the
            urgency; the button only has to be pressable. `destructive` is the
            one exception, and only in the destructive alert, where the action
            genuinely is the dangerous one. */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">With actions</h2>
          <p className="text-sm text-muted-foreground">
            Actions inside a status alert use <code className="font-mono text-xs">outline</code> or{" "}
            <code className="font-mono text-xs">ghost</code>. A filled brand or primary button competes with the
            alert&apos;s own tint instead of sitting inside it.
          </p>
          {types
            .filter((t) => t.variant !== "default")
            .map((type, i) => (
              <Alert key={i} variant={type.variant}>
                {type.icon}
                <AlertTitle>{type.title}</AlertTitle>
                <AlertDescription>{type.message}</AlertDescription>
                <div className="mt-3 flex gap-2">
                  <Button variant={type.variant === "destructive" ? "destructive" : "outline"} size="sm">
                    {type.variant === "destructive" ? "Delete anyway" : "Review"}
                  </Button>
                  <Button variant="ghost" size="sm">
                    Dismiss
                  </Button>
                </div>
              </Alert>
            ))}

          <h3 className="pt-2 text-sm font-semibold text-muted-foreground">For comparison — what not to do</h3>
          <Alert variant="warning">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>A filled brand button on a warm status wash. Two fills, no hierarchy.</AlertDescription>
            <div className="mt-3 flex gap-2">
              <Button variant="brand" size="sm">
                Brand
              </Button>
              <Button size="sm">Primary</Button>
            </div>
          </Alert>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Without Titles</h2>
          {types.map((type, i) => (
            <Alert key={i} variant={type.variant}>
              {type.icon}
              <AlertDescription>{type.message}</AlertDescription>
            </Alert>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Without Icons</h2>
          {types.map((type, i) => (
            <Alert key={i} variant={type.variant}>
              <AlertTitle>{type.title}</AlertTitle>
              <AlertDescription>{type.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InputMatrix = () => {
  const types = ["text", "email", "password", "number", "search", "url", "tel"] as const;
  const states = [
    { label: "Default", props: {} },
    { label: "With Value", props: { defaultValue: "Sample value" } },
    { label: "Disabled", props: { disabled: true } },
    { label: "Disabled + Value", props: { disabled: true, defaultValue: "Disabled value" } },
  ];

  return (
    <div className="p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Input Type × State Matrix</h1>
          <p className="text-muted-foreground">All input types and states</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3 bg-muted text-left font-semibold">Type / State</th>
                {states.map((state) => (
                  <th key={state.label} className="border p-3 bg-muted text-center font-semibold">
                    {state.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type}>
                  <td className="border p-3 bg-muted/50 font-medium">{type}</td>
                  {states.map((state) => (
                    <td key={state.label} className="border p-3">
                      <Input type={type} placeholder={`${type} input`} {...state.props} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
