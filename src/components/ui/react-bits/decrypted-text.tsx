"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "../../../lib/utils";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: "view" | "hover" | "both";
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = "start",
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "",
  animateOn = "hover",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  // Source of truth for the scramble loop so the interval body stays pure — no
  // side effects inside a setState updater (which React runs twice in StrictMode).
  const revealedRef = useRef<Set<number>>(new Set());
  const hasAnimatedRef = useRef(false);

  // Respect the OS reduced-motion preference: when set, skip the scramble loop
  // entirely and render the resolved text. A change listener honors a runtime flip.
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(reducedMotion.matches);
    update();
    reducedMotion.addEventListener("change", update);
    return () => reducedMotion.removeEventListener("change", update);
  }, []);

  const getNextIndex = useCallback(
    (revealedSet: Set<number>): number => {
      const textLength = text.length;
      switch (revealDirection) {
        case "start":
          return revealedSet.size;
        case "end":
          return textLength - 1 - revealedSet.size;
        case "center": {
          const middle = Math.floor(textLength / 2);
          const offset = Math.floor(revealedSet.size / 2);
          const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;
          if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
            return nextIndex;
          }
          for (let i = 0; i < textLength; i++) {
            if (!revealedSet.has(i)) return i;
          }
          return 0;
        }
        default:
          return revealedSet.size;
      }
    },
    [text.length, revealDirection],
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let currentIteration = 0;
    const availableChars = characters.split("");

    const shuffleText = (originalText: string, currentRevealed: Set<number>): string => {
      return originalText
        .split("")
        .map((char, i) => {
          if (char === " ") return " ";
          if (currentRevealed.has(i)) return originalText[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)];
        })
        .join("");
    };

    if (isHovering && !prefersReducedMotion) {
      setIsScrambling(true);
      interval = setInterval(() => {
        if (sequential) {
          const prevRevealed = revealedRef.current;
          if (prevRevealed.size < text.length) {
            const nextIndex = getNextIndex(prevRevealed);
            const newRevealed = new Set(prevRevealed);
            newRevealed.add(nextIndex);
            revealedRef.current = newRevealed;
            setRevealedIndices(newRevealed);
            setDisplayText(shuffleText(text, newRevealed));
          } else {
            clearInterval(interval);
            setIsScrambling(false);
          }
        } else {
          setDisplayText(shuffleText(text, revealedRef.current));
          currentIteration++;
          if (currentIteration >= maxIterations) {
            clearInterval(interval);
            setIsScrambling(false);
            setDisplayText(text);
          }
        }
      }, speed);
    } else {
      setDisplayText(text);
      setRevealedIndices(new Set());
      revealedRef.current = new Set();
      setIsScrambling(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHovering, prefersReducedMotion, text, speed, maxIterations, sequential, characters, getNextIndex]);

  useEffect(() => {
    if (animateOn !== "view" && animateOn !== "both") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            setIsHovering(true);
            hasAnimatedRef.current = true;
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.1 },
    );

    const currentRef = containerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => observer.disconnect();
  }, [animateOn]);

  const hoverProps =
    animateOn === "hover" || animateOn === "both"
      ? {
          onMouseEnter: () => setIsHovering(true),
          onMouseLeave: () => setIsHovering(false),
        }
      : {};

  // Split once per displayText change instead of on every render — hover/scramble
  // state toggles re-render this component without changing the string.
  const chars = useMemo(() => displayText.split(""), [displayText]);

  return (
    <span ref={containerRef} className={cn("inline-block", parentClassName)} {...hoverProps}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className={className}>
        {chars.map((char, index) => {
          const isRevealedOrDone = revealedIndices.has(index) || !isScrambling || !isHovering;
          return (
            <span key={index} className={isRevealedOrDone ? className : encryptedClassName}>
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
