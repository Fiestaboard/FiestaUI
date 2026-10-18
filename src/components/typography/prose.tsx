import type * as React from "react";

import { cn } from "../../lib/utils";

export interface ProseProps extends React.ComponentProps<"div"> {
  /** Compact chat copy or document copy. Defaults to `base`. */
  size?: "sm" | "base";
  /**
   * Shift heading sizes down the visual scale, without changing HTML levels.
   * Truncated and clamped to 0–5; non-finite values use 0. Defaults to 0.
   */
  headingOffset?: number;
}

// Full utility strings stay here for consumers' Tailwind @source scans. No
// markdown parser, child traversal, or extra stylesheet import is required.
const proseClasses = [
  "min-w-0 max-w-full overflow-x-auto text-foreground [overflow-wrap:anywhere]",
  "[&_:is(h1,h2,h3,h4,h5,h6)]:mt-[1.5em] [&_:is(h1,h2,h3,h4,h5,h6)]:mb-[0.5em]",
  "[&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold [&_:is(h1,h2,h3,h4,h5,h6)]:tracking-tight [&_:is(h1,h2,h3,h4,h5,h6)]:leading-tight",
  "[&_h1]:text-[length:var(--prose-h1-size)] [&_h2]:text-[length:var(--prose-h2-size)]",
  "[&_h3]:text-[length:var(--prose-h3-size)] [&_h4]:text-[length:var(--prose-h4-size)]",
  "[&_h5]:text-[length:var(--prose-h5-size)] [&_h6]:text-[length:var(--prose-h6-size)]",
  "[&_:is(p,ul,ol,blockquote,pre,table,hr)]:my-[1em]",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:ps-5",
  "[&_li>p]:my-1 [&_li>:is(ul,ol)]:my-1",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:[overflow-wrap:normal]",
  // Fenced code has no inline chip, even when the renderer omits language-*.
  "[&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
  "[&_thead]:bg-muted [&_:is(th,td)]:border [&_:is(th,td)]:border-border [&_:is(th,td)]:align-top",
  "[&_th]:text-start [&_th]:font-semibold [&_caption]:mb-2 [&_caption]:text-start [&_caption]:text-muted-foreground",
  "[&_img]:my-[1em] [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_a]:rounded-sm [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4",
  "[&_a:focus-visible]:outline-none [&_a:focus-visible]:[box-shadow:var(--focus-ring-shadow)]",
  "[&_hr]:border-border",
  // Trim block edges in renderer wrappers, list items, and quotes as well.
  "[&_:is(h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote,pre,table,hr):first-child]:mt-0",
  "[&_:is(h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote,pre,table,hr):last-child]:mb-0",
];

const densityClasses = {
  sm: "text-sm leading-relaxed [&_li]:my-0.5 [&_pre]:p-2 [&_:is(th,td)]:px-1.5 [&_:is(th,td)]:py-1",
  base: "text-base leading-relaxed [&_li]:my-1 [&_pre]:p-4 [&_:is(th,td)]:px-3 [&_:is(th,td)]:py-2",
};

// Fallbacks match Tailwind's type tokens if a consumer only scans this module
// and its build omits otherwise-unused --text-* declarations.
const typeScale = {
  xs: "var(--text-xs, 0.75rem)",
  sm: "var(--text-sm, 0.875rem)",
  base: "var(--text-base, 1rem)",
  lg: "var(--text-lg, 1.125rem)",
  xl: "var(--text-xl, 1.25rem)",
};
const headingScales = {
  sm: [typeScale.lg, typeScale.base, typeScale.sm, typeScale.sm, typeScale.xs, typeScale.xs],
  base: [typeScale.xl, typeScale.lg, typeScale.base, typeScale.sm, typeScale.xs, typeScale.xs],
};

/**
 * Token-styled descendants for already-rendered rich text. The app owns its
 * markdown renderer, sanitization, URL policy and semantic heading levels.
 * String children remain text. Uses the package's normal theme.css setup.
 */
function Prose({ size = "base", headingOffset = 0, className, style, ...props }: ProseProps) {
  const offset = Number.isFinite(headingOffset) ? Math.min(5, Math.max(0, Math.trunc(headingOffset))) : 0;
  const scale = headingScales[size];
  const headings = Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => [`--prose-h${index + 1}-size`, scale[Math.min(5, index + offset)]]),
  ) as React.CSSProperties;
  return (
    <div
      {...props}
      data-slot="prose"
      data-size={size}
      data-heading-offset={offset}
      className={cn(
        proseClasses,
        densityClasses[size],
        size === "base" && offset === 0 && "[&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2",
        className,
      )}
      style={{ ...headings, ...style }}
    />
  );
}

export { Prose };
