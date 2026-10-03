import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, initialsOf } from "./avatar";

describe("initialsOf", () => {
  it("uses the first letter of a single-word name", () => {
    expect(initialsOf("casa")).toBe("C");
  });

  it("uses the first and last word of a spaced name", () => {
    expect(initialsOf("Ada King Lovelace")).toBe("AL");
  });

  it("treats the separators usernames are built from as word breaks", () => {
    expect(initialsOf("ada.lovelace")).toBe("AL");
    expect(initialsOf("ada_lovelace")).toBe("AL");
    expect(initialsOf("ada-lovelace")).toBe("AL");
  });

  it("reads an email address by its local part, not its domain", () => {
    // "user@example.com" is one person called "user", not "U E" or "U C".
    expect(initialsOf("user@example.com")).toBe("U");
    expect(initialsOf("ada.lovelace@example.com")).toBe("AL");
  });

  it("does not mistake a leading @ for an email address", () => {
    // A handle, not an address: there is no local part in front of the @,
    // and reading it as one leaves a signed-in user with no initials at all.
    expect(initialsOf("@casa")).toBe("C");
  });

  it("skips punctuation to reach the first letter or digit of a word", () => {
    expect(initialsOf("(admin)")).toBe("A");
    expect(initialsOf("#1 dad")).toBe("1D");
  });

  it("keeps a whole code point rather than half a surrogate pair", () => {
    expect(initialsOf("𝒶da")).toBe("𝒶".toUpperCase());
  });

  it("keeps a whole grapheme rather than its first code point", () => {
    // A decomposed é is two code points; taking one drops the accent.
    expect(initialsOf("émile")).toBe("É");
    // A ZWJ family is seven; taking one leaves a lone man.
    expect(initialsOf("👨‍👩‍👧 home")).toBe("👨‍👩‍👧H");
  });

  it("returns nothing for a name with no letters in it", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
    expect(initialsOf("...")).toBe("");
  });
});

describe("Avatar", () => {
  it("renders the initials of the name", () => {
    render(<Avatar name="ada.lovelace" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveTextContent("AL");
  });

  it("falls back to a person glyph when there is no name to draw from", () => {
    render(<Avatar data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveTextContent("");
    expect(avatar.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a child glyph instead of initials when one is given", () => {
    render(
      <Avatar name="casa" data-testid="avatar">
        <svg data-testid="glyph" />
      </Avatar>,
    );
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
    expect(screen.getByTestId("avatar")).not.toHaveTextContent("C");
  });

  it("is hidden from assistive tech by default", () => {
    // The name is nearly always printed beside it; announcing "C" and then
    // "casa" is the double announcement the package forbids.
    render(<Avatar name="casa" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to initials when a conditional child renders nothing", () => {
    // `{cond && <Icon />}` hands over `false`, which `??` would have kept —
    // and drawn an empty disc.
    render(
      <Avatar name="casa" data-testid="avatar">
        {false}
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toHaveTextContent("C");
  });

  it("is named after the person when it is exposed as an image", () => {
    // An unnamed role="img" is worse than a hidden one.
    render(<Avatar name="casa" decorative={false} />);
    expect(screen.getByRole("img", { name: "casa" })).toBeInTheDocument();
  });

  it("lets the consumer supply a different, localized name for the image", () => {
    render(<Avatar name="casa" decorative={false} aria-label="Signed in as casa" />);
    expect(screen.getByRole("img", { name: "Signed in as casa" })).toBeInTheDocument();
  });
});
