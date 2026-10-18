import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyableCode } from "./copyable-code";

function mockClipboard(writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

function deferredWrite() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyableCode", () => {
  it("keeps the visible code while confirming a different clipboard value", async () => {
    const user = userEvent.setup();
    const write = mockClipboard();
    const onCopied = vi.fn();
    render(
      <CopyableCode
        value="{{weather.temp}}"
        labels={{ copy: "Copy weather.temp", copied: "Copied", announcement: "Copied {{weather.temp}}" }}
        onCopied={onCopied}
      >
        weather.temp
      </CopyableCode>,
    );
    const button = screen.getByRole("button", { name: "Copy weather.temp" });
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(button);

    expect(write).toHaveBeenCalledWith("{{weather.temp}}");
    expect(onCopied).toHaveBeenCalledExactlyOnceWith("{{weather.temp}}");
    expect(button).toHaveTextContent("weather.temp");
    expect(button.querySelector("code")).toHaveTextContent("weather.temp");
    expect(button.querySelector("svg.lucide-check")).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAccessibleName("Copied weather.temp");
    expect(status).toHaveTextContent("Copied {{weather.temp}}");
  });

  it("names the displayed token even when the copied value is different", async () => {
    const user = userEvent.setup();
    mockClipboard();
    render(
      <CopyableCode value="hidden-payload">
        <span>Visible token</span>
      </CopyableCode>,
    );
    const button = screen.getByRole("button", { name: "Copy Visible token" });
    await user.click(button);
    expect(button).toHaveAccessibleName("Copied Visible token");
  });

  it("waits for the clipboard before confirming", async () => {
    const result = deferredWrite();
    mockClipboard(vi.fn(() => result.promise));
    render(<CopyableCode value="pending" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await act(async () => result.resolve());
    expect(screen.getByRole("button")).toHaveAttribute("data-copied", "true");
  });

  it.each(["rejected", "unavailable"])("does not confirm a %s clipboard write", async (failure) => {
    const user = userEvent.setup();
    const error = new Error("denied");
    mockClipboard(vi.fn().mockRejectedValue(error));
    if (failure === "unavailable") {
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    }
    const onCopyError = vi.fn();
    const onCopied = vi.fn();
    render(<CopyableCode value="{{weather.temp}}" onCopyError={onCopyError} onCopied={onCopied} />);
    await user.click(screen.getByRole("button"));
    expect(onCopyError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
    expect(onCopied).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("supports keyboard copying without submitting a surrounding form", async () => {
    const user = userEvent.setup();
    const write = mockClipboard();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <CopyableCode value="{{weather.temp}}" />
      </form>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(write).toHaveBeenCalledTimes(2);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("button").querySelector("code")).toHaveTextContent("{{weather.temp}}");
  });

  it("does not copy when disabled", async () => {
    const user = userEvent.setup();
    const write = mockClipboard();
    render(<CopyableCode value="disabled" disabled />);
    await user.click(screen.getByRole("button"));
    expect(write).not.toHaveBeenCalled();
  });

  it("restarts confirmation on re-copy and clears its timer on unmount", async () => {
    vi.useFakeTimers();
    mockClipboard();
    const { unmount } = render(<CopyableCode value="token" confirmMs={1500} />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    act(() => vi.advanceTimersByTime(1000));
    await act(async () => fireEvent.click(screen.getByRole("button")));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("button")).toHaveAttribute("data-copied", "true");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await act(async () => fireEvent.click(screen.getByRole("button")));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule confirmation after unmount during a write", async () => {
    vi.useFakeTimers();
    const result = deferredWrite();
    mockClipboard(vi.fn(() => result.promise));
    const onCopied = vi.fn();
    const { unmount } = render(<CopyableCode value="token" onCopied={onCopied} />);
    fireEvent.click(screen.getByRole("button"));
    unmount();
    await act(async () => result.resolve());
    expect(onCopied).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not confirm a new token when an older write finishes", async () => {
    const result = deferredWrite();
    mockClipboard(vi.fn(() => result.promise));
    const { rerender } = render(<CopyableCode value="old" />);
    fireEvent.click(screen.getByRole("button"));
    rerender(<CopyableCode value="new" />);
    await act(async () => result.resolve());
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("does not restore an expired confirmation when a previous value returns", async () => {
    vi.useFakeTimers();
    mockClipboard();
    const { rerender } = render(<CopyableCode value="first" />);
    await act(async () => fireEvent.click(screen.getByRole("button")));
    rerender(<CopyableCode value="second" />);
    act(() => vi.advanceTimersByTime(2000));
    rerender(<CopyableCode value="first" />);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-copied");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps confirmation independent between tokens", async () => {
    const user = userEvent.setup();
    mockClipboard();
    render(
      <>
        <CopyableCode value="first" />
        <CopyableCode value="second" />
      </>,
    );
    const [first, second] = screen.getAllByRole("button");
    await user.click(first);
    expect(first).toHaveAttribute("data-copied", "true");
    expect(second).not.toHaveAttribute("data-copied");
  });
});
