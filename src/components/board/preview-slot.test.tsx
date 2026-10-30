import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreviewSlot } from "./preview-slot";

afterEach(() => vi.restoreAllMocks());

describe("PreviewSlot", () => {
  it.each([
    [400, 100, 300, 168, 0.75],
    [100, 400, 300, 168, 0.42],
    [100, 40, 300, 168, 1],
  ])(
    "fits a %s × %s preview without cropping or upscaling",
    (width, height, availableWidth, availableHeight, scale) => {
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(availableWidth);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(availableHeight);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(width);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(height);
      render(
        <PreviewSlot>
          <div role="img" aria-label="Board preview" />
        </PreviewSlot>,
      );
      expect(screen.getByRole("img").parentElement).toHaveStyle({ transform: `translate(-50%, -50%) scale(${scale})` });
    },
  );
});
