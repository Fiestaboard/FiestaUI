import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StaticBoardDisplay } from "../board/static-board-display";
import { NoteSeams } from "./note-seams";

describe("NoteSeams", () => {
  it("adds decorative boundaries to the existing one-canvas renderer", () => {
    const { container } = render(
      <div>
        <StaticBoardDisplay
          deviceType="note_array"
          notesWide={2}
          notesTall={2}
          size="sm"
          bezel={false}
          message="HELLO"
        />
        <NoteSeams />
      </div>,
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAccessibleName("Board preview: HELLO");
    expect(container.querySelectorAll("[data-note-tile]")).toHaveLength(180);
    const overlay = container.querySelector('[data-slot="note-seams"]');
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay).toHaveStyle({ width: "483px", height: "129px" });
    expect(container.querySelector('[data-slot="note-column-seam"]')).toHaveStyle({ left: "240.5px", width: "2px" });
    expect(container.querySelector('[data-slot="note-row-seam"]')).toHaveStyle({ top: "63.5px", height: "2px" });
    expect(container.querySelector('[data-slot="note-focus-region"]')).toBeNull();
  });

  it("highlights only the requested Note's range and dims its siblings", () => {
    const { container, rerender } = render(<NoteSeams note={4} />);
    expect(container.querySelector('[data-slot="note-focus-region"]')).toHaveStyle({
      left: "246px",
      top: "69px",
      width: "237px",
      height: "60px",
    });
    expect(container.querySelectorAll('[data-slot="note-dim-region"]')).toHaveLength(3);
    rerender(<NoteSeams note={4} notesWide={1} notesTall={1} />);
    expect(container.querySelector('[data-slot="note-focus-region"]')).toBeNull();
    expect(container.querySelector('[data-slot="note-column-seam"]')).toBeNull();
    expect(container.querySelector('[data-slot="note-row-seam"]')).toBeNull();
  });

  it("positions configurable editor seams independently from tile rendering", () => {
    const { container } = render(
      <NoteSeams
        notesWide={2}
        notesTall={1}
        tileWidth={9}
        tileHeight={40}
        columnGap={0}
        rowGap={0}
        seamGap={8}
        note={2}
      />,
    );
    expect(container.querySelector('[data-slot="note-column-seam"]')).toHaveStyle({ left: "138px" });
    expect(container.querySelector('[data-slot="note-focus-region"]')).toHaveStyle({
      left: "143px",
      top: "0px",
      width: "135px",
      height: "120px",
    });
  });
});
