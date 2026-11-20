import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  AlertDialogTrigger,
} from "./alert-dialog";

/*
 * jsdom runs no stylesheet, so these hold the class contract the stylesheet
 * keys off. The inset geometry itself is measured in a real browser at
 * 320-900px by .storybook/dialog-inset-regression.ts.
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

  it.each([false, true])("opens from its trigger (asChild %s)", async (asChild) => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        {asChild ? (
          <AlertDialogTrigger asChild>
            <button type="button">Delete board</button>
          </AlertDialogTrigger>
        ) : (
          <AlertDialogTrigger>Delete board</AlertDialogTrigger>
        )}
        <AlertDialogContent>
          <AlertDialogTitle>Delete Kitchen?</AlertDialogTitle>
          <AlertDialogAction variant="destructive" size="lg">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Delete board" }));

    expect(screen.getByRole("alertdialog", { name: "Delete Kitchen?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("h-10");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-size", "lg");
  });
});
