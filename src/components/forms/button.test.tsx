import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

/*
 * EXEMPLAR — an interactive component with keyboard behaviour.
 *
 * The house pattern for anything the user operates:
 *
 *   1. Drive it with `userEvent`, never `fireEvent`. userEvent dispatches the
 *      full event sequence a real browser does (pointerdown → mousedown →
 *      focus → … → click), which is what makes "Enter activates a button" a
 *      real assertion instead of a synthetic click in disguise.
 *   2. `const user = userEvent.setup()` once per test, and await every
 *      interaction.
 *   3. Assert on the observable contract — the handler ran, the accessible
 *      name is intact, the ARIA state flipped. Never on the class string.
 *
 * button.tsx's loading state is the interesting case and the reason this file
 * is an exemplar: it is deliberately NOT `disabled`, so it keeps its tab stop
 * and its accessible name while refusing activation. Every one of those three
 * promises is separately testable, and all three are tested below.
 */

describe("Button", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates from the keyboard with Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  describe("loading", () => {
    it("marks itself busy without leaving the tab order", async () => {
      const user = userEvent.setup();
      render(<Button loading>Save</Button>);

      const button = screen.getByRole("button", { name: "Save" });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
      // The distinction the component exists to preserve: `aria-disabled` is
      // advisory, so focus is NOT silently dumped on <body> mid-wait.
      expect(button).not.toBeDisabled();

      await user.tab();
      expect(button).toHaveFocus();
    });

    it("keeps its accessible name instead of renaming itself to the spinner", () => {
      render(<Button loading>Save</Button>);

      // The label stays in the tree at opacity-0 rather than being replaced,
      // so the name is unchanged. Queried by role+name, which is the only way
      // this assertion means anything.
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("swallows activation from both pointer and keyboard", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );

      const button = screen.getByRole("button", { name: "Save" });
      await user.click(button);
      button.focus();
      await user.keyboard("{Enter}");

      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not submit the form it lives in", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading>
            Save
          </Button>
        </form>,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("renders the caller's element through asChild", () => {
    render(
      <Button asChild variant="link">
        <a href="/docs">Docs</a>
      </Button>,
    );

    // The rendered element is the caller's anchor — so the accessible role is
    // `link`, not `button`, which is exactly what asChild is for.
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveAttribute("data-variant", "link");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reflects variant and size as data attributes for consumers to target", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );

    // data-* is stable, published API. The Tailwind classes beside it are not
    // assertable here — no stylesheet is loaded in jsdom.
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("data-variant", "destructive");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button).toHaveAttribute("data-slot", "button");
  });
});
