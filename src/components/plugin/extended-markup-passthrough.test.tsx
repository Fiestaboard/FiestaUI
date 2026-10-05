import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BoardBackdrop } from "../board/board-backdrop";
import { BoardShowcase } from "./board-showcase";
import { PluginCard } from "./plugin-card";
import { ScaledBoardTeaser } from "./scaled-board-teaser";

/*
 * The consumers that wrap a board renderer pass `extendedMarkup` straight
 * through — and pass nothing when they are given nothing, so each inherits
 * the renderer's own default (off until the split-flap grammar flips in a
 * major, on after). The accessible name is the parse made visible: under the
 * extended grammar `{red:HOT}` reads "HOT", without it the literal
 * "{RED:HOT}" the hardware draws today.
 */

const SPAN = "{red:HOT}";

function teaserLabel(container: HTMLElement): string {
  const strip = container.querySelector('[data-slot="board-teaser"]');
  expect(strip).not.toBeNull();
  return strip!.getAttribute("aria-label") ?? "";
}

describe("extendedMarkup pass-through", () => {
  it("ScaledBoardTeaser parses the extended grammar when told to, and inherits the default otherwise", () => {
    const on = render(<ScaledBoardTeaser teaser={SPAN} extendedMarkup />);
    expect(teaserLabel(on.container)).toBe("HOT");
    on.unmount();

    const off = render(<ScaledBoardTeaser teaser={SPAN} extendedMarkup={false} />);
    expect(teaserLabel(off.container)).toBe("{RED:HOT}");
    off.unmount();

    // Nothing passed: the same as the renderer's own default.
    const inherited = render(<ScaledBoardTeaser teaser={SPAN} />);
    const renderer = render(<ScaledBoardTeaser teaser={SPAN} extendedMarkup={undefined} />);
    expect(teaserLabel(inherited.container)).toBe(teaserLabel(renderer.container));
  });

  it("PluginCard hands extendedMarkup to its teaser", () => {
    const link = ({ className, children }: { className: string; children: React.ReactNode }) => (
      <a className={className} href="#plugin">
        {children}
      </a>
    );
    const on = render(<PluginCard name="Weather" teaser={SPAN} renderLink={link} extendedMarkup />);
    expect(teaserLabel(on.container)).toBe("HOT");
    on.unmount();

    const off = render(<PluginCard name="Weather" teaser={SPAN} renderLink={link} extendedMarkup={false} />);
    expect(teaserLabel(off.container)).toBe("{RED:HOT}");
  });

  it("BoardShowcase hands extendedMarkup to every preview board", () => {
    const previews = [{ device_type: "flagship" as const, rows: [SPAN] }];
    const on = render(<BoardShowcase previews={previews} extendedMarkup />);
    expect(screen.getByRole("img", { name: /HOT/ }).getAttribute("aria-label")).not.toContain("{RED:HOT}");
    on.unmount();

    render(<BoardShowcase previews={previews} extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: /\{RED:HOT\}/ })).toBeInTheDocument();
  });

  it("BoardBackdrop hands extendedMarkup to every row", () => {
    // A row is trimmed to its tile budget character by character, so a
    // phrase at the end may lose its closing brace; the first is always whole.
    const on = render(<BoardBackdrop phrases={[SPAN]} rowCount={2} tiles={24} extendedMarkup />);
    const onLabels = [...on.container.querySelectorAll('[data-slot="board-teaser"]')].map(
      (strip) => strip.getAttribute("aria-label") ?? "",
    );
    expect(onLabels).toHaveLength(2);
    for (const label of onLabels) {
      expect(label).toContain("HOT");
      expect(label).not.toContain("{RED:HOT}");
    }
    on.unmount();

    const off = render(<BoardBackdrop phrases={[SPAN]} rowCount={2} tiles={24} extendedMarkup={false} />);
    for (const strip of off.container.querySelectorAll('[data-slot="board-teaser"]')) {
      expect(strip.getAttribute("aria-label")).toContain("{RED:HOT");
    }
  });
});
