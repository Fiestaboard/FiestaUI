import { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

import { materializeCharacterSet } from "../../../lib/character-sets";
import { TICKER_MONO_CHARSET } from "../../../lib/charset-golden-cases";
import { COLOR_SPAN_MARK } from "../utils/serialization";
import { collectCharsetWarnings } from "./charset-warnings";

/*
 * The warning walk reads node types, attrs and marks; a minimal schema with
 * the same names stands in for the editor's, so the tokens it hands the set
 * can be asserted exactly.
 */
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph" },
    paragraph: { content: "inline*" },
    text: { group: "inline" },
    colorTile: { group: "inline", inline: true, atom: true, attrs: { color: {}, code: {} } },
    icon: { group: "inline", inline: true, atom: true, attrs: { name: {} } },
  },
  marks: { [COLOR_SPAN_MARK]: { attrs: { color: {}, background: { default: null } } } },
});

describe("collectCharsetWarnings", () => {
  it("hands the set a tile token by its numeric code, as the board receives it", () => {
    // The ticker set has no tiles, so the tile is an issue; its token must
    // carry the code the editor serializes to, not the colour's name.
    const ticker = materializeCharacterSet(TICKER_MONO_CHARSET);
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.node("colorTile", { color: "red", code: 63 }),
        schema.text("A"),
        schema.node("colorTile", { color: "purple", code: 68 }, undefined, [
          schema.mark(COLOR_SPAN_MARK, { color: "red", background: "white" }),
        ]),
      ]),
    ]);
    const warnings = collectCharsetWarnings(doc, ticker);
    expect(warnings.map((w) => w.reason)).toEqual(["tile", "tile"]);
    expect(warnings[0].token).toEqual({ type: "color", code: "63" });
    expect(warnings[1].token).toEqual({ type: "color", code: "68", color: "red", background: "white" });
  });
});
