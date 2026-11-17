import type { ReactNode } from "react";

import { PreviewSlot } from "../board/preview-slot";

/** Coordinates are fractions of the displayed overview slot, including any letterboxing. */
export interface RevisionChangeRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export const boundedRevisionRegions = (regions: readonly RevisionChangeRegion[]) =>
  regions
    .map((region) => {
      const bounded = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);
      const x = bounded(region.x);
      const y = bounded(region.y);
      return {
        ...region,
        x,
        y,
        width: Math.min(1 - x, bounded(region.width)),
        height: Math.min(1 - y, bounded(region.height)),
      };
    })
    .filter((region) => region.width > 0 && region.height > 0);

/** Existing PreviewSlot owns uniform scaling; change outlines stay two CSS pixels. */
export function RevisionOverview({
  children,
  width,
  height,
  regions = [],
}: {
  children: ReactNode;
  width: number;
  height: number;
  regions?: readonly RevisionChangeRegion[];
}) {
  return (
    <div
      aria-hidden="true"
      data-slot="revision-overview"
      className="relative max-w-full shrink-0 overflow-hidden"
      style={{ width, height }}
    >
      <PreviewSlot className="h-full w-full bg-transparent [&>div]:inset-0">{children}</PreviewSlot>
      {regions.map((region) => (
        <span
          key={region.id}
          data-slot="revision-change-region"
          className="pointer-events-none absolute rounded-[2px] border-2 border-tag-formula"
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
