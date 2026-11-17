"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

export interface InspectorTab {
  /** Stable, unique key shared with the matching InspectorTabsContent. */
  value: string;
  /** Localized visible name; must not contain interactive elements. */
  label: React.ReactNode;
  disabled?: boolean;
}

type ListName =
  { "aria-label": string; "aria-labelledby"?: never } | { "aria-label"?: never; "aria-labelledby": string };

export type InspectorTabsProps = Omit<
  React.ComponentProps<typeof Tabs>,
  "orientation" | "value" | "defaultValue" | "onValueChange" | "aria-label" | "aria-labelledby" | "className"
> &
  ListName & {
    tabs: readonly InspectorTab[];
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (
      value: string | null,
      details: Parameters<NonNullable<React.ComponentProps<typeof Tabs>["onValueChange"]>>[1],
    ) => void;
    /** Optional nonnegative finite counts. Zero is visible; omit a key to hide it. */
    counts?: Readonly<Record<string, number>>;
    /** Touch targets are at least 44px high, with the same Core tab appearance. */
    size?: "default" | "touch";
    disabled?: boolean;
    className?: string;
  };

/**
 * C28 Inspector navigation. The host chooses the tab list (for example five
 * desktop tabs or six phone tabs) and owns matching InspectorTabsContent panels.
 * Arrow keys move focus; Enter/Space activate. Base UI owns selection fallback,
 * disabled navigation and tab/panel relationships. Controlled hosts must update
 * `value` when their tab list changes. Native platform skins belong to kits.
 */
function InspectorTabs({
  tabs,
  counts,
  size = "default",
  disabled = false,
  className,
  value,
  defaultValue,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: InspectorTabsProps) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const updateEdges = React.useCallback(() => {
    const list = listRef.current!;
    const outer = barRef.current!.getBoundingClientRect();
    const inner = list.getBoundingClientRect();
    const next = { left: inner.left < outer.left - 1, right: inner.right > outer.right + 1 };
    setEdges((previous) => (previous.left === next.left && previous.right === next.right ? previous : next));
  }, []);

  const reveal = React.useCallback(
    (tab: HTMLElement | null) => {
      if (!tab) return;
      const viewport = viewportRef.current!;
      const list = listRef.current!;
      const outer = barRef.current!.getBoundingClientRect();
      const inner = list.getBoundingClientRect();
      const target = tab.getBoundingClientRect();
      // Physical coordinates work with both LTR and RTL scrollLeft conventions.
      // Reserve the 48px fade plus the 4px focus ring where content continues.
      const leftInset = Math.min(52, Math.max(0, target.left - inner.left));
      const rightInset = Math.min(52, Math.max(0, inner.right - target.right));
      const left = outer.left + leftInset;
      const right = outer.right - rightInset;
      if (target.left < left) viewport.scrollLeft += target.left - left;
      else if (target.right > right) viewport.scrollLeft += Math.min(target.right - right, target.left - left);
      updateEdges();
    },
    [updateEdges],
  );

  const revealFocusedOrSelected = React.useCallback(() => {
    const list = listRef.current!;
    const focus = list.ownerDocument.activeElement;
    const focusedTab = list.contains(focus) ? focus?.closest<HTMLElement>("[role=tab]") : null;
    reveal(focusedTab ?? list.querySelector<HTMLElement>("[role=tab][aria-selected=true]"));
  }, [reveal]);

  React.useEffect(() => {
    const viewport = viewportRef.current!;
    const list = listRef.current!;
    let previousSelection = list.querySelector<HTMLElement>("[role=tab][aria-selected=true]");
    const resize = new ResizeObserver(() => {
      revealFocusedOrSelected();
      updateEdges();
    });
    // An actual selection change wins over manual focus. Ignore duplicate
    // attribute mutations so background layout/count updates keep focus visible.
    const selection = new MutationObserver(() => {
      const selected = list.querySelector<HTMLElement>("[role=tab][aria-selected=true]");
      if (selected !== previousSelection) {
        previousSelection = selected;
        reveal(selected);
      }
    });
    resize.observe(viewport);
    resize.observe(list);
    selection.observe(list, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
    return () => {
      resize.disconnect();
      selection.disconnect();
    };
  }, [reveal, revealFocusedOrSelected, updateEdges]);

  React.useEffect(() => {
    revealFocusedOrSelected();
    updateEdges();
  }, [revealFocusedOrSelected, updateEdges, tabs, counts, size]);

  React.useEffect(() => {
    reveal(listRef.current!.querySelector<HTMLElement>("[role=tab][aria-selected=true]"));
  }, [reveal, value, defaultValue]);

  return (
    <Tabs
      {...props}
      value={value}
      defaultValue={defaultValue}
      data-slot="inspector-tabs"
      data-size={size}
      className={cn("min-w-0", className)}
    >
      <div ref={barRef} data-slot="inspector-tabs-bar" className="relative flow-root rounded-lg bg-muted">
        {/* p3 + 1px transparent viewport bleed preserves the shared 4px ring.
            flow-root contains the negative margins; the visible bar stays 38/50px. */}
        <div
          ref={viewportRef}
          data-slot="inspector-tabs-viewport"
          onScroll={updateEdges}
          className="-m-px overflow-x-auto rounded-[inherit] p-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList
            ref={listRef}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            data-slot="inspector-tabs-list"
            className="flex h-auto w-max min-w-full justify-start rounded-lg bg-transparent p-0.75"
            onFocusCapture={(event) => reveal((event.target as HTMLElement).closest<HTMLElement>("[role=tab]"))}
          >
            {tabs.map((tab) => {
              const count = counts?.[tab.value];
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={disabled || tab.disabled}
                  data-slot="inspector-tabs-trigger"
                  className={cn(
                    "min-w-max flex-1 gap-1.5 rounded-sm data-[disabled]:opacity-50 forced-colors:focus-visible:[outline:2px_solid_Highlight]! forced-colors:focus-visible:outline-offset-2!",
                    size === "touch" && "min-h-(--touch-target)",
                  )}
                >
                  <span>{tab.label}</span>
                  {count !== undefined && Number.isFinite(count) && count >= 0 && (
                    <>
                      {" "}
                      <Badge data-slot="inspector-tabs-count" variant="destructive" className="px-1.5 py-0">
                        {count}
                      </Badge>
                    </>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {edges.left && (
          <div
            aria-hidden="true"
            data-slot="inspector-tabs-fade-left"
            className="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-[inherit] bg-linear-to-r from-muted via-muted/95 via-45% to-transparent"
          />
        )}
        {edges.right && (
          <div
            aria-hidden="true"
            data-slot="inspector-tabs-fade-right"
            className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-[inherit] bg-linear-to-l from-muted via-muted/95 via-45% to-transparent"
          />
        )}
      </div>
      {children}
    </Tabs>
  );
}

/** A panel labelled and controlled by the matching data-driven Inspector tab. */
function InspectorTabsContent(props: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent data-slot="inspector-tabs-content" {...props} />;
}

export { InspectorTabs, InspectorTabsContent };
