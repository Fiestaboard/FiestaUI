import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SHORTCUT_LIST_LABELS,
  type ShortcutGroup,
  ShortcutList,
  ShortcutListPopover,
} from "./shortcut-list";

/*
 * Slice 1.4d (W4, WEB-17). Figma 07 `57:28953` and 08 `59:68086`.
 *
 * ShortcutList DOCUMENTS shortcuts; it binds none. These tests pin what the
 * reader gets (a named dialog holding a description list of action → keys,
 * platform-aware caps, alternatives read as "or") and the popover's keyboard
 * contract (focus lands in the dialog, Tab stays inside, Escape closes and
 * returns focus to the trigger). Appearance is VRT's job.
 */

const EDITOR: ShortcutGroup[] = [
  {
    items: [
      { label: "Insert menu (Variables, Colors, Formula)", keys: ["/"] },
      {
        label: "Undo · Redo",
        keys: [
          ["Mod", "Z"],
          ["Mod", "Shift", "Z"],
        ],
      },
      { label: "Save", keys: ["Mod", "S"] },
      { label: "Close a picker", keys: ["Esc"] },
    ],
  },
];

const GROUPED: ShortcutGroup[] = [
  { id: "insert", title: "Insert", items: [{ label: "Variable…", keys: ["Mod", "Shift", "V"] }] },
  { id: "edit", title: "Edit & send", items: [{ id: "undo", label: "Undo", keys: ["Mod", "Z"] }] },
];

function caps(el: Element) {
  return [...el.querySelectorAll("[data-slot='kbd-key'], [data-slot='kbd']:not(:has([data-slot='kbd-key']))")].map(
    (k) => k.textContent,
  );
}

describe("ShortcutList", () => {
  it("renders a description list: each action is a <dt>, its keys a <dd>", () => {
    const { container } = render(<ShortcutList groups={EDITOR} platform="apple" />);

    const list = container.querySelector("dl")!;
    expect(list).toHaveAttribute("data-slot", "shortcut-list-items");
    const terms = [...list.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(terms).toEqual(["Insert menu (Variables, Colors, Formula)", "Undo · Redo", "Save", "Close a picker"]);
    expect(list.querySelectorAll("dd")).toHaveLength(4);
    // Each pair sits in its own row so the subgrid keeps both columns aligned.
    const rows = list.querySelectorAll("[data-slot='shortcut-list-row']");
    expect(rows).toHaveLength(4);
    expect(rows[0]!.tagName).toBe("DIV");
    expect(rows[0]!.className).toContain("grid-cols-subgrid");
  });

  it("renders a chord as one Kbd with one cap per key", () => {
    const { container } = render(<ShortcutList groups={EDITOR} platform="apple" />);
    const save = [...container.querySelectorAll("dd")][2]!;
    const chords = save.querySelectorAll(":scope [data-slot='kbd']");
    expect(chords).toHaveLength(1);
    expect(caps(save)).toEqual(["⌘", "S"]);
  });

  it("prints Ctrl and words on the generic platform", () => {
    const { container } = render(<ShortcutList groups={EDITOR} platform="generic" />);
    const dds = [...container.querySelectorAll("dd")];
    expect(caps(dds[2]!)).toEqual(["Ctrl", "S"]);
    expect(caps(dds[1]!)).toEqual(["Ctrl", "Z", "Ctrl", "Shift", "Z"]);
  });

  it("follows the reader's machine when no platform is passed", () => {
    const platform = vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    try {
      const { container } = render(<ShortcutList groups={EDITOR} />);
      expect(caps([...container.querySelectorAll("dd")][2]!)).toEqual(["⌘", "S"]);
    } finally {
      platform.mockRestore();
    }
  });

  it("splits alternatives with a decorative dot and a spoken 'or'", () => {
    const { container } = render(<ShortcutList groups={EDITOR} platform="apple" />);
    const undo = [...container.querySelectorAll("dd")][1]!;

    expect(undo.querySelectorAll(":scope > [data-slot='kbd']")).toHaveLength(2);
    const sep = undo.querySelector("[data-slot='shortcut-list-separator']")!;
    expect(sep).toHaveAttribute("aria-hidden", "true");
    expect(sep).toHaveTextContent("·");
    const spoken = undo.querySelector(".sr-only")!;
    expect(spoken).toHaveTextContent("or");
    // A single chord has no separator at all.
    expect([...container.querySelectorAll("dd")][2]!.querySelector("[data-slot='shortcut-list-separator']")).toBeNull();
  });

  it("names each titled group, and leaves untitled groups unnamed", () => {
    render(<ShortcutList groups={GROUPED} platform="apple" />);
    const insert = screen.getByRole("group", { name: "Insert" });
    expect(within(insert).getByText("Variable…")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Edit & send" })).toBeInTheDocument();

    const { container } = render(<ShortcutList groups={EDITOR} platform="apple" />);
    const untitled = container.querySelector("[data-slot='shortcut-list-group']")!;
    expect(untitled).not.toHaveAttribute("role");
    expect(untitled).not.toHaveAttribute("aria-labelledby");
  });

  it("renders the footnote under the groups, and nothing when it is absent", () => {
    const { container, rerender } = render(
      <ShortcutList groups={EDITOR} platform="apple" footnote="No single-key shortcuts while typing." />,
    );
    const note = container.querySelector("[data-slot='shortcut-list-footnote']")!;
    expect(note).toHaveTextContent("No single-key shortcuts while typing.");
    expect(note.previousElementSibling).toHaveAttribute("data-slot", "shortcut-list-group");

    rerender(<ShortcutList groups={EDITOR} platform="apple" />);
    expect(container.querySelector("[data-slot='shortcut-list-footnote']")).toBeNull();
  });

  it("merges className onto the root and passes other props through", () => {
    const { container } = render(
      <ShortcutList groups={EDITOR} platform="apple" className="extra" data-testid="root" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-slot", "shortcut-list");
    expect(root.className).toContain("extra");
    expect(root).toHaveAttribute("data-testid", "root");
  });

  it("exports English defaults", () => {
    expect(DEFAULT_SHORTCUT_LIST_LABELS).toEqual({
      title: "Keyboard shortcuts",
      platformNote: "⌘ on Mac · Ctrl on Windows and Linux",
      or: "or",
      close: "Close",
    });
  });

  it("takes partial label overrides", () => {
    const { container } = render(
      <ShortcutList groups={EDITOR} platform="apple" labels={{ or: "oder" }} />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent("oder");
  });
});

function renderPopover(props: Partial<React.ComponentProps<typeof ShortcutListPopover>> = {}) {
  return render(
    <ShortcutListPopover
      groups={EDITOR}
      platform="apple"
      trigger={<button type="button">Shortcuts</button>}
      footnote="No single-key shortcuts while typing in the template."
      {...props}
    />,
  );
}

describe("ShortcutListPopover", () => {
  it("is closed by default and opens from its trigger as a named, described dialog", async () => {
    const user = userEvent.setup();
    renderPopover();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Shortcuts" }));

    const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toHaveAccessibleDescription("⌘ on Mac · Ctrl on Windows and Linux");
    expect(dialog).toHaveAttribute("data-slot", "shortcut-list-popover");
    expect(within(dialog).getByText("Save")).toBeInTheDocument();
    expect(within(dialog).getByText("No single-key shortcuts while typing in the template.")).toBeInTheDocument();
  });

  it("puts focus on the dialog itself, not the close chip", async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole("button", { name: "Shortcuts" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  it("traps Tab inside the dialog: the only stop is the close chip", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <ShortcutListPopover groups={EDITOR} platform="apple" trigger={<button type="button">Shortcuts</button>} />
        <button type="button">After</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Shortcuts" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());

    const close = within(dialog).getByRole("button", { name: "Close" });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole("button", { name: "After" })).not.toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderPopover({ onOpenChange });
    const trigger = screen.getByRole("button", { name: "Shortcuts" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.anything());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes from the close chip", async () => {
    const user = userEvent.setup();
    renderPopover({ defaultOpen: true });
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can be opened and closed by the consumer (the `?` key lives in the app)", async () => {
    function App() {
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "?" && setOpen(true);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, []);
      return (
        <ShortcutListPopover
          groups={EDITOR}
          platform="apple"
          open={open}
          onOpenChange={setOpen}
          trigger={<button type="button">Shortcuts</button>}
        />
      );
    }
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: "?" });
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("hides the trigger when there is no fine pointer, unless told not to", () => {
    const { unmount } = renderPopover();
    expect(screen.getByRole("button", { name: "Shortcuts" }).className).toContain("not-any-pointer-fine:hidden");
    unmount();

    renderPopover({ hideTriggerOnTouch: false });
    expect(screen.getByRole("button", { name: "Shortcuts" }).className).not.toContain("not-any-pointer-fine:hidden");
  });

  it("keeps the trigger's own classes and marks it with a slot", () => {
    renderPopover({ trigger: <button type="button" className="mine">Shortcuts</button> });
    const trigger = screen.getByRole("button", { name: "Shortcuts" });
    expect(trigger.className).toContain("mine");
    expect(trigger).toHaveAttribute("data-slot", "popover-trigger");
  });

  it("uses overridden labels for the title, note and close chip", async () => {
    renderPopover({
      defaultOpen: true,
      labels: { title: "Tastenkürzel", platformNote: "⌘ auf dem Mac", close: "Schließen" },
    });
    const dialog = await screen.findByRole("dialog", { name: "Tastenkürzel" });
    expect(dialog).toHaveAccessibleDescription("⌘ auf dem Mac");
    expect(within(dialog).getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("drops the note when platformNote is empty, leaving no description", async () => {
    renderPopover({ defaultOpen: true, labels: { platformNote: "" } });
    const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog.querySelector("[data-slot='popover-description']")).toBeNull();
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });

  it("merges className onto the popup surface", async () => {
    renderPopover({ defaultOpen: true, className: "extra" });
    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("extra");
    expect(dialog.className).toContain("rounded-[var(--radius-chrome)]");
  });
});
