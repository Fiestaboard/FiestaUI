import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./badge";

/*
 * Badge's dismissible form (#249). The defect it removes is structural, so
 * that is what is asserted here:
 *
 *   * The badge stays CONTENT. It is not a button, and it does not gain a
 *     role — three FiestaBoard sites put an operable X *inside* a Badge,
 *     and #240 deliberately declined to document that shape because the
 *     20px overflow-hidden host clips both the 24px button and its focus
 *     ring (an outward box-shadow, erased entirely by an overflow-hidden
 *     ancestor).
 *   * Exactly one control appears, and it is the badge's own.
 *
 * The overflow classes ARE asserted here, against this package's usual rule
 * that class strings are VRT's business. Two reasons it earns the
 * exception: lifting `overflow-hidden` off the root IS the fix this issue
 * exists for, and the thing it unclips — a focus ring — is only painted
 * while focused, so a static screenshot diff is a poor guard for it.
 * Everything else about the geometry (py-1 for 26px) stays VRT's job.
 *
 * The last block is a COMPILE-time suite (#299). `dismissLabel` is the
 * dismiss button's only accessible name, and while it was optional the
 * unnamed call type-checked. Those cases cannot be asserted at runtime —
 * the point is that they never reach a runtime — so they are asserted with
 * `@ts-expect-error`, which `npm run typecheck` fails on if the error ever
 * stops being raised. Loosening the type back to two optional props breaks
 * the build, which is the whole objective.
 */

function badge(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="badge"]');
  if (!el) throw new Error("no [data-slot=badge] rendered");
  return el;
}

describe("Badge", () => {
  it("is not interactive on its own", () => {
    render(<Badge>Weather</Badge>);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders no dismiss control unless asked", () => {
    render(<Badge>Weather</Badge>);

    expect(document.querySelector('[data-slot="badge-dismiss"]')).toBeNull();
    // Unchanged badges must not gain a label wrapper either.
    expect(document.querySelector('[data-slot="badge-label"]')).toBeNull();
  });

  it("owns its dismiss button so the call site nests none", () => {
    render(
      <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    const badge = document.querySelector('[data-slot="badge"]') as HTMLElement;
    // The badge is still a span, not a button, and holds exactly one control.
    expect(badge.tagName).toBe("SPAN");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("names the dismiss button from dismissLabel, not from the glyph", () => {
    render(
      <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    expect(screen.getByRole("button", { name: "Remove Weather" })).toBeInTheDocument();
  });

  it("fires onDismiss when the button is pressed", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <Badge onDismiss={onDismiss} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    await user.click(screen.getByRole("button", { name: "Remove Weather" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is reachable and operable by keyboard", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <Badge onDismiss={onDismiss} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Remove Weather" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onDismiss).toHaveBeenCalled();
  });

  it("lifts overflow off the root so the button and its focus ring survive", () => {
    // `.focus-ring` draws an outward box-shadow, which an overflow-hidden
    // ancestor erases entirely — the defect #240 removed, reintroduced one
    // level up. This is the assertion that fails if the root keeps clipping.
    render(
      <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    expect(badge().className).toContain("overflow-visible");
    // The clipping moves to the label, so long tag text still stays in the
    // pill — the reason overflow-hidden was on the root to begin with.
    expect(document.querySelector('[data-slot="badge-label"]')?.className).toContain("overflow-hidden");
  });

  it("keeps a plain badge clipping exactly as before", () => {
    render(<Badge>Weather</Badge>);

    expect(badge().className).toContain("overflow-hidden");
    expect(badge().className).not.toContain("overflow-visible");
  });

  it("keeps the label readable beside the button", () => {
    render(
      <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    expect(document.querySelector('[data-slot="badge-label"]')).toHaveTextContent("Weather");
  });

  it("declines to inject a button under asChild, which owns its element", () => {
    // asChild hands the rendered element to the caller; there is nowhere to
    // put the button, so the badge must not silently drop the caller's tree.
    render(
      <Badge asChild onDismiss={vi.fn()} dismissLabel="Remove">
        <a href="#weather">Weather</a>
      </Badge>,
    );

    expect(screen.getByRole("link", { name: "Weather" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    // And it must not take the dismissible geometry either: there is no
    // button in it, so widening the pill for one would just be wrong.
    expect(screen.getByRole("link").className).not.toContain("overflow-visible");
  });

  it('never renders a dismiss button that a screen reader hears as bare "button"', () => {
    // The runtime half of #299. The type is what makes the nameless call
    // impossible, but this pins the invariant the type exists to protect, so
    // it survives a refactor that moves the name somewhere else.
    render(
      <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
        Weather
      </Badge>,
    );

    // The full name computation, not a role query: what matters is that the
    // button's name is the LABEL and nothing else has leaked into it. The X
    // contributes nothing (it is aria-hidden), and the badge's own text is
    // outside the button, so `dismissLabel` really is the whole name — which
    // is why the type may not let it be absent.
    expect(screen.getByRole("button")).toHaveAccessibleName("Remove Weather");
  });
});

/*
 * The type contract (#299). Nothing here runs — `tsc --noEmit` is the
 * assertion, and every `@ts-expect-error` below fails the build if the error
 * it expects stops being reported.
 */
describe("Badge props type", () => {
  it("makes the unnamed dismiss button unrepresentable", () => {
    const valid = (
      <>
        {/* Both, or neither. Those are the only two shapes. */}
        <Badge onDismiss={vi.fn()} dismissLabel="Remove Weather">
          Weather
        </Badge>
        <Badge>Weather</Badge>
      </>
    );

    const invalid = (
      <>
        {/* @ts-expect-error dismissLabel is required alongside onDismiss (#299) */}
        <Badge onDismiss={vi.fn()}>Weather</Badge>
        {/* @ts-expect-error a label with no button to name is a typo, not a no-op (#299) */}
        <Badge dismissLabel="Remove Weather">Weather</Badge>
        {/* @ts-expect-error an explicit undefined is a nameless button spelled differently */}
        <Badge onDismiss={vi.fn()} dismissLabel={undefined}>
          Weather
        </Badge>
      </>
    );

    expect(valid).toBeTruthy();
    expect(invalid).toBeTruthy();
  });
});
