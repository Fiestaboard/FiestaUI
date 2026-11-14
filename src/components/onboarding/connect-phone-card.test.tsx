import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cardGroundClassName } from "../containment/card";
import { ConnectPhoneCard, isLoopbackHost } from "./connect-phone-card";

/*
 * ConnectPhoneCard (slice 1.10b; 07e `323:16724` live, `323:18641` localhost,
 * `323:22216` expired, `324:21027` phone; 08 W3 `59:67855`; H11, H18).
 */

const QR = <svg data-testid="qr" viewBox="0 0 10 10" />;
const STEPS = [
  { text: "Open the FiestaBoard app on your phone." },
  { text: "Tap Connect a hub, then Scan QR code." },
  { text: "Point the camera at this code and tap Connect to Maya’s FiestaPi." },
];

function card(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="connect-phone-card"]');
  if (!el) throw new Error("no [data-slot=connect-phone-card] rendered");
  return el;
}

afterEach(() => vi.restoreAllMocks());

describe("isLoopbackHost", () => {
  // The #398 review's 40-input probe (M1), plus the original rows.
  const LOOPBACK = [
    "::1",
    "[::1]",
    "[::1]:8080",
    "http://[::1]:8080/",
    "::ffff:127.0.0.1",
    "[::ffff:127.0.0.1]",
    "http://[::ffff:127.0.0.1]/",
    "0:0:0:0:0:0:0:1",
    "[0:0:0:0:0:0:0:1]:80",
    "::",
    "[::]",
    "http://[::]/",
    "127.0.0.1",
    "127.255.255.254",
    "127.1",
    "http://127.1/",
    "2130706433",
    "http://2130706433/",
    "0x7f.0.0.1",
    "127.0.0.1.",
    "localhost",
    "LOCALHOST",
    "LocalHost:8123",
    "localhost.",
    "localhost.:8000",
    "http://localhost./",
    "foo.localhost",
    "FOO.LOCALHOST.",
    "localhost/",
    "0.0.0.0",
    "0.0.0.0:8000",
    "http://0/",
    "::ffff:7f00:1",
    // Earlier rows.
    "LOCALHOST:4420",
    "app.localhost",
    "127.1.2.3:4420",
    "http://localhost:4420/settings",
    "https://127.0.0.1",
  ];
  const REACHABLE = [
    "fiestapi.local",
    "192.168.1.20:8000",
    "http://fiestapi.local:8000/",
    "notlocalhost",
    "localhost.example.com",
    "127.0.0.1.nip.io",
    "fe80::1",
    // Earlier rows.
    "192.168.1.50:4420",
    "fiestapi.example.net",
    "http://[not a host",
    "",
  ];

  it.each(LOOPBACK)("treats %s as loopback", (host) => {
    expect(isLoopbackHost(host)).toBe(true);
  });

  it.each(REACHABLE)("treats %s as reachable", (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
});

describe("ConnectPhoneCard", () => {
  it("live: shows the QR as a named image, the hub line, the countdown and the bar", () => {
    render(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="Pairing code for fiestapi.local"
        hubAddress="fiestapi.local"
        expiresLabel="Expires in 4:12 · works once"
        timeLeft={0.84}
        steps={STEPS}
      />,
    );
    expect(card()).toHaveAttribute("data-state", "live");
    const img = screen.getByRole("img", { name: "Pairing code for fiestapi.local" });
    expect(img).toContainElement(screen.getByTestId("qr"));
    expect(screen.getByText("Connects to fiestapi.local")).toBeInTheDocument();
    expect(screen.getByText("Expires in 4:12 · works once")).toBeInTheDocument();
    const bar = card().querySelector<HTMLElement>('[data-slot="connect-phone-time-left"]');
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.firstElementChild).toHaveStyle({ width: "84%" });
  });

  it("clamps the time-left bar to 0–100%", () => {
    const { rerender } = render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" timeLeft={1.7} />);
    const fill = () => card().querySelector<HTMLElement>('[data-slot="connect-phone-time-left"]')?.firstElementChild;
    expect(fill()).toHaveStyle({ width: "100%" });
    rerender(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" timeLeft={-1} />);
    expect(fill()).toHaveStyle({ width: "0%" });
  });

  it("omits the countdown and bar when not given", () => {
    render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" />);
    expect(card().querySelector('[data-slot="connect-phone-countdown"]')).toBeNull();
    expect(card().querySelector('[data-slot="connect-phone-time-left"]')).toBeNull();
  });

  it("renders the steps as a plain numbered list", () => {
    render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" steps={STEPS} />);
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("data-appearance", "plain");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("an aside replaces the steps", () => {
    render(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="QR"
        hubAddress="fiestapi.local"
        steps={STEPS}
        aside={<p>Address in this code</p>}
      />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText("Address in this code")).toBeInTheDocument();
  });

  it("renders the notice above and the footnote below", () => {
    render(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="QR"
        hubAddress="fiestapi.local"
        notice={<div data-testid="notice">Use the address of your hub</div>}
        footnote="Only show it to a phone you own."
      />,
    );
    const notice = screen.getByTestId("notice");
    const foot = screen.getByText("Only show it to a phone you own.");
    expect(notice.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card().firstElementChild).toContainElement(notice);
  });

  it("hubLabel overrides the default hub line", () => {
    render(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="QR"
        hubAddress="fiestapi.local"
        hubLabel="Connects to fiestapi.local (not localhost)"
      />,
    );
    expect(screen.getByText("Connects to fiestapi.local (not localhost)")).toBeInTheDocument();
  });

  it("expired: the QR is dimmed and hidden, with no countdown or bar", () => {
    render(
      <ConnectPhoneCard
        state="expired"
        qr={QR}
        qrLabel="QR"
        hubAddress="fiestapi.local"
        expiresLabel="Expires in 0:00"
        timeLeft={0}
      />,
    );
    expect(card()).toHaveAttribute("data-state", "expired");
    expect(screen.queryByRole("img")).toBeNull();
    const slot = card().querySelector<HTMLElement>('[data-slot="connect-phone-qr"]');
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot?.className).toContain("opacity-12");
    expect(card().querySelector('[data-slot="connect-phone-countdown"]')).toBeNull();
    expect(card().querySelector('[data-slot="connect-phone-time-left"]')).toBeNull();
  });

  it("refuses to draw a QR for a loopback hub (H18): no image, no countdown, no bar", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="Pairing code for localhost:4420"
        hubAddress="localhost:4420"
        expiresLabel="Expires in 4:12 · works once"
        timeLeft={0.84}
      />,
    );
    expect(screen.queryByTestId("qr")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(card()).toHaveAttribute("data-refused", "loopback");
    expect(card()).toHaveAttribute("data-state", "live");
    expect(card().querySelector('[data-slot="connect-phone-qr"]')).toHaveAttribute("aria-hidden", "true");
    expect(card().querySelector('[data-slot="connect-phone-countdown"]')).toBeNull();
    expect(card().querySelector('[data-slot="connect-phone-time-left"]')).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("loopback"));
  });

  it("a refused card explains the refusal instead of claiming to connect", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="localhost:4420" hubLabel="Connects to localhost:4420" />,
    );
    const hub = () => card().querySelector('[data-slot="connect-phone-hub"]');
    expect(hub()).toHaveTextContent("No code: a phone can’t reach localhost:4420");
    expect(screen.queryByText(/Connects to/)).toBeNull();
    rerender(
      <ConnectPhoneCard
        qr={QR}
        qrLabel="QR"
        hubAddress="localhost:4420"
        refusedLabel="Use your hub’s network address"
      />,
    );
    expect(hub()).toHaveTextContent("Use your hub’s network address");
  });

  it("draws no bar for a non-finite timeLeft", () => {
    render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" timeLeft={Number.NaN} />);
    expect(card().querySelector('[data-slot="connect-phone-time-left"]')).toBeNull();
  });

  it("draws the QR panel on the flat card ground", () => {
    render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" />);
    const panel = card().querySelector('[data-slot="connect-phone-qr-panel"]');
    for (const c of cardGroundClassName.split(" ")) expect(panel).toHaveClass(c);
  });

  it("forwards className and props", () => {
    render(<ConnectPhoneCard qr={QR} qrLabel="QR" hubAddress="fiestapi.local" className="mt-2" id="pair" />);
    expect(card()).toHaveAttribute("id", "pair");
    expect(card().className).toContain("mt-2");
  });
});
