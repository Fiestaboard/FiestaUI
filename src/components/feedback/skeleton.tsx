import { cn } from "../../lib/utils";

/**
 * Content placeholder.
 *
 * Reduced motion — the pulse is dropped entirely rather than left to the
 * global 1ms backstop in theme.css. That backstop stops an animation, but
 * where it stops is arbitrary; `pulse` dips to `opacity: .5`, so a frozen
 * frame can leave a grid of placeholders sitting at inconsistent opacities
 * that reads as a half-loaded page. `motion-reduce:animate-none` instead
 * lands every placeholder on the same flat `bg-accent` block — which is
 * already the thing that says "content is coming", with or without the
 * pulse (issue #180).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse motion-reduce:animate-none rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
