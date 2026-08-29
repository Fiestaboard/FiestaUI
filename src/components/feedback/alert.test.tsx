import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "./alert";

/*
 * Alert's announcement politeness (#298).
 *
 * The defect was semantic, not visual: every variant carried `role="alert"`,
 * which implies `aria-live="assertive"` — the screen reader abandons whatever
 * it is reading to deliver the message. Right for an error, wrong for
 * "Your changes have been saved".
 *
 * jsdom cannot hear anything, so what is asserted here is the thing jsdom DOES
 * model and the thing the announcement is derived from: the role. That is also
 * the only place the politeness is spelled — no `aria-live` is set alongside
 * it, per the rule `empty-state-live-region.test.mjs` already enforces for the
 * sibling component, because a role that implies a politeness and an attribute
 * that states one are two spellings that can drift apart.
 */

function alert(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="alert"]');
  if (!el) throw new Error("no [data-slot=alert] rendered");
  return el;
}

describe("Alert", () => {
  it.each(["destructive", "warning"] as const)("interrupts for the %s variant", (variant) => {
    render(
      <Alert variant={variant}>
        <AlertTitle>Board offline</AlertTitle>
      </Alert>,
    );

    // role=alert is assertive. An error and a time-sensitive caution are the
    // two cases the ARIA practices reserve that for.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each(["default", "info", "success"] as const)("waits its turn for the %s variant", (variant) => {
    render(
      <Alert variant={variant}>
        <AlertTitle>Connected</AlertTitle>
        <AlertDescription>Your board is online and synced.</AlertDescription>
      </Alert>,
    );

    // role=status is polite: it queues behind the current utterance instead of
    // cutting a form read mid-field.
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is polite when no variant is given at all", () => {
    // The cva default is `default`, but the prop arrives as undefined and the
    // politeness is derived before cva sees it — so the undefined case needs
    // its own assertion, not an inference from the `default` one above.
    render(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
      </Alert>,
    );

    expect(alert()).toHaveAttribute("role", "status");
  });

  it("lets politeness override the variant in both directions", () => {
    const { unmount } = render(
      <Alert variant="destructive" politeness="polite">
        <AlertTitle>Last sync failed</AlertTitle>
      </Alert>,
    );
    // A destructive alert that has been on the page since load has nothing
    // urgent to say about right now.
    expect(alert()).toHaveAttribute("role", "status");
    unmount();

    render(
      <Alert variant="default" politeness="assertive">
        <AlertTitle>Save failed</AlertTitle>
      </Alert>,
    );
    expect(alert()).toHaveAttribute("role", "alert");
  });

  it("states the politeness once, in the role, and never as aria-live too", () => {
    render(
      <Alert variant="success">
        <AlertTitle>Connected</AlertTitle>
      </Alert>,
    );

    // role=status already implies polite + atomic. A redundant aria-live is a
    // second source of truth that a later edit can contradict.
    expect(alert()).not.toHaveAttribute("aria-live");
  });

  it("still lets a caller pass the raw attribute for semantics politeness cannot express", () => {
    // `politeness` is the ergonomic path, not a wall around the DOM: an
    // actionable error wants `alertdialog` with focus management, and page
    // furniture wants no live region at all. Both are attributes, and the
    // props spread has to keep letting them win.
    render(
      <Alert variant="destructive" role="alertdialog" aria-label="Board offline">
        <AlertTitle>Board offline</AlertTitle>
      </Alert>,
    );

    expect(screen.getByRole("alertdialog", { name: "Board offline" })).toBeInTheDocument();
  });

  it("keeps the title and description structure the role wraps", () => {
    render(
      <Alert variant="info">
        <AlertTitle>Scheduled update</AlertTitle>
        <AlertDescription>The board restarts tonight at 02:00.</AlertDescription>
      </Alert>,
    );

    // The whole alert is one atomic announcement, so both parts have to be
    // inside the region that carries the role.
    const region = screen.getByRole("status");
    expect(region).toContainElement(screen.getByText("Scheduled update"));
    expect(region).toContainElement(screen.getByText("The board restarts tonight at 02:00."));
  });
});
