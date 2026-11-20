import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "../overlays/dialog";
import { Checkbox } from "./checkbox";

/*
 * BB-C-26: controls the W2 coarse layer (`fui-coarse`, see touch-size.test.tsx)
 * had missed. A 16px checkbox (24px hit area) and the 32px dialog close chip
 * measured under 44px on a phone even with `fui-coarse` on <html>.
 *
 * jsdom runs no stylesheet, so this holds the class contract; the 44×44
 * targets were measured in Chromium with a coarse pointer (see the PR).
 */
function classTokens(element: Element): string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/);
}

describe("fui-coarse (W2) targets", () => {
  it("gives Checkbox a 44×44 coarse hit area around its 16px box", () => {
    render(<Checkbox aria-label="Keep me logged in" />);

    expect(classTokens(screen.getByRole("checkbox", { name: "Keep me logged in" }))).toEqual(
      expect.arrayContaining(["before:size-6", "coarse:before:min-h-touch", "coarse:before:min-w-touch"]),
    );
  });

  it.each([
    ["default", "size-8", "coarse:after:-inset-1.5"],
    ["wide", "size-10", "coarse:after:-inset-0.5"],
  ] as const)("gives the %s overlay close a 44×44 coarse target without growing the chip", (variant, size, inset) => {
    // 32px + 2×6px and 40px + 2×2px: an invisible ::after, so the chip and
    // the header around it do not move.
    render(
      <Dialog defaultOpen>
        <DialogContent variant={variant}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(classTokens(screen.getByRole("button", { name: "Close" }))).toEqual(
      expect.arrayContaining([size, "coarse:after:absolute", inset]),
    );
  });
});
