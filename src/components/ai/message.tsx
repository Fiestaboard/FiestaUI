"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Message — one turn of a conversation, from the user or the assistant.
 *
 * `from` is the only axis. It is stamped as `data-from` on the row so the
 * bubble and anything a consumer places inside can style off it
 * (`group-data-[from=user]:…`) without a second prop threaded down.
 *
 * The assistant's turn is deliberately NOT a bubble: it is the page's own
 * ground with the ink of body copy, because it carries markdown, tool
 * cards and step timelines that need the full width. The user's turn is
 * the bubble — short, right-aligned, on the accent surface.
 */
const messageVariants = cva("group flex w-full gap-2", {
  variants: {
    from: {
      user: "flex-row-reverse",
      assistant: "flex-row",
    },
  },
  defaultVariants: {
    from: "assistant",
  },
});

export interface MessageProps extends React.ComponentProps<"div">, VariantProps<typeof messageVariants> {
  from: "user" | "assistant";
}

function Message({ className, from, ...props }: MessageProps) {
  return <div data-slot="message" data-from={from} className={cn(messageVariants({ from }), className)} {...props} />;
}

const messageContentVariants = cva("min-w-0 text-sm leading-relaxed", {
  variants: {
    from: {
      user: "max-w-[85%] rounded-xl rounded-br-sm bg-accent px-3 py-2 text-accent-foreground",
      assistant: "flex-1 text-foreground",
    },
  },
  defaultVariants: {
    from: "assistant",
  },
});

export interface MessageContentProps extends React.ComponentProps<"div">, VariantProps<typeof messageContentVariants> {}

/**
 * The body of a turn. Reads `from` off the nearest {@link Message} when not
 * given, so the common case is `<Message from="user"><MessageContent>…`.
 */
function MessageContent({ className, from, ...props }: MessageContentProps) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        messageContentVariants({ from }),
        from === undefined &&
          "group-data-[from=user]:max-w-[85%] group-data-[from=user]:rounded-xl group-data-[from=user]:rounded-br-sm group-data-[from=user]:bg-accent group-data-[from=user]:px-3 group-data-[from=user]:py-2 group-data-[from=user]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export interface MessageAvatarProps extends React.ComponentProps<"span"> {
  /**
   * Fallback initial when no child glyph is given. One character is used.
   */
  name?: string;
  /**
   * Decorative by default: the turn's `from` is already conveyed by
   * position and content, and a screen reader announcing "assistant
   * avatar" before every reply is noise. Pass `decorative={false}` and an
   * `aria-label` when the avatar is the only thing naming the speaker.
   */
  decorative?: boolean;
}

/**
 * A small round mark beside a turn: an icon child, or the first letter of
 * `name`. Not an image component — chat avatars here are glyphs, and the
 * package ships no image loading.
 */
function MessageAvatar({ className, name, decorative = true, children, ...props }: MessageAvatarProps) {
  return (
    <span
      data-slot="message-avatar"
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {children ?? (name ? name.trim().charAt(0).toUpperCase() : null)}
    </span>
  );
}

export { Message, MessageAvatar, MessageContent, messageContentVariants, messageVariants };
