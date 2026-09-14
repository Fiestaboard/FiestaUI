import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PromptInput, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar } from "./prompt-input";

function Composer({
  status = "ready",
  onSubmit = vi.fn(),
  onStop = vi.fn(),
}: {
  status?: "ready" | "submitted" | "streaming" | "error";
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop?: () => void;
}) {
  return (
    <PromptInput
      status={status}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event);
      }}
    >
      <PromptInputTextarea aria-label="Message" />
      <PromptInputToolbar>
        <PromptInputSubmit onStop={onStop} />
      </PromptInputToolbar>
    </PromptInput>
  );
}

describe("PromptInput", () => {
  it("submits on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);

    await user.click(screen.getByRole("textbox", { name: "Message" }));
    await user.keyboard("hello{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("inserts a newline on Shift+Enter instead of submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox", { name: "Message" });

    await user.click(box);
    await user.keyboard("one{Shift>}{Enter}{/Shift}two");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveValue("one\ntwo");
  });

  it("does not submit an Enter that commits an IME candidate", () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox", { name: "Message" });

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    Object.defineProperty(event, "isComposing", { value: true });
    box.dispatchEvent(event);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("offers Send while ready and Stop while streaming", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(<Composer status="ready" onSubmit={onSubmit} onStop={onStop} />);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");

    rerender(<Composer status="streaming" onSubmit={onSubmit} onStop={onStop} />);
    const stop = screen.getByRole("button", { name: "Stop" });
    expect(stop).toHaveAttribute("type", "button");
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();

    await user.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables Send while a message is submitted but not yet answered", () => {
    render(<Composer status="submitted" />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("stamps the status on the form for styling and tests", () => {
    render(<Composer status="error" />);
    expect(document.querySelector('[data-slot="prompt-input"]')).toHaveAttribute("data-status", "error");
  });
});
