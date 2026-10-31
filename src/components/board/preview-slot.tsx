"use client";

import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";

import { cn } from "../../lib/utils";

/** Equal thumbnail space for differently shaped devices and their loading states.
 * Shrinks the complete preview uniformly; never crops or enlarges its pixels.
 * For thumbnails only: interactive Fit / Actual-size detail views stay outside.
 */
export function PreviewSlot({
  children,
  className,
  density = "compact",
  ...props
}: ComponentProps<"div"> & {
  density?: "compact" | "normal";
}) {
  const slot = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const outer = slot.current;
    const inner = content.current;
    if (!outer || !inner) return;
    const measure = () => {
      if (!outer.clientWidth || !outer.clientHeight || !inner.offsetWidth || !inner.offsetHeight) return;
      const next = Math.min(1, outer.clientWidth / inner.offsetWidth, outer.clientHeight / inner.offsetHeight);
      setScale((previous) => (Math.abs(previous - next) < 0.0005 ? previous : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      {...props}
      data-slot="preview-slot"
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-md bg-muted/40",
        density === "compact" ? "h-[168px]" : "h-[200px]",
        className,
      )}
    >
      <div ref={slot} className="absolute inset-3">
        <div
          ref={content}
          className="absolute left-1/2 top-1/2 w-max"
          style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
