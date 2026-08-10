/**
 * Board previews — the `teaser` / `previews` plugin-manifest contract, shared
 * by every surface that advertises a plugin (the FiestaBoard marketplace, the
 * docs plugin directory).
 *
 * A preview holds *literal* board rows, never `{{variables}}`: widths count
 * tiles, so a color marker like `{66}` is one tile and an end tag `{/green}` is
 * none. See FiestaBoard's docs/development/PLUGIN_DEVELOPMENT.md.
 */

import type { DeviceType } from "./board-dimensions";

/** One literal board, at one shape. */
export interface BoardPreviewEntry {
  /** Human tab label; when absent, derive one with `previewLabel()`. */
  label?: string;
  device_type?: DeviceType;
  /** Notes wide (note_array only). */
  notes_wide?: number;
  /** Notes tall (note_array only). */
  notes_tall?: number;
  rows: string[];
}

/** Localized shape names. `noteArray` may contain `{w}` and `{h}` placeholders. */
export interface PreviewShapeLabels {
  flagship: string;
  note: string;
  noteArray: string;
}

export const DEFAULT_SHAPE_LABELS: PreviewShapeLabels = {
  flagship: "Flagship",
  note: "Note",
  noteArray: "Note Array {w}×{h}",
};

/** Tab label for a preview: its declared label, or one derived from the shape. */
export function previewLabel(preview: BoardPreviewEntry, labels: PreviewShapeLabels = DEFAULT_SHAPE_LABELS): string {
  if (preview.label) return preview.label;
  if (preview.device_type === "note_array") {
    return labels.noteArray
      .replace("{w}", String(preview.notes_wide ?? 1))
      .replace("{h}", String(preview.notes_tall ?? 1));
  }
  return preview.device_type === "note" ? labels.note : labels.flagship;
}

/**
 * Tab labels for a whole preview list, numbering repeats so every tab has a
 * distinct accessible name — authors may declare several previews of the same
 * shape ("Flagship" twice).
 */
export function previewLabels(previews: BoardPreviewEntry[], labels?: PreviewShapeLabels): string[] {
  const seen = new Map<string, number>();
  return previews.map((preview) => {
    const base = previewLabel(preview, labels);
    const repeat = seen.get(base) ?? 0;
    seen.set(base, repeat + 1);
    return repeat > 0 ? `${base} ${repeat + 1}` : base;
  });
}

/** The newline-joined message `StaticBoardDisplay` renders. */
export function previewMessage(preview: BoardPreviewEntry): string {
  return preview.rows.join("\n");
}
