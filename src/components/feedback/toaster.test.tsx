import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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
});
