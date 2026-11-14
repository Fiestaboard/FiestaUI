"use client";

import { ChevronRight, Server } from "lucide-react";
import * as React from "react";

import { IconTile } from "../containment/icon-tile";
import { ListRow } from "../containment/list-row";

interface HubDiscoveryRowProps extends Omit<React.ComponentProps<"li">, "children" | "onSelect"> {
  /** Human-readable hub name. Content slots must not contain controls. */
  name: React.ReactNode;
  /** The host-discovered address, displayed verbatim on the second line. */
  address: string;
  /** Activates the entire row. Discovery and navigation remain the host's. */
  onSelect: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  /** Optional noninteractive status, such as a display count. */
  meta?: React.ReactNode;
  /** Decorative glyph inside IconTile sm. Defaults to Server. */
  icon?: React.ReactNode;
  /** Inherits ListRowGroup's size when omitted. */
  size?: React.ComponentProps<typeof ListRow>["size"];
  layout?: React.ComponentProps<typeof ListRow>["layout"];
}

/**
 * One discovered hub in a ListRowGroup variant="inset" (05 Setup Row
 * 35:17409, Choose your hub 39:65267; slice 1.10c).
 *
 * The li root preserves the group's list semantics and corner radii. The
 * inner ListRow is one native button: pointer, Enter and Space select the
 * whole record, without nested controls. Root attributes and ref belong to
 * the li; onSelect and disabled belong to the button. The host supplies
 * localized name/meta content and owns discovery, permissions and routing.
 * No network requests, remembered-hub storage or platform chrome live here.
 */
function HubDiscoveryRow({
  name,
  address,
  onSelect,
  disabled = false,
  meta,
  icon = <Server />,
  size,
  layout,
  ref,
  ...props
}: HubDiscoveryRowProps) {
  const id = React.useId();
  const hasMeta = meta != null && meta !== false;
  return (
    <li {...props} ref={ref} data-slot="hub-discovery-row">
      <ListRow
        render={<button type="button" disabled={disabled} onClick={onSelect} />}
        aria-labelledby={`${id}-name ${id}-address${hasMeta ? ` ${id}-meta` : ""}`}
        title={<span id={`${id}-name`}>{name}</span>}
        description={<span id={`${id}-address`}>{address}</span>}
        leading={<IconTile size="sm">{icon}</IconTile>}
        meta={hasMeta ? <span id={`${id}-meta`}>{meta}</span> : undefined}
        trailing={<ChevronRight aria-hidden="true" className="size-4" />}
        size={size}
        layout={layout}
        className="rounded-[inherit] disabled:pointer-events-none disabled:opacity-50"
      />
    </li>
  );
}

export { HubDiscoveryRow };
export type { HubDiscoveryRowProps };
