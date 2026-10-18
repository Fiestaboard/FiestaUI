/** A canvas's occupied board cells. Coordinates are 1-based, like the page model. */
export interface TemplateCanvasRegion {
  id: string;
  area: { row: number; col: number; rows: number; cols: number };
  text?: "hide" | "flow";
}

export interface TemplateCanvasLabels {
  name: (id: string) => string;
  description: (region: TemplateCanvasRegion) => string;
  hint: string;
}

export const DEFAULT_CANVAS_LABELS: TemplateCanvasLabels = {
  name: (id) => `Canvas: ${id}`,
  description: ({ id, area, text }) =>
    `Canvas: ${id}, rows ${area.row}–${area.row + area.rows - 1}, columns ${area.col}–${area.col + area.cols - 1}. ${text === "flow" ? "Text flows around this area on the display." : "Text in this area is hidden on the display."}`,
  hint: "Shaded areas belong to canvases. Use Preview to check the final text layout.",
};

/**
 * A visual guide outside ProseMirror: never serialized, copied or put in its
 * undo history. Horizontal cells use the same mono font as literal editor
 * text; vertical bounds follow measured template rows, including wrapped rows.
 * Variable pills are authoring tokens, not resolved output widths, so Preview
 * remains the authority for alignment and flow. Pointer events pass through;
 * underlying text is retained for other displays and can still be edited.
 */
export function TemplateCanvasRegions({
  regions,
  rows,
  cols,
  lineHeights,
  labels,
}: {
  regions: readonly TemplateCanvasRegion[];
  rows: number;
  cols: number;
  lineHeights: readonly number[];
  labels: TemplateCanvasLabels;
}) {
  const edges = [0];
  for (let row = 0; row < rows; row++) edges.push(edges[row] + (lineHeights[row] ?? 24));
  return (
    <div className="template-canvas-regions">
      {regions.map((region) => {
        const { row, col, rows: height, cols: width } = region.area;
        if (![row, col, height, width].every((n) => Number.isInteger(n) && n >= 1) || row > rows || col > cols)
          return null;
        const endRow = Math.min(rows, row + height - 1);
        const endCol = Math.min(cols, col + width - 1);
        const clipped = { ...region, area: { row, col, rows: endRow - row + 1, cols: endCol - col + 1 } };
        return (
          <div
            key={region.id}
            role="img"
            aria-label={labels.description(clipped)}
            className="template-canvas-region"
            data-canvas-id={region.id}
            style={{
              top: edges[row - 1],
              height: edges[endRow] - edges[row - 1],
              left: `${col - 1}ch`,
              width: `${endCol - col + 1}ch`,
            }}
          >
            <span aria-hidden="true" className="template-canvas-region-label">
              {labels.name(region.id)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
