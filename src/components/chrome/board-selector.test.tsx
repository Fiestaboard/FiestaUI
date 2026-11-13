import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "../overlays/tooltip";
import { type BoardOption, BoardSelector, type BoardSelectorLabels } from "./board-selector";

/*
 * `BoardOption.status` (#308) badges a board the app could not bring up. The
 * badge is a coloured dot, and colour is not a message (WCAG 1.4.1), so the
 * contract under test is the accessible one: the option — and the trigger,
 * when that board is the current one — is DESCRIBED by the caller's
 * `boardError` text, while the dot itself stays decorative so the option's
 * NAME is still just the board name. That is a shape the accessibility tree
 * models exactly and a screenshot cannot assert, which is why it lives here
 * rather than in VRT.
 */

const LABELS: BoardSelectorLabels = {
  boardSelector: "Select board",
  selectBoard: "Select a board",
  unnamedBoard: "Unnamed board",
  boardError: "Unavailable",
};

const BOARDS: BoardOption[] = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen", status: "error" },
];

function trigger() {
  return screen.getByRole("combobox", { name: "Select board" });
}

async function openList() {
  const user = userEvent.setup();
  await user.click(trigger());
  return within(await screen.findByRole("listbox"));
}

describe("BoardSelector status", () => {
  it("describes an errored board's option with the boardError text", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();

    expect(list.getByRole("option", { name: "Kitchen" })).toHaveAccessibleDescription("Unavailable");
  });

  it("keeps the status dot decorative so the option's name is still the board name", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();
    const option = list.getByRole("option", { name: "Kitchen" });
    const dot = option.querySelector('[data-slot="status-dot"]');

    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no status dot for a board without a status", async () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();
    const option = list.getByRole("option", { name: "Living Room" });

    expect(option.querySelector('[data-slot="status-dot"]')).toBeNull();
    expect(option).not.toHaveAttribute("aria-describedby");
  });

  it("describes the trigger with the boardError text while the errored board is selected", () => {
    render(<BoardSelector boards={BOARDS} value="kitchen" onChange={() => {}} labels={LABELS} />);

    expect(trigger()).toHaveAccessibleDescription("Unavailable");
  });

  it("leaves the trigger undescribed while a healthy board is selected", () => {
    render(<BoardSelector boards={BOARDS} value="living-room" onChange={() => {}} labels={LABELS} />);

    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });

  it("shows no dot and no description when no board carries a status", async () => {
    const healthy: BoardOption[] = [{ id: "living-room", name: "Living Room" }];
    render(<BoardSelector boards={healthy} value="living-room" onChange={() => {}} labels={LABELS} />);

    const list = await openList();

    expect(document.querySelector('[data-slot="status-dot"]')).toBeNull();
    expect(list.getByRole("option", { name: "Living Room" })).not.toHaveAttribute("aria-describedby");
    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });
});

/*
 * Hub identity (slice 1.4c, C12 / WEB-09). The selector names WHICH hub the
 * household is talking to (`host`) and whether it can reach it (`status`),
 * following the web 07a Display switcher (`302:2146`): Online, Remote and
 * Can't reach are always WORDS beside the dot or glyph, never colour alone.
 * The words are the app's (`labels.hubStatus`); a status whose words are
 * missing draws no indicator at all, so the colour can never stand alone.
 */
describe("BoardSelector hub line", () => {
  const HUB_LABELS: BoardSelectorLabels = {
    ...LABELS,
    hubStatus: { online: "Online", remote: "Remote", unreachable: "Can't reach" },
  };
  const HEALTHY: BoardOption[] = [{ id: "kitchen", name: "Kitchen board" }];

  function hubLine() {
    return document.querySelector<HTMLElement>('[data-slot="board-selector-hub"]');
  }

  it("renders nothing new without a host or status, so existing installs are unchanged", () => {
    render(<BoardSelector boards={HEALTHY} value="kitchen" onChange={() => {}} labels={HUB_LABELS} />);

    expect(hubLine()).toBeNull();
    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });

  it("reads host then state under the sidebar trigger", () => {
    render(
      <BoardSelector
        boards={HEALTHY}
        value="kitchen"
        onChange={() => {}}
        labels={HUB_LABELS}
        host="fiestapi.local"
        status="online"
      />,
    );

    expect(hubLine()).toHaveTextContent("fiestapi.local · Online");
    expect(hubLine()?.querySelector('[data-slot="status-dot"]')).toHaveAttribute("data-status", "success");
    expect(trigger()).toHaveAccessibleDescription("fiestapi.local · Online");
  });

  it.each([
    ["online", "success"],
    ["remote", "info"],
    ["unreachable", "danger"],
  ] as const)("maps %s to a %s dot", (status, dotStatus) => {
    render(
      <BoardSelector
        boards={HEALTHY}
        value="kitchen"
        onChange={() => {}}
        labels={HUB_LABELS}
        host="fiestapi.local"
        status={status}
      />,
    );

    expect(hubLine()?.querySelector('[data-slot="status-dot"]')).toHaveAttribute("data-status", dotStatus);
  });

  it("leads with the state in the mobile header pill, where the host truncates", () => {
    render(
      <BoardSelector
        boards={HEALTHY}
        value="kitchen"
        onChange={() => {}}
        labels={HUB_LABELS}
        host="fiestapi.example.net"
        status="remote"
        variant="mobileHeader"
      />,
    );

    expect(hubLine()).toHaveTextContent("Remote · fiestapi.example.net");
    expect(trigger()).toContainElement(hubLine());
    expect(trigger()).toHaveAccessibleDescription("Remote · fiestapi.example.net");
  });

  it("swaps the dot for a state glyph on the collapsed rail and keeps the words in the description", () => {
    render(
      <TooltipProvider>
        <BoardSelector
          boards={HEALTHY}
          value="kitchen"
          onChange={() => {}}
          labels={HUB_LABELS}
          host="fiestapi.local"
          status="unreachable"
          collapsed
        />
      </TooltipProvider>,
    );

    const glyph = document.querySelector('[data-slot="board-selector-hub-glyph"]');
    expect(glyph).toHaveAttribute("data-status", "unreachable");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector('[data-slot="status-dot"]')).toBeNull();
    expect(trigger()).toHaveAccessibleDescription("fiestapi.local · Can't reach");
  });

  it("names the hub in the collapsed tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <BoardSelector
          boards={HEALTHY}
          value="kitchen"
          onChange={() => {}}
          labels={HUB_LABELS}
          host="fiestapi.local"
          status="online"
          collapsed
        />
      </TooltipProvider>,
    );

    await user.hover(trigger());

    // The sr-only description carries the same words, so look for the
    // tooltip's own copy: the second match once the tooltip is open.
    await waitFor(() => expect(screen.getAllByText("fiestapi.local · Online")).toHaveLength(2));
  });

  it("draws no indicator for a status the app gave no words for", () => {
    render(
      <BoardSelector
        boards={HEALTHY}
        value="kitchen"
        onChange={() => {}}
        labels={LABELS}
        host="fiestapi.local"
        status="online"
      />,
    );

    expect(hubLine()).toHaveTextContent(/^fiestapi\.local$/);
    expect(document.querySelector('[data-slot="status-dot"]')).toBeNull();
  });

  it("draws no glyph on the collapsed rail for a status without words", () => {
    render(
      <TooltipProvider>
        <BoardSelector boards={HEALTHY} value="kitchen" onChange={() => {}} labels={LABELS} status="remote" collapsed />
      </TooltipProvider>,
    );

    expect(document.querySelector('[data-slot="board-selector-hub-glyph"]')).toBeNull();
    expect(hubLine()).toBeNull();
  });

  it("shows the state alone when there is no host", () => {
    render(
      <BoardSelector boards={HEALTHY} value="kitchen" onChange={() => {}} labels={HUB_LABELS} status="unreachable" />,
    );

    expect(hubLine()).toHaveTextContent(/^Can't reach$/);
  });

  it("describes the trigger with both the board error and the hub line", () => {
    render(
      <BoardSelector
        boards={BOARDS}
        value="kitchen"
        onChange={() => {}}
        labels={{ ...HUB_LABELS, boardError: "Unavailable" }}
        host="fiestapi.local"
        status="online"
      />,
    );

    expect(trigger()).toHaveAccessibleDescription("Unavailable fiestapi.local · Online");
  });
});

describe("BoardSelector hub glyph shapes (S7)", () => {
  it.each([
    ["online", "lucide-wifi"],
    ["remote", "lucide-globe"],
    ["unreachable", "lucide-wifi-off"],
  ] as const)("draws %s as %s", (status, iconClass) => {
    render(
      <TooltipProvider>
        <BoardSelector
          boards={[{ id: "kitchen", name: "Kitchen board" }]}
          value="kitchen"
          onChange={() => {}}
          labels={{ ...LABELS, hubStatus: { online: "Online", remote: "Remote", unreachable: "Can't reach" } }}
          status={status}
          collapsed
        />
      </TooltipProvider>,
    );
    const glyph = document.querySelector('[data-slot="board-selector-hub-glyph"]')!;
    expect(glyph.getAttribute("class")!.split(/\s+/)).toContain(iconClass);
  });
});
