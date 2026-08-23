import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { Kbd, useKbdPlatform } from "./kbd";

/*
 * Kbd's promises are structural and textual, which is exactly what jsdom can
 * see: the element it emits, the nesting a chord uses, the glyph each key
 * prints on each platform, and the hook's refusal to resolve the platform
 * during the first render (the hydration contract). The keycap's rim and fill
 * are VRT's problem — no stylesheet loads here.
 */

describe("Kbd", () => {
  it("renders a single <kbd> for a free-form key, with no nesting", () => {
    const { container } = render(<Kbd>Esc</Kbd>);

    const caps = container.querySelectorAll("kbd");
    expect(caps).toHaveLength(1);
    expect(caps[0]).toHaveTextContent("Esc");
    expect(caps[0]).toHaveAttribute("data-slot", "kbd");
  });

  it("renders a chord as one <kbd> per key, nested inside a wrapping <kbd>", () => {
    const { container } = render(<Kbd keys={["Mod", "K"]} />);

    // The spec's own shape for a chord: the outer element is the input, each
    // inner element is one key — so AT announces one unit, not two caps.
    const root = container.querySelector("[data-slot='kbd']");
    expect(root?.tagName).toBe("KBD");
    const keys = root!.querySelectorAll("[data-slot='kbd-key']");
    expect(keys).toHaveLength(2);
    expect([...keys].map((key) => key.textContent)).toEqual(["Ctrl", "K"]);
  });

  it("prints word spellings on the generic platform, which is the default", () => {
    render(<Kbd keys={["Mod", "Alt", "Shift", "Enter"]} data-testid="chord" />);

    // Words, not glyphs: this is what a Windows or Linux screen reader gets,
    // and it reads correctly with no sr-only markup to help it.
    expect(screen.getByTestId("chord")).toHaveTextContent("CtrlAltShiftEnter");
  });

  it("prints Apple glyphs when the caller says the platform is Apple", () => {
    render(<Kbd platform="apple" keys={["Mod", "Alt", "Shift", "Enter"]} data-testid="chord" />);

    expect(screen.getByTestId("chord")).toHaveTextContent("⌘⌥⇧⏎");
  });

  it("distinguishes Mod from Ctrl — only one of them follows the platform", () => {
    render(
      <>
        <Kbd platform="apple" keys={["Mod"]} data-testid="mod" />
        <Kbd platform="apple" keys={["Ctrl"]} data-testid="ctrl" />
      </>,
    );

    // "Mod" means "this platform's accelerator" (⌘ here); "Ctrl" means the
    // Control key, which on a Mac is a different key and a different glyph.
    expect(screen.getByTestId("mod")).toHaveTextContent("⌘");
    expect(screen.getByTestId("ctrl")).toHaveTextContent("⌃");
  });

  it("matches key names case-insensitively and passes unknown keys through verbatim", () => {
    render(<Kbd platform="apple" keys={["shift", "F5", "/"]} data-testid="chord" />);

    // The map never has to enumerate the alphabet: anything it does not know
    // is printed as written.
    expect(screen.getByTestId("chord")).toHaveTextContent("⇧F5/");
  });

  it("lets the caller name the whole chord, since it ships no copy of its own", () => {
    render(<Kbd platform="apple" keys={["Mod", "K"]} aria-label="Command K" />);

    // No `labels` prop and no baked-in English — the props spread onto the
    // <kbd>, so a consumer that wants a localized name just sets one.
    expect(screen.getByLabelText("Command K").tagName).toBe("KBD");
  });

  it("merges a caller className onto the cap rather than replacing it", () => {
    render(<Kbd className="absolute right-2" data-testid="cap" />);

    const cap = screen.getByTestId("cap");
    expect(cap).toHaveClass("absolute", "right-2");
    expect(cap).toHaveClass("bg-muted");
  });
});

describe("useKbdPlatform", () => {
  /**
   * jsdom defines `platform` and `userAgent` as prototype getters, so they
   * cannot be assigned. Shadow them with own properties and delete them
   * afterwards, which uncovers the originals.
   */
  function stubNavigator(platform: string, userAgent: string) {
    Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, "platform");
    Reflect.deleteProperty(navigator, "userAgent");
  });

  /** A chord that follows the machine, so the hook's value is readable as text. */
  function Hint() {
    return <Kbd platform={useKbdPlatform()} keys={["Mod"]} data-testid="hint" />;
  }

  it("resolves an Apple machine to the Apple spelling", () => {
    stubNavigator("MacIntel", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

    render(<Hint />);

    expect(screen.getByTestId("hint")).toHaveTextContent("⌘");
  });

  it("falls back to the user-agent string when the platform field is empty", () => {
    // Engines have started emptying the deprecated `navigator.platform`.
    stubNavigator("", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    render(<Hint />);

    expect(screen.getByTestId("hint")).toHaveTextContent("⌘");
  });

  it("leaves everything else generic", () => {
    stubNavigator("Win32", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    render(<Hint />);

    expect(screen.getByTestId("hint")).toHaveTextContent("Ctrl");
  });

  it("renders the generic spelling on the server, whatever the machine says", () => {
    stubNavigator("MacIntel", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

    const html = renderToString(<Hint />);

    // The hydration contract, asserted at the only place it can be: the
    // server pass. `useSyncExternalStore`'s server snapshot pins this to
    // "Ctrl", and React reuses that same snapshot for the hydrating client
    // render — so the two trees cannot disagree even on a Mac.
    expect(html).toContain("Ctrl");
    expect(html).not.toContain("⌘");
  });
});
