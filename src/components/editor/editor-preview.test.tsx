import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_PREVIEW_LABELS, EditorPreview } from "./editor-preview";

/*
 * EditorPreview (slice 1.6a, W1 / WEB-03). Figma: 07 `53:137378` (pane),
 * 07 `57:64661` (docked), 07c `306:34342` / `316:92430` (Mirror on),
 * 08 `59:65635` (W1). jsdom has no stylesheet, so these pin roles, names,
 * slots and the "never collapses" contract; VRT covers the look.
 */

const board = <div data-testid="board">BOARD</div>;

describe("EditorPreview", () => {
  it("is a named region holding the board, with the default title", () => {
    render(<EditorPreview boardName="Kitchen board">{board}</EditorPreview>);

    const region = screen.getByRole("region", { name: "Live preview" });
    expect(region).toHaveAttribute("data-slot", "editor-preview");
    expect(region).toHaveAttribute("data-variant", "pane");
    expect(region).toContainElement(screen.getByTestId("board"));
    expect(screen.getByTestId("board").parentElement).toHaveAttribute("data-slot", "editor-preview-board");
  });

  it("exports the Figma copy as defaults", () => {
    expect(DEFAULT_EDITOR_PREVIEW_LABELS).toEqual({
      title: "Live preview",
      liveLabel: "Mirror to board while editing",
      mirroringLabel: "Mirroring",
    });
  });

  // Any class that hides, under any variant prefix (`hidden`, `max-lg:hidden`,
  // `md:max-xl:invisible`, `sr-only`…). `overflow-hidden` does not match: the
  // hiding word has to be the whole utility after its prefixes.
  const HIDING = /(^|\s)([^\s:]+:)*(hidden|invisible|collapse|sr-only)(\s|$)/;

  it("never collapses: no show/hide control and nothing hides the board in either variant", () => {
    for (const variant of ["pane", "docked"] as const) {
      const { unmount } = render(<EditorPreview variant={variant}>{board}</EditorPreview>);
      expect(screen.queryByRole("button", { name: /show preview|hide preview/i })).toBeNull();
      const root = screen.getByRole("region");
      const slot = screen.getByTestId("board").parentElement!;
      expect(slot).toBeVisible();
      for (const el of [root, slot]) expect(el.className).not.toMatch(HIDING);
      // Sticky to the top, and full width even under `self-start` (a column
      // parent would otherwise shrink-wrap it and long names would overflow).
      expect(root).toHaveClass("sticky", "top-0", "self-start", "w-full", "min-w-0");
      unmount();
    }
  });

  it("the hiding pattern catches prefixed hides and spares overflow-hidden", () => {
    for (const hide of ["hidden", "max-lg:hidden", "md:max-xl:invisible", "max-md:sr-only", "lg:collapse"]) {
      expect(`flex ${hide} min-w-0`).toMatch(HIDING);
    }
    expect("overflow-hidden min-w-0 sm:overflow-x-hidden").not.toMatch(HIDING);
  });

  it("the dock stacks over the template it is stuck above", () => {
    render(<EditorPreview variant="docked">{board}</EditorPreview>);
    expect(screen.getByRole("region")).toHaveClass("z-10");
  });

  describe("pane", () => {
    it("renders title, then board name and details in the mono line", () => {
      render(
        <EditorPreview boardName="Kitchen board" details="Flagship 22 × 6">
          {board}
        </EditorPreview>,
      );
      const details = screen.getByText((_, el) => el?.getAttribute("data-slot") === "editor-preview-details");
      expect(details).toHaveTextContent("Kitchen board · Flagship 22 × 6");
      expect(details.className).toMatch(/\bfont-mono\b/);
      expect(screen.getByText("Live preview").className).toMatch(/\bfont-semibold\b/);
    });

    it("omits the details line when there is nothing to show", () => {
      render(<EditorPreview>{board}</EditorPreview>);
      expect(document.querySelector('[data-slot="editor-preview-details"]')).toBeNull();
    });

    it("shows only the details when there is no board name", () => {
      render(<EditorPreview details="Flagship 22 × 6">{board}</EditorPreview>);
      expect(document.querySelector('[data-slot="editor-preview-details"]')).toHaveTextContent(/^Flagship 22 × 6$/);
    });

    it("has a mirror switch named by the default live label, off by default", () => {
      render(<EditorPreview>{board}</EditorPreview>);
      const toggle = screen.getByRole("switch", { name: "Mirror to board while editing" });
      expect(toggle).not.toBeChecked();
    });

    it("toggles uncontrolled, reporting each change", () => {
      const onLiveChange = vi.fn();
      render(
        <EditorPreview defaultLive onLiveChange={onLiveChange}>
          {board}
        </EditorPreview>,
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).not.toBeChecked();
      expect(onLiveChange).toHaveBeenLastCalledWith(false);
    });

    it("clicking the label toggles the switch", () => {
      render(<EditorPreview>{board}</EditorPreview>);
      fireEvent.click(screen.getByText("Mirror to board while editing"));
      expect(screen.getByRole("switch")).toBeChecked();
    });

    it("is controllable: `live` wins over clicks until the parent updates it", () => {
      const onLiveChange = vi.fn();
      const { rerender } = render(
        <EditorPreview live={false} onLiveChange={onLiveChange}>
          {board}
        </EditorPreview>,
      );
      fireEvent.click(screen.getByRole("switch"));
      expect(onLiveChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole("switch")).not.toBeChecked();
      rerender(
        <EditorPreview live onLiveChange={onLiveChange}>
          {board}
        </EditorPreview>,
      );
      expect(screen.getByRole("switch")).toBeChecked();
    });

    it("takes a custom live label and can disable the switch", () => {
      render(
        <EditorPreview liveLabel="Mirror to board while editing · the Kitchen board shows your edits" liveDisabled>
          {board}
        </EditorPreview>,
      );
      const toggle = screen.getByRole("switch", {
        name: "Mirror to board while editing · the Kitchen board shows your edits",
      });
      expect(toggle).toBeDisabled();
    });

    it("renders the live action beside the switch", () => {
      render(<EditorPreview liveAction={<button type="button">Replay</button>}>{board}</EditorPreview>);
      const row = screen.getByRole("switch").closest('[data-slot="editor-preview-live"]');
      expect(row).toContainElement(screen.getByRole("button", { name: "Replay" }));
    });

    it("does not show the Mirroring badge (the switch carries the state)", () => {
      render(<EditorPreview live>{board}</EditorPreview>);
      expect(screen.queryByText("Mirroring")).toBeNull();
    });

    it("renders the status line as a polite live region after the live row", () => {
      render(<EditorPreview statusLine="Sends after each pause in typing.">{board}</EditorPreview>);
      const status = screen.getByText("Sends after each pause in typing.");
      expect(status).toHaveAttribute("data-slot", "editor-preview-status");
      expect(status).toHaveAttribute("aria-live", "polite");
      const live = document.querySelector('[data-slot="editor-preview-live"]')!;
      expect(live.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("keeps an empty, visually hidden status region mounted when there is no status line", () => {
      for (const empty of [undefined, null, false, ""]) {
        const { unmount } = render(<EditorPreview statusLine={empty}>{board}</EditorPreview>);
        const status = document.querySelector('[data-slot="editor-preview-status"]')!;
        expect(status).toHaveAttribute("aria-live", "polite");
        expect(status).toBeEmptyDOMElement();
        expect(status).toHaveClass("sr-only");
        unmount();
      }
    });

    it("announces the first message: the same live region receives it, not a new node", () => {
      const { rerender } = render(<EditorPreview>{board}</EditorPreview>);
      const region = document.querySelector('[data-slot="editor-preview-status"]')!;
      rerender(<EditorPreview statusLine="Sending…">{board}</EditorPreview>);
      const after = document.querySelector('[data-slot="editor-preview-status"]')!;
      expect(after).toBe(region);
      expect(after).toHaveTextContent("Sending…");
      expect(after).not.toHaveClass("sr-only");
      rerender(<EditorPreview>{board}</EditorPreview>);
      expect(document.querySelector('[data-slot="editor-preview-status"]')).toBe(region);
      expect(region).toBeEmptyDOMElement();
    });

    it("can keep the status line visible but silent", () => {
      render(
        <EditorPreview statusLine="13 / 22 characters" statusPoliteness="off">
          {board}
        </EditorPreview>,
      );
      expect(screen.getByText("13 / 22 characters")).toHaveAttribute("aria-live", "off");
    });
  });

  describe("docked", () => {
    it("joins title and board name on one line and has no switch", () => {
      render(
        <EditorPreview variant="docked" boardName="Kitchen board" details="Flagship 22 × 6">
          {board}
        </EditorPreview>,
      );
      const region = screen.getByRole("region", { name: "Live preview · Kitchen board" });
      expect(region).toHaveAttribute("data-variant", "docked");
      expect(screen.queryByRole("switch")).toBeNull();
      // Details are pane-only: the dock's 390 px header has no room for them.
      expect(screen.queryByText(/Flagship/)).toBeNull();
    });

    it("titles itself with the title alone when there is no board name", () => {
      render(<EditorPreview variant="docked">{board}</EditorPreview>);
      expect(screen.getByRole("region", { name: "Live preview" })).toBeInTheDocument();
    });

    it("shows the Mirroring badge only while live", () => {
      const { rerender } = render(<EditorPreview variant="docked">{board}</EditorPreview>);
      expect(screen.queryByText("Mirroring")).toBeNull();
      rerender(
        <EditorPreview variant="docked" live>
          {board}
        </EditorPreview>,
      );
      const badge = screen.getByText("Mirroring");
      expect(badge).toHaveAttribute("data-slot", "badge");
      // 07c `316:92430`: Badge / Variant=formula.
      expect(badge).toHaveClass("bg-tag-formula/15", "font-mono");
    });

    it("takes a custom mirroring label", () => {
      render(
        <EditorPreview variant="docked" live mirroringLabel="Duplication">
          {board}
        </EditorPreview>,
      );
      expect(screen.getByText("Duplication")).toBeInTheDocument();
    });

    it("puts the status line under the board", () => {
      render(
        <EditorPreview variant="docked" statusLine="Sent to the Kitchen board">
          {board}
        </EditorPreview>,
      );
      const status = screen.getByText("Sent to the Kitchen board");
      const slot = screen.getByTestId("board").parentElement!;
      expect(slot.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("renders the header action and a status dot per `dotStatus`", () => {
    render(
      <EditorPreview dotStatus="warning" headerAction={<button type="button">Actual size</button>}>
        {board}
      </EditorPreview>,
    );
    const header = document.querySelector('[data-slot="editor-preview-header"]')!;
    expect(header).toContainElement(screen.getByRole("button", { name: "Actual size" }));
    const dot = header.querySelector('[data-slot="status-dot"]')!;
    expect(dot).toHaveAttribute("data-status", "warning");
    expect(dot).toHaveAttribute("data-size", "md");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the small dot in the dock", () => {
    render(<EditorPreview variant="docked">{board}</EditorPreview>);
    const dot = document.querySelector('[data-slot="status-dot"]')!;
    expect(dot).toHaveAttribute("data-size", "sm");
    expect(dot).toHaveAttribute("data-status", "success");
  });

  it("passes props and className through to the root", () => {
    render(
      <EditorPreview id="page-editor-preview" className="top-14" data-testid="root">
        {board}
      </EditorPreview>,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveAttribute("id", "page-editor-preview");
    expect(root.className).toMatch(/\btop-14\b/);
  });

  it("accepts a custom title", () => {
    render(<EditorPreview title="Preview">{board}</EditorPreview>);
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
  });
});
