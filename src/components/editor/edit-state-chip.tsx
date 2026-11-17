import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";

export type EditState = "unsaved" | "draft" | "testing" | "saved";

export const DEFAULT_EDIT_STATE_LABELS: Readonly<Record<EditState, string>> = {
  unsaved: "Unsaved",
  draft: "Draft",
  testing: "Testing",
  saved: "Saved",
};

export interface EditStateChipProps extends Omit<ComponentProps<"span">, "children"> {
  state: EditState;
  /** Translated state or caller-formatted save time, e.g. "Saved 6:05 PM". */
  label?: string;
}

/** C29: passive edit state, independent of which revision a display shows. */
export function EditStateChip({ state, label, className, ...props }: EditStateChipProps) {
  return (
    <Badge
      {...props}
      variant={state === "saved" ? "secondary" : "default"}
      data-slot="edit-state-chip"
      data-edit-state={state}
      className={cn("max-w-full border-0 whitespace-normal [overflow-wrap:anywhere]", className)}
    >
      {label ?? DEFAULT_EDIT_STATE_LABELS[state]}
    </Badge>
  );
}
