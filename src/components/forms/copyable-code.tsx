import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Code } from "../typography/code";

export interface CopyableCodeLabels {
  /** Accessible name while idle. Defaults to `Copy` followed by the visible token. */
  copy?: string;
  /** Confirmation prefix in the accessible name. Defaults to `Copied`, followed by the visible token. */
  copied?: string;
  /** Polite success announcement. Defaults to `copied`. */
  announcement?: string;
}

export type CopyableCodeProps = Omit<React.ComponentProps<"button">, "value" | "children" | "type"> & {
  /** Text written to the clipboard, independently of the visible token. */
  value: string;
  /** Visible token, rendered as Code. Defaults to value and never swaps on success. */
  children?: React.ReactNode;
  labels?: CopyableCodeLabels;
  /** Confirmation duration in milliseconds. Defaults to 1500, like CopyButton. */
  confirmMs?: number;
  /** Called after a successful write for the current token, while mounted. */
  onCopied?: (value: string) => void;
  /** Called if the Clipboard API is unavailable or its write rejects. */
  onCopyError?: (error: unknown) => void;
};

/**
 * Inline code token with a trailing copy/check glyph. Use directly in a table
 * cell or sentence; it is already a button, so do not nest it inside one.
 *
 * <CopyableCode value="{{weather.temp}}">weather.temp</CopyableCode>
 */
function CopyableCode({
  value,
  children,
  labels,
  confirmMs = 1500,
  onCopied,
  onCopyError,
  onClick,
  className,
  disabled,
  ...props
}: CopyableCodeProps) {
  const { copy, copied: copiedLabel = "Copied", announcement } = labels ?? {};
  const actionId = React.useId();
  const tokenId = React.useId();
  const [confirmation, setConfirmation] = React.useState({ value, copied: false });
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = React.useRef(0);
  const copied = confirmation.value === value && confirmation.copied;

  // Reset during render when the token changes so returning to an earlier
  // value cannot resurrect its confirmation after its timer was cleaned up.
  if (confirmation.value !== value) setConfirmation({ value, copied: false });

  React.useEffect(() => {
    return () => {
      // Invalidate in-flight writes as well as scheduled resets. A clipboard
      // promise can settle after the token changes or leaves the page.
      request.current += 1;
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, [value]);

  async function handleCopy() {
    const currentRequest = ++request.current;
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    setConfirmation({ value, copied: false });

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable (requires a secure context)");
      }
      await navigator.clipboard.writeText(value);
    } catch (error) {
      if (currentRequest === request.current) onCopyError?.(error);
      return;
    }

    if (currentRequest !== request.current) return;
    setConfirmation({ value, copied: true });
    resetTimer.current = setTimeout(() => setConfirmation({ value, copied: false }), confirmMs);
    onCopied?.(value);
  }

  return (
    <>
      <button
        {...props}
        type="button"
        data-slot="copyable-code"
        data-copied={copied ? "true" : undefined}
        disabled={disabled}
        aria-label={props["aria-label"] ?? (copied ? undefined : copy)}
        aria-labelledby={
          props["aria-labelledby"] ?? (props["aria-label"] || (!copied && copy) ? undefined : `${actionId} ${tokenId}`)
        }
        className={cn(
          "inline-flex min-h-6 min-w-6 items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 align-baseline text-xs text-foreground",
          "cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring-shadow)]",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !disabled) void handleCopy();
        }}
      >
        <span id={actionId} className="sr-only">
          {copied ? copiedLabel : "Copy"}
        </span>
        <Code id={tokenId} className="bg-transparent p-0 text-inherit">
          {children ?? value}
        </Code>
        {copied ? (
          <Check aria-hidden="true" className="size-3 shrink-0 text-success" />
        ) : (
          <Copy aria-hidden="true" className="size-3 shrink-0" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? (announcement ?? copiedLabel) : ""}
      </span>
    </>
  );
}

export { CopyableCode };
