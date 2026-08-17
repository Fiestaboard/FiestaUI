import type { Meta } from "@storybook/react";
import { AlertCircle, CheckCircle2, Info, Mail, Plus, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/containment/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/containment/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/containment/tabs";
import { Alert, AlertDescription, AlertTitle } from "../components/feedback/alert";
import { Badge } from "../components/feedback/badge";
import { Skeleton } from "../components/feedback/skeleton";
import { Button } from "../components/forms/button";
import { Input } from "../components/forms/input";
import { Label } from "../components/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/forms/select";
import { Switch } from "../components/forms/switch";
import themeCss from "../styles/theme.css?raw";
import type { InventorySection } from "./component-inventory";
import { INVENTORY_SECTIONS } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";
import type { ColorToken, Rgb } from "./token-registry";
import { buildColorTokenRegistry, contrastRatio, resolveColor, toHex } from "./token-registry";

const meta = {
  title: "Foundations/Inventory",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

/* ------------------------------------------------------------------ *
 * AllComponents — the catalogue (see ./component-inventory.ts)
 *
 * The sections and the demos are NOT written here. They come from the
 * inventory registry, which `scripts/ci/tests/component-inventory-coverage.
 * test.mjs` checks against `src/index.ts`: a component that ships without an
 * entry fails CI. The previous version of this story was hand-authored and
 * had drifted to 11 of ~73 components before anyone noticed, because nothing
 * was checking.
 * ------------------------------------------------------------------ */

const STATIC_SECTIONS = INVENTORY_SECTIONS.filter((section) => section.entries.some((entry) => !entry.animated));
const ANIMATED_SECTIONS = INVENTORY_SECTIONS.filter((section) => section.entries.some((entry) => entry.animated));

const countEntries = (sections: readonly InventorySection[]) =>
  sections.reduce((total, section) => total + section.entries.length, 0);

/** One component: its name, what it is for, and it rendered. */
const InventoryItem = ({ name, summary }: { name: string; summary: string }) => {
  const Demo = DEMOS[name as keyof typeof DEMOS];
  return (
    <div className="border-border grid gap-4 border-t py-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-1">
        <h3 className="font-mono text-sm font-medium">{name}</h3>
        <p className="text-muted-foreground text-xs">{summary}</p>
      </div>
      <div className="min-w-0">
        <Demo />
      </div>
    </div>
  );
};

const InventorySectionBlock = ({ section }: { section: InventorySection }) => {
  const entries = section.entries.filter((entry) => !entry.animated);
  if (entries.length === 0) return null;
  return (
    <section id={`inv-section-${section.id}`} className="scroll-mt-8 space-y-2">
      <h2 className="text-2xl font-semibold">{section.title}</h2>
      <p className="text-muted-foreground max-w-3xl text-sm">{section.description}</p>
      <div>
        {entries.map((entry) => (
          <InventoryItem key={entry.name} name={entry.name} summary={entry.summary} />
        ))}
      </div>
    </section>
  );
};

export const AllComponents = () => (
  <div className="bg-background min-h-screen p-8">
    <div className="mx-auto max-w-7xl space-y-12">
      <div className="border-b pb-6">
        <h1 className="mb-2 text-4xl font-bold">Component Inventory</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Every component <span className="font-mono text-xs">@fiestaboard/ui</span> exports —{" "}
          {countEntries(INVENTORY_SECTIONS)} of them, grouped the way{" "}
          <span className="font-mono text-xs">src/components/</span> groups them. The list is a registry, not hand-
          written prose, and a CI test fails if a component ships without an entry here. Switch theme and season in the
          toolbar to see the whole system move together.
        </p>
        <p className="text-muted-foreground mt-2 max-w-3xl text-xs">
          The {countEntries(ANIMATED_SECTIONS)} continuously animated components are in the{" "}
          <span className="font-medium">MotionAndEffects</span> story instead: a free-running animation lands every
          screenshot on a different frame, which would make this page impossible to diff.
        </p>
        <nav aria-label="Sections" className="mt-4 flex flex-wrap gap-2">
          {STATIC_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#inv-section-${section.id}`}
              className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 rounded-md border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-[3px]"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>

      {STATIC_SECTIONS.map((section) => (
        <InventorySectionBlock key={section.id} section={section} />
      ))}
    </div>
  </div>
);

/**
 * The animated half of the inventory, kept out of `AllComponents` so that one
 * page stays screenshot-stable. This story is listed in vrt/skip.json: its
 * components animate on a timer, so every shot lands on a different frame.
 */
export const MotionAndEffects = () => (
  <div className="bg-background min-h-screen p-8">
    <div className="mx-auto max-w-7xl space-y-12">
      <div className="border-b pb-6">
        <h1 className="mb-2 text-4xl font-bold">Motion &amp; Effects</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          The {countEntries(ANIMATED_SECTIONS)} components that animate continuously. They are inventoried in the same
          registry as everything in <span className="font-medium">AllComponents</span> — they render here because a
          free-running animation cannot be visually regression-tested, not because they are any less part of the system.
        </p>
      </div>

      {ANIMATED_SECTIONS.map((section) => (
        <section key={section.id} id={`inv-section-${section.id}`} className="scroll-mt-8 space-y-2">
          <h2 className="text-2xl font-semibold">{section.title}</h2>
          <p className="text-muted-foreground max-w-3xl text-sm">{section.description}</p>
          <div>
            {section.entries
              .filter((entry) => entry.animated)
              .map((entry) => (
                <InventoryItem key={entry.name} name={entry.name} summary={entry.summary} />
              ))}
          </div>
        </section>
      ))}
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
