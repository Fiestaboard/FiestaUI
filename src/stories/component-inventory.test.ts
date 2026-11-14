/**
 * The inventory is data, so the unit test pins the shape the Inventory story
 * and scripts/ci/tests/component-inventory-coverage.test.mjs both rely on:
 * names unique across sections, and every entry documented.
 */
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES, INVENTORY_SECTIONS } from "./component-inventory";

describe("component inventory", () => {
  it("lists every component once, each with a summary", () => {
    const names = INVENTORY_ENTRIES.map((entry) => entry.name);

    expect(new Set(names).size).toBe(names.length);
    for (const entry of INVENTORY_ENTRIES) expect(entry.summary.length).toBeGreaterThan(0);
  });

  it("flattens the sections in order", () => {
    expect(INVENTORY_ENTRIES).toEqual(INVENTORY_SECTIONS.flatMap((section) => section.entries));
  });

  it("records the touch sizes (slice 1.2) on the controls that have them", () => {
    const summary = (name: string) => INVENTORY_ENTRIES.find((entry) => entry.name === name)?.summary ?? "";

    for (const name of ["Button", "Input", "Switch", "Chip"]) expect(summary(name)).toMatch(/touch/i);
  });
});
