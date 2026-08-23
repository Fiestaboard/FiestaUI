import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "./button";

/**
 * How long the confirmed state lasts. 1500ms is what `JsonTree` already uses
 * for the same gesture; the four downstream hand-rolls disagree (1500 twice,
 * 2000 twice), and disagreeing about it is the point of centralising it.
 */
const CONFIRM_MS = 1500;

export interface CopyButtonLabels {
  /** Accessible name while idle. Default `"Copy"`. */
  copy?: string;
  /** Accessible name, and visible label, while confirmed. Default `"Copied"`. */
  copied?: string;
  /**
   * Announced politely on a successful write. Defaults to `copied`.
   * Split from `copied` because a useful announcement often names the thing
   * ("API token copied") where a visible label beside an icon cannot afford
   * the width.
   */
  announcement?: string;
}

export type CopyButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "children" | "value"> & {
  /** The text written to the clipboard. */
  value: string;
  /**
   * Visible label. Omit for the icon-only form, which then takes its
   * accessible name from `labels.copy`.
   */
  children?: React.ReactNode;
  /** How long the confirmed state lasts, in ms. Default 1500. */
  confirmMs?: number;
  /** Fired after a successful write — for a toast, or analytics. */
  onCopied?: (value: string) => void;
  /**
   * Fired when the clipboard write rejects: an insecure context, or a denied
   * permission. Without a handler the failure is still *not* shown as
   * success, which is the bug this replaces.
   */
  onCopyError?: (error: unknown) => void;
  labels?: CopyButtonLabels;
};

/**
 * "Put this value on the clipboard, and confirm you did."
 *
 * ```tsx
 * <CopyButton value={token} size="icon-xs" variant="ghost" />
 * <CopyButton value={snippet} labels={{ copy: t("copyConfig") }}>{t("copyConfig")}</CopyButton>
 * ```
 *
 * FiestaBoard hand-rolled this four times (#271) and every copy re-derived
 * the same three parts — `navigator.clipboard.writeText`, a `copied` flag,
 * and a bare `setTimeout`. What none of them got right is what this component
 * exists to own:
 *
 *   * **The timer is cleaned up**, on unmount and on a re-copy. All four
 *     downstream versions call `setTimeout` with no `clearTimeout`, so a
 *     button copied and then unmounted — a closing dialog, a re-rendered
 *     table row — sets state on a dead component.
 *   * **The result is announced.** The confirmation downstream is an icon
 *     swap and sometimes a colour change, which is nothing at all to a screen
 *     reader (and colour alone is SC 1.4.1). The live region here is mounted
 *     for the component's whole life rather than rendered on success, because
 *     a `role="status"` that appears at the same moment as its text is
 *     unreliably announced — the region has to exist for the change to be a
 *     change.
 *   * **The write is awaited, and only a resolved write confirms.** Two of
 *     the four sites neither await nor catch, so a clipboard denied in an
 *     insecure context still shows the check.
 *   * **The accessible name tracks the state**, so the name is "Copied"
 *     while confirmed whether or not the button carries a visible label.
 *
 * The glyph is `aria-hidden` throughout: the name comes from the label or
 * from `labels`, never from the icon.
 *
 * Two buttons sharing one `copied` state — as `mcp-settings` does for its
 * token and its config snippet — is only a workaround for the state living
 * outside the button. Here each owns its own.
 */
function CopyButton({
  value,
  children,
  confirmMs = CONFIRM_MS,
  onCopied,
  onCopyError,
  labels,
  className,
  variant = "ghost",
  size,
  disabled,
  ...props
}: CopyButtonProps) {
  const { copy = "Copy", copied: copiedLabel = "Copied", announcement } = labels ?? {};

  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      // Checked, not optional-chained. `navigator.clipboard?.writeText(v)`
      // evaluates to `undefined` when the API is absent, and `await
      // undefined` resolves — so an insecure context, where clipboard is
      // undefined entirely, would fall through to the success path and show
      // a check for a write that never happened. That is the same bug as an
      // unawaited rejection, arriving by a different door.
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable (requires a secure context)");
      }
      await navigator.clipboard.writeText(value);
    } catch (error) {
      onCopyError?.(error);
      return;
    }

    // Only past the await, and only on resolve. Confirming optimistically is
    // the bug: it shows a check for a write that never happened.
    setCopied(true);
    onCopied?.(value);

    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), confirmMs);
  }

  const name = copied ? copiedLabel : copy;
  const hasVisibleLabel = children !== undefined && children !== null && children !== false;

  return (
    <>
      <Button
        type="button"
        data-slot="copy-button"
        // Lets a consumer and VRT select the confirmed state without
        // re-deriving it from the glyph that happens to be rendered.
        data-copied={copied ? "true" : undefined}
        variant={variant}
        size={size ?? (hasVisibleLabel ? undefined : "icon-xs")}
        disabled={disabled}
        // Always set, not only in the icon-only case: with a visible label
        // that swaps Copy -> Copied the name would otherwise change only
        // because the text did, and a label short enough to fit ("Copy") is
        // often not the name worth announcing.
        aria-label={name}
        className={cn(className)}
        onClick={handleCopy}
        {...props}
      >
        {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
        {hasVisibleLabel ? (copied ? copiedLabel : children) : null}
      </Button>
      {/*
       * Mounted for the component's whole life so the text landing in it is a
       * change to an existing region. sr-only rather than hidden: a region
       * with `display: none` is not announced.
       */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? (announcement ?? copiedLabel) : ""}
      </span>
    </>
  );
}

export { CopyButton };
