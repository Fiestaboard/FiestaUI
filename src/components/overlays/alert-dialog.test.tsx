import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

/*
 * jsdom runs no stylesheet, so these hold the class contract the stylesheet
 * keys off. The inset geometry itself is asserted in a real browser by the
 * `MobileDestructive` story's play function.
 */
function classTokens(element: Element): string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/);
}

function Confirm({ variant }: { variant?: "destructive" }) {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to Stable?</AlertDialogTitle>
          <AlertDialogDescription>Changes made since then will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={variant}>Switch channel</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog (BB-C-12)", () => {
  it("is an inset card with corner radius at every width, not a full-bleed panel below sm", () => {
    render(<Confirm />);
    const dialog = screen.getByRole("alertdialog", { name: "Switch to Stable?" });
    const tokens = classTokens(dialog);

    expect(tokens).toEqual(
      expect.arrayContaining(["w-[calc(100%-2rem)]", "max-w-lg", "rounded-lg", "max-h-[calc(100dvh-2rem)]"]),
    );
    expect(tokens).not.toContain("w-full");
    expect(tokens).not.toContain("sm:rounded-lg");
  });

  it("offers destructive styling on the confirming action", () => {
    render(<Confirm variant="destructive" />);
    const action = screen.getByRole("button", { name: "Switch channel" });

    expect(action).toHaveAttribute("data-variant", "destructive");
    expect(classTokens(action)).toContain("bg-destructive");
    expect(classTokens(action)).not.toContain("bg-primary");
    expect(action).not.toHaveAttribute("variant");
  });

  it("keeps the primary action by default and the outline cancel", () => {
    render(<Confirm />);

    const action = screen.getByRole("button", { name: "Switch channel" });
    expect(action).toHaveAttribute("data-variant", "default");
    expect(classTokens(action)).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("data-variant", "outline");
  });
});
