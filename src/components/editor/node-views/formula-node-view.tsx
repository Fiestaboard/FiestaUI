"use client";

/**
 * FormulaNodeView — React NodeView for Formula nodes.
 *
 * Renders as an amber badge pill showing ƒ + truncated expression preview.
 * Clicking opens a centered modal FormulaEditorPanel via a portal into
 * document.body (escapes the ProseMirror container).
 *
 * The modal does NOT close on backdrop click — only on Esc / Done / Cancel.
 */

import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { SquareFunction } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  lazy,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Badge } from "../../feedback/badge";
import { Skeleton } from "../../feedback/skeleton";
import { Box } from "../../layout/box";
import { Flex } from "../../layout/flex";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../overlays/tooltip";
import { Text } from "../../typography/text";
import { useNodeViewInjection } from "./node-view-context";

// Lazy-loaded — CodeMirror (+ the lucide-react icon barrel pulled in via
// VariablePickerContent's "Variables" tab) is only needed once the formula
// modal is actually opened, and keeping it out of the base TipTap editor
// chunk is what keeps that chunk under the 500 kB warning threshold (#1575).
const FormulaEditorPanel = lazy(() =>
  import("../formula/formula-editor-panel").then((m) => ({ default: m.FormulaEditorPanel })),
);

/** Attributes FormulaNode declares (see extensions/formula-node.ts). */
interface FormulaAttrs {
  expression: string;
  autoOpen: boolean;
}

export interface FormulaNodeViewLabels {
  /** Pill preview text for a formula that has no expression yet. */
  newFormula: string;
  /** Hint under the tooltip's expression preview. */
  clickToEditFormula: string;
}

export const DEFAULT_FORMULA_NODE_VIEW_LABELS: FormulaNodeViewLabels = {
  newFormula: "new formula",
  clickToEditFormula: "Click to edit formula",
};

/** What the node view hands the formula-editor slot when the modal opens. */
export interface FormulaEditorSlotContext {
  /** The current expression, without the `{{= }}` wrapper. */
  initialExpr: string;
  /** Commit a new expression and close the modal. */
  onConfirm: (expression: string) => void;
  /** Close the modal, deleting the node if it never got an expression. */
  onCancel: () => void;
}

export type FormulaNodeViewProps = ReactNodeViewProps & {
  labels?: Partial<FormulaNodeViewLabels>;
  /**
   * Renders the modal's contents. The app supplies this so the panel arrives
   * with its own labels and its already-resolved data (formula functions,
   * template variables) — a node view has no call site to thread those through
   * and must not fetch them itself. Omitted, the lazily-imported
   * `FormulaEditorPanel` is rendered with its own defaults.
   */
  renderFormulaEditor?: (ctx: FormulaEditorSlotContext) => ReactNode;
};

export function FormulaNodeView({
  node,
  updateAttributes,
  deleteNode,
  labels,
  renderFormulaEditor,
}: FormulaNodeViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_FORMULA_NODE_VIEW_LABELS, ...injected.labels, ...labels };
  const renderPanel = renderFormulaEditor ?? injected.renderFormulaEditor;
  const { expression, autoOpen } = node.attrs as FormulaAttrs;
  const [open, setOpen] = useState(false);
  // Capture autoOpen at mount time so the effect doesn't depend on the prop
  // (calling updateAttributes would trigger a ProseMirror transaction that can
  // remount this component, cancelling the RAF before it fires).
  const shouldAutoOpen = useRef(autoOpen);

  const preview =
    expression.length > 0 ? (expression.length > 20 ? expression.slice(0, 20) + "…" : expression) : l.newFormula;

  // Auto-open on mount when freshly inserted via the toolbar.
  useEffect(() => {
    if (!shouldAutoOpen.current) return;
    const rafId = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  const openPanel = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }, []);

  // Close on Escape — delete node if it was never given an expression
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        if (node.attrs.expression === "") deleteNode();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, node.attrs.expression, deleteNode]);

  const handleConfirm = (newExpr: string) => {
    updateAttributes({ expression: newExpr });
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
    if (node.attrs.expression === "") deleteNode();
  };

  return (
    <NodeViewWrapper
      as="span"
      data-drag-handle
      style={{
        display: "inline-flex",
        verticalAlign: "baseline",
        whiteSpace: "nowrap",
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="formula"
              className="inline-flex flex-nowrap items-center gap-1 px-1.5 py-0 border-dashed cursor-pointer hover:bg-amber-500/20 mr-0.5 transition-all duration-150 active:scale-95"
              // Use onMouseDown instead of onClick — ProseMirror's drag-handle
              // intercepts mousedown on atom nodes before React's onClick fires.
              onMouseDown={openPanel}
              role="button"
              tabIndex={0}
              onKeyDown={(e: ReactKeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPanel(e as unknown as ReactMouseEvent);
                }
              }}
            >
              <SquareFunction className="w-2.5 h-2.5 flex-shrink-0" />
              {/* Raw <span>: colored Badge inside contentEditable; <Text as="span">
                  would reset the inherited pill color and text-[11px] is sub-xs
                  grid geometry. Kept raw for correctness. */}
              <span className="font-mono text-[11px] leading-none">{preview}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <Text size="xs" className="font-mono">
              {"{{= " + expression + " }}"}
            </Text>
            <Text size="xs" tone="muted" className="mt-0.5">
              {l.clickToEditFormula}
            </Text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {open &&
        createPortal(
          <Flex
            align="center"
            justify="center"
            className="fixed inset-0 z-[999] p-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Backdrop — intentionally has no click handler to prevent accidental close */}
            <Box className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal panel */}
            <Box className="relative rounded-lg border border-border bg-popover shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-[min(660px,90vw)]">
              {/* Suspense wraps the slot too — an injected panel is just as
                  likely to be lazily imported as the default one. */}
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                {renderPanel ? (
                  renderPanel({ initialExpr: expression, onConfirm: handleConfirm, onCancel: handleCancel })
                ) : (
                  <FormulaEditorPanel
                    mode="edit"
                    initialExpr={expression}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                  />
                )}
              </Suspense>
            </Box>
          </Flex>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
