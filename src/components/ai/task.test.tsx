import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Task, TaskContent, TaskItem, TaskTrigger } from "./task";

describe("Task", () => {
  it("renders the steps as an ordered list under an expandable heading", () => {
    render(
      <Task>
        <TaskTrigger title="2 of 3 steps" />
        <TaskContent>
          <TaskItem status="done">Listed pages</TaskItem>
          <TaskItem status="running">Creating page</TaskItem>
          <TaskItem status="pending">Scheduling</TaskItem>
        </TaskContent>
      </Task>,
    );
    expect(screen.getByRole("button", { name: "2 of 3 steps" })).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("announces each step's status as text, not just a glyph", () => {
    render(
      <Task>
        <TaskTrigger title="Steps" />
        <TaskContent>
          <TaskItem status="error">Creating page</TaskItem>
        </TaskContent>
      </Task>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Failed: Creating page");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-status", "error");
  });

  it("takes translated status names from labels", () => {
    render(
      <Task labels={{ statuses: { running: "Läuft" } }}>
        <TaskTrigger title="Steps" />
        <TaskContent>
          <TaskItem status="running">Creating page</TaskItem>
        </TaskContent>
      </Task>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Läuft: Creating page");
  });
});
