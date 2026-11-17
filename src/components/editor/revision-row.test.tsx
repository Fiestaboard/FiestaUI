import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { RevisionRow } from "./revision-row";

const base = {
  thumbnail: <span>Board snapshot</span>,
  savedAt: "7:12 AM",
  author: "Saved on iPad",
  summary: "Row 12 formula added",
};
describe("RevisionRow", () => {
  it("labels overview metadata and current draft independently of the board thumbnail", () => {
    const { container, rerender } = render(<RevisionRow {...base} current dateTime="2026-11-17T07:12:00" />);
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Saved on iPad · Row 12 formula added")).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2026-11-17T07:12:00");
    expect(container.querySelector('[aria-current="true"]')).not.toBeNull();
    rerender(<RevisionRow {...base} status="live" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("keeps Compare and Restore independent and requests a new draft without submitting a form", async () => {
    const compare = vi.fn();
    const restore = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <RevisionRow {...base} onCompare={compare} onRestore={restore} />
      </form>,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Compare 7:12 AM" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(compare).toHaveBeenCalledOnce();
    expect(restore).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Restore 7:12 AM" }));
    expect(restore).toHaveBeenCalledWith({ kind: "new-draft" });
    expect(submit).not.toHaveBeenCalled();
  });
  it("blocks actions while disabled or restoring and preserves full localized text", async () => {
    const restore = vi.fn();
    const { rerender } = render(
      <RevisionRow
        {...base}
        disabled
        onRestore={restore}
        labels={{ restore: "Wiederherstellen", overview: "ÜBERSICHT" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Wiederherstellen 7:12 AM" })).toBeDisabled();
    rerender(<RevisionRow {...base} loading onRestore={restore} />);
    expect(screen.getByRole("button", { name: /Restoring/ })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: /Restoring/ }));
    expect(restore).not.toHaveBeenCalled();
  });
  it("composes as a real list item and follows updated revision metadata", () => {
    const { rerender } = render(
      <ListRowGroup>
        <RevisionRow {...base} />
      </ListRowGroup>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("7:12 AM");
    rerender(
      <ListRowGroup>
        <RevisionRow {...base} savedAt="Yesterday" author="Dev" summary={undefined} />
      </ListRowGroup>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Yesterday");
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.queryByText("7:12 AM")).not.toBeInTheDocument();
  });
});
