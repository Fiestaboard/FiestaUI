import { describe, expect, it } from "vitest";

import { isSecretField, resolveSchemaControl, schemaEnumOptions } from "./controls";

describe("resolveSchemaControl (08 P9: field → control, semantic)", () => {
  it.each([
    ["password widget", { type: "string", "ui:widget": "password" }, "secret"],
    ["secret: true", { type: "string", secret: true }, "secret"],
    ["string enum", { type: "string", enum: ["c", "f"] }, "select"],
    ["{ values } enum", { type: "string", enum: { values: ["a"] } }, "select"],
    ["integer enum", { type: "integer", enum: [5, 10] }, "select"],
    ["mode-cards", { type: "string", enum: ["local", "cloud"], "ui:widget": "mode-cards" }, "cards"],
    ["mode-cards without enum is text", { type: "string", "ui:widget": "mode-cards" }, "text"],
    ["boolean", { type: "boolean" }, "switch"],
    ["integer", { type: "integer", minimum: 1, maximum: 60 }, "number"],
    ["number", { type: "number" }, "number"],
    ["timezone", { type: "string", "ui:widget": "timezone" }, "timezone"],
    ["textarea widget", { type: "string", "ui:widget": "textarea" }, "textarea"],
    ["format textarea", { type: "string", format: "textarea" }, "textarea"],
    ["url widget", { type: "string", "ui:widget": "url" }, "url"],
    ["format uri", { type: "string", format: "uri" }, "url"],
    ["datetime", { type: "string", "ui:widget": "datetime" }, "datetime"],
    ["plain string", { type: "string" }, "text"],
    ["no type", {}, "text"],
    ["remote-options string, no host widget", { type: "string", "ui:widget": "remote-options" }, "text"],
    ["multi-enum array", { type: "array", items: { type: "string", enum: ["N", "J"] } }, "checklist"],
    ["string array", { type: "array", items: { type: "string" } }, "list"],
    ["untyped items", { type: "array", items: {} }, "list"],
    ["array of objects", { type: "array", items: { type: "object", properties: {} } }, "unsupported"],
    ["array with no items", { type: "array" }, "unsupported"],
    ["object with properties", { type: "object", properties: { a: { type: "string" } } }, "group"],
    ["object without properties", { type: "object" }, "unsupported"],
  ] as const)("%s → %s", (_name, field, control) => {
    expect(resolveSchemaControl(field as never)).toBe(control);
  });

  it("hands a widget the host renders to the host, before anything else", () => {
    expect(resolveSchemaControl({ type: "string", "ui:widget": "page-picker" }, ["page-picker"])).toBe("custom");
    expect(resolveSchemaControl({ type: "string", "ui:widget": "password" }, ["password"])).toBe("custom");
  });
});

describe("schemaEnumOptions", () => {
  it("pairs values with enumNames and falls back to the value", () => {
    expect(schemaEnumOptions({ enum: ["imperial", "metric"], enumNames: ["°F"] })).toEqual([
      { value: "imperial", label: "°F" },
      { value: "metric", label: "metric" },
    ]);
  });

  it("keeps numbers as numbers and drops non-scalars", () => {
    expect(schemaEnumOptions({ enum: [0, 90, { x: 1 } as never] })).toEqual([
      { value: 0, label: "0" },
      { value: 90, label: "90" },
    ]);
  });

  it("is null without an enum", () => {
    expect(schemaEnumOptions(undefined)).toBeNull();
    expect(schemaEnumOptions({ type: "string" })).toBeNull();
    expect(schemaEnumOptions({ enum: [] })).toBeNull();
    expect(schemaEnumOptions({ enum: {} })).toBeNull();
  });
});

describe("isSecretField", () => {
  it("treats ui:widget password and secret: true alike", () => {
    expect(isSecretField({ "ui:widget": "password" })).toBe(true);
    expect(isSecretField({ secret: true })).toBe(true);
    expect(isSecretField({ type: "string" })).toBe(false);
  });
});
