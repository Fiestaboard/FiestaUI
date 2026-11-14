import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cardGroundClassName } from "../containment/card";
import { PrivacyNote } from "./privacy-note";

/*
 * PrivacyNote (slice 1.10a; 05 `36:6336`, 08 P4 `61:43307`).
 */

const TITLE = "Your data stays on your network";
const BODY = "This app talks straight to your FiestaBoard hub over Wi-Fi.";

function note(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="privacy-note"]');
  if (!el) throw new Error("no [data-slot=privacy-note] rendered");
  return el;
}

describe("PrivacyNote", () => {
  it("is static prose: no role, no live region", () => {
    render(<PrivacyNote title={TITLE}>{BODY}</PrivacyNote>);
    expect(note()).not.toHaveAttribute("role");
    expect(note()).not.toHaveAttribute("aria-live");
    expect(note().querySelector("[role],[aria-live]")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reads title then body in document order", () => {
    render(<PrivacyNote title={TITLE}>{BODY}</PrivacyNote>);
    expect(note().textContent).toBe(`${TITLE}${BODY}`);
    expect(note().querySelector('[data-slot="privacy-note-title"]')).toHaveTextContent(TITLE);
    expect(note().querySelector('[data-slot="privacy-note-body"]')).toHaveTextContent(BODY);
  });

  it("draws the shield glyph hidden from assistive tech", () => {
    render(<PrivacyNote title={TITLE}>{BODY}</PrivacyNote>);
    const icon = note().querySelector<HTMLElement>('[data-slot="privacy-note-icon"]');
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.tagName.toLowerCase()).toBe("svg");
    // The one colour the note owns: 05's hue green (--success = --hue-green).
    expect(icon).toHaveClass("text-success");
  });

  it("omits the title row when no title is given", () => {
    render(<PrivacyNote>{BODY}</PrivacyNote>);
    expect(note().querySelector('[data-slot="privacy-note-title"]')).toBeNull();
    expect(note().textContent).toBe(BODY);
  });

  it("forwards className and props", () => {
    render(
      <PrivacyNote title={TITLE} className="mt-4" id="privacy">
        {BODY}
      </PrivacyNote>,
    );
    expect(note()).toHaveAttribute("id", "privacy");
    expect(note().className).toContain("mt-4");
    expect(note().className).toContain("bg-card");
    expect(note().className).not.toContain("shadow-card");
    for (const c of cardGroundClassName.split(" ")) expect(note()).toHaveClass(c);
  });
});
