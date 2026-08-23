import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./copy-button";

/*
 * CopyButton exists because four hand-rolled copies downstream each got a
 * different subset of this right (#271). So the cases below are the four
 * defects that issue catalogues, not a tour of the props:
 *
 *   1. an unawaited/uncaught rejection showing success anyway
 *   2. a timer that outlives the component
 *   3. a confirmation no screen reader ever hears
 *   4. an accessible name that goes stale
 */

function mockClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
    writable: true,
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("writes the value to the clipboard", async () => {
    const user = userEvent.setup();
    // After setup(), never before: userEvent installs its own clipboard stub.
    const write = mockClipboard(() => Promise.resolve());
    render(<CopyButton value="sk-test-123" />);

    await user.click(screen.getByRole("button"));

    expect(write).toHaveBeenCalledWith("sk-test-123");
  });

  it("does not confirm when the clipboard write rejects", async () => {
    // The insecure-context case. Two of the four downstream sites neither
    // await nor catch, so a denied write still flashed the check.
    const onCopyError = vi.fn();
    const onCopied = vi.fn();
    const user = userEvent.setup();
    mockClipboard(() => Promise.reject(new Error("denied")));
    render(<CopyButton value="v" onCopyError={onCopyError} onCopied={onCopied} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(onCopyError).toHaveBeenCalled());
    expect(onCopied).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("survives a missing navigator.clipboard without throwing", async () => {
    // An insecure context leaves it undefined entirely, which is a different
    // failure from a rejected promise.
    const onCopyError = vi.fn();
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true });
    render(<CopyButton value="v" onCopyError={onCopyError} />);

    await user.click(screen.getByRole("button"));

    // An absent API is a failed copy, not a silent success.
    await waitFor(() => expect(onCopyError).toHaveBeenCalled());
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
  });

  it("announces the copy in a region that was already mounted", async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="v" />);

    // The region must exist BEFORE the copy: a role="status" that appears at
    // the same moment as its text is unreliably announced.
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(status).toHaveTextContent("Copied"));
  });

  it("announces a distinct message when one is given", async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="v" labels={{ announcement: "API token copied" }} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("API token copied"));
  });

  it("moves its accessible name to the confirmed label", async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="v" />);

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
  });

  it("swaps a visible label too, and takes localized labels", async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(
      <CopyButton value="v" labels={{ copy: "Kopieren", copied: "Kopiert" }}>
        Kopieren
      </CopyButton>,
    );

    expect(screen.getByRole("button", { name: "Kopieren" })).toHaveTextContent("Kopieren");

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Kopiert" })).toHaveTextContent("Kopiert"));
  });

  it("returns to idle after confirmMs", async () => {
    // Real timers with a tiny confirmMs, not fake ones: testing-library's
    // waitFor polls on real timers, so vi.useFakeTimers() deadlocks it.
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="v" confirmMs={50} />);

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("data-copied", "true"));

    await waitFor(() => expect(screen.getByRole("button")).not.toHaveAttribute("data-copied"));
  });

  it("clears its own confirm timer on unmount", async () => {
    // The defect all four downstream copies share: setTimeout with no
    // clearTimeout, so a button copied and then unmounted (a closing dialog,
    // a re-rendered row) sets state on a dead component.
    //
    // Asserting only that clearTimeout was *called* proves nothing — React
    // and userEvent both schedule and clear timers of their own, so that
    // assertion stays green with the cleanup deleted (verified by mutation).
    // The timer id returned by the component's own setTimeout is tracked and
    // that exact id is what must be cleared.
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());

    const scheduled: unknown[] = [];
    const realSetTimeout = globalThis.setTimeout;
    const setSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: never,
      ms?: number,
      ...rest: never[]
    ) => {
      const id = realSetTimeout(fn, ms, ...rest);
      // CONFIRM_MS is this component's default and nothing else in the tree
      // schedules at exactly that delay.
      if (ms === 1500) scheduled.push(id);
      return id;
    }) as typeof globalThis.setTimeout);
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = render(<CopyButton value="v" />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("data-copied", "true"));

    expect(scheduled).toHaveLength(1);
    unmount();

    const cleared = clearSpy.mock.calls.map((call) => call[0]);
    expect(cleared).toContain(scheduled[0]);

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it("keeps the glyph out of the accessible name", async () => {
    render(<CopyButton value="v" />);

    // Name comes from labels.copy alone; no svg text leaks in.
    expect(screen.getByRole("button")).toHaveAccessibleName("Copy");
  });

  it("fires onCopied with the value only on success", async () => {
    const onCopied = vi.fn();
    const user = userEvent.setup();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value="payload" onCopied={onCopied} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(onCopied).toHaveBeenCalledWith("payload"));
  });
});
