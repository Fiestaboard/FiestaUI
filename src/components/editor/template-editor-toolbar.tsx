/**
 * Template Editor Toolbar - Toolbar for TipTap template editor
 * Provides quick access to variables, colors, formatting, and alignment
 */
"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ClipboardPaste,
  Code2,
  Copy,
  Download,
  Eraser,
  House,
  Palette,
  Pencil,
  Redo2,
  Scissors,
  SquareFunction,
  Type,
  Undo2,
  WrapText,
} from "lucide-react";
import { type ComponentProps, lazy, type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AVAILABLE_COLORS, type BoardColorName, getBoardColor } from "../../lib/board-colors";
import { useDepsChanged } from "../../lib/use-deps-changed";
import { cn } from "../../lib/utils";
import { Skeleton } from "../feedback/skeleton";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Text } from "../typography/text";
import { ColorPickerContent, type ColorPickerLabels } from "./color-picker-content";
import type { DeviceType } from "./constants";
import { DrawCharPickerContent } from "./draw-char-picker-content";
import { FormattingPickerContent, type FormattingPickerLabels } from "./formatting-picker-content";
import type { LineAlignment } from "./template-editor";
import { ToolbarDropdown } from "./toolbar-dropdown";
import type { DrawBrush } from "./utils/draw-mode";
import { insertTemplateContent } from "./utils/insertion";
import type {
  PluginDisplayData,
  PluginManifest,
  TemplateVariables,
  VariablePickerLabels,
} from "./variable-picker-content";

// Lazy-loaded — pulls in lucide-react's full `icons` barrel (every icon in
// the library, ~1.2 MB) to resolve plugin-provided icon names dynamically.
// Deferring it until the "Variables" dropdown is actually opened keeps that
// cost out of the base TipTap editor chunk (#1575).
const VariablePickerContent = lazy(() =>
  import("./variable-picker-content").then((m) => ({ default: m.VariablePickerContent })),
);

// ── Data shapes ───────────────────────────────────────────────────────────────

/** One entry of the backend's `formatting` map: a snippet plus its help text. */
export interface FormattingVariable {
  syntax: string;
  description?: string;
}

/**
 * What the toolbar reads from the app's already-fetched `/templates/variables`
 * payload: the variable picker's slice (forwarded to it verbatim) plus the two
 * maps that decide whether the Colors and Formatting dropdowns exist at all.
 *
 * Narrowed and structural, like the picker's own types, so the app's full
 * `getTemplateVariables` response satisfies it without a cast. Named for the
 * toolbar rather than re-declaring `TemplateVariables`, which
 * `variable-picker-content` already owns.
 */
export interface ToolbarTemplateVariables extends TemplateVariables {
  /** Color name → board code. Presence is what enables the Colors dropdown. */
  colors?: Record<string, number>;
  formatting?: Record<string, FormattingVariable>;
}

/**
 * What the toolbar hands an injected entity picker.
 *
 * The picker itself (Home Assistant's, or any other plugin's) lives in the
 * host app — it is an API-backed dialog and this package neither fetches nor
 * knows about plugins. The toolbar still owns the trigger button, the open
 * state, and the caret-timing dance around insertion, so the slot is a render
 * prop rather than a bare node: those three things cannot be handed over
 * without reimplementing them in every host.
 */
export interface EntityPickerSlotContext {
  /** True while the toolbar's entity button has asked for the picker. */
  open: boolean;
  /** Call when the picker dismisses itself. */
  onClose: () => void;
  /** Call with the template string to insert, e.g. `{{home_assistant.porch_temp}}`. */
  onSelect: (variable: string) => void;
}

// ── Labels ────────────────────────────────────────────────────────────────────

/**
 * Every user-visible string in the toolbar. This package has no i18n runtime:
 * hosts that localize pass a translated object, everyone else gets English.
 *
 * Keys mirror the FiestaBoard app's `templateEditor` message-catalog keys 1:1
 * so the app can map its catalog across mechanically. This interface covers the
 * toolbar's slice of that namespace; the editor and color picker own theirs.
 */
export interface TemplateEditorToolbarLabels {
  /** Draw-mode toggle, accessible name and tooltip, while drawing is OFF. */
  drawMode: string;
  /** …and while it is ON (the button then exits draw mode). */
  drawModeActive: string;
  undo: string;
  /** Accessible name for the undo button — the tooltip adds the shortcut. */
  undoAriaLabel: string;
  redo: string;
  redoAriaLabel: string;
  /**
   * Accessible names for the draw-mode color swatches, keyed by palette color.
   * Supply all eight; omitted colors fall back to the English default.
   */
  drawColors: Record<BoardColorName, string>;
  drawEraser: string;
  /** Label for the stamp-character dropdown. */
  drawCharacter: string;
  cut: string;
  cutAriaLabel: string;
  copy: string;
  copyAriaLabel: string;
  paste: string;
  pasteAriaLabel: string;
  variables: string;
  /** Accessible name for the Variables button when there are none to insert. */
  variablesNoVarsAvailable: string;
  /** Tooltip explaining why the Variables button is disabled. */
  noVariablesAvailable: string;
  /** Label for the injected entity picker's trigger button. */
  homeAssistantEntities: string;
  colors: string;
  formatting: string;
  insertFormula: string;
  /** Accessible name for the wrap toggle (constant); the tooltip states the effect. */
  toggleWrap: string;
  enableWrap: string;
  disableWrap: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  /** Accessible name for the sync-from-board button. */
  syncFromBoard: string;
  syncFromBoardTooltip: string;
}

export const DEFAULT_TEMPLATE_EDITOR_TOOLBAR_LABELS: TemplateEditorToolbarLabels = {
  drawMode: "Draw on board",
  drawModeActive: "Exit drawing mode",
  undo: "Undo (Ctrl+Z)",
  undoAriaLabel: "Undo",
  redo: "Redo (Ctrl+Shift+Z)",
  redoAriaLabel: "Redo",
  drawColors: {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    violet: "Violet",
    white: "White",
    black: "Black",
  },
  drawEraser: "Eraser",
  drawCharacter: "Stamp character",
  cut: "Cut (Ctrl+X)",
  cutAriaLabel: "Cut",
  copy: "Copy (Ctrl+C)",
  copyAriaLabel: "Copy",
  paste: "Paste (Ctrl+V)",
  pasteAriaLabel: "Paste",
  variables: "Variables",
  variablesNoVarsAvailable: "Variables (no variables available)",
  noVariablesAvailable: "No template variables available. Configure plugins in Settings.",
  homeAssistantEntities: "Home Assistant entities",
  colors: "Colors",
  formatting: "Formatting",
  insertFormula: "Insert formula",
  toggleWrap: "Toggle wrap for current line",
  enableWrap: "Enable wrap. Long text flows into empty or wrap-enabled lines below.",
  disableWrap: "Disable wrap for this line",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  syncFromBoard: "Sync from current board display",
  syncFromBoardTooltip: "Populate template from what's currently displayed on the board",
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface TemplateEditorToolbarProps {
  editor: Editor | null;
  currentAlignment?: LineAlignment;
  currentWrapEnabled?: boolean;
  onAlignmentChange?: (alignment: LineAlignment) => void;
  onWrapToggle?: () => void;
  className?: string;
  deviceType?: DeviceType;
  onSyncFromBoard?: () => void;
  syncFromBoardPending?: boolean;
  drawMode?: boolean;
  onDrawModeToggle?: () => void;
  drawBrush?: DrawBrush;
  onDrawBrushChange?: (brush: DrawBrush) => void;
  /**
   * Resolved template variables. Absent means "nothing available yet": the
   * Variables button renders disabled and the colors/formatting dropdowns are
   * omitted entirely, exactly as when the backend reports an empty catalog.
   */
  templateVariables?: ToolbarTemplateVariables;
  /** True while the host is still fetching `templateVariables`. */
  isLoadingVariables?: boolean;
  /**
   * Renders the Variables dropdown body. Omitted, the toolbar renders its own
   * lazily-imported `VariablePickerContent` from the data props below — which
   * stays the right default for a host that has the data anyway.
   *
   * The toolbar keeps the trigger, the dropdown, the disabled/empty state (still
   * decided by `templateVariables`, not by this prop) and the insertion plumbing:
   * `onInsert` inserts at the caret and closes the dropdown, so a host body never
   * reimplements either. Same slot shape as `FormulaEditorPanel`'s
   * `renderVariablePicker`, deliberately — a host can hand the *same* lazy chunk
   * to both.
   *
   * Supplying it lets a host keep the picker's data fetching AND its icon set
   * inside that chunk instead of resolving both at editor-mount time: the default
   * path needs `resolveIcon`, which pulls lucide's full `icons` barrel (~1.2 MB,
   * a barrel object so nothing tree-shakes), plus a manifest request per plugin
   * and a polled display feed — computed at mount for a dropdown that may never
   * open (#244, FiestaBoard #1575). Wrapped in the dropdown's `<Suspense>`, so a
   * bare `lazy()` component can be passed straight in.
   */
  renderVariablePicker?: (ctx: { onInsert: (variable: string) => void }) => ReactNode;
  /**
   * Forwarded verbatim to the *default* variable picker, which owns these
   * contracts; unread by the toolbar, and unused when `renderVariablePicker`
   * supplies the body instead. See `variable-picker-content` for what each does.
   */
  pluginManifests?: Record<string, PluginManifest | undefined>;
  isLoadingManifests?: boolean;
  pluginDisplayData?: PluginDisplayData;
  resolveIcon?: ComponentProps<typeof VariablePickerContent>["resolveIcon"];
  /**
   * Renders the host's entity picker dialog. Omit it (or leave the
   * `home_assistant` plugin uninstalled) and neither the button nor the dialog
   * appears — never a placeholder.
   */
  entityPickerSlot?: (ctx: EntityPickerSlotContext) => ReactNode;
  labels?: Partial<TemplateEditorToolbarLabels>;
  /** Labels for the nested pickers, each passed straight through to its owner. */
  variablePickerLabels?: Partial<VariablePickerLabels>;
  colorPickerLabels?: Partial<ColorPickerLabels>;
  formattingPickerLabels?: Partial<FormattingPickerLabels>;
}

export function TemplateEditorToolbar({
  editor,
  currentAlignment = "left",
  currentWrapEnabled = false,
  onAlignmentChange,
  onWrapToggle,
  className,
  deviceType,
  onSyncFromBoard,
  syncFromBoardPending = false,
  drawMode = false,
  onDrawModeToggle,
  drawBrush,
  onDrawBrushChange,
  templateVariables,
  isLoadingVariables,
  renderVariablePicker,
  pluginManifests,
  isLoadingManifests,
  pluginDisplayData,
  resolveIcon,
  entityPickerSlot,
  labels,
  variablePickerLabels,
  colorPickerLabels,
  formattingPickerLabels,
}: TemplateEditorToolbarProps) {
  const l = { ...DEFAULT_TEMPLATE_EDITOR_TOOLBAR_LABELS, ...labels };
  const drawColorLabel = (name: BoardColorName) =>
    l.drawColors?.[name] ?? DEFAULT_TEMPLATE_EDITOR_TOOLBAR_LABELS.drawColors[name];
  const effectiveBrush: DrawBrush = drawBrush ?? { kind: "color", color: "red" };

  const handleInsert = (templateString: string) => {
    if (editor) {
      insertTemplateContent(editor, templateString);
    }
  };

  const handleAlignmentClick = (alignment: LineAlignment) => {
    if (onAlignmentChange) {
      onAlignmentChange(alignment);
    }
  };

  // Check if variables are available
  const hasVariables = templateVariables?.variables && Object.keys(templateVariables.variables).length > 0;
  const hasColors = templateVariables?.colors && Object.keys(templateVariables.colors).length > 0;
  const hasFormatting = templateVariables?.formatting && Object.keys(templateVariables.formatting).length > 0;
  // The Home Assistant entity picker hits `/home-assistant/entities`, which 503s
  // when the plugin isn't installed/enabled. Only offer it when the plugin has
  // actually contributed template variables.
  const hasEntityPicker = Boolean(entityPickerSlot) && Boolean(templateVariables?.variables?.home_assistant);

  // Track undo/redo availability and selection state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  // Optimistically enabled: we no longer call `navigator.clipboard.readText()`
  // on mount (it triggers Safari's "Smart Paste" floating affordance near
  // focused buttons). The actual read happens inside `handlePaste`, which
  // is a real user-gesture handler and is gesture-allowed in every browser.
  const [hasClipboardContent, setHasClipboardContent] = useState(true);
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const pendingEntityInsert = useRef<number | null>(null);

  // The entity picker emits its variable *before* the dialog tears itself down:
  // it calls `onSelect` and then, synchronously, `onClose`. Inserting here and
  // now would move the caret into the editor only for the dialog's closing focus
  // restore to yank it straight back to the toolbar button, so let that close
  // land first and do the insert on the next frame.
  const handleEntitySelect = (variable: string) => {
    if (pendingEntityInsert.current !== null) {
      cancelAnimationFrame(pendingEntityInsert.current);
    }
    pendingEntityInsert.current = requestAnimationFrame(() => {
      pendingEntityInsert.current = null;
      handleInsert(variable);
    });
  };

  useEffect(
    () => () => {
      if (pendingEntityInsert.current !== null) {
        cancelAnimationFrame(pendingEntityInsert.current);
        pendingEntityInsert.current = null;
      }
    },
    [],
  );

  // Clearing the toolbar when the editor goes away is a render-phase reset,
  // not a setState in the effect body (react-hooks/set-state-in-effect,
  // issue #1568) — so the buttons can never stay enabled for a frame after the
  // editor they act on has been torn down.
  if (useDepsChanged([editor]) && !editor) {
    setCanUndo(false);
    setCanRedo(false);
    setHasSelection(false);
  }

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateEditorState = () => {
      setCanUndo(editor.can().undo());
      setCanRedo(editor.can().redo());
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };

    // Initial state
    updateEditorState();

    // Update on editor state changes
    editor.on("update", updateEditorState);
    editor.on("selectionUpdate", updateEditorState);

    return () => {
      editor.off("update", updateEditorState);
      editor.off("selectionUpdate", updateEditorState);
    };
  }, [editor]);

  // Track clipboard content availability for the Paste button.
  //
  // We deliberately do *not* call `navigator.clipboard.readText()` here:
  // doing so on mount or on `window.focus` is the trigger that makes
  // Safari attach its "Smart Paste" floating affordance to whichever
  // button receives focus next (Rich toggle, AI toggle, etc.). The Paste
  // button is optimistically enabled by default; the only place we
  // actually read the clipboard is inside `handlePaste`, which runs from
  // a real user gesture and so doesn't trip Safari's clipboard-aware-page
  // heuristic.
  useEffect(() => {
    const handleClipboardWrite = () => {
      setHasClipboardContent(true);
    };

    document.addEventListener("copy", handleClipboardWrite);
    document.addEventListener("cut", handleClipboardWrite);
    return () => {
      document.removeEventListener("copy", handleClipboardWrite);
      document.removeEventListener("cut", handleClipboardWrite);
    };
  }, []);

  const handleUndo = () => {
    if (editor && canUndo) {
      editor.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor && canRedo) {
      editor.chain().focus().redo().run();
    }
  };

  const handleCut = useCallback(async () => {
    if (editor && hasSelection) {
      editor.view.focus();
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "\n");

      try {
        await navigator.clipboard.writeText(selectedText);
        editor.chain().focus().deleteSelection().run();
      } catch {
        // Fallback for environments where Clipboard API write is unavailable/denied
        document.execCommand("cut");
      }

      setHasClipboardContent(true);
    }
  }, [editor, hasSelection]);

  const handleCopy = useCallback(async () => {
    if (editor && hasSelection) {
      editor.view.focus();
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "\n");

      try {
        await navigator.clipboard.writeText(selectedText);
      } catch {
        // Fallback for environments where Clipboard API write is unavailable/denied
        document.execCommand("copy");
      }

      setHasClipboardContent(true);
    }
  }, [editor, hasSelection]);

  const handlePaste = useCallback(async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
      }
    } catch {
      // Clipboard read failed — focus editor so user can Ctrl+V
      editor.commands.focus();
    }
  }, [editor]);

  return (
    // `skipDelayDuration={0}` prevents tooltip-flash when clicking
    // adjacent buttons (e.g. the editor card's AI toggle) shifts the
    // layout and the cursor briefly hovers a different button.
    <TooltipProvider skipDelayDuration={0}>
      <Flex align="center" gap="1" wrap className={cn("p-2 border rounded-t-md bg-background", className)}>
        {/* Draw Mode Toggle */}
        {onDrawModeToggle && (
          <>
            <Flex align="center" gap="0.5" className="rounded-md border border-border overflow-hidden bg-background">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onDrawModeToggle}
                    data-testid="draw-mode-toggle"
                    aria-pressed={drawMode}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      drawMode ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    )}
                    aria-label={drawMode ? l.drawModeActive : l.drawMode}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{drawMode ? l.drawModeActive : l.drawMode}</Text>
                </TooltipContent>
              </Tooltip>
            </Flex>

            {/* Divider after draw toggle */}
            <Box className="h-6 w-px bg-border mx-1" />
          </>
        )}

        {/* Undo/Redo Controls */}
        <Flex align="center" gap="0.5" className="rounded-md border border-border overflow-hidden bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn(
                  "px-2 py-1.5 transition-colors",
                  canUndo ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
                  "border-r border-border",
                )}
                aria-label={l.undoAriaLabel}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>{l.undo}</Text>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn(
                  "px-2 py-1.5 transition-colors",
                  canRedo ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
                )}
                aria-label={l.redoAriaLabel}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>{l.redo}</Text>
            </TooltipContent>
          </Tooltip>
        </Flex>

        {/* Divider after undo/redo */}
        <Box className="h-6 w-px bg-border mx-1" />

        {/* Drawing controls — in draw mode the toolbar transforms: all
            content-editing controls are hidden and replaced by inline color
            swatches, an eraser, and a stamp-character dropdown. */}
        {drawMode && (
          <>
            <Flex align="center" gap="0.5">
              {AVAILABLE_COLORS.map((name) => {
                const selected = effectiveBrush.kind === "color" && effectiveBrush.color === name;
                return (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid={`draw-color-${name}`}
                        aria-pressed={selected}
                        aria-label={drawColorLabel(name)}
                        onClick={() => onDrawBrushChange?.({ kind: "color", color: name })}
                        className={cn(
                          "flex items-center justify-center p-1.5 rounded-md transition-colors",
                          "border border-transparent",
                          selected ? "ring-2 ring-primary" : "hover:bg-muted/50",
                        )}
                      >
                        <Text
                          as="span"
                          className="block h-4 w-4 rounded-sm border border-border/50"
                          style={{ backgroundColor: getBoardColor(name) }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Text>{drawColorLabel(name)}</Text>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="draw-color-eraser"
                    aria-pressed={effectiveBrush.kind === "eraser"}
                    aria-label={l.drawEraser}
                    onClick={() => onDrawBrushChange?.({ kind: "eraser" })}
                    className={cn(
                      "flex items-center justify-center p-1.5 rounded-md transition-colors",
                      "border border-transparent",
                      effectiveBrush.kind === "eraser" ? "ring-2 ring-primary bg-muted/70" : "hover:bg-muted/50",
                    )}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.drawEraser}</Text>
                </TooltipContent>
              </Tooltip>
            </Flex>

            <ToolbarDropdown
              label={l.drawCharacter}
              data-testid="draw-char-dropdown"
              className={cn(effectiveBrush.kind === "char" && "ring-2 ring-primary")}
              icon={
                effectiveBrush.kind === "char" ? (
                  <Text
                    as="span"
                    size="xs"
                    className="flex h-4 w-4 items-center justify-center rounded-sm border border-border font-mono leading-none"
                  >
                    {effectiveBrush.char}
                  </Text>
                ) : (
                  <Type className="w-4 h-4" />
                )
              }
            >
              {(close) => (
                <DrawCharPickerContent
                  current={effectiveBrush}
                  onSelect={(brush) => {
                    onDrawBrushChange?.(brush);
                    close();
                  }}
                />
              )}
            </ToolbarDropdown>
          </>
        )}

        {!drawMode && (
          <>
            {/* Cut/Copy/Paste Controls */}
            <Flex align="center" gap="0.5" className="rounded-md border border-border overflow-hidden bg-background">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCut}
                    disabled={!hasSelection}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      hasSelection ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
                      "border-r border-border",
                    )}
                    aria-label={l.cutAriaLabel}
                  >
                    <Scissors className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.cut}</Text>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!hasSelection}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      hasSelection ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
                      "border-r border-border",
                    )}
                    aria-label={l.copyAriaLabel}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.copy}</Text>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={!hasClipboardContent}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      hasClipboardContent ? "hover:bg-muted/50" : "opacity-60 cursor-not-allowed",
                    )}
                    aria-label={l.pasteAriaLabel}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.paste}</Text>
                </TooltipContent>
              </Tooltip>
            </Flex>

            {/* Divider after clipboard controls */}
            <Box className="h-6 w-px bg-border mx-1" />

            {/* Variables Dropdown */}
            {hasVariables ? (
              <ToolbarDropdown label={l.variables} icon={<Code2 className="w-4 h-4" />}>
                {(close) => {
                  // Insertion stays the toolbar's: whichever body renders, a
                  // pick lands at the caret and then dismisses the dropdown.
                  const onInsert = (variable: string) => {
                    handleInsert(variable);
                    close();
                  };
                  return (
                    <Suspense
                      fallback={
                        <Box className="p-3 min-w-[300px]">
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                        </Box>
                      }
                    >
                      {renderVariablePicker ? (
                        renderVariablePicker({ onInsert })
                      ) : (
                        <VariablePickerContent
                          templateVariables={templateVariables}
                          isLoadingVariables={isLoadingVariables}
                          pluginManifests={pluginManifests}
                          isLoadingManifests={isLoadingManifests}
                          pluginDisplayData={pluginDisplayData}
                          resolveIcon={resolveIcon}
                          labels={variablePickerLabels}
                          onInsert={onInsert}
                        />
                      )}
                    </Suspense>
                  );
                }}
              </ToolbarDropdown>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className={cn(
                      "flex items-center justify-center p-1.5 rounded-md",
                      "text-muted-foreground cursor-not-allowed opacity-60",
                      "border border-transparent",
                    )}
                    aria-label={l.variablesNoVarsAvailable}
                  >
                    <Code2 className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.noVariablesAvailable}</Text>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Injected entity picker.
                Deliberately NOT a `ToolbarDropdown`: the dropdown's
                outside-mousedown and capture-phase Escape handlers fight the
                picker's modal portal. A plain button plus a sibling dialog
                keeps both behaving. */}
            {hasEntityPicker && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-testid="home-assistant-entity-button"
                      onClick={() => setEntityPickerOpen(true)}
                      className={cn(
                        "flex items-center justify-center p-1.5 rounded-md transition-colors",
                        "border border-transparent hover:bg-muted/50",
                      )}
                      aria-label={l.homeAssistantEntities}
                    >
                      <House className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>{l.homeAssistantEntities}</Text>
                  </TooltipContent>
                </Tooltip>

                {/* Called, not rendered as `<Slot />`: an inline arrow from the
                    host would be a new component type every render, remounting
                    the dialog (and losing its state) on each keystroke in the
                    editor. Calling it keeps the returned element tree stable.
                    `handleEntitySelect` touches a ref, but only when the host
                    invokes it from its own event handler — never during this
                    render, which is what the rule is guarding against. */}
                {/* eslint-disable-next-line react-hooks/refs -- the ref is read inside the callback, not during render */}
                {entityPickerSlot?.({
                  open: entityPickerOpen,
                  onClose: () => setEntityPickerOpen(false),
                  onSelect: handleEntitySelect,
                })}
              </>
            )}

            {/* Colors Dropdown */}
            {hasColors && (
              <ToolbarDropdown label={l.colors} icon={<Palette className="w-4 h-4" />}>
                {(close) => (
                  <ColorPickerContent
                    onInsert={(color: string) => {
                      handleInsert(color);
                      close();
                    }}
                    deviceType={deviceType}
                    labels={colorPickerLabels}
                  />
                )}
              </ToolbarDropdown>
            )}

            {/* Formatting Dropdown */}
            {hasFormatting && (
              <ToolbarDropdown label={l.formatting} icon={<Type className="w-4 h-4" />}>
                {(close) => (
                  <FormattingPickerContent
                    formatting={templateVariables?.formatting}
                    labels={formattingPickerLabels}
                    onInsert={(formatting: string) => {
                      handleInsert(formatting);
                      close();
                    }}
                  />
                )}
              </ToolbarDropdown>
            )}

            {/* Formulas — insert an empty formula node; the pill's panel auto-opens in the editor */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    editor
                      ?.chain()
                      .focus()
                      .insertContent({
                        type: "formula",
                        attrs: { expression: "", autoOpen: true },
                      })
                      .run();
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium",
                    "hover:bg-muted/50 transition-colors",
                  )}
                  aria-label={l.insertFormula}
                >
                  <SquareFunction className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{l.insertFormula}</Text>
              </TooltipContent>
            </Tooltip>

            {/* Wrap Toggle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onWrapToggle}
                  className={cn(
                    "flex items-center justify-center p-1.5 rounded-md transition-colors",
                    "border border-transparent",
                    currentWrapEnabled ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                  )}
                  aria-label={l.toggleWrap}
                >
                  <WrapText className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{currentWrapEnabled ? l.disableWrap : l.enableWrap}</Text>
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            {(hasVariables || hasColors || hasFormatting) && <Box className="h-6 w-px bg-border mx-1" />}

            {/* Alignment Controls */}
            <Flex align="center" gap="0.5" className="rounded-md border border-border overflow-hidden bg-background">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleAlignmentClick("left")}
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      currentAlignment === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    )}
                    aria-label={l.alignLeft}
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
                    className={cn(
                      "px-2 py-1.5 border-x border-border transition-colors",
                      currentAlignment === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    )}
                    aria-label={l.alignCenter}
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
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      currentAlignment === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    )}
                    aria-label={l.alignRight}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{l.alignRight}</TooltipContent>
              </Tooltip>
            </Flex>

            {/* Sync from Board — icon-only button pushed to the far right */}
            {onSyncFromBoard && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onSyncFromBoard}
                    disabled={syncFromBoardPending}
                    className={cn(
                      "flex items-center justify-center p-1.5 rounded-md transition-colors",
                      "hover:bg-muted/50 border border-transparent",
                      syncFromBoardPending && "opacity-60 cursor-not-allowed",
                    )}
                    aria-label={l.syncFromBoard}
                  >
                    <Download className={cn("w-4 h-4", syncFromBoardPending && "animate-pulse")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.syncFromBoardTooltip}</Text>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </Flex>
    </TooltipProvider>
  );
}
