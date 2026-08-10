import type { Meta, StoryObj } from "@storybook/react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { Badge } from "./badge";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["single", "multiple"],
      description: "Whether one or several items can be open at once",
    },
    collapsible: {
      control: "boolean",
      description: "In single mode, allow closing the open item (Radix-style flag)",
    },
    disabled: {
      control: "boolean",
      description: "Disable the entire accordion",
    },
    defaultValue: {
      control: "text",
      description: "Value of the item open by default (uncontrolled)",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
    value: {
      control: false,
      description: "Controlled open value(s); pair with onValueChange",
    },
    onValueChange: {
      control: false,
      description: "Callback fired when the open item(s) change",
    },
    children: {
      control: false,
      description: "AccordionItem elements",
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const faqItems = (
  <>
    <AccordionItem value="item-1">
      <AccordionTrigger>Is it accessible?</AccordionTrigger>
      <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>Is it styled?</AccordionTrigger>
      <AccordionContent>Yes. It comes with default styles that match your theme.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-3">
      <AccordionTrigger>Is it animated?</AccordionTrigger>
      <AccordionContent>Yes. It&apos;s animated by default with smooth transitions.</AccordionContent>
    </AccordionItem>
  </>
);

export const Default: Story = {
  args: {
    type: "single",
    collapsible: true,
    disabled: false,
    className: "w-full sm:w-[450px]",
    children: faqItems,
  },
};

export const Multiple: Story = {
  args: {
    type: "multiple",
    className: "w-full sm:w-[450px]",
    children: faqItems,
  },
};

export const DefaultOpen: Story = {
  args: {
    type: "single",
    collapsible: true,
    defaultValue: "item-2",
    className: "w-full sm:w-[450px]",
    children: faqItems,
  },
};

export const Disabled: Story = {
  args: {
    type: "single",
    collapsible: true,
    disabled: true,
    className: "w-full sm:w-[450px]",
    children: faqItems,
  },
};

export const DisabledItem = () => (
  <Accordion type="single" collapsible className="w-full sm:w-[450px]">
    <AccordionItem value="item-1">
      <AccordionTrigger>Available section</AccordionTrigger>
      <AccordionContent>This section can be toggled normally.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2" disabled>
      <AccordionTrigger>Locked section</AccordionTrigger>
      <AccordionContent>This content is not reachable while the item is disabled.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-3">
      <AccordionTrigger>Another available section</AccordionTrigger>
      <AccordionContent>Keyboard navigation skips the disabled item.</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const AllTypes = () => (
  <div className="space-y-8">
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Single (collapsible)</h3>
      <Accordion type="single" collapsible className="w-full sm:w-[450px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Only one section can be open at a time.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Opening this closes the other section.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Section 3</AccordionTrigger>
          <AccordionContent>Try clicking between sections.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Multiple</h3>
      <Accordion type="multiple" className="w-full sm:w-[450px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Multiple sections can be open simultaneously.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>This one can stay open while opening others.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Section 3</AccordionTrigger>
          <AccordionContent>Try opening all three sections.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
);

export const SettingsPanel = () => (
  <Accordion type="single" collapsible defaultValue="general" className="w-full sm:w-[500px] rounded-lg border px-4">
    <AccordionItem value="general">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          General
          <Badge variant="secondary">3 settings</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-muted-foreground">
          <li>Board name and location</li>
          <li>Display timezone</li>
          <li>Refresh interval</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="integrations">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          Integrations
          <Badge variant="success">2 active</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-muted-foreground">
          <li>Weather — enabled</li>
          <li>Transit — enabled</li>
          <li>Stocks — disabled</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="advanced" className="border-b-0">
      <AccordionTrigger>Advanced</AccordionTrigger>
      <AccordionContent>
        <p className="text-muted-foreground">API keys, webhooks, and developer options live here.</p>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
