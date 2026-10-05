import { describe, expect, it } from "vitest";

import { CURSOR_ANCHOR } from "../constants";
import { brushToCell, isPositionalLine, lineToCells, paintLine, renderPositionalLine } from "./draw-mode";
import { calculateLineLength } from "./length-calculator";
import {
  COLOR_SPAN_MARK,
  matchDoubleBrace,
  parseLineContent,
  parseTemplateSimple,
  serializeTemplateSimple,
  spanHead,
} from "./serialization";

/*
 * The extended template markup in the editor: `{{red:HOT}}`, `{{63:HOT}}`,
 * `{{#ff8800:HOT}}`, `{{black/white:OPEN}}`, `{{icon:sun}}`, read under the
 * CLOSED head grammar agreed with FiestaBoard and written back exactly.
 */

const EXT = { extendedMarkup: true };
const roundTrip = (template: string, lines = 1) =>
  serializeTemplateSimple(parseTemplateSimple(template, lines, EXT), lines);
const stripAnchors = (nodes: ReturnType<typeof parseLineContent>) =>
  nodes.filter((n) => !(n.type === "text" && n.text === CURSOR_ANCHOR));

describe("the closed head grammar", () => {
  it("opens a span for a colour name, a code 63–70, #rrggbb and fg/bg", () => {
    expect(spanHead("red")).toEqual({ color: "red", background: null });
    expect(spanHead("Purple")).toEqual({ color: "purple", background: null });
    expect(spanHead("63")).toEqual({ color: "63", background: null });
    expect(spanHead("70")).toEqual({ color: "70", background: null });
    expect(spanHead("#FF8800")).toEqual({ color: "#ff8800", background: null });
    expect(spanHead("black/white")).toEqual({ color: "black", background: "white" });
    expect(spanHead("69/63")).toEqual({ color: "69", background: "63" });
  });

  it("never opens one for filled / 71, a half block, or anything else", () => {
    expect(spanHead("filled")).toBeNull();
    expect(spanHead("71")).toBeNull();
    expect(spanHead("red/")).toBeNull();
    expect(spanHead("/red")).toBeNull();
    expect(spanHead("red/filled")).toBeNull();
    expect(spanHead("weather")).toBeNull();
    expect(spanHead("#fff")).toBeNull();
    expect(spanHead("toString")).toBeNull();
  });

  it("keeps every other head a variable", () => {
    const [node] = stripAnchors(parseLineContent("{{weather:sf.temperature}}", EXT));
    expect(node.type).toBe("variable");
    expect(node.attrs).toMatchObject({ pluginId: "weather:sf", field: "temperature" });
    expect(roundTrip("{{weather:sf.temperature}}")).toBe("{{weather:sf.temperature}}");
    // `{{filled:X}}` is a variable too (filled is a flap, never a hue), and a
    // variable with no dot serializes as the legacy parser always has.
    expect(stripAnchors(parseLineContent("{{filled:X}}", EXT))[0].type).toBe("variable");
  });

  it("balances nested double braces", () => {
    expect(matchDoubleBrace("{{red:{{weather.temp}}°}}", 0)).toBe("{{red:{{weather.temp}}°}}".length);
    expect(matchDoubleBrace("{{red:HOT}} more", 0)).toBe(11);
    expect(matchDoubleBrace("{{red:{{x}}", 0)).toBe(-1);
  });
});

describe("spans and icons parse to marks and atoms", () => {
  it("a colour span is a mark on its text", () => {
    const nodes = stripAnchors(parseLineContent("{{red:HOT}}", EXT));
    expect(nodes).toEqual([
      { type: "text", text: "HOT", marks: [{ type: COLOR_SPAN_MARK, attrs: { color: "red", background: null } }] },
    ]);
  });

  it("a block span carries both colours", () => {
    const [node] = stripAnchors(parseLineContent("{{black/white:OPEN}}", EXT));
    expect(node.marks).toEqual([{ type: COLOR_SPAN_MARK, attrs: { color: "black", background: "white" } }]);
  });

  it("an icon is an atom; {{icon:heart}} is the heart character; an unknown name stays literal", () => {
    expect(stripAnchors(parseLineContent("{{icon:sun}}", EXT))).toEqual([{ type: "icon", attrs: { name: "sun" } }]);
    expect(stripAnchors(parseLineContent("{{icon:STORM}}", EXT))).toEqual([{ type: "icon", attrs: { name: "bolt" } }]);
    expect(stripAnchors(parseLineContent("{{icon:heart}}", EXT))).toEqual([{ type: "text", text: "♥" }]);
    expect(stripAnchors(parseLineContent("{{icon:dragon}}", EXT))).toEqual([{ type: "text", text: "{{icon:dragon}}" }]);
  });

  it("a variable, a tile and an icon inside a span take the mark, anchors included", () => {
    const nodes = parseLineContent("{{red:{{weather.temp}}°{{blue}}{{icon:sun}}}}", EXT);
    const mark = { type: COLOR_SPAN_MARK, attrs: { color: "red", background: null } };
    for (const node of nodes) expect(node.marks).toEqual([mark]);
    expect(stripAnchors(nodes).map((n) => n.type)).toEqual(["variable", "text", "colorTile", "icon"]);
  });

  it("without extendedMarkup nothing changes: a span head is a variable, an icon too", () => {
    const [span] = stripAnchors(parseLineContent("{{red:HOT}}"));
    expect(span.type).toBe("variable");
    const [icon] = stripAnchors(parseLineContent("{{icon:sun}}"));
    expect(icon.type).toBe("variable");
  });
});

describe("round-trips", () => {
  it.each([
    "{{red:HOT}}",
    "{{63:HOT}}",
    "{{#ff8800:HOT}}",
    "{{purple:HOT}}",
    "{{black/white:OPEN}}",
    "{{white/red:LATE}}",
    "{{icon:sun}}",
    "{{icon:sun}}{{icon:rain}}",
    "{{red:{{weather.temp}}°}}",
    "{{red:HOT {{red}}}}",
    "{{red:{{icon:sun}} 72°}}",
    "{{red:{{= 1+1 }}}}",
    "{{red:{{fill_space}}}}",
    "{{red:A}}{{blue:B}}",
    "{{red:A}} {{red:B}}",
    "{{red:START}} MIDDLE {{blue:END}}",
    "PLAIN {{red:HOT}} PLAIN",
    "{{red:HOT}}{{weather.temp}}",
    "{{weather.temp}}{{red:HOT}}",
    "{{red:X}}",
    "{{weather:sf.temperature}} {{red:HOT}}",
    "{{green}}{{red:HOT}}",
    "{{black/white:{{datetime.time}}}}",
    "{{red:HOT}}\n{{icon:sun}}\n\nLAST",
  ])("%s", (template) => {
    const lines = template.split("\n").length;
    expect(roundTrip(template, lines)).toBe(template);
  });

  it("uppercases the text inside a span, like any text", () => {
    expect(roundTrip("{{red:hot}}")).toBe("{{red:HOT}}");
  });

  it("flattens a span in a span to adjacent spans drawing the same cells", () => {
    expect(roundTrip("{{red:A{{blue:B}}C}}")).toBe("{{red:A}}{{blue:B}}{{red:C}}");
  });

  it("merges adjacent runs of the same span", () => {
    expect(roundTrip("{{red:A}}{{red:B}}")).toBe("{{red:AB}}");
  });

  it("keeps the legacy shortcuts and tiles as they were (text, uppercased; {red} normalised)", () => {
    expect(roundTrip("{sun} {red}{63}")).toBe("{SUN} {{red}}{63}");
    expect(roundTrip("{sun} {red}{63}")).toBe(serializeTemplateSimple(parseTemplateSimple("{sun} {red}{63}", 1), 1));
  });

  it("writes the icon name canonically", () => {
    expect(roundTrip("{{icon:x}}")).toBe("{{icon:cross}}");
    expect(roundTrip("{{ICON:Sun}}")).toBe("{{icon:sun}}");
  });

  it("pads and preserves line count with spans at line start and end", () => {
    const t = "{{red:A}}\n\n{{blue:B}}";
    expect(roundTrip(t, 6)).toBe("{{red:A}}\n\n{{blue:B}}\n\n\n");
  });
});

describe("length counting", () => {
  it("treats a span as its content and an icon as one cell", () => {
    const nodes = parseLineContent("{{red:HOT}}{{icon:sun}}{{black/white:{{blue}}X}}", EXT);
    expect(calculateLineLength(nodes)).toBe(3 + 1 + 1 + 1);
  });
});

describe("draw mode", () => {
  it("stamps an icon as one cell and keeps a line with icons positional", () => {
    expect(brushToCell({ kind: "icon", icon: "sun" })).toBe("{{icon:sun}}");
    expect(lineToCells("A{{icon:sun}}B", EXT)).toEqual(["A", "{{icon:sun}}", "B"]);
    expect(isPositionalLine("A{{icon:sun}}B", EXT)).toBe(true);
    expect(isPositionalLine("A{{weather.temp}}B", EXT)).toBe(false);
  });

  it("splits a span into per-cell spans and merges them back through the editor", () => {
    expect(lineToCells("{{red:HOT}}", EXT)).toEqual(["{{red:H}}", "{{red:O}}", "{{red:T}}"]);
    expect(lineToCells("{{black/white:{{icon:sun}}X}}", EXT)).toEqual([
      "{{black/white:{{icon:sun}}}}",
      "{{black/white:X}}",
    ]);
    expect(lineToCells("{{red:A{{blue:B}}C}}", EXT)).toEqual(["{{red:A}}", "{{blue:B}}", "{{red:C}}"]);
    const painted = paintLine("{{red:HOT}}", [{ col: 1, cell: "{{icon:sun}}" }], 22, EXT);
    expect(painted).toBe("{{red:H}}{{icon:sun}}{{red:T}}");
    expect(roundTrip(painted)).toBe("{{red:H}}{{icon:sun}}{{red:T}}");
    expect(roundTrip(paintLine("{{red:HOT}}", [{ col: 3, cell: "!" }], 22, EXT))).toBe("{{red:HOT}}!");
  });

  it("renders positional cells with single braces for the board parser", () => {
    expect(renderPositionalLine("{{red}}A{{icon:sun}}{{red:H}}", EXT)).toBe("{red}A{icon:sun}{red:H}");
  });

  it("without the extended markup reads a span or an icon as a dynamic token, exactly as the editor always has", () => {
    // These are the outputs of the pre-charset draw-mode (the parent of this
    // change, feat/display-preview), recorded by running it: a host that has
    // not been given a set must get byte for byte the same stroke. Note the
    // first `}}` ending a token, as it always did, so `{{red:{{66}}}}` leaves
    // two stray braces.
    const parent: Array<[string, string[], boolean, string, string]> = [
      ["{{red:HOT}}", [], false, " X", ""],
      ["A{{red:HOT}}B", ["A", "B"], false, "AX", "AB"],
      ["{{icon:sun}}", [], false, " X", ""],
      ["{{black/white:OPEN}}", [], false, " X", ""],
      ["{{red:{{66}}}}", ["}", "}"], false, "}X", "}}"],
      ["{{red}}HOT", ["{{red}}", "H", "O", "T"], true, "{{red}}XOT", "{red}HOT"],
    ];
    for (const [line, cells, positional, painted, rendered] of parent) {
      expect(lineToCells(line), line).toEqual(cells);
      expect(isPositionalLine(line), line).toBe(positional);
      expect(paintLine(line, [{ col: 1, cell: "X" }], 22), line).toBe(painted);
      expect(renderPositionalLine(line), line).toBe(rendered);
      // An explicit "off" is the same as no options.
      expect(lineToCells(line, { extendedMarkup: false }), line).toEqual(cells);
    }
  });

  it("caps span nesting like the parser, so a hostile line cannot overflow the stack", () => {
    const deep = "{{red:".repeat(5000) + "X" + "}}".repeat(5000);
    expect(() => lineToCells(deep, EXT)).not.toThrow();
    expect(() => isPositionalLine(deep, EXT)).not.toThrow();
    expect(() => lineToCells(deep)).not.toThrow();
  });
});

describe("span nesting depth", () => {
  const nest = (depth: number, inner: string) => "{{red:".repeat(depth) + inner + "}}".repeat(depth);
  const marksOf = (nodes: ReturnType<typeof parseLineContent>) =>
    stripAnchors(nodes).map((n) => [n.type, n.text ?? n.attrs?.name, n.marks?.[0]?.attrs?.color]);

  it("reads spans eight deep and keeps a ninth-level opener as literal text", () => {
    // Marks are flat, so the innermost span wins: seven red around a blue is
    // a blue X; eight red around a blue opener is red literal text, exactly
    // as parseLine (MAX_SPAN_DEPTH, spec §4.1) treats a ninth level.
    expect(marksOf(parseLineContent(nest(7, "{{blue:X}}"), EXT))).toEqual([["text", "X", "blue"]]);
    expect(marksOf(parseLineContent(nest(8, "{{blue:X}}"), EXT))).toEqual([["text", "{{blue:X}}", "red"]]);
    // Literal text is text: uppercased by the default serializer like any
    // other, kept as typed with preserveCase.
    expect(serializeTemplateSimple(parseTemplateSimple(nest(8, "{{blue:X}}"), 1, EXT), 1)).toBe("{{red:{{BLUE:X}}}}");
    expect(serializeTemplateSimple(parseTemplateSimple(nest(8, "{{blue:X}}"), 1, EXT), 1, { preserveCase: true })).toBe(
      "{{red:{{blue:X}}}}",
    );
  });

  it("never recurses past the cap: 5,000 levels parse without overflowing", () => {
    const deep = nest(5000, "X");
    let nodes!: ReturnType<typeof parseLineContent>;
    expect(() => {
      nodes = parseLineContent(deep, EXT);
    }).not.toThrow();
    expect(stripAnchors(nodes)).toHaveLength(1);
    expect(nodes[0].marks?.[0]?.attrs?.color).toBe("red");
    expect(() => parseLineContent(deep)).not.toThrow();
  });
});

describe("an empty span body", () => {
  it("is kept as literal text, not dropped", () => {
    expect(stripAnchors(parseLineContent("{{red:}}", EXT))).toEqual([{ type: "text", text: "{{red:}}" }]);
    expect(stripAnchors(parseLineContent("{{black/white:}}", EXT))).toEqual([
      { type: "text", text: "{{black/white:}}" },
    ]);
    // Text, so the default serializer uppercases it like any text; with
    // preserveCase (a mixed-case set) it round-trips untouched.
    expect(roundTrip("{{red:}}")).toBe("{{RED:}}");
    expect(roundTrip("A{{red:}}B")).toBe("A{{RED:}}B");
    const keep = (t: string) => serializeTemplateSimple(parseTemplateSimple(t, 1, EXT), 1, { preserveCase: true });
    expect(keep("{{red:}}")).toBe("{{red:}}");
    expect(keep("A{{red:}}B")).toBe("A{{red:}}B");
  });
});

describe("case", () => {
  const lower = "hello {{red:hot}} {{weather.temp}} {{icon:sun}}";

  it("uppercases on serialize by default, as the flap editor always has", () => {
    // Without extendedMarkup the span head is a variable and left alone; the
    // text is uppercased. With it (a flap set still uppercases), the span's
    // text is too.
    // (A dotless "variable" serialises with its empty field, `{{red:hot.}}`
    // — the legacy parser's shape, pinned by the identity snapshots.)
    expect(serializeTemplateSimple(parseTemplateSimple(lower, 1), 1)).toBe(
      "HELLO {{red:hot.}} {{weather.temp}} {{icon:sun.}}",
    );
    expect(serializeTemplateSimple(parseTemplateSimple(lower, 1, { extendedMarkup: true }), 1)).toBe(
      "HELLO {{red:HOT}} {{weather.temp}} {{icon:sun}}",
    );
  });

  it("keeps lowercase with preserveCase, for a mixed-case set", () => {
    const opts = { extendedMarkup: true, preserveCase: true };
    expect(serializeTemplateSimple(parseTemplateSimple(lower, 1, opts), 1, opts)).toBe(lower);
    // Parsing never changes case: the same document, serialized without the
    // flag, is the uppercase template a flap would get.
    expect(serializeTemplateSimple(parseTemplateSimple(lower, 1, opts), 1, { extendedMarkup: true })).toBe(
      "HELLO {{red:HOT}} {{weather.temp}} {{icon:sun}}",
    );
  });

  it("stamps a lowercase character only with preserveCase", () => {
    expect(brushToCell({ kind: "char", char: "a" })).toBe("A");
    expect(brushToCell({ kind: "char", char: "a" }, { preserveCase: true })).toBe("a");
    expect(brushToCell({ kind: "char", char: "A" }, { preserveCase: true })).toBe("A");
    expect(brushToCell({ kind: "char", char: "ü" }, { preserveCase: true })).toBe(" ");
  });
});
