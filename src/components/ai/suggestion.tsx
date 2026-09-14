"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Chip } from "../feedback/chip";

/**
 * Suggestions — a row of one-click prompts or answers.
 *
 * Two jobs in a chat: the empty-state starters ("Make a weather page"),
 * and the choices the assistant offers when it asks a question. Both are
 * {@link Chip}s — real buttons, 24px-plus targets, the shared focus ring —
 * in a row that scrolls sideways rather than wrapping, so a long list of
 * options never pushes the composer down.
 */

function Suggestions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="suggestions"
      className={cn("flex w-full gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap py-1", className)}
      {...props}
    />
  );
}

export interface SuggestionProps extends Omit<React.ComponentProps<typeof Chip>, "onClick" | "children"> {
  /** The text sent when chosen; also the label unless `children` is given. */
  suggestion: string;
  onClick?: (suggestion: string) => void;
  children?: React.ReactNode;
}

function Suggestion({ className, suggestion, onClick, children, ...props }: SuggestionProps) {
  return (
    <Chip
      data-slot="suggestion"
      type="button"
      className={cn("shrink-0", className)}
      onClick={() => onClick?.(suggestion)}
      {...props}
    >
      {children ?? suggestion}
    </Chip>
  );
}

export { Suggestion, Suggestions };
