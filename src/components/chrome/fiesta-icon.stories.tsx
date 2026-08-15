import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";

import { FIESTA_ICON_DATA_URI, FIESTA_ICON_PALETTE, FiestaIcon } from "./fiesta-icon";

const meta = {
  title: "App/Chrome/FiestaIcon",
  component: FiestaIcon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The pixel-art taco brand mark, redrawn as a crisp SVG with tokenized fills — every palette slot is a `--fiesta-icon-*` CSS custom property with the classic brand color as its fallback. Decorative (`aria-hidden`) — pair it with FiestaLogo or your own accessible label.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      description: "Rendered width and height in px — the source art is a 32×32 pixel grid.",
      control: { type: "range", min: 16, max: 256, step: 4 },
    },
    className: { control: false },
  },
} satisfies Meta<typeof FiestaIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 32 },
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The mark is vector now, so it stays pixel-crisp at every size — compare the 128px render to the blurry upscale the old raster PNG produced.",
      },
    },
  },
  render: () => (
    <div className="flex items-end gap-8">
      {[16, 24, 32, 64, 128].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <FiestaIcon size={size} />
          <span className="text-xs text-muted-foreground">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

export const TokenizedFills: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every palette slot is themeable: set `--fiesta-icon-<slot>` on an ancestor to re-tint it. Left to right — default fills, a blue-corn shell (`--fiesta-icon-shell*` overridden), and a monochrome mark driven entirely by `currentColor` via `FIESTA_ICON_PALETTE`.",
      },
    },
  },
  render: () => {
    const blueCorn: CSSProperties = {
      "--fiesta-icon-shell": "#5b7bd5",
      "--fiesta-icon-shell-shade": "#3f57a8",
      "--fiesta-icon-shell-light": "#7d99e3",
      "--fiesta-icon-shell-glint": "#a9bff0",
    } as CSSProperties;
    const monochrome = Object.fromEntries(
      FIESTA_ICON_PALETTE.map(({ cssVar }) => [cssVar, "currentColor"]),
    ) as CSSProperties;
    return (
      <div className="flex items-end gap-8">
        <div className="flex flex-col items-center gap-2">
          <FiestaIcon size={96} />
          <span className="text-xs text-muted-foreground">Default</span>
        </div>
        <div className="flex flex-col items-center gap-2" style={blueCorn}>
          <FiestaIcon size={96} />
          <span className="text-xs text-muted-foreground">Blue-corn shell</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-muted-foreground" style={monochrome}>
          <FiestaIcon size={96} />
          <span className="text-xs text-muted-foreground">Monochrome</span>
        </div>
      </div>
    );
  },
};

export const AsImageSrc: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`FIESTA_ICON_DATA_URI` is the same mark as a `data:image/svg+xml` URI for `<img src>` consumers (Sidebar `logoIconSrc`, the Storybook manager `brandImage`). Inside an `<img>` the custom properties can't cascade, so the classic fallback colors always apply.",
      },
    },
  },
  render: () => <img src={FIESTA_ICON_DATA_URI} alt="" width={64} height={64} />,
};
