import { describe, expect, it } from "vitest";

import { cn } from "./utils";

/*
 * The touch metrics (slice 1.1) are custom spacing keys. tailwind-merge must
 * know them, or a touch class never conflicts with anything: the default
 * height survives beside it, and a caller's override loses on stylesheet
 * order instead of winning on argument order.
 */
describe("cn with the touch spacing keys", () => {
  it.each([
    ["h-9 h-control-touch", "h-control-touch"],
    ["h-control-touch h-12", "h-12"],
    ["size-9 size-touch", "size-touch"],
    ["size-touch size-12", "size-12"],
    ["min-h-touch min-h-0", "min-h-0"],
    ["coarse:min-h-touch coarse:min-h-0", "coarse:min-h-0"],
    ["h-toolbar-touch h-10", "h-10"],
    ["before:min-w-touch before:min-w-0", "before:min-w-0"],
  ])("%s → %s", (input, expected) => {
    expect(cn(input)).toBe(expected);
  });

  it("keeps unrelated utilities", () => {
    expect(cn("h-control-touch px-6", "w-full")).toBe("h-control-touch px-6 w-full");
  });
});
