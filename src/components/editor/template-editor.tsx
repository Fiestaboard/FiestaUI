/**
 * Template Editor
 * Unified rich-text editor for FiestaBoard templates.
 * Supports variable line counts (6 for Flagship, 3 for Note) via boardLines prop.
 *
 * ─── REQUIRED STYLESHEET ─────────────────────────────────────────────────────
 * This component renders a ProseMirror surface whose inner DOM (the `<br>`
 * hard breaks, the node-view wrappers, the `::before` placeholder, the
 * `.selected-inline` range highlight) is created by ProseMirror, not by React,
 * so Tailwind utilities cannot reach it. Those rules live in a real stylesheet
 * that the package deliberately does NOT import at runtime — importing CSS
 * from a module would push the sheet into every consumer's bundle, including
 * apps that never render an editor. Consumers must import it once, next to
 * theme.css:
 *
 *   import "@fiestaboard/ui/theme.css";
 *   import "@fiestaboard/ui/editor.css";   // ← required by TemplateEditor
 *
 * Source: `src/styles/editor.css`. Without it the editor still works but
 * renders as unstyled proportional text with no placeholder, no caret colour
 * and no selection outline.
 *
 * Tailwind arbitrary-variant classes ([&_.ProseMirror]:…) stay inline below:
 * those DO reach their target through the editor's own container class.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PORTING NOTE — this is the FiestaBoard app's `TipTapTemplateEditor`, made
 * framework-agnostic: no i18n hook (see TemplateEditorLabels), no data
 * fetching, no app imports. The controlled contract (`value` / `onChange` plus
 * callbacks) and the imperative handle (applyStroke / undo / redo) are
 * unchanged. The exported names drop the `TipTap` prefix — TipTap is an
 * implementation detail, not part of the API.
 */
"use client";

import { closeHistory, undoDepth } from "@tiptap/pm/history";
import type { Slice } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ComponentProps } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import type { Code62Glyph } from "../../lib/board-characters";
import { cn } from "../../lib/utils";
import { Skeleton } from "../feedback/skeleton";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Stack } from "../layout/stack";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Text } from "../typography/text";
import type { DeviceType } from "./constants";
import { CURSOR_ANCHOR, DEFAULT_BOARD_LINES, DEFAULT_BOARD_WIDTH, resolveDimensions } from "./constants";
import { ColorTileNode } from "./extensions/color-tile-node";
import { FillSpaceNode } from "./extensions/fill-space-node";
import { FormulaNode } from "./extensions/formula-node";
import { LineNavigation } from "./extensions/line-navigation";
import { SingleParagraphDoc } from "./extensions/single-paragraph-doc";
import { TrailingNewline } from "./extensions/trailing-newline";
import { VariableNode } from "./extensions/variable-node";
import { WrappedTextNode } from "./extensions/wrapped-text-node";
import { TemplateEditorToolbar } from "./template-editor-toolbar";
import type { CellPaint, DrawBrush } from "./utils/draw-mode";
import { brushToCell } from "./utils/draw-mode";
import { parseLineContent, parseTemplateSimple, serializeTemplateSimple } from "./utils/serialization";
import { buildStrokeTransaction } from "./utils/stroke-transaction";

export type LineAlignment = "left" | "center" | "right";

/** A single painted board cell within a stroke, in row/col board coordinates. */
export interface StrokePaint {
  row: number;
  col: number;
}

/** Imperative handle exposed via ref for draw-mode's cell-painting flow. */
export interface TemplateEditorHandle {
  /** Applies one stroke as ONE undo step. Returns affected row indices. */
  applyStroke(paints: StrokePaint[], brush: DrawBrush): number[];
  undo(): void;
  redo(): void;
}

/**
 * Reported through onDrawHistoryEvent whenever an undo/redo crosses a
 * history step, on any path (imperative handle, keyboard, toolbar).
 * `stroke` is true when the step crossed was a draw-mode paint stroke
 * (applyStroke), so the host can restore/re-force per-row metadata that
 * lives outside the ProseMirror document.
 */
export interface DrawHistoryEvent {
  action: "undo" | "redo";
  stroke: boolean;
}

/**
 * User-visible strings, all optional with English defaults.
 *
 * Replaces the app's `useTranslations("templateEditor")`. Keys match that
 * namespace 1:1 so FiestaBoard can map its message catalog across
 * mechanically; interpolated messages (`t("lineCount", { used, max })`)
 * become function-valued labels rather than fragments concatenated in JSX,
 * so a translation can reorder its placeholders.
 *
 * This is the editor's own slice of that namespace. The toolbar and the
 * pickers own theirs (`TemplateEditorToolbarLabels`, …) and receive them
 * through `toolbarProps`, so each component's strings arrive with it.
 */
export interface TemplateEditorLabels {
  /** `{used} / {max} lines` */
  lineCount: (used: number, max: number) => string;
  /** Appended to lineCount when the template has more lines than the board. */
  overLineLimit: (max: number) => string;
  /** `(Line {line})` — 1-based. */
  currentLine: (line: number) => string;
  alignment: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  /**
   * Accessible name of the editing surface. Not in the app's catalog — the
   * app hard-coded an English `aria-label`, which is exactly the kind of
   * string a localizing consumer needs to be able to reach.
   */
  editorAriaLabel: string;
}

export const DEFAULT_TEMPLATE_EDITOR_LABELS: TemplateEditorLabels = {
  lineCount: (used, max) => `${used} / ${max} lines`,
  overLineLimit: (max) => ` — exceeds the ${max}-line board limit`,
  currentLine: (line) => `(Line ${line})`,
  alignment: "Alignment:",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  editorAriaLabel: "Template editor",
};

/**
 * Toolbar props the editor does not own itself: resolved data
 * (`templateVariables`, `pluginManifests`…), `isLoading*` flags, the entity
 * picker slot, and the toolbar's own `labels` plus the nested pickers'.
 * Forwarded verbatim, so the toolbar's data contract stays the toolbar's
 * business and this component never learns how to fetch anything.
 *
 * Derived from the toolbar's props rather than restated, so it cannot drift.
 * The editor-owned props (`editor`, alignment/wrap state, device, draw mode)
 * are omitted — the editor passes those itself, from its own state.
 */
export type TemplateEditorToolbarSlotProps = Omit<
  ComponentProps<typeof TemplateEditorToolbar>,
  | "editor"
  | "currentAlignment"
  | "currentWrapEnabled"
  | "onAlignmentChange"
  | "onWrapToggle"
  | "deviceType"
  | "code62Glyph"
  | "onSyncFromBoard"
  | "syncFromBoardPending"
  | "drawMode"
  | "onDrawModeToggle"
  | "drawBrush"
  | "onDrawBrushChange"
>;

/** Inline atom node types that this editor renders as click-targets. Excludes
 *  hardBreak so a click resolving to a line break doesn't jump the caret past it. */
const CUSTOM_INLINE_ATOMS = new Set(["variable", "colorTile", "fillSpace", "formula", "wrappedText"]);

/**
 * Serialize a TipTap slice to template string format
 * Used for clipboard operations (copy/paste/cut)
 */
function serializeSliceToTemplate(slice: Slice | null | undefined): string {
  try {
    if (!slice || !slice.content || slice.content.size === 0) {
      return "";
    }

    let text = "";

    // Iterate over the fragment using ProseMirror's forEach method
    slice.content.forEach((node) => {
      if (!node || !node.type) {
        return;
      }

      try {
        if (node.type.name === "text") {
          text += node.text || "";
        } else if (node.type.name === "variable") {
          const { pluginId, field, filters } = node.attrs || {};
          const filterStr =
            filters && filters.length > 0
              ? filters.map((f: { name: string; arg?: string }) => `|${f.name}${f.arg ? ":" + f.arg : ""}`).join("")
              : "";
          text += `{{${pluginId || ""}.${field || ""}${filterStr}}}`;
        } else if (node.type.name === "colorTile") {
          text += `{{${node.attrs?.color || ""}}}`;
        } else if (node.type.name === "fillSpace") {
          const repeatChar = node.attrs?.repeatChar;
          if (repeatChar && repeatChar !== " ") {
            text += `{{fill_space_repeat:${repeatChar}}}`;
          } else {
            text += `{{fill_space}}`;
          }
        } else if (node.type.name === "wrappedText") {
          text += `{{${node.attrs?.text || ""}|wrap}}`;
        } else if (node.type.name === "formula") {
          text += `{{= ${node.attrs?.expression || ""} }}`;
        } else if (node.type.name === "hardBreak") {
          text += "\n";
        }
      } catch (error) {
        console.warn("Error serializing node:", error);
      }
    });

    return text;
  } catch (error) {
    console.warn("Error in serializeSliceToTemplate:", error);
    return "";
  }
}

export interface TemplateEditorProps {
  value: string; // Template string with lines separated by \n
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  showAlignmentControls?: boolean;
  onLineAlignmentChange?: (lineIndex: number, alignment: LineAlignment) => void;
  lineAlignments?: LineAlignment[]; // Array of alignments per line
  onLineWrapChange?: (lineIndex: number, wrapEnabled: boolean) => void;
  lineWrapEnabled?: boolean[]; // Array of wrap states per line
  showToolbar?: boolean; // Show toolbar at top (default: true)
  /** Characters per line. Defaults to the `deviceType` grid, else 22 (flagship). */
  boardWidth?: number;
  /** Total lines. Defaults to the `deviceType` grid, else 6 (flagship). */
  boardLines?: number;
  onLineCountChange?: (lineCount: number) => void; // Reports current line count for validation
  deviceType?: DeviceType; // Device type for device-specific features
  /**
   * Which glyph the target board's code-62 flap draws. Forwarded to the
   * toolbar, and from there to the colour and draw-character pickers.
   *
   * It is a property of the individual board, not of the device family:
   * since 2026 some Flagships ship a heart flap in that slot, so nothing
   * queryable distinguishes them and only the owner knows
   * (FiestaBoard#1657, #1664). Unset means `"degree"` on Flagship hardware,
   * which is how every Flagship behaved before the change.
   */
  code62Glyph?: Code62Glyph;
  onSyncFromBoard?: () => void; // Callback to populate template from current board display
  syncFromBoardPending?: boolean; // True while the sync mutation is in flight
  drawMode?: boolean; // True while draw mode is active (collapses the editor, keeps toolbar)
  onDrawModeToggle?: () => void; // Toggle draw mode on/off
  drawBrush?: DrawBrush; // Currently selected draw brush (color, eraser, or stamp character)
  onDrawBrushChange?: (brush: DrawBrush) => void; // Change the draw brush
  onDrawHistoryEvent?: (event: DrawHistoryEvent) => void; // Undo/redo crossed a history step (stroke or not)
  /** The editor's own user-visible strings; merged over English defaults. */
  labels?: Partial<TemplateEditorLabels>;
  /**
   * Data, slots and labels forwarded to the built-in toolbar (including the
   * pickers it nests). Ignored when `showToolbar` is false.
   */
  toolbarProps?: TemplateEditorToolbarSlotProps;
}

/**
 * Single TipTap editor for template lines
 */
export const TemplateEditor = forwardRef<TemplateEditorHandle, TemplateEditorProps>(function TemplateEditor(
  {
    value,
    onChange,
    onFocus,
    placeholder = "Type text or insert variables...",
    className,
    showAlignmentControls = true,
    onLineAlignmentChange,
    lineAlignments,
    onLineWrapChange,
    lineWrapEnabled,
    showToolbar = true,
    boardWidth: boardWidthProp,
    boardLines: boardLinesProp,
    onLineCountChange,
    deviceType,
    code62Glyph,
    onSyncFromBoard,
    syncFromBoardPending = false,
    drawMode = false,
    onDrawModeToggle,
    drawBrush,
    onDrawBrushChange,
    onDrawHistoryEvent,
    labels,
    toolbarProps,
  },
  ref,
) {
  const l = { ...DEFAULT_TEMPLATE_EDITOR_LABELS, ...labels };

  // Board geometry. The app defaulted straight to the flagship 22×6 constants,
  // so an editor that had been told `deviceType="note"` still validated line
  // length and count against a Flagship grid. A component that knows its
  // device resolves its own geometry; explicit props still win, and are the
  // only way to describe a note_array (whose grid depends on how many notes
  // wide/tall the array is, which this component is not told).
  const deviceDimensions = deviceType ? resolveDimensions(deviceType) : null;
  const boardWidth = boardWidthProp ?? deviceDimensions?.cols ?? DEFAULT_BOARD_WIDTH;
  const boardLines = boardLinesProp ?? deviceDimensions?.rows ?? DEFAULT_BOARD_LINES;

  // Use device-aware defaults when props not provided
  const effectiveAlignments = lineAlignments || Array.from({ length: boardLines }, () => "left" as LineAlignment);
  const effectiveWrapEnabled = lineWrapEnabled || Array.from({ length: boardLines }, () => false);
  // Track if we're manually updating wrap to prevent onChange from overwriting state
  const isUpdatingWrap = useRef(false);

  // Store editor ref for use in handlers
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  // Track drag state to handle moves properly
  const dragStateRef = useRef<{ from: number; to: number } | null>(null);
  // Track line count for validation display
  const [editorLineCount, setEditorLineCount] = useState(() => (value || "").split("\n").length);
  // Actual rendered pixel height of each board line (for gutter alignment)
  const [lineHeights, setLineHeights] = useState<number[]>(() => Array.from({ length: boardLines }, () => 24));
  const measureScheduledRef = useRef(false);
  // Ref so onUpdate/onCreate (closed over at mount) can call the latest scheduleMeasure
  const scheduleMeasureRef = useRef<(() => void) | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      SingleParagraphDoc,
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
        bold: false,
        italic: false,
        strike: false,
        document: false, // Using SingleParagraphDoc instead to prevent splitBlock
        // text / paragraph / hardBreak / undo-redo are on by default in
        // StarterKit v3 — the option value only exists to switch them off.
      }),
      VariableNode,
      ColorTileNode,
      FillSpaceNode,
      FormulaNode,
      WrappedTextNode,
      LineNavigation,
      TrailingNewline,
    ],
    content: parseTemplateSimple(value || "", boardLines),
    editorProps: {
      attributes: {
        class: cn(
          "w-full font-mono text-sm",
          "prose prose-sm max-w-none",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:font-mono",
          "[&_.ProseMirror]:text-sm",
          "[&_.ProseMirror]:resize-none",
          "[&_.ProseMirror]:uppercase", // Visual uppercase display
          "[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-tight",
          "[&_.ProseMirror_p]:min-h-[1.5rem]",
          className,
        ),
        // These attributes are read once, when the ProseMirror view is
        // created; TipTap does not re-run this config on re-render. Changing
        // `placeholder` or `labels` after mount therefore does not update
        // them — same behaviour as the app, whose `t` was captured here too.
        "data-placeholder": placeholder,
        role: "textbox",
        "aria-label": l.editorAriaLabel,
        "aria-multiline": "true",
      },
      handleKeyDown: (view, event) => {
        // Enter: insert a hardBreak directly via ProseMirror's view.
        // This runs BEFORE any plugin keymap, so it's the most reliable
        // place to intercept Enter and prevent splitBlock from firing.
        if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) return true; // block Shift-Enter
          const hardBreakType = view.state.schema.nodes.hardBreak;
          if (hardBreakType) {
            view.dispatch(view.state.tr.replaceSelectionWith(hardBreakType.create()).scrollIntoView());
          }
          return true;
        }

        // Backspace / Delete: skip over invisible ZWS (zero-width space)
        // cursor-anchors so they feel transparent. At line boundaries this
        // collapses [trailing ZWS] + <hardBreak> + [leading ZWS] into a
        // single keystroke merge. Also prevents the TrailingNewline plugin
        // from endlessly re-adding ZWS when backspacing an empty last line.
        // The caret anchor (U+200B) and ProseMirror's atom-node placeholder
        // (U+FFFC). Escapes, never literal characters: both are invisible in an
        // editor and a stray copy is undetectable by eye. ZWS is the same
        // anchor serialization.ts writes — one source of truth.
        const ZWS = CURSOR_ANCHOR;
        const OBJ = "\uFFFC";

        if (event.key === "Backspace" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          if (!selection.empty) return false;

          const pos = selection.$from.pos;
          const pStart = selection.$from.start();
          if (pos <= pStart) return false;

          if (state.doc.textBetween(pos - 1, pos, undefined, OBJ) !== ZWS) return false;

          let from = pos - 1;
          while (from > pStart && state.doc.textBetween(from - 1, from, undefined, OBJ) === ZWS) from--;

          const $from = state.doc.resolve(from);
          const nb = $from.nodeBefore;

          if (nb?.type.name === "hardBreak") {
            from -= nb.nodeSize;
            while (from > pStart && state.doc.textBetween(from - 1, from, undefined, OBJ) === ZWS) from--;
            let to = pos;
            const pEnd = selection.$from.end();
            while (to < pEnd && state.doc.textBetween(to, to + 1, undefined, OBJ) === ZWS) to++;
            view.dispatch(state.tr.delete(from, to).scrollIntoView());
            return true;
          }

          if (from <= pStart) return true;

          if (nb?.isAtom) {
            view.dispatch(state.tr.delete(from - nb.nodeSize, pos).scrollIntoView());
            return true;
          }

          view.dispatch(state.tr.delete(from - 1, pos).scrollIntoView());
          return true;
        }

        if (event.key === "Delete" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          if (!selection.empty) return false;

          const pos = selection.$from.pos;
          const pEnd = selection.$from.end();
          if (pos >= pEnd) return false;

          if (state.doc.textBetween(pos, pos + 1, undefined, OBJ) !== ZWS) return false;

          let to = pos + 1;
          while (to < pEnd && state.doc.textBetween(to, to + 1, undefined, OBJ) === ZWS) to++;

          const $to = state.doc.resolve(to);
          const na = $to.nodeAfter;

          if (na?.type.name === "hardBreak") {
            to += na.nodeSize;
            while (to < pEnd && state.doc.textBetween(to, to + 1, undefined, OBJ) === ZWS) to++;
            let from2 = pos;
            const pStart = selection.$from.start();
            while (from2 > pStart && state.doc.textBetween(from2 - 1, from2, undefined, OBJ) === ZWS) from2--;
            view.dispatch(state.tr.delete(from2, to).scrollIntoView());
            return true;
          }

          if (to >= pEnd) return true;

          if (na?.isAtom) {
            view.dispatch(state.tr.delete(pos, to + na.nodeSize).scrollIntoView());
            return true;
          }

          view.dispatch(state.tr.delete(pos, to + 1).scrollIntoView());
          return true;
        }

        // ArrowLeft / ArrowRight: jump over the invisible ZWS anchors that
        // sandwich every atom node so the cursor doesn't appear to "pause"
        // on a zero-width position. We take one step in the arrow direction,
        // then keep skipping while the just-traversed character is ZWS — the
        // first non-ZWS step is what makes visual progress, so we stop there.
        // Word/line modifiers (alt/meta on macOS) are left to the browser.
        if (
          (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          const { state } = view;
          const { selection } = state;
          if (!(selection instanceof TextSelection)) return false;

          const head = selection.$head.pos;
          const pStart = selection.$head.start();
          const pEnd = selection.$head.end();

          if (event.key === "ArrowRight") {
            if (head >= pEnd) return false;
            let target = head + 1;
            while (target < pEnd && state.doc.textBetween(target - 1, target, undefined, OBJ) === ZWS) {
              target++;
            }
            // For non-shift arrow with no ZWS to skip, let the browser handle natively
            // (preserves IME/composition behavior). For shift+arrow always dispatch —
            // Safari mis-handles range extension across contenteditable=false atoms.
            if (target === head + 1 && !event.shiftKey) return false;
            event.preventDefault();
            const newSel = event.shiftKey
              ? TextSelection.create(state.doc, selection.$anchor.pos, target)
              : TextSelection.create(state.doc, target);
            view.dispatch(state.tr.setSelection(newSel).scrollIntoView());
            return true;
          }

          if (event.key === "ArrowLeft") {
            if (head <= pStart) return false;
            let target = head - 1;
            while (target > pStart && state.doc.textBetween(target, target + 1, undefined, OBJ) === ZWS) {
              target--;
            }
            if (target === head - 1 && !event.shiftKey) return false;
            event.preventDefault();
            const newSel = event.shiftKey
              ? TextSelection.create(state.doc, selection.$anchor.pos, target)
              : TextSelection.create(state.doc, target);
            view.dispatch(state.tr.setSelection(newSel).scrollIntoView());
            return true;
          }
        }

        const key = event.key.toLowerCase();
        const isMod = event.ctrlKey || event.metaKey;

        if (isMod && key === "z" && !event.shiftKey) {
          // Undo
          const editorInstance = editorRef.current;
          if (editorInstance?.can().undo()) {
            event.preventDefault();
            editorInstance.chain().focus().undo().run();
            return true;
          }
          // If editor not ready yet, don't prevent default - let browser/TipTap handle it
          return false;
        } else if (isMod && (key === "y" || (key === "z" && event.shiftKey))) {
          // Redo (Ctrl+Y or Ctrl+Shift+Z)
          const editorInstance = editorRef.current;
          if (editorInstance?.can().redo()) {
            event.preventDefault();
            editorInstance.chain().focus().redo().run();
            return true;
          }
          // If editor not ready yet, don't prevent default - let browser/TipTap handle it
          return false;
        }

        // Comprehensive safety checks - prevent any access if view/state not ready
        if (!view) {
          return false;
        }
        if (!view.state) {
          return false;
        }
        if (!view.state.selection) {
          return false;
        }
        if (!view.state.doc) {
          return false;
        }
        if (!view.state.schema) {
          return false;
        }

        try {
          const { state } = view;
          const { selection } = state;

          // Additional safety check
          if (!selection) {
            return false;
          }

          // Handle Cut (Ctrl/Cmd + X) - copy to clipboard and delete
          if ((event.ctrlKey || event.metaKey) && event.key === "x") {
            if (!selection.empty) {
              try {
                // Copy selection to clipboard
                const slice = selection.content();
                if (slice) {
                  const text = serializeSliceToTemplate(slice);

                  // Copy to clipboard
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).catch(() => {
                      // Fallback if clipboard API fails
                    });
                  }
                }
              } catch (error) {
                console.warn("Error in cut handler:", error);
              }

              // Delete selection (TipTap will handle this automatically)
              return false; // Let TipTap handle the cut
            }
          }

          return false;
        } catch (error) {
          console.warn("Error in handleKeyDown:", error);
          return false;
        }
      },
      handlePaste: (view, event, _slice) => {
        // Check if we're pasting a template string (contains {{ or {)
        // If so, parse it and insert as nodes
        try {
          const pastedText = event.clipboardData?.getData("text/plain") || "";

          if (pastedText && (pastedText.includes("{{") || pastedText.match(/\{[a-z]+\}/i))) {
            const nodes = parseLineContent(pastedText);
            if (nodes.length > 0 && editorRef.current?.state && editorRef.current?.chain) {
              editorRef.current.chain().focus().insertContent(nodes).run();
              return true; // Handled
            }
          }
        } catch (error) {
          console.warn("Error in handlePaste:", error);
        }
        return false; // Let TipTap handle normally
      },
      transformPastedText: (text) => {
        // Skip transformation for template strings (they'll be handled by handlePaste)
        if (text && (text.includes("{{") || text.match(/\{[a-z]+\}/i))) {
          return text; // Don't transform template strings
        }
        // Convert plain text to uppercase for consistency
        // Final uppercase conversion happens during serialization
        return text.toUpperCase();
      },
      handleDOMEvents: {
        // Handle mousedown on drag handles to select the node before dragging
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          // Check if clicking on a drag handle or its children
          const dragHandle = target.closest("[data-drag-handle]");
          if (dragHandle && event.button === 0) {
            // Don't handle if clicking on a button (like delete button)
            if (target.closest("button")) {
              return false;
            }

            // Get the position of the drag handle element
            const pos = view.posAtDOM(dragHandle, 0);
            if (pos !== null && pos >= 0) {
              try {
                const $pos = view.state.doc.resolve(pos);
                // Try to find the node - it could be before or after the position
                let node = $pos.nodeAfter;
                let nodePos = $pos.pos;

                if (
                  !node ||
                  (node.type.name !== "variable" &&
                    node.type.name !== "colorTile" &&
                    node.type.name !== "fillSpace" &&
                    node.type.name !== "wrappedText")
                ) {
                  // Try the node before
                  node = $pos.nodeBefore;
                  if (node) {
                    nodePos = $pos.pos - node.nodeSize;
                  }
                }

                if (
                  node &&
                  (node.type.name === "variable" ||
                    node.type.name === "colorTile" ||
                    node.type.name === "fillSpace" ||
                    node.type.name === "wrappedText")
                ) {
                  // Store drag state for handleDrop
                  dragStateRef.current = { from: nodePos, to: nodePos + node.nodeSize };

                  // Let the drag continue naturally
                  return false;
                }
              } catch (error) {
                console.warn("Error selecting node for drag:", error);
              }
            }
          }
          return false;
        },
        // Allow dragstart to proceed - we need it for drop events to fire
        dragstart: (_view, _event) => {
          // Don't prevent - we need the drag to start for drop to work
          return false;
        },
        // Click on an atom (variable, color tile, etc.): give visual feedback
        // by adding the .selected-inline outline directly to the atom's DOM,
        // and place a collapsed cursor right after the atom in PM state.
        // We deliberately avoid dispatching a TextSelection that *spans* the
        // atom — Safari mis-renders such ranges (the visual highlight bleeds
        // from line-start through the atom). A collapsed cursor is rendered
        // consistently across browsers, and the explicit class toggle gives
        // the click feedback that user-select:all used to provide.
        click: (view, event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button")) return false;
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!coords) return false;
          const node = view.state.doc.nodeAt(coords.pos);
          // hardBreak is also an inline atom in PM, but a click that resolves
          // onto a hardBreak position is the user trying to put the caret near
          // a line edge — letting the editor jump the caret *past* the break
          // (Safari's posAtCoords lands on the break at line boundaries when
          // adjacent ZWS text nodes are present) reads as the cursor "skipping
          // ahead a character". Restrict this handler to our content atoms.
          if (!node || !CUSTOM_INLINE_ATOMS.has(node.type.name)) return false;

          // Place collapsed cursor immediately after the atom.
          const after = coords.pos + node.nodeSize;
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, after)));

          // Visual highlight on the atom's DOM. onSelectionUpdate cleared
          // .selected-inline above (since the new selection is empty), so
          // it's safe to set it now.
          const atomDom = view.nodeDOM(coords.pos);
          if (atomDom instanceof HTMLElement) {
            atomDom.classList.add("selected-inline");
          }
          event.preventDefault();
          return true;
        },
      },
      handleDrop: (view, event, _slice, _moved) => {
        // Handle dropping a dragged node
        if (dragStateRef.current) {
          const { from, to } = dragStateRef.current;

          // Get drop position
          const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY });

          if (dropPos && dropPos.pos !== null) {
            try {
              const $dropPos = view.state.doc.resolve(dropPos.pos);

              // Don't drop on itself
              if (dropPos.pos >= from && dropPos.pos <= to) {
                dragStateRef.current = null;
                return true; // Prevent drop
              }

              // Get the node being dragged
              const draggedNode = view.state.doc.nodeAt(from);
              if (!draggedNode) {
                dragStateRef.current = null;
                return false;
              }

              // Calculate insert position
              let insertPos = $dropPos.pos;

              // If dropping at the start of a node, insert before it
              if ($dropPos.parentOffset === 0 && $dropPos.depth > 0) {
                insertPos = $dropPos.before($dropPos.depth);
              }

              // Adjust position if dropping after the dragged content
              if (insertPos > to) {
                insertPos -= to - from;
              }

              // Create transaction to move the node
              const tr = view.state.tr;

              // Delete from original position
              tr.delete(from, to);

              // Adjust insert position after deletion
              const adjustedInsertPos = insertPos > from ? insertPos - (to - from) : insertPos;

              // Ensure we're inserting at a valid position
              if (adjustedInsertPos >= 0 && adjustedInsertPos <= tr.doc.content.size) {
                // Insert the node at the new position
                tr.insert(adjustedInsertPos, draggedNode);

                // Set cursor after the moved node
                const cursorPos = adjustedInsertPos + draggedNode.nodeSize;
                if (cursorPos <= tr.doc.content.size) {
                  tr.setSelection(TextSelection.create(tr.doc, cursorPos));
                }

                view.dispatch(tr);
                dragStateRef.current = null;
                return true; // Handled
              }
            } catch (error) {
              console.warn("Error handling drop:", error);
            }
          }
          dragStateRef.current = null;
        }

        // For other drops, let TipTap handle it
        return false;
      },
      clipboardTextSerializer: (slice) => {
        // Serialize nodes to their template string format for clipboard
        try {
          // Safety check - ensure slice is valid
          if (!slice) {
            return "";
          }
          if (!slice.content) {
            return "";
          }
          return serializeSliceToTemplate(slice);
        } catch (error) {
          console.warn("Error in clipboardTextSerializer:", error);
          return "";
        }
      },
    },
    onSelectionUpdate: ({ editor }) => {
      // Toggle .selected-inline on atom node DOM elements that are inside the
      // current range selection so color tiles etc. get a visible highlight.
      const container = editor.view.dom;
      container.querySelectorAll(".selected-inline").forEach((el) => {
        el.classList.remove("selected-inline");
      });
      const { selection } = editor.state;
      if (!selection.empty) {
        editor.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.isAtom && node.isInline) {
            const domNode = editor.view.nodeDOM(pos);
            if (domNode instanceof HTMLElement) {
              domNode.classList.add("selected-inline");
            }
          }
        });
      }
    },
    onUpdate: ({ editor }) => {
      // Skip onChange if we're manually updating wrap (to prevent state overwrite)
      if (isUpdatingWrap.current) {
        return;
      }
      // Safety check
      if (!editor || !editor.state) {
        return;
      }
      const doc = editor.getJSON();
      const templateString = serializeTemplateSimple(doc, boardLines);
      const lineCount = templateString.split("\n").length;
      onChange(templateString);

      setEditorLineCount(lineCount);
      if (onLineCountChange) {
        onLineCountChange(lineCount);
      }
      scheduleMeasureRef.current?.();
    },
    onCreate: ({ editor }) => {
      const doc = editor.getJSON();
      const templateString = serializeTemplateSimple(doc, boardLines);
      const lineCount = templateString.split("\n").length;
      setEditorLineCount(lineCount);
      if (onLineCountChange) {
        onLineCountChange(lineCount);
      }
      scheduleMeasureRef.current?.();
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Store editor reference for use in handlers
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Draw-mode stroke history bookkeeping. Each applyStroke records the
  // prosemirror-history undo depth its event occupies; watching every
  // transaction then lets any undo/redo path (imperative handle, keyboard,
  // toolbar) report through onDrawHistoryEvent whether the step crossed
  // was a stroke, so the host can restore/re-force per-row alignment/wrap
  // metadata that lives outside the ProseMirror document. If the history
  // depth cap prunes old events, recorded depths can go stale — stale
  // entries are dropped defensively below, degrading to stroke:false (no
  // metadata restore) rather than misreporting a typing undo as a stroke.
  const strokeDepthsRef = useRef<{ done: number[]; undone: number[] }>({ done: [], undone: [] });
  const pendingStrokeRef = useRef(false);
  const onDrawHistoryEventRef = useRef(onDrawHistoryEvent);
  useEffect(() => {
    onDrawHistoryEventRef.current = onDrawHistoryEvent;
  }, [onDrawHistoryEvent]);

  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return;
      const stacks = strokeDepthsRef.current;
      // prosemirror-history stamps undo/redo transactions with its plugin
      // meta (key "history$"); shape-check defensively so a future rename
      // degrades to "normal doc change" instead of throwing.
      const meta = transaction.getMeta("history$") as { redo?: unknown } | undefined;
      const depthAfter = undoDepth(editor.state);
      if (meta && typeof meta === "object" && typeof meta.redo === "boolean") {
        if (meta.redo) {
          // The event restored by this redo now sits at depthAfter.
          while (stacks.undone.length > 0 && stacks.undone[stacks.undone.length - 1] > depthAfter) {
            stacks.undone.pop();
          }
          const stroke = stacks.undone[stacks.undone.length - 1] === depthAfter;
          if (stroke) stacks.done.push(stacks.undone.pop()!);
          onDrawHistoryEventRef.current?.({ action: "redo", stroke });
        } else {
          // The event removed by this undo sat at depthAfter + 1.
          const depthBefore = depthAfter + 1;
          while (stacks.done.length > 0 && stacks.done[stacks.done.length - 1] > depthBefore) {
            stacks.done.pop();
          }
          const stroke = stacks.done[stacks.done.length - 1] === depthBefore;
          if (stroke) stacks.undone.push(stacks.done.pop()!);
          onDrawHistoryEventRef.current?.({ action: "undo", stroke });
        }
      } else {
        // A regular doc change clears prosemirror-history's redo stack,
        // and no recorded stroke can share a depth with the new event.
        stacks.undone.length = 0;
        while (stacks.done.length > 0 && stacks.done[stacks.done.length - 1] >= depthAfter) {
          stacks.done.pop();
        }
        if (pendingStrokeRef.current) {
          pendingStrokeRef.current = false;
          stacks.done.push(depthAfter);
        }
      }
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  // Imperative paint API used by draw mode. Each stroke is applied as a
  // single row-scoped ProseMirror transaction (see buildStrokeTransaction)
  // so it lands as ONE undo step regardless of how many cells the stroke
  // touched, only rebuilds the painted rows, and leaves the caret alone
  // when it sits outside them.
  useImperativeHandle(
    ref,
    () => ({
      applyStroke(paints: StrokePaint[], brush: DrawBrush): number[] {
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return [];

        const cell = brushToCell(brush);
        const lines = serializeTemplateSimple(ed.getJSON(), boardLines).split("\n");
        const byRow = new Map<number, CellPaint[]>();
        for (const p of paints) {
          if (p.row < 0 || p.row >= boardLines || p.col < 0 || p.col >= boardWidth) continue;
          const arr = byRow.get(p.row) ?? [];
          arr.push({ col: p.col, cell });
          byRow.set(p.row, arr);
        }
        if (byRow.size === 0) return [];

        const tr = buildStrokeTransaction(ed.state, lines, byRow, boardWidth);
        if (!tr) return [];

        const { view } = ed;
        pendingStrokeRef.current = true;
        view.dispatch(closeHistory(tr));
        // Seal the stroke's history group on the trailing side too, so a
        // fast follow-up edit can't merge into it and the stroke stays
        // exactly one undo step.
        view.dispatch(closeHistory(view.state.tr));

        return [...byRow.keys()].sort((a, b) => a - b);
      },
      undo() {
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return;
        ed.chain().undo().run();
      },
      redo() {
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return;
        ed.chain().redo().run();
      },
    }),
    [boardLines, boardWidth],
  );

  // Measure actual pixel height of each board line so the gutter stays in sync
  // even when a line's content wraps to multiple visual rows.
  const measureLineHeights = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    // In draw mode the editor container is display:none (still connected),
    // so coordsAtPos would measure a hidden node and produce garbage.
    // Skip; a measure is scheduled when draw mode exits.
    if (drawMode) return;
    try {
      const { state, view } = editor;
      if (!view.dom.isConnected) return;

      const hardBreakPositions: number[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name === "hardBreak") hardBreakPositions.push(pos);
      });

      const lineStartYs: number[] = [];
      try {
        lineStartYs.push(view.coordsAtPos(1).top);
      } catch {
        return;
      }

      for (const brPos of hardBreakPositions) {
        try {
          lineStartYs.push(view.coordsAtPos(brPos + 1).top);
        } catch {
          return;
        }
      }

      const heights: number[] = [];
      for (let i = 0; i < lineStartYs.length; i++) {
        if (i + 1 < lineStartYs.length) {
          heights.push(Math.max(Math.round(lineStartYs[i + 1] - lineStartYs[i]), 24));
        } else {
          const p = view.dom.querySelector("p");
          const endY = p ? p.getBoundingClientRect().bottom : lineStartYs[i] + 24;
          heights.push(Math.max(Math.round(endY - lineStartYs[i]), 24));
        }
      }

      while (heights.length < boardLines) heights.push(24);
      // Skip the state update when the measured heights match the current
      // ones. `onUpdate` schedules this measure on every keystroke, but the
      // per-line pixel heights only change when a line actually wraps — so
      // returning `prev` (same reference) lets React bail out and avoids a
      // guaranteed re-render (and toolbar reconcile) on typical edits.
      setLineHeights((prev) =>
        prev.length === heights.length && prev.every((h, i) => h === heights[i]) ? prev : heights,
      );
    } catch {
      // ignore transient measurement errors
    }
  }, [editor, boardLines, drawMode]);

  const scheduleMeasure = useCallback(() => {
    if (measureScheduledRef.current) return;
    measureScheduledRef.current = true;
    requestAnimationFrame(() => {
      measureScheduledRef.current = false;
      measureLineHeights();
    });
  }, [measureLineHeights]);

  // Keep the ref current so onUpdate/onCreate can call it
  useEffect(() => {
    scheduleMeasureRef.current = scheduleMeasure;
  }, [scheduleMeasure]);

  // Measurement is skipped while draw mode hides the editor, so schedule a
  // fresh measure as soon as draw mode exits (and the editor is visible).
  useEffect(() => {
    if (!drawMode) scheduleMeasure();
  }, [drawMode, scheduleMeasure]);

  // Re-measure when the editor container is resized (e.g. window resize)
  useEffect(() => {
    if (!editor) return;
    const obs = new ResizeObserver(scheduleMeasure);
    obs.observe(editor.view.dom);
    scheduleMeasure();
    return () => obs.disconnect();
  }, [editor, scheduleMeasure]);

  // Add DOM-level drop handler to ensure we catch drops
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleDrop = (event: DragEvent) => {
      // Only handle if we have drag state (dragging a custom node)
      if (!dragStateRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const { from, to } = dragStateRef.current;

      // Get drop position using editor's view
      const dropPos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });

      if (dropPos && dropPos.pos !== null) {
        try {
          const $dropPos = editor.state.doc.resolve(dropPos.pos);

          // Don't drop on itself
          if (dropPos.pos >= from && dropPos.pos <= to) {
            dragStateRef.current = null;
            return;
          }

          // Get the node being dragged
          const draggedNode = editor.state.doc.nodeAt(from);
          if (!draggedNode) {
            dragStateRef.current = null;
            return;
          }

          // Calculate insert position
          let insertPos = $dropPos.pos;

          // If dropping at the start of a node, insert before it
          if ($dropPos.parentOffset === 0 && $dropPos.depth > 0) {
            insertPos = $dropPos.before($dropPos.depth);
          }

          // Adjust position if dropping after the dragged content
          if (insertPos > to) {
            insertPos -= to - from;
          }

          // Create transaction to move the node
          const tr = editor.state.tr;

          // Delete from original position
          tr.delete(from, to);

          // Adjust insert position after deletion
          const adjustedInsertPos = insertPos > from ? insertPos - (to - from) : insertPos;

          // Ensure we're inserting at a valid position
          if (adjustedInsertPos >= 0 && adjustedInsertPos <= tr.doc.content.size) {
            // Insert the node at the new position
            tr.insert(adjustedInsertPos, draggedNode);

            // Set cursor after the moved node
            const cursorPos = adjustedInsertPos + draggedNode.nodeSize;
            if (cursorPos <= tr.doc.content.size) {
              tr.setSelection(TextSelection.create(tr.doc, cursorPos));
            }

            editor.view.dispatch(tr);
            dragStateRef.current = null;
          }
        } catch (error) {
          console.warn("Error handling DOM drop:", error);
          dragStateRef.current = null;
        }
      }
    };

    const handleDragOver = (event: DragEvent) => {
      // Allow drop by preventing default
      if (dragStateRef.current) {
        event.preventDefault();
        event.dataTransfer!.dropEffect = "move";
      }
    };

    editorElement.addEventListener("drop", handleDrop);
    editorElement.addEventListener("dragover", handleDragOver);

    return () => {
      editorElement.removeEventListener("drop", handleDrop);
      editorElement.removeEventListener("dragover", handleDragOver);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    // Only sync content when the editor is NOT focused (e.g. tab switch,
    // draft restore). Skipping while focused prevents setContent from
    // clobbering the cursor during active typing.
    if (!editor.isFocused) {
      const currentSerialized = serializeTemplateSimple(editor.getJSON(), boardLines);
      if (value !== currentSerialized) {
        // Defer setContent outside the React lifecycle so TipTap's internal
        // flushSync (in ReactRenderer for NodeViews) doesn't fire inside a
        // useEffect, which React 19 forbids.
        queueMicrotask(() => {
          if (!editor || editor.isDestroyed) return;
          // TipTap v3 signature: setContent(content, options). The v2
          // three-argument form silently dropped both `emitUpdate: false`
          // and `parseOptions`, echoing this sync back out as an edit.
          editor.commands.setContent(parseTemplateSimple(value || "", boardLines), {
            emitUpdate: false,
            parseOptions: { preserveWhitespace: true },
          });
        });
      }
    }

    const lineCount = (value || "").split("\n").length;
    setEditorLineCount(lineCount);
    if (onLineCountChange) {
      onLineCountChange(lineCount);
    }
    scheduleMeasureRef.current?.();
  }, [value, editor, boardLines, onLineCountChange]);

  // No need to enforce paragraph count - we use line breaks now

  // Alignment is now handled at serialization level, not in editor

  // Wrap is now handled at serialization level, not in editor

  // Get current line index from cursor position (counting hardBreaks)
  const getCurrentLineIndex = useCallback((): number | null => {
    try {
      if (!editor || !editor.state || !editor.state.selection) return null;
      const { state } = editor;
      const { selection } = state;
      if (!selection || !selection.$from) return null;
      const { $from } = selection;

      // Count hard breaks before cursor to determine line index
      let lineIndex = 0;
      if (state.doc) {
        state.doc.nodesBetween(0, $from.pos, (node) => {
          if (node && node.type && node.type.name === "hardBreak") {
            lineIndex++;
          }
        });
      }

      return lineIndex;
    } catch (error) {
      console.warn("Error in getCurrentLineIndex:", error);
      return null;
    }
  }, [editor]);

  // Handle alignment button clicks
  const handleAlignmentClick = useCallback(
    (alignment: LineAlignment) => {
      if (!editor) return;

      try {
        if (!editor.state || !editor.state.selection) return;
        const { state } = editor;
        const { selection } = state;
        if (!selection || !selection.$from) return;

        // Count hard breaks before $from to get starting line index
        let fromLine = 0;
        state.doc.nodesBetween(0, selection.$from.pos, (node) => {
          if (node && node.type && node.type.name === "hardBreak") {
            fromLine++;
          }
        });

        // Count hard breaks between $from and $to to get ending line index
        let toLine = fromLine;
        if (!selection.empty) {
          state.doc.nodesBetween(selection.$from.pos, selection.$to.pos, (node) => {
            if (node && node.type && node.type.name === "hardBreak") {
              toLine++;
            }
          });
        }

        if (fromLine < 0 || fromLine >= boardLines) return;
        const clampedToLine = Math.min(toLine, boardLines - 1);

        // Notify parent of alignment change for each selected line
        if (onLineAlignmentChange) {
          for (let i = fromLine; i <= clampedToLine; i++) {
            onLineAlignmentChange(i, alignment);
          }
        }
      } catch (error) {
        console.warn("Error in handleAlignmentClick:", error);
      }
    },
    [editor, boardLines, onLineAlignmentChange],
  );

  // Handle wrap toggle
  const handleWrapClick = useCallback(() => {
    if (!editor) return;

    const lineIndex = getCurrentLineIndex();
    if (lineIndex === null || lineIndex < 0 || lineIndex >= boardLines) {
      return; // Can't apply wrap if no line is selected
    }

    // Get current wrap state and toggle it
    const currentWrap = effectiveWrapEnabled[lineIndex] || false;
    const newWrap = !currentWrap;

    // Notify parent of wrap change (parent handles state)
    if (onLineWrapChange) {
      onLineWrapChange(lineIndex, newWrap);
    }
    // Depend on the actual values read above (boardLines for the bounds
    // check, effectiveWrapEnabled for the current-state read) rather than
    // the raw lineWrapEnabled prop, which this callback doesn't reference
    // directly and which is stale once the fallback branch of
    // effectiveWrapEnabled (undefined lineWrapEnabled) is in play.
  }, [editor, getCurrentLineIndex, onLineWrapChange, boardLines, effectiveWrapEnabled]);

  // Safely get current line index - use useMemo to prevent calculation during problematic renders
  // MUST be called before any early returns to maintain hook order.
  //
  // TipTap's `editor` instance keeps a stable reference across selection
  // changes (it mutates `editor.state` in place rather than being replaced),
  // so `editor` alone in the dependency array would never pick up a cursor
  // move; `editor?.state?.selection?.$from?.pos` is what actually needs to
  // trigger a recompute. eslint-plugin-react-hooks only allows "extra"
  // dependencies like this for useEffect (where it can't prove they're
  // unnecessary), not for useMemo/useCallback — so it always flags this one
  // as unnecessary, even though removing it would leave currentLineIndex
  // frozen after the very first cursor position (a real regression, not a
  // lint nit).
  const currentLineIndex = useMemo(() => {
    try {
      if (!editor?.state?.selection?.$from) {
        return null;
      }
      if (!editor.state.doc) {
        return null;
      }

      let lineIndex = 0;
      editor.state.doc.nodesBetween(0, editor.state.selection.$from.pos, (node) => {
        if (node && node.type && node.type.name === "hardBreak") {
          lineIndex++;
        }
      });
      return lineIndex;
    } catch (error) {
      console.warn("Error getting current line index:", error);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor?.state?.selection?.$from?.pos]);

  const currentAlignment =
    currentLineIndex !== null && currentLineIndex >= 0 && currentLineIndex < boardLines
      ? effectiveAlignments[currentLineIndex] || "left"
      : "left";

  if (!editor) {
    return (
      <Box className={cn("min-h-[9rem] border rounded-md p-2 bg-muted/30", className)}>
        <Stack gap="1">
          {Array.from({ length: boardLines }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </Stack>
      </Box>
    );
  }
  const currentWrapEnabled =
    currentLineIndex !== null && currentLineIndex >= 0 && currentLineIndex < boardLines
      ? effectiveWrapEnabled[currentLineIndex] || false
      : false;

  const isOverLineLimit = editorLineCount > boardLines;

  return (
    <Box className={cn("relative", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <TemplateEditorToolbar
          {...toolbarProps}
          editor={editor}
          currentAlignment={currentAlignment}
          currentWrapEnabled={currentWrapEnabled}
          // Pass the already-`useCallback`-stable handlers directly rather than
          // wrapping them in fresh inline arrows each render — a new function
          // identity would defeat the toolbar's `React.memo` on every keystroke.
          onAlignmentChange={handleAlignmentClick}
          onWrapToggle={handleWrapClick}
          deviceType={deviceType}
          code62Glyph={code62Glyph}
          onSyncFromBoard={onSyncFromBoard}
          syncFromBoardPending={syncFromBoardPending}
          drawMode={drawMode}
          onDrawModeToggle={onDrawModeToggle}
          drawBrush={drawBrush}
          onDrawBrushChange={onDrawBrushChange}
        />
      )}

      {/* Editor container - styled like a single textarea. Hidden (but kept
          mounted) while draw mode is active so applyStroke can keep
          operating on the live ProseMirror doc without the user seeing the
          rich-text view underneath the drawing canvas. */}
      <Box className={cn("flex-1", drawMode && "hidden")}>
        <Box
          className={cn(
            "border bg-background relative rounded-md",
            showToolbar ? "rounded-t-none" : "",
            isOverLineLimit && "border-warning",
          )}
          style={{
            padding: "0.75rem",
            minHeight: `${boardLines * 1.5 + 1.5}rem`,
          }}
        >
          <Flex gap="2" style={{ minHeight: `${boardLines * 1.5}rem` }}>
            {/* Line numbers gutter */}
            <Box
              className="select-none shrink-0 text-right"
              style={{
                fontSize: "0.75rem",
                lineHeight: "1.5rem",
                minWidth: "1.25rem",
              }}
              aria-hidden="true"
            >
              {Array.from({ length: Math.max(editorLineCount, boardLines) }, (_, i) => (
                <Box
                  key={i}
                  style={{
                    height: `${lineHeights[i] ?? 24}px`,
                    lineHeight: "1.5rem",
                    color: i === currentLineIndex ? "var(--foreground)" : "var(--muted-foreground)",
                    opacity: i === currentLineIndex ? 0.7 : 0.4,
                  }}
                >
                  {i + 1}
                </Box>
              ))}
            </Box>

            {/* Editor content */}
            <Box className="relative flex-1 min-w-0">
              <EditorContent editor={editor} />
            </Box>
          </Flex>
        </Box>

        {/* Line counter */}
        <Text
          size="xs"
          tone={isOverLineLimit ? "warning" : "muted"}
          weight={isOverLineLimit ? "medium" : "normal"}
          className="mt-1"
        >
          {l.lineCount(editorLineCount, boardLines)}
          {isOverLineLimit && l.overLineLimit(boardLines)}
        </Text>

        {/* Alignment controls - only show if toolbar is hidden */}
        {!showToolbar && showAlignmentControls && (
          <TooltipProvider>
            <Flex align="center" gap="2" className="mt-2">
              <Text as="span" size="xs" tone="muted">
                {l.alignment}
              </Text>
              <Flex className="rounded-md border overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleAlignmentClick("left")}
                      aria-label={l.alignLeft}
                      className={cn(
                        "px-3 py-1.5 text-xs transition-colors",
                        currentAlignment === "left"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground",
                      )}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{l.alignLeft}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleAlignmentClick("center")}
                      aria-label={l.alignCenter}
                      className={cn(
                        "px-3 py-1.5 text-xs border-x transition-colors",
                        currentAlignment === "center"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted text-muted-foreground",
                      )}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{l.alignCenter}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleAlignmentClick("right")}
                      aria-label={l.alignRight}
                      className={cn(
                        "px-3 py-1.5 text-xs transition-colors",
                        currentAlignment === "right"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground",
                      )}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{l.alignRight}</TooltipContent>
                </Tooltip>
              </Flex>
              {currentLineIndex !== null && (
                <Text as="span" size="xs" tone="muted">
                  {l.currentLine(currentLineIndex + 1)}
                </Text>
              )}
            </Flex>
          </TooltipProvider>
        )}
      </Box>
    </Box>
  );
});
