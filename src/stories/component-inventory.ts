/**
 * The component inventory: every component the package exports, grouped the
 * way `src/components/` groups them.
 *
 * This file is deliberately plain data — no JSX, no component imports — for
 * two reasons:
 *
 *   1. `scripts/ci/tests/component-inventory-coverage.test.mjs` reads it
 *      directly and fails when a component reachable from `src/index.ts` is
 *      missing from it. The inventory story used to be hand-authored, and it
 *      drifted badly: it rendered 11 of ~73 components, six of Button's seven
 *      variants, four of Badge's eight and two of Alert's five. Coverage is
 *      now asserted rather than trusted to authorship, the same way
 *      `token-registry.ts` + `token-registry.test.mjs` keep the colour
 *      inventory honest (issue #169).
 *   2. `component-inventory-demos.tsx` types its demo map as
 *      `Record<InventoryName, …>`, so a name added here without a demo is a
 *      compile error. The two files cannot drift from each other.
 *
 * Adding a component: export it from `src/index.ts`, add an entry here, add
 * its demo in `component-inventory-demos.tsx`. Skipping either of the last
 * two fails CI.
 */

export interface InventoryEntry {
  /** Exported name, exactly as `src/index.ts` exports it. */
  name: string;
  /** One line on what the component is for. Rendered under its name. */
  summary: string;
  /**
   * Set when the demo animates continuously. Animated demos are rendered by
   * the `MotionAndEffects` story instead of `AllComponents`, because a
   * free-running rAF loop lands every VRT screenshot on an arbitrary frame
   * and would make the whole inventory page undiffable (see vrt/skip.json).
   */
  animated?: boolean;
}

export interface InventorySection {
  /** Slug used for the section anchor and React keys. */
  id: string;
  /** Section heading — matches the `src/components/` directory it covers. */
  title: string;
  /** What the group is for, and what distinguishes it from its neighbours. */
  description: string;
  entries: readonly InventoryEntry[];
}

export const INVENTORY = [
  {
    id: "layout",
    title: "Layout",
    description:
      "Structural primitives with enumerated spacing scales, so every emitted class exists statically for the Tailwind v4 scanner. Reach for these instead of ad-hoc flex/grid utility soup.",
    entries: [
      { name: "Box", summary: "Unstyled div with a data-slot — the host for custom positioning." },
      { name: "Flex", summary: "Flexbox container; direction, align, justify, gap, wrap." },
      { name: "Grid", summary: "CSS grid with enumerated column counts and responsive sm/md/lg overrides." },
      { name: "Stack", summary: "Vertical shorthand — a Flex column with a gap. Replaces ad-hoc space-y-*." },
    ],
  },
  {
    id: "typography",
    title: "Typography",
    description: "The text scale, as components. Tone and size are variants rather than utility classes.",
    entries: [
      { name: "Heading", summary: "Semantic h2–h4 with an independent visual size and tone." },
      { name: "Text", summary: "Body copy — size, tone (incl. status tones) and weight variants." },
      { name: "Code", summary: "Inline monospace for identifiers, commands and literals." },
      { name: "List", summary: "Ordered/unordered list with marker and gap variants." },
      { name: "TextLink", summary: "Anchor styled for inline prose, with a focus ring." },
    ],
  },
  {
    id: "forms",
    title: "Forms",
    description: "Inputs and controls. Every one is keyboard-operable and carries a visible focus ring.",
    entries: [
      { name: "Button", summary: "Seven variants × seven sizes, plus a loading state that reserves its own width." },
      { name: "Checkbox", summary: "Native checkbox styled to the system." },
      { name: "Input", summary: "Single-line text input across the HTML input types." },
      { name: "Label", summary: "Form label wired to its control by htmlFor." },
      { name: "SecretInput", summary: "Password input with a reveal toggle." },
      { name: "SegmentedControl", summary: "Pill group for a small set of mutually exclusive options." },
      { name: "Select", summary: "Listbox-backed dropdown with grouping and separators." },
      { name: "Slider", summary: "Range control over a continuous value." },
      {
        name: "Swatch",
        summary: "Colour circle where the fill is the choice; groups into a radiogroup picker.",
      },
      { name: "Switch", summary: "Binary toggle for settings that apply immediately." },
      { name: "Textarea", summary: "Multi-line text input." },
      { name: "TimePicker", summary: "Hour/minute picker with AM-PM and quick presets." },
      {
        name: "TimezonePicker",
        summary: "Searchable IANA-zone combobox — filters ~400 zones by id, label or UTC offset.",
      },
      { name: "Toggle", summary: "Two-state button — aria-pressed with the Button-default fill when on." },
      { name: "ToggleCard", summary: "Large pressable tile with icon, title and description; groups into a picker." },
      {
        name: "ToggleGroup",
        summary: "Roving-focus set of Toggles; single or multiple, loose or one segmented frame.",
      },
    ],
  },
  {
    id: "feedback",
    title: "Feedback",
    description:
      "Status surfaces. Each carries a redundant cue — icon or shape — alongside hue, so the signal survives colour-blindness.",
    entries: [
      { name: "Alert", summary: "Five status variants with a tinted surface, full-strength border and icon slot." },
      { name: "Badge", summary: "Eight variants: the four solid ones plus the brand and monospace tag tints." },
      {
        name: "Chip",
        summary: "Badge's operable counterpart — a link/button-shaped tag, optionally mono for versions.",
      },
      { name: "EmptyState", summary: "Icon, title, description and an action for a zero-result view." },
      { name: "Skeleton", summary: "Loading placeholder block." },
      { name: "Spinner", summary: "Indeterminate progress at three sizes, with an accessible label." },
      { name: "StatusDot", summary: "Five status colours, three sizes, optional glow and pulse." },
    ],
  },
  {
    id: "containment",
    title: "Containment",
    description: "Components that hold and organise other content.",
    entries: [
      { name: "Accordion", summary: "Vertically stacked disclosure sections." },
      { name: "Card", summary: "Surface with header, content, footer and action slots." },
      { name: "Collapsible", summary: "Single show/hide region driven by its own trigger." },
      {
        name: "IconTile",
        summary: "Rounded square that centres one icon; three sizes, muted or board-black ground, decorative.",
      },
      { name: "JsonTree", summary: "Expandable JSON viewer with per-type colouring and path selection." },
      { name: "MediaFrame", summary: "Framed figure for screenshots and media, with a caption/toolbar bar slot." },
      { name: "ScrollArea", summary: "Overflow container with a styled scrollbar." },
      { name: "Table", summary: "Data table with header, body, row and cell parts." },
      { name: "Tabs", summary: "Tab list plus panels." },
    ],
  },
  {
    id: "overlays",
    title: "Overlays",
    description:
      "Layered surfaces. All are rendered closed here — each demo shows the trigger, which is what the page actually lays out.",
    entries: [
      { name: "Dialog", summary: "Modal for focused editing, with header/footer slots." },
      { name: "AlertDialog", summary: "Confirmation modal with explicit cancel and action buttons." },
      { name: "Sheet", summary: "Edge-anchored panel; side is a prop." },
      {
        name: "Lightbox",
        summary: "Click-to-zoom media viewer on a near-black scrim; Esc, backdrop and chip all close.",
      },
      { name: "Popover", summary: "Non-modal floating panel anchored to its trigger." },
      { name: "DropdownMenu", summary: "Menu with groups, separators, shortcuts, submenus and checkbox items." },
      { name: "Tooltip", summary: "Hover/focus label; needs a TooltipProvider ancestor." },
    ],
  },
  {
    id: "chrome",
    title: "App chrome",
    description: "The application frame — branding, navigation and page scaffolding that FiestaBoard assembles.",
    entries: [
      { name: "FiestaLogo", summary: "Wordmark lockup at two sizes." },
      { name: "FiestaIcon", summary: "Square app icon; its palette is exposed as CSS variables." },
      { name: "BoardIcon", summary: "Split-flap glyph used to stand in for a board." },
      { name: "BoardSelector", summary: "Board switcher for the sidebar, with a collapsed rail form." },
      { name: "LanguageSelector", summary: "Locale picker." },
      { name: "ThemeToggle", summary: "Light/dark switch; the app owns the theme state." },
      { name: "PageHeader", summary: "Page title, gradient-stroked icon, description and an action slot." },
      { name: "PageToolbar", summary: "Left/right toolbar row that sits under a PageHeader." },
      {
        name: "PageInset",
        summary: "Puts bare body content — a tab strip, a caption — on the same column as the page title.",
      },
      { name: "PageLayout", summary: "Page container — max width, responsive padding, optional viewport pinning." },
      { name: "SkipToContent", summary: "Keyboard-only skip link; visible on focus." },
      {
        name: "Breadcrumb",
        summary: "WAI-ARIA breadcrumb trail — nav > ol with link, separator, ellipsis and current-page parts.",
      },
      {
        name: "NavList",
        summary: "Vertical nav list — aria-current rows and collapsible sections, for a rail, a menu or a TOC.",
      },
      { name: "Sidebar", summary: "Primary navigation rail — fixed-positioned, so shown in its own story." },
      { name: "MainContent", summary: "The <main> landmark and its sidebar-aware offset — shown in its own story." },
    ],
  },
  {
    id: "board",
    title: "Board preview",
    description:
      "The split-flap renderer. Messages use the board's own markup: lines split on \\n, colours as {red}…{/red} or raw {63}–{70} tile codes.",
    entries: [
      { name: "StaticBoardDisplay", summary: "The unscaled primitive — a real tile grid at sm/md/lg." },
      { name: "ScaledBoardDisplay", summary: "StaticBoardDisplay scaled to fit a slot narrower than the board." },
      { name: "BoardDisplay", summary: "The animated display, with flap cascade and a live region." },
      { name: "BoardBackdrop", summary: "A field of split-flap rows used as a page backdrop." },
      { name: "BoardTeaser", summary: "One-line teaser strip for cards and lists." },
    ],
  },
  {
    id: "data",
    title: "Data",
    description:
      "Derived metrics rendered for reading. Distinct from Feedback, which is the system reporting on itself — these display the user's numbers.",
    entries: [
      { name: "StatStrip", summary: "Inline row of big-number stats — a description list with an opt-in brand tone." },
      { name: "StatStripItem", summary: "One value/label pair, for composing a strip with custom value markup." },
      {
        name: "BarList",
        summary: "Ranked label/track/fill/value rows — a thin cousin of a meter; the value text carries the data.",
      },
    ],
  },
  {
    id: "plugin",
    title: "Plugin directory",
    description: "How a plugin is advertised — on a card in the directory, and on its detail page.",
    entries: [
      { name: "PluginCard", summary: "Directory card: name, author, category and an optional board teaser." },
      { name: "PluginCategoryBadge", summary: "Category pill, one colour per category." },
      { name: "BoardShowcase", summary: "Tabbed board previews for a plugin's detail page." },
      { name: "ScaledBoardTeaser", summary: "Teaser strip that scales to its container." },
    ],
  },
  {
    id: "editor",
    title: "Template editor",
    description:
      "The TipTap-backed authoring surface for board templates. Consumers must also import `@fiestaboard/ui/editor.css` — the package does not import it at runtime.",
    entries: [
      {
        name: "TemplateEditor",
        summary: "The editor: line gutter, variable/colour nodes, alignment and wrap controls.",
      },
      { name: "TemplateEditorToolbar", summary: "The editor's toolbar, usable standalone above your own instance." },
      { name: "ToolbarDropdown", summary: "The popover shell the toolbar's pickers are mounted in." },
      { name: "VariablePickerContent", summary: "Plugin variables, grouped by plugin with previews." },
      {
        name: "ColorPickerContent",
        summary: "The board's eight hardware tile colours, plus the code-62 flap character.",
      },
      { name: "FormattingPickerContent", summary: "Layout tokens — centre, fill space." },
      { name: "FilterPickerContent", summary: "Filters applied to the selected variable node." },
      { name: "DrawCharPickerContent", summary: "Brush picker for draw mode — colours, characters and the eraser." },
    ],
  },
  {
    id: "wizard",
    title: "Setup wizard",
    description:
      "The full-screen shell for a multi-step first-run flow. Presentational only — step order, validation and persistence stay with the consumer.",
    entries: [
      { name: "WizardShell", summary: "Overlay, card, header, progress and footer slots for a setup flow." },
      { name: "WizardProgress", summary: "Segmented step indicator with labels and aria-current." },
    ],
  },
  {
    id: "motion",
    title: "Motion & effects",
    description:
      "Continuously animated components. These render in the MotionAndEffects story rather than here: a free-running animation lands every screenshot on a different frame, which would make the whole inventory page impossible to diff.",
    entries: [{ name: "FadeContent", summary: "Fades its children in on mount or on view.", animated: true }],
  },
] as const satisfies readonly InventorySection[];

/** Every name in the inventory — the key space `DEMOS` must cover exactly. */
export type InventoryName = (typeof INVENTORY)[number]["entries"][number]["name"];

/**
 * `INVENTORY` widened back to its declared type.
 *
 * `as const satisfies` is what makes `InventoryName` a union of literals, but
 * it also narrows each entry to exactly the keys it wrote — so `entry.animated`
 * is a type error on any entry that omitted it. Consumers that iterate the
 * inventory want the declared shape, not the narrowed one; consumers that want
 * the literal names use `InventoryName`. Both stay available.
 */
export const INVENTORY_SECTIONS: readonly InventorySection[] = INVENTORY;

/** Flattened view, for the stories and the coverage test. */
export const INVENTORY_ENTRIES: readonly InventoryEntry[] = INVENTORY_SECTIONS.flatMap((section) => section.entries);
