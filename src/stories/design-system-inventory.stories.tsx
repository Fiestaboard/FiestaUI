import type { Meta } from "@storybook/react";
import { AlertCircle, CheckCircle2, Info, Mail, Plus, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import themeCss from "../styles/theme.css?raw";
import type { ColorToken, Rgb } from "./token-registry";
import { buildColorTokenRegistry, contrastRatio, resolveColor, toHex } from "./token-registry";

const meta = {
  title: "Design System/Inventory",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

export const AllComponents = () => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold mb-2">Design System Inventory</h1>
        <p className="text-muted-foreground">
          Complete overview of all UI components and their variants for token testing
        </p>
      </div>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">All Variants</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">All Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Add">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" aria-label="Add">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon-lg" aria-label="Add">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">With Icons</h3>
            <div className="flex flex-wrap gap-3">
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                With Icon
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" size="icon" aria-label="Add">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">States</h3>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button variant="outline" disabled>
                Disabled Outline
              </Button>
              <Button variant="ghost" disabled>
                Disabled Ghost
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alerts</h2>
        <div className="space-y-4 max-w-2xl">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default informational alert.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Alert</AlertTitle>
            <AlertDescription>This is a destructive/error alert.</AlertDescription>
          </Alert>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Operation completed successfully.</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>A simple card with header</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card content goes here</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>With Footer</CardTitle>
              <CardDescription>Card with footer actions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Content section</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Highlighted Card</CardTitle>
              <CardDescription>With custom border</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="default">Featured</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Form Inputs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="space-y-2">
            <Label htmlFor="text">Text Input</Label>
            <Input id="text" type="text" placeholder="Enter text..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Input</Label>
            <Input id="email" type="email" placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password Input</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled">Disabled Input</Label>
            <Input id="disabled" type="text" placeholder="Disabled" disabled />
          </div>
        </div>
      </section>

      {/* Switches */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Switches</h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch id="switch-1" />
            <Label htmlFor="switch-1">Default</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="switch-2" defaultChecked />
            <Label htmlFor="switch-2">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="switch-3" disabled />
            <Label htmlFor="switch-3">Disabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="switch-4" defaultChecked disabled />
            <Label htmlFor="switch-4">Disabled Checked</Label>
          </div>
        </div>
      </section>

      {/* Select */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Select</h2>
        <div className="max-w-xs space-y-2">
          <Label>Choose an option</Label>
          <Select defaultValue="option1">
            <SelectTrigger aria-label="Example option">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tabs</h2>
        <Tabs defaultValue="tab1" className="max-w-2xl">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Content for Tab 1</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab2" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Content for Tab 2</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab3" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Content for Tab 3</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Accordion */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accordion</h2>
        <Accordion type="single" collapsible className="max-w-2xl">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content for the first accordion section</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>Content for the second accordion section</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Section 3</AccordionTrigger>
            <AccordionContent>Content for the third accordion section</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Skeletons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeleton Loaders</h2>
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * ColorTokens — the palette reference (issue #169)
 *
 * The swatch list is NOT written here. It is derived from theme.css by
 * ./token-registry, and the resolved values are read live with
 * getComputedStyle, so the story follows the stylesheet (and the active
 * theme) with no maintenance. scripts/ci/tests/token-registry.test.mjs runs
 * the same derivation in Node and fails if any :root token would go
 * undocumented.
 * ------------------------------------------------------------------ */

const TOKEN_REGISTRY = buildColorTokenRegistry(themeCss);

/**
 * Both the theme (`dark`) and the season are applied as classes on <html> by
 * the Storybook decorator, so re-reading the palette whenever that attribute
 * changes is all the reactivity this story needs.
 */
const subscribeToRootClass = (onChange: () => void) => {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const readRootClass = () => (typeof document === "undefined" ? "" : document.documentElement.className);
const readRootClassOnServer = () => "";

/** A checkerboard frame so a near-black chip on a near-black page still has an edge. */
const CHECKERBOARD = {
  backgroundImage: "conic-gradient(from 90deg, #8f8f8f 0 25%, #cfcfcf 0 50%, #8f8f8f 0 75%, #cfcfcf 0)",
  backgroundSize: "8px 8px",
} as const;

const BLACK: Rgb = { r: 0, g: 0, b: 0 };

type TokenMeasurement = {
  /** Declared value as the browser reports it for the active theme. */
  declared: string;
  /** Effective colour once composited over the page background. */
  hex: string | null;
  ratio: number | null;
};

function measureTokens(tokens: readonly ColorToken[]): Map<string, TokenMeasurement> {
  const measurements = new Map<string, TokenMeasurement>();
  if (typeof document === "undefined") return measurements;

  const rootStyle = getComputedStyle(document.documentElement);
  const declaredValue = (name: string) => rootStyle.getPropertyValue(name).trim();
  const pageBackground = resolveColor(declaredValue("--background")) ?? BLACK;

  for (const token of tokens) {
    const declared = declaredValue(token.name) || token.value;
    const own = resolveColor(declared, pageBackground);
    const paired = declaredValue(token.pairedWith);

    // Contrast is only meaningful between a surface and the text on it, so
    // work out which half of the pair this token is before compositing.
    const surface = token.isForeground ? resolveColor(paired, pageBackground) : own;
    const text = resolveColor(token.isForeground ? declared : paired, surface ?? pageBackground);

    measurements.set(token.name, {
      declared,
      hex: own && toHex(own),
      ratio: surface && text ? contrastRatio(surface, text) : null,
    });
  }
  return measurements;
}

/** Resolves each radius token to the pixel value a corner actually gets. */
function measureRadii(names: readonly string[]): Map<string, string> {
  const measurements = new Map<string, string>();
  if (typeof document === "undefined") return measurements;

  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:-9999px;width:10px;height:10px;visibility:hidden";
  document.body.appendChild(probe);
  for (const name of names) {
    probe.style.borderTopLeftRadius = `var(${name})`;
    const px = Number.parseFloat(getComputedStyle(probe).borderTopLeftRadius);
    measurements.set(
      name,
      !Number.isFinite(px) ? "—" : px >= 9999 ? "∞ (fully rounded)" : `${Math.round(px * 100) / 100}px`,
    );
  }
  probe.remove();
  return measurements;
}

function contrastGrade(ratio: number, basis: ColorToken["contrastBasis"]) {
  // Hairlines, focus rings and gradient stops never carry text, so they are
  // judged at WCAG 1.4.11's 3:1 non-text threshold. A 10%-tint border scoring
  // 1.24:1 is intentional, not a bug — printing a red "fail" beside it would
  // teach the wrong lesson on the system's own reference page.
  if (basis === "non-text") {
    return ratio >= 3
      ? { label: "≥3:1 non-text", className: "text-success" }
      : { label: "<3:1 non-text", className: "text-muted-foreground" };
  }
  if (ratio >= 7) return { label: "AAA", className: "text-success" };
  if (ratio >= 4.5) return { label: "AA", className: "text-success" };
  if (ratio >= 3) return { label: "AA large", className: "text-warning" };
  return { label: "below AA", className: "text-destructive" };
}

const Swatch = ({ token }: { token: string }) => (
  <span
    className="inline-block size-10 shrink-0 rounded-md p-[3px] ring-1 ring-border"
    style={CHECKERBOARD}
    aria-hidden="true"
  >
    <span className="block size-full rounded-[5px]" style={{ background: `var(${token})` }} />
  </span>
);

const TokenTable = ({
  tokens,
  measurements,
}: {
  tokens: readonly ColorToken[];
  measurements: Map<string, TokenMeasurement>;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-3xl border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          <th scope="col" className="w-16 py-2 pr-3 font-medium">
            Swatch
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Token
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Value
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Effective
          </th>
          <th scope="col" className="py-2 font-medium">
            Contrast vs pair
          </th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => {
          const measurement = measurements.get(token.name);
          const grade = measurement?.ratio == null ? null : contrastGrade(measurement.ratio, token.contrastBasis);
          return (
            <tr key={token.name} className="border-b border-border align-middle">
              <td className="py-2 pr-3">
                <Swatch token={token.name} />
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{token.name}</td>
              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{measurement?.declared ?? "—"}</td>
              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{measurement?.hex ?? "—"}</td>
              <td className="py-2 text-xs">
                {measurement?.ratio == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>
                    <span className="font-mono">{measurement.ratio.toFixed(2)}:1</span>{" "}
                    <span className={grade?.className}>{grade?.label}</span>{" "}
                    <span className="font-mono text-muted-foreground">{token.pairedWith}</span>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const ColorTokens = () => {
  // The decorator toggles `dark` on <html> in an effect, and the toolbar can
  // flip it at any time — re-derive every measurement when it changes.
  const rootClass = useSyncExternalStore(subscribeToRootClass, readRootClass, readRootClassOnServer);
  const measurements = useMemo(
    () => measureTokens(TOKEN_REGISTRY.colorTokens),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rootClass is the theme signal, not an input
    [rootClass],
  );
  const radii = useMemo(
    () => measureRadii(TOKEN_REGISTRY.radiusTokens.map((t) => t.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rootClass is the theme signal, not an input
    [rootClass],
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Color Token Inventory</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            Every custom property declared in <span className="font-mono text-xs">:root</span> of{" "}
            <span className="font-mono text-xs">src/styles/theme.css</span> whose value is a colour —{" "}
            {TOKEN_REGISTRY.colorTokens.length} tokens. The list is generated from the stylesheet, not hand-written, and
            a CI test fails if a token is ever added that this page would not show. Values are read from the live theme
            with <span className="font-mono text-xs">getComputedStyle</span>, so switching the toolbar between dark and
            light re-measures everything.
          </p>
          <p className="text-muted-foreground max-w-3xl text-xs">
            <strong className="font-medium text-foreground">Effective</strong> is the token composited over{" "}
            <span className="font-mono">--background</span>, so translucent tokens report the colour a reader actually
            sees. Contrast ratios are WCAG 2.2, computed in the browser against the paired token shown beside them —
            graded at 4.5:1 where the pair is text on a surface, and at 1.4.11&apos;s 3:1 where the token is a hairline,
            focus ring or gradient stop that never carries text. Swatches sit on a checkerboard frame so both near-black
            chips and translucent ones keep a visible edge.
          </p>
        </div>

        {TOKEN_REGISTRY.groups.map((group) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{group.title}</h2>
              <p className="text-muted-foreground text-sm">{group.description}</p>
            </div>
            <TokenTable tokens={group.tokens} measurements={measurements} />
          </section>
        ))}

        {/* Radius role scale — replaces the superseded default/md/sm/full row. */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Radius roles</h2>
            <p className="text-muted-foreground text-sm">
              Pick a <em>role</em>, not a size. Derived from the same <span className="font-mono text-xs">:root</span>{" "}
              block, with the pixel value each corner resolves to.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOKEN_REGISTRY.radiusTokens.map((token) => (
              <div key={token.name} className="border border-border p-4" style={{ borderRadius: `var(${token.name})` }}>
                <div className="font-mono text-xs font-medium">{token.name}</div>
                <div className="text-muted-foreground mt-1 font-mono text-xs">{token.value}</div>
                <div className="mt-1 text-sm">{radii.get(token.name) ?? "—"}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Non-colour tokens are deliberately out of scope — say so, with counts. */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Not shown here</h2>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {TOKEN_REGISTRY.nonColorTokens.length} further <span className="font-mono text-xs">:root</span> tokens are
            not colours and get no swatch. They are still accounted for — the CI test requires every one of them to fall
            into a documented category:
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm">
            {[...new Map(TOKEN_REGISTRY.nonColorTokens.map((t) => [t.categoryId, t])).values()].map((token) => (
              <li key={token.categoryId}>
                {token.categoryLabel} —{" "}
                {TOKEN_REGISTRY.nonColorTokens.filter((t) => t.categoryId === token.categoryId).length} tokens
              </li>
            ))}
          </ul>
        </section>

        {/* Typography */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Typography</h2>
          <div className="space-y-3">
            <div className="text-4xl font-bold">Heading 1</div>
            <div className="text-3xl font-bold">Heading 2</div>
            <div className="text-2xl font-semibold">Heading 3</div>
            <div className="text-xl font-semibold">Heading 4</div>
            <div className="text-base">Body text (base)</div>
            <div className="text-sm">Small text</div>
            <div className="text-xs">Extra small text</div>
            <div className="text-sm text-muted-foreground">Muted text</div>
            <div className="text-sm text-primary">Primary text</div>
            <div className="text-sm text-destructive">Destructive text</div>
          </div>
        </section>
      </div>
    </div>
  );
};

export const InteractiveComponents = () => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Interactive Components</h1>
        <p className="text-muted-foreground">All interactive states and hover effects in one view</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Button States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>All variants hover states</Label>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-input">Input with focus</Label>
            <Input id="test-input" placeholder="Focus to see ring..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="test-switch" />
            <Label htmlFor="test-switch">Toggle this switch</Label>
          </div>
          <div className="space-y-2">
            <Label>Select dropdown</Label>
            <Select>
              <SelectTrigger aria-label="Dropdown selection">
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Option 1</SelectItem>
                <SelectItem value="2">Option 2</SelectItem>
                <SelectItem value="3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collapsible Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Expand to see content</AccordionTrigger>
              <AccordionContent>
                This content can be expanded and collapsed. Notice the animation and focus states.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Another section</AccordionTrigger>
              <AccordionContent>Multiple accordion items can be configured with different behaviors.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabbed Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <p className="text-sm text-muted-foreground">Overview content with all token colors applied.</p>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <p className="text-sm text-muted-foreground">Details section content.</p>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <p className="text-sm text-muted-foreground">Settings configuration area.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
);

export const CompactShowcase = () => (
  <div className="p-8 bg-background space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Default</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
            <Button size="sm" variant="destructive">
              Destructive
            </Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
            <Button size="sm" variant="ghost">
              Ghost
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Form Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Text input" />
          <Input placeholder="Disabled" disabled />
          <div className="flex items-center gap-2">
            <Switch id="compact-switch" />
            <Label htmlFor="compact-switch">Switch control</Label>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>Default alert</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error alert</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">Heading</div>
          <div className="text-base">Body text</div>
          <div className="text-sm text-muted-foreground">Muted text</div>
          <div className="text-xs">Small text</div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  </div>
);
