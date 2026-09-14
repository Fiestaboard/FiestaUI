import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Conversation, ConversationContent, ConversationScrollButton } from "./conversation";

/*
 * Presentational contract first (the log landmark), then the one behaviour
 * jsdom can model: the jump button exists exactly while the viewport is
 * away from the bottom. jsdom has no layout, so the scroll geometry is
 * stubbed on the element — that is the input, not the thing under test.
 */

function viewport() {
  return screen.getByRole("log", { name: "Conversation" });
}

function stubGeometry(el: HTMLElement, { scrollHeight, clientHeight, scrollTop }: Record<string, number>) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
  el.scrollTop = scrollTop;
}

describe("Conversation", () => {
  it("exposes the transcript as a polite log region", () => {
    render(
      <Conversation>
        <ConversationContent>hello</ConversationContent>
      </Conversation>,
    );
    const log = viewport();
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("aria-relevant", "additions text");
  });

  it("is a keyboard-reachable scroll region", async () => {
    const user = userEvent.setup();
    render(<Conversation />);
    await user.tab();
    expect(viewport()).toHaveFocus();
  });

  it("takes its accessible name from labels", () => {
    render(<Conversation labels={{ conversation: "Chat with FiestaBot" }} />);
    expect(screen.getByRole("log", { name: "Chat with FiestaBot" })).toBeInTheDocument();
  });

  it("renders no jump button while at the bottom", () => {
    render(
      <Conversation>
        <ConversationScrollButton />
      </Conversation>,
    );
    expect(screen.queryByRole("button", { name: "Jump to latest" })).not.toBeInTheDocument();
  });

  it("shows the jump button after the user scrolls up, and it scrolls back down", async () => {
    const user = userEvent.setup();
    render(
      <Conversation>
        <ConversationContent>hello</ConversationContent>
        <ConversationScrollButton />
      </Conversation>,
    );
    const log = viewport();
    stubGeometry(log, { scrollHeight: 1000, clientHeight: 200, scrollTop: 100 });
    log.dispatchEvent(new Event("scroll", { bubbles: true }));

    const button = await screen.findByRole("button", { name: "Jump to latest" });
    await user.click(button);

    expect(log.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "Jump to latest" })).not.toBeInTheDocument();
  });

  it("refuses to render the jump button outside a Conversation", () => {
    expect(() => render(<ConversationScrollButton />)).toThrow(/inside <Conversation>/);
  });
});
