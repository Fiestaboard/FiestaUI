/**
 * The FiestaBoard brand mark — the pixel-art taco, redrawn as a crisp 32×32
 * SVG so it stays sharp at any size and can be themed. Each palette slot is
 * exposed as a CSS custom property (`--fiesta-icon-*`) with the original
 * raster color as its fallback, so the mark renders identically to the
 * legacy PNG by default and re-tints wherever the variables are overridden.
 *
 * The rect data was recovered from the original 32×32 PNG
 * (`/icons/favicon-32x32.png` in the app): pixels were quantized onto this
 * semantic palette and merged into maximal same-color rectangles.
 */
import type { ReactNode } from "react";

/** Encoded pixel rectangles: "x,y,w,h" or "x,y,w,h,a" (a = opacity in eighths, omitted when fully opaque). */
interface FiestaIconSlot {
  /** Semantic palette slot, e.g. "shell" — themed via `--fiesta-icon-<name>`. */
  name: string;
  /** Default fill: the exact color recovered from the original raster mark. */
  hex: string;
  rects: string;
}

const SLOTS: FiestaIconSlot[] = [
  {
    name: "outline",
    hex: "#1e1434",
    rects:
      "11,3,1,1,2 12,3,11,1,5 9,4,2,1,3 16,4,1,1 23,4,1,1,4 24,4,1,1,1 8,5,1,1,2 9,5,2,1 23,5,1,1 24,5,1,1,4 25,5,1,1,1 7,6,1,1,3 8,6,1,1 24,6,1,1 25,6,1,1,5 6,7,1,1,4 26,7,1,1,5 5,8,1,1,4 27,8,1,1,4 28,8,1,2,1 5,9,1,1,7 27,9,1,1 3,10,1,2,1 4,10,1,1,5 28,10,1,1,6 29,10,1,1,2 4,11,1,2 28,11,1,7 29,11,1,1,4 3,12,1,1,2 29,12,1,3,3 2,13,1,2,3 3,13,1,3 0,15,1,1,2 1,15,1,1,4 2,15,1,1,6 29,15,1,1,4 0,16,1,9,3 1,16,1,9 29,16,1,1,3 29,17,1,1,6 27,18,1,1 30,18,1,1,3 31,18,1,1,1 25,19,2,1 30,19,1,6 31,19,1,6,3 22,20,2,1 19,21,4,1 18,22,3,1 16,23,1,1,6 17,23,1,1,7 18,23,2,1 12,24,3,1 15,24,1,1,7 18,24,1,2 0,25,1,1,2 1,25,1,1,6 2,25,1,1,7 9,25,2,1 11,25,1,1,7 12,25,2,1,6 14,25,2,1,1 17,25,1,2,1 30,25,1,1,6 31,25,1,1,2 2,26,1,1,3 3,26,1,1 9,26,2,1,7 11,26,1,1,4 18,26,1,1,7 19,26,1,1 28,26,1,1 29,26,1,1,7 3,27,1,1,2 4,27,4,1 8,27,1,1,7 9,27,2,1,1 18,27,1,1,1 19,27,1,1,4 20,27,1,1,7 27,27,1,1,7 28,27,1,1,4 29,27,1,1,1 4,28,5,1,2 20,28,1,1,3 21,28,6,1,7 27,28,1,1,3",
  },
  {
    name: "shell",
    hex: "#e8a520",
    rects:
      "17,8,1,4 25,8,1,1 18,9,7,1 16,10,1,11 18,10,2,2 22,10,5,3 14,11,2,5 5,12,1,1 19,12,3,3 27,12,1,3 13,13,1,6 17,13,2,4 22,13,2,4 26,13,1,3 11,15,1,1 19,15,1,2 24,15,2,1 12,16,1,2 14,16,1,5 20,16,2,2 24,16,1,1 3,17,1,8 10,17,1,1 17,17,1,3 22,17,1,2 15,18,1,3 20,18,1,1 10,19,2,4 18,19,2,1 12,20,2,1 12,21,1,2 10,23,1,1 8,24,1,2 4,25,1,2 6,26,1,1",
  },
  {
    name: "shell-shade",
    hex: "#cf8014",
    rects:
      "11,5,1,4 17,7,1,1 16,8,1,1 6,9,1,2 9,9,1,1 5,10,1,1,7 7,10,1,1 20,10,2,2 27,10,1,1 13,11,1,1 17,12,2,1 11,13,1,2 24,13,2,2 10,15,1,1 20,15,2,1 27,15,1,2 3,16,1,1 15,16,1,2 25,16,2,2 18,17,2,2 23,17,2,1 12,18,1,2 21,18,1,3 23,18,1,2 13,19,1,1 20,19,1,2 22,19,1,1 17,20,3,1 13,21,5,1 13,22,3,1 11,23,1,1 13,23,2,1 4,24,1,1 9,24,2,1 7,25,1,2 5,26,1,1 8,26,1,1",
  },
  {
    name: "shell-light",
    hex: "#f2b836",
    rects:
      "12,5,3,1 8,7,1,1 18,7,7,2 7,9,1,1 25,9,2,1 5,11,1,1 27,11,1,1 4,13,1,1 12,15,1,1 10,16,2,1 11,17,1,2 10,18,1,1 9,21,1,1 9,23,1,1",
  },
  {
    name: "shell-glint",
    hex: "#fbd04f",
    rects: "9,6,2,1 16,9,1,1 15,10,1,1 13,12,1,1 12,13,1,2 4,14,1,1 9,19,1,2 9,22,1,1",
  },
  {
    name: "filling",
    hex: "#5a220a",
    rects:
      "17,4,3,1 17,6,7,1 16,7,1,1 10,14,1,1 2,16,1,1 9,16,1,2 4,17,2,1 27,17,1,1 5,18,2,2 26,18,1,1 4,19,1,2 7,19,2,2 5,21,1,2 8,21,1,2 4,22,1,2 6,22,2,2 16,22,2,1 5,24,1,1 11,24,1,1 17,24,1,1,1 3,25,1,1 6,25,1,1",
  },
  { name: "filling-dark", hex: "#440b00", rects: "13,10,1,1 6,24,1,1" },
  {
    name: "tomato",
    hex: "#a82115",
    rects:
      "19,5,1,1 12,6,2,1 13,7,1,1 15,9,1,1 14,10,1,1 9,11,1,1 12,12,1,1 5,13,4,2 6,15,2,1 2,17,1,1 4,18,1,1 9,18,1,1 24,18,2,1 2,20,1,1 5,20,2,1 4,21,1,1 6,21,2,1 18,21,1,1 5,23,1,1 8,23,1,1 12,23,1,1 15,23,1,1 7,24,1,1 5,25,1,1",
  },
  { name: "tomato-bright", hex: "#dc2813", rects: "17,5,2,1 12,7,1,1 10,8,1,2 8,10,2,1" },
  {
    name: "lettuce",
    hex: "#54a31b",
    rects:
      "16,5,1,1 20,5,1,1 15,6,1,1 9,7,2,1 13,8,2,1 11,9,1,1 13,9,1,1 12,10,1,1 10,11,1,2 6,12,1,1 9,13,1,2 5,16,1,1 7,17,2,1 20,23,1,1 21,26,1,1 27,26,1,1",
  },
  {
    name: "lettuce-bright",
    hex: "#6ec421",
    rects:
      "21,5,1,1 16,6,1,1 15,7,1,1 12,9,1,1 10,10,2,1 6,11,1,1 8,11,1,2 9,12,1,1 8,15,1,2 27,22,1,1 22,24,1,1 25,24,1,1",
  },
  {
    name: "lettuce-deep",
    hex: "#3f7717",
    rects:
      "22,5,1,1 14,6,1,2 15,8,1,1 8,9,1,1 14,9,1,1 7,11,1,2 11,11,2,1 11,12,1,1 10,13,1,1 5,15,1,1 9,15,1,1 4,16,1,1 6,16,2,1 6,17,1,1 7,18,2,1 2,19,1,1 2,21,1,2 29,24,1,1 19,25,1,1",
  },
  {
    name: "lime-flesh",
    hex: "#c4e574",
    rects:
      "29,19,1,4 25,20,2,1 28,20,1,1 24,21,2,1 23,22,2,1 26,23,1,1 20,24,1,1 23,24,1,3 27,24,2,1 27,25,1,1 22,26,1,1 24,26,3,1",
  },
  {
    name: "lime",
    hex: "#9cd23e",
    rects:
      "15,5,1,1 7,8,3,1 12,8,1,1 4,15,1,1 27,19,2,1 24,20,1,1 27,20,1,2 23,21,1,1 26,21,1,2 28,21,1,3 25,22,1,2 21,23,4,1 27,23,1,1 29,23,1,1 19,24,1,1 21,24,1,2 24,24,1,2 26,24,1,2 20,25,1,1 22,25,1,1 25,25,1,1 28,25,1,1",
  },
  {
    name: "lime-rind",
    hex: "#365e31",
    rects:
      "11,4,1,1,6 12,4,4,1 20,4,3,1 7,7,1,1,7 25,7,1,1,7 6,8,1,1,7 26,8,1,1 2,18,1,1 28,18,2,1 24,19,1,1 21,22,2,1 2,23,1,2 29,25,1,1 20,26,1,1 21,27,6,1",
  },
];

const cssVarFor = (name: string) => `--fiesta-icon-${name}`;

/**
 * The brand palette: semantic slot name → CSS custom property → default hex.
 * Override any `cssVar` on an ancestor element to re-tint that slot.
 */
export const FIESTA_ICON_PALETTE = SLOTS.map(({ name, hex }) => ({ name, cssVar: cssVarFor(name), hex }));

interface IconRect {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

function parseRects(encoded: string): IconRect[] {
  return encoded.split(" ").map((entry) => {
    const [x, y, width, height, eighths] = entry.split(",").map(Number);
    return { x, y, width, height, ...(eighths === undefined ? {} : { opacity: eighths / 8 }) };
  });
}

const GROUPS = SLOTS.map((slot) => ({
  name: slot.name,
  fill: `var(${cssVarFor(slot.name)}, ${slot.hex})`,
  rects: parseRects(slot.rects),
}));

/**
 * The brand mark as standalone SVG markup — the source of truth for the
 * data URI below and for anything that needs the mark outside React.
 */
export const FIESTA_ICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">` +
  GROUPS.map(
    (group) =>
      `<g fill="${group.fill}">` +
      group.rects
        .map(
          (r) =>
            `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"` +
            (r.opacity === undefined ? "" : ` opacity="${r.opacity}"`) +
            `/>`,
        )
        .join("") +
      `</g>`,
  ).join("") +
  `</svg>`;

/**
 * The mark as a `data:image/svg+xml` URI for `<img src>` consumers (Sidebar
 * `logoIconSrc`, Storybook `brandImage`). Inside an `<img>` the CSS custom
 * properties can't be themed, so the palette fallbacks apply — the classic
 * brand colors. Minimally escaped (quotes become apostrophes; only `%`, `#`,
 * `<`, `>` are percent-encoded) so the URI stays readable and compact.
 */
export const FIESTA_ICON_DATA_URI = `data:image/svg+xml,${FIESTA_ICON_SVG.replace(/"/g, "'")
  .replace(/%/g, "%25")
  .replace(/#/g, "%23")
  .replace(/</g, "%3C")
  .replace(/>/g, "%3E")}`;

/**
 * Memoized cache for the grouped `<rect>` children of the mark. `null` until
 * the first `FiestaIcon` render asks for it — importing this module allocates
 * no React elements (issue #84's import-time complaint).
 */
let iconChildren: ReactNode | null = null;

/**
 * Lazily builds the mark's children on first use, then reuses them forever.
 * They depend on no props — `size`/`className` only touch the root `<svg>` —
 * and React elements are immutable, so every `FiestaIcon` render can share
 * this same tree instead of rebuilding 345 elements (15 `<g>` + 330 `<rect>`),
 * and non-rendering importers pay nothing.
 */
function getIconChildren(): ReactNode {
  if (iconChildren === null) {
    iconChildren = GROUPS.map((group) => (
      <g key={group.name} fill={group.fill}>
        {group.rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} opacity={r.opacity} />
        ))}
      </g>
    ));
  }
  return iconChildren;
}

interface FiestaIconProps {
  size?: number;
  className?: string;
}

export function FiestaIcon({ size = 32, className }: FiestaIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {getIconChildren()}
    </svg>
  );
}
