"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Shimmer — text with a light sweep, for a status line that is still in
 * progress ("Running create_page…").
 *
 * The sweep is `.ai-shimmer` in theme.css: a gradient clipped to the text,
 * moving on `ai-shimmer` keyframes. Under reduced motion the class pins
 * the gradient's position so the text is a plain, fully legible
 * muted-foreground — an infinite sweep is exactly what WCAG 2.2.2 (Pause,
 * Stop, Hide) exists for, and the global 1ms backstop alone would freeze
 * it at an arbitrary frame.
 */
function Shimmer({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="shimmer" className={cn("ai-shimmer text-sm", className)} {...props} />;
}

export { Shimmer };
