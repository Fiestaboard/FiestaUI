/**
 * Template string ↔ TipTap document serialization
 * Handles parsing and serializing template syntax while maintaining compatibility
 */

import type { JSONContent } from "@tiptap/react";

import { resolveBoardIconName } from "../../../lib/board-icons";
import {
  BOARD_COLOR_CODES,
  CURSOR_ANCHOR,
  DEFAULT_BOARD_LINES,
  FILL_SPACE_REPEAT_VAR,
  FILL_SPACE_VAR,
} from "../constants";

/**
 * Zero-width space (U+200B) inserted at the start and end of each line so
 * the caret always has a text node to sit in (fixes cursor not showing at
 * line boundaries and cursor "selecting" atom nodes on arrow navigation).
 * Stripped on serialize so it never appears in saved template strings.
 *
 * Now shared from ../constants (CURSOR_ANCHOR) — see the note there.
 */
const CURSOR_ANCHOR_CHAR = CURSOR_ANCHOR;

/**
 * How {@link parseLineContent} reads a template and how
 * {@link serializeTemplateSimple} writes it back. The defaults are the
 * parser and serializer the editor has always had; `extendedMarkup` adds
 * the LED-era forms and `preserveCase` keeps typed lowercase.
 */
export interface TemplateMarkupOptions {
  /**
   * Read the extended markup: colour spans `{{red:HOT}}`, block spans
   * `{{black/white:OPEN}}` and icons `{{icon:sun}}`, with the CLOSED head
   * grammar of {@link spanHead} — any other head stays a variable, so
   * `{{weather:sf.temperature}}` is untouched. Off by default: without it
   * every template parses exactly as before, which is what a host that has
   * not been given a character set gets. The editor turns it on whenever it
   * knows the target's set, including a split-flap one, so the warnings can
   * say what a flap will do with a span.
   */
  extendedMarkup?: boolean;
  /**
   * Keep letter case on serialize. The split-flap set is uppercase only, so
   * the default uppercases every text cell, as the editor always has; a
   * mixed-case set (`CharacterSet.mixedCase`: the LED faces) draws lowercase
   * as itself, so the editor keeps what was typed, in the surface and in
   * the template. Parsing never changes case either way.
   */
  preserveCase?: boolean;
}

/**
 * How deep spans may nest, the same cap as the board parser's
 * `MAX_SPAN_DEPTH` (spec §4.1): a span at the top level is depth 1. An opener
 * that would open a ninth level is kept as literal text — the whole token,
 * since marks are flat and a nested span flattens on the next round-trip
 * anyway — so a hostile template cannot recurse without bound. The board
 * parser differs in one detail: it still reads tiles and icons inside a
 * literal ninth-level opener, where this keeps the token whole; both are
 * pathological input, and neither recurses.
 */
export const MAX_TEMPLATE_SPAN_DEPTH = 8;

/** The mark name a colour or block span carries (extensions/color-span-mark). */
export const COLOR_SPAN_MARK = "colorSpan";

/** Attributes of a {@link COLOR_SPAN_MARK} mark. */
export interface ColorSpanAttrs {
  /** The span's text colour, spelled as written: `red`, `63`, `#ff8800`, `purple`. */
  color: string;
  /** The lit background of a block span, or `null` for a plain colour span. */
  background: string | null;
}

/**
 * Simplified parser - treats template as single block with line breaks.
 * @param maxLines  Number of lines for this device (6 for Flagship, 3 for Note).
 *                  Used only for padding (ensures at least maxLines lines).
 */
export function parseTemplateSimple(
  template: string,
  maxLines = DEFAULT_BOARD_LINES,
  options: TemplateMarkupOptions = {},
): JSONContent {
  const lines = template.split("\n");

  // Build a single paragraph with content and hardBreaks between lines
  const content: JSONContent[] = [];

  lines.forEach((line, index) => {
    // Leading ZWS so cursor renders at the start of the line
    content.push({ type: "text", text: CURSOR_ANCHOR_CHAR });

    // Parse line content (plain text, no alignment prefixes to extract)
    if (line) {
      const lineNodes = parseLineContent(line, options);
      content.push(...lineNodes);
    }

    // Trailing ZWS so cursor renders at the end of the line
    content.push({ type: "text", text: CURSOR_ANCHOR_CHAR });

    // Add hard break between lines (except after last line)
    if (index < lines.length - 1) {
      content.push({ type: "hardBreak" });
    }
  });

  // Pad with empty breaks to ensure maxLines total; each padded line gets ZWS so cursor shows
  const currentLines = lines.length;
  for (let i = currentLines; i < maxLines; i++) {
    if (content.length > 0 && content[content.length - 1].type !== "hardBreak") {
      content.push({ type: "hardBreak" });
    }
    // Leading + trailing ZWS (on empty lines they collapse to one, but keep
    // the pair for consistency with content lines)
    content.push({ type: "text", text: CURSOR_ANCHOR_CHAR });
    content.push({ type: "text", text: CURSOR_ANCHOR_CHAR });
    if (i < maxLines - 1) {
      content.push({ type: "hardBreak" });
    }
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content.length > 0 ? content : undefined,
      },
    ],
  };
}

/**
 * Simplified serializer - converts back to plain text with \n.
 * @param maxLines  Number of lines for this device (6 for Flagship, 3 for Note).
 * @param options   `preserveCase` keeps typed lowercase (a mixed-case set).
 */
export function serializeTemplateSimple(
  doc: JSONContent,
  maxLines = DEFAULT_BOARD_LINES,
  options: TemplateMarkupOptions = {},
): string {
  const serializeNode = (node: JSONContent) => serializeNodeContent(node, options.preserveCase === true);
  const emptyResult = Array.from({ length: maxLines }, () => "").join("\n");

  if (!doc.content || doc.content.length === 0) {
    return emptyResult;
  }

  const lines: string[] = [];
  let currentLine: JSONContent[] = [];

  // Get the first paragraph (should be the only one)
  const paragraph = doc.content[0];
  if (!paragraph || !paragraph.content) {
    return emptyResult;
  }

  // Iterate through paragraph content
  for (const node of paragraph.content) {
    if (node.type === "hardBreak") {
      lines.push(serializeInlineNodes(currentLine, serializeNode));
      currentLine = [];
    } else {
      currentLine.push(node);
    }
  }

  // Always push the final line (even if empty) to preserve line count
  lines.push(serializeInlineNodes(currentLine, serializeNode));

  // Pad to at least maxLines (but don't truncate if over)
  while (lines.length < maxLines) {
    lines.push("");
  }

  return lines.join("\n");
}

/** The `{{head:` a node's colour-span mark opens, or `null` when it has none. */
export function spanHeadOf(node: JSONContent): string | null {
  const mark = node.marks?.find((m) => m.type === COLOR_SPAN_MARK);
  if (!mark) return null;
  const { color, background } = (mark.attrs ?? {}) as Partial<ColorSpanAttrs>;
  if (!color) return null;
  return background ? `${color}/${background}` : color;
}

/**
 * Serialize one line's inline nodes, wrapping each run of nodes that share a
 * colour-span mark in `{{head:…}}`. A mark is flat in ProseMirror, so a span
 * inside a span was flattened on parse and comes back as adjacent spans —
 * the same cells, drawn the same.
 *
 * Nodes that serialize to nothing (a cursor-anchor ZWS) are transparent: they
 * neither open nor close a span, because the anchors around an atom inside a
 * span carry no mark of their own and must not split `{{red:HOT {{x.y}}}}`
 * into three.
 *
 * Shared by the document serializer and the clipboard serializer so the two
 * can never disagree about where a span starts and ends.
 */
export function serializeInlineNodes(nodes: JSONContent[], serializeNode: (node: JSONContent) => string): string {
  let out = "";
  let open: string | null = null;
  for (const node of nodes) {
    const body = serializeNode(node);
    if (body === "") continue;
    const head = spanHeadOf(node);
    if (head !== open) {
      if (open !== null) out += "}}";
      if (head !== null) out += `{{${head}:`;
      open = head;
    }
    out += body;
  }
  if (open !== null) out += "}}";
  return out;
}

/**
 * Serialize a single node to string
 */
function serializeNodeContent(node: JSONContent, preserveCase: boolean): string {
  switch (node.type) {
    case "text": {
      // Strip end-of-line cursor placeholder and convert to uppercase
      // (uppercase is the board's only case — see BOARD_CHARS), unless the
      // target set draws lowercase.
      const text = (node.text || "").replaceAll(CURSOR_ANCHOR_CHAR, "");
      return preserveCase ? text : text.toUpperCase();
    }

    case "variable": {
      const filters: TemplateFilter[] = node.attrs?.filters || [];
      const filterStr = filters.map((f) => `|${f.name}${serializeFilterArg(f)}`).join("");
      return `{{${node.attrs?.pluginId}.${node.attrs?.field}${filterStr}}}`;
    }

    case "colorTile":
      return `{{${node.attrs?.color}}}`;

    case "fillSpace": {
      const repeatChar = node.attrs?.repeatChar;
      if (repeatChar && repeatChar !== " ") {
        return `{{${FILL_SPACE_REPEAT_VAR}:${repeatChar}}}`;
      }
      return `{{${FILL_SPACE_VAR}}}`;
    }

    case "wrappedText":
      return `{{${node.attrs?.text}|wrap}}`;

    case "formula":
      return `{{= ${node.attrs?.expression} }}`;

    // Always the canonical `{{icon:…}}`; the legacy `{sun}` shortcuts are
    // read-only aliases (FiestaBoard D16) and are never written back.
    case "icon":
      return `{{icon:${node.attrs?.name}}}`;

    default:
      return "";
  }
}

/**
 * A parsed variable filter, e.g. `|pad:3` → `{ name: "pad", arg: "3" }`.
 *
 * `arg` (singular string) is the contract: it is what {@link parseVariable}
 * produces, what the filter picker produces, and what VariableNode declares as
 * its `filters` attribute. `args` is tolerated on read only — see below.
 */
export interface TemplateFilter {
  name: string;
  arg?: string;
  /** @deprecated Legacy plural form; accepted on read, never written. */
  args?: string[];
}

/**
 * Render a filter's argument suffix (`":3"`, or `""` when it takes none).
 *
 * PORTED FIX: the app's serializer read `f.args` (a plural string ARRAY) while
 * every producer wrote `f.arg` (a singular string) — so the branch never fired
 * and every filter argument was silently dropped on save. `{{t.temp|pad:3}}`
 * round-tripped to `{{t.temp|pad}}`, changing what the board rendered. We read
 * the canonical `arg` first and still accept the legacy `args` array so any
 * document already persisted in the plural shape keeps serializing.
 */
function serializeFilterArg(filter: TemplateFilter): string {
  if (filter.arg !== undefined && filter.arg !== "") return `:${filter.arg}`;
  if (filter.args && filter.args.length > 0) return `:${filter.args.join(",")}`;
  return "";
}

/** Node types that are inline atoms (cursor can't sit inside them). */
const ATOM_NODE_TYPES = new Set(["variable", "colorTile", "fillSpace", "formula", "icon"]);

/** Tokenizer patterns for {@link parseLineContent}. Hoisted to module scope so
 * the per-character `while` loop doesn't re-allocate a fresh RegExp each
 * iteration. None use the `g`/`y` flags, so there is no `lastIndex` state. */
const DOUBLE_TOKEN_RE = /^\{\{([^}]+)\}\}/;
const SINGLE_TOKEN_RE = /^\{([a-z]+)\}/i;
const NEXT_TOKEN_RE = /\{\{|\{[a-z]+\}/i;

// ── The closed head grammar ───────────────────────────────────────────────────

/** `{{63:…}}`–`{{70:…}}`: the colour codes a span may name. Never 71 (filled is a flap, not a hue). */
const SPAN_CODE_RE = /^6[3-9]$|^70$/;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/**
 * One colour of a span head: a board colour name (`red`…`black`, and the
 * `purple` alias), a tile code `63`–`70`, or `#rrggbb`. `null` for anything
 * else — including `filled` / `71`, which name a flap rather than a colour
 * a glyph could be drawn in. Spelling is kept as written, lowercased.
 */
export function spanColor(head: string): string | null {
  const lower = head.toLowerCase();
  if (Object.hasOwn(BOARD_COLOR_CODES, lower)) return lower;
  if (SPAN_CODE_RE.test(lower)) return lower;
  if (HEX_COLOR_RE.test(lower)) return lower;
  return null;
}

/**
 * The CLOSED head grammar, agreed with FiestaBoard: a head is a colour
 * (`red:`), `fg/bg` (`black/white:`), or the literal `icon` (handled by the
 * caller). Nothing else opens a span — `{{weather:sf.temperature}}` is a
 * variable, and FiestaBoard reserves the colour names, the codes and `icon`
 * as plugin ids so the two grammars can never collide. A block span always
 * names both colours: `{{/red:A}}` and `{{red/:A}}` are not spans.
 */
export function spanHead(head: string): ColorSpanAttrs | null {
  const slash = head.indexOf("/");
  if (slash === -1) {
    const color = spanColor(head);
    return color ? { color, background: null } : null;
  }
  const color = spanColor(head.slice(0, slash));
  const background = spanColor(head.slice(slash + 1));
  return color && background ? { color, background } : null;
}

/**
 * Index just past the `}}` that balances the `{{` at `open`, counting nested
 * `{{…}}` pairs so a span can hold a variable or a tile (`{{red:{{x.y}}°}}`);
 * -1 when unbalanced.
 */
export function matchDoubleBrace(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    if (text.startsWith("{{", i)) {
      depth++;
      i += 2;
    } else if (text.startsWith("}}", i)) {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else {
      i++;
    }
  }
  return -1;
}

/** Stamp a colour-span mark on every node of a span body (atoms included). */
function withSpanMark(nodes: JSONContent[], attrs: ColorSpanAttrs): JSONContent[] {
  const mark = { type: COLOR_SPAN_MARK, attrs: { ...attrs } };
  return nodes.map((node) => {
    // An inner span's mark wins: marks are flat, so nesting flattens to
    // adjacent runs — the same cells, the same colours.
    if (node.marks?.some((m) => m.type === COLOR_SPAN_MARK)) return node;
    return { ...node, marks: [...(node.marks ?? []), mark] };
  });
}

/**
 * Parse line content into TipTap nodes
 * Exported for use in insertion utilities
 */
export function parseLineContent(text: string, options: TemplateMarkupOptions = {}): JSONContent[] {
  return parseInline(text, options, 0);
}

/** {@link parseLineContent} at a span nesting `depth` (0 outside any span). */
function parseInline(text: string, options: TemplateMarkupOptions, depth: number): JSONContent[] {
  const extended = options.extendedMarkup === true;
  const nodes: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Try to match double-bracket tokens {{...}}. With the extended markup
    // the token ends at the `}}` that balances its own `{{`, so a span body
    // may hold a variable or a tile; without it, the first `}}` ends it,
    // exactly as before.
    let doubleMatch: { content: string; length: number } | null = null;
    if (extended) {
      if (remaining.startsWith("{{")) {
        const end = matchDoubleBrace(remaining, 0);
        if (end !== -1 && end > 4) doubleMatch = { content: remaining.slice(2, end - 2), length: end };
      }
    } else {
      const m = remaining.match(DOUBLE_TOKEN_RE);
      if (m) doubleMatch = { content: m[1], length: m[0].length };
    }
    if (doubleMatch) {
      const { content, length } = doubleMatch;

      // Check if it's a color
      const colorName = content.toLowerCase();
      if (Object.hasOwn(BOARD_COLOR_CODES, colorName)) {
        nodes.push({
          type: "colorTile",
          attrs: {
            color: colorName,
            code: BOARD_COLOR_CODES[colorName as keyof typeof BOARD_COLOR_CODES],
          },
        });
      }
      // Check if it's fill_space
      else if (content.toLowerCase() === FILL_SPACE_VAR) {
        nodes.push({
          type: "fillSpace",
          attrs: {
            id: newFillSpaceId(),
          },
        });
      }
      // Check if it's fill_space_repeat with optional character
      else if (content.toLowerCase().startsWith(FILL_SPACE_REPEAT_VAR)) {
        let repeatChar = " "; // default
        if (content.includes(":")) {
          const parts = content.split(":");
          if (parts.length > 1 && parts[1]) {
            repeatChar = parts[1];
          }
        }
        nodes.push({
          type: "fillSpace",
          attrs: {
            id: newFillSpaceId(),
            repeatChar,
          },
        });
      }
      // Formula expression: {{= ... }} — parse as a formula node
      else if (content.trimStart().startsWith("=")) {
        const expression = content.trimStart().slice(1).trim();
        nodes.push({
          type: "formula",
          attrs: { expression },
        });
      }
      // The extended markup, under the closed head grammar.
      else if (extended && parseExtendedToken(content, nodes, depth)) {
        // handled
      }
      // Otherwise it's a variable
      else {
        const { varPath, filters } = parseVariable(content);
        // Keep full path after plugin id (e.g. "parks.0.rides.0.ride_abbr" not just "parks")
        const firstDot = varPath.indexOf(".");
        const pluginId = firstDot === -1 ? varPath : varPath.slice(0, firstDot);
        const field = firstDot === -1 ? "" : varPath.slice(firstDot + 1);

        nodes.push({
          type: "variable",
          attrs: {
            pluginId: pluginId || "",
            field: field || "",
            filters,
          },
        });
      }

      remaining = remaining.slice(length);
      continue;
    }

    // Try to match single-bracket tokens {token}
    const singleMatch = remaining.match(SINGLE_TOKEN_RE);
    if (singleMatch) {
      const tokenName = singleMatch[1].toLowerCase();

      // Check if it's a color (single bracket color syntax)
      if (Object.hasOwn(BOARD_COLOR_CODES, tokenName)) {
        nodes.push({
          type: "colorTile",
          attrs: {
            color: tokenName,
            code: BOARD_COLOR_CODES[tokenName as keyof typeof BOARD_COLOR_CODES],
          },
        });
        remaining = remaining.slice(singleMatch[0].length);
        continue;
      }

      // Unmatched {token} (e.g. {sun}) - treat as plain text
      nodes.push({
        type: "text",
        text: singleMatch[0],
      });
      remaining = remaining.slice(singleMatch[0].length);
      continue;
    }

    // Plain text - collect until next special token
    const nextToken = remaining.search(NEXT_TOKEN_RE);
    if (nextToken === -1) {
      // Rest is plain text
      if (remaining) {
        nodes.push({
          type: "text",
          text: remaining,
        });
      }
      break;
    } else if (nextToken > 0) {
      // Text before next token
      nodes.push({
        type: "text",
        text: remaining.slice(0, nextToken),
      });
      remaining = remaining.slice(nextToken);
    } else {
      // Token is at start but didn't match - treat first char as text
      nodes.push({
        type: "text",
        text: remaining[0],
      });
      remaining = remaining.slice(1);
    }
  }

  // Post-process: insert a ZWS text node immediately before AND after every
  // atom inline node so the caret always has a text-offset anchor adjacent
  // to the atom. Without this, ProseMirror's domFromPos lands the caret on
  // a P-element offset between siblings, which Safari mis-renders: the
  // visual caret falls in the wrong place, arrow keys appear stuck, and
  // typed input is routed past the atom instead of inserted next to it.
  // Adjacent text nodes with the same marks merge inside PM, so doubled
  // ZWS (e.g. preceding text + atom-leading ZWS) collapse into one node.
  // An anchor beside an atom inside a span takes the span's mark, so it
  // merges with the span's text rather than splitting the run.
  const result: JSONContent[] = [];
  for (const node of nodes) {
    if (ATOM_NODE_TYPES.has(node.type!)) {
      const anchor: JSONContent = node.marks
        ? { type: "text", text: CURSOR_ANCHOR_CHAR, marks: node.marks }
        : { type: "text", text: CURSOR_ANCHOR_CHAR };
      result.push(anchor);
      result.push(node);
      result.push(anchor);
    } else {
      result.push(node);
    }
  }
  return result;
}

/**
 * `icon:sun`, `red:HOT`, `black/white:OPEN` → the nodes they parse to, pushed
 * onto `nodes`. False when the content is not an extended token, so the
 * caller falls through to the variable branch — the closed grammar's
 * promise that `{{weather:sf.temperature}}` is a variable.
 *
 * An `icon:` head with a name the registry does not know is kept as literal
 * text, so it round-trips untouched (and the warnings can say so) rather
 * than becoming a variable of a reserved plugin id. A span with an empty
 * body (`{{red:}}`) is literal text too — there is nothing to mark, and
 * dropping it would make the value and the document disagree. A span past
 * {@link MAX_TEMPLATE_SPAN_DEPTH} is literal text as well.
 */
function parseExtendedToken(content: string, nodes: JSONContent[], depth: number): boolean {
  const colon = content.indexOf(":");
  if (colon <= 0) return false;
  const head = content.slice(0, colon);
  const body = content.slice(colon + 1);
  if (head.toLowerCase() === "icon") {
    const raw = body.trim().toLowerCase();
    // `{{icon:heart}}` is the ♥ character, not an icon — as in parseLine.
    if (raw === "heart") {
      nodes.push({ type: "text", text: "♥" });
      return true;
    }
    const name = resolveBoardIconName(raw);
    nodes.push(name ? { type: "icon", attrs: { name } } : { type: "text", text: `{{${content}}}` });
    return true;
  }
  const span = spanHead(head);
  if (!span) return false;
  if (body === "" || depth >= MAX_TEMPLATE_SPAN_DEPTH) {
    nodes.push({ type: "text", text: `{{${content}}}` });
    return true;
  }
  const inner = parseInline(body, { extendedMarkup: true }, depth + 1);
  nodes.push(...withSpanMark(inner, span));
  return true;
}

/**
 * Opaque id for a fillSpace node, so React keys and node identity stay stable.
 * (Was an inline `Math.random().toString(36).substr(2, 9)`; `substr` is
 * deprecated, so this uses `slice` — same shape, same collision behavior.)
 */
function newFillSpaceId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Parse variable expression with filters
 */
function parseVariable(expr: string): { varPath: string; filters: TemplateFilter[] } {
  const parts = expr.split("|");
  const varPath = parts[0].trim();
  const filters = parts.slice(1).map((f) => {
    const colonIndex = f.indexOf(":");
    if (colonIndex === -1) {
      return { name: f.trim() };
    }
    return {
      name: f.slice(0, colonIndex).trim(),
      arg: f.slice(colonIndex + 1).trim(),
    };
  });

  return { varPath, filters };
}
