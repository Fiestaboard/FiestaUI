import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FIESTA_LOGO_WORDMARK_SELECTOR, FiestaLogo } from "./fiesta-logo";

/*
 * BB-C-25. The wordmark is a logotype (WCAG 1.4.3 exempts it from contrast),
 * but it rendered as two loose text spans, so to assistive tech and to axe it
 * was just body text: "Fiesta" "Board", failing color-contrast at 2.45-3.1:1
 * on light surfaces. It is now ONE named image, and the exemption is a
 * published selector so consumers exclude exactly the wordmark and nothing
 * else.
 */
describe("FiestaLogo", () => {
  it("is a single image named FiestaBoard, with the lockup text hidden from AT", () => {
    render(<FiestaLogo />);
    const logo = screen.getByRole("img", { name: "FiestaBoard" });

    expect(logo).toHaveTextContent("FiestaBoard");
    for (const part of logo.children) expect(part).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("Fiesta")).toBeInTheDocument();
  });

  it("never renders a nameless image", () => {
    render(<FiestaLogo label="" />);

    expect(screen.getByRole("img", { name: "FiestaBoard" })).toBeInTheDocument();
  });

  it("takes a localized name", () => {
    render(<FiestaLogo label="FiestaBoard Startseite" />);

    expect(screen.getByRole("img", { name: "FiestaBoard Startseite" })).toBeInTheDocument();
  });

  it("publishes the one selector a contrast audit may exempt, and it matches only the wordmark", () => {
    const { container } = render(<FiestaLogo size="sm" />);
    const matches = container.querySelectorAll(FIESTA_LOGO_WORDMARK_SELECTOR);

    expect(FIESTA_LOGO_WORDMARK_SELECTOR).toBe(".logo-fiesta-text");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toHaveTextContent(/^Fiesta$/);
  });
});
