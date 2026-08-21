import { render, screen } from "@testing-library/react";
import { Cloud } from "lucide-react";
import { describe, expect, it } from "vitest";

import { IconTile } from "./icon-tile";

/*
 * IconTile has no behaviour — it is a box. So everything worth asserting here
 * is either the published `data-*` contract (which consumers and VRT select
 * on) or the accessibility-tree question the component exists to settle:
 * whether the glyph inside it is announced.
 *
 * Appearance — the muted wash, the board-black ground, the 32/40/48px scale —
 * is VRT's job. Tailwind does not run in jsdom, so a class assertion here
 * would prove only that a string was concatenated.
 */

/** The tile is decorative by default, so there is no role to query it by. */
function tile(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="icon-tile"]');
  if (!el) throw new Error("no [data-slot=icon-tile] element rendered");
  return el;
}

describe("IconTile", () => {
  it("renders its glyph and stamps the default size and tone", () => {
    render(
      <IconTile decorative={false}>
        <Cloud role="img" aria-label="Cloud" />
      </IconTile>,
    );

    expect(screen.getByRole("img", { name: "Cloud" })).toBeInTheDocument();
    expect(tile()).toHaveAttribute("data-size", "md");
    expect(tile()).toHaveAttribute("data-tone", "muted");
  });

  it.each(["sm", "md", "lg"] as const)("stamps size=%s so children can select on it", (size) => {
    render(
      <IconTile size={size}>
        <Cloud />
      </IconTile>,
    );

    expect(tile()).toHaveAttribute("data-size", size);
  });

  it.each(["muted", "board"] as const)("stamps tone=%s so children can select on it", (tone) => {
    render(
      <IconTile tone={tone}>
        <Cloud />
      </IconTile>,
    );

    expect(tile()).toHaveAttribute("data-tone", tone);
  });

  it("hides the glyph from the accessibility tree by default", () => {
    render(
      <IconTile>
        <Cloud role="img" aria-label="Cloud" />
      </IconTile>,
    );

    // The tile is a decoration that repeats adjacent text, so the whole
    // subtree leaves the a11y tree — a named icon inside it must NOT be
    // reachable. `queryByRole` honours aria-hidden, which is exactly the
    // question a screen reader asks.
    expect(screen.queryByRole("img", { name: "Cloud" })).toBeNull();
    expect(tile()).toHaveAttribute("aria-hidden", "true");
  });

  it("leaves the glyph in the accessibility tree when decorative is false", () => {
    render(
      <IconTile decorative={false}>
        <Cloud role="img" aria-label="Cloud" />
      </IconTile>,
    );

    expect(screen.getByRole("img", { name: "Cloud" })).toBeInTheDocument();
    expect(tile()).not.toHaveAttribute("aria-hidden");
  });

  it("lets an explicit aria-hidden win over the decorative default", () => {
    render(
      <IconTile aria-hidden={false}>
        <Cloud role="img" aria-label="Cloud" />
      </IconTile>,
    );

    expect(screen.getByRole("img", { name: "Cloud" })).toBeInTheDocument();
  });

  it("forwards arbitrary span props to the tile element", () => {
    render(
      <IconTile id="medallion" data-testid="tile">
        <Cloud />
      </IconTile>,
    );

    expect(tile()).toHaveAttribute("id", "medallion");
    expect(tile()).toHaveAttribute("data-testid", "tile");
  });
});
