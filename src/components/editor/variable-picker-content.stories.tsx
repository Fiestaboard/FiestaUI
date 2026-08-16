import type { Meta, StoryObj } from "@storybook/react";
import { Clock, Cloud, TrainFront, TrendingUp } from "lucide-react";

import { Box } from "../layout/box";
import {
  createLucideIconResolver,
  type PluginDisplayData,
  type PluginManifest,
  type TemplateVariables,
  VariablePickerContent,
} from "./variable-picker-content";

/**
 * The app resolves manifest icon names against the whole Lucide set; a story
 * only needs the four the mock manifests ask for.
 */
const resolveIcon = createLucideIconResolver({ Cloud, Clock, TrendingUp, TrainFront });

const mockTemplateVariables: TemplateVariables = {
  variables: {
    weather: [
      "temperature",
      "condition",
      "location",
      "humidity",
      "wind_speed",
      "feels_like",
      "uv_index",
      "pressure",
      "visibility",
      "dew_point",
      "cloud_cover",
    ],
    datetime: ["time", "date", "day"],
    stocks: ["price", "change", "change_percent", "symbol", "name"],
    muni: ["stops.0.name", "stops.0.stop_code", "stops.0.all_lines.formatted", "stops.0.all_lines.next_arrival"],
  },
};

const mockWeatherManifest: PluginManifest = { icon: "cloud" };
const mockDatetimeManifest: PluginManifest = { icon: "clock" };
const mockStocksManifest: PluginManifest = { icon: "trending-up" };

const mockMuniManifest: PluginManifest = {
  icon: "train-front",
  variables: {
    arrays: {
      stops: {
        label_field: "name",
        item_fields: ["name", "stop_code", "line", "destination_name"],
        sub_arrays: {
          lines: {
            key_type: "dynamic",
            key_field: "line",
            item_fields: ["next_arrival", "destination", "formatted"],
          },
        },
      },
    },
  },
};

const mockManifests: Record<string, PluginManifest> = {
  weather: mockWeatherManifest,
  datetime: mockDatetimeManifest,
  stocks: mockStocksManifest,
  muni: mockMuniManifest,
};

/**
 * What `api.getDisplaysRawBatch(["muni"])` returns, already unwrapped from its
 * `{ displays: { muni: { data } } }` envelope — the app does that unwrapping.
 */
const mockMuniDisplayData: PluginDisplayData = {
  muni: {
    stops: [
      {
        name: "Market & 3rd St",
        stop_code: "15726",
        line: "N",
        destination_name: "Ocean Beach",
        all_lines: {
          formatted: "N-5m, K-8m",
          next_arrival: "5",
        },
        lines: {
          N: { next_arrival: "5", destination: "Ocean Beach", formatted: "5 min" },
          K: { next_arrival: "8", destination: "Balboa Park", formatted: "8 min" },
        },
      },
      {
        name: "Powell Station",
        stop_code: "15731",
        line: "F",
        destination_name: "Fishermans Wharf",
        all_lines: {
          formatted: "F-3m",
          next_arrival: "3",
        },
        lines: {
          F: {
            next_arrival: "3",
            destination: "Fishermans Wharf",
            formatted: "3 min",
          },
        },
      },
    ],
  },
};

const meta = {
  title: "Editor/VariablePickerContent",
  component: VariablePickerContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onInsert: (variable: string) => console.log("Insert:", variable),
    templateVariables: mockTemplateVariables,
    pluginManifests: mockManifests,
    resolveIcon,
    // Off in Storybook only: the autodocs page renders every story at once, and
    // several inputs racing for focus scroll the page around. The component
    // defaults to true because it is opened from a toolbar dropdown.
    autoFocusSearch: false,
  },
  argTypes: {
    templateVariables: {
      description: "Categories and their variable names — the app fetches these and passes them in.",
      control: "object",
    },
    pluginManifests: {
      description: "Plugin id → manifest. A manifest's `variables.arrays` is what unlocks the indexed sections.",
      control: "object",
    },
    pluginDisplayData: {
      description: "Live plugin payloads keyed by plugin id; supplies the item labels under each array.",
      control: "object",
    },
    maxHeight: { control: "text" },
  },
  decorators: [
    (Story) => (
      <Box className="w-[360px] overflow-hidden rounded-xl border bg-card shadow-card">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof VariablePickerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * `muni` declares a `stops` array, so its live display data turns into
 * per-stop accordions — including the dynamically keyed `lines` sub-array.
 */
export const WithTransitData: Story = {
  args: {
    pluginDisplayData: mockMuniDisplayData,
  },
};

/**
 * An array-declaring plugin with no data yet: the picker explains how to
 * configure it instead of hiding the array.
 */
export const ArrayNotConfigured: Story = {
  args: {
    templateVariables: { variables: { muni: mockTemplateVariables.variables.muni } },
    pluginManifests: { muni: mockMuniManifest },
  },
};

export const SingleCategory: Story = {
  args: {
    templateVariables: { variables: { weather: mockTemplateVariables.variables.weather } },
    pluginManifests: { weather: mockWeatherManifest },
  },
};

/**
 * Metadata is optional, but when a plugin publishes it the picker groups the
 * variables, shows a preview value on the pill and a description on hover.
 */
export const WithMetadataAndGroups: Story = {
  args: {
    templateVariables: {
      variables: { weather: mockTemplateVariables.variables.weather },
      variable_groups: {
        weather: {
          current: { label: "Current conditions" },
          atmosphere: { label: "Atmosphere" },
        },
      },
      variable_metadata: {
        weather: {
          temperature: { group: "current", description: "Current temperature in the configured unit.", preview: "72" },
          condition: { group: "current", description: "Short description of the sky.", preview: "PARTLY CLOUDY" },
          feels_like: { group: "current", preview: "70" },
          humidity: { group: "atmosphere", description: "Relative humidity, percent.", preview: "48%" },
          pressure: { group: "atmosphere", preview: "1014" },
          dew_point: { group: "atmosphere", preview: "55" },
          // No group → rendered under the "General" heading.
          location: { description: "Configured location name.", preview: "SAN FRANCISCO" },
        },
      },
    },
    pluginManifests: { weather: mockWeatherManifest },
  },
};

/** Every category filtered out — the empty-search-result state. */
export const NoMatchingCategories: Story = {
  args: {
    templateVariables: { variables: {} },
    pluginManifests: {},
  },
};

/** No response yet from the app, as opposed to an empty one. */
export const NoVariablesAvailable: Story = {
  args: {
    templateVariables: undefined,
    pluginManifests: {},
  },
};

export const Loading: Story = {
  args: {
    isLoadingVariables: true,
  },
};

/** Manifests lag the variable list on a cold cache; the skeleton covers both. */
export const LoadingManifests: Story = {
  args: {
    isLoadingManifests: true,
  },
};

/** Localization check: every user-visible string is an overridable label. */
export const TranslatedLabels: Story = {
  args: {
    templateVariables: { variables: { weather: mockTemplateVariables.variables.weather } },
    pluginManifests: { weather: mockWeatherManifest },
    labels: {
      searchPlaceholder: "Variablen suchen...",
      general: "Allgemein",
      noVariablesFound: (searchQuery) => `Keine Variablen gefunden für „${searchQuery}“`,
    },
  },
};
