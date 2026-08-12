import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef, useState } from "react";

import { AVAILABLE_COLORS, BOARD_COLORS, COLOR_DISPLAY } from "../../lib/board-colors";
import { tileScaleRows, verifyTileScale } from "../../lib/board-metrics";
import { BoardDisplay, deriveFlapTiming, FLAP_SPEED_PRESETS, type FlapSpeedPreset } from "./board-display";

// Most stories here render wider than a 390px phone and are meant to.
// BoardDisplay is the unscaled primitive: its width is
// `cols x (tile + gutter) + bezel padding`, which for a 22-column board floors
// at 379px (`sm`) / 393px (`md`) against the ~326px content box a 390px phone
// leaves, and the tile scale deliberately has no breakpoint step below `base`
// (issue #176). No width class on a story can change that, and wrapping these
// in a scroll container would hide the primitive's constraint behind story
// chrome rather than document it. The design system's answer for a slot
// narrower than a board is `ScaledBoardDisplay`, which scales the whole board
// down without touching tile proportions — see its `PhoneWidth` story, which
// fits a full 6x22 board into a 311px box (issue #192).
const meta = {
  title: "Board/BoardDisplay",
  component: BoardDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description: "Board message; lines split on \\n, colors via {red}…{/red} or {63} markers",
    },
    isLoading: {
      control: "boolean",
      description: "Loading state — all tiles cycle through the character set continuously",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant of the display",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white). White hardware swaps the white/black tiles.",
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Board hardware family (6×22 flagship, 3×15 Note, or W×H Note array)",
    },
    notesWide: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes wide (note_array only)",
    },
    notesTall: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes tall (note_array only)",
    },
    isStatic: {
      control: "boolean",
      description: "Render the cheap static path (no animation infrastructure per tile)",
    },
    animationsEnabled: {
      control: "boolean",
      description:
        "Run the split-flap animation; when false tiles snap to their targets. prefers-reduced-motion: reduce forces the same behaviour regardless.",
    },
    flapSpeed: {
      control: "select",
      options: Object.keys(FLAP_SPEED_PRESETS),
      description:
        "Milliseconds per character step, as a named cadence. `standard` (80ms) is the default; `hardware` is the device's own ~16ms. Pass `{ durationMs }` for anything else.",
    },
    emitCellMetadata: {
      control: "boolean",
      description: "Emit data-row/data-col/data-cell-value per tile (draw-mode hit-testing hook)",
    },
    loadingLabel: {
      control: "text",
      description: "Accessible label while loading",
    },
    emptyLabel: {
      control: "text",
      description: "Accessible label when the board is empty",
    },
    messageLabel: {
      control: false,
      description: "Builds the accessible label for a shown message",
    },
    announceUpdates: {
      control: "boolean",
      description:
        "Announce message changes through a polite, visually hidden live region. Off by default — a changed aria-label is silent to screen readers, but announcing is only correct for a genuinely live board, not for an editor preview that changes on every keystroke (issue #206).",
    },
    className: {
      control: "text",
      description: "Additional CSS classes on the board bezel",
    },
  },
} satisfies Meta<typeof BoardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample messages for different scenarios
const simpleMessage = "HELLO WORLD\nWELCOME TO\nFIESTABOARD";

const coloredMessage = `{red}BRUSH YOUR TEETH!{/red}
{blue}RISE AND SHINE{/blue}
{green}MAKE YOUR BED{/green}
{orange}EAT BREAKFAST{/orange}
{yellow}FLOSS TOO!{/yellow}`;

const weatherMessage = `MONDAY DEC 30
NEW YORK CITY
{blue}52{/blue}°F {yellow}62{/yellow}°F CLOUDY
BUS 33 - 12 MIN
NEXT MEETING 2PM`;

const transitMessage = `{67}{67}{67} TRANSIT {67}{67}{67}
LINE 1 - 5 MIN
LINE 33 - 12 MIN
{64}{64} TRAFFIC {64}{64}
HOME TO WORK 25M`;

const multiColorBar = `{63}{63}{64}{64}{65}{65}{66}{66}{67}{67}{68}{68}
{red}RED{/red} {orange}ORANGE{/orange} {yellow}YELLOW{/yellow}
{green}GREEN{/green} {blue}BLUE{/blue} {violet}VIOLET{/violet}
COLOR PALETTE TEST`;

export const Default: Story = {
  args: {
    message: simpleMessage,
    size: "md",
    isLoading: false,
  },
  // Regression guard for issue #200, asserted in a real layout because it is a
  // layout bug: the bezel used to carry `max-w-full`, which clamped the frame
  // to a too-narrow parent while its fixed-width tiles kept going, so the rows
  // — `justify-center` — spilled past both edges of their own frame.
  //
  // No story renders in a parent narrow enough to trigger it (that is why VRT
  // never caught it), so the guard makes one: it narrows the story's own
  // container to half the board's natural width, measures, and puts the width
  // straight back. Every read between those two writes is a synchronous forced
  // layout with no `await` in between, so the clamped state is never painted
  // and a VRT screenshot cannot land inside it.
  //
  // Runs in CI via the storybook test-runner (the a11y-tests job), the only CI
  // job with a browser.
  play: async ({ canvasElement }) => {
    const settle = async <T,>(read: () => T | null | undefined): Promise<T> => {
      for (let i = 0; i < 60; i++) {
        const value = read();
        if (value) return value;
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      throw new Error("timed out waiting for the board to render");
    };

    const bezel = await settle(() => canvasElement.querySelector<HTMLElement>('[data-slot="board-display"]'));
    const tiles = Array.from(bezel.querySelectorAll<HTMLElement>("[data-note-tile]"));
    if (tiles.length === 0) throw new Error("expected the board to render tiles to measure against its bezel");

    // The preview decorator's <main>. `#storybook-root` is a shrink-to-fit flex
    // item (#191), so it is sized *by* the board — clamping a block-level
    // ancestor is what actually gives the board less room than it wants.
    const slot = bezel.closest("main") ?? canvasElement;
    const naturalWidth = bezel.getBoundingClientRect().width;

    const previousWidth = slot.style.width;
    const previousMinWidth = slot.style.minWidth;
    slot.style.width = `${Math.round(naturalWidth / 2)}px`;
    slot.style.minWidth = "0";

    const slotWidth = slot.getBoundingClientRect().width;
    const frame = bezel.getBoundingClientRect();
    const rects = tiles.map((tile) => tile.getBoundingClientRect());
    const tilesLeft = Math.min(...rects.map((r) => r.left));
    const tilesRight = Math.max(...rects.map((r) => r.right));

    slot.style.width = previousWidth;
    slot.style.minWidth = previousMinWidth;

    if (slotWidth >= naturalWidth) {
      throw new Error(
        `this guard needs a slot narrower than the board; got slot ${slotWidth.toFixed(1)}px for a ` +
          `${naturalWidth.toFixed(1)}px board`,
      );
    }

    // 0.5px of slack for subpixel layout only — the failure this catches is
    // hundreds of pixels wide.
    const escapedBy = Math.max(frame.left - tilesLeft, tilesRight - frame.right);
    if (escapedBy > 0.5) {
      throw new Error(
        `in a ${slotWidth.toFixed(1)}px slot the board's tiles sit ${escapedBy.toFixed(1)}px outside its own ` +
          `${frame.width.toFixed(1)}px bezel — the frame is clamping to the parent while the tiles are not, so ` +
          "the board mis-frames instead of overflowing (issue #200)",
      );
    }
  },
};

export const Loading: Story = {
  args: {
    message: null,
    size: "md",
    isLoading: true,
  },
};

export const WithColors: Story = {
  args: {
    message: coloredMessage,
    size: "md",
    isLoading: false,
  },
};

export const WeatherDisplay: Story = {
  args: {
    message: weatherMessage,
    size: "md",
    isLoading: false,
  },
};

export const TransitDisplay: Story = {
  args: {
    message: transitMessage,
    size: "md",
    isLoading: false,
  },
};

export const ColorPalette: Story = {
  args: {
    message: multiColorBar,
    size: "md",
    isLoading: false,
  },
};

export const SmallSize: Story = {
  args: {
    message: simpleMessage,
    size: "sm",
    isLoading: false,
  },
};

export const LargeSize: Story = {
  args: {
    message: simpleMessage,
    size: "lg",
    isLoading: false,
  },
};

export const WhiteBoard: Story = {
  args: {
    message: simpleMessage,
    size: "md",
    isLoading: false,
    boardType: "white",
  },
};

export const WhiteBoardWithColors: Story = {
  args: {
    message: coloredMessage,
    size: "md",
    isLoading: false,
    boardType: "white",
  },
};

export const NoteDevice: Story = {
  args: {
    message: "GOOD MORNING\n{red}HAVE A GREAT{/red}\nDAY °",
    size: "md",
    isLoading: false,
    deviceType: "note",
  },
};

export const NoteArray: Story = {
  args: {
    message:
      "LEFT NOTE HERE AND THE RIGHT NOTE\n{green}SEAMS SHOW THE{/green} PHYSICAL BOUNDARY\nBETWEEN THE TWO STACKED NOTES OK",
    size: "md",
    isLoading: false,
    deviceType: "note_array",
    notesWide: 2,
    notesTall: 1,
  },
};

export const EmptyMessage: Story = {
  args: {
    message: "",
    size: "md",
    isLoading: false,
  },
};

export const NullMessage: Story = {
  args: {
    message: null,
    size: "md",
    isLoading: false,
  },
};

export const LongText: Story = {
  args: {
    message: "THIS IS A VERY LONG LINE THAT WILL BE TRUNCATED\nSECOND LINE HERE\nTHIRD LINE\nFOURTH\nFIFTH\nSIXTH LINE",
    size: "md",
    isLoading: false,
  },
};

export const AnimationsDisabled: Story = {
  args: {
    message: simpleMessage,
    size: "md",
    isLoading: true,
    animationsEnabled: false,
  },
};

/** The full args surface with controls — poke every prop from the panel. */
export const Playground: Story = {
  args: {
    message: weatherMessage,
    isLoading: false,
    size: "md",
    boardType: "black",
    deviceType: "flagship",
    notesWide: 1,
    notesTall: 1,
    isStatic: false,
    animationsEnabled: true,
    emitCellMetadata: false,
    loadingLabel: "Loading board display",
    emptyLabel: "Empty board display",
    announceUpdates: false,
  },
};

/**
 * The Vestaboard color-chip palette next to the same colors rendered as
 * board tiles. Chip hexes come from BOARD_COLORS, which mirrors the
 * `--color-board-*` tokens in theme.css (the utility classes in
 * COLOR_DISPLAY resolve through those tokens).
 */
export const Colors = () => (
  <div className="flex flex-col items-center gap-8">
    <dl className="grid grid-cols-4 gap-x-6 gap-y-4 sm:grid-cols-8">
      {AVAILABLE_COLORS.map((name, i) => (
        <div key={name} className="flex flex-col items-center gap-1.5">
          <div aria-hidden="true" className={`h-10 w-10 rounded-md ${COLOR_DISPLAY[name].bg}`} />
          <dt className="text-xs font-medium capitalize">{name}</dt>
          <dd className="font-mono text-[10px] text-muted-foreground">
            {63 + i} · {BOARD_COLORS[name]}
          </dd>
        </div>
      ))}
    </dl>
    <BoardDisplay
      message={
        "{63}{64}{65}{66}{67}{68}{69}{70}\n{red}R{/red}{orange}O{/orange}{yellow}Y{/yellow}{green}G{/green}{blue}B{/blue}{violet}V{/violet}WK"
      }
      size="md"
      isLoading={false}
    />
  </div>
);

/**
 * Cycles between messages on an interval so the split-flap transition runs
 * hands-free. Honors prefers-reduced-motion: when set, the interval still
 * swaps messages but tiles snap instead of flipping (animationsEnabled=false),
 * matching how the app wires its reduce-motion setting into the board.
 *
 * This is also the story that shows `announceUpdates` doing its job (issue
 * #206): a board that changes on its own is exactly the case where a
 * screen-reader user otherwise hears nothing, because a changed `aria-label`
 * on a `role="img"` is not announced. With it on, each new message is read once
 * politely. It stays **off** everywhere else in this file — an editor preview
 * or a thumbnail that re-announced on every keystroke would be unusable, which
 * is why the capability is opt-in and the consuming app decides.
 */
export const CyclingMessages = () => {
  const cycle = [simpleMessage, weatherMessage, coloredMessage];
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % 3), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <BoardDisplay message={cycle[idx]} size="md" animationsEnabled={!reducedMotion} announceUpdates />
      {/* Caption text left exactly as it was: it is rendered, so a sentence
          about `announceUpdates` here would rewrite four VRT baselines to
          document a feature that paints nothing. The docstring above says it
          instead, and lands in autodocs rather than in the shot. */}
      <p className="max-w-md text-center text-sm text-muted-foreground">
        A new message arrives every 4 seconds; each changed tile flips forward through the character set until it
        reaches its target.
      </p>
    </div>
  );
};

// Interactive story to test loading-to-display transition
export const LoadingTransition = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const testMessage = `{red}HELLO WORLD{/red}
WELCOME TO
FIESTABOARD
{blue}52{/blue}°F {yellow}62{/yellow}°F CLOUDY
{63}{64}{65}{66}{67}{68} SPLIT FLAP {63}{64}{65}{66}{67}{68}`;

  useEffect(() => {
    // Start with loading, then show message after 3 seconds
    const timer = setTimeout(() => {
      setMessage(testMessage);
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setIsLoading(true);
    setMessage(null);

    // After 3 seconds of loading, show the message again
    setTimeout(() => {
      setMessage(testMessage);
      setIsLoading(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <BoardDisplay message={message} isLoading={isLoading} size="md" boardType="black" />

      <button
        onClick={handleReset}
        disabled={isLoading}
        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
          isLoading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isLoading ? "Loading..." : "Reset"}
      </button>

      <div className="text-sm text-muted-foreground text-center max-w-md">
        <p className="font-semibold mb-2">Loading Transition Demo</p>
        <p>Watch the tiles flip continuously in loading state, then continue cycling until each lands on its target.</p>
        <p className="mt-2 text-info">Click &quot;Reset&quot; to replay the animation</p>
      </div>
    </div>
  );
};

// Interactive story to test message changes with real tile cycling
export const MessageTransition = () => {
  const [message, setMessage] = useState(coloredMessage);
  const [isLoading, setIsLoading] = useState(false);

  const message2 = `GOOD MORNING!
{blue}RISE AND SHINE{/blue}
{green}MAKE YOUR BED{/green}
{orange}EAT BREAKFAST{/orange}
HAVE A GREAT DAY!`;

  const handleTransition = () => {
    // Put into loading state
    // Keep the current message visible so we see actual CharTiles cycling
    setIsLoading(true);

    // After 6 seconds, set new message and turn off loading
    // Tiles will continue rotating until they reach their target characters
    setTimeout(() => {
      setMessage(message2);
      setIsLoading(false);
    }, 6000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <BoardDisplay message={message} isLoading={isLoading} size="md" boardType="black" />

      <button
        onClick={handleTransition}
        disabled={isLoading}
        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
          isLoading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isLoading ? "Loading..." : "Change Message"}
      </button>

      <div className="text-sm text-muted-foreground text-center max-w-md">
        <p className="font-semibold mb-2">Message Transition Demo</p>
        <p>
          Click the button to start loading. During loading, actual tiles cycle through characters (like the real
          board).
        </p>
        <p className="mt-2">
          After 6 seconds, the message changes and tiles continue rotating until each reaches its target character.
        </p>
      </div>
    </div>
  );
};

// Dedicated story to showcase the 3D split-flap animation.
// Cycles between messages so you can watch the flap mechanics at full board size.
export const SplitFlapAnimation = () => {
  const [message, setMessage] = useState("HELLO WORLD");
  const [isLoading, setIsLoading] = useState(false);
  const [boardType, setBoardType] = useState<"black" | "white">("black");

  const messages = [
    "HELLO WORLD",
    `{red}SPLIT{/red} {blue}FLAP{/blue} DEMO
{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}
ABCDEFGHIJKLMNOPQRSTUV
1234567890!@#$$()`,
    `GOOD MORNING
THE TIME IS 9:45 AM
{blue}52{/blue}°F PARTLY CLOUDY
{yellow}HAVE A GREAT DAY!{/yellow}`,
  ];

  const [msgIdx, setMsgIdx] = useState(0);

  const handleFlip = () => {
    setIsLoading(true);
    setTimeout(() => {
      const next = (msgIdx + 1) % messages.length;
      setMsgIdx(next);
      setMessage(messages[next]);
      setIsLoading(false);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <BoardDisplay message={message} isLoading={isLoading} size="lg" boardType={boardType} />

      <div className="flex gap-3">
        <button
          onClick={handleFlip}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isLoading ? "Flipping..." : "Flip to Next Message"}
        </button>
        <button
          onClick={() => setBoardType(boardType === "black" ? "white" : "black")}
          className="px-6 py-3 rounded-lg font-semibold border border-border hover:bg-accent transition-colors"
        >
          {boardType === "black" ? "Switch to White" : "Switch to Black"}
        </button>
      </div>

      <div className="text-sm text-muted-foreground text-center max-w-lg">
        <p className="font-semibold mb-2">Split-Flap Animation Demo</p>
        <p>
          Each tile uses a 4-layer 3D structure: the old character&apos;s top half folds down past the midpoint while
          the new character&apos;s bottom half unfolds into place — just like a real Solari board.
        </p>
        <p className="mt-2">
          During loading, all tiles cycle through the full character set. When the new message arrives, each tile
          continues flipping until it reaches its target character and stops.
        </p>
      </div>
    </div>
  );
};

/**
 * Times one board's cascade: from the message change to the moment its last
 * tile stops transitioning.
 *
 * Reading it off the DOM rather than instrumenting BoardDisplay keeps the
 * measurement honest — `data-is-transitioning` is the same attribute the
 * component sets to decide whether to mount its flap layers, so the readout
 * cannot show a cascade the board did not actually run. It also distinguishes
 * the two failure shapes by name: a board that never sets the attribute at all
 * reports "snapped", which is precisely what issue #196 looked like from the
 * outside and what this story previously left as a judgement call.
 */
function useSettleTime(nonce: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [result, setResult] = useState<{ ms: number; cascaded: boolean } | null>(null);

  useEffect(() => {
    // Nothing to time on first paint — there has been no message change yet.
    if (nonce === 0) return;

    const host = ref.current;
    if (!host) return;

    const startedAt = performance.now();
    let cascaded = false;
    let frame = 0;
    setResult(null);

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const transitioning = host.querySelector('[data-is-transitioning="true"]') !== null;
      if (transitioning) {
        cascaded = true;
      } else if (cascaded) {
        setResult({ ms: elapsed, cascaded: true });
        return;
      } else if (elapsed > 300) {
        // 300ms without a single tile entering a transition: the board snapped.
        setResult({ ms: elapsed, cascaded: false });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [nonce]);

  return { ref, result };
}

// Issue #178: the flap step is a prop, not a constant. `standard` (80ms) is the
// default and is unchanged from every previous version of this component;
// `hardware` is the device's own ~16ms (60 RPM x 62 flaps), which is here to
// show *why* the on-screen default deviates from it — a Latin glyph is barely
// resolvable for one frame mid-cascade.
//
// Each board carries a settle-time readout (issue #196). Four small boards
// flipping at once are impossible to compare by eye, and while the cascade was
// broken they were not just hard to compare but genuinely identical — the
// numbers are what make "flapSpeed does something" checkable rather than a
// matter of opinion, and what makes a regression to the snap obvious.
const FlapSpeedBoard = ({ preset, message, nonce }: { preset: FlapSpeedPreset; message: string; nonce: number }) => {
  const step = FLAP_SPEED_PRESETS[preset];
  const timing = deriveFlapTiming(step);
  const { ref, result } = useSettleTime(nonce);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{preset}</span> — {step}ms/step (top leaf 0–{timing.topMs}ms,
        bottom leaf {timing.bottomDelayMs}–{timing.stepMs}ms){preset === "standard" ? " — default" : ""}
      </div>
      <div className="font-mono text-xs" aria-live="polite">
        {nonce === 0 ? (
          <span className="text-muted-foreground">settle: —</span>
        ) : result === null ? (
          <span className="text-muted-foreground">settling…</span>
        ) : result.cascaded ? (
          <span className="text-foreground">settled in {Math.round(result.ms)}ms</span>
        ) : (
          <span className="text-destructive">snapped — no tile ever flipped (issue #196)</span>
        )}
      </div>
      <div ref={ref}>
        <BoardDisplay message={message} size="sm" deviceType="note" flapSpeed={preset} />
      </div>
    </div>
  );
};

export const FlapSpeeds = () => {
  const [nonce, setNonce] = useState(0);
  const messages = ["HELLO WORLD", "GOOD MORNING", "SPLIT FLAP TEST"];
  const presets = Object.keys(FLAP_SPEED_PRESETS) as FlapSpeedPreset[];

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={() => setNonce((n) => n + 1)}
        className="px-6 py-3 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Flip every board
      </button>

      <div className="flex flex-col gap-6">
        {presets.map((preset) => (
          <FlapSpeedBoard key={preset} preset={preset} message={messages[nonce % messages.length]} nonce={nonce} />
        ))}
      </div>

      <div className="text-sm text-muted-foreground text-center max-w-lg flex flex-col gap-2">
        <p>
          The two leaves tile each step exactly and never overlap (issue #177): the bottom leaf starts at the instant
          the top leaf lands, so only one leaf is ever in motion.
        </p>
        <p>
          Settle time is measured from the click to the last tile leaving its transition, so it is roughly the step
          duration times the longest distance any tile has to travel around the 71-character drum — which is why the
          four numbers are ordered like the four step durations rather than equal to them. Under{" "}
          <code>prefers-reduced-motion: reduce</code> every board snaps instead, deliberately (issue #180).
        </p>
      </div>
    </div>
  );
};

// Issue #176: the same measurement table the audit produced, computed from the
// tile scale itself. Every ratio should be flat down its column; `verifyTileScale`
// re-derives each authored Tailwind class from its tile height.
export const TileGeometry = () => {
  const rows = tileScaleRows();
  const issues = verifyTileScale();

  const spread = (values: number[]) => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return { lo, hi, pct: ((hi - lo) / lo) * 100 };
  };
  const columns = [
    { label: "aspect (w/h)", target: 0.7, get: (r: (typeof rows)[number]) => r.aspect },
    { label: "gutter/tile", target: 0.145 / 0.7, get: (r: (typeof rows)[number]) => r.gutterRatio },
    { label: "glyph/tile", target: 0.39, get: (r: (typeof rows)[number]) => r.glyphRatio },
    { label: "radius/tile", target: 0.075, get: (r: (typeof rows)[number]) => r.radiusRatio },
  ];

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      {issues.length > 0 ? (
        <p className="rounded-lg border border-destructive p-3 text-destructive">
          {issues.length} authored class string(s) no longer match the derived scale:{" "}
          {issues.map((i) => `${i.size}/${i.step} ${i.field}: ${i.actual} ≠ ${i.expected}`).join("; ")}
        </p>
      ) : (
        <p className="text-muted-foreground">All authored classes match the ratios derived from their tile height.</p>
      )}

      {/* A 10-column measurement table is wider than a phone by construction —
          unlike the board itself, a table is the textbook case for a scroll
          window, so it gets one below `sm` (issue #192). */}
      <div className="max-w-[calc(100vw-4rem)] overflow-x-auto sm:max-w-none sm:overflow-x-visible">
        <table className="border-collapse">
          <thead>
            <tr className="text-left">
              {["size", "step", "w×h", "gutter", "glyph", "radius", ...columns.map((c) => c.label)].map((h) => (
                <th key={h} className="border-b border-border px-3 py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.size}-${r.step}`}>
                <td className="px-3 py-1">{r.size}</td>
                <td className="px-3 py-1">{r.step}</td>
                <td className="px-3 py-1">{`${r.width}×${r.height}`}</td>
                <td className="px-3 py-1">{r.gutter}</td>
                <td className="px-3 py-1">{r.glyph}</td>
                <td className="px-3 py-1">{r.radius}</td>
                {columns.map((c) => (
                  <td key={c.label} className="px-3 py-1">
                    {c.get(r).toFixed(3)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-muted-foreground">
              <td className="border-t border-border px-3 py-1" colSpan={6}>
                spread (max/min − 1)
              </td>
              {columns.map((c) => {
                const s = spread(rows.map(c.get));
                return (
                  <td key={c.label} className="border-t border-border px-3 py-1">
                    {s.pct.toFixed(1)}%
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="max-w-2xl font-sans text-sm text-muted-foreground">
        Residual spread is integer-pixel quantisation — no dimension is more than 0.5px from its ideal value. Corner
        radius is paint-only, so it is kept fractional and its ratio is exactly invariant.
      </p>
    </div>
  );
};
