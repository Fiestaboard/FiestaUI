import { describe, expect, it } from "vitest";

import { hiddenByBoard, isSchemaFieldVisible } from "./visible-when";
import cases from "./visible-when.cases.json";

interface Case {
  name: string;
  properties: Record<string, unknown>;
  values: Record<string, unknown>;
  when: unknown;
  visible: boolean;
  context?: Record<string, unknown>;
}

describe("isSchemaFieldVisible: the hub's shared ui:visible_when vectors", () => {
  it.each((cases.cases as Case[]).map((c) => [c.name, c] as const))("%s", (_name, c) => {
    expect(isSchemaFieldVisible(c.when, c.values, c.properties, c.context ?? null)).toBe(c.visible);
  });

  it("returns at the first failing pair, before a malformed one, as the hub does", () => {
    expect(isSchemaFieldVisible({ mode: "local", other: { bad: 1 } }, { mode: "cloud" })).toBe(false);
    expect(isSchemaFieldVisible({ mode: "cloud", other: { bad: 1 } }, { mode: "cloud" })).toBe(true);
  });

  it("shows a field with no condition", () => {
    expect(isSchemaFieldVisible(undefined, {})).toBe(true);
    expect(isSchemaFieldVisible(null, null, null, null)).toBe(true);
  });
});

describe("hiddenByBoard", () => {
  const properties = { api_mode: { type: "string", default: "cloud" } };

  it("is true when only the board facts hide the field", () => {
    const when = { api_mode: "local", "@device_type": ["flagship", "note"] };
    expect(hiddenByBoard(when, { api_mode: "local" }, properties, { device_type: "note_array" })).toBe(true);
  });

  it("is false when a sibling value hides it too, or nothing hides it", () => {
    const when = { api_mode: "local", "@device_type": ["flagship", "note"] };
    expect(hiddenByBoard(when, {}, properties, { device_type: "note_array" })).toBe(false);
    expect(hiddenByBoard(when, { api_mode: "local" }, properties, { device_type: "note" })).toBe(false);
  });

  it("is false for a condition that reads no board fact, or none at all", () => {
    expect(hiddenByBoard({ api_mode: "local" }, {}, properties, { device_type: "note" })).toBe(false);
    expect(hiddenByBoard(undefined, {}, properties, null)).toBe(false);
  });

  it("follows any / not, and leaves a malformed condition visible", () => {
    const any = { any: [{ "@device_model": "pixoo64" }, { "@device_model": "tc001" }] };
    expect(hiddenByBoard(any, {}, {}, { device_model: "flagship" })).toBe(true);
    expect(hiddenByBoard({ not: { "@device_type": "flagship" } }, {}, {}, { device_type: "flagship" })).toBe(true);
    expect(hiddenByBoard({ "@device_type": { bad: 1 } }, {}, {}, { device_type: "note" })).toBe(false);
  });
});
