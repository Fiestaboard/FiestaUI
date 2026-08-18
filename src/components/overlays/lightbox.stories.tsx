import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { MediaFrame, MediaFrameBar, MediaFrameMedia } from "../containment/media-frame";
import { Button } from "../forms/button";
import { Lightbox, LightboxContent, LightboxFooter, LightboxTrigger } from "./lightbox";

// Inline SVG data URIs — VRT runs offline, so no fetched images. Same
// placeholder pair as the MediaFrame stories: the docs site's black/white
// board screenshot use case.
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
  title: "Overlays/Lightbox",
  component: Lightbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Open the lightbox on first render (uncontrolled)",
    },
    modal: {
      control: "boolean",
      description: "Trap focus and block interaction with the rest of the page",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the open state changes",
    },
    children: {
      control: false,
      description: "LightboxTrigger and LightboxContent elements",
    },
  },
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: false,
    children: (
      <>
        <MediaFrame className="w-full sm:w-[480px]">
          <LightboxTrigger asChild>
            <MediaFrameMedia aria-label="Zoom board screenshot">
              <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
            </MediaFrameMedia>
          </LightboxTrigger>
          <MediaFrameBar>Click the screenshot to zoom.</MediaFrameBar>
        </MediaFrame>
        <LightboxContent aria-label="Board screenshot, zoomed">
          <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
        </LightboxContent>
      </>
    ),
  },
};

// Open-state story for VRT, same approach as Dialog/Sheet: `defaultOpen`
// renders the overlay deterministically on first paint — no play function,
// no timers.
export const Open: Story = {
  args: {
    defaultOpen: true,
    children: (
      <>
        <MediaFrame className="w-full sm:w-[480px]">
          <LightboxTrigger asChild>
            <MediaFrameMedia aria-label="Zoom board screenshot">
              <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
            </MediaFrameMedia>
          </LightboxTrigger>
        </MediaFrame>
        <LightboxContent aria-label="Board screenshot, zoomed">
          <img src={BLACK_BOARD} alt="Split-flap board spelling FIESTABOARD" />
          <LightboxFooter>
            <p className="text-sm">The kitchen board running the morning briefing page.</p>
          </LightboxFooter>
        </LightboxContent>
      </>
    ),
  },
};

/**
 * The full docs-site workflow: one piece of state drives both the framed
 * figure's toolbar and the zoomed view's footer toolbar, so the rendition
 * chosen inline carries into the lightbox and back. The toggle buttons are
 * placeholders for ToggleGroup (#218).
 */
export const ScreenshotWorkflow = () => {
  const [board, setBoard] = useState<"black" | "white">("black");
  const src = board === "black" ? BLACK_BOARD : WHITE_BOARD;
  const alt = `${board === "black" ? "Black" : "White"} split-flap board spelling FIESTABOARD`;
  const toggle = (
    <>
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
    </>
  );
  return (
    <Lightbox>
      <MediaFrame className="w-full sm:w-[480px]">
        <LightboxTrigger asChild>
          <MediaFrameMedia aria-label="Zoom board screenshot">
            <img src={src} alt={alt} />
          </MediaFrameMedia>
        </LightboxTrigger>
        <MediaFrameBar>{toggle}</MediaFrameBar>
      </MediaFrame>
      <LightboxContent aria-label="Board screenshot, zoomed">
        <img src={src} alt={alt} />
        <LightboxFooter>{toggle}</LightboxFooter>
      </LightboxContent>
    </Lightbox>
  );
};
