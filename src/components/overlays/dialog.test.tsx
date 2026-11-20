import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Example({ wide = false, localized = false }: { wide?: boolean; localized?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent variant={wide ? "wide" : "default"} labels={localized ? { close: "Schließen" } : undefined}>
        <DialogHeader>
          <DialogTitle>Discard changes to Kitchen morning?</DialogTitle>
          <DialogDescription>The board keeps showing the saved version.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Keep editing</DialogClose>
          <button type="button">Discard changes</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog shell variants", () => {
  it("preserves the generic surface and default dismiss name", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Discard changes to Kitchen morning?" });
    expect(dialog).toHaveClass("max-w-lg", "bg-background");
    expect(screen.getByRole("button", { name: "Close" })).toHaveClass("size-8");
  });

  it("is an inset card with corner radius on a phone, not a full-bleed square panel (BB-C-12)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const tokens = (screen.getByRole("dialog").getAttribute("class") ?? "").split(/\s+/);

    expect(tokens).toEqual(
      expect.arrayContaining(["w-[calc(100%-2rem)]", "rounded-lg", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto"]),
    );
    expect(tokens).not.toContain("w-full");
    expect(tokens).not.toContain("sm:rounded-lg");
  });

  it("provides the reference wide surface and localized close without leaking recipe props", async () => {
    const user = userEvent.setup();
    render(<Example wide localized />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-variant", "wide");
    expect(dialog).toHaveClass("max-w-[35rem]", "bg-popover");
    expect(dialog).not.toHaveAttribute("variant");
    expect(dialog).not.toHaveAttribute("labels");
    expect(screen.getByRole("button", { name: "Schließen" })).toHaveClass("size-10");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Open" })).toHaveFocus());
  });

  it("keeps the safe action first and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(<Example wide />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Open" })).toHaveFocus());
  });

  it("supports asChild trigger and close controls", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Custom open</button>
        </DialogTrigger>
        <DialogContent variant="wide" aria-describedby={undefined}>
          <DialogTitle>Custom content</DialogTitle>
          <DialogClose asChild>
            <button type="button">Done</button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Custom open" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
