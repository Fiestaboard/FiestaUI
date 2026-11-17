"use client";

import { Eye, EyeOff, GripVertical, Lock, Sigma, Type } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Toggle } from "../forms/toggle";
import { ListRow } from "./list-row";
import { arrayMove, SortableList, SortableListHandle, SortableListMoveButtons } from "./sortable-list";

interface LayerRowProps extends Omit<React.ComponentProps<"div">, "children" | "onSelect"> {
  name: string;
  /** Canvas dimensions and position. Visually truncated; the full text describes the selection button. */
  meta?: string;
  /** Decorative shape/type icon; defaults to Lucide Type. */
  type?: React.ReactNode;
  bound?: boolean;
  boundValue?: string;
  /** Protected text-cell status. This does not grant an unlock action or disable inspection. */
  locked?: boolean;
  selected?: boolean;
  visible?: boolean;
  disabled?: boolean;
  size?: "default" | "touch";
  /** Usually SortableListHandle, supplied by LayersPanel. Standalone rows have no inert grip. */
  dragHandle?: React.ReactNode;
  onSelect?: () => void;
  onVisibleChange?: (visible: boolean) => void;
  onOpenFormula?: () => void;
}

/** C41: one canvas shape, in front-to-back model order. All actions are sibling controls. */
function LayerRow({
  name,
  meta,
  type = <Type className="size-4" />,
  bound = false,
  boundValue = "Bound",
  locked = false,
  selected = false,
  visible = true,
  disabled = false,
  size = "default",
  dragHandle,
  onSelect,
  onVisibleChange,
  onOpenFormula,
  className,
  ...props
}: LayerRowProps) {
  const id = React.useId();
  const nameId = `${id}-name`;
  const metaId = `${id}-meta`;
  const valueId = `${id}-value`;
  const VisibilityIcon = visible ? Eye : EyeOff;
  const content = (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span id={nameId} className="truncate text-sm leading-5 font-medium" title={name}>
        {name}
      </span>
      {meta ? (
        <span id={metaId} className="truncate text-xs leading-4 font-normal text-muted-foreground" title={meta}>
          {meta}
        </span>
      ) : null}
    </span>
  );
  const boundContent = (
    <span
      data-slot="layer-row-bound"
      className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-tag-formula/15 px-1.5 py-0.5 font-mono text-xs leading-4 font-normal text-tag-formula-foreground"
    >
      <Sigma aria-hidden="true" className="size-3" />
      <span id={valueId} className="truncate" title={boundValue}>
        {boundValue}
      </span>
    </span>
  );

  return (
    <ListRow
      {...props}
      data-layer-row=""
      data-selected={selected ? "" : undefined}
      aria-current={selected ? "true" : undefined}
      data-hidden={!visible ? "" : undefined}
      size={size}
      layout="inline"
      variant="plain"
      className={cn(
        "gap-2 rounded-md py-1 pr-2.5 pl-2 [&_[data-slot=list-row-leading]]:gap-2 [&_[data-slot=list-row-title]]:flex",
        size === "touch" ? "min-h-14" : "min-h-11",
        selected && "bg-accent outline-[1.5px]! -outline-offset-[1.5px]! outline-solid! outline-primary!",
        disabled && "opacity-50",
        className,
      )}
      leading={
        <>
          {dragHandle}
          {onVisibleChange ? (
            <Toggle
              size={size === "touch" ? "icon-touch" : "icon-sm"}
              className={size === "default" ? "size-6 min-w-6 p-0" : undefined}
              aria-label={`Hide ${name}`}
              title={visible ? `Hide ${name}` : `Show ${name}`}
              pressed={!visible}
              onPressedChange={(hidden) => onVisibleChange(!hidden)}
              disabled={disabled}
            >
              <VisibilityIcon aria-hidden="true" className="size-4" />
            </Toggle>
          ) : (
            <span role="img" aria-label={visible ? "Visible" : "Hidden"}>
              <VisibilityIcon aria-hidden="true" className="size-4" />
            </span>
          )}
          <span aria-hidden="true" className="flex shrink-0 items-center [&_svg]:size-4">
            {type}
          </span>
        </>
      }
      title={
        onSelect ? (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-auto w-full min-w-0 shrink justify-start gap-0 p-0 whitespace-normal",
              size === "touch" ? "min-h-touch" : "min-h-9",
            )}
            aria-labelledby={nameId}
            aria-describedby={meta ? metaId : undefined}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onSelect}
          >
            {content}
          </Button>
        ) : (
          content
        )
      }
      trailing={
        bound || locked ? (
          <>
            {bound ? (
              onOpenFormula ? (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Inspect formula for ${name}`}
                  aria-describedby={valueId}
                  size={size === "touch" ? "touch" : "sm"}
                  className={cn("max-w-24 min-w-0 px-0", size === "default" && "h-6")}
                  disabled={disabled}
                  onClick={onOpenFormula}
                >
                  {boundContent}
                </Button>
              ) : (
                <span className="flex max-w-24 min-w-0">{boundContent}</span>
              )
            ) : null}
            {locked ? (
              <span role="img" aria-label="Locked" title="Locked">
                <Lock aria-hidden="true" className="size-3.5" />
              </span>
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

interface LayerItem extends Pick<
  LayerRowProps,
  "name" | "meta" | "type" | "bound" | "boundValue" | "locked" | "visible"
> {
  id: string;
}

interface LayersPanelProps extends Omit<React.ComponentProps<"ul">, "children" | "onSelect"> {
  layers: readonly LayerItem[];
  /** Receives a new array in displayed front-to-back order. The input is never mutated. */
  onReorder: (layers: LayerItem[]) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onVisibleChange?: (id: string, visible: boolean) => void;
  onOpenFormula?: (id: string) => void;
  disabled?: boolean;
  size?: "default" | "touch";
}

/** Controlled layer list; SortableList owns pointer/keyboard moves, cancellation and announcements. */
function LayersPanel({
  layers,
  onReorder,
  selectedId,
  onSelect,
  onVisibleChange,
  onOpenFormula,
  disabled = false,
  size = "default",
  ...props
}: LayersPanelProps) {
  return (
    <SortableList
      aria-label="Layers"
      {...props}
      items={layers}
      getKey={(layer) => layer.id}
      getLabel={(layer) => layer.name}
      onMove={(from, to) => onReorder(arrayMove(layers, from, to))}
      disabled={disabled}
      size={size}
      hideStatus
      renderItem={(layer) => (
        <>
          <LayerRow
            {...layer}
            selected={layer.id === selectedId}
            disabled={disabled}
            size={size}
            onSelect={onSelect ? () => onSelect(layer.id) : undefined}
            onVisibleChange={onVisibleChange ? (visible) => onVisibleChange(layer.id, visible) : undefined}
            onOpenFormula={onOpenFormula ? () => onOpenFormula(layer.id) : undefined}
            dragHandle={
              <SortableListHandle className={size === "default" ? "size-6" : undefined}>
                <GripVertical className="size-3.5" />
              </SortableListHandle>
            }
          />
          <div className="flex justify-end">
            <SortableListMoveButtons />
          </div>
        </>
      )}
    />
  );
}

export { LayerRow, LayersPanel };
export type { LayerItem, LayerRowProps, LayersPanelProps };
