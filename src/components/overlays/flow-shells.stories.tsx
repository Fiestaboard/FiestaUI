import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { toast, Toaster } from "../feedback/toaster";
import { Button } from "../forms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./sheet";

const meta = {
  title: "Overlays/FlowShells",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** No simulated browser chrome; the host owns page content, navigation and responsive selection. */
function Page() {
  return <main className="fixed inset-0 bg-background p-6 text-foreground">Kitchen morning</main>;
}

export const WideDialog: Story = {
  render: () => (
    <>
      <Page />
      <Dialog defaultOpen>
        <DialogContent variant="wide">
          <DialogHeader>
            <DialogTitle>Discard changes to Kitchen morning?</DialogTitle>
            <DialogDescription>
              You changed 2 lines since 6:05 PM. The Kitchen board keeps showing the saved version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep editing</Button>
            </DialogClose>
            <Button variant="destructive">Discard changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog");
    await waitFor(() => expect(body.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    const width = canvasElement.ownerDocument.defaultView!.innerWidth;
    const layoutWidth = canvasElement.ownerDocument.documentElement.clientWidth;
    await waitFor(() =>
      expect(Math.abs(dialog.getBoundingClientRect().width - Math.min(560, layoutWidth - 32))).toBeLessThan(1),
    );
    await Promise.all(dialog.getAnimations().map((animation) => animation.finished.catch(() => {})));
    const title = body.getByRole("heading").getBoundingClientRect();
    const close = body.getByRole("button", { name: "Close" }).getBoundingClientRect();
    expect(title.right).toBeLessThanOrEqual(close.left);
    expect(close.width).toBe(40);
    const keep = body.getByRole("button", { name: "Keep editing" }).getBoundingClientRect();
    const discard = body.getByRole("button", { name: "Discard changes" }).getBoundingClientRect();
    if (width < 640) expect(discard.top).toBeGreaterThanOrEqual(keep.bottom);
    else expect(discard.left).toBeGreaterThanOrEqual(keep.right);
  },
};

export const ConfirmationSheet: Story = {
  render: () => (
    <>
      <Page />
      <Sheet defaultOpen>
        <SheetContent side="bottom" variant="confirmation">
          <SheetHeader>
            <SheetTitle>Discard changes to Kitchen morning?</SheetTitle>
            <SheetDescription>
              You changed 2 lines since 6:05 PM. The Kitchen board keeps showing the saved version.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose asChild>
              <Button size="touch" variant="outline">
                Keep editing
              </Button>
            </SheetClose>
            <Button size="touch" variant="destructive">
              Discard changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const keep = await body.findByRole("button", { name: "Keep editing" });
    await waitFor(() => expect(keep).toHaveFocus());
    const discard = body.getByRole("button", { name: "Discard changes" });
    await waitFor(() =>
      expect(discard.getBoundingClientRect().top).toBeGreaterThanOrEqual(keep.getBoundingClientRect().bottom),
    );
    expect(keep.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.tab();
    expect(discard).toHaveFocus();
    const popup = body.getByRole("dialog");
    expect(getComputedStyle(popup).paddingBottom).toBe("16px");
  },
};

export const MobileConfirmation: Story = {
  ...ConfirmationSheet,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const LongConfirmation: Story = {
  ...ConfirmationSheet,
  render: () => (
    <>
      <Page />
      <Sheet defaultOpen>
        <SheetContent side="bottom" variant="confirmation" labels={{ close: "Schließen" }}>
          <SheetHeader>
            <SheetTitle>Änderungen an der morgendlichen Anzeige für die Küche wirklich verwerfen?</SheetTitle>
            <SheetDescription>
              The saved page stays on the board. This longer title must leave the close control reachable.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose asChild>
              <Button size="touch" variant="outline">
                Keep editing
              </Button>
            </SheetClose>
            <Button size="touch" variant="destructive">
              Discard changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  ),
};

function Snackbar({ theme, mobile = false }: { theme: "light" | "dark"; mobile?: boolean }) {
  useEffect(() => {
    const id = toast.success("Saved to Pages", {
      description: "Kitchen morning is ready to show.",
      duration: Infinity,
      action: { label: "Show now", onClick: () => {} },
      cancel: { label: "Add to Schedule", onClick: () => {} },
    });
    return () => {
      toast.dismiss(id);
    };
  }, []);
  return (
    <>
      <Page />
      {mobile && (
        <div
          aria-hidden="true"
          data-testid="editor-toolbar"
          className="fixed inset-x-0 bottom-0 h-15 border-t bg-card"
        />
      )}
      <Toaster
        variant="snackbar"
        theme={theme}
        position={mobile ? "bottom-center" : "top-right"}
        duration={6000}
        closeButton
        labels={{ close: "Dismiss notification" }}
        offset={mobile ? { bottom: "calc(68px + env(safe-area-inset-bottom))" } : undefined}
        mobileOffset={mobile ? { bottom: "calc(68px + env(safe-area-inset-bottom))" } : undefined}
      />
    </>
  );
}

export const SnackbarDesktop: Story = {
  render: (_, context) => <Snackbar theme={context.globals.theme === "light" ? "light" : "dark"} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByText("Saved to Pages");
    const notification = canvasElement.ownerDocument.querySelector<HTMLElement>("[data-sonner-toast]")!;
    const width = canvasElement.ownerDocument.defaultView!.innerWidth;
    const layoutWidth = canvasElement.ownerDocument.documentElement.clientWidth;
    await waitFor(() =>
      expect(
        Math.abs(notification.getBoundingClientRect().width - (width <= 600 ? layoutWidth - 16 : 380)),
      ).toBeLessThan(1),
    );
    const show = body.getByRole("button", { name: "Show now" });
    const schedule = body.getByRole("button", { name: "Add to Schedule" });
    expect(show.compareDocumentPosition(schedule) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(show.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const close = body.getByRole("button", { name: "Dismiss notification" });
    await waitFor(() => {
      const closeBox = close.getBoundingClientRect();
      const toastBox = notification.getBoundingClientRect();
      expect(closeBox.width).toBe(20);
      expect(toastBox.right - closeBox.right).toBeGreaterThanOrEqual(11);
      expect(toastBox.right - closeBox.right).toBeLessThanOrEqual(14);
      expect(close.contains(canvasElement.ownerDocument.elementFromPoint(closeBox.left - 11, closeBox.top + 10))).toBe(
        true,
      );
      expect(close.contains(canvasElement.ownerDocument.elementFromPoint(closeBox.right + 11, closeBox.top + 10))).toBe(
        true,
      );
    });
  },
};

export const SnackbarAboveEditor: Story = {
  ...SnackbarDesktop,
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: (_, context) => <Snackbar theme={context.globals.theme === "light" ? "light" : "dark"} mobile />,
  play: async (context) => {
    await SnackbarDesktop.play!(context);
    const doc = context.canvasElement.ownerDocument;
    const toolbar = within(doc.body).getByTestId("editor-toolbar");
    const notification = doc.querySelector<HTMLElement>("[data-sonner-toast]")!;
    await waitFor(() =>
      expect(notification.getBoundingClientRect().bottom).toBeLessThanOrEqual(toolbar.getBoundingClientRect().top - 8),
    );
  },
};
