"use client";

import { ArrowDown } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";

/**
 * Conversation — the scrolling transcript of a chat.
 *
 * Mirrors the shadcn "AI Elements" `Conversation` vocabulary (Conversation /
 * ConversationContent / ConversationScrollButton) so an app written against
 * that API reads the same here. Behaviour is what matters:
 *
 * - it is a `role="log"` region, which is how assistive technology is told
 *   "new entries append at the end" without re-announcing the whole list;
 * - it sticks to the bottom while the user is at the bottom (a streaming
 *   reply keeps scrolling into view) and STOPS sticking the moment the user
 *   scrolls up to read — the one thing a naive `scrollIntoView` on every
 *   token gets wrong;
 * - {@link ConversationScrollButton} appears only while the user is away
 *   from the bottom, and jumps back.
 *
 * "At the bottom" is measured, not assumed: the scroll handler updates
 * state, and a ResizeObserver on the content re-pins the viewport only
 * when the last measurement said the user was there. The observer runs in
 * an effect but never calls setState — it scrolls the DOM — so this stays
 * on the right side of the set-state-in-effect rule.
 */

export interface ConversationLabels {
  /** Accessible name of the log region. */
  conversation: string;
  /** Accessible name of the jump-to-latest button. */
  scrollToBottom: string;
}

export const DEFAULT_CONVERSATION_LABELS: ConversationLabels = {
  conversation: "Conversation",
  scrollToBottom: "Jump to latest",
};

interface ConversationContextValue {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  labels: ConversationLabels;
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null);

function useConversation(component: string): ConversationContextValue {
  const ctx = React.useContext(ConversationContext);
  if (!ctx) throw new Error(`${component} must be rendered inside <Conversation>`);
  return ctx;
}

/** Pixels from the bottom that still count as "at the bottom". */
const BOTTOM_THRESHOLD = 24;

export interface ConversationProps extends React.ComponentProps<"div"> {
  labels?: Partial<ConversationLabels>;
}

function Conversation({ className, children, labels, onScroll, ...props }: ConversationProps) {
  const l = { ...DEFAULT_CONVERSATION_LABELS, ...labels };
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  // The last measured answer, readable from the observer without a re-render.
  const atBottomRef = React.useRef(true);

  const measure = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setIsAtBottom(true);
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const next = measure();
    atBottomRef.current = next;
    setIsAtBottom(next);
    onScroll?.(event);
  };

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      // Content grew (a token arrived, a card expanded). Follow it only if
      // the user was already at the bottom; otherwise leave them reading.
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  const value: ConversationContextValue = { isAtBottom, scrollToBottom, labels: l };

  return (
    <ConversationContext.Provider value={value}>
      <div
        data-slot="conversation"
        className={cn(
          // The viewport is a tab stop (a scrollable region has to be keyboard
          // operable — axe's scrollable-region-focusable), and like ScrollArea
          // its focus ring is drawn on the ROOT keyed to the viewport's focus,
          // because an outset ring on an overflow container clips away.
          "relative flex min-h-0 flex-1 flex-col has-[[data-slot=conversation-viewport]:focus-visible]:shadow-[var(--focus-ring-shadow)]",
          className,
        )}
        {...props}
      >
        <div
          ref={viewportRef}
          data-slot="conversation-viewport"
          role="log"
          aria-label={l.conversation}
          aria-live="polite"
          aria-relevant="additions text"
          // A log is non-interactive to jsx-a11y, but a scrollable region has
          // to be reachable from the keyboard (axe: scrollable-region-focusable,
          // SC 2.1.1) — the same exemption ScrollArea's viewport relies on.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[inherit] outline-none"
          onScroll={handleScroll}
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  );
}

/** The padded stack the messages live in. */
function ConversationContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="conversation-content" className={cn("flex flex-col gap-3 p-3", className)} {...props} />;
}

/**
 * Appears while the user has scrolled away from the newest entry. Rendered
 * as nothing at all — not merely hidden — while at the bottom, so it never
 * sits in the tab order as a no-op.
 */
function ConversationScrollButton({ className, ...props }: Omit<React.ComponentProps<typeof Button>, "children">) {
  const { isAtBottom, scrollToBottom, labels } = useConversation("ConversationScrollButton");
  if (isAtBottom) return null;
  return (
    <Button
      data-slot="conversation-scroll-button"
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={labels.scrollToBottom}
      className={cn("absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-card", className)}
      onClick={scrollToBottom}
      {...props}
    >
      <ArrowDown aria-hidden="true" />
    </Button>
  );
}

export { Conversation, ConversationContent, ConversationScrollButton };
