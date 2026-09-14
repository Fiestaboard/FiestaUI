import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Message, MessageAvatar, MessageContent } from "./message";

describe("Message", () => {
  it("stamps who the turn is from", () => {
    render(
      <Message from="user" data-testid="row">
        <MessageContent>hi</MessageContent>
      </Message>,
    );
    expect(screen.getByTestId("row")).toHaveAttribute("data-from", "user");
  });

  it("keeps the avatar out of the accessibility tree by default", () => {
    render(
      <Message from="assistant">
        <MessageAvatar name="FiestaBot" />
        <MessageContent>hello</MessageContent>
      </Message>,
    );
    const avatar = document.querySelector('[data-slot="message-avatar"]');
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(avatar).toHaveTextContent("F");
  });

  it("can name the speaker when told the avatar is not decorative", () => {
    render(<MessageAvatar decorative={false} role="img" aria-label="FiestaBot" name="FiestaBot" />);
    expect(screen.getByRole("img", { name: "FiestaBot" })).not.toHaveAttribute("aria-hidden");
  });

  it("prefers a glyph child over the initial", () => {
    render(
      <MessageAvatar name="FiestaBot">
        <svg data-testid="glyph" />
      </MessageAvatar>,
    );
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="message-avatar"]')).not.toHaveTextContent("F");
  });
});
