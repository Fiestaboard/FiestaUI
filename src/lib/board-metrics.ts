/**
 * Render-invariant Tailwind class maps keyed by board size ("sm" | "md" | "lg").
 *
 * These are a single shared source for BoardDisplay, StaticBoardDisplay, and
 * BoardTeaser so a teaser strip and a static preview match a full animated
 * board row rendered at the same size. Keeping one copy here means the three
 * renderers can't drift apart.
 *
 * They live at module scope (imported once) rather than inside a component body
 * so they are allocated a single time at import instead of on every render.
 * BoardDisplay originally hoisted its own copies for this reason (PR #31 /
 * issue #24); StaticBoardDisplay and BoardTeaser re-allocated equivalents per
 * render until they were consolidated here (issue #68).
 */

export type BoardSize = "sm" | "md" | "lg";

export const sizeClasses: Record<BoardSize, string> = {
  sm: "w-[14px] h-[18px]", // Small previews stay fixed size
  md: "w-[14px] h-[20px] sm:w-[20px] sm:h-[28px] md:w-[24px] md:h-[34px] lg:w-[28px] lg:h-[40px]", // Responsive
  lg: "w-[18px] h-[26px] sm:w-[24px] sm:h-[34px] md:w-[28px] md:h-[40px] lg:w-[32px] lg:h-[46px]", // Responsive
};

export const textSizeClasses: Record<BoardSize, string> = {
  sm: "text-[7px]", // Small previews stay fixed size
  md: "text-[7px] sm:text-[10px] md:text-[13px] lg:text-[16px]", // Responsive
  lg: "text-[10px] sm:text-[13px] md:text-[16px] lg:text-[20px]", // Responsive
};

export const paddingClasses: Record<BoardSize, string> = {
  sm: "px-3 py-4", // Small previews stay fixed size
  md: "px-2 py-3 sm:px-4 sm:py-6 md:px-5 md:py-8 lg:px-6 lg:py-10", // Responsive
  lg: "px-3 py-4 sm:px-5 sm:py-7 md:px-6 md:py-9 lg:px-8 lg:py-12", // Responsive
};

export const gapClasses: Record<BoardSize, string> = {
  sm: "gap-[3px]", // Small previews stay fixed size
  md: "gap-[2px] sm:gap-[4px] md:gap-[5px]", // Responsive
  lg: "gap-[3px] sm:gap-[5px] md:gap-[6px] lg:gap-[7px]", // Responsive
};
