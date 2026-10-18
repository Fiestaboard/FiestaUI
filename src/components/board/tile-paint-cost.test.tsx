import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BoardDisplay } from "./board-display";
import { BoardTeaser } from "./board-teaser";
import { StaticBoardDisplay } from "./static-board-display";

/*
 * Tiles must be cheap for WebKit to style and paint.
 *
 * Every split-flap tile used to carry an inline stack of box-shadows: a
 * blurred drop shadow plus four inset bevel edges on the tile, and four more
 * on its leaf. Safari paints inset and blurred box-shadows one element at a
 * time, so a page with a few boards (~260-800 shadowed tiles) froze for
 * 1.4-2 s on every navigation, while Chromium did not notice. Measured on a
 * real FiestaBoard in WebKit: stripping only box-shadow took a Displays ->
 * Home switch from 1.4 s to 40 ms. Moving the replacement gradients from
 * inline styles into classes then removed a further ~150-300 ms frame:
 * inline styles are parsed per element, a class once.
 *
 * So: tiles carry their materials as theme.css classes, and those rules use
 * gradients and unblurred drop shadows. The board's own frame keeps its soft
 * shadow: it is one element per board.
 */

const THEME = readFileSync(resolve(__dirname, "../../styles/theme.css"), "utf8");

/** The declarations of `.name { … }` in theme.css. */
function ruleFor(name: string): string {
  const match = THEME.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`theme.css has no .${name} rule`);
  return match[1];
}

/** Each layer of a `box-shadow` value, split on the commas between layers. */
function layers(boxShadow: string): string[] {
  return boxShadow
    .split(/,(?![^(]*\))/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** A layer's blur radius: the third length (offset-x, offset-y, blur). */
function blurOf(layer: string): number {
  const lengths = layer.replace(/rgba?\([^)]*\)|oklch\([^)]*\)|var\([^)]*\)/g, "").match(/-?\d*\.?\d+px|\b0\b/g) ?? [];
  return lengths.length >= 3 ? parseFloat(lengths[2]) : 0;
}

const isCostly = (boxShadow: string) => layers(boxShadow).some((layer) => layer.includes("inset") || blurOf(layer) > 0);

/** The board's frame: the one element allowed a soft (inline) shadow. */
const isBezel = (el: HTMLElement) => /\bborder-\[\d+px\]/.test(el.className);

/**
 * Elements under *root*, other than the frame, that set a box-shadow inline.
 * (The hinge seam and the sheen keep their small inline gradients; they
 * predate this and are not box-shadows.)
 */
function inlineShadows(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("*")].filter((el) => !isBezel(el) && el.style.boxShadow !== "");
}

const MATERIAL_CLASSES = [
  "board-leaf-bevel-black",
  "board-leaf-bevel-white",
  "board-tile-recess-black",
  "board-tile-recess-white",
  "board-tile-drop-white",
  "board-tile-drop-sm-white",
  "board-color-leaf",
  "board-color-leaf-drop",
];

/** Every class that draws a box-shadow — white boards only (theme.css). */
const DROP_CLASSES = ["board-tile-drop-white", "board-tile-drop-sm-white", "board-color-leaf-drop"];

/**
 * Elements under *root* carrying a drop-shadow class. On a black board there
 * must be none: a shadow cannot be seen on the #050505 bezel, and even
 * unblurred, one per tile cost WebKit a 150-300 ms frame.
 */
const dropShadowed = (root: HTMLElement) => root.querySelectorAll(DROP_CLASSES.map((c) => `.${c}`).join(","));

const MESSAGE = "HELLO {63}{66} WORLD\nFIESTA {67}";

afterEach(cleanup);

describe("tile material rules in theme.css", () => {
  it.each(MATERIAL_CLASSES)(".%s has no inset or blurred box-shadow", (name) => {
    const shadow = ruleFor(name).match(/box-shadow:([^;]*);/)?.[1] ?? "";
    expect(isCostly(shadow)).toBe(false);
  });

  it("has no drop shadow for a black board's tiles", () => {
    expect(THEME).not.toMatch(/\.board-tile-drop(-sm)?-black\s*\{/);
  });

  it.each(MATERIAL_CLASSES.filter((n) => n.includes("bevel") || n.includes("recess") || n === "board-color-leaf"))(
    ".%s draws its bevel as a gradient",
    (name) => {
      expect(ruleFor(name)).toMatch(/background-image:\s*linear-gradient/);
    },
  );
});

describe.each(["black", "white"] as const)("tiles on a %s board", (boardType) => {
  it("BoardDisplay sets no tile shadow inline, and every tile carries its materials", () => {
    const { container } = render(<BoardDisplay message={MESSAGE} boardType={boardType} animationsEnabled={false} />);
    const tiles = container.querySelectorAll('[data-testid^="char-tile-"]');
    expect(tiles.length).toBeGreaterThan(0);
    expect(inlineShadows(container)).toEqual([]);
    for (const tile of tiles) expect(tile.className).toContain(`board-tile-recess-${boardType}`);
    expect(container.querySelectorAll(`.board-leaf-bevel-${boardType}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".board-color-leaf").length).toBeGreaterThan(0);
    if (boardType === "black") expect(dropShadowed(container).length).toBe(0);
    else for (const tile of tiles) expect(tile.className).toContain("board-tile-drop-white");
  });

  it("BoardDisplay's static path sets no tile shadow inline", () => {
    const { container } = render(<BoardDisplay message={MESSAGE} boardType={boardType} isStatic />);
    expect(inlineShadows(container)).toEqual([]);
    expect(container.querySelectorAll(`.board-leaf-bevel-${boardType}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".board-color-leaf").length).toBeGreaterThan(0);
    if (boardType === "black") expect(dropShadowed(container).length).toBe(0);
  });

  it.each(["sm", "md", "lg"] as const)("StaticBoardDisplay (%s) sets no tile shadow inline", (size) => {
    const { container } = render(<StaticBoardDisplay message={MESSAGE} boardType={boardType} size={size} />);
    expect(inlineShadows(container)).toEqual([]);
    const tiles = container.querySelectorAll("[data-note-tile]");
    expect(tiles.length).toBeGreaterThan(0);
    if (boardType === "black") expect(dropShadowed(container).length).toBe(0);
    else {
      const drop = size === "sm" ? "board-tile-drop-sm-white" : "board-tile-drop-white";
      for (const tile of tiles) expect(tile.className).toContain(drop);
    }
  });

  it.each(["sm", "md"] as const)("BoardTeaser (%s) sets no tile shadow inline", (size) => {
    const { container } = render(<BoardTeaser teaser="HI {63} THERE" boardType={boardType} size={size} />);
    expect(inlineShadows(container)).toEqual([]);
    if (boardType === "black") expect(dropShadowed(container).length).toBe(0);
    else {
      const drop = size === "sm" ? "board-tile-drop-sm-white" : "board-tile-drop-white";
      expect(container.querySelectorAll(`.${drop}`).length).toBeGreaterThan(0);
    }
  });
});
