import { Extension } from "@tiptap/core";
import { isHistoryTransaction } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { CURSOR_ANCHOR } from "../constants";
import type { TemplateCanvasRegion } from "../template-canvas-regions";

export interface CanvasProtectionOptions {
  regions: readonly TemplateCanvasRegion[];
  rows: number;
  cols: number;
  onBlocked?: () => void;
}
const key = new PluginKey<CanvasProtectionOptions>("canvasProtection");
const internal = "canvasNavigation";
export const CANVAS_EXTERNAL_CONTENT = "canvasExternalContent";
export function setCanvasProtection(tr: Transaction, options: CanvasProtectionOptions) {
  return tr.setMeta(key, options);
}
interface Unit {
  from: number;
  to: number;
  row: number;
  col: number;
  width: number;
  value: string;
  token?: string;
}
interface Line {
  from: number;
  to: number;
  row: number;
  width: number;
}
function occupied(options: CanvasProtectionOptions, row: number, col: number) {
  return (
    row < options.rows &&
    col < options.cols &&
    options.regions.some(
      ({ area: a }) =>
        [a.row, a.col, a.rows, a.cols].every((n) => Number.isInteger(n) && n > 0) &&
        row >= a.row - 1 &&
        row < a.row - 1 + a.rows &&
        col >= a.col - 1 &&
        col < a.col - 1 + a.cols,
    )
  );
}
export function canvasHasEditableCells(options: CanvasProtectionOptions) {
  for (let row = 0; row < options.rows; row++)
    for (let col = 0; col < options.cols; col++) if (!occupied(options, row, col)) return true;
  return false;
}
function blockedCaret(options: CanvasProtectionOptions, row: number, col: number) {
  if (occupied(options, row, col)) return true;
  return (
    row < options.rows && Array.from({ length: options.cols }, (_, c) => c).every((c) => occupied(options, row, c))
  );
}
function documentGrid(doc: PMNode, options?: CanvasProtectionOptions) {
  const gaps: { pos: number; width: number }[] = [];
  const units: Unit[] = [];
  const lines: Line[] = [];
  let row = 0,
    col = 0,
    start = 1;
  const flowPast = (width: number, pos: number) => {
    const before = col;
    let moved = true;
    while (moved) {
      moved = false;
      for (const region of options?.regions ?? []) {
        const a = region.area;
        if (
          region.text !== "flow" ||
          ![a.row, a.col, a.rows, a.cols].every((n) => Number.isInteger(n) && n > 0) ||
          row < a.row - 1 ||
          row >= Math.min(options!.rows, a.row - 1 + a.rows)
        )
          continue;
        const end = Math.min(options!.cols, a.col - 1 + a.cols);
        if (col < end && col + width > a.col - 1) {
          col = end;
          moved = true;
        }
      }
    }
    if (col > before) gaps.push({ pos: before === 0 ? start : pos, width: col - before });
  };
  doc.firstChild?.forEach((node, offset) => {
    const at = offset + 1;
    if (node.type.name === "hardBreak") {
      flowPast(1, at);
      lines.push({ from: start, to: at, row, width: col });
      row++;
      col = 0;
      start = at + 1;
      return;
    }
    if (node.isText) {
      let pos = at;
      for (const char of node.text ?? "") {
        if (char !== CURSOR_ANCHOR) {
          flowPast(1, pos);
          const value =
            char === " " && !node.marks.length
              ? ""
              : JSON.stringify({ char, marks: node.marks.map((m) => m.toJSON()) });
          units.push({ from: pos, to: pos + char.length, row, col, width: 1, value });
          col++;
        }
        pos += char.length;
      }
    } else {
      const width =
        node.type.name === "variable"
          ? Math.max(4, Number.isFinite(node.attrs.maxLength) ? node.attrs.maxLength : 10)
          : node.type.name === "formula"
            ? (node.attrs.estimatedLength ?? 10)
            : node.type.name === "wrappedText"
              ? Math.max(8, Array.from(node.attrs.text ?? "").length)
              : node.type.name === "fillSpace"
                ? 10
                : 1;
      flowPast(width, at);
      units.push({
        from: at,
        to: at + node.nodeSize,
        row,
        col,
        width,
        token: node.type.name,
        value: JSON.stringify(node.toJSON()),
      });
      col += width;
    }
  });
  flowPast(1, 1 + (doc.firstChild?.content.size ?? 0));
  lines.push({ from: start, to: 1 + (doc.firstChild?.content.size ?? 0), row, width: col });
  return { units, lines, gaps };
}
function cellAt(grid: ReturnType<typeof documentGrid>, pos: number) {
  const line = grid.lines.find((l) => pos >= l.from && pos <= l.to);
  if (!line) return null;
  const next = grid.units.find((u) => u.row === line.row && u.to > pos);
  return { row: line.row, col: next?.col ?? line.width };
}
function touches(unit: Unit, options: CanvasProtectionOptions) {
  if (blockedCaret(options, unit.row, unit.col)) return true;
  for (let c = unit.col; c < Math.min(options.cols, unit.col + unit.width); c++)
    if (occupied(options, unit.row, c)) return true;
  return false;
}
function protectedContent(doc: PMNode, options: CanvasProtectionOptions) {
  const cells = new Map<string, string>();
  for (const unit of documentGrid(doc, options).units) {
    if (!unit.value) continue;
    for (let col = unit.col; col < Math.min(options.cols, unit.col + unit.width); col++)
      if (occupied(options, unit.row, col)) cells.set(`${unit.row}:${col}`, unit.value);
  }
  return JSON.stringify([...cells]);
}
function safeCaret(doc: PMNode, pos: number, direction: number, options: CanvasProtectionOptions) {
  const grid = documentGrid(doc, options);
  const cell = cellAt(grid, pos);
  if (!cell || !blockedCaret(options, cell.row, cell.col)) return null;
  const positions = new Set<number>();
  for (const l of grid.lines) {
    positions.add(l.from);
    positions.add(l.to);
  }
  for (const u of grid.units) {
    positions.add(u.from);
    positions.add(u.to);
  }
  const safe = [...positions].filter((p) => {
    const c = cellAt(grid, p);
    return c && !blockedCaret(options, c.row, c.col);
  });
  const forward = safe.filter((p) => p > pos).sort((a, b) => a - b)[0];
  const backward = safe.filter((p) => p < pos).sort((a, b) => b - a)[0];
  // A short/empty row needs only its reserved blank prefix materialized.
  // This is whitespace, never a canvas node or a mutation of covered text.
  const line = grid.lines.find((l) => l.row === cell.row)!;
  let end = line.width;
  while (end < options.cols && occupied(options, cell.row, end)) end++;
  if (direction >= 0 && end > line.width && end < options.cols && (forward === undefined || forward > line.to))
    return { pos: line.to, padding: end - line.width };
  const target = direction < 0 ? (backward ?? forward) : (forward ?? backward);
  return target === undefined ? null : { pos: target, padding: 0 };
}
export const CanvasProtection = Extension.create<CanvasProtectionOptions>({
  name: "canvasProtection",
  addOptions() {
    return { regions: [], rows: 6, cols: 22 };
  },
  addProseMirrorPlugins() {
    const initial = this.options;
    return [
      new Plugin<CanvasProtectionOptions>({
        key,
        state: { init: () => initial, apply: (tr, previous) => tr.getMeta(key) ?? previous },
        filterTransaction(tr, state) {
          const options = key.getState(state)!;
          if (
            !tr.docChanged ||
            !options.regions.length ||
            tr.getMeta(CANVAS_EXTERNAL_CONTENT) ||
            tr.getMeta(internal) ||
            // Explicit undo/redo restores prior user edits, even after a
            // canvas moved over them. Never strand an undo stack behind a new mask.
            isHistoryTransaction(tr)
          )
            return true;
          let blocked = !canvasHasEditableCells(options);
          // Inspect every step against its own input document: a chained
          // command or a drag/drop cannot bypass protection with a later step.
          tr.steps.forEach((step, i) => {
            const grid = documentGrid(tr.docs[i], options);
            step.getMap().forEach((from, to) => {
              const cell = cellAt(grid, from);
              if (from === to && cell && blockedCaret(options, cell.row, cell.col)) blocked = true;
              if (from < to && grid.units.some((u) => u.from < to && u.to > from && touches(u, options)))
                blocked = true;
            });
          });
          if (!blocked) blocked = protectedContent(state.doc, options) !== protectedContent(tr.doc, options);
          if (blocked) options.onBlocked?.();
          return !blocked;
        },
        appendTransaction(transactions, oldState, state) {
          if (
            transactions.some((tr) => tr.getMeta(internal) || tr.getMeta(CANVAS_EXTERNAL_CONTENT)) ||
            !state.selection.empty
          )
            return null;
          if (!transactions.some((tr) => tr.selectionSet || tr.docChanged || tr.getMeta(key))) return null;
          const options = key.getState(state)!;
          if (!options.regions.length) return null;
          const target = safeCaret(
            state.doc,
            state.selection.from,
            state.selection.from < oldState.selection.from ? -1 : 1,
            options,
          );
          if (!target || (target.padding && transactions.some((tr) => tr.getMeta(key)))) return null;
          const tr = state.tr.setMeta(internal, true).setMeta("addToHistory", false);
          if (target.padding) tr.insertText(" ".repeat(target.padding), target.pos);
          return tr.setSelection(TextSelection.create(tr.doc, target.pos + target.padding));
        },
        props: {
          handleKeyDown(view, event) {
            if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || !view.state.selection.empty)
              return false;
            const options = key.getState(view.state)!;
            if (!options.regions.length) return false;
            const head = view.state.selection.head;
            const grid = documentGrid(view.state.doc, options);
            const line = grid.lines.find((l) => head >= l.from && head <= l.to);
            let candidate: number | undefined;
            let direction = 1;
            if (event.key === "ArrowLeft") {
              candidate = head - 1;
              direction = -1;
            }
            if (event.key === "ArrowRight") candidate = head + 1;
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              const current = cellAt(grid, head);
              const delta = event.key === "ArrowUp" ? -1 : 1;
              const targetLine = grid.lines.find((l) => l.row === (current?.row ?? -2) + delta);
              if (current && targetLine) {
                const unit = grid.units.find((u) => u.row === targetLine.row && u.col + u.width > current.col);
                candidate = unit?.from ?? targetLine.to;
                // Prefer editable text on the destination row. A fully
                // covered row instead skips in the arrow's travel direction.
                direction = blockedCaret(options, targetLine.row, options.cols) ? delta : 1;
              }
            }
            if (event.key === "Home") candidate = line?.from;
            if (event.key === "End") {
              candidate = line?.to;
              direction = -1;
            }
            if (candidate === undefined || candidate < 1 || candidate > view.state.doc.content.size - 1) return false;
            const target = safeCaret(view.state.doc, candidate, direction, options);
            if (!target) return false;
            event.preventDefault();
            const tr = view.state.tr.setMeta(internal, true).setMeta("addToHistory", false);
            if (target.padding) tr.insertText(" ".repeat(target.padding), target.pos);
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, target.pos + target.padding)).scrollIntoView());
            return true;
          },
          decorations(state) {
            const options = key.getState(state)!;
            if (!options.regions.length) return DecorationSet.empty;
            const grid = documentGrid(state.doc, options);
            const decorations = grid.gaps.map(({ pos, width }) =>
              Decoration.widget(
                pos,
                () => {
                  const span = document.createElement("span");
                  span.className = "canvas-flow-gap";
                  span.style.width = `${width}ch`;
                  span.contentEditable = "false";
                  span.setAttribute("aria-hidden", "true");
                  return span;
                },
                { side: -1, ignoreSelection: true },
              ),
            );
            for (const unit of grid.units) {
              if (!unit.token) continue;
              decorations.push(
                Decoration.node(unit.from, unit.to, {
                  class: `canvas-cell-token canvas-cell-${unit.token}`,
                  style: `--canvas-token-width: ${unit.width}ch`,
                }),
              );
            }
            return DecorationSet.create(state.doc, decorations);
          },
          handleDOMEvents: {
            focus(view) {
              // Focus can arrive by Tab without any preceding selection transaction.
              view.dispatch(view.state.tr.setSelection(view.state.selection));
              return false;
            },
          },
        },
      }),
    ];
  },
});
