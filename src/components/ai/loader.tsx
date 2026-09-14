"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "../feedback/spinner";

/**
 * Loader — "the assistant is working" with optional text.
 *
 * Composes {@link Spinner}, which already swaps its rotation for a static
 * ring under reduced motion, so this inherits the WCAG 2.2.2 answer rather
 * than restating it. The `role="status"` lives on the Spinner when there is
 * no text and on the wrapper when there is, so the message is announced
 * once, not twice.
 */

export interface LoaderProps extends React.ComponentProps<"div"> {
  /** What is happening — "Thinking…". Announced politely. */
  children?: React.ReactNode;
  /** Announced when there is no visible text. */
  label?: string;
}

function Loader({ className, children, label = "Loading", ...props }: LoaderProps) {
  const hasText = children !== undefined && children !== null;
  return (
    <div
      data-slot="loader"
      role={hasText ? "status" : undefined}
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      <Spinner size="sm" label={hasText ? null : label} />
      {hasText ? <span data-slot="loader-text">{children}</span> : null}
    </div>
  );
}

export { Loader };
