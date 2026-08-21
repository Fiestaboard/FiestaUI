import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { TextLink } from "./text-link";

/*
 * TextLink is the #238 component: it carried `text-primary` (the 1.83:1 tile)
 * and `outline-none focus-visible:ring-ring/50` (a 1.36:1 band replacing the
 * UA outline it suppressed). Both are colour facts, and colour is exactly
 * what jsdom cannot see — no stylesheet loads, so every class string here is
 * inert. The measured ratios live in the file's doc comment, in theme.css and
 * in the PR body; `scripts/ci/tests/theme-contrast.test.mjs` is what stops
 * either recipe coming back.
 *
 * What IS testable in jsdom is the half of the focus contract that is
 * structural rather than painted: a link only benefits from a focus ring if
 * it is reachable by keyboard and activates from one, and it only announces
 * as a link if it has an href. Those are the assertions below, plus the
 * `data-slot` styling hook consumers select on.
 */

describe("TextLink", () => {
  it("renders an anchor that announces as a link with its text as the name", () => {
    render(<TextLink href="https://example.com">Read the setup guide</TextLink>);

    const link = screen.getByRole("link", { name: "Read the setup guide" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link.tagName).toBe("A");
  });

  it("carries the data-slot hook consumers style against", () => {
    render(<TextLink href="https://example.com">Docs</TextLink>);

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("data-slot", "text-link");
  });

  it("is reachable by Tab, so the focus ring has something to draw on", async () => {
    const user = userEvent.setup();
    render(
      <p>
        Get a key from the <TextLink href="https://example.com">provider dashboard</TextLink> first.
      </p>,
    );

    await user.tab();

    expect(screen.getByRole("link", { name: "provider dashboard" })).toHaveFocus();
  });

  it("activates from the keyboard with Enter", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <TextLink href="https://example.com" onClick={onClick}>
        Open
      </TextLink>,
    );

    await user.tab();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("passes the rest of its props through to the anchor", () => {
    render(
      <TextLink href="https://example.com" target="_blank" rel="noreferrer" aria-describedby="hint">
        External
      </TextLink>,
    );

    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(link).toHaveAttribute("aria-describedby", "hint");
  });

  it("takes a ref, since React 19 passes it as a plain prop", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <TextLink href="https://example.com" ref={ref}>
        Docs
      </TextLink>,
    );

    expect(ref.current).toBe(screen.getByRole("link", { name: "Docs" }));
  });

  it("does not announce as a link without an href, and is not in the tab order", async () => {
    // Documents why the stories all pass one: an <a> with no href has no
    // implicit role and no tab stop, so a "link" written that way is
    // invisible to assistive technology and to the keyboard — the focus ring
    // this issue fixes would never be reached.
    const user = userEvent.setup();
    render(<TextLink>Not a link</TextLink>);

    expect(screen.queryByRole("link")).toBeNull();
    await user.tab();
    expect(screen.getByText("Not a link")).not.toHaveFocus();
  });
});
