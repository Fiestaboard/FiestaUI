"use client";

import { ArrowUp, Square } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Textarea } from "../forms/textarea";

/**
 * PromptInput — the composer at the bottom of a chat.
 *
 * Follows the "AI Elements" composition (PromptInput / PromptInputTextarea
 * / PromptInputToolbar / PromptInputTools / PromptInputSubmit) with one
 * shared `status`:
 *
 *   ready      the user may send
 *   submitted  sent, nothing streamed yet
 *   streaming  a reply is arriving — the submit button becomes Stop
 *   error      the last send failed; sending is allowed again
 *
 * Keyboard: Enter sends, Shift+Enter inserts a newline (the convention
 * every chat product has settled on). IME composition is respected — an
 * Enter that commits a Japanese/Chinese candidate never sends.
 *
 * Data in, events out: the form's `onSubmit` fires with the native event;
 * the consumer owns the value and clears it. The family never fetches.
 */

export type PromptInputStatus = "ready" | "submitted" | "streaming" | "error";

export interface PromptInputLabels {
  /** Accessible name of the send button. */
  send: string;
  /** Accessible name of the stop button (shown while streaming). */
  stop: string;
}

export const DEFAULT_PROMPT_INPUT_LABELS: PromptInputLabels = {
  send: "Send",
  stop: "Stop",
};

interface PromptInputContextValue {
  status: PromptInputStatus;
  labels: PromptInputLabels;
}

const PromptInputContext = React.createContext<PromptInputContextValue>({
  status: "ready",
  labels: DEFAULT_PROMPT_INPUT_LABELS,
});

export interface PromptInputProps extends React.ComponentProps<"form"> {
  status?: PromptInputStatus;
  labels?: Partial<PromptInputLabels>;
}

function PromptInput({ className, status = "ready", labels, ...props }: PromptInputProps) {
  const l = { ...DEFAULT_PROMPT_INPUT_LABELS, ...labels };
  const value: PromptInputContextValue = { status, labels: l };
  return (
    <PromptInputContext.Provider value={value}>
      <form
        data-slot="prompt-input"
        data-status={status}
        className={cn(
          "flex w-full flex-col rounded-xl border bg-card shadow-card transition-[box-shadow,border-color] duration-base",
          "focus-within:border-ring focus-within:shadow-[var(--focus-ring-shadow)]",
          className,
        )}
        {...props}
      />
    </PromptInputContext.Provider>
  );
}

export interface PromptInputTextareaProps extends React.ComponentProps<typeof Textarea> {
  /** Rows shown before the textarea grows with its content. */
  minRows?: number;
  /** Rows at which growth stops and the textarea scrolls. */
  maxRows?: number;
}

/**
 * Enter submits the enclosing form; Shift+Enter is a newline. The textarea
 * grows with its content between `minRows` and `maxRows`, measured from
 * the real scroll height so a pasted paragraph is fully visible.
 */
function PromptInputTextarea({
  className,
  minRows = 1,
  maxRows = 6,
  onKeyDown,
  onInput,
  ref,
  ...props
}: PromptInputTextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  };

  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.style.height = "auto";
    const max = line * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  };

  return (
    <Textarea
      ref={setRefs}
      data-slot="prompt-input-textarea"
      rows={minRows}
      className={cn(
        "min-h-0 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none",
        "focus-visible:border-transparent focus-visible:ring-0 hover:border-transparent",
        className,
      )}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      {...props}
    />
  );
}

/** The row under the textarea: tools on the left, submit on the right. */
function PromptInputToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-input-toolbar"
      className={cn("flex items-center justify-between gap-2 px-2 pb-2", className)}
      {...props}
    />
  );
}

/** The left-hand group of the toolbar: model picker, attachments, modes. */
function PromptInputTools({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="prompt-input-tools" className={cn("flex items-center gap-1", className)} {...props} />;
}

export interface PromptInputSubmitProps extends Omit<React.ComponentProps<typeof Button>, "children" | "type"> {
  /** Called instead of submitting while `status` is `streaming`. */
  onStop?: () => void;
}

/**
 * Send while ready, Stop while streaming. The Stop form is `type="button"`
 * so a click can never accidentally submit the form it sits in.
 */
function PromptInputSubmit({ className, onStop, disabled, ...props }: PromptInputSubmitProps) {
  const { status, labels } = React.useContext(PromptInputContext);
  const streaming = status === "streaming";
  if (streaming) {
    return (
      <Button
        data-slot="prompt-input-submit"
        data-status={status}
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={labels.stop}
        className={cn("rounded-full", className)}
        onClick={onStop}
        {...props}
      >
        <Square aria-hidden="true" className="size-3.5 fill-current" />
      </Button>
    );
  }
  return (
    <Button
      data-slot="prompt-input-submit"
      data-status={status}
      type="submit"
      size="icon-sm"
      aria-label={labels.send}
      disabled={disabled || status === "submitted"}
      className={cn("rounded-full", className)}
      {...props}
    >
      <ArrowUp aria-hidden="true" />
    </Button>
  );
}

export { PromptInput, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools };
