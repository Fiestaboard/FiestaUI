import { GripVertical, Tv } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { type DeviceModelRef, tryResolveDeviceModel } from "../../lib/devices";
import { cn } from "../../lib/utils";
import { BoardIcon } from "../chrome/board-icon";

/**
 * DisplayTypeChip — which kind of display something is, in a mixed household
 * (Kitchen = Flagship, Desk = Pixoo, Entry = TC001). 02 FB / Display type
 * `39:49629`; 08 C11 `59:145389`.
 *
 * A 24 px muted pill with an icon and a mono caps label. It is CONTENT, like
 * Badge: no role, no tab stop, not a target. Filtering by type uses Chip or a
 * SegmentedControl, never this. Shape and text carry the type, never colour.
 *
 * The label is written in mixed case and set in caps by CSS (`uppercase`), so
 * the source text and a copy-paste stay readable. That is not an a11y
 * guarantee: Chromium applies `text-transform` to the text it exposes
 * (measured: the accessibility tree names the chip "FLAGSHIP , 22×6"), and
 * screen readers read short all-caps words as words in practice. The
 * visual " · " is hidden from assistive tech, with a visually hidden comma
 * in its place. Sizes are CANON columns × rows (Flagship 22×6, Pixoo 64×64).
 *
 * The chip never wraps or truncates (`whitespace-nowrap`): a long translated
 * label widens it, and a narrow host wraps whole chips onto the next line.
 */

export const DISPLAY_TYPES = ["flagship", "note", "note-array", "pixoo", "tc001", "tc002", "panel"] as const;

export type DisplayType = (typeof DISPLAY_TYPES)[number];

/**
 * 02's label for each type: the name and a detail after the separator (its
 * size, or "TBD" for the TC002, whose dimensions are unconfirmed). `null` is
 * no detail. Pass `label` / `detail` to translate or to say more (a
 * FiestaPanel's own `29×12`).
 */
export const DISPLAY_TYPE_LABELS: Readonly<Record<DisplayType, { label: string; detail: string | null }>> = {
  flagship: { label: "Flagship", detail: "22×6" },
  note: { label: "Note", detail: "15×3" },
  "note-array": { label: "Note array", detail: null },
  pixoo: { label: "Pixoo", detail: "64×64" },
  tc001: { label: "TC001", detail: "32×8" },
  tc002: { label: "TC002", detail: "TBD" },
  panel: { label: "FiestaPanel TV", detail: null },
};

/** Split-flap boards take the board glyph, LED matrices Lucide grip-vertical (a dot grid), the TV Lucide tv. */
function TypeIcon({ type }: { type: DisplayType }) {
  const className = "size-3.5 shrink-0";
  if (type === "panel") return <Tv className={className} aria-hidden="true" />;
  if (type === "pixoo" || type === "tc001" || type === "tc002")
    return <GripVertical className={className} aria-hidden="true" />;
  return <BoardIcon className={className} />;
}

export interface DisplayTypeChipProps extends Omit<ComponentProps<"span">, "children"> {
  /** The display type. */
  type: DisplayType;
  /** The name. Defaults to {@link DISPLAY_TYPE_LABELS}. */
  label?: ReactNode;
  /** What follows the separator: a size, "TBD". `null` drops it and the separator. Defaults to {@link DISPLAY_TYPE_LABELS}. */
  detail?: ReactNode | null;
}

export function DisplayTypeChip({ type, label, detail, className, ...props }: DisplayTypeChipProps) {
  const defaults = DISPLAY_TYPE_LABELS[type];
  const name = label ?? defaults.label;
  const extra = detail === undefined ? defaults.detail : detail;
  return (
    <span
      {...props}
      data-slot="display-type-chip"
      data-type={type}
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full bg-muted pl-2 pr-2.5",
        "font-mono text-[11px] font-medium leading-4 whitespace-nowrap text-foreground uppercase",
        className,
      )}
    >
      <TypeIcon type={type} />
      <span>
        {name}
        {extra != null && (
          <>
            <span aria-hidden="true" data-slot="display-type-chip-separator">
              {" · "}
            </span>
            <span className="sr-only">, </span>
            {extra}
          </>
        )}
      </span>
    </span>
  );
}

const TYPE_BY_MODEL: Readonly<Record<string, DisplayType>> = {
  vestaboard_flagship: "flagship",
  vestaboard_note: "note",
  vestaboard_note_array: "note-array",
  vestaboard_panel: "panel",
  divoom_pixoo64: "pixoo",
  ulanzi_tc001_awtrix: "tc001",
  // The shipping TC001 output plugin's own model (fiestaboard-output--ulanzi-tc001,
  // output/device-models.json): AWTRIX NG firmware, 32 × 8.
  ulanzi_tc001: "tc001",
};

/**
 * The chip for a device model, or `undefined` when 02 draws none for it (a
 * HUB75 panel, an unknown id). Keyed by model id, covering the built-ins and
 * the output plugins' own models (the Pixoo and Vestaboard plugins reuse the
 * built-in ids; the TC001 plugin declares `ulanzi_tc001`). FiestaPanel
 * models, built in or declared by its plugin (`family: "fiestapanel"`), are
 * `"panel"`. The TC002 has no model yet, so nothing maps to `"tc002"`.
 */
export function displayTypeForModel(ref: DeviceModelRef): DisplayType | undefined {
  const { model } = tryResolveDeviceModel(ref);
  if (!model) return undefined;
  if (model.family === "fiestapanel") return "panel";
  return Object.hasOwn(TYPE_BY_MODEL, model.id) ? TYPE_BY_MODEL[model.id] : undefined;
}
