import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toast, Toaster } from "./toaster";

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

describe("Toaster", () => {
  it("is a landmark region named 'Notifications' by default", () => {
    render(<Toaster />);
    const region = screen.getByRole("region", { name: /^Notifications/ });
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("names the live region with the localized label", () => {
    render(<Toaster labels={{ container: "Benachrichtigungen" }} />);
    expect(screen.getByRole("region", { name: /^Benachrichtigungen/ })).toBeInTheDocument();
  });

  it("renders a toast without moving focus", async () => {
    render(
      <>
        <button type="button">Save</button>
        <Toaster />
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Save" });
    trigger.focus();
    act(() => {
      toast.success("Settings saved");
    });
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("uses the localized close label", async () => {
    render(<Toaster closeButton labels={{ close: "Schließen" }} />);
    act(() => {
      toast("Hallo");
    });
    expect(await screen.findByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("forwards the theme and bridges popover tokens", async () => {
    render(<Toaster theme="dark" />);
    act(() => {
      toast("Hi");
    });
    await screen.findByText("Hi");
    // Sonner renders the <ol> only once a toast exists; theme and tokens land on it.
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]");
    expect(toaster).toHaveAttribute("data-sonner-theme", "dark");
    expect(toaster?.style.getPropertyValue("--normal-bg")).toBe("var(--popover)");
  });

  it("is offset above the bottom nav, falling back to 0 when no nav publishes --bottom-nav-offset", async () => {
    render(<Toaster />);
    act(() => {
      toast("Hi");
    });
    await screen.findByText("Hi");
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(toaster.style.getPropertyValue("--offset-bottom")).toBe(
      "calc(24px + var(--bottom-nav-offset, 0px) + env(safe-area-inset-bottom, 0px))",
    );
    expect(toaster.style.getPropertyValue("--mobile-offset-bottom")).toBe(
      "calc(16px + var(--bottom-nav-offset, 0px) + env(safe-area-inset-bottom, 0px))",
    );
    // The other edges keep Sonner's defaults.
    expect(toaster.style.getPropertyValue("--offset-right")).toBe("24px");
    expect(toaster.style.getPropertyValue("--mobile-offset-left")).toBe("16px");
  });

  it("clearBottomNav={false} restores Sonner's plain offsets", async () => {
    render(<Toaster clearBottomNav={false} />);
    act(() => {
      toast("Hi");
    });
    await screen.findByText("Hi");
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(toaster.style.getPropertyValue("--offset-bottom")).toBe("24px");
    expect(toaster.style.getPropertyValue("--mobile-offset-bottom")).toBe("16px");
  });
});

describe("Toaster · snackbar actions (C18, 07a Web / Toast 297:7793)", () => {
  it("renders an Undo action as a 44px button that runs and dismisses, without stealing focus", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(
      <>
        <button type="button">Cancel override</button>
        <Toaster />
      </>,
    );
    const origin = screen.getByRole("button", { name: "Cancel override" });
    origin.focus();
    act(() => {
      toast.info("Override canceled", {
        description: "Kitchen board is back on Schedule Mode.",
        action: { label: "Undo", onClick: onUndo },
        duration: Infinity,
      });
    });
    const undo = await screen.findByRole("button", { name: "Undo" });
    expect(origin).toHaveFocus();
    expect(undo).toHaveClass("!h-control-touch", "!bg-secondary", "!px-6");
    // The message sits in the polite live region, so it is announced.
    const region = screen.getByRole("region", { name: /^Notifications/ });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toContainElement(screen.getByText("Override canceled"));
    expect(region).toContainElement(undo);
    await user.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Override canceled")).not.toBeInTheDocument());
  });

  it("puts the primary action first in the DOM, tab order and on screen, the ghost second", async () => {
    const user = userEvent.setup();
    const onShow = vi.fn();
    const onSchedule = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.success("Saved to Pages", {
        description: "Kitchen morning is in your page library.",
        action: { label: "Show now", onClick: onShow },
        cancel: { label: "Add to Schedule", onClick: onSchedule },
        duration: Infinity,
      });
    });
    const primary = await screen.findByRole("button", { name: "Show now" });
    const secondary = screen.getByRole("button", { name: "Add to Schedule" });
    const toastEl = primary.closest("[data-sonner-toast]")!;
    expect([...toastEl.querySelectorAll("[data-button]")].map((b) => b.textContent)).toEqual([
      "Show now",
      "Add to Schedule",
    ]);
    expect(primary).toHaveAttribute("data-action");
    expect(secondary).toHaveAttribute("data-cancel");
    expect(primary).toHaveClass("!h-control-touch", "!bg-secondary", "!ms-7");
    expect(secondary).toHaveClass("!h-control-touch", "!bg-transparent", "[[data-action]~&]:!ms-0");
    // Actions drop to their own row, indented under the text (28px).
    expect(toastEl).toHaveClass("group/toast", "has-[[data-button]]:flex-wrap");
    await user.click(secondary);
    expect(onSchedule).toHaveBeenCalledTimes(1);
    expect(onShow).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Saved to Pages")).not.toBeInTheDocument());
  });

  it("the paired primary keeps the toast when its handler calls preventDefault", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast("Override canceled", {
        action: { label: "Undo", onClick: (e) => e.preventDefault() },
        cancel: { label: "Details", onClick: () => {} },
        duration: Infinity,
      });
    });
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(screen.getByText("Override canceled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Override canceled")).toBeInTheDocument();
  });

  it("dismissible: false keeps the toast when the second action is pressed", async () => {
    const user = userEvent.setup();
    const onSecond = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.info("Pinned", {
        id: "pinned",
        dismissible: false,
        action: { label: "Open", onClick: () => {} },
        cancel: { label: "Later", onClick: onSecond },
        duration: Infinity,
      });
    });
    await user.click(await screen.findByRole("button", { name: "Later" }));
    expect(onSecond).not.toHaveBeenCalled();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
  });

  it("every emitter orders the pair; a cancel alone stays Sonner's, indented", async () => {
    render(<Toaster />);
    act(() => {
      for (const emit of [toast.warning, toast.error, toast.message, toast.loading] as const) {
        emit(`via ${emit === toast.loading ? "loading" : "emitter"}`, {
          action: { label: "A", onClick: () => {} },
          cancel: { label: "B", onClick: () => {} },
          duration: Infinity,
        });
      }
      toast("Cancel only", { cancel: { label: "Dismiss", onClick: () => {} }, duration: Infinity });
    });
    const solo = await screen.findByRole("button", { name: "Dismiss" });
    expect(solo).toHaveClass("!ms-7");
    for (const el of document.querySelectorAll("[data-sonner-toast]")) {
      const labels = [...el.querySelectorAll("[data-button]")].map((b) => b.textContent);
      if (labels.length === 2) expect(labels).toEqual(["A", "B"]);
    }
  });
});
