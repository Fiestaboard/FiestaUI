import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// A quiet inline note (#295): always-present static prose that explains a
// control. It is not an event and not a state change, which is the whole
// difference from `Alert` — `Alert` says something happened, `Note` says
// something *is*.
//
// So, deliberately:
//
//   * No `role` and no live region. These notes are on the page at first
//     paint; announcing them interrupts a screen reader for copy the user never
//     triggered. They are read in document order like any other paragraph.
//   * No status variants. A note that needs a hue is an `Alert`.
//   * Borderless `bg-muted/50`, the recipe FiestaBoard hand-rolled six times
//     with three paddings and two radii. The tone lives on the container so a
//     plain-string child and a `Text` child cannot disagree.
const noteVariants = cva("flex w-full items-start rounded-md bg-muted/50 text-muted-foreground", {
  variants: {
    size: {
      // The 12px settings note.
      sm: "gap-2 p-2.5 text-xs [&_[data-slot=note-icon]>svg]:size-3.5",
      // The 14px wizard note.
      md: "gap-2.5 p-3 text-sm [&_[data-slot=note-icon]>svg]:size-4",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export interface NoteProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Leading glyph — a lucide element, or a Spinner. Rendered aria-hidden. */
  icon?: React.ReactNode;
  /** Optional bolded first line above the body. */
  title?: React.ReactNode;
  /** `sm` = the 12px settings note; `md` = the 14px wizard note. @default "sm" */
  size?: "sm" | "md";
  /** Body copy. */
  children: React.ReactNode;
}

function Note({ className, icon, title, size = "sm", children, ...props }: NoteProps) {
  return (
    <div data-slot="note" data-size={size} className={cn(noteVariants({ size }), className)} {...props}>
      {icon != null && (
        // The wrapper owns aria-hidden so a Spinner's own role="status" (or a
        // labelled svg) cannot leak a live region into a note that must not
        // have one. The line-height-sized box keeps the glyph optically
        // centred on the first line of text, whether the body wraps or not.
        <span data-slot="note-icon" aria-hidden="true" className="flex h-[1lh] shrink-0 items-center [&>svg]:shrink-0">
          {icon}
        </span>
      )}
      <div data-slot="note-content" className="min-w-0 flex-1 leading-relaxed">
        {title != null && (
          <div data-slot="note-title" className="font-semibold leading-tight text-foreground [&+*]:mt-0.5">
            {title}
          </div>
        )}
        <div data-slot="note-body">{children}</div>
      </div>
    </div>
  );
}

export { Note, noteVariants };
