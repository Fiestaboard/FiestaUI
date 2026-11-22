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
  it("uses the snackbar success mark without changing the default status icon", async () => {
    const { rerender } = render(<Toaster variant="snackbar" />);
    act(() => {
      toast.success("Saved with snackbar", { duration: Infinity });
    });
    await screen.findByText("Saved with snackbar");
    const icon = () => document.querySelector("[data-sonner-toast] [data-icon] svg")!;
    expect(icon()).toBeInTheDocument();
    expect(icon().querySelector("circle")).toBeNull();
    rerender(<Toaster />);
    expect(icon().querySelector("circle")).toBeInTheDocument();
  });

  it("announces a snackbar without stealing focus and dismisses with its localized close control", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Editor</button>
        <Toaster variant="snackbar" closeButton labels={{ close: "Dismiss notification" }} />
      </>,
    );
    screen.getByRole("button", { name: "Editor" }).focus();
    act(() => {
      toast("Saved to Pages", { duration: Infinity });
    });
    expect(await screen.findByText("Saved to Pages")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editor" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Saved to Pages")).not.toBeInTheDocument());
  });
  it("offers the reference snackbar size and mobile inset without moving focus", async () => {
    render(<Toaster variant="snackbar" position="top-right" />);
    act(() => {
      toast.success("Saved to Pages");
    });
    await screen.findByText("Saved to Pages");
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(toaster.style.getPropertyValue("--width")).toBe("380px");
    expect(toaster.style.getPropertyValue("--mobile-offset-left")).toBe("8px");
    expect(toaster.style.getPropertyValue("--mobile-offset-right")).toBe("8px");
    expect(document.querySelector("[data-sonner-toast]")).toHaveClass("!py-3.5", "!pl-4", "!pr-3");
  });

  it("lets hosts place toasts above editor chrome with explicit offsets", async () => {
    render(
      <Toaster
        variant="snackbar"
        offset={{ top: 72 }}
        mobileOffset={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
      />,
    );
    act(() => {
      toast("Editor saved");
    });
    await screen.findByText("Editor saved");
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(toaster.style.getPropertyValue("--offset-top")).toBe("72px");
    expect(toaster.style.getPropertyValue("--mobile-offset-bottom")).toBe("calc(60px + env(safe-area-inset-bottom))");
    expect(toaster.style.getPropertyValue("--mobile-offset-left")).toBe("8px");
    expect(toaster.style.getPropertyValue("--offset-bottom")).toContain("--bottom-nav-offset");
  });

  it("accepts scalar edge offsets and disables automatic nav clearance independently", async () => {
    render(<Toaster variant="snackbar" clearBottomNav={false} offset={30} mobileOffset="10px" />);
    act(() => {
      toast("Saved");
    });
    await screen.findByText("Saved");
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(toaster.style.getPropertyValue("--offset-bottom")).toBe("30px");
    expect(toaster.style.getPropertyValue("--mobile-offset-right")).toBe("10px");
  });

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

  it("draws the snackbar × at 16px with a 44px hit area (07a `311:73476`, BB-FS-7)", async () => {
    render(<Toaster variant="snackbar" closeButton labels={{ close: "Close" }} />);
    act(() => {
      toast("Copied");
    });
    const close = await screen.findByRole("button", { name: "Close" });
    expect(close).toHaveClass("!size-4", "before:-inset-3.5");
    expect(close).not.toHaveClass("!size-5");
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
    const onDismiss = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Override canceled", {
        action: { label: "Undo", onClick: (e) => e.preventDefault() },
        cancel: { label: "Details", onClick: () => {} },
        onDismiss,
        duration: Infinity,
      });
    });
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    // Long enough for Sonner to mark and unmount a dismissed toast.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    const toastEl = screen.getByText("Override canceled").closest("[data-sonner-toast]")!;
    expect(toastEl).not.toHaveAttribute("data-removed", "true");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("closing through either paired button does not fire onDismiss (Sonner parity: Undo must not commit)", async () => {
    const user = userEvent.setup();
    const commitDelete = vi.fn();
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Page deleted", {
        id: "deleted",
        action: { label: "Undo", onClick: onUndo },
        cancel: { label: "OK", onClick: () => {} },
        onDismiss: commitDelete,
        duration: Infinity,
      });
      toast("Board removed", {
        id: "removed",
        action: { label: "Restore", onClick: () => {} },
        cancel: { label: "Got it", onClick: () => {} },
        onDismiss: commitDelete,
        duration: Infinity,
      });
    });
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.queryByText("Page deleted")).not.toBeInTheDocument());
    expect(onUndo).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByText("Board removed")).not.toBeInTheDocument());
    expect(commitDelete).not.toHaveBeenCalled();
  });

  it("a paired toast dismissed some other way still fires onDismiss", async () => {
    const onDismiss = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Page deleted", {
        id: "deleted-2",
        action: { label: "Undo", onClick: () => {} },
        cancel: { label: "OK", onClick: () => {} },
        onDismiss,
        duration: Infinity,
      });
    });
    await screen.findByText("Page deleted");
    act(() => {
      toast.dismiss("deleted-2");
    });
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it("honours per-toast button styles and classNames in two-button mode", async () => {
    render(<Toaster />);
    act(() => {
      toast("Styled", {
        action: { label: "Go", onClick: () => {} },
        cancel: { label: "Skip", onClick: () => {} },
        actionButtonStyle: { outlineColor: "red" },
        cancelButtonStyle: { outlineColor: "blue" },
        classNames: { actionButton: "custom-primary", cancelButton: "custom-secondary" },
        duration: Infinity,
      });
    });
    const go = await screen.findByRole("button", { name: "Go" });
    const skip = screen.getByRole("button", { name: "Skip" });
    expect(go).toHaveClass("custom-primary", "!bg-secondary");
    expect(skip).toHaveClass("custom-secondary", "!bg-transparent");
    expect(go.style.outlineColor).toBe("red");
    expect(skip.style.outlineColor).toBe("blue");
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

  // BB-FK-5 (Figma Toast `40:61`): 13/18 type and Shadow/lg. Sonner's own
  // [data-sonner-toast] rules outrank a plain class, so both are forced.
  it("sets 18 px leading and the kit's shadow-lg over Sonner's defaults", async () => {
    render(<Toaster />);
    act(() => {
      toast("Saved", { description: "On Kitchen board now", duration: Infinity });
    });
    await screen.findByText("Saved");
    const el = document.querySelector<HTMLElement>("[data-sonner-toast]")!;
    expect(el.className).toMatch(/(^|\s)!shadow-lg(\s|$)/);
    expect(el.querySelector("[data-title]")!.className).toMatch(/(^|\s)!leading-4\.5(\s|$)/);
    expect(el.querySelector("[data-description]")!.className).toMatch(/(^|\s)!leading-4\.5(\s|$)/);
  });
});
