import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "../forms/button";
import { MediaFrame, MediaFrameBar, MediaFrameMedia } from "./media-frame";

// Inline SVG data URIs, not fetched images: VRT runs offline and must be
// deterministic, and a data URI paints identically on every run. The two
// renditions stand in for the docs site's black/white board screenshots.
const boardPlaceholder = (bg: string, tile: string, glyph: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'>` +
      `<defs><pattern id='t' width='60' height='80' patternUnits='userSpaceOnUse'>` +
      `<rect x='4' y='4' width='52' height='72' rx='6' fill='${tile}'/>` +
      `</pattern></defs>` +
      `<rect width='1200' height='675' fill='${bg}'/>` +
      `<rect width='1200' height='675' fill='url(#t)'/>` +
      `<text x='600' y='358' font-family='monospace' font-size='72' letter-spacing='18' fill='${glyph}' text-anchor='middle'>FIESTABOARD</text>` +
      `</svg>`,
  )}`;

const BLACK_BOARD = boardPlaceholder("#0c0a09", "#292524", "#fbbf24");
const WHITE_BOARD = boardPlaceholder("#fafaf9", "#e7e5e4", "#b45309");

const meta = {
  title: "Containment/MediaFrame",
  component: MediaFrame,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes on the figure (e.g. width constraints)",
    },
    children: {
      control: false,
      description: "MediaFrameMedia holding the media, plus an optional MediaFrameBar",
    },
  },
} satisfies Meta<typeof MediaFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "w-full sm:w-[480px]",
    children: (
      <>
        <MediaFrameMedia>
          <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
        </MediaFrameMedia>
        <MediaFrameBar>The kitchen board running the morning briefing page.</MediaFrameBar>
      </>
    ),
  },
};

export const MediaOnly: Story = {
  args: {
    className: "w-full sm:w-[480px]",
    children: (
      <MediaFrameMedia>
        <img src={WHITE_BOARD} alt="White split-flap board spelling FIESTABOARD" />
      </MediaFrameMedia>
    ),
  },
};

/**
 * The docs-site use case: the bar hosts a toolbar that switches which
 * rendition of the figure is shown. The buttons here are placeholders —
 * once ToggleGroup (#218) lands, it is the intended occupant of this slot.
 */
export const WithToolbar = () => {
  const [board, setBoard] = useState<"black" | "white">("black");
  return (
    <MediaFrame className="w-full sm:w-[480px]">
      <MediaFrameMedia>
        <img
          src={board === "black" ? BLACK_BOARD : WHITE_BOARD}
          alt={`${board === "black" ? "Black" : "White"} split-flap board spelling FIESTABOARD`}
        />
      </MediaFrameMedia>
      <MediaFrameBar>
        {(["black", "white"] as const).map((style) => (
          <Button
            key={style}
            size="sm"
            variant={board === style ? "secondary" : "ghost"}
            aria-pressed={board === style}
            onClick={() => setBoard(style)}
          >
            {style === "black" ? "Black" : "White"}
          </Button>
        ))}
      </MediaFrameBar>
    </MediaFrame>
  );
};

/**
 * `onZoom` (or a LightboxTrigger's injected onClick) turns the media well
 * into a real button with a zoom cursor and an inset focus ring. See
 * Overlays/Lightbox for the full click-to-zoom composition.
 */
export const Zoomable = () => {
  const [zooms, setZooms] = useState(0);
  return (
    <MediaFrame className="w-full sm:w-[480px]">
      <MediaFrameMedia onZoom={() => setZooms((n) => n + 1)} aria-label="Zoom board screenshot">
        <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
      </MediaFrameMedia>
      <MediaFrameBar>{zooms === 0 ? "Click the screenshot to zoom." : `Zoom requested ${zooms}×.`}</MediaFrameBar>
    </MediaFrame>
  );
};
