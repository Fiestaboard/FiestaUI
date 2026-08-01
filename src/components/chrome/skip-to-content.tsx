"use client";

interface SkipToContentProps {
  /** Localized link text, e.g. "Skip to main content". */
  label: string;
  /** id of the main content landmark (default matches MainContent). */
  targetId?: string;
}

export function SkipToContent({ label, targetId = "main-content" }: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {label}
    </a>
  );
}
