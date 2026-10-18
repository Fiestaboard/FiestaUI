import type { Meta, StoryObj } from "@storybook/react";
import { userEvent } from "storybook/test";

import { Stack } from "../layout/stack";
import { Heading } from "./heading";
import { Prose } from "./prose";

const previewImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="160"><rect width="960" height="160" fill="#101010"/><text x="480" y="95" text-anchor="middle" font-family="monospace" font-size="40" fill="#ffffff">HELLO, FIESTA</text></svg>')}`;

const meta = {
  title: "Primitives/Typography/Prose",
  component: Prose,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          'Typography for already-rendered rich text. Put your app’s markdown renderer inside Prose; no per-element map or markdown dependency is needed. size="sm" with headingOffset={2} fits chat, and the default size="base" fits documents. Offsets change visual sizes only; the renderer owns semantic heading levels, sanitization and URL policy. Uses the normal FiestaUI theme.css and Tailwind @source setup.',
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "base"] },
    headingOffset: { control: { type: "range", min: 0, max: 5, step: 1 } },
  },
} satisfies Meta<typeof Prose>;

export default meta;
type Story = StoryObj<typeof meta>;

// Deliberately plain HTML: the same descendants a markdown renderer emits.
function RichText() {
  return (
    <>
      <h1>Weather display</h1>
      <p>
        Show <strong>local conditions</strong> on your board. Read the <a href="#prose-setup">setup guide</a> before
        connecting a device, and keep the <code>API_KEY</code> private.
      </p>
      <h2 id="prose-setup">Setup</h2>
      <ol>
        <li>Enable the integration.</li>
        <li>
          Select your location:
          <ul>
            <li>City and country</li>
            <li>Temperature units</li>
          </ul>
        </li>
        <li>
          <p>Save your configuration.</p>
          <p>Preview the result before publishing.</p>
        </li>
      </ol>
      <blockquote>
        <p>
          A preview uses your current settings. <em>It does not publish to your board.</em>
        </p>
      </blockquote>
      <h3>Configuration</h3>
      {/* A scrollable code block needs keyboard access even though pre is not interactive. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label="Example configuration">
        <code className="language-json">{'{\n  "units": "celsius",\n  "refreshMinutes": 15\n}'}</code>
      </pre>
      <p>A fence without a language has the same block treatment:</p>
      {/* A scrollable code block needs keyboard access even though pre is not interactive. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label="Example output">
        <code>{"TEMPERATURE  18°C\nCONDITIONS   CLEAR"}</code>
      </pre>
      <h4>Available devices</h4>
      <table>
        <caption>Display capacities</caption>
        <thead>
          <tr>
            <th scope="col">Device</th>
            <th scope="col" style={{ textAlign: "right" }}>
              Characters
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Note</th>
            <td style={{ textAlign: "right" }}>45</td>
          </tr>
          <tr>
            <th scope="row">Flagship</th>
            <td style={{ textAlign: "right" }}>132</td>
          </tr>
        </tbody>
      </table>
      <img src={previewImage} alt="A black board displaying Hello, Fiesta" width={960} height={160} />
      <h5>Refresh interval</h5>
      <p>Updates follow the configured interval.</p>
      <h6>Additional details</h6>
      <p>Credentials remain in the app’s settings.</p>
      <hr />
      <p>
        Visit the <a href="#prose-setup">setup guide</a> to change your configuration.
      </p>
    </>
  );
}

export const Default: Story = {
  args: { className: "max-w-2xl", children: <RichText /> },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('[data-slot="prose"]')!;
    const inline = root.querySelector<HTMLElement>("p code")!;
    const blocks = root.querySelectorAll<HTMLElement>("pre code");
    if (getComputedStyle(inline).backgroundColor === "rgba(0, 0, 0, 0)") throw new Error("Inline code lost its chip");
    for (const code of blocks) {
      const css = getComputedStyle(code);
      if (css.backgroundColor !== "rgba(0, 0, 0, 0)" || css.paddingLeft !== "0px" || css.paddingTop !== "0px") {
        throw new Error("Fenced code inherited inline chip styling");
      }
    }
    if (getComputedStyle(root.querySelector("ul")!).listStyleType !== "disc") throw new Error("Missing bullets");
    if (getComputedStyle(root.querySelector("ol")!).listStyleType !== "decimal") throw new Error("Missing numbers");
    if (getComputedStyle(root.querySelector("th")!).borderTopWidth !== "1px") throw new Error("Missing table borders");
    const first = root.firstElementChild!;
    const last = root.lastElementChild!;
    if (getComputedStyle(first).marginTop !== "0px" || getComputedStyle(last).marginBottom !== "0px") {
      throw new Error("Prose has unwanted outer block spacing");
    }
    const link = root.querySelector<HTMLAnchorElement>("a")!;
    if (!getComputedStyle(link).textDecorationLine.includes("underline"))
      throw new Error("Links need a visible underline");
    await userEvent.tab();
    link.focus();
    if (!link.matches(":focus-visible") || getComputedStyle(link).boxShadow === "none")
      throw new Error("Missing link focus ring");
    link.blur();
  },
};

export const Compact: Story = {
  args: { size: "sm", headingOffset: 2, className: "max-w-md", children: <RichText /> },
};

export const HeadingOffsets: Story = {
  render: () => (
    <div className="grid w-full gap-6 sm:grid-cols-2">
      {(["sm", "base"] as const).map((size) => (
        <Stack key={size} gap="4">
          <Heading size="lg">{size} density</Heading>
          {[0, 1, 2, 3, 4, 5].map((offset) => (
            <Prose key={offset} size={size} headingOffset={offset} className="rounded-lg border border-border p-4">
              <h1>Offset {offset}</h1>
              <h2>Second level</h2>
              <h3>Third level</h3>
              <h4>Fourth level</h4>
              <h5>Fifth level</h5>
              <h6>Sixth level</h6>
              <p>Body copy stays at the selected density.</p>
            </Prose>
          ))}
        </Stack>
      ))}
    </div>
  ),
  // Run where real CSS is available (Storybook a11y CI), not in jsdom.
  play: async ({ canvasElement }) => {
    const scales = { sm: [18, 16, 14, 14, 12, 12], base: [20, 18, 16, 14, 12, 12] };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    for (const root of canvasElement.querySelectorAll<HTMLElement>('[data-slot="prose"]')) {
      const size = root.dataset.size as "sm" | "base";
      const offset = Number(root.dataset.headingOffset);
      for (let level = 1; level <= 6; level++) {
        const heading = root.querySelector(`h${level}`)!;
        const expected = scales[size][Math.min(5, level - 1 + offset)] * rem;
        const actual = parseFloat(getComputedStyle(heading).fontSize);
        if (Math.abs(actual - expected) > 0.1)
          throw new Error(`${size} offset ${offset} h${level}: ${actual}px, expected ${expected}px`);
      }
      const expectedBody = (size === "sm" ? 14 : 16) * rem;
      if (Math.abs(parseFloat(getComputedStyle(root.querySelector("p")!).fontSize) - expectedBody) > 0.1) {
        throw new Error("Heading offset changed body density");
      }
    }
  },
};

export const NarrowContent: Story = {
  render: () => (
    <Prose className="w-full max-w-[240px]" size="sm" headingOffset={2}>
      <h1>Small viewport</h1>
      <p>
        <a href="#narrow-end">https://example.test/a/very/long/path/that/needs/to/wrap/inside/the/chat/message</a>
      </p>
      {/* A scrollable code block needs keyboard access even though pre is not interactive. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label="Long command">
        <code>
          {'fiestaboard configure --location "A location name that is intentionally longer than this small viewport"'}
        </code>
      </pre>
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Configuration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Note</td>
            <td>AN_IDENTIFIER_WITHOUT_ANY_SPACES_THAT_MUST_WRAP</td>
          </tr>
        </tbody>
      </table>
      <img src={previewImage} alt="A board preview resized to fit a narrow column" width={960} height={160} />
      <p id="narrow-end">The surrounding page keeps its width.</p>
    </Prose>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('[data-slot="prose"]')!;
    const pre = root.querySelector("pre")!;
    const img = root.querySelector("img")!;
    if (root.getBoundingClientRect().width > 241) throw new Error("Prose escaped its column");
    if (pre.scrollWidth <= pre.clientWidth || getComputedStyle(pre).overflowX !== "auto")
      throw new Error("Long code should scroll locally");
    if (img.getBoundingClientRect().width > root.clientWidth + 1) throw new Error("Image escaped its column");
    if (root.scrollWidth > root.clientWidth + 1) throw new Error("Text or table escaped its column");
  },
};
