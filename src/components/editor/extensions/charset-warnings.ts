/**
 * CharsetWarnings — inline "this board can't draw that" decorations.
 *
 * Walks the document cell by cell and asks the target character set
 * (`charsetIssue` / `charsetFallback` in lib/character-sets) whether each
 * one draws as written. Each cell that does not gets an inline decoration:
 * a wavy underline (styles/editor.css `.charset-warning`), a native `title`
 * saying what will draw instead ("drawn as yellow tile", "drawn as blank"),
 * and `data-charset-issue` with the reason. Nothing blocks typing — this is
 * a reading of the document, never a rewrite of it.
 *
 * The set is plugin STATE, not an extension option: options are read once
 * when the editor is created, and the editor's `charset` prop can change
 * after mount (a board switched in a settings form). The editor pushes a
 * new set through `setCharsetWarningsCharset`, and the plugin re-walks the
 * document on that and on every change to it. The resulting list is also
 * exposed through {@link readCharsetWarnings}, so the editor can render an
 * accessible summary beside the surface.
 *
 * Cells checked are what the serializer will write: text is uppercased
 * unless the set is mixed-case (the editor serializes uppercase for every
 * other set, so a lowercase letter never reaches that board as one), a cell
 * inside a colour-span mark carries its colours, and
 * an icon node is the token `parseLine` emits for `{icon:…}`. Variables,
 * formulas, fill-space and wrapped text have no fixed cells and are skipped.
 */
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { boardIconToken, type BoardToken } from "../../../lib/board-characters";
import type { BoardIconName } from "../../../lib/board-icons";
import { type CharacterSet, charsetFallback, type CharsetIssue, charsetIssue } from "../../../lib/character-sets";
import { characterGlyphName } from "../../board/character-glyph";
import { CURSOR_ANCHOR } from "../constants";
import type { ColorSpanAttrs } from "../utils/serialization";
import { COLOR_SPAN_MARK } from "../utils/serialization";

/** One cell the set cannot draw as written. */
export interface CharsetWarning {
  /** Document range of the cell: one character of text, or an atom node. */
  from: number;
  to: number;
  reason: CharsetIssue;
  /** The cell as the board will receive it. */
  token: BoardToken;
  /** What the board draws there instead. */
  fallback: BoardToken;
  /** The `title` shown on the cell. */
  message: string;
  /**
   * True when the cell is one of the extended forms (a span or an icon) and
   * the set is a split-flap one, which renders them literally until the
   * coordinated release (plan Task 12) — the editor's summary says so.
   */
  literalOnFlap: boolean;
}

export interface CharsetWarningsLabels {
  /** A character the set lacks; `fallback` is the drawn cell's name ("blank", "heart"). */
  unsupportedChar: (fallback: string) => string;
  /** An icon the set has no glyph for; `fallback` is the drawn cell's name ("yellow tile"). */
  unsupportedIcon: (fallback: string) => string;
  /** A colour or block span on a set that cannot colour text. */
  unsupportedSpan: string;
  /** A colour tile on a set without tiles. */
  unsupportedTile: string;
  /** A span or icon on a split-flap set, which draws the markup as text until the coordinated release. */
  literalOnFlap: string;
}

export const DEFAULT_CHARSET_WARNINGS_LABELS: CharsetWarningsLabels = {
  unsupportedChar: (fallback) => `This board can't draw this character — drawn as ${fallback}`,
  unsupportedIcon: (fallback) => `This board has no glyph for this icon — drawn as ${fallback}`,
  unsupportedSpan: "This board can't colour text — drawn without the colour",
  unsupportedTile: "This board has no colour tiles — drawn as blank",
  literalOnFlap: "Renders literally on a split-flap board until FiestaBoard's coordinated release",
};

interface CharsetWarningsState {
  charset: CharacterSet | null;
  warnings: CharsetWarning[];
  decorations: DecorationSet;
}

export const charsetWarningsKey = new PluginKey<CharsetWarningsState>("charsetWarnings");

/** The span colours a node carries, as the token fields the set is asked about. */
function spanOf(node: PMNode): Pick<BoardToken, "color" | "background"> {
  const mark = node.marks.find((m) => m.type.name === COLOR_SPAN_MARK);
  if (!mark) return {};
  const { color, background } = mark.attrs as ColorSpanAttrs;
  const out: Pick<BoardToken, "color" | "background"> = { color };
  if (background) out.background = background;
  return out;
}

/** Black text — `black` or its code — is an unlit letter, the default. */
function isUnlit(color: string | undefined): boolean {
  return color === "black" || color === "70";
}

function messageFor(reason: CharsetIssue, fallback: BoardToken, l: CharsetWarningsLabels): string {
  switch (reason) {
    case "icon":
      return l.unsupportedIcon(characterGlyphName(fallback));
    case "colorSpan":
    case "blockSpan":
      return l.unsupportedSpan;
    case "tile":
      return l.unsupportedTile;
    default:
      return l.unsupportedChar(characterGlyphName(fallback));
  }
}

/**
 * Every cell of `doc` the set cannot draw as written, in document order.
 * Pure: the plugin and the tests both call it.
 */
export function collectCharsetWarnings(
  doc: PMNode,
  set: CharacterSet | null,
  labels: Partial<CharsetWarningsLabels> = {},
): CharsetWarning[] {
  if (!set) return [];
  const l = { ...DEFAULT_CHARSET_WARNINGS_LABELS, ...labels };
  const isFlap = !set.font;
  const warnings: CharsetWarning[] = [];
  const push = (from: number, to: number, token: BoardToken) => {
    const reason = charsetIssue(set, token);
    if (!reason) return;
    // A block span on a set that has blocks but not colour spans keeps its
    // block and drops the letter colour (charsetFallback). When that colour
    // is black — the unlit default, which is what every block picker
    // offers — nothing visible is lost, so there is nothing to warn about.
    if (reason === "colorSpan" && token.background !== undefined && set.blockSpans && isUnlit(token.color)) return;
    const fallback = charsetFallback(set, token);
    const extendedForm = token.icon !== undefined || token.color !== undefined || token.background !== undefined;
    const literalOnFlap =
      isFlap && extendedForm && (reason === "icon" || reason === "colorSpan" || reason === "blockSpan");
    const message = literalOnFlap ? l.literalOnFlap : messageFor(reason, fallback, l);
    warnings.push({ from, to, reason, token, fallback, message, literalOnFlap });
  };

  doc.descendants((node, pos) => {
    if (node.isText) {
      const span = spanOf(node);
      const text = node.text ?? "";
      let offset = 0;
      for (const ch of text) {
        const size = ch.length;
        if (ch !== CURSOR_ANCHOR) {
          // The serializer uppercases for every set but a mixed-case one,
          // so that is what the board sees.
          const value = ch === "❤" ? "♥" : set.mixedCase ? ch : ch.toUpperCase();
          push(pos + offset, pos + offset + size, { type: "char", value, ...span });
        }
        offset += size;
      }
      return false;
    }
    if (node.type.name === "icon") {
      push(pos, pos + node.nodeSize, boardIconToken(node.attrs.name as BoardIconName, spanOf(node)));
      return false;
    }
    if (node.type.name === "colorTile") {
      // By its numeric code, which is what the board is sent for a tile.
      push(pos, pos + node.nodeSize, { type: "color", code: String(node.attrs.code), ...spanOf(node) });
      return false;
    }
    return true;
  });
  return warnings;
}

function decorate(doc: PMNode, warnings: CharsetWarning[]): DecorationSet {
  return DecorationSet.create(
    doc,
    warnings.map((w) => {
      const attrs = { class: "charset-warning", title: w.message, "data-charset-issue": w.reason };
      const node = doc.nodeAt(w.from);
      return node && !node.isText ? Decoration.node(w.from, w.to, attrs) : Decoration.inline(w.from, w.to, attrs);
    }),
  );
}

export interface CharsetWarningsOptions {
  /** The set at creation. Later changes go through {@link setCharsetWarningsCharset}. */
  charset: CharacterSet | null;
  labels: Partial<CharsetWarningsLabels>;
}

export const CharsetWarnings = Extension.create<CharsetWarningsOptions>({
  name: "charsetWarnings",

  addOptions() {
    return { charset: null, labels: {} };
  },

  addProseMirrorPlugins() {
    const { labels } = this.options;
    const build = (doc: PMNode, charset: CharacterSet | null): CharsetWarningsState => {
      const warnings = collectCharsetWarnings(doc, charset, labels);
      return { charset, warnings, decorations: decorate(doc, warnings) };
    };
    return [
      new Plugin<CharsetWarningsState>({
        key: charsetWarningsKey,
        state: {
          init: (_, state) => build(state.doc, this.options.charset),
          apply: (tr, prev, _old, state) => {
            const meta = tr.getMeta(charsetWarningsKey) as { charset: CharacterSet | null } | undefined;
            if (meta) return build(state.doc, meta.charset);
            if (tr.docChanged) return build(state.doc, prev.charset);
            return prev;
          },
        },
        props: {
          decorations(state) {
            return charsetWarningsKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});

/** Give the plugin a new set (or none); returns the transaction to dispatch. */
export function setCharsetWarningsCharset(tr: Transaction, charset: CharacterSet | null): Transaction {
  return tr.setMeta(charsetWarningsKey, { charset });
}

/** The current warnings, for a summary outside the surface. */
export function readCharsetWarnings(state: { plugins: unknown }): CharsetWarning[] {
  return charsetWarningsKey.getState(state as never)?.warnings ?? [];
}
