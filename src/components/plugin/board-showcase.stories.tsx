import type { Meta, StoryObj } from "@storybook/react";

import { BoardShowcase } from "./board-showcase";

const FLAGSHIP = {
  device_type: "flagship" as const,
  rows: [
    "{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}",
    "     AIR QUALITY",
    "     AQI 42  GOOD",
    "{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}{67}",
    "      VISIBILITY",
    "  8.5 MILES  LIGHT FOG",
  ],
};

const NOTE = {
  device_type: "note" as const,
  rows: ["{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}{66}", "  AQI 45 GOOD", "  FOG CLEAR"],
};

const meta = {
  title: "App/Plugin/BoardShowcase",
  component: BoardShowcase,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    defaultBoardType: {
      control: "select",
      options: ["black", "white"],
    },
    code62Glyph: {
      control: "select",
      options: ["degree", "heart"],
      description:
        "Which glyph the viewer's board draws for code 62. Vestaboard replaced the Flagship's degree flap with a heart on units built from 2026 and nothing queryable tells them apart, so the consumer passes what the owner reported. Defaults to `degree`.",
    },
  },
} satisfies Meta<typeof BoardShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    previews: [FLAGSHIP, NOTE],
    previewLabel: "Air Quality & Fog displayed on a split-flap board",
  },
};

/** One shape declared — the tab list is suppressed, the colour toggle stays. */
export const SingleShape: Story = {
  args: {
    previews: [FLAGSHIP],
    previewLabel: "Air Quality & Fog displayed on a split-flap board",
  },
};

export const WhiteBoard: Story = {
  args: {
    previews: [FLAGSHIP, NOTE],
    defaultBoardType: "white",
    previewLabel: "Air Quality & Fog displayed on a split-flap board",
  },
};

/** Repeated shapes are numbered so every tab has a distinct accessible name. */
export const RepeatedShapes: Story = {
  args: {
    previews: [FLAGSHIP, { ...FLAGSHIP, rows: ["", "    POLLEN  LOW", "    TREE  GRASS"] }, NOTE],
    previewLabel: "Air Quality & Fog displayed on a split-flap board",
  },
};

/** Localized labels — everything user-visible is injectable. */
export const LocalizedLabels: Story = {
  args: {
    previews: [FLAGSHIP, NOTE],
    labels: {
      flagship: "Vaisseau amiral",
      note: "Note",
      boardShape: "Format du tableau",
      boardColor: "Couleur du tableau",
      blackBoard: "Tableau noir",
      whiteBoard: "Tableau blanc",
    },
  },
};
