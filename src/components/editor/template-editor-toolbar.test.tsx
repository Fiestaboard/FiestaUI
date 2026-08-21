import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateEditorToolbar, type ToolbarTemplateVariables } from "./template-editor-toolbar";
import { insertTemplateContent } from "./utils/insertion";

// The insertion plumbing is the toolbar's, not this file's: stubbing it lets a
// fake editor stand in for a live TipTap instance while still proving the
// toolbar routed the slot's token to the right place, with the right argument.
vi.mock("./utils/insertion", () => ({
  insertTemplateContent: vi.fn(),
}));

const TEMPLATE_VARIABLES: ToolbarTemplateVariables = {
  variables: { weather: ["temp", "condition"] },
};

/**
 * The toolbar only ever asks a live editor whether it can undo/redo and where
 * the selection is; everything else it does through `insertTemplateContent`,
 * which is mocked above.
 */
function fakeEditor(): Editor {
  return {
    can: () => ({ undo: () => false, redo: () => false }),
    state: { selection: { from: 0, to: 0 } },
    on: () => {},
    off: () => {},
  } as unknown as Editor;
}

async function openVariables(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Variables" }));
  return screen.getByTestId("toolbar-dropdown-panel");
}

describe("TemplateEditorToolbar renderVariablePicker", () => {
  it("renders the injected picker as the Variables dropdown body", async () => {
    const user = userEvent.setup();
    render(
      <TemplateEditorToolbar
        editor={fakeEditor()}
        templateVariables={TEMPLATE_VARIABLES}
        renderVariablePicker={() => <p>Host variable picker</p>}
      />,
    );

    const panel = await openVariables(user);

    expect(within(panel).getByText("Host variable picker")).toBeInTheDocument();
  });

  it("falls back to its own lazily-imported picker when the slot is omitted", async () => {
    const user = userEvent.setup();
    render(<TemplateEditorToolbar editor={fakeEditor()} templateVariables={TEMPLATE_VARIABLES} />);

    await openVariables(user);

    // The built-in `VariablePickerContent` behind the toolbar's `lazy()` —
    // this is the default that must keep working for existing consumers.
    expect(await screen.findByPlaceholderText("Search variables...")).toBeInTheDocument();
  });

  it("inserts the slot's token into the editor and closes the dropdown", async () => {
    const user = userEvent.setup();
    const editor = fakeEditor();
    render(
      <TemplateEditorToolbar
        editor={editor}
        templateVariables={TEMPLATE_VARIABLES}
        renderVariablePicker={({ onInsert }) => (
          <button type="button" onClick={() => onInsert("{{weather.temp}}")}>
            Insert temp
          </button>
        )}
      />,
    );

    await openVariables(user);
    await user.click(screen.getByRole("button", { name: "Insert temp" }));

    expect(insertTemplateContent).toHaveBeenCalledWith(editor, "{{weather.temp}}");
    expect(screen.queryByTestId("toolbar-dropdown-panel")).not.toBeInTheDocument();
  });

  it("keeps the empty state: no variables means a disabled button, slot or not", async () => {
    const user = userEvent.setup();
    render(
      <TemplateEditorToolbar
        editor={fakeEditor()}
        templateVariables={undefined}
        renderVariablePicker={() => <p>Host variable picker</p>}
      />,
    );

    // The disabled trigger is what the toolbar itself decides from
    // `templateVariables`; supplying a picker body must not talk it out of it.
    const trigger = screen.getByRole("button", { name: "Variables (no variables available)" });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByText("Host variable picker")).not.toBeInTheDocument();
  });
});
