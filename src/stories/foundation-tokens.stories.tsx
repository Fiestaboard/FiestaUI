import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";

import { Button } from "../components/forms/button";

/**
 * Slice 1.1 token specimens: one story per page-08 token card (T1, T4, T6, T8)
 * plus the C8 board edge fade.
 *
 * Each story renders ONE fixed-size root, `[data-slot=token-specimen]`, that
 * mirrors the Figma thumbnail it is judged against: 566 × 210 on the page
 * background, with the content centred the way the card centres it. A
 * reviewer captures that element and compares it with the Figma node's
 * screenshot at the same size (owner ruling 2026-11-08: Figma parity is a
 * visual review). `data-figma-node` names the node in file
 * ZQ8RMELCO6qEOFZUnQu36e. Switch the toolbar theme to see the dark pairs.
 */
const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The Figma "Thumbnail" frame every page-08 token card uses: 566 × 210, centred content. */
function Specimen({
  figmaNode,
  width = 566,
  height = 210,
  className = "bg-background rounded-lg",
  children,
}: {
  figmaNode: string;
  width?: number;
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="token-specimen"
      data-figma-node={figmaNode}
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {children}
    </div>
  );
}

/** Mono/label: Spline Sans Mono Medium 12/16. */
const LABEL = "font-mono text-xs font-medium";

const TINTS = [
  { token: "--tint-selected", label: "tint/selected", className: "bg-tint-selected" },
  { token: "--tint-info", label: "tint/info", className: "bg-tint-info" },
  { token: "--tint-warning", label: "tint/warning", className: "bg-tint-warning" },
  { token: "--tint-danger", label: "tint/danger", className: "bg-tint-danger" },
] as const;

/** T4 · Pre-blended tints. Figma: 59:63212 (Thumbnail). */
export const Tints: Story = {
  render: () => (
    <Specimen figmaNode="59:63212">
      <div className="flex items-start gap-4">
        {TINTS.map((tint) => (
          <div key={tint.token} data-token={tint.token} className="flex flex-col items-center gap-2">
            <div className={`border-border h-[72px] w-24 rounded-lg border ${tint.className}`} />
            <span className={`${LABEL} text-foreground`}>{tint.label}</span>
          </div>
        ))}
      </div>
    </Specimen>
  ),
};

/** T8 · Mono/editor/* (line, chip, count). Figma: 59:64327 (Thumbnail). */
export const EditorMono: Story = {
  render: () => (
    <Specimen figmaNode="59:64327">
      <div className="text-foreground flex flex-col items-start gap-2.5 whitespace-nowrap">
        <span data-node="line" className="text-mono-editor-line">
          {"GOOD MORNING {{weather.temp}}"}
        </span>
        <span data-node="chip" className="text-mono-editor-chip">
          {"{{transit.n_judah}}"}
        </span>
        <span data-node="count" className="text-mono-editor-count">
          14 / 22
        </span>
      </div>
    </Specimen>
  ),
};

/** The four Mono/editor/* styles, labelled. No Figma counterpart beyond T8's three samples. */
export const EditorMonoScale: Story = {
  render: () => (
    <div data-slot="token-specimen" className="bg-background text-foreground flex w-[566px] flex-col gap-4 p-6">
      {(
        [
          ["text-mono-editor-line", "line · 17 / 600 / +0.5px"],
          ["text-mono-editor-chip", "chip · 14 / 600"],
          ["text-mono-editor-gutter", "gutter · 13 / 500"],
          ["text-mono-editor-count", "count · 12 / 500"],
        ] as const
      ).map(([utility, spec]) => (
        <div key={utility} className="flex items-baseline justify-between gap-6">
          <span className={utility}>{"{{weather.temp}} 72°"}</span>
          <span className={`${LABEL} text-muted-foreground`}>
            {utility} · {spec}
          </span>
        </div>
      ))}
    </div>
  ),
};

/**
 * T6 · Display/*. Figma: 59:63305 (Thumbnail). The card's sample is the local
 * Doc/Display stand-in scaled to 40.2px; this renders the shipped Display/sm
 * (36), the nearest real step, so expect the line to be ~10% narrower.
 */
export const DisplayType: Story = {
  render: () => (
    <Specimen figmaNode="59:63305">
      <p className="text-display-sm text-foreground whitespace-nowrap">Your data, out in the real world.</p>
    </Specimen>
  ),
};

/** The full Display/* scale (36, 48, 64, 80, 104). */
export const DisplayScale: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div data-slot="token-specimen" className="bg-background text-foreground flex w-[1200px] flex-col gap-6 p-8">
      {(
        [
          ["text-display-sm", "Display/sm · 36"],
          ["text-display-md", "Display/md · 48"],
          ["text-display-lg", "Display/lg · 64"],
          ["text-display-xl", "Display/xl · 80"],
          ["text-display-2xl", "Display/2xl · 104"],
        ] as const
      ).map(([utility, label]) => (
        <div key={utility} className="space-y-1">
          <span className={`${LABEL} text-muted-foreground`}>
            {label} · {utility}
          </span>
          <p className={`${utility} whitespace-nowrap`}>Show it on the board.</p>
        </div>
      ))}
    </div>
  ),
};

/**
 * T1 · Touch metrics. Figma: 59:62975 (Thumbnail). Left: today's Button
 * default (36). Right: Button lg inside a `--touch-target` hit frame. The
 * card draws that frame 48 tall; the token is 44 (48dp is the Android export).
 */
export const TouchMetrics: Story = {
  render: () => (
    <Specimen figmaNode="59:62975">
      <div className="flex items-center gap-4">
        <div className="flex w-[209px] flex-col items-center gap-2">
          <Button>Show now</Button>
          <span className={`${LABEL} text-muted-foreground`}>Today · Button default · 36px</span>
        </div>
        <div className="flex w-[202px] flex-col items-center gap-2">
          <div
            data-token="--touch-target"
            className="border-primary min-h-touch flex items-center rounded-[var(--radius-control)] border-[1.5px] border-dashed px-1"
          >
            <Button size="lg">Show now</Button>
          </div>
          <span className={`${LABEL} text-muted-foreground`}>Touch · 44pt / 48dp hit area</span>
        </div>
      </div>
    </Specimen>
  ),
};

/** Every Metrics token drawn at its size, with the sheet grabber in its strip. */
export const MetricsScale: Story = {
  render: () => (
    <div data-slot="token-specimen" className="bg-background text-foreground flex w-[566px] flex-col gap-4 p-6">
      {(
        [
          ["--touch-target", "size-touch"],
          ["--control-h-touch", "h-control-touch w-24"],
          ["--toolbar-h-touch", "h-toolbar-touch w-48"],
        ] as const
      ).map(([token, className]) => (
        <div key={token} className="flex items-center gap-4">
          <div data-token={token} className={`bg-tint-selected border-primary rounded-md border ${className}`} />
          <span className={`${LABEL}`}>{token}</span>
        </div>
      ))}
      <div className="flex items-center gap-4">
        <div className="bg-card border-border flex w-48 justify-center rounded-t-[var(--radius-chrome-mobile)] border">
          <div className="flex items-center justify-center" style={{ height: "var(--sheet-grabber-zone)" }}>
            <div
              data-token="--sheet-grabber-width"
              className="bg-input rounded-full"
              style={{ width: "var(--sheet-grabber-width)", height: "var(--sheet-grabber-height)" }}
            />
          </div>
        </div>
        <span className={LABEL}>--sheet-grabber-* (36 × 5 in a 20 strip)</span>
      </div>
    </div>
  ),
};

/**
 * C8 · Board edge fade. Figma: 52:122718 (the Flagship scroll viewport's
 * bezel, 280 × 147) and its "Edge fade · end" 52:123100 (36 wide). Blank
 * Tile sm cells stand in for the board; compare the fade, not the glyphs.
 */
export const BoardEdgeFade: Story = {
  render: () => (
    <Specimen figmaNode="52:122718" width={280} height={147} className="bg-board-bezel-dark relative rounded-lg">
      <div
        aria-hidden="true"
        className="absolute top-3 left-3 grid w-[349px] grid-cols-[repeat(22,13px)] gap-x-[3px] gap-y-[3px]"
      >
        {Array.from({ length: 22 * 6 }, (_, i) => (
          <span key={i} className="bg-board-surface-dark block h-[18px] w-[13px] rounded-[2px]" />
        ))}
      </div>
      <div
        data-token="--board-edge-fade"
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-9"
        style={{ backgroundImage: "linear-gradient(90deg, var(--board-edge-fade-clear), var(--board-edge-fade))" }}
      />
    </Specimen>
  ),
};
