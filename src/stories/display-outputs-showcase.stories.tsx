// The editor's ProseMirror surface is styled by a stylesheet the package does
// not import at runtime (see template-editor.tsx); Storybook is a consumer
// like any other and imports it next to theme.css.
import "../styles/editor.css";

import type { Meta, StoryObj } from "@storybook/react";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";

import { CharacterGlyph } from "../components/board/character-glyph";
import { CharacterSetSpecimen } from "../components/board/character-set-specimen";
import { DisplayPreview } from "../components/board/display-preview";
import { LedMatrixDisplay } from "../components/board/led-matrix-display";
import { LedTransitionPicker } from "../components/board/led-transition-picker";
import { StaticBoardDisplay } from "../components/board/static-board-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/containment/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/containment/collapsible";
import { JsonTree } from "../components/containment/json-tree";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/containment/table";
import { TemplateEditor } from "../components/editor/template-editor";
import { Badge } from "../components/feedback/badge";
import { Button } from "../components/forms/button";
import { Label } from "../components/forms/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../components/forms/select";
import { Switch } from "../components/forms/switch";
import { Grid } from "../components/layout/grid";
import { Stack } from "../components/layout/stack";
import { Code } from "../components/typography/code";
import { Heading } from "../components/typography/heading";
import { Text } from "../components/typography/text";
import { TextLink } from "../components/typography/text-link";
import { BOARD_ICON_NAMES, BOARD_ICONS } from "../lib/board-icons";
import { type CharacterSet, type CharacterSetId, charsetDiff } from "../lib/character-sets";
import { ACME_SIGN_MODEL, goldenCharacterSet } from "../lib/charset-golden-cases";
import { DEVICE_MODEL_IDS, DEVICE_MODELS, type DeviceModel, validateDeviceModel } from "../lib/devices";
import { LED_TRANSITIONS, type LedTransitionId, transitionsForModel } from "../lib/led-transition-registry";
import { LED_TRANSITION_KINDS } from "../lib/led-transitions";
import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../lib/plugin-model-fixtures";
import {
  ACME_MODEL,
  charsetFor,
  deviceFacts,
  FIESTAPANEL_LED,
  FIESTAPANEL_SPLIT_FLAP,
  FitToWidth,
  gridFor,
  letterCaseFor,
  previewFromTemplate,
  SHOWCASE_DEVICES,
  SHOWCASE_GROUPS,
  type ShowcaseDevice,
  showcaseDevice,
  TOOLBAR_PROPS,
} from "./display-outputs-showcase-support";

/*
 * Showcase/Display Outputs — the LED matrix and display-outputs effort, end
 * to end, on one shelf. Everything shown here ships in the package already
 * (the App/Board and Editor stories cover each piece on its own); these
 * stories compose the pieces the way FiestaBoard does, so a reviewer, a
 * plugin author or the FiestaBoard team can see the whole thing working:
 * every device through `DisplayPreview`, the rich content editor beside its
 * live preview, the character sets, the transition menu and the television.
 *
 * Under reduced motion (how VRT shoots) every story is a still: the LED
 * renderer snaps, the flap board snaps, and the picker's looping previews
 * stand on their first frame.
 */

const meta = {
  title: "Showcase/Display Outputs",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---- Small story-local pieces ------------------------------------------- */

/** A story's title line and a sentence or two under it. */
function Intro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="1" className="max-w-3xl">
      <Heading level={2} size="lg">
        {title}
      </Heading>
      <Text tone="muted">{children}</Text>
    </Stack>
  );
}

/** A panel's heading and a one-line caption. */
function PanelHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack gap="0.5">
      <Heading level={3} size="sm">
        {title}
      </Heading>
      {children ? (
        <Text size="xs" tone="muted">
          {children}
        </Text>
      ) : null}
    </Stack>
  );
}

/** A board with its caption under it. */
function Figure({ caption, children, className }: { caption: ReactNode; children: ReactNode; className?: string }) {
  return (
    <figure className={className ?? "flex min-w-0 flex-col gap-2"}>
      {children}
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** A link to another story in this Storybook (the manager, not the iframe). */
function StoryLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <TextLink href={`./?path=/story/${id}`} target="_top">
      {children}
    </TextLink>
  );
}

const SHOWCASE = "showcase-display-outputs";

/* ---- Overview ------------------------------------------------------------ */

/**
 * What the effort is, in three paragraphs, with the way in to every story.
 * (A captioned story rather than a docs page: this Storybook has no MDX.)
 */
export const Overview: Story = {
  render: () => (
    <Stack gap="8" className="max-w-4xl">
      <Stack gap="3">
        <Heading level={2} size="xl">
          Display outputs: one preview, every board
        </Heading>
        <Text>
          FiestaBoard shows boards it does not know the shape of in advance. Output plugins declare their devices as
          data (a <Code>DeviceModel</Code>, and a <Code>CharacterSet</Code> if the device has one of its own) and own
          the transport; FiestaUI owns the contract, the validators, the rendering and the editor. One call,{" "}
          <Code>DisplayPreview</Code>, shows any of them: a split-flap model goes to the tile renderers, an LED matrix
          to a canvas drawn in a bitmap face, and FiestaPanel's two styles sit on an OLED television. An unknown id is
          never quietly a Vestaboard.
        </Text>
        <Text>
          Every board reads one message grammar. Colour tiles are what they always were; colour spans{" "}
          <Code>{"{red:HOT}"}</Code>, block spans <Code>{"{black/white:OPEN}"}</Code> and icons{" "}
          <Code>{"{icon:sun}"}</Code> are new, and a split-flap preview reads them only behind{" "}
          <Code>extendedMarkup</Code> until FiestaBoard's parser has parity. A character set says what a board can draw
          and what it draws instead — so the rich content editor, told its device, offers exactly that set's forms and
          underlines every cell the board cannot draw as written.
        </Text>
        <Text>
          Transitions are a menu judged against each device's frame budget: FiestaBoard's own flip, which scrambles
          through the board's own characters, is the default wherever the device can show it, and the Pixoo's 32-frame
          sequence budget is honoured by compressing, never truncating. Under reduced motion every change snaps.
        </Text>
      </Stack>
      <Figure caption="A HUB75 128×64 through DisplayPreview: colour spans, a tile bar, icons, lowercase in the 5×7 face.">
        <DisplayPreview
          model="hub75_128x64"
          size="sm"
          letterCase="mixed"
          message={previewFromTemplate(showcaseDevice("hub75_128x64").templates[0], 21)}
        />
      </Figure>
      <Grid cols="1" md="2" gap="6">
        <Stack gap="2">
          <Heading level={3} size="base">
            The stories
          </Heading>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <StoryLink id={`${SHOWCASE}--playground`}>Playground</StoryLink> — pick a device; edit its template in the
              rich content editor beside a live preview, choose a transition, open its character set.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--one-template-every-board`}>One template, every board</StoryLink> — the same
              message on all seventeen devices.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--character-sets`}>Character sets</StoryLink> — the lineage from the degree
              flap to a plugin's set.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--transitions`}>Transitions</StoryLink> — every kind, the per-device defaults
              and the Pixoo's budget.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--colour-blocks-and-icons`}>Colour, blocks and icons</StoryLink> — the grammar
              on an LED and on a flap, today and after the coordinated release.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--plugin-declared-devices`}>Plugin-declared devices</StoryLink> — three devices
              rendered from their JSON, and what the validator says.
            </li>
            <li>
              <StoryLink id={`${SHOWCASE}--tv-panels`}>TV panels</StoryLink> — FiestaPanel on its television.
            </li>
          </ul>
        </Stack>
        <Stack gap="2">
          <Heading level={3} size="base">
            The pieces, on their own
          </Heading>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <StoryLink id="app-board-displaypreview--flagship-v1">DisplayPreview</StoryLink>, the one entry point
            </li>
            <li>
              <StoryLink id="app-board-ledmatrixdisplay--default">LedMatrixDisplay</StoryLink>, the LED renderer
            </li>
            <li>
              <StoryLink id="app-board-tvframe--split-flap-55">TvFrame</StoryLink>, the television
            </li>
            <li>
              <StoryLink id="editor-templateeditor--pixoo-64">TemplateEditor</StoryLink>, the rich content editor,
              device-aware
            </li>
            <li>
              <StoryLink id="app-board-ledtransitionpicker--hub-75">LedTransitionPicker</StoryLink>, the menu
            </li>
            <li>
              <StoryLink id="app-board-charactersetspecimen--led-5-x-7">CharacterSetSpecimen</StoryLink> and{" "}
              <StoryLink id="app-board-characterglyph--default">CharacterGlyph</StoryLink>
            </li>
            <li>
              <StoryLink id="editor-colorpickercontent--default">ColorPickerContent</StoryLink> and{" "}
              <StoryLink id="editor-drawcharpickercontent--default">DrawCharPickerContent</StoryLink>, the charset-aware
              pickers
            </li>
          </ul>
        </Stack>
      </Grid>
    </Stack>
  ),
};

/* ---- Playground ---------------------------------------------------------- */

function DeviceCard({ device }: { device: ShowcaseDevice }) {
  const f = deviceFacts(device);
  const rows: Array<[string, ReactNode]> = [
    ["Technology", f.technology],
    ["Family", f.family],
    ["Geometry", f.geometry],
    ["Colour", f.colour],
    ["Character set", f.charset],
    ["Animation", f.animation],
    [
      "Default transition",
      <>
        <span className="font-medium text-foreground">{LED_TRANSITIONS[f.defaultTransition].label}</span>
        {" — "}
        {f.defaultWhy}
      </>,
    ],
    ["Appearance", f.appearance],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{f.model.label}</CardTitle>
        <CardDescription>
          <Code>{f.model.id}</Code>
          {typeof device.model === "string" ? " — a built-in" : " — declared by a plugin, passed as its object"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
          {rows.map(([term, detail]) => (
            <div key={term} className="contents">
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="min-w-0">{detail}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function PlaygroundDemo({ initialDevice }: { initialDevice: string }) {
  const [key, setKey] = useState(initialDevice);
  const device = showcaseDevice(key);
  const facts = deviceFacts(device);
  const isLed = facts.model.technology === "led_matrix";
  const grid = gridFor(device);

  // Per-device state, re-seeded when the device changes: the template the
  // editor holds, which of the two seeds is showing, and the transition.
  const [state, setState] = useState(() => ({
    key,
    value: device.templates[0],
    page: 0,
    transition: facts.defaultTransition as LedTransitionId,
  }));
  if (state.key !== key) {
    setState({ key, value: device.templates[0], page: 0, transition: facts.defaultTransition });
  }
  const [futureFlap, setFutureFlap] = useState(false);
  const [specimenOpen, setSpecimenOpen] = useState(false);

  const nextMessage = () => {
    const page = (state.page + 1) % device.templates.length;
    setState({ ...state, page, value: device.templates[page] });
  };
  const message = previewFromTemplate(state.value, grid.cols);
  const extended = isLed || futureFlap;

  const preview = (
    <DisplayPreview
      model={device.model}
      message={message}
      code62Glyph={device.code62Glyph}
      extendedMarkup={extended}
      letterCase={letterCaseFor(device)}
      transition={isLed ? state.transition : undefined}
      // A flap board changes by itself: the animated renderer shows its cascade.
      animated={!isLed}
      announceUpdates
      size={device.size}
      notesWide={device.notesWide}
      notesTall={device.notesTall}
      gridRows={device.gridRows}
      gridCols={device.gridCols}
      frame={device.tv ? "tv" : "none"}
      tv={device.tv}
    />
  );

  return (
    <Stack gap="6">
      <Intro title="Playground">
        Pick a device. The rich content editor is configured with that device's model, so its toolbar offers only the
        forms the device's character set supports and underlines what it cannot draw; the preview beside it re-renders
        on every edit, with sample values for the variables.
      </Intro>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Stack gap="1">
          <Label htmlFor="showcase-device">Device</Label>
          <Select value={key} onValueChange={setKey}>
            <SelectTrigger id="showcase-device" className="w-full sm:w-80" aria-label="Device">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHOWCASE_GROUPS.map((group) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {SHOWCASE_DEVICES.filter((d) => d.group === group).map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Stack>
        <Button variant="secondary" onClick={nextMessage} data-testid="next-message">
          Next message
        </Button>
        {!isLed ? (
          <div className="flex items-center gap-2">
            <Switch id="showcase-future-flap" checked={futureFlap} onCheckedChange={setFutureFlap} />
            <Label htmlFor="showcase-future-flap" className="font-normal">
              Preview as after the coordinated release (spans and icons degrade to tiles)
            </Label>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Stack gap="3" className="min-w-0">
          <PanelHeading title="Template editor">
            {grid.cols} × {grid.rows} cells; set {facts.set.id}
            {facts.set.mixedCase ? ", keeps lowercase" : ", uppercase only"}
            {facts.set.colorSpans ? ", colour spans" : ""}
            {facts.set.blockSpans ? ", block spans" : ""}
            {facts.set.icons.length ? `, ${facts.set.icons.length} icons` : ", no icons"}.
          </PanelHeading>
          <TemplateEditor
            key={key}
            value={state.value}
            onChange={(value) => setState({ ...state, value })}
            deviceModel={device.model}
            code62Glyph={device.code62Glyph}
            boardWidth={grid.cols}
            boardLines={grid.rows}
            toolbarProps={TOOLBAR_PROPS}
          />
        </Stack>
        <Stack gap="3" className="min-w-0">
          <PanelHeading title="Preview">
            {isLed
              ? `Spans and icons drawn as the device draws them; transition: ${LED_TRANSITIONS[state.transition].label}.`
              : futureFlap
                ? "The planned degradation: spans keep their letters, icons draw their tile fallback."
                : "What the board draws today: FiestaBoard's parser has no span or icon grammar yet, so the editor's new forms show literally."}
          </PanelHeading>
          {device.tv ? preview : <FitToWidth>{preview}</FitToWidth>}
          <DeviceCard device={device} />
        </Stack>
      </div>

      <Stack gap="3">
        <PanelHeading title="Transition">
          {isLed
            ? "Each entry judged against this device; the choice drives the preview on every edit and on Next message."
            : "A split-flap board takes one message, not frames, so only None is on its menu: the hardware cascades by itself."}
        </PanelHeading>
        <LedTransitionPicker
          model={device.model}
          value={state.transition}
          onValueChange={(transition) => setState({ ...state, transition })}
          columns="3"
          preview={isLed}
          previewMessages={[message, previewFromTemplate(device.templates[(state.page + 1) % 2], grid.cols)]}
        />
      </Stack>

      <Collapsible open={specimenOpen} onOpenChange={setSpecimenOpen} className="space-y-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <ChevronDown className={specimenOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            {specimenOpen ? "Hide" : "Show"} the character set: {facts.set.label}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CharacterSetSpecimen charset={charsetFor(device)} size="sm" />
        </CollapsibleContent>
      </Collapsible>
    </Stack>
  );
}

/**
 * The centrepiece: a device picker over the rich content editor, its live
 * preview, the device's facts, its transition menu and its character set.
 * Every built-in, the two FiestaPanel styles (on their television) and the
 * ACME sign are on the list.
 */
export const Playground: Story = {
  name: "Playground",
  render: () => <PlaygroundDemo initialDevice="hub75_128x64" />,
};

/* ---- One template, every board ------------------------------------------ */

const EVERY_BOARD_MESSAGE = "{icon:sun} 72° SUNNY\n{black/white:AQI 42} good\n{66}{66}{66} UV 6 ♥";

function DeviceFigure({ device, message }: { device: ShowcaseDevice; message: string }) {
  const facts = deviceFacts(device);
  const isLed = facts.model.technology === "led_matrix";
  const preview = (
    <DisplayPreview
      model={device.model}
      message={message}
      code62Glyph={device.code62Glyph}
      extendedMarkup
      letterCase={letterCaseFor(device)}
      size="sm"
      notesWide={device.notesWide}
      notesTall={device.notesTall}
      gridRows={device.gridRows}
      gridCols={device.gridCols}
      frame={device.tv ? "tv" : "none"}
      tv={device.tv}
    />
  );
  return (
    <Figure
      caption={
        <>
          <span className="font-medium text-foreground">{device.label}</span> — {facts.set.id}
          {isLed ? "" : " (after the coordinated release)"}
        </>
      }
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
    >
      <div className="flex flex-1 items-center">{device.tv ? preview : <FitToWidth>{preview}</FitToWidth>}</div>
    </Figure>
  );
}

/**
 * One message, every device: an icon, a degree, lowercase, a block span, a
 * tile bar and a heart. Each board draws what its set has and the fallback
 * for the rest — the flap draws the sun as a yellow tile and loses the
 * block's colour, the 3×5 faces draw the sun but not lowercase's
 * descenders, the ACME sign has no degree sign and no sun at all.
 */
export const OneTemplateEveryBoard: Story = {
  name: "One template, every board",
  render: () => (
    <Stack gap="6">
      <Intro title="One template, every board">
        <Code>{EVERY_BOARD_MESSAGE.replaceAll("\n", " ⏎ ")}</Code> on all seventeen devices through{" "}
        <Code>DisplayPreview</Code>. Nothing is configured per device: each draws what its character set has and the
        declared fallback for the rest.
      </Intro>
      {SHOWCASE_GROUPS.map((group) => (
        <Stack key={group} gap="3">
          <Heading level={3} size="base">
            {group}
          </Heading>
          <Grid cols="1" md="2" lg="3" gap="4">
            {SHOWCASE_DEVICES.filter((d) => d.group === group).map((d) => (
              <DeviceFigure key={d.key} device={d} message={EVERY_BOARD_MESSAGE} />
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  ),
};

/* ---- Character sets ------------------------------------------------------ */

const LINEAGE: ReadonlyArray<{
  set: CharacterSet | "vestaboard_v1" | "vestaboard_v2" | "led_5x7" | "led_3x5";
  note: string;
}> = [
  { set: "vestaboard_v1", note: "The Vestaboard set as shipped before 2026: the flap at code 62 is a degree sign." },
  {
    set: "vestaboard_v2",
    note: "Version 2: the same flaps, and code 62 is now a heart. A Note's set; a Flagship's depends on when it was built.",
  },
  {
    set: "led_5x7",
    note: "The 5×7 LED face: every flap character, both ° and ♥, lowercase, and all sixteen icons as glyphs. Colour and block spans.",
  },
  {
    set: "led_3x5",
    note: "The 3×5 face for small panels: the same characters in less room; six icons it cannot say draw their fallbacks.",
  },
  {
    set: goldenCharacterSet("acme_sign_v1"),
    note: "A plugin's set: extends the 3×5 face, uppercase only, adds a € drawn from its own bitmap, keeps three icons, drops colour spans.",
  },
];

function DiffSummary({ set, base }: { set: CharacterSet | CharacterSetId; base: CharacterSet | CharacterSetId }) {
  const d = charsetDiff(set, base);
  const parts = [
    d.addedChars.length
      ? `adds ${d.addedChars.length} characters (${d.addedChars.slice(0, 8).join(" ")}${d.addedChars.length > 8 ? " …" : ""})`
      : "",
    d.removedChars.length
      ? `drops ${d.removedChars.length} (${d.removedChars.slice(0, 8).join(" ")}${d.removedChars.length > 8 ? " …" : ""})`
      : "",
    d.addedIcons.length ? `adds ${d.addedIcons.length} icons` : "",
    d.removedIcons.length ? `drops ${d.removedIcons.length} icons (${d.removedIcons.join(", ")})` : "",
    ...d.features.map(([name, inSet]) => `${inSet ? "gains" : "loses"} ${name}`),
  ].filter(Boolean);
  return (
    <Text size="xs" tone="muted">
      Against its parent: {parts.length ? parts.join("; ") : "no change"}.
    </Text>
  );
}

/**
 * The lineage: each set compared with the one it extends. Green rings mark
 * what a set adds; the panel under each specimen lists what it lacks.
 */
export const CharacterSets: Story = {
  name: "Character sets",
  render: () => (
    <Stack gap="8">
      <Intro title="Character sets">
        A set says what a board draws and what it draws instead. The built-ins form one lineage — degree flap, heart
        flap, the 5×7 LED face, the 3×5 face — and a plugin's set extends one of them. Each specimen below is compared
        with its parent.
      </Intro>
      {LINEAGE.map(({ set, note }, i) => {
        const id = typeof set === "string" ? set : set.id;
        const parent = i > 0 ? LINEAGE[i - 1].set : undefined;
        return (
          <Stack key={id} gap="3">
            <Stack gap="1">
              <Heading level={3} size="base">
                {i + 1}. <Code>{id}</Code>
                {parent ? (
                  <>
                    {" "}
                    <span className="text-muted-foreground">extends</span>{" "}
                    <Code>{typeof parent === "string" ? parent : parent.id}</Code>
                  </>
                ) : null}
              </Heading>
              <Text size="xs" tone="muted">
                {note}
              </Text>
              {parent ? <DiffSummary set={set} base={parent} /> : null}
            </Stack>
            <div className="overflow-x-auto">
              <CharacterSetSpecimen
                charset={set}
                compareTo={parent}
                size="sm"
                glyphLabels={typeof set === "string" ? undefined : { symbols: { "€": "euro sign" } }}
              />
            </div>
          </Stack>
        );
      })}
    </Stack>
  ),
};

/* ---- Transitions --------------------------------------------------------- */

const TRANSIT = [
  "N JUDAH  2 MIN\nN JUDAH 14 MIN\nKT        6 MIN\n\n{66} ON TIME",
  "N JUDAH  1 MIN\nN JUDAH 13 MIN\nKT        5 MIN\n\n{65} 2 MIN LATE",
  "N JUDAH DUE\nN JUDAH 12 MIN\nKT        4 MIN\n\n{63} DELAYED",
];

/** Every model with a row in the defaults table: the built-ins, then the plugin-declared three. */
const DEFAULTS_TABLE: ReadonlyArray<{ model: DeviceModel; origin: string }> = [
  ...DEVICE_MODEL_IDS.map((id) => ({ model: DEVICE_MODELS[id], origin: "built-in" })),
  { model: FIESTAPANEL_SPLIT_FLAP, origin: "plugin" },
  { model: FIESTAPANEL_LED, origin: "plugin" },
  { model: ACME_MODEL, origin: "plugin" },
];

function TransitionsDemo() {
  const [index, setIndex] = useState(0);
  return (
    <Stack gap="3">
      <PanelHeading title="Every kind, on a HUB75 128×64">
        Press Next message: each panel runs its own entry on the same change. Flip is FiestaBoard's own — every changing
        cell scrambles through the board's character set, seeded so it is the same every time, then lands.
      </PanelHeading>
      <Grid cols="1" sm="2" lg="3" gap="4">
        {LED_TRANSITION_KINDS.map((kind) => (
          <Figure
            key={kind}
            caption={
              <>
                <span className="font-medium text-foreground">{LED_TRANSITIONS[kind].label}</span> —{" "}
                {LED_TRANSITIONS[kind].description}
              </>
            }
          >
            <LedMatrixDisplay message={TRANSIT[index]} model="hub75_128x64" transition={kind} size="sm" />
          </Figure>
        ))}
      </Grid>
      <div>
        <Button
          variant="secondary"
          onClick={() => setIndex((i) => (i + 1) % TRANSIT.length)}
          data-testid="next-message"
        >
          Next message
        </Button>
      </div>
    </Stack>
  );
}

function DefaultsTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Frames</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Why</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEFAULTS_TABLE.map(({ model, origin }) => {
            const a = model.animation;
            const menu = transitionsForModel(model);
            const flip = menu.find((t) => t.id === "flip")!;
            const def = flip.available ? "flip" : "none";
            const frames =
              a.delivery === "none"
                ? "none: one message at a time"
                : a.delivery === "stream"
                  ? `streamed at ${a.maxFps} fps`
                  : `sequence of ≤ ${a.maxFrames ?? "∞"} frames`;
            return (
              <TableRow key={model.id}>
                <TableCell>
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs text-muted-foreground">
                    <Code>{model.id}</Code> · {origin}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{frames}</TableCell>
                <TableCell>
                  <Badge variant={def === "flip" ? "success" : "secondary"}>{LED_TRANSITIONS[def].label}</Badge>
                </TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">
                  {flip.reason ?? "The device shows every half-flap."}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The six kinds on one device, the per-device defaults from the registry
 * (flip wherever the device can show one, else none), and the Pixoo's menu
 * with every entry compressed into its 32-frame sequence budget.
 */
export const Transitions: Story = {
  render: () => (
    <Stack gap="8">
      <Intro title="Transitions">
        A menu, not a setting: every entry declares what it needs, and a device model says which entries it can run and
        how each degrades inside its frame budget. A choice the device cannot honour falls back to the device's default,
        with a reason the UI can show. Reduced motion snaps every one of them.
      </Intro>
      <TransitionsDemo />
      <Stack gap="3">
        <PanelHeading title="Per-device defaults">
          The owner's rule: a change flips when the device can show a flip, and snaps otherwise. Read from{" "}
          <Code>transitionsForModel</Code>; nothing is configured per device.
        </PanelHeading>
        <DefaultsTable />
      </Stack>
      <Stack gap="3">
        <PanelHeading title="The Pixoo 64's 32-frame budget">
          The Divoom HTTP API takes a whole animation and plays it itself, so every entry is compressed to fit 32 frames
          — a flip becomes one frame per step with no half-flaps — and always lands on the final frame. The previews
          show exactly the frames a sequence will contain.
        </PanelHeading>
        <LedTransitionPicker model="divoom_pixoo64" columns="3" />
      </Stack>
    </Stack>
  ),
};

/* ---- Colour, blocks and icons ------------------------------------------- */

const GRAMMAR: ReadonlyArray<[string, string, string, string]> = [
  ["{red} {63} … {71}", "A colour tile: one cell", "the tile", "the glyph box filled; a mono panel lights a block"],
  [
    "{red:HOT}",
    "A colour span: the letters in the colour (a name, 63–70, or #rrggbb; nests)",
    "HOT, uncoloured",
    "red letters; mono: lit",
  ],
  ["{black/white:OPEN}", "A block span: background and glyph colours", "OPEN, uncoloured", "white field, unlit glyph"],
  [
    "{icon:sun}",
    "An icon: one cell, a glyph not an image",
    "its fallback: a tile, a character or a blank",
    "the glyph in the icon's colour",
  ],
  ["{foo:bar}", "Anything else in braces", "literal text", "literal text"],
];

const MARKUP_SAMPLE = "{icon:sun} 72° {orange:WARM}\n{red:HOT} {blue:COLD} {66}\n{black/white:OPEN} {icon:check}";

/**
 * The grammar in a table, a message using all of it on an RGB panel and a
 * mono ticker, and the split-flap side twice: what the board draws today
 * (the parser has no span or icon grammar yet, so the forms are literal)
 * and the planned degradation after the coordinated release.
 */
export const ColourBlocksAndIcons: Story = {
  name: "Colour, blocks and icons",
  render: () => (
    <Stack gap="8">
      <Intro title="Colour, blocks and icons">
        One grammar for every board, parsed once in <Code>board-characters</Code>. Tiles are unchanged; spans, blocks
        and icons are new and sit behind <Code>extendedMarkup</Code> for split-flap previews until FiestaBoard's Python
        parser has parity (plan Task 12, a coordinated major).
      </Intro>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marker</TableHead>
              <TableHead>Meaning</TableHead>
              <TableHead>Split-flap</TableHead>
              <TableHead>LED</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GRAMMAR.map(([marker, meaning, flap, led]) => (
              <TableRow key={marker}>
                <TableCell>
                  <Code>{marker}</Code>
                </TableCell>
                <TableCell className="text-xs">{meaning}</TableCell>
                <TableCell className="text-xs">{flap}</TableCell>
                <TableCell className="text-xs">{led}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Stack gap="3">
        <PanelHeading title="One message, four ways">
          <Code>{MARKUP_SAMPLE.replaceAll("\n", " ⏎ ")}</Code>
        </PanelHeading>
        <Grid cols="1" md="2" gap="4">
          <Figure caption="HUB75 64×32, RGB: spans colour their letters, the block inverts its cell, icons draw in their own colour.">
            <FitToWidth>
              <DisplayPreview model="hub75_64x32" message={MARKUP_SAMPLE} size="md" />
            </FitToWidth>
          </Figure>
          <Figure caption="P10 DMD, one colour: everything is lit or not; the block is a lit field with an unlit glyph.">
            <FitToWidth>
              <DisplayPreview model="p10_hub12_32x16" message={"{red:HOT} {66}\n{black/white:OPEN}"} size="lg" />
            </FitToWidth>
          </Figure>
          <Figure caption="Vestaboard Note today: FiestaBoard's renderer has no span or icon grammar yet, so the hardware draws the braces' text literally. The preview matches the hardware.">
            <FitToWidth>
              <StaticBoardDisplay message={MARKUP_SAMPLE} deviceType="note" size="sm" />
            </FitToWidth>
          </Figure>
          <Figure caption="Vestaboard Note after the coordinated release (extendedMarkup): the letters survive, the colour drops, the sun is a yellow tile and the check a green one.">
            <FitToWidth>
              <StaticBoardDisplay message={MARKUP_SAMPLE} deviceType="note" size="sm" extendedMarkup />
            </FitToWidth>
          </Figure>
        </Grid>
      </Stack>
      <Stack gap="3">
        <PanelHeading title="The sixteen icons and their fallbacks">
          An icon is a character, not an image. On the 5×7 face every one is a glyph; the 3×5 face draws ten and the
          fallback for the rest; a flap draws a tile that means the same thing, a character where one fits, or a blank.
        </PanelHeading>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th scope="col" className="pr-3 text-left font-medium text-muted-foreground">
                  icon
                </th>
                <th scope="col" className="px-2 text-left font-medium text-muted-foreground">
                  5×7
                </th>
                <th scope="col" className="px-2 text-left font-medium text-muted-foreground">
                  3×5
                </th>
                <th scope="col" className="px-2 text-left font-medium text-muted-foreground">
                  flap
                </th>
                <th scope="col" className="pl-2 text-left font-medium text-muted-foreground">
                  flap fallback
                </th>
              </tr>
            </thead>
            <tbody>
              {BOARD_ICON_NAMES.map((name) => {
                const fb = BOARD_ICONS[name].fallback;
                return (
                  <tr key={name} className="border-t border-border">
                    <th scope="row" className="py-1 pr-3 text-left font-normal">
                      <Code>{`{icon:${name}}`}</Code>
                    </th>
                    <td className="px-2 py-1">
                      <CharacterGlyph token={`{icon:${name}}`} charset="led_5x7" size="sm" />
                    </td>
                    <td className="px-2 py-1">
                      <CharacterGlyph token={`{icon:${name}}`} charset="led_3x5" size="sm" markUnsupported />
                    </td>
                    <td className="px-2 py-1">
                      <CharacterGlyph token={`{icon:${name}}`} charset="vestaboard_v2" size="sm" markUnsupported />
                    </td>
                    <td className="py-1 pl-2 text-muted-foreground">
                      {fb === null ? "blank" : /^\d+$/.test(fb) ? `tile {${fb}}` : `"${fb}"`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Stack>
    </Stack>
  ),
};

/* ---- Plugin-declared devices --------------------------------------------- */

/** A declaration with two mistakes: the pre-Task-2 top-level `pixelShape`, and no label. */
const BROKEN_DECLARATION = {
  id: "acme_sign_48x12",
  technology: "led_matrix",
  family: "acme_serial",
  geometry: { kind: "pixels", width: 48, height: 12 },
  color: { kind: "monochrome", color: "#ffb000", bitDepth: 1 },
  charset: "led_3x5",
  animation: { delivery: "sequence", maxFps: 10, maxFrames: 12 },
  pixelShape: "round",
};

function Validation({ json }: { json: unknown }) {
  const result = validateDeviceModel(json);
  return (
    <Stack gap="1">
      <div>
        <Badge variant={result.ok ? "success" : "destructive"}>
          validateDeviceModel:{" "}
          {result.ok ? "ok" : `${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`}
        </Badge>
      </div>
      {result.errors.length ? (
        <ul className="list-disc pl-5 text-xs text-destructive">
          {result.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </Stack>
  );
}

function DeclaredDevice({
  declaration,
  model,
  message,
  caption,
  size,
}: {
  declaration: unknown;
  model: DeviceModel;
  message: string;
  caption: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{model.label}</CardTitle>
        <CardDescription>{caption}</CardDescription>
      </CardHeader>
      <CardContent>
        <Stack gap="4">
          <Validation json={declaration} />
          <FitToWidth>
            <DisplayPreview model={model} message={message} size={size} />
          </FitToWidth>
          <JsonTree data={declaration} defaultExpandedDepth={1} className="text-xs" />
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Three devices the package does not know: their JSON as a plugin's
 * `output/device-models.json` carries it, the validator's verdict, and the
 * board rendered from the declaration alone. The fourth is a declaration
 * with mistakes, to show that the validator names them.
 */
export const PluginDeclaredDevices: Story = {
  name: "Plugin-declared devices",
  render: () => (
    <Stack gap="6">
      <Intro title="Plugin-declared devices">
        Device models are open data. A plugin declares its device as JSON — and its character set, if it has one of its
        own — and FiestaUI validates it against the published schema and renders it with no React of the plugin's. None
        of these ids is a built-in: passed as a string they would throw.
      </Intro>
      <Grid cols="1" lg="2" gap="4">
        <DeclaredDevice
          declaration={ACME_SIGN_MODEL}
          model={ACME_MODEL}
          message={"€12 {icon:up}\n{black/white:OPEN}"}
          caption="A 48×12 amber sign with a set of its own: extends the 3×5 face, a € from its own bitmap, three icons, a 12-frame sequence API. The set is materialised (extends resolved) before rendering, as FiestaBoard does."
          size="lg"
        />
        <DeclaredDevice
          declaration={BROKEN_DECLARATION}
          model={ACME_MODEL}
          message={"€12 {icon:up}\n{black/white:OPEN}"}
          caption="The same sign declared wrongly: no label, and pixelShape at the top level where appearance.pixelShape belongs. The validator says so; the board drawn here is the good declaration's."
          size="lg"
        />
        <DeclaredDevice
          declaration={FIESTAPANEL_SPLIT_FLAP_MODEL}
          model={FIESTAPANEL_SPLIT_FLAP}
          message={"DEPARTURES\n\nN JUDAH      2 MIN\nKT INGLESIDE 6 MIN\n\n72° SUNNY  AQI 42"}
          caption="FiestaPanel in its split-flap style: a panel with its size declared (12 × 29, a 55-inch TV), the heart-flap set, no frame interface. The housing colour is a board option it offers."
          size="sm"
        />
        <DeclaredDevice
          declaration={FIESTAPANEL_LED_MATRIX_MODEL}
          model={FIESTAPANEL_LED}
          message={
            "DEPARTURES\n\n{blue:N} JUDAH      2 MIN\n{red:KT} INGLESIDE 6 MIN\n\n{icon:sun} 72° SUNNY  {black/white:AQI 42}"
          }
          caption="FiestaPanel in its LED-matrix style: 192 × 96 diffused square pixels in the 5×7 face, streamed at 60 fps, so every transition is on its menu."
          size="sm"
        />
      </Grid>
    </Stack>
  ),
};

/* ---- TV panels ----------------------------------------------------------- */

const DEPARTURES_FLAP =
  "DEPARTURES\n\nN JUDAH      2 MIN\nN JUDAH     14 MIN\nKT INGLESIDE 6 MIN\n\n72° SUNNY  AQI 42\n{66}{66}{66} GOOD";
const DEPARTURES_LED =
  "DEPARTURES\n\nN JUDAH      2 MIN\n{red:N JUDAH     14 MIN}\nKT INGLESIDE 6 MIN\n\n{icon:sun} 72° SUNNY\n{black/white:AQI 42} GOOD";

/**
 * FiestaPanel on the television it shows on, through `DisplayPreview
 * frame="tv"`: both styles, the viewer's auto-dim, and the set with no
 * signal. The set fills the width it is given and shrinks to a phone.
 */
export const TvPanels: Story = {
  name: "TV panels",
  render: () => (
    <Stack gap="6">
      <Intro title="TV panels">
        FiestaPanel is a board shown on a TV, so its previews sit on one. <Code>TvFrame</Code> is the OLED television
        around any renderer; <Code>DisplayPreview frame=&quot;tv&quot;</Code> wraps whichever renderer the model gets,
        with the viewer's facts about the set in <Code>tv</Code>: diagonal, aspect, dim level, offline.
      </Intro>
      <Grid cols="1" md="2" gap="6">
        <Figure caption="Split-flap style on a 55-inch 16:9 set, on its stand: the flaps on the TV, as the Apple TV app shows them.">
          <DisplayPreview
            model={FIESTAPANEL_SPLIT_FLAP}
            message={DEPARTURES_FLAP}
            frame="tv"
            tv={{ diagonalInches: 55 }}
          />
        </Figure>
        <Figure caption="LED-matrix style on a 65-inch set: a thinner bezel, a smaller stand.">
          <DisplayPreview
            model={FIESTAPANEL_LED}
            message={DEPARTURES_LED}
            size="sm"
            frame="tv"
            tv={{ diagonalInches: 65 }}
          />
        </Figure>
        <Figure caption="The viewer's auto-dim at 0.6: a veil over the screen, never the cabinet. Wall mount.">
          <DisplayPreview
            model={FIESTAPANEL_LED}
            message={DEPARTURES_LED}
            size="sm"
            frame="tv"
            tv={{ diagonalInches: 65, dimmed: 0.6, stand: false }}
          />
        </Figure>
        <Figure caption="No signal: the viewer could not fetch a frame. The screen is off, the standby LED is amber, and the status is announced.">
          <DisplayPreview
            model={FIESTAPANEL_SPLIT_FLAP}
            message={DEPARTURES_FLAP}
            frame="tv"
            tv={{ diagonalInches: 55, offline: true }}
          />
        </Figure>
      </Grid>
    </Stack>
  ),
};
