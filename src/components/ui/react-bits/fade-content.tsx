"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface FadeContentProps {
  children: React.ReactNode;
  blur?: boolean;
  duration?: number;
  delay?: number;
  threshold?: number;
  className?: string;
  translateY?: number;
}

export default function FadeContent({
  children,
  blur = false,
  duration = 0.6,
  delay = 0,
  threshold = 0.1,
  className = "",
  translateY = 20,
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Respect the OS reduced-motion preference: when set, skip the entrance
  // transition entirely and render the settled state. A change listener honors
  // a runtime flip. Mirrors decrypted-text.tsx.
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(reducedMotion.matches);
    update();
    reducedMotion.addEventListener("change", update);
    return () => reducedMotion.removeEventListener("change", update);
  }, []);

  // If the element is already on-screen at mount, kick the animation off on
  // the next frame — IntersectionObserver fires asynchronously and would leave
  // a ~20-30ms gap of invisible content between mount and animation start
  // (perceived as a flicker right after a route transition, since the new
  // PageFadeWrapper mounts with opacity:0 and stays there until the observer
  // catches up). Off-screen mounts still fall back to the observer so this
  // keeps working as a scroll-into-view effect elsewhere.
  useLayoutEffect(() => {
    // Reduced motion jumps straight to the settled state, so there is nothing
    // to observe for.
    if (prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const onScreen = rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;

    if (onScreen) {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, prefersReducedMotion]);

  const settled = inView || prefersReducedMotion;
  const style = useMemo<React.CSSProperties>(
    () => ({
      opacity: settled ? 1 : 0,
      filter: blur ? (settled ? "blur(0px)" : "blur(10px)") : undefined,
      transform: settled ? "translateY(0)" : `translateY(${translateY}px)`,
      transition: prefersReducedMotion
        ? undefined
        : `opacity ${duration}s ease, filter ${duration}s ease, transform ${duration}s ease`,
      transitionDelay: prefersReducedMotion ? undefined : `${delay}s`,
    }),
    [settled, prefersReducedMotion, blur, duration, delay, translateY],
  );

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
