/**
 * ColorSpanMark — the mark behind `{{red:HOT}}` and `{{black/white:OPEN}}`.
 *
 * A span is a MARK, not a node: it is a property of a run of cells (text,
 * tiles, variables, icons alike), the way the LED renderer sees it, so the
 * caret moves through it like plain text and a variable inside it stays a
 * variable. The serializer (utils/serialization `serializeInlineNodes`) wraps
 * each run of identically-marked nodes in one `{{head:…}}`; marks are flat
 * in ProseMirror, so a span inside a span flattens to adjacent runs — the
 * same cells, the same colours.
 *
 * The editor registers it always, so an app composing its own editor from
 * the exported extensions gets the same schema; nothing creates one unless
 * the template parsed with `extendedMarkup` or the toolbar offered it, and
 * the toolbar offers it only when the target set has colour (or block)
 * spans.
 *
 * Rendering is a HINT, not a preview: the text keeps the page's foreground
 * and the board colour is carried on the underline (a colour span) or the
 * border and tint (a block span), so every pair stays readable on a light
 * and a dark page. The faithful colours are in the pickers' glyphs and in
 * `DisplayPreview`. The rules live in styles/editor.css, keyed on
 * `data-type="color-span"` and the `--span-color` / `--span-background`
 * custom properties set here.
 */
import { Mark, mergeAttributes } from "@tiptap/core";

import { getBoardColor, isValidBoardColor } from "../../../lib/board-colors";
import type { ColorSpanAttrs } from "../utils/serialization";
import { COLOR_SPAN_MARK, spanColor } from "../utils/serialization";

/** `red` / `63` / `purple` / `#ff8800` → the hex the mark's hint is drawn in. */
export function spanColorHex(color: string): string {
  if (color.startsWith("#")) return color;
  return isValidBoardColor(color) ? getBoardColor(color) : color;
}

export const ColorSpanMark = Mark.create({
  name: COLOR_SPAN_MARK,

  // Typing at the end of a span extends it, like bold — the natural way to
  // keep writing in the colour you picked. Exiting is the picker's toggle.
  inclusive: true,

  addAttributes() {
    return {
      color: {
        default: "red",
        // Through the head grammar, so pasted HTML can only name a colour.
        parseHTML: (element) => spanColor(element.getAttribute("data-color") ?? ""),
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
      background: {
        default: null,
        parseHTML: (element) => spanColor(element.getAttribute("data-background") ?? ""),
        renderHTML: (attributes) => (attributes.background ? { "data-background": attributes.background } : {}),
      },
    };
  },

  parseHTML() {
    // A pasted span whose colours are not colours is not a span: its text
    // is kept, the mark is not. The attributes are validated here as well as
    // above, so the rule itself is refused rather than falling back to red.
    return [
      {
        tag: 'span[data-type="color-span"]',
        getAttrs: (element) => {
          const color = spanColor(element.getAttribute("data-color") ?? "");
          const background = element.getAttribute("data-background");
          if (color === null) return false;
          if (background !== null && spanColor(background) === null) return false;
          return null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    // Only a validated colour reaches the stylesheet: the custom properties
    // are emitted for colours the head grammar accepts and nothing else, so
    // an attribute that somehow carries more can never become CSS.
    const { color, background } = mark.attrs as ColorSpanAttrs;
    const parts: string[] = [];
    if (spanColor(color ?? "") !== null) parts.push(`--span-color:${spanColorHex(color)}`);
    if (background && spanColor(background) !== null) parts.push(`--span-background:${spanColorHex(background)}`);
    const style = parts.length > 0 ? { style: parts.join(";") } : {};
    return ["span", mergeAttributes({ "data-type": "color-span", ...style }, HTMLAttributes), 0];
  },
});
