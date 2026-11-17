import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PreviewStatus } from "./preview-status";

describe("PreviewStatus", () => {
  it.each([
    ["live", "Live"],
    ["scheduled", "Scheduled"],
    ["not-scheduled", "Not scheduled"],
  ] as const)("announces %s and its message without creating a control", (display, label) => {
    render(<PreviewStatus display={display} message="Showing on Den TV now" />);
    const status = screen.getByRole("status");
    expect(within(status).getByText(label)).toBeInTheDocument();
    expect(within(status).getByText("Showing on Den TV now")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["unsaved", "draft", "testing", "saved"] as const)(
    "keeps a live display independent of %s edits",
    (editState) => {
      render(<PreviewStatus display="live" message="Showing the saved revision" editState={editState} />);
      expect(within(screen.getByRole("status")).getByText("Live")).toBeInTheDocument();
      expect(screen.getByText(editState[0].toUpperCase() + editState.slice(1))).toHaveAttribute(
        "data-edit-state",
        editState,
      );
    },
  );

  it("changes display and optional edit state only when the host changes them", () => {
    const { rerender } = render(<PreviewStatus display="scheduled" editState="draft" message="Starts tomorrow" />);
    rerender(<PreviewStatus display="live" message="Showing now" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Showing now")).toBeInTheDocument();
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Scheduled")).not.toBeInTheDocument();
  });

  it.each([
    [0, "No problems"],
    [1, "1 problem"],
    [2, "2 problems"],
    [-1, "No problems"],
    [Number.NaN, "No problems"],
    [Number.POSITIVE_INFINITY, "No problems"],
    [2.9, "2 problems"],
  ])("names the Problems action for count %s", (problems, name) => {
    render(<PreviewStatus display="live" message="Showing now" problems={problems} onOpenProblems={() => {}} />);
    const action = screen.getByRole("button", { name });
    expect(action).toHaveAttribute("type", "button");
    expect(screen.getByRole("status")).not.toContainElement(action);
  });

  it("shows the zero-problem context without a warning arrow while keeping Problems reachable", async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    render(
      <PreviewStatus
        display="not-scheduled"
        editState="testing"
        message="Tomorrow 7 AM · Sample data"
        problems={0}
        onOpenProblems={opened}
      />,
    );
    await user.click(screen.getByRole("button", { name: "No problems" }));
    expect(opened).toHaveBeenCalledOnce();
    expect(screen.queryByText("›")).not.toBeInTheDocument();
  });

  it("translates both statuses and the Problems action and accepts saved-time copy", () => {
    render(
      <PreviewStatus
        display="live"
        displayLabel="En direct"
        editState="saved"
        editStateLabel="Enregistré à 18:05"
        message="Affichage dans le salon"
        problems={2}
        onOpenProblems={() => {}}
        problemsLabel={(count) => `${count} erreurs`}
      />,
    );
    expect(screen.getByText("En direct")).toBeInTheDocument();
    expect(screen.getByText("Enregistré à 18:05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 erreurs" })).toBeInTheDocument();
  });

  it("opens Problems by click, Enter and Space without submitting the enclosing form", async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    const submitted = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submitted}>
        <PreviewStatus display="not-scheduled" message="Not showing" problems={1} onOpenProblems={opened} />
      </form>,
    );
    const action = screen.getByRole("button", { name: "1 problem" });
    await user.click(action);
    expect(opened).toHaveBeenCalledTimes(1);
    await user.keyboard("{Enter}");
    expect(opened).toHaveBeenCalledTimes(2);
    await user.keyboard(" ");
    expect(opened).toHaveBeenCalledTimes(3);
    expect(submitted).not.toHaveBeenCalled();
  });

  it("does not open disabled Problems and lets keyboard focus move onward", async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    render(
      <>
        <PreviewStatus display="live" message="Showing now" problems={2} onOpenProblems={opened} problemsDisabled />
        <button>Next</button>
      </>,
    );
    const action = screen.getByRole("button", { name: "2 problems" });
    expect(action).toBeDisabled();
    fireEvent.click(action);
    await user.tab();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(opened).not.toHaveBeenCalled();
  });

  it("points toward a docked console while keeping the arrow out of the name", () => {
    render(
      <PreviewStatus
        display="live"
        message="Showing now"
        problems={2}
        onOpenProblems={() => {}}
        problemsDirection="down"
        size="touch"
      />,
    );
    expect(screen.getByRole("button", { name: "2 problems" })).toContainElement(screen.getByText("↓"));
    expect(screen.getByText("↓")).toHaveAttribute("aria-hidden", "true");
  });
});
