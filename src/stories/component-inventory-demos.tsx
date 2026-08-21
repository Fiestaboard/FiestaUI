/**
 * The rendered half of the component inventory.
 *
 * `DEMOS` is typed `Record<InventoryName, …>`, so every name declared in
 * `component-inventory.ts` must have a demo here, and no demo can exist for a
 * name that is not inventoried — TypeScript enforces both directions. What
 * keeps the *inventory* honest against `src/index.ts` is the coverage test,
 * `scripts/ci/tests/component-inventory-coverage.test.mjs`.
 *
 * Demos are thunks rather than elements, so importing this module stays cheap
 * and free of side effects.
 *
 * Every `id` here is prefixed `inv-`: the whole inventory renders as a single
 * page and the test runner runs axe over it, where duplicate ids are a
 * violation.
 */

import "../styles/editor.css";

import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  Bold,
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Cloud,
  Inbox,
  Info,
  Italic,
  Mail,
  Monitor,
  Palette,
  Plus,
  Settings2,
  StickyNote,
  Trash2,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { BoardBackdrop } from "../components/board/board-backdrop";
import { BoardDisplay } from "../components/board/board-display";
import { BoardTeaser } from "../components/board/board-teaser";
import { ScaledBoardDisplay } from "../components/board/scaled-board-display";
import { StaticBoardDisplay } from "../components/board/static-board-display";
import { BoardIcon } from "../components/chrome/board-icon";
import { BoardSelector } from "../components/chrome/board-selector";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/chrome/breadcrumb";
import { FiestaIcon } from "../components/chrome/fiesta-icon";
import { FiestaLogo } from "../components/chrome/fiesta-logo";
import { LanguageSelector } from "../components/chrome/language-selector";
import {
  NavList,
  NavListItem,
  NavListLink,
  NavListSection,
  NavListSectionContent,
  NavListSectionTrigger,
} from "../components/chrome/nav-list";
import { PageHeader, PageIconGradientDefs } from "../components/chrome/page-header";
import { PageLayout } from "../components/chrome/page-layout";
import { PageToolbar } from "../components/chrome/page-toolbar";
import { SkipToContent } from "../components/chrome/skip-to-content";
import { ThemeToggle } from "../components/chrome/theme-toggle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/containment/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/containment/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/containment/collapsible";
import { IconTile } from "../components/containment/icon-tile";
import { JsonTree } from "../components/containment/json-tree";
import { MediaFrame, MediaFrameBar, MediaFrameMedia } from "../components/containment/media-frame";
import { ScrollArea } from "../components/containment/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/containment/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/containment/tabs";
import { BarList } from "../components/data/bar-list";
import { StatStrip, StatStripItem } from "../components/data/stat-strip";
import { ColorPickerContent } from "../components/editor/color-picker-content";
import { DrawCharPickerContent } from "../components/editor/draw-char-picker-content";
import { FilterPickerContent } from "../components/editor/filter-picker-content";
import { FormattingPickerContent } from "../components/editor/formatting-picker-content";
import { TemplateEditor } from "../components/editor/template-editor";
import { TemplateEditorToolbar, type ToolbarTemplateVariables } from "../components/editor/template-editor-toolbar";
import { ToolbarDropdown } from "../components/editor/toolbar-dropdown";
import { createLucideIconResolver, VariablePickerContent } from "../components/editor/variable-picker-content";
import FadeContent from "../components/effects/react-bits/fade-content";
import { Alert, AlertDescription, AlertTitle } from "../components/feedback/alert";
import { Badge } from "../components/feedback/badge";
import { Chip } from "../components/feedback/chip";
import { EmptyState } from "../components/feedback/empty-state";
import { Skeleton } from "../components/feedback/skeleton";
import { Spinner } from "../components/feedback/spinner";
import { StatusDot } from "../components/feedback/status-dot";
import { Button } from "../components/forms/button";
import { Checkbox } from "../components/forms/checkbox";
import { Input } from "../components/forms/input";
import { Label } from "../components/forms/label";
import { SecretInput } from "../components/forms/secret-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../components/forms/select";
import { Slider } from "../components/forms/slider";
import { Swatch, SwatchGroup } from "../components/forms/swatch";
import { Switch } from "../components/forms/switch";
import { Textarea } from "../components/forms/textarea";
import { TimePicker } from "../components/forms/time-picker";
import { Toggle, ToggleGroup } from "../components/forms/toggle";
import { SegmentedControl, SegmentedControlItem, ToggleCard, ToggleCardGroup } from "../components/forms/toggle-card";
import { Box } from "../components/layout/box";
import { Flex } from "../components/layout/flex";
import { Grid } from "../components/layout/grid";
import { Stack } from "../components/layout/stack";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/overlays/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/overlays/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../components/overlays/dropdown-menu";
import { Lightbox, LightboxContent, LightboxTrigger } from "../components/overlays/lightbox";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../components/overlays/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/overlays/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/overlays/tooltip";
import { BoardShowcase } from "../components/plugin/board-showcase";
import { PluginCard } from "../components/plugin/plugin-card";
import { PluginCategoryBadge } from "../components/plugin/plugin-category-badge";
import { ScaledBoardTeaser } from "../components/plugin/scaled-board-teaser";
import { Code } from "../components/typography/code";
import { Heading } from "../components/typography/heading";
import { List, ListItem } from "../components/typography/list";
import { Text } from "../components/typography/text";
import { TextLink } from "../components/typography/text-link";
import { WizardProgress } from "../components/wizard/wizard-progress";
import type { InventoryName } from "./component-inventory";

/* ------------------------------------------------------------------ *
 * Shared fixtures
 * ------------------------------------------------------------------ */

const BOARD_MESSAGE = "     AIR QUALITY\n     AQI 42  GOOD\n\n      VISIBILITY\n  8.5 MILES  CLEAR";

// Inline SVG data URI, not a fetched image: the inventory is VRT-shot
// offline, and a data URI paints identically on every run.
const SCREENSHOT_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'>` +
    `<defs><pattern id='t' width='60' height='80' patternUnits='userSpaceOnUse'>` +
    `<rect x='4' y='4' width='52' height='72' rx='6' fill='#292524'/>` +
    `</pattern></defs>` +
    `<rect width='1200' height='675' fill='#0c0a09'/>` +
    `<rect width='1200' height='675' fill='url(#t)'/>` +
    `<text x='600' y='358' font-family='monospace' font-size='72' letter-spacing='18' fill='#fbbf24' text-anchor='middle'>FIESTABOARD</text>` +
    `</svg>`,
)}`;

const SHOWCASE_PREVIEWS = [
  {
    device_type: "flagship" as const,
    rows: [
      "{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}",
      "     AIR QUALITY",
      "     AQI 42  GOOD",
      "{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}",
      "      VISIBILITY",
      "  8.5 MILES  LIGHT FOG",
    ],
  },
  {
    device_type: "note" as const,
    rows: ["{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}", "  AQI 45 GOOD", "  FOG CLEAR"],
  },
];

const JSON_SAMPLE = {
  station: "SF-Mission",
  aqi: 42,
  healthy: true,
  updated: null,
  readings: [
    { pollutant: "pm25", value: 8.1 },
    { pollutant: "o3", value: 21 },
  ],
};

const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: {
    weather: ["temperature", "condition", "high", "low"],
    datetime: ["time", "date"],
    stocks: ["price", "change_percent"],
  },
  variable_metadata: {
    weather: {
      temperature: { description: "Current temperature in the configured unit.", preview: "72" },
      condition: { description: "Short description of the sky.", max_length: 12, preview: "PARTLY CLOUDY" },
    },
    datetime: {
      time: { description: "Current local time.", preview: "9:41 AM" },
      date: { description: "Current local date.", preview: "AUG 15" },
    },
  },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
  formatting: {
    fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line to the right edge" },
    center: { syntax: "{{center}}", description: "Center the line" },
  },
};

const PLUGIN_MANIFESTS = { weather: { icon: "cloud" }, datetime: { icon: "clock" }, stocks: { icon: "trending-up" } };
const resolvePickerIcon = createLucideIconResolver({ Cloud, Clock, TrendingUp });

const noop = () => {};

/** Bounds a demo that would otherwise size itself to the whole page. */
const Frame = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-full max-w-md ${className}`}>{children}</div>
);

/**
 * Two chrome components cannot be inlined on this page. Saying so next to
 * their entry keeps the inventory a complete catalogue — the alternative is
 * silently omitting them, which is how the old story got to 11 of 73.
 *
 *   * `Sidebar` is `lg:fixed`, with a `fixed` mobile header and backdrop, so
 *     rendering it here would pin it over the whole inventory.
 *   * `MainContent` renders the `<main>` landmark. A page has exactly one; a
 *     second is an axe violation the test runner fails on.
 */
const SeeItsOwnStory = ({ storyPath, why }: { storyPath: string; why: string }) => (
  <Stack gap="2" className="w-full max-w-md rounded-lg border border-dashed border-border p-4">
    <Text size="xs" tone="muted">
      {why}
    </Text>
    <Text size="xs">
      Shown in <Code>{storyPath}</Code>.
    </Text>
  </Stack>
);

/* ------------------------------------------------------------------ *
 * Controlled components need an owner
 * ------------------------------------------------------------------ */

function TimePickerDemo() {
  const [value, setValue] = useState("20:00");
  return (
    <Stack gap="1.5" className="w-full max-w-[240px]">
      <Label id="inv-time-label" htmlFor="inv-time">
        Start time
      </Label>
      <TimePicker id="inv-time" aria-labelledby="inv-time-label" value={value} onValueChange={setValue} />
    </Stack>
  );
}

function SliderDemo() {
  const [value, setValue] = useState([60]);
  return (
    <Stack gap="1.5" className="w-full max-w-xs">
      <Label htmlFor="inv-slider">Brightness — {value[0]}%</Label>
      {/* The visible Label names the group; `aria-label` is what reaches the
          thumb's own input, which Base UI gives a generated id. Both, as in
          the component's WithLabel story. */}
      <Slider id="inv-slider" aria-label="Brightness" value={value} onValueChange={setValue} max={100} step={1} />
    </Stack>
  );
}

function BoardSelectorDemo() {
  const [value, setValue] = useState("living-room");
  return (
    <Frame className="max-w-xs">
      <BoardSelector
        boards={[
          { id: "living-room", name: "Living Room" },
          { id: "kitchen", name: "Kitchen" },
          { id: "office", name: "" },
        ]}
        value={value}
        onChange={setValue}
        labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
      />
    </Frame>
  );
}

function LanguageSelectorDemo() {
  const [value, setValue] = useState("en");
  return (
    <LanguageSelector
      value={value}
      onChange={setValue}
      options={[
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
        { value: "ja", label: "日本語" },
      ]}
      label="Language"
    />
  );
}

function ThemeToggleDemo() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  return (
    <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} label="Toggle theme" />
  );
}

function TemplateEditorDemo() {
  const [value, setValue] = useState("{{center}}AIR QUALITY\nAQI {{weather.temperature}} {67}GOOD");
  return (
    <Frame className="max-w-2xl">
      <TemplateEditor value={value} onChange={setValue} toolbarProps={{ templateVariables: TEMPLATE_VARIABLES }} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ *
 * The demos
 * ------------------------------------------------------------------ */

export const DEMOS: Record<InventoryName, () => React.ReactNode> = {
  /* ---- Layout ---- */
  Box: () => (
    <Box className="relative h-24 w-48 rounded-md border border-border">
      <Box className="absolute right-2 top-2 size-3 rounded-full bg-success" />
      <Text tone="muted" className="p-2">
        Positioned overlay host.
      </Text>
    </Box>
  ),
  Flex: () => (
    <Flex align="center" justify="between" gap="3" className="w-full max-w-sm rounded-md border border-border p-3">
      <Text weight="medium">Toolbar row</Text>
      <Flex gap="2">
        <Button size="sm" variant="outline">
          Cancel
        </Button>
        <Button size="sm">Save</Button>
      </Flex>
    </Flex>
  ),
  Grid: () => (
    <Grid cols="2" sm="3" gap="2" className="w-full max-w-sm">
      {["one", "two", "three", "four", "five", "six"].map((n) => (
        <div key={n} className="rounded-md border border-border bg-muted p-3 text-center text-xs">
          {n}
        </div>
      ))}
    </Grid>
  ),
  Stack: () => (
    <Stack gap="3" className="w-full max-w-xs rounded-md border border-border p-3">
      <Text size="sm">First</Text>
      <Text size="sm">Second</Text>
      <Text size="sm">Third</Text>
    </Stack>
  ),

  /* ---- Typography ---- */
  //
  // Every demo is nested under the entry's own <h3>, so this one renders the
  // whole size scale at `level={4}` rather than walking level 2→4. Showing the
  // level axis literally would emit an <h2> inside an <h3> and invert the
  // page's outline — on the design system's own reference page, of all places.
  // The independence of the two axes is the point, and it is stated instead.
  Heading: () => (
    <Stack gap="2">
      <Heading level={4} size="xl">
        Heading xl
      </Heading>
      <Heading level={4} size="lg">
        Heading lg
      </Heading>
      <Heading level={4} size="base">
        Heading base
      </Heading>
      <Heading level={4} size="sm" tone="muted">
        Heading sm, muted
      </Heading>
      <Text size="xs" tone="muted">
        All four are <Code>level=&#123;4&#125;</Code> — <Code>size</Code> is the visual scale and <Code>level</Code> the
        semantic one (h2–h4), set independently.
      </Text>
    </Stack>
  ),
  Text: () => (
    <Stack gap="1">
      <Text size="lg">Large body copy</Text>
      <Text>Default body copy</Text>
      <Text size="sm" tone="muted">
        Small and muted
      </Text>
      <Flex gap="3" wrap>
        <Text size="xs" tone="info">
          info
        </Text>
        <Text size="xs" tone="success">
          success
        </Text>
        <Text size="xs" tone="warning">
          warning
        </Text>
        <Text size="xs" tone="destructive">
          destructive
        </Text>
      </Flex>
    </Stack>
  ),
  Code: () => (
    <Text size="sm">
      Run <Code>npm run vrt:update</Code> to refresh baselines.
    </Text>
  ),
  List: () => (
    <Flex gap="8" wrap>
      <List marker="disc">
        <ListItem>Unordered one</ListItem>
        <ListItem>Unordered two</ListItem>
      </List>
      <List marker="decimal">
        <ListItem>Ordered one</ListItem>
        <ListItem>Ordered two</ListItem>
      </List>
    </Flex>
  ),
  TextLink: () => (
    <Text size="sm">
      See the <TextLink href="#inv-section-typography">typography section</TextLink> for the rest of the scale.
    </Text>
  ),

  /* ---- Forms ---- */
  Button: () => (
    <Stack gap="4">
      <Flex gap="2" wrap>
        <Button>Default</Button>
        <Button variant="brand">Brand</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </Flex>
      <Flex gap="2" wrap align="center">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon-sm" aria-label="Add (small)">
          <Plus />
        </Button>
        <Button size="icon" aria-label="Add">
          <Plus />
        </Button>
        <Button size="icon-lg" aria-label="Add (large)">
          <Plus />
        </Button>
      </Flex>
      <Flex gap="2" wrap>
        <Button>
          <Mail /> With icon
        </Button>
        <Button variant="destructive">
          <Trash2 /> Delete
        </Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </Flex>
    </Stack>
  ),
  Checkbox: () => (
    <Stack gap="2">
      <Flex align="center" gap="2">
        <Checkbox id="inv-check-1" />
        <Label htmlFor="inv-check-1">Unchecked</Label>
      </Flex>
      <Flex align="center" gap="2">
        <Checkbox id="inv-check-2" defaultChecked />
        <Label htmlFor="inv-check-2">Checked</Label>
      </Flex>
      <Flex align="center" gap="2">
        <Checkbox id="inv-check-3" disabled />
        <Label htmlFor="inv-check-3">Disabled</Label>
      </Flex>
    </Stack>
  ),
  Input: () => (
    <Grid cols="1" sm="2" gap="3" className="w-full max-w-lg">
      <Stack gap="1.5">
        <Label htmlFor="inv-input-text">Text</Label>
        <Input id="inv-input-text" placeholder="Enter text…" />
      </Stack>
      <Stack gap="1.5">
        <Label htmlFor="inv-input-email">Email</Label>
        <Input id="inv-input-email" type="email" placeholder="user@example.com" />
      </Stack>
      <Stack gap="1.5">
        <Label htmlFor="inv-input-number">Number</Label>
        <Input id="inv-input-number" type="number" defaultValue={22} />
      </Stack>
      <Stack gap="1.5">
        <Label htmlFor="inv-input-disabled">Disabled</Label>
        <Input id="inv-input-disabled" placeholder="Disabled" disabled />
      </Stack>
    </Grid>
  ),
  Label: () => (
    <Stack gap="1.5" className="w-full max-w-xs">
      <Label htmlFor="inv-label-target">Board name</Label>
      <Input id="inv-label-target" defaultValue="Living room" />
    </Stack>
  ),
  SecretInput: () => (
    <Stack gap="1.5" className="w-full max-w-xs">
      <Label htmlFor="inv-secret">API key</Label>
      <SecretInput id="inv-secret" defaultValue="fb_live_2f9c41" />
    </Stack>
  ),
  SegmentedControl: () => (
    <SegmentedControl aria-label="Board animations" defaultValue="subtle">
      <SegmentedControlItem value="off">Off</SegmentedControlItem>
      <SegmentedControlItem value="subtle">Subtle</SegmentedControlItem>
      <SegmentedControlItem value="full">Full</SegmentedControlItem>
    </SegmentedControl>
  ),
  Select: () => (
    <Stack gap="1.5" className="w-full max-w-xs">
      <Label htmlFor="inv-select">Refresh interval</Label>
      <Select defaultValue="5m">
        <SelectTrigger id="inv-select">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Minutes</SelectLabel>
            <SelectItem value="1m">Every minute</SelectItem>
            <SelectItem value="5m">Every 5 minutes</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Hours</SelectLabel>
            <SelectItem value="1h">Every hour</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Stack>
  ),
  Slider: SliderDemo,
  Swatch: () => (
    <SwatchGroup aria-label="Board colour" defaultValue="black">
      <Swatch value="black" color="var(--color-board-surface-dark)" label="Black" />
      <Swatch value="white" color="var(--color-board-surface-light)" label="White" />
      <Swatch value="orange" color="var(--color-board-orange)" label="Orange" />
    </SwatchGroup>
  ),
  Switch: () => (
    <Flex gap="6" wrap>
      <Flex align="center" gap="2">
        <Switch id="inv-switch-1" />
        <Label htmlFor="inv-switch-1">Off</Label>
      </Flex>
      <Flex align="center" gap="2">
        <Switch id="inv-switch-2" defaultChecked />
        <Label htmlFor="inv-switch-2">On</Label>
      </Flex>
      <Flex align="center" gap="2">
        <Switch id="inv-switch-3" disabled />
        <Label htmlFor="inv-switch-3">Disabled</Label>
      </Flex>
    </Flex>
  ),
  Textarea: () => (
    <Stack gap="1.5" className="w-full max-w-sm">
      <Label htmlFor="inv-textarea">Notes</Label>
      <Textarea id="inv-textarea" rows={3} placeholder="What should this board show?" />
    </Stack>
  ),
  TimePicker: TimePickerDemo,
  Toggle: () => (
    <Flex align="center" gap="3" wrap>
      <Toggle aria-label="Bold" size="icon">
        <Bold />
      </Toggle>
      <Toggle aria-label="Italic" size="icon" defaultPressed>
        <Italic />
      </Toggle>
      <Toggle variant="outline" defaultPressed>
        <Bold /> Pressed
      </Toggle>
      <Toggle variant="outline" disabled>
        <Bold /> Disabled
      </Toggle>
    </Flex>
  ),
  ToggleCard: () => (
    <ToggleCardGroup aria-label="Board type" defaultValue="flagship" columns="2" className="w-full max-w-lg">
      <ToggleCard
        value="flagship"
        icon={<Monitor />}
        title="Flagship"
        description="22 × 6 characters, mains powered."
      />
      <ToggleCard value="note" icon={<StickyNote />} title="Note" description="Custom grid, battery powered." />
    </ToggleCardGroup>
  ),
  ToggleGroup: () => (
    <ToggleGroup aria-label="Text alignment" segmented defaultValue={["left"]}>
      <Toggle value="left" size="icon" aria-label="Align left">
        <AlignLeft />
      </Toggle>
      <Toggle value="center" size="icon" aria-label="Align center">
        <AlignCenter />
      </Toggle>
      <Toggle value="right" size="icon" aria-label="Align right">
        <AlignRight />
      </Toggle>
    </ToggleGroup>
  ),

  /* ---- Feedback ---- */
  Alert: () => (
    <Stack gap="3" className="w-full max-w-lg">
      <Alert>
        <Info />
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>Neutral surface, no status colour.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>Something worth knowing.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle2 />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>The template was published.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>This line is longer than the board is wide.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Destructive</AlertTitle>
        <AlertDescription>The board could not be reached.</AlertDescription>
      </Alert>
    </Stack>
  ),
  Badge: () => (
    <Flex gap="2" wrap>
      <Badge>Default</Badge>
      <Badge variant="brand">Brand</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="variable">variable</Badge>
      <Badge variant="success">success</Badge>
      <Badge variant="formula">formula</Badge>
    </Flex>
  ),
  Chip: () => (
    <Flex gap="2" wrap>
      <Chip>release</Chip>
      <Chip>plugins</Chip>
      <Chip asChild mono>
        <a href="#v5.11">5.11</a>
      </Chip>
    </Flex>
  ),
  EmptyState: () => (
    <Frame>
      <EmptyState
        icon={Inbox}
        title="No pages yet"
        description="Create your first page to start displaying content on the board."
        action={<Button size="sm">New page</Button>}
      />
    </Frame>
  ),
  Skeleton: () => (
    <Stack gap="3" className="w-full max-w-sm">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Flex align="center" gap="4">
        <Skeleton className="size-12 rounded-full" />
        <Stack gap="2" className="flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </Stack>
      </Flex>
    </Stack>
  ),
  Spinner: () => (
    <Flex align="center" gap="4">
      <Spinner size="sm" label="Loading (small)" />
      <Spinner size="md" label="Loading (medium)" />
      <Spinner size="lg" label="Loading (large)" />
    </Flex>
  ),
  StatusDot: () => (
    <Flex gap="4" wrap align="center">
      {(["success", "warning", "danger", "info", "neutral"] as const).map((status) => (
        <Flex key={status} align="center" gap="2">
          <StatusDot status={status} label={null} />
          <Text size="xs" tone="muted">
            {status}
          </Text>
        </Flex>
      ))}
      <Flex align="center" gap="2">
        <StatusDot status="success" glow label={null} />
        <Text size="xs" tone="muted">
          glow
        </Text>
      </Flex>
    </Flex>
  ),

  /* ---- Containment ---- */
  Accordion: () => (
    <Accordion type="single" collapsible className="w-full max-w-lg">
      <AccordionItem value="inv-acc-1">
        <AccordionTrigger>What is a template?</AccordionTrigger>
        <AccordionContent>A layout of literal text, variables and colour tiles for one board.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="inv-acc-2">
        <AccordionTrigger>How often does it refresh?</AccordionTrigger>
        <AccordionContent>Whichever interval the page is scheduled at.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  Card: () => (
    <Grid cols="1" sm="2" gap="4" className="w-full max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Basic card</CardTitle>
          <CardDescription>Header and content.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text size="sm" tone="muted">
            Card content goes here.
          </Text>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>With footer</CardTitle>
          <CardDescription>Footer carries the action.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="brand">Featured</Badge>
        </CardContent>
        <CardFooter>
          <Button size="sm" className="w-full">
            Open
          </Button>
        </CardFooter>
      </Card>
    </Grid>
  ),
  Collapsible: () => (
    <Collapsible className="w-full max-w-sm space-y-2">
      <Flex align="center" justify="between" gap="4" className="px-1">
        <Text size="sm" weight="semibold">
          3 boards starred
        </Text>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Toggle starred boards">
            <ChevronsUpDown />
          </Button>
        </CollapsibleTrigger>
      </Flex>
      <div className="rounded-md border border-border px-4 py-3 font-mono text-sm">Living room</div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border border-border px-4 py-3 font-mono text-sm">Kitchen</div>
        <div className="rounded-md border border-border px-4 py-3 font-mono text-sm">Office</div>
      </CollapsibleContent>
    </Collapsible>
  ),
  IconTile: () => (
    <div className="flex items-end gap-3">
      <IconTile size="sm">
        <Cloud />
      </IconTile>
      <IconTile size="md">
        <Bell />
      </IconTile>
      <IconTile size="lg" tone="board">
        <Cloud />
      </IconTile>
    </div>
  ),
  JsonTree: () => (
    <Frame>
      <JsonTree data={JSON_SAMPLE} path="response" defaultExpandedDepth={1} />
    </Frame>
  ),
  MediaFrame: () => (
    <MediaFrame className="w-full max-w-md">
      <MediaFrameMedia>
        <img src={SCREENSHOT_PLACEHOLDER} alt="Split-flap board spelling FIESTABOARD" />
      </MediaFrameMedia>
      <MediaFrameBar>The kitchen board running the morning briefing page.</MediaFrameBar>
    </MediaFrame>
  ),
  ScrollArea: () => (
    <ScrollArea className="h-40 w-48 rounded-md border border-border">
      <Stack gap="1" className="p-4">
        {Array.from({ length: 24 }, (_, i) => (
          <Text key={i} size="sm">
            Tag {i + 1}
          </Text>
        ))}
      </Stack>
    </ScrollArea>
  ),
  Table: () => (
    <Frame className="max-w-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plugin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Weather</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell>2.1.0</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Muni</TableCell>
            <TableCell>Disabled</TableCell>
            <TableCell>1.4.2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Frame>
  ),
  Tabs: () => (
    <Tabs defaultValue="inv-tab-overview" className="w-full max-w-lg">
      <TabsList>
        <TabsTrigger value="inv-tab-overview">Overview</TabsTrigger>
        <TabsTrigger value="inv-tab-details">Details</TabsTrigger>
        <TabsTrigger value="inv-tab-settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="inv-tab-overview" className="mt-4">
        <Text size="sm" tone="muted">
          Overview panel.
        </Text>
      </TabsContent>
      <TabsContent value="inv-tab-details" className="mt-4">
        <Text size="sm" tone="muted">
          Details panel.
        </Text>
      </TabsContent>
      <TabsContent value="inv-tab-settings" className="mt-4">
        <Text size="sm" tone="muted">
          Settings panel.
        </Text>
      </TabsContent>
    </Tabs>
  ),

  /* ---- Data ---- */
  BarList: () => (
    <BarList
      className="w-full max-w-sm"
      items={[
        { key: "clock", label: "clock", value: 943 },
        { key: "weather", label: "weather", value: 611 },
        { key: "stocks", label: "stocks", value: 214 },
      ]}
    />
  ),

  /* ---- Overlays ---- */
  Dialog: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit page name</DialogTitle>
          <DialogDescription>Give this page a name so it is easy to find later.</DialogDescription>
        </DialogHeader>
        <Stack gap="1.5" className="py-2">
          <Label htmlFor="inv-dialog-name">Name</Label>
          <Input id="inv-dialog-name" defaultValue="Morning briefing" />
        </Stack>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  AlertDialog: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Delete board</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this board?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the board and every page scheduled on it. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  Sheet: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Board settings</SheetTitle>
          <SheetDescription>Edge-anchored panel for secondary tasks.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  // Rendered closed like every overlay here; the trigger is a zoomable
  // MediaFrame, which is the composition the component exists for.
  Lightbox: () => (
    <Lightbox>
      <MediaFrame className="w-full max-w-md">
        <LightboxTrigger asChild>
          <MediaFrameMedia aria-label="Zoom board screenshot">
            <img src={SCREENSHOT_PLACEHOLDER} alt="Split-flap board spelling FIESTABOARD" />
          </MediaFrameMedia>
        </LightboxTrigger>
        <MediaFrameBar>Click the screenshot to zoom.</MediaFrameBar>
      </MediaFrame>
      <LightboxContent aria-label="Board screenshot, zoomed">
        <img src={SCREENSHOT_PLACEHOLDER} alt="Split-flap board spelling FIESTABOARD" />
      </LightboxContent>
    </Lightbox>
  ),
  Popover: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Settings2 /> Display
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <Stack gap="3">
          <Stack gap="1">
            <PopoverTitle>Display</PopoverTitle>
            <PopoverDescription>Set how this page renders on the board.</PopoverDescription>
          </Stack>
          <Stack gap="1.5">
            <Label htmlFor="inv-popover-width">Width</Label>
            <Input id="inv-popover-width" defaultValue="22" className="h-8" />
          </Stack>
        </Stack>
      </PopoverContent>
    </Popover>
  ),
  DropdownMenu: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Page actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Edit
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  Tooltip: () => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),

  /* ---- App chrome ---- */
  FiestaLogo: () => (
    <Flex align="center" gap="6" wrap>
      <FiestaLogo size="sm" />
      <FiestaLogo size="md" />
    </Flex>
  ),
  FiestaIcon: () => (
    <Flex align="center" gap="4">
      <FiestaIcon size={32} />
      <FiestaIcon size={48} />
    </Flex>
  ),
  BoardIcon: () => <BoardIcon className="size-8" />,
  BoardSelector: BoardSelectorDemo,
  LanguageSelector: LanguageSelectorDemo,
  ThemeToggle: ThemeToggleDemo,
  // PageHeader renders the page's <h1>, so inlining it here puts a second <h1>
  // on the inventory and skips h3→h1 under this entry's own heading. That is
  // inherent to showing the component at all — it is what PageHeader IS — and
  // it is exactly how its own story renders too. Left as-is deliberately;
  // `page-has-heading-one` and `heading-order` are disabled in
  // .storybook/test-runner.ts because stories render heading-bearing
  // components outside a document. Don't "fix" it by faking a lower level.
  PageHeader: () => (
    <Frame className="max-w-2xl">
      <PageIconGradientDefs />
      <PageHeader icon={Calendar} title="Schedule" description="Decide what your board shows and when." />
    </Frame>
  ),
  PageToolbar: () => (
    <Frame className="max-w-2xl">
      <PageToolbar
        left={
          <>
            <Badge>4 pages</Badge>
            <Badge variant="secondary">2 scheduled</Badge>
          </>
        }
        right={
          <>
            <Button variant="outline">Import</Button>
            <Button variant="brand">New page</Button>
          </>
        }
      />
    </Frame>
  ),
  PageLayout: () => (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-border">
      <PageLayout>
        <Stack gap="2">
          <Heading level={3} size="lg">
            Page content
          </Heading>
          <Text size="sm" tone="muted">
            PageLayout supplies the max width and the responsive padding around it.
          </Text>
        </Stack>
      </PageLayout>
    </div>
  ),
  SkipToContent: () => (
    <Stack gap="3" className="w-full max-w-md rounded-lg border border-border p-4">
      <SkipToContent label="Skip to main content" targetId="inv-skip-target" />
      <Text size="xs" tone="muted">
        Visually hidden until focused — click in this box, then press Tab.
      </Text>
      <div
        id="inv-skip-target"
        tabIndex={-1}
        className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
      >
        Target landmark
      </div>
    </Stack>
  ),
  // One static trail showing every part: links, an ellipsis for elided
  // levels, separators and the aria-current page.
  Breadcrumb: () => (
    <Breadcrumb aria-label="Breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#inv-breadcrumb-docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis label="More pages" />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#inv-breadcrumb-plugins">Plugins</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Weather</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  // Flat rows, the aria-current pill, and one section expanded around it —
  // the docs sidebar's shape at rail width. Static: the section's open state
  // is a defaultOpen, so the demo photographs identically every run.
  NavList: () => (
    <nav aria-label="NavList example" className="w-[240px]">
      <NavList>
        <NavListItem>
          <NavListLink href="#inv-nav-list-start">Getting started</NavListLink>
        </NavListItem>
        <NavListSection defaultOpen>
          <NavListSectionTrigger>Components</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#inv-nav-list-button">Button</NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="#inv-nav-list-self" active>
                NavList
              </NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
        <NavListSection>
          <NavListSectionTrigger>Recipes</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#inv-nav-list-theming">Theming</NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
      </NavList>
    </nav>
  ),
  Sidebar: () => (
    <SeeItsOwnStory
      storyPath="App/Chrome/Sidebar"
      why="Sidebar is lg:fixed, with a fixed mobile header and backdrop — rendering it inline would pin it over this page."
    />
  ),
  MainContent: () => (
    <SeeItsOwnStory
      storyPath="App/Chrome/MainContent"
      why="MainContent renders the <main> landmark. A page has exactly one, so a second here would be an accessibility violation."
    />
  ),

  /* ---- Board preview ---- */
  StaticBoardDisplay: () => (
    <div className="max-w-full overflow-x-auto">
      <StaticBoardDisplay message={BOARD_MESSAGE} size="sm" />
    </div>
  ),
  ScaledBoardDisplay: () => (
    <div className="w-full max-w-[320px]">
      <ScaledBoardDisplay message={BOARD_MESSAGE} size="md" />
    </div>
  ),
  BoardDisplay: () => (
    <div className="max-w-full overflow-x-auto">
      <BoardDisplay message={BOARD_MESSAGE} size="sm" />
    </div>
  ),
  BoardTeaser: () => <BoardTeaser teaser="AQI 42 GOOD" size="md" />,

  /* ---- Data ---- */
  StatStrip: () => (
    <StatStrip
      tone="brand"
      items={[
        { value: "52", label: "plugins" },
        { value: "5,612", label: "unique cloners" },
      ]}
    />
  ),
  StatStripItem: () => (
    <StatStrip>
      <StatStripItem
        value={
          <>
            99.4<span className="text-base font-normal text-muted-foreground">%</span>
          </>
        }
        label="uptime"
      />
    </StatStrip>
  ),

  /* ---- Plugin directory ---- */
  PluginCard: () => (
    <div className="w-full max-w-[340px]">
      <PluginCard
        name="Air Quality & Fog"
        description="Display air quality (AQI), fog/visibility conditions, and pollen levels."
        authorLabel="by FiestaBoard Team"
        category="weather"
        categoryLabel="Weather & Environment"
        teaser="{66}AQI 45 CLEAR"
        renderLink={({ className, children }) => (
          <a href="#inv-section-plugin" className={className}>
            {children}
          </a>
        )}
      />
    </div>
  ),
  PluginCategoryBadge: () => (
    <Flex gap="2" wrap>
      <PluginCategoryBadge category="weather" label="Weather" />
      <PluginCategoryBadge category="transit" label="Transit" />
      <PluginCategoryBadge category="data" label="Data" />
    </Flex>
  ),
  BoardShowcase: () => (
    <Frame className="max-w-xl">
      <BoardShowcase previews={SHOWCASE_PREVIEWS} previewLabel="Air Quality & Fog on a split-flap board" />
    </Frame>
  ),
  ScaledBoardTeaser: () => (
    <div className="w-full max-w-[320px] rounded-xl border border-border bg-card p-4">
      <ScaledBoardTeaser teaser="{66}AQI 45 CLEAR" />
    </div>
  ),

  /* ---- Template editor ---- */
  TemplateEditor: TemplateEditorDemo,
  TemplateEditorToolbar: () => (
    <Frame className="max-w-2xl">
      <TemplateEditorToolbar editor={null} templateVariables={TEMPLATE_VARIABLES} />
    </Frame>
  ),
  ToolbarDropdown: () => (
    <ToolbarDropdown label="Colors" icon={<Palette className="size-4" />}>
      <Stack gap="1" className="w-48 p-3">
        <Text size="xs" tone="muted">
          Panel content
        </Text>
      </Stack>
    </ToolbarDropdown>
  ),
  VariablePickerContent: () => (
    <Frame className="max-w-sm rounded-lg border border-border p-2">
      <VariablePickerContent
        onInsert={noop}
        templateVariables={TEMPLATE_VARIABLES}
        pluginManifests={PLUGIN_MANIFESTS}
        resolveIcon={resolvePickerIcon}
      />
    </Frame>
  ),
  ColorPickerContent: () => (
    <Frame className="max-w-xs rounded-lg border border-border p-2">
      <ColorPickerContent onInsert={noop} />
    </Frame>
  ),
  FormattingPickerContent: () => (
    <Frame className="max-w-xs rounded-lg border border-border p-2">
      <FormattingPickerContent formatting={TEMPLATE_VARIABLES.formatting} onInsert={noop} />
    </Frame>
  ),
  FilterPickerContent: () => (
    <Frame className="max-w-xs rounded-lg border border-border p-2">
      <FilterPickerContent filters={["upper", "lower", "round"]} editor={null} onInsert={noop} />
    </Frame>
  ),
  DrawCharPickerContent: () => (
    <Frame className="max-w-xs rounded-lg border border-border p-2">
      <DrawCharPickerContent current={{ kind: "eraser" }} onSelect={noop} />
    </Frame>
  ),

  /* ---- Motion & effects ---- */
  BoardBackdrop: () => (
    <div className="bg-background relative h-40 w-full max-w-md overflow-hidden rounded-lg">
      <BoardBackdrop phrases={["WELCOME", "72 AND CLEAR", "N JUDAH 4 MIN", "SUNSET 8 04"]} rowCount={6} />
    </div>
  ),
  WizardShell: () => (
    <div className="text-muted-foreground text-sm">
      Full-screen overlay — see <span className="font-mono text-xs">App/Wizard/WizardShell</span> for the real thing.
      Rendering it inline here would cover the inventory page it is listed on.
    </div>
  ),
  WizardProgress: () => (
    <div className="w-full max-w-sm">
      <WizardProgress steps={["Connect", "Customize", "Finish"]} current={2} label="Setup progress" />
    </div>
  ),
  FadeContent: () => (
    <FadeContent>
      <Card className="w-full max-w-xs">
        <CardHeader>
          <CardTitle>Faded in</CardTitle>
          <CardDescription>Children fade in when scrolled into view.</CardDescription>
        </CardHeader>
      </Card>
    </FadeContent>
  ),
};
