import { memo } from "react";

import { cn } from "../../lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  outerClassName?: string;
  /** When true, the layout fills the viewport height and hides overflow so
   *  inner content (e.g. the schedule calendar) can scroll independently. */
  fillHeight?: boolean;
}

export const PageLayout = memo(function PageLayout({
  children,
  className,
  outerClassName,
  fillHeight,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "bg-background overflow-x-hidden",
        // fillHeight pins the page to the viewport so inner content (e.g. the
        // calendar grid) can scroll independently. On phones we drop the
        // pinning — viewport-internal scroll on a 24-hour grid is fiddly to
        // discover, so we let the page itself scroll instead.
        fillHeight
          ? "min-h-full sm:h-[calc(100dvh-72px)] sm:flex sm:flex-col sm:overflow-hidden lg:h-dvh"
          : "min-h-full",
        outerClassName,
      )}
    >
      <div
        className={cn(
          // lg:py-7, not lg:py-3. The old value aligned the top of the page
          // content with the top EDGE of the inset sidebar rail — a real
          // alignment, but to the wrong landmark, and it made desktop the
          // tightest breakpoint in the ramp (12px, against 32px at md).
          // It only read as acceptable while PageHeader drew a card whose own
          // py-4 supplied the missing inset. With the header now bare type,
          // 28px puts the page title on the same optical line as the wordmark
          // in the rail beside it, which is the landmark a reader actually
          // sees.
          "container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 lg:py-7 max-w-full",
          // When pinned to the viewport (e.g. calendar mode), the inner content
          // owns the scrolling — trim mobile vertical padding so the child gets
          // back the pixels normally reserved for page breathing room.
          fillHeight && "py-2 sm:py-3 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
});
