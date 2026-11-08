/**
 * Unit tests for the ColorTokens story's registry (token-registry.ts).
 *
 * scripts/ci/tests/token-registry.test.mjs proves the registry over the REAL
 * theme.css (the partition is total, every token is grouped). This file pins
 * the parser and the helpers on small hand-written stylesheets, so each branch
 * is exercised on purpose rather than by whatever theme.css happens to hold.
 * jsdom has no 2D canvas, so the browser-only colour resolution runs against a
 * stub context that behaves like one.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildColorTokenRegistry,
  contrastRatio,
  isColorValue,
  parseRootDeclarations,
  relativeLuminance,
  resolveColor,
  toHex,
} from "./token-registry";

describe("parseRootDeclarations", () => {
  it("reads every :root block in order, later declarations winning, and ignores other selectors", () => {
    const css = `
      /* --commented-out: red; */
      :root { --a: #111111; --b: var(--a); }
      .dark { --a: #eeeeee; }
      :root { --a: #222222; --c: "x;y"; --d: url("a;b"); color-scheme: light; }
    `;
    const decls = parseRootDeclarations(css);
    expect(decls.map((d) => d.name)).toEqual(["--a", "--b", "--c", "--d"]);
    expect(decls[0].value).toBe("#222222");
    expect(decls[1].resolved).toBe("#222222");
    expect(decls[2].value).toBe('"x;y"');
  });

  it("follows var() chains, uses a fallback when the target is missing, and survives cycles", () => {
    const css = `:root {
      --x: var(--missing, #abcdef);
      --y: var(--missing);
      --loop-a: var(--loop-b);
      --loop-b: var(--loop-a);
      --nested: var(--missing, var(--x));
    }`;
    const byName = new Map(parseRootDeclarations(css).map((d) => [d.name, d.resolved]));
    expect(byName.get("--x")).toBe("#abcdef");
    expect(byName.get("--y")).toBe("var(--missing)");
    expect(byName.get("--loop-a")).toMatch(/^var\(--loop-/);
    expect(byName.get("--nested")).toBe("#abcdef");
  });

  it("skips declarations with no colon", () => {
    expect(parseRootDeclarations(":root { garbage; --ok: 1px; }").map((d) => d.name)).toEqual(["--ok"]);
  });
});

describe("isColorValue", () => {
  it.each([
    ["#fff", true],
    ["#05050500", true],
    ["oklch(0.5 0.1 73)", true],
    ["rgb(5 5 5 / 0)", true],
    ["color-mix(in srgb, var(--primary) 16%, var(--card))", true],
    ["Transparent", true],
    ["", false],
    ["44px", false],
    ["calc(var(--radius) - 2px)", false],
    ["rgb(0 0 0), rgb(1 1 1)", false],
    ["0 1px 2px rgb(0 0 0)", false],
    ["oklch(0.5 0.1 73", false],
  ])("%s → %s", (value, expected) => {
    expect(isColorValue(value)).toBe(expected);
  });
});

describe("buildColorTokenRegistry", () => {
  const css = `:root {
    --background: oklch(0.9 0 0);
    --foreground: oklch(0.1 0 0);
    --card: #ffffff;
    --card-foreground: var(--foreground);
    --primary: #f5a623;
    --primary-foreground: #191713;
    --muted-foreground: #4a4744;
    --border: color-mix(in oklch, var(--foreground) 14%, transparent);
    --tint-selected: color-mix(in srgb, var(--primary) 16%, var(--card));
    --board-edge-fade: #050505;
    --board-edge-fade-clear: rgb(5 5 5 / 0);
    --board-backdrop-opacity: 0.16;
    --mystery-colour: #123456;
    --touch-target: 44px;
    --control-h-touch: 44px;
    --toolbar-h-touch: 52px;
    --sheet-grabber-width: 36px;
    --sheet-grabber-height: 5px;
    --radius: 0.625rem;
    --radius-control: calc(var(--radius) - 2px);
    --z-modal: 130;
    --unknown-kind: 3;
  }`;
  const registry = buildColorTokenRegistry(css);
  const token = (name: string) => registry.colorTokens.find((t) => t.name === name);

  it("partitions colour, documented non-colour and unclassified tokens", () => {
    expect(registry.colorTokens.map((t) => t.name)).toContain("--tint-selected");
    expect(registry.unclassified.map((t) => t.name)).toEqual(["--unknown-kind"]);
    const categories = new Map(registry.nonColorTokens.map((t) => [t.name, t.categoryId]));
    expect(categories.get("--touch-target")).toBe("metrics");
    expect(categories.get("--sheet-grabber-height")).toBe("metrics");
    expect(categories.get("--board-backdrop-opacity")).toBe("board");
    expect(categories.get("--z-modal")).toBe("z");
  });

  it("groups tints, the board edge fade and unknown families", () => {
    const groups = new Map(registry.groups.map((g) => [g.id, g.tokens.map((t) => t.name)]));
    expect(groups.get("tint")).toEqual(["--tint-selected"]);
    expect(groups.get("board")).toEqual(["--board-edge-fade", "--board-edge-fade-clear"]);
    expect(groups.get("other")).toEqual(["--mystery-colour"]);
    // Empty groups are dropped.
    expect(groups.has("chart")).toBe(false);
  });

  it("pairs surfaces with their foreground, foregrounds with their surface, and hairlines with the page", () => {
    expect(token("--primary")).toMatchObject({ pairedWith: "--primary-foreground", contrastBasis: "text" });
    expect(token("--primary-foreground")).toMatchObject({ pairedWith: "--primary", isForeground: true });
    // A foreground with no surface of its own is read against the page.
    expect(token("--muted-foreground")).toMatchObject({ pairedWith: "--background", isForeground: true });
    expect(token("--border")).toMatchObject({ pairedWith: "--background", contrastBasis: "non-text" });
    expect(token("--tint-selected")).toMatchObject({ pairedWith: "--foreground", contrastBasis: "text" });
    expect(token("--board-edge-fade")).toMatchObject({ contrastBasis: "non-text" });
  });

  it("lists the radius scale and the metrics in stylesheet order", () => {
    expect(registry.radiusTokens.map((t) => t.name)).toEqual(["--radius", "--radius-control"]);
    expect(registry.metricTokens.map((t) => t.name)).toEqual([
      "--touch-target",
      "--control-h-touch",
      "--toolbar-h-touch",
      "--sheet-grabber-width",
      "--sheet-grabber-height",
    ]);
  });
});

describe("contrast helpers", () => {
  it("computes WCAG luminance and ratios", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBe(1);
    expect(toHex({ r: 5, g: 160, b: 255 })).toBe("#05a0ff");
  });
});

/** A 1×1 canvas that understands #rrggbb only, and alpha-composites nothing (enough for the branches). */
function stubCanvas() {
  let pixel = [0, 0, 0, 0];
  let fill = "#000000";
  const ctx = {
    get fillStyle() {
      return fill;
    },
    set fillStyle(value: string) {
      if (/^#[0-9a-f]{6}$/i.test(value)) fill = value.toLowerCase();
      else if (value.startsWith("rgb(")) fill = value;
    },
    clearRect: vi.fn(() => {
      pixel = [0, 0, 0, 0];
    }),
    fillRect: vi.fn(() => {
      const m = /^#(..)(..)(..)$/.exec(fill);
      pixel = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 255] : [9, 9, 9, 255];
    }),
    getImageData: vi.fn(() => ({ data: pixel })),
  };
  return ctx;
}

describe("resolveColor (browser only)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("paints a colour on a 1×1 canvas and reads it back, with and without a backdrop", async () => {
    const ctx = stubCanvas();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
    const { resolveColor: fresh } = await import("./token-registry");
    expect(fresh("#fcedd5")).toEqual({ r: 0xfc, g: 0xed, b: 0xd5 });
    expect(fresh("#050505", { r: 255, g: 255, b: 255 })).toEqual({ r: 5, g: 5, b: 5 });
    expect(ctx.fillRect).toHaveBeenCalledTimes(3);
  });

  it("returns null for a value the canvas does not accept", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(stubCanvas() as never);
    const { resolveColor: fresh } = await import("./token-registry");
    expect(fresh("not-a-colour")).toBeNull();
  });

  it("returns null when there is no 2D context", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { resolveColor: fresh } = await import("./token-registry");
    expect(fresh("#ffffff")).toBeNull();
    // The null context is cached: a second call does not create another canvas.
    expect(fresh("#000000")).toBeNull();
  });

  it("returns null outside a browser", async () => {
    vi.stubGlobal("document", undefined);
    const { resolveColor: fresh } = await import("./token-registry");
    expect(fresh("#ffffff")).toBeNull();
  });

  it("is exported for the story", () => {
    expect(typeof resolveColor).toBe("function");
  });
});
