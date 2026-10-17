import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PromptInput, PromptInputSubmit } from "../ai/prompt-input";
import { Button } from "../forms/button";
import { CopyButton } from "../forms/copy-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

/*
 * Issue #313: wrapping a control in `TooltipTrigger asChild` must compose the
 * trigger's handlers with the child's, never replace them.
 */
describe("TooltipTrigger asChild", () => {
  it("keeps the child Button's onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onClick}>Save</Button>
          </TooltipTrigger>
          <TooltipContent>Save the board</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps a plain button's onClick and the trigger's own onClick", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();
    const triggerClick = vi.fn();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild onClick={triggerClick}>
            <button type="button" onClick={childClick}>
              Go
            </button>
          </TooltipTrigger>
          <TooltipContent>Go now</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(triggerClick).toHaveBeenCalledTimes(1);
  });

  it("keeps PromptInputSubmit's Stop handler while streaming (the case that surfaced #313)", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <PromptInput status="streaming" onSubmit={(e) => e.preventDefault()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PromptInputSubmit onStop={onStop} />
            </TooltipTrigger>
            <TooltipContent>Stop generating</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PromptInput>,
    );
    await user.click(screen.getByRole("button", { name: /stop/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("keeps CopyButton's copy action", async () => {
    const user = userEvent.setup();
    // After setup(): userEvent installs its own clipboard stub.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true, writable: true });
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CopyButton value="sk-test-123" />
          </TooltipTrigger>
          <TooltipContent>Copy key</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("sk-test-123");
  });
});
