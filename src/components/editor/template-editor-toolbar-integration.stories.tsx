import type { Meta, StoryObj } from "@storybook/react";
import { useState, useSyncExternalStore } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../forms/button";
import { TemplateEditor } from "./template-editor";
import type { DrawBrush } from "./utils/draw-mode";

const VARIABLES = {
  variables: { weather: ["temp"] },
  colors: { red: 63, orange: 64, yellow: 65, green: 66, blue: 67, violet: 68, white: 69, black: 70 },
};

function useMedia(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * The real editor owns its engine, selection and history. This host only
 * selects the three independent web2.5 policies and supplies a portal host.
 * forceTouch demonstrates a host's coarse-input preference at desktop widths.
 */
function IntegratedToolbar({ led = false, forceTouch = true, forcePopover = false, draw = false }) {
  const [value, setValue] = useState("GOOD MORNING\n{{weather.temp}}°\nHAVE A GREAT DAY");
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState("Large 5×7");
  const [drawing, setDrawing] = useState(draw);
  const [brush, setBrush] = useState<DrawBrush>({ kind: "color", color: "blue" });
  const sheet = useMedia("(width < 640px)");
  const touch = useMedia("(width < 768px)");
  const coarse = useMedia("(pointer: coarse)");
  const docked = useMedia("(width < 1024px)");
  return (
    <main data-testid="toolbar-integration-page" className="min-h-screen bg-background p-4 pb-24 text-foreground">
      <h1 className="mb-4 text-xl font-semibold">Kitchen morning</h1>
      <TemplateEditor
        value={value}
        onChange={setValue}
        charset={led ? "led_5x7" : "vestaboard_v1"}
        drawMode={drawing}
        onDrawModeToggle={draw ? () => setDrawing((active) => !active) : undefined}
        drawBrush={brush}
        onDrawBrushChange={setBrush}
        toolbarProps={{
          size: touch || coarse || forceTouch ? "touch" : "default",
          pickerPresentation: sheet && !forcePopover ? "sheet" : "popover",
          layout: docked ? "docked" : "row",
          container: host,
          templateVariables: VARIABLES,
          renderVariablePicker: ({ onInsert }) => (
            <div className="flex min-w-56 flex-col gap-3">
              <p>Weather</p>
              <Button size="touch" onClick={() => onInsert("{{weather.temp}}")}>
                Temperature
              </Button>
            </div>
          ),
          renderSizePicker: ({ close }) => (
            <Button
              size="touch"
              onClick={() => {
                setSize("Large 5×7");
                close();
              }}
            >
              Large 5×7
            </Button>
          ),
        }}
      />
      <p className="mt-4 text-sm text-muted-foreground">{led ? size : "Split-flap"}</p>
      <output data-testid="toolbar-template-value" className="mt-4 block whitespace-pre-wrap text-sm">
        {value}
      </output>
      {drawing && (
        <output data-testid="toolbar-selected-brush" className="mt-4 block text-sm">
          Selected brush: {brush.kind === "color" ? brush.color : brush.kind === "char" ? brush.char : brush.kind}
        </output>
      )}
      <div ref={setHost} data-testid="toolbar-portal-host" className="mt-6" />
    </main>
  );
}

const meta = {
  title: "Editor/TemplateEditorToolbarIntegration",
  component: IntegratedToolbar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof IntegratedToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

// Each story is run in both light and dark by the existing CI theme matrix.
// Mobile is viewport-responsive: the browser geometry runner explicitly visits
//390,640,768,900 and1280, without pretending a390px div changes media queries.
export const SplitFlap: Story = {};
export const Led: Story = { args: { led: true } };
export const Mobile: Story = { args: { forceTouch: false } };
export const EnlargedTextPopover: Story = { args: { forcePopover: true } };

export const PortalPopover: Story = {
  args: { forcePopover: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Variables" }));
    const popup = await within(canvasElement.ownerDocument.body).findByRole("dialog", { name: "Variables" });
    expect(canvas.getByTestId("toolbar-portal-host")).toContainElement(popup);
    expect(canvas.getByRole("group", { name: "Editor tools" })).not.toContainElement(popup);
  },
};

/** Open states are captured in desktop/mobile × light/dark VRT. */
export const MobileColors: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Colors" }));
  },
};

export const LedIconPopover: Story = {
  args: { led: true, forcePopover: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Icon" }));
  },
};

export const LedTextColorPopover: Story = {
  args: { led: true, forcePopover: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Text color" }));
  },
};

export const ColorPopover: Story = {
  args: { forcePopover: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Colors" }));
  },
};

export const BrushPopover: Story = {
  args: { draw: true, forcePopover: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Brush" }));
  },
};

/**
 * BB-E-29: Escape from a picker puts focus back in the editor, at its caret,
 * rather than on the picker's trigger — in the real browser, both themes.
 */
export const EscapeReturnsToEditor: Story = {
  args: { forcePopover: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const editor = await canvas.findByRole("textbox", { name: "Template editor" });
    for (const name of ["Variables", "Colors"]) {
      await userEvent.click(await canvas.findByRole("button", { name }));
      const popup = await body.findByRole("dialog", { name });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(popup).not.toBeInTheDocument());
      await waitFor(() => expect(editor).toHaveFocus());
    }
  },
};
