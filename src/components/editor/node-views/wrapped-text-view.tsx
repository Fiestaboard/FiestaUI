"use client";

/**
 * React NodeView for Wrapped Text nodes
 * Displays text that will be wrapped with visual indicator
 */
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { WrapText, X } from "lucide-react";

import { cn } from "../../../lib/utils";
import { useNodeViewInjection } from "./node-view-context";

/** Attributes WrappedTextNode declares (see extensions/wrapped-text-node.ts). */
interface WrappedTextAttrs {
  text: string;
}

export interface WrappedTextViewLabels {
  /** Accessible name for the button that removes the wrapped-text node. */
  removeWrappedTextAriaLabel: string;
}

export const DEFAULT_WRAPPED_TEXT_VIEW_LABELS: WrappedTextViewLabels = {
  removeWrappedTextAriaLabel: "Remove wrapped text",
};

export type WrappedTextViewProps = ReactNodeViewProps & {
  labels?: Partial<WrappedTextViewLabels>;
};

export function WrappedTextView({ node, deleteNode, labels }: WrappedTextViewProps) {
  const injected = useNodeViewInjection();
  const l = { ...DEFAULT_WRAPPED_TEXT_VIEW_LABELS, ...injected.labels, ...labels };
  const { text } = node.attrs as WrappedTextAttrs;

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        "inline-block align-middle rounded-md px-2 py-0.5 text-xs font-medium cursor-grab",
        "border transition-all duration-150",
        "bg-warning/15 border-warning/30 text-warning",
        "hover:bg-warning/20",
        "active:cursor-grabbing",
        "max-h-[1.2rem] h-auto",
        "mr-0.5", // Small space after the tag
      )}
      data-drag-handle
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {/* Wrap icon */}
      <WrapText className="w-3 h-3 inline-block align-middle" />

      {/* Wrapped text display.
          Raw <span>: renders inside TipTap's contentEditable atom, inheriting
          the wrapper's text-warning color, with sub-xs text-[11px] grid
          geometry. <Text as="span"> would reset both. Kept raw for correctness. */}
      <span className="font-mono text-[11px] inline-block align-middle ml-1">{text}</span>

      {/* Delete button. Raw <button> rather than the Button primitive: it lives
          inside contentEditable, carries tabIndex={-1} so it stays out of the
          editor's tab order, and every Button variant would paint its own
          background over the wrapper's warning tint. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNode();
        }}
        className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 -mr-1 ml-0.5 transition-colors"
        tabIndex={-1}
        aria-label={l.removeWrappedTextAriaLabel}
      >
        <X className="w-3 h-3" />
      </button>
    </NodeViewWrapper>
  );
}
