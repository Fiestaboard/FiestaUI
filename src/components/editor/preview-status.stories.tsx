import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import type { EditState } from "./edit-state-chip";
import { type PreviewDisplayState, PreviewStatus } from "./preview-status";

// Keep Storybook args concrete: its default-args inference intersects the
// absent/present Problems union into never. The production API remains paired.
interface PreviewStatusStoryArgs {
  display: PreviewDisplayState;
  message: string;
  displayLabel?: string;
  editState?: EditState;
  editStateLabel?: string;
  size?: "default" | "touch";
  problems: number;
  onOpenProblems: () => void;
  problemsLabel?: (count: number) => string;
  problemsDisabled?: boolean;
  problemsDirection?: "right" | "down";
}

/** C29, Figma 04d 171:163202. Platform references share the same Core anatomy. */
const meta = {
  title: "Editor/PreviewStatus",
  component: PreviewStatus,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { display: "live", message: "Showing on Den TV now", problems: 2, onOpenProblems: fn(), size: "touch" },
  decorators: [
    (Story, context) => (
      <div className={context.parameters.previewWidth === 468 ? "w-full max-w-[468px]" : "w-full max-w-[370px]"}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<PreviewStatusStoryArgs>;
export default meta;
type Story = StoryObj<PreviewStatusStoryArgs>;

export const Live: Story = {};
export const Scheduled: Story = { args: { display: "scheduled", message: "Showing on Den TV now" } };
export const NotScheduled: Story = { args: { display: "not-scheduled", message: "Showing on Den TV now" } };
export const Testing: Story = {
  args: { display: "not-scheduled", editState: "testing", message: "Tomorrow 7 AM · Sample data", problems: 0 },
};
export const Unsaved: Story = { args: { editState: "unsaved", message: "Showing the saved revision" } };
export const Draft: Story = {
  args: { display: "not-scheduled", editState: "draft", message: "Not showing on a display" },
};
export const Saved: Story = {
  args: { editState: "saved", editStateLabel: "Saved 6:05 PM", message: "Showing on Den TV now", problems: 0 },
};
export const NoProblems: Story = { args: { problems: 0 } };
export const Disabled: Story = { args: { problemsDisabled: true } };

export const DesktopConsole: Story = {
  args: { size: "default", message: "Showing on Den TV now · until 8:30 AM", problemsDirection: "down" },
  parameters: { previewWidth: 468 },
};

export const WithoutProblems: Story = {
  render: () => <PreviewStatus display="scheduled" message="Starts tomorrow at 7:00 AM" size="touch" />,
};

export const Interactive: Story = {
  render: function InteractiveStatus(args) {
    const [opened, setOpened] = useState(0);
    return (
      <>
        <PreviewStatus {...args} onOpenProblems={() => setOpened((count) => count + 1)} />
        <p className="mt-2 text-xs text-muted-foreground">Problems opened: {opened}</p>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "2 problems" });
    await userEvent.click(button);
    await expect(canvas.getByText("Problems opened: 1")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Problems opened: 2")).toBeInTheDocument();
    await userEvent.keyboard(" ");
    await expect(canvas.getByText("Problems opened: 3")).toBeInTheDocument();
    button.blur();
  },
};

async function checkTextAndTargets({ canvasElement }: { canvasElement: HTMLElement }) {
  await canvasElement.ownerDocument.fonts.ready;
  for (const element of canvasElement.querySelectorAll<HTMLElement>(
    "[data-slot^='preview-status'], [data-slot='edit-state-chip']",
  )) {
    await expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
    await expect(element.scrollHeight).toBeLessThanOrEqual(element.clientHeight + 1);
  }
  const button = within(canvasElement).getByRole("button");
  const rect = button.getBoundingClientRect();
  await expect(rect.width).toBeGreaterThanOrEqual(44);
  await expect(rect.height).toBeGreaterThanOrEqual(44);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  // Button uses rounded-md (8 px at the default root size). Bounding-box
  // corners inset by 1 px are outside that rounded hit area. Probe the center
  // and each straight edge instead, retaining the full 44 px size checks.
  const hitPoints = [
    [centerX, centerY],
    [rect.left + 1, centerY],
    [rect.right - 1, centerY],
    [centerX, rect.top + 1],
    [centerX, rect.bottom - 1],
  ];
  for (const [x, y] of hitPoints) {
    const hit = canvasElement.ownerDocument.elementFromPoint(x, y);
    await expect(
      hit === button || button.contains(hit),
      `Problems target at (${x}, ${y}) in rect (${rect.left}, ${rect.top}, ${rect.width}, ${rect.height}) hit ${hit?.outerHTML.slice(0, 240) ?? "null"}`,
    ).toBe(true);
  }
}

export const LongText: Story = {
  args: {
    display: "not-scheduled",
    displayLabel: "Für keine Anzeige eingeplant",
    editState: "unsaved",
    editStateLabel: "Noch nicht gespeicherte Änderungen",
    message:
      "Wird jetzt auf dem Bildschirm im gemeinschaftlichen Aufenthaltsraum angezeigt · BildschirmnameOhneTrennzeichen",
    problemsLabel: (count) => `${count} Probleme überprüfen`,
  },
  play: checkTextAndTargets,
};

export const LargeText: Story = {
  ...LongText,
  decorators: [
    function LargeTextDecorator(Story) {
      useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.fontSize;
        root.style.fontSize = "200%";
        return () => {
          root.style.fontSize = previous;
        };
      }, []);
      return <Story />;
    },
  ],
};

export const TouchTargets: Story = { play: checkTextAndTargets };
