"use client";

/**
 * IconNode — inline atom for `{{icon:sun}}`.
 *
 * One cell, like a colour tile, drawn by `CharacterGlyph` with the target
 * set (node-views/icon-node-view) so the editor shows what the board will
 * draw: the icon's glyph on an LED set, its tile or character fallback on
 * a flap. Always serialized as the canonical `{{icon:…}}`; the legacy
 * `{sun}` shortcuts are read-only aliases (FiestaBoard D16).
 */
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import type { BoardIconName } from "../../../lib/board-icons";
import { IconNodeView } from "../node-views/icon-node-view";

export interface IconAttrs {
  name: BoardIconName;
}

export const IconNode = Node.create({
  name: "icon",

  group: "inline",

  inline: true,

  atom: true, // Single unit, non-editable

  selectable: false, // Treat as character: arrow keys skip past, shift+arrow selects

  draggable: true, // TipTap-managed drag (integrates with ProseMirror events)

  addAttributes() {
    return {
      name: {
        default: "sun",
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) => ({ "data-name": attributes.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="icon"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "icon" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IconNodeView);
  },
});
