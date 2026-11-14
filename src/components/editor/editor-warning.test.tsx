import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_WARNING_LABELS, EditorWarning, EditorWarningAction } from "./editor-warning";

/*
 * Slice 1.6b (P6, H4). Figma 07c `307:41691` (desktop) and `307:43729`
 * (phone): the validated line-overflow card. FiestaUI library EditorWarning
 * `28:28304` (04 `39:5815`): the line-limit box under the editor.
 */

describe("EditorWarning kind=line-overflow", () => {
  function overflow({ onFix, ...props }: { onFix?: () => void; size?: "default" | "touch" } = {}) {
    return render(
      <EditorWarning
        kind="line-overflow"
        line={4}
        columns={24}
        maxColumns={22}
        checked="Checked by Maya’s FiestaPi at the board’s real width · 6:05 PM"
        actions={
          <>
            <EditorWarningAction onClick={onFix}>Show next train only</EditorWarningAction>
            <EditorWarningAction>Wrap to line 5</EditorWarningAction>
          </>
        }
        {...props}
      >
        “N JUDAH 4, 12 AND 25 MIN”. The Kitchen board shows the first 22 columns.
      </EditorWarning>,
    );
  }

  it("names the line, the count and what is cut", () => {
    overflow();
    const root = document.querySelector<HTMLElement>('[data-slot="editor-warning"]')!;
    expect(root).toHaveAttribute("data-kind", "line-overflow");
    expect(root).toHaveAttribute("data-size", "default");
    // The badge is the shape cue; the sentence says it in words.
    expect(screen.getByText("Line 4")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("24 of 22 columns · 2 cut off")).toBeInTheDocument();
    expect(screen.getByText(/The Kitchen board shows the first 22 columns/)).toBeInTheDocument();
    expect(screen.getByText(/Checked by Maya/)).toHaveClass("text-muted-foreground");
  });

  it("is a polite status on the destructive alert surface, labelled by its title", () => {
    overflow();
    const root = screen.getByRole("status");
    expect(root).toHaveAttribute("data-slot", "editor-warning");
    expect(root.className).toMatch(/\bborder-destructive\b/);
    expect(root.className).toMatch(/bg-destructive\/8/);
    expect(root).toHaveAccessibleName("Line 4 24 of 22 columns · 2 cut off");
  });

  it("fix actions are outline buttons: 32 px by default, 44 px at touch", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { unmount } = overflow({ onFix: onClick });
    const fix = screen.getByRole("button", { name: "Show next train only" });
    expect(fix).toHaveAttribute("data-size", "sm");
    expect(fix).toHaveAttribute("data-variant", "outline");
    await user.click(fix);
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();

    overflow({ size: "touch" });
    expect(document.querySelector('[data-slot="editor-warning"]')).toHaveAttribute("data-size", "touch");
    expect(screen.getByRole("button", { name: "Wrap to line 5" })).toHaveAttribute("data-size", "touch");
  });

  it("never claims a negative cut, and takes localized copy", () => {
    render(
      <EditorWarning
        kind="line-overflow"
        line={2}
        columns={22}
        maxColumns={22}
        labels={{
          line: (n) => `Zeile ${n}`,
          lineOverflow: ({ columns, maxColumns, cut }) => `${columns} von ${maxColumns} Spalten · ${cut} abgeschnitten`,
        }}
      />,
    );
    expect(screen.getByText("Zeile 2")).toBeInTheDocument();
    expect(screen.getByText("22 von 22 Spalten · 0 abgeschnitten")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="editor-warning-actions"]')).toBeNull();
    expect(document.querySelector('[data-slot="editor-warning-checked"]')).toBeNull();
  });
});

describe("EditorWarning kind=line-limit", () => {
  it("is the library's warning box with the default sentence", () => {
    render(<EditorWarning kind="line-limit" lines={7} maxLines={6} />);
    const root = screen.getByRole("status");
    expect(root).toHaveAttribute("data-kind", "line-limit");
    expect(root.className).toMatch(/\bborder-warning\b/);
    expect(root).toHaveTextContent(
      "Warning: Template has 7 lines but the board only displays 6. Lines beyond 6 will be ignored.",
    );
    expect(screen.getByText("Warning:")).toHaveClass("font-semibold");
  });

  it("children replace the sentence; politeness can be raised", () => {
    render(
      <EditorWarning kind="line-limit" lines={4} maxLines={3} politeness="assertive">
        Line 4 won’t show.
      </EditorWarning>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Warning: Line 4 won’t show.");
  });

  it("exports its English defaults", () => {
    expect(DEFAULT_EDITOR_WARNING_LABELS.line(3)).toBe("Line 3");
    expect(DEFAULT_EDITOR_WARNING_LABELS.lineLimit({ lines: 4, maxLines: 3 })).toBe(
      "Template has 4 lines but the board only displays 3. Lines beyond 3 will be ignored.",
    );
  });
});
