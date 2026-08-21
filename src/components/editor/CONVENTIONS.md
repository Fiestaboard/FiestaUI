# Editor group — porting conventions

Notes for the agents porting the remaining layers of `tiptap-template-editor`
out of the FiestaBoard app. The pure layer (constants, extensions, utils) is
done and establishes the patterns below. **Follow them exactly** so the group
reads as one component, not five ports.

Source of truth being ported from (read-only):
`FiestaBoard/.wt-audit/web/src/components/tiptap-template-editor/`

---

## 1. File layout

```
src/components/editor/
  CONVENTIONS.md          ← this file
  constants.ts            ← group root, NOT utils/ (see note)
  extensions/             ← TipTap Node/Extension definitions (schema only)
    color-tile-node.ts  fill-space-node.ts  formula-node.ts
    line-navigation.ts  single-paragraph-doc.ts  trailing-newline.ts
    variable-node.ts    wrapped-text-node.ts
  utils/                  ← pure functions, no React
    draw-mode.ts  insertion.ts  length-calculator.ts
    serialization.ts  stroke-transaction.ts
  node-views/             ← YOU: ReactNodeViewRenderer components (.tsx)
  <component>.tsx         ← YOU: toolbar, pickers, panel, the editor itself
  <component>.stories.tsx ← co-located, title "Editor/<ComponentName>"
```

- The app's `utils/constants.ts` lives at **`editor/constants.ts`**, one level
  up. It is shared by `extensions/`, `utils/` and the components, so it is not
  any one of their private business. Import it as `../constants` from a
  subdirectory, `./constants` from the group root.
- Filenames are kebab-case; **exported symbols keep their PascalCase names.**
  `color-tile-node-view.tsx` exports `ColorTileNodeView`.
- Do not add an `index.ts` barrel to this group. `src/index.ts` is owned by a
  later phase; import siblings by relative path.
- `"use client"` on every `.tsx`, and on any `.ts` that pulls in
  `@tiptap/react` (the five node-backed extensions already have it).

### Node-view filenames the extensions already import

`extensions/*.ts` are ported and already reference these paths. Create them
with exactly these names or the group will not compile:

| Extension            | expects                              | exporting           |
| -------------------- | ------------------------------------ | ------------------- |
| color-tile-node.ts   | `../node-views/color-tile-node-view` | `ColorTileNodeView` |
| fill-space-node.ts   | `../node-views/fill-space-node-view` | `FillSpaceNodeView` |
| formula-node.ts      | `../node-views/formula-node-view`    | `FormulaNodeView`   |
| variable-node.ts     | `../node-views/variable-node-view`   | `VariableNodeView`  |
| wrapped-text-node.ts | `../node-views/wrapped-text-view`    | `WrappedTextView`   |

---

## 2. Label props (replaces `useTranslations`)

There is no i18n library in this package. Every user-visible string is an
optional prop with an English default, following `BoardShowcase` in
`src/components/plugin/board-showcase.tsx` — that is the reference
implementation, not `Sidebar` (whose `labels` is required; ours are not).

**The pattern, exactly:**

```ts
export interface ColorPickerLabels {
  /** Accessible name for the color grid. */
  colors: string;
  clearColor: string;
}

export const DEFAULT_COLOR_PICKER_LABELS: ColorPickerLabels = {
  colors: "Colors",
  clearColor: "Clear color",
};

export interface ColorPickerContentProps {
  // …
  labels?: Partial<ColorPickerLabels>;
}

export function ColorPickerContent({ labels, ...rest }: ColorPickerContentProps) {
  const l = { ...DEFAULT_COLOR_PICKER_LABELS, ...labels };
  return <span>{l.clearColor}</span>;
}
```

Rules:

- Prop is always named **`labels`**, always **`Partial<XLabels>`**, always
  optional. Never a required `labels`, never individual `fooLabel` string props.
- The merged object is always destructured to **`const l = { ...DEFAULT_X_LABELS, ...labels }`**.
  Use `l.foo` in JSX. One-letter name is intentional — it keeps the JSX diff
  against the app's `t("foo")` calls readable.
- Interface `XLabels`, constant `DEFAULT_X_LABELS`, both **exported** (apps need
  the type to build a translated object, and the defaults to spread over).
- Keys are camelCase and match the app's translation keys 1:1, so the FiestaBoard
  side can map its message catalog across mechanically.
- One `XLabels` interface per app `useTranslations(...)` namespace. The five in
  the source map to:

  | app namespace      | interface                | component                       |
  | ------------------ | ------------------------ | ------------------------------- |
  | `templateEditor`   | `TemplateEditorLabels`   | editor + toolbar + color picker |
  | `variablePicker`   | `VariablePickerLabels`   | variable-picker-content         |
  | `filterPicker`     | `FilterPickerLabels`     | filter-picker-content           |
  | `formattingPicker` | `FormattingPickerLabels` | formatting-picker-content       |
  | `formulaEditor`    | `FormulaEditorLabels`    | formula-editor-panel            |

- Interpolated strings (`t("overflowBy", { n })`) become a **function-valued
  label**: `overflowBy: (n: number) => string`, defaulting to
  ``(n) => `${n} over`` ``. Do not concatenate label fragments in JSX.
- A parent that renders a child owning its own labels passes `labels` straight
  through; do not flatten a child's labels into the parent's interface.

---

## 3. Data props (replaces `@/lib/api` + `@tanstack/react-query`)

No data fetching in this package. Every `useQuery` in the source becomes a prop
the app passes in already-resolved. Names are fixed:

| app call                   | prop                 | type                             | loading flag          |
| -------------------------- | -------------------- | -------------------------------- | --------------------- |
| `api.getTemplateVariables` | `templateVariables`  | `TemplateVariables`              | `isLoadingVariables?` |
| `api.getPluginManifest`    | `pluginManifests`    | `Record<string, PluginManifest>` | `isLoadingManifests?` |
| `api.getFormulaFunctions`  | `formulaFunctions`   | `FormulaFunction[]`              | `isLoadingFunctions?` |
| `api.getDisplaysRawBatch`  | `displayPreviews`    | `Record<string, string>`         | `isLoadingPreviews?`  |
| `api.validateTemplate`     | `onValidateTemplate` | `(template: string) => void`     | `validation?`         |

Rules:

- **Data in, events out.** Anything the app must _do_ is a callback named
  `on<Verb>` (`onChange`, `onValidateTemplate`, `onInsertVariable`). Anything
  the app must _supply_ is a plain noun prop. Never a fetcher function prop —
  the component must not decide when to fetch.
- Loading is a **`isLoading*` boolean prop**, never inferred from
  `data === undefined`. Render `Skeleton` from `../feedback/skeleton` while true.
- Types that came from `@/lib/api` (`PluginManifest`, `TemplateVariables`,
  `DeviceType`) get **structural interfaces declared locally** in the component
  that needs them, exported so the app can check its own objects against them.
  Exception: `DeviceType` — use FiestaUI's, re-exported from `./constants`.
  Note it is `"flagship" | "note" | "note_array"`, wider than the app's
  two-member union, so any `switch` on it needs a `note_array` arm or a default.
- App components (`HomeAssistantEntityPicker`) become **render-prop slots**:
  `renderEntityPicker?: (ctx: { value: string; onChange: (v: string) => void }) => React.ReactNode`.
  Omitted slot renders nothing — never a placeholder or a "coming soon".
- A panel whose data is only needed once it opens may _also_ be offered as an
  **optional** slot, with the resolved-data path kept as the default:
  `FormulaEditorPanel.renderVariablePicker` and
  `TemplateEditorToolbar.renderVariablePicker` both take
  `(ctx: { onInsert: (variable: string) => void }) => React.ReactNode`. The
  component keeps the trigger, the open state, the empty/disabled state and the
  insertion plumbing; only the body moves. That is what lets a host fetch (and
  import an icon set) inside the same lazy chunk the body lives in instead of at
  editor-mount time. Omitting the slot must leave existing behaviour untouched.

---

## 4. What the pure layer already decided

Read these before writing a component; several are deliberate renames and you
will get a compile error if you assume the app's names.

- **`BOARD_WIDTH` / `BOARD_LINES` are gone.** They were module-level flagship
  constants that silently hard-coded 22×6 even when editing a Note. Replaced by
  `DEFAULT_BOARD_WIDTH` / `DEFAULT_BOARD_LINES` in `./constants`, which you
  should reach for **only** when no device is known. Anything that knows its
  device resolves geometry with `resolveDimensions(deviceType)` and passes
  `.cols` / `.rows` down explicitly.
- **`willOverflow` / `getOverflowAmount` now take `boardWidth` as a required
  second argument** (`length-calculator.ts`). This is the fix that motivated the
  rename above. `parseTemplateSimple` / `serializeTemplateSimple` still take
  `maxLines` as an optional second arg, now defaulting to `DEFAULT_BOARD_LINES`.
- **`BOARD_COLORS` means hex, not codes.** FiestaUI's `lib/board-colors` already
  owns `BOARD_COLORS` as name → hex. The app's name → numeric-code map is
  exported from `./constants` as **`BOARD_COLOR_CODES`**, with
  `BOARD_CODE_TO_COLOR` for the inverse. The app's `FIESTABOARD_COLORS` import
  becomes `BOARD_COLORS`; `getBoardColor` / `AVAILABLE_COLORS` / `COLOR_DISPLAY`
  come from `../../lib/board-colors` directly.
- **`BoardColorToken` vs `BoardColorName`.** `BoardColorName` is the 8-color
  hardware palette. `BoardColorToken` adds the `"purple"` alias that template
  authors may type. Use the token type at parse boundaries, the name type for
  anything that renders a swatch.
- **`CURSOR_ANCHOR` (U+200B) is exported from `./constants`.** The app declared
  it three separate times with "mirroring serialization.ts" comments. Import it;
  do not retype `"​"`, and never paste a literal zero-width space into a
  source file.
- **`DRAW_CHARS` is derived from `BOARD_CHARS`**, not hand-listed
  (`draw-mode.ts`). Verified byte-identical to the app's list (56 chars).
- **Color lookups use `Object.hasOwn`, not `in`.** `"{{toString}}"` must not
  parse as a color — same reasoning as the null-prototype note in
  `lib/board-colors.ts`. Keep this if you write another lookup.

---

## 5. Comments are contracts

Preserve every explanatory comment that documents **why**: hardware parity, the
ZWS caret handling and its Safari `domFromPos` rationale, uppercase coercion,
and the `engine.py _count_tiles()` parity note. They are the reason the port is
correct. Delete a "what" comment freely; never delete a "why" one.

---

## 6. Known gaps this phase could not close

- **`@tiptap/*` is not in `package.json` yet.** Nothing in this group
  typechecks until the phase that owns `package.json` adds `@tiptap/core`,
  `@tiptap/react`, `@tiptap/pm`, and `@tiptap/starter-kit` (or the individual
  extensions `TipTapTemplateEditor.tsx` pulls in). They must be `peerDependencies`
  - `devDependencies`, not `dependencies` — this package is dependency-light and
    the host app owns the editor runtime.
- The five node-backed extensions import from `../node-views/*`, which does not
  exist yet. This is expected; see the table in §1.
