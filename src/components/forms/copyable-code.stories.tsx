import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "../typography/text";
import { CopyableCode } from "./copyable-code";

const meta = {
  title: "Forms/CopyableCode",
  component: CopyableCode,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An inline code token that copies a value without replacing its text. Only the trailing glyph " +
          "changes on success, with a polite announcement. Clipboard writes are awaited; failed writes " +
          "call onCopyError without confirming. Timers and pending writes are cleaned up on unmount or " +
          "value changes. Use directly in a sentence or table cell, not inside another button. " +
          "Use onCopied for a success toast and labels for localized accessible names.",
      },
    },
  },
  args: { value: "{{weather.temp}}" },
  tags: ["autodocs"],
} satisfies Meta<typeof CopyableCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DisplayLabel: Story = {
  args: {
    children: "weather.temp",
    labels: { copy: "Copy weather.temp", announcement: "Copied {{weather.temp}}" },
  },
};

export const ColorVariable: Story = {
  args: {
    value: "{{weather.temp_color}}",
    children: "weather.temp_color",
    className: "bg-primary/10 text-brand",
  },
};

export const InSentence: Story = {
  render: (args) => (
    <Text size="base">
      Insert <CopyableCode {...args} /> into your template to show the temperature.
    </Text>
  ),
};

export const TemplateVariables: Story = {
  render: () => (
    <table className="text-sm">
      <caption className="sr-only">Template variables</caption>
      <thead>
        <tr>
          <th className="p-2 text-left">Variable</th>
          <th className="p-2 text-left">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="p-2">
            <CopyableCode value="{{weather.temp}}" />
          </td>
          <td className="p-2">Current temperature</td>
        </tr>
        <tr>
          <td className="p-2">
            <CopyableCode value="{{weather.temp_color}}" />
          </td>
          <td className="p-2">Temperature rule color</td>
        </tr>
      </tbody>
    </table>
  ),
};

export const Localized: Story = {
  args: {
    children: "weather.temp",
    labels: { copy: "Copier weather.temp", copied: "Copié", announcement: "Variable copiée" },
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
