/**
 * FormulaEditorPanel — tabbed formula expression editor.
 *
 * Used in two contexts:
 *  1. Toolbar "Formulas" button  (mode="create") — Confirm button reads "Insert"
 *  2. Formula pill click          (mode="edit")   — Confirm button reads "Done", Cancel shown
 *
 * Tabs:
 *  - Functions: collapsible, by category — click scaffolds NAME() into the input
 *  - Variables: injected `renderVariablePicker` slot — click inserts a bare token at the cursor
 *
 * PORTING NOTE — this component lives in its own `formula/` subdirectory
 * because it is the only part of the editor group that pulls in CodeMirror
 * (`@codemirror/{commands,language,state,view}` + `@lezer/highlight`, ~140 kB).
 * Keeping it behind a subpath import means an app that only needs the plain
 * template editor never pays for the code editor. Do not re-export it from a
 * barrel that the rest of the editor group imports.
 */
"use client";

import { history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Hash,
  Loader2,
  type LucideIcon,
  Palette,
  Type as TypeIcon,
  XCircle,
} from "lucide-react";
import { type ReactNode, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "../../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../containment/tabs";
import { Skeleton } from "../../feedback/skeleton";
import { Button } from "../../forms/button";
import { Box } from "../../layout/box";
import { Flex } from "../../layout/flex";
import { Stack } from "../../layout/stack";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";

// ─── Formula pretty-printer ────────────────────────────────────────────────────

/** Expand a flat expression to a multi-line, indented string for display. */
function formatFormula(expr: string): string {
  let result = "";
  let depth = 0;
  let inString = false;
  let skipSpaces = false;
  const IND = "  ";

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    if (inString) {
      result += ch;
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      skipSpaces = false;
      result += ch;
      continue;
    }

    if (skipSpaces && ch === " ") continue;
    skipSpaces = false;

    if (ch === "(") {
      depth++;
      result += "(\n" + IND.repeat(depth);
      skipSpaces = true;
    } else if (ch === ")") {
      depth--;
      result += "\n" + IND.repeat(depth) + ")";
    } else if (ch === ",") {
      result += ",\n" + IND.repeat(depth);
      skipSpaces = true;
    } else {
      result += ch;
    }
  }

  return result.trim();
}

/** Collapse a formatted expression back to a flat single-line string. */
function unformatFormula(str: string): string {
  let result = "";
  let inString = false;
  let prevWasNewline = false;

  for (const ch of str) {
    if (inString) {
      result += ch;
      if (ch === '"') inString = false;
      prevWasNewline = false;
    } else if (ch === '"') {
      inString = true;
      result += ch;
      prevWasNewline = false;
    } else if (ch === "\n") {
      prevWasNewline = true;
    } else if (ch === " " && prevWasNewline) {
      // skip indentation spaces after newlines
    } else {
      result += ch;
      prevWasNewline = false;
    }
  }

  return result.trim();
}

// ─── CodeMirror language + theme ──────────────────────────────────────────────

const formulaStreamLang = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/"[^"]*"/)) return "string";
    if (stream.match(/\d+\.?\d*/)) return "number";
    // Lowercase variable path (e.g. date_time.hour, weather.temperature)
    if (stream.match(/[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*/)) return "variable";
    // Function name (uppercase, e.g. IF, COLOR, AND)
    if (stream.match(/[A-Z][A-Z0-9_]*/)) return "function";
    // Comparison + arithmetic operators
    if (stream.match(/[<>]=?|[!=]=|[+\-*/]/)) return "operator";
    // Parens and commas
    if (stream.match(/[(),]/)) return "punctuation";
    stream.next();
    return null;
  },
  tokenTable: {
    string: tags.string,
    number: tags.number,
    variable: tags.variableName,
    function: tags.keyword,
    operator: tags.operator,
    punctuation: tags.punctuation,
  },
});

/**
 * Syntax colours are read from custom properties rather than baked in as the
 * literal hexes the app used, for two reasons:
 *
 *  1. The app's values (violet-500/green-600/orange-600/sky-600) were picked
 *     against a light editor surface. FiestaUI ships a real dark theme where
 *     sky-600 on `--background` (oklch .13) lands near 3:1 — under the 4.5:1
 *     this package holds body text to. The `.dark &` block below re-points the
 *     same four roles at the 400-weight shades, which clear it.
 *  2. A host that wants its own formula palette can override the four
 *     properties from its own CSS instead of forking this file.
 *
 * These are deliberately NOT the package's semantic tokens: `--success` etc.
 * mean "this operation worked", not "this token is a string literal", and
 * FiestaUI does not (yet) ship a designed syntax ramp — see the #173 note in
 * theme.css about not shipping a palette the design system has not designed.
 */
const formulaHighlighter = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--fiesta-formula-function)", fontWeight: "600" }, // functions — violet
  { tag: tags.string, color: "var(--fiesta-formula-string)" }, // strings   — green
  { tag: tags.number, color: "var(--fiesta-formula-number)" }, // numbers   — orange
  { tag: tags.variableName, color: "var(--fiesta-formula-variable)" }, // variables — sky
  { tag: tags.operator, color: "var(--muted-foreground)" },
  { tag: tags.punctuation, color: "var(--muted-foreground)" },
]);

/**
 * PORTING NOTE — every colour here was `hsl(var(--token))` in the app, which
 * is a shadcn-ism: that codebase stores its tokens as bare HSL channel
 * triplets. FiestaUI's theme.css stores complete `oklch(...)` colours, so
 * wrapping them in `hsl()` yields an invalid declaration and the editor
 * renders with UA defaults (black-on-white in dark mode). The tokens are used
 * directly instead — do not re-add the `hsl()` wrapper.
 */
const formulaBaseTheme = EditorView.theme({
  "&": {
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
    background: "var(--background)",
    height: "100%",
    "--fiesta-formula-function": "#8b5cf6",
    "--fiesta-formula-string": "#16a34a",
    "--fiesta-formula-number": "#ea580c",
    "--fiesta-formula-variable": "#0284c7",
  },
  // FiestaUI's dark mode is class-based (`@custom-variant dark (&:is(.dark *))`),
  // so this mirrors it rather than using `prefers-color-scheme` — a page pinned
  // to dark by class must recolour even when the OS is in light mode.
  ".dark &": {
    "--fiesta-formula-function": "#a78bfa",
    "--fiesta-formula-string": "#4ade80",
    "--fiesta-formula-number": "#fb923c",
    "--fiesta-formula-variable": "#38bdf8",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    padding: "0.375rem 0.625rem",
    caretColor: "var(--foreground)",
    color: "var(--foreground)",
    minHeight: "5rem",
  },
  ".cm-focused": { outline: "none" },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-selectionBackground": {
    background: "var(--muted) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    background: "var(--accent) !important",
  },
  ".cm-gutters": { display: "none" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
});

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["logic", "math", "text", "convert", "color"];

const CATEGORY_META: Record<string, { icon: LucideIcon; text: string; border: string }> = {
  logic: { icon: GitBranch, text: "text-violet-400", border: "border-l-violet-400/60" },
  math: { icon: Hash, text: "text-emerald-400", border: "border-l-emerald-400/60" },
  text: { icon: TypeIcon, text: "text-sky-400", border: "border-l-sky-400/60" },
  convert: { icon: ArrowLeftRight, text: "text-amber-400", border: "border-l-amber-400/60" },
  color: { icon: Palette, text: "text-pink-400", border: "border-l-pink-400/60" },
};

/**
 * Category names arrive from a server payload, so every lookup keyed by one
 * goes through `Object.hasOwn` — `"toString"` must resolve to "no metadata",
 * not to `Object.prototype.toString` (which React would then try to render).
 * Same reasoning as the null-prototype note in `lib/board-colors.ts`.
 */
function lookup<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

// ─── Data contracts (replace @/lib/api) ───────────────────────────────────────

/**
 * One built-in formula function, as the app's `getFormulaFunctions` describes
 * it. Declared structurally here so a host can type-check its own payload
 * without this package depending on the FiestaBoard API client.
 */
export interface FormulaFunction {
  /** Uppercase call name, e.g. `IF`. */
  name: string;
  /** Grouping key. The five FiestaBoard categories get an icon and an accent
   *  colour; anything else still renders, in a neutral group after them. */
  category: string;
  /** Human-readable call shape, e.g. `IF(cond, then, else)`. */
  signature: string;
  /** One-line description, shown in the hover tooltip. */
  summary: string;
}

/** Result of an injected expression validation round-trip. */
export interface FormulaValidationResult {
  valid: boolean;
  /** Message to show under the editor when `valid` is false. */
  error?: string;
}

// ─── Labels (replace useTranslations("formulaEditor")) ────────────────────────

export interface FormulaEditorLabels {
  /** Tab that lists the built-in functions. */
  functionsTab: string;
  /** Tab that hosts the injected variable picker. */
  variablesTab: string;
  /** Accessible name for the function-list loading placeholder. */
  loading: string;
  /** Field label above the CodeMirror input. */
  formulaExpression: string;
  /** Confirm button, `mode="create"`. */
  insert: string;
  /** Confirm button, `mode="edit"`. */
  done: string;
  /** Dismiss button when the panel opened empty. */
  cancel: string;
  /** Dismiss button when the panel opened on an existing formula. */
  close: string;
  categoryLogic: string;
  categoryMath: string;
  categoryText: string;
  categoryConversion: string;
  categoryColor: string;
}

export const DEFAULT_FORMULA_EDITOR_LABELS: FormulaEditorLabels = {
  functionsTab: "Functions",
  variablesTab: "Variables",
  loading: "Loading…",
  formulaExpression: "Formula expression",
  insert: "Insert",
  done: "Done",
  cancel: "Cancel",
  close: "Close",
  categoryLogic: "Logic",
  categoryMath: "Math",
  categoryText: "Text",
  categoryConversion: "Conversion",
  categoryColor: "Color",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FormulaEditorPanelProps {
  /**
   * Pre-populated expression body (no {{= }}). Used in edit mode.
   *
   * Read when the CodeMirror document is created, i.e. at mount: changing it
   * afterwards does not rewrite what the user is editing. To reopen the panel
   * on a different formula, give it a new `key`.
   */
  initialExpr?: string;
  /** "create" → Insert button; "edit" → Done button + Cancel */
  mode: "create" | "edit";
  /** Called with the bare expression when the user confirms. */
  onConfirm: (expr: string) => void;
  /** Called when the user cancels (edit mode only). */
  onCancel?: () => void;
  /**
   * Built-in function reference, already resolved by the host. Grouped by
   * `category` and sorted by name for display.
   */
  formulaFunctions?: FormulaFunction[];
  /** Show placeholders in the Functions tab while the host fetches. */
  isLoadingFunctions?: boolean;
  /**
   * Validates the **bare expression body** — no `{{=` / `}}` wrapper, already
   * trimmed. A host backed by a whole-template validator wraps it itself:
   * `validateExpression={(e) => api.validateTemplate(`{{= ${e} }}`)}`.
   *
   * Calls are debounced 300 ms and results for a stale expression are
   * discarded, so an implementation only has to be idempotent, not cancelable.
   *
   * Omitting it turns validation off entirely: the state indicator stays
   * blank and Confirm enables on any non-empty expression. That is deliberate
   * — a panel with no validator must not present a permanently disabled
   * Confirm button.
   */
  validateExpression?: (expr: string) => Promise<FormulaValidationResult>;
  /**
   * Renders the Variables tab. Omitted, the tab strip disappears and the panel
   * shows only functions — never a placeholder.
   *
   * A slot rather than a direct import of the group's `VariablePickerContent`:
   * that component pulls in lucide-react's full `icons` barrel, and injecting
   * it lets the host hand over the *same* lazy chunk its toolbar already
   * loaded instead of duplicating the barrel into this already
   * CodeMirror-heavy panel (FiestaBoard #1575). This panel wraps the slot in
   * its own `<Suspense>`, so a bare `lazy()` component can be passed straight
   * in.
   */
  renderVariablePicker?: (ctx: { onInsert: (variable: string) => void }) => ReactNode;
  labels?: Partial<FormulaEditorLabels>;
  className?: string;
}

/**
 * Invokes the `renderVariablePicker` slot from inside a child component
 * instead of from the panel's own render.
 *
 * `onInsert` has to reach into the imperative CodeMirror view through a ref,
 * and calling a ref-reading function *during render* is what
 * `react-hooks/refs` exists to stop — even though the slot only stores it as
 * an event handler. Handing it over as a JSX prop, the way any other handler
 * is passed, keeps the render-prop contract in `FormulaEditorPanelProps`
 * while staying honest about when the ref is read.
 */
function VariablePickerSlot({
  render,
  onInsert,
}: {
  render: (ctx: { onInsert: (variable: string) => void }) => ReactNode;
  onInsert: (variable: string) => void;
}) {
  return <>{render({ onInsert })}</>;
}

// ─── Confirm gate ─────────────────────────────────────────────────────────────

type ValidationState = "idle" | "validating" | "valid" | "invalid";

/**
 * Single source of truth for "is this expression confirmable", shared by the
 * button's disabled state, its click handler and the Mod-Enter keybinding —
 * which reads its inputs from refs, so it cannot reuse the rendered value.
 */
function canConfirm(
  expr: string,
  validationState: ValidationState,
  hasValidator: boolean,
  lastValidExpr: string | null,
): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  if (!hasValidator) return true;
  return validationState === "valid" && lastValidExpr === trimmed;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormulaEditorPanel({
  initialExpr = "",
  mode,
  onConfirm,
  onCancel,
  formulaFunctions,
  isLoadingFunctions = false,
  validateExpression,
  renderVariablePicker,
  labels,
  className,
}: FormulaEditorPanelProps) {
  const l = { ...DEFAULT_FORMULA_EDITOR_LABELS, ...labels };
  const categoryLabels: Record<string, string> = {
    logic: l.categoryLogic,
    math: l.categoryMath,
    text: l.categoryText,
    convert: l.categoryConversion,
    color: l.categoryColor,
  };

  const hasValidator = validateExpression !== undefined;
  const labelId = useId();

  const [expr, setExpr] = useState(initialExpr);
  const [validationState, setValidationState] = useState<ValidationState>(
    initialExpr && hasValidator ? "validating" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // CodeMirror refs
  const editorContainerRef = useRef<HTMLElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `expr` for the debounced validation callback below, which needs
  // to compare against the *latest* expression, not the one captured in its
  // closure. Refs may only be read/written outside of render (effects,
  // event handlers), so the mirror is synced in an effect rather than
  // assigned inline during render.
  const latestExprRef = useRef(expr);
  useEffect(() => {
    latestExprRef.current = expr;
  }, [expr]);

  // Mirrors the last expression that passed validation. Kept as a ref (not
  // state) because it's read from the CodeMirror Mod-Enter keybinding
  // below, whose closure is created once when the editor mounts and would
  // otherwise see a stale value; `lastValidExpr` state (below) is the
  // render-safe counterpart used for `isConfirmDisabled`.
  const lastValidExprRef = useRef<string | null>(null);
  const [lastValidExpr, setLastValidExpr] = useState<string | null>(null);

  // Always-current snapshot of state + injected props for use inside the
  // CodeMirror keybinding handlers, which are built once at mount. `onConfirm`
  // and `hasValidator` join `expr`/`validationState` here because they are now
  // props: a host that re-creates its handler on every render would otherwise
  // have Mod-Enter calling the version from first mount forever.
  const latestStateRef = useRef({ expr, validationState, hasValidator, onConfirm });
  useEffect(() => {
    latestStateRef.current = { expr, validationState, hasValidator, onConfirm };
  }, [expr, validationState, hasValidator, onConfirm]);

  // Mirror of the injected validator, so `scheduleValidation` can stay
  // identity-stable with an empty dep list. Without this, an inline
  // `validateExpression={(e) => …}` (the common case) would give
  // `scheduleValidation` a new identity every render and re-trigger the mount
  // effect below on each one, re-validating in a loop.
  const validateExpressionRef = useRef(validateExpression);
  useEffect(() => {
    validateExpressionRef.current = validateExpression;
  }, [validateExpression]);

  // ─── Debounced validation ─────────────────────────────────────────────────

  /**
   * Schedule the debounced round-trip to the validator. Contains no
   * synchronous state update, so it is safe to call from an effect.
   */
  const scheduleValidation = useCallback((expression: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = expression.trim();
    if (!trimmed) return;

    debounceRef.current = setTimeout(async () => {
      const validator = validateExpressionRef.current;
      if (!validator) return;
      if (latestExprRef.current.trim() !== trimmed) return;

      try {
        const result = await validator(trimmed);
        if (latestExprRef.current.trim() !== trimmed) return;

        if (result.valid) {
          lastValidExprRef.current = trimmed;
          setLastValidExpr(trimmed);
          setValidationState("valid");
          setError(null);
        } else {
          lastValidExprRef.current = null;
          setLastValidExpr(null);
          setValidationState("invalid");
          // Hosts backed by a whole-template validator get messages prefixed
          // "Formula …" because the backend is describing one token inside a
          // template. The field is already labelled as a formula, so the
          // prefix is noise here.
          setError(result.error ? result.error.replace(/^Formula\s+/, "") : null);
        }
      } catch {
        setValidationState("idle");
        setError(null);
      }
    }, 300);
  }, []);

  /**
   * Full validation pass for a new expression: flip the indicator immediately,
   * then schedule the round-trip. Called from the CodeMirror update handler —
   * the single funnel every doc change goes through — instead of from an
   * effect on `expr` (react-hooks/set-state-in-effect, FiestaBoard #1568).
   */
  const validate = useCallback(
    (expression: string) => {
      if (!expression.trim() || !hasValidator) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        lastValidExprRef.current = null;
        setLastValidExpr(null);
        setValidationState("idle");
        setError(null);
        return;
      }
      setValidationState("validating");
      scheduleValidation(expression);
    },
    [hasValidator, scheduleValidation],
  );

  // Same mount-closure problem as `latestStateRef`: the CodeMirror update
  // listener is built once, and `validate` changes identity when the host
  // adds or removes its validator.
  const validateRef = useRef(validate);
  useEffect(() => {
    validateRef.current = validate;
  }, [validate]);

  // Validate whatever the panel opened with. `validationState` already starts
  // at "validating" for a non-empty initialExpr, so only the round-trip half
  // is needed here — no synchronous state update in the effect body.
  useEffect(() => {
    scheduleValidation(initialExpr);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [initialExpr, scheduleValidation]);

  // ─── CodeMirror initialisation ────────────────────────────────────────────

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: formatFormula(initialExpr),
        extensions: [
          formulaStreamLang,
          syntaxHighlighting(formulaHighlighter),
          formulaBaseTheme,
          history(),
          EditorView.lineWrapping,
          // The contenteditable is the labelled control — a plain <label> has
          // nothing to point `for` at, so the field label is wired up here.
          EditorView.contentAttributes.of({ "aria-labelledby": labelId }),
          keymap.of([
            ...historyKeymap,
            indentWithTab,
            {
              key: "Mod-Enter",
              run: () => {
                const { expr: e, validationState: vs, hasValidator: hv, onConfirm: confirm } = latestStateRef.current;
                if (!canConfirm(e, vs, hv, lastValidExprRef.current)) return false;
                confirm(e.trim());
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const raw = unformatFormula(update.state.doc.toString());
            setExpr(raw);
            // Every path that changes the document — typing, the function
            // scaffold button, the variable picker — dispatches through here,
            // so this is the one place validation has to be kicked from.
            validateRef.current(raw);
          }),
          EditorView.domEventHandlers({
            // Prevent clicks inside the editor from bubbling up to the pill/editor
            mousedown: (e) => e.stopPropagation(),
          }),
        ],
      }),
      parent: editorContainerRef.current,
    });

    viewRef.current = view;
    view.focus();
    if (mode === "edit" && initialExpr) {
      view.dispatch({
        selection: { anchor: 0, head: view.state.doc.length },
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push external expr changes (function/variable clicks) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentRaw = unformatFormula(view.state.doc.toString());
    if (currentRaw === expr) return;

    const formatted = formatFormula(expr);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
      selection: { anchor: formatted.length },
    });
  }, [expr]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!canConfirm(expr, validationState, hasValidator, lastValidExpr)) return;
    onConfirm(expr.trim());
  };

  // Scaffold a function call into the editor. Replaces the whole document by
  // design: the Functions list is a starting point for a new formula, not an
  // insert-at-cursor palette (that is what the Variables tab is for).
  const handleFunctionClick = (name: string) => {
    const scaffold = `${name}()`;
    const view = viewRef.current;
    if (!view) return;

    const formatted = formatFormula(scaffold);
    // Place cursor on the inner line (between opening paren and closing paren)
    const firstNewline = formatted.indexOf("\n");
    const innerEnd = firstNewline >= 0 ? formatted.indexOf("\n", firstNewline + 1) : -1;
    const cursorPos = innerEnd >= 0 ? innerEnd : formatted.length;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
      selection: { anchor: cursorPos },
    });
    view.focus();
    setExpr(scaffold);
  };

  // Insert a variable token at the current cursor position in the editor
  const handleVariableInsert = (variable: string) => {
    const token = variable.replace(/^\{\{/, "").replace(/\}\}$/, "");
    const view = viewRef.current;
    if (!view) return;

    const cursor = view.state.selection.main.head;
    view.dispatch({
      changes: { from: cursor, to: cursor, insert: token },
      selection: { anchor: cursor + token.length },
    });
    view.focus();
    const raw = unformatFormula(view.state.doc.toString());
    setExpr(raw);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const isConfirmDisabled = !canConfirm(expr, validationState, hasValidator, lastValidExpr);

  // ─── Group functions by category ─────────────────────────────────────────

  // A Map, not a Record: the keys come from a server payload and must not be
  // able to collide with Object.prototype.
  const grouped = new Map<string, FormulaFunction[]>();
  for (const fn of formulaFunctions ?? []) {
    const bucket = grouped.get(fn.category);
    if (bucket) bucket.push(fn);
    else grouped.set(fn.category, [fn]);
  }
  for (const fns of grouped.values()) {
    fns.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Known categories in their designed order, then anything the backend has
  // added since. The app filtered to the known five, which silently hid a
  // whole category of new functions.
  const categories = [
    ...CATEGORY_ORDER.filter((cat) => grouped.get(cat)?.length),
    ...[...grouped.keys()].filter((cat) => !CATEGORY_ORDER.includes(cat)).sort((a, b) => a.localeCompare(b)),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      {/* Root: stacked on mobile, side-by-side on desktop */}
      <Flex
        data-slot="formula-editor-panel"
        direction="col"
        className={cn("sm:flex-row w-full sm:h-[560px]", className)}
      >
        {/* ── LEFT COLUMN (desktop) / BOTTOM (mobile): Functions + Variables selector ── */}
        <Box
          className={cn(
            "order-2 sm:order-1",
            "sm:w-[260px] sm:flex-shrink-0",
            "border-t sm:border-t-0 sm:border-r border-border",
            "sm:overflow-y-auto",
          )}
        >
          <Tabs defaultValue="functions">
            {/* Tab switcher — sticky on desktop so it stays visible while scrolling the list.
                Hidden when there is no variable picker to switch to. */}
            {renderVariablePicker && (
              <Box className="px-3 pt-2 pb-1 sm:sticky sm:top-0 sm:bg-popover sm:z-10 sm:border-b sm:border-border/50">
                <TabsList className="h-8 w-full bg-muted p-0.5">
                  <TabsTrigger
                    value="functions"
                    className="flex-1 h-full text-xs px-2 data-[active]:bg-background data-[active]:shadow-sm"
                  >
                    {l.functionsTab}
                  </TabsTrigger>
                  <TabsTrigger
                    value="variables"
                    className="flex-1 h-full text-xs px-2 data-[active]:bg-background data-[active]:shadow-sm"
                  >
                    {l.variablesTab}
                  </TabsTrigger>
                </TabsList>
              </Box>
            )}

            {/* ── Functions tab ── */}
            <TabsContent value="functions" className="mt-0">
              {isLoadingFunctions && (
                <Stack gap="1.5" className="px-3 py-2" role="status" aria-label={l.loading}>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </Stack>
              )}
              {/* Parent column (desktop) or modal (mobile) scrolls — don't nest a scroll here. */}
              <Stack gap="1" className="px-2 pb-2">
                {categories.map((cat) => {
                  const isCollapsed = collapsedCategories.has(cat);
                  const fns = grouped.get(cat) ?? [];
                  const meta = lookup(CATEGORY_META, cat);
                  const IconComp = meta?.icon;
                  const panelId = `${labelId}-cat-${cat}`;
                  return (
                    <Box key={cat} className={cn("overflow-hidden border-l-2", meta?.border ?? "border-border/0")}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        aria-expanded={!isCollapsed}
                        aria-controls={panelId}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-1.5 text-[11px] font-semibold transition-colors",
                          "bg-muted/40 hover:bg-muted/70",
                          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          meta?.text ?? "text-muted-foreground",
                        )}
                      >
                        {/* Carry the button's dynamic category color + sub-xs size
                            so <Text as="span">'s default tone/size don't clobber them. */}
                        <Text
                          as="span"
                          weight="semibold"
                          className={cn("flex items-center gap-1.5 text-[11px]", meta?.text ?? "text-muted-foreground")}
                        >
                          {IconComp && <IconComp className="w-3 h-3" />}
                          {lookup(categoryLabels, cat) ?? cat}
                        </Text>
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>

                      {!isCollapsed && (
                        <Box id={panelId} className="py-0.5">
                          {fns.map((fn) => (
                            <Tooltip key={fn.name}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleFunctionClick(fn.name)}
                                  className="w-full text-left px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-baseline gap-2 group outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                  <Text
                                    as="span"
                                    size="xs"
                                    weight="semibold"
                                    className="font-mono flex-shrink-0 group-hover:text-accent-foreground"
                                  >
                                    {fn.name}
                                  </Text>
                                  <Text
                                    as="span"
                                    tone="muted"
                                    className="font-mono text-[10px] truncate group-hover:text-accent-foreground/70"
                                  >
                                    {fn.signature}
                                  </Text>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px]">
                                <Text size="xs" weight="semibold" className="font-mono">
                                  {fn.signature}
                                </Text>
                                <Text size="xs" tone="muted" className="mt-0.5">
                                  {fn.summary}
                                </Text>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </TabsContent>

            {/* ── Variables tab ── */}
            {renderVariablePicker && (
              <TabsContent value="variables" className="mt-0">
                <Suspense
                  fallback={
                    <Box className="p-3 min-w-[300px]">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </Box>
                  }
                >
                  <VariablePickerSlot render={renderVariablePicker} onInsert={handleVariableInsert} />
                </Suspense>
              </TabsContent>
            )}
          </Tabs>
        </Box>

        {/* ── RIGHT COLUMN (desktop) / TOP (mobile): Expression editor + action buttons ── */}
        <Flex direction="col" className="order-1 sm:order-2 flex-1 min-w-0 sm:overflow-hidden">
          {/* Desktop: flex column fills, editor sizes within. Mobile: parent modal scrolls — no nested scroll. */}
          <Stack gap="1.5" className="px-3 pt-3 pb-2.5 sm:flex-1 sm:flex sm:flex-col sm:overflow-hidden">
            <Text
              as="span"
              id={labelId}
              tone="muted"
              weight="semibold"
              className="text-[10px] uppercase tracking-widest"
            >
              {l.formulaExpression}
            </Text>

            {/* Editor container — border changes colour with validation state */}
            <Box
              className={cn(
                "rounded-md border overflow-hidden sm:flex-1 sm:flex sm:flex-col sm:min-h-0",
                validationState === "invalid" && "border-destructive",
                validationState === "valid" && "border-success",
                validationState !== "invalid" && validationState !== "valid" && "border-border",
              )}
            >
              {/* Top chrome: {{= prefix + validation icon */}
              <Flex
                align="center"
                justify="between"
                className={cn(
                  "px-2.5 py-1 border-b sm:flex-shrink-0",
                  "bg-muted/20 select-none",
                  validationState === "invalid" && "border-destructive/40",
                  validationState === "valid" && "border-success/40",
                  validationState !== "invalid" && validationState !== "valid" && "border-border",
                )}
              >
                <Text as="span" className="text-[10px] text-muted-foreground/50 font-mono">
                  {"{{="}
                </Text>
                <Text as="span" className="flex items-center">
                  {validationState === "valid" && expr.trim() ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : validationState === "invalid" ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : validationState === "validating" ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground/50 animate-spin motion-reduce:animate-none" />
                  ) : null}
                </Text>
              </Flex>

              {/* CodeMirror mounts here */}
              <Box ref={editorContainerRef} className="sm:flex-1 sm:min-h-0 sm:overflow-hidden" />

              {/* Bottom chrome: }} */}
              <Box
                className={cn(
                  "px-2.5 py-1 border-t bg-muted/20 select-none sm:flex-shrink-0",
                  validationState === "invalid" && "border-destructive/40",
                  validationState === "valid" && "border-success/40",
                  validationState !== "invalid" && validationState !== "valid" && "border-border",
                )}
              >
                <Text as="span" className="text-[10px] text-muted-foreground/50 font-mono">
                  {"}}"}
                </Text>
              </Box>
            </Box>

            {/* Error message */}
            {validationState === "invalid" && error && (
              <Flex align="start" gap="1" role="alert" className="text-destructive">
                <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <Text as="span" tone="destructive" className="text-[10px]">
                  {error}
                </Text>
              </Flex>
            )}
          </Stack>

          {/* Action buttons — pinned to bottom of right column */}
          <Flex justify="end" gap="2" className="flex-shrink-0 border-t border-border px-3 py-2">
            {mode === "edit" && onCancel && (
              <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs">
                {initialExpr ? l.close : l.cancel}
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleConfirm} disabled={isConfirmDisabled} className="text-xs">
              {mode === "create" ? l.insert : l.done}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm text-[9px] font-sans opacity-60 bg-primary-foreground/20">
                ⌘↵
              </kbd>
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </TooltipProvider>
  );
}
