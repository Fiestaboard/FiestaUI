import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateEditor } from "./template-editor";
import { parseTemplateSimple, serializeTemplateSimple } from "./utils/serialization";

/*
 * Byte-identity without a character set.
 *
 * `charset` / `deviceModel` are new on the editor. Without them the editor
 * must be exactly what shipped: the same serialized value for every template
 * the parser knew, and the same DOM. The snapshots in ./__snapshots__ were
 * generated against the editor BEFORE either prop existed (commit 95423b3,
 * the parent of this change) and are never regenerated from the charset-aware
 * code: a diff here is a regression, not a change.
 *
 * Normalised, because they are properties of the test run and not of the
 * editor: Base UI's `useId` tooltip ids, the random `fillSpace` ids, and
 * the `contenteditable` attribute (ProseMirror sets it from a focus-time
 * check that jsdom answers differently between runs).
 */
const stable = (html: string) =>
  html
    .replace(/id="base-ui-_r_[0-9a-z]+_"/g, 'id="base-ui-ID"')
    .replace(/aria-describedby="base-ui-_r_[0-9a-z]+_"/g, 'aria-describedby="base-ui-ID"')
    .replace(/data-id="[0-9a-z]+"/g, 'data-id="ID"')
    .replace(/contenteditable="(true|false)"/g, 'contenteditable="X"');

/** Every template shape the editor could already load, including the ones a
 *  split-flap author writes today with the new forms as plain text. */
export const LEGACY_TEMPLATES = [
  "",
  "HELLO",
  "{{red}} HOT {{blue}}",
  "{red}{63}{filled}",
  "{{weather.temperature}}°",
  "{{weather.temperature|pad:3}}{{fill_space}}{{datetime.time}}",
  "{{fill_space_repeat:.}}",
  "{{= IF(weather.high > 80, 'HOT', 'MILD') }}",
  "{{weather:sf.temperature}}",
  "{{weather.condition|wrap}}",
  "A\nB\nC\nD\nE\nF\nG",
  "{sun} {star}",
  "{{toString}}",
  "lower case text",
  "{{red}}{{red}}{{green}}",
  "LEFT{{fill_space}}RIGHT\n{{center}}MID",
];

describe("serialization is byte-identical without a charset", () => {
  it("round-trips every legacy template exactly as before", () => {
    const out = LEGACY_TEMPLATES.map((t) => [t, serializeTemplateSimple(parseTemplateSimple(t))]);
    expect(out).toMatchSnapshot();
  });

  it("parses every legacy template to the same document", () => {
    const docs = LEGACY_TEMPLATES.map((t) =>
      JSON.stringify(parseTemplateSimple(t)).replace(/"id":"[0-9a-z]+"/g, '"id":"ID"'),
    );
    expect(docs).toMatchSnapshot();
  });
});

describe("the editor DOM is byte-identical without a charset", () => {
  it("renders the same tree for a split-flap template", async () => {
    vi.useFakeTimers();
    const { container } = render(
      <TemplateEditor
        value={"{{blue}} GOOD MORNING\n{{datetime.time}}{{fill_space}}{{datetime.date}}\n{{red}} 72°\n{{= 1+1 }}"}
        onChange={() => {}}
        deviceType="flagship"
        toolbarProps={{
          templateVariables: {
            variables: { weather: ["temperature"] },
            colors: { red: 63 },
            formatting: { fill_space: { syntax: "{{fill_space}}" } },
          },
        }}
      />,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(stable(container.innerHTML)).toMatchSnapshot();
  });

  it("renders the same tree for a note with no toolbar", async () => {
    vi.useFakeTimers();
    const { container } = render(
      <TemplateEditor value={"HI\n{{green}}"} onChange={() => {}} deviceType="note" showToolbar={false} />,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(stable(container.innerHTML)).toMatchSnapshot();
  });
});
