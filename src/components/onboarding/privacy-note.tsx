import { ShieldCheck } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { cardGroundClassName } from "../containment/card";

export interface PrivacyNoteProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The promise, in a few words ("Your data stays on your network"). */
  title?: React.ReactNode;
  /** What that means here: where data goes, and that there is no cloud account. */
  children: React.ReactNode;
}

/**
 * The honest privacy statement (05 `36:6336`, 08 P4): shown at first run and
 * wherever a key or a network permission is asked for.
 *
 * Like `Note`, it is static prose that is on the page at first paint, so it
 * has no role and no live region and is read in document order. Unlike
 * `Note`, it is a card-ground panel with a border (no elevation) and a fixed
 * shield glyph, because it is a standing promise rather than an aside about
 * a control.
 */
function PrivacyNote({ title, children, className, ...props }: PrivacyNoteProps) {
  return (
    <div
      data-slot="privacy-note"
      className={cn(cardGroundClassName, "flex items-start gap-3 p-4", className)}
      {...props}
    >
      <ShieldCheck data-slot="privacy-note-icon" aria-hidden="true" className="size-5 shrink-0 text-success" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title != null && (
          <p data-slot="privacy-note-title" className="text-base font-semibold text-foreground">
            {title}
          </p>
        )}
        <div data-slot="privacy-note-body" className="text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export { PrivacyNote };
