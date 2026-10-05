import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { BOARD_ICON_ALIASES, BOARD_ICONS } from "./board-icons";

/*
 * The data contract FiestaBoard's Python port and its output plugins are
 * checked against lives in scripts/ci/tests/fixtures/. These tests fail
 * when the code drifts from the fixtures; `node scripts/ci/led-fixtures.mjs`
 * regenerates them on purpose.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../scripts/ci/tests/fixtures", name), "utf8"));
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("board data fixtures", () => {
  it("board-icons.json carries the registry and its aliases", () => {
    expect(fixture("board-icons.json")).toEqual(json({ icons: BOARD_ICONS, aliases: BOARD_ICON_ALIASES }));
  });
});
