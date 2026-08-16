/**
 * Filter Picker Content - Filter options for toolbar
 * Can apply filters to selected variables or insert filter text
 */
"use client";

import type { Editor } from "@tiptap/react";
import { AlertCircle } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Stack } from "../layout/stack";
import { Code } from "../typography/code";
import { Text } from "../typography/text";

export interface FilterPickerLabels {
  noFiltersAvailable: string;
  selectVariableFirst: string;
  filterDescWrap: string;
  filterDescPad: string;
  filterDescTruncate: string;
  wrapInstruction: string;
  /** The template snippet is syntax — it stays verbatim in every locale. */
  exampleLabel: (example: string) => string;
}

export const DEFAULT_FILTER_PICKER_LABELS: FilterPickerLabels = {
  noFiltersAvailable: "No filters available",
  selectVariableFirst: "Select a variable first to apply a filter, or click to insert filter text.",
  filterDescWrap: "Wraps long text across multiple lines",
  filterDescPad: "Pads text to specified width",
  filterDescTruncate: "Truncates text to specified length",
  wrapInstruction: "Wraps long text. Leave empty lines below for text to flow into.",
  exampleLabel: (example) => `Example: ${example}`,
};

export interface FilterPickerContentProps {
  /** Filter names as declared by the template engine, e.g. `["wrap", "pad:3"]`. */
  filters: string[];
  /**
   * The live TipTap editor, so a picked filter can be applied to the variable
   * under the caret. `null` degrades to plain text insertion via `onInsert`.
   */
  editor: Editor | null;
  onInsert?: (filter: string) => void;
  labels?: Partial<FilterPickerLabels>;
}

/** A variable node in the document, plus the position `setNodeMarkup` needs. */
interface VariableMatch {
  node: { attrs: Record<string, any> };
  pos: number;
}

/**
 * The variable node the selection is inside of, or that it spans.
 *
 * One function, two callers: the app inlined this walk twice — once to apply a
 * filter, once to decide whether to show the "select a variable first" hint —
 * which is two chances for the hint and the button to disagree about what the
 * caret is on. Both still read the live selection, so the answer is computed
 * fresh at click time rather than captured during render.
 */
function findVariableNode(editor: Editor): VariableMatch | null {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Walk up the node tree to find if we're inside a variable node
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "variable") {
      return { node, pos: $from.before(depth) };
    }
  }

  // Also check if selection spans a variable node
  let spanned: VariableMatch | null = null;
  state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (spanned) return false;
    if (node.type.name === "variable") {
      spanned = { node, pos };
      return false; // Stop searching
    }
  });
  return spanned;
}

/** True when the caret sits inside a node of the given type. */
function isInsideNode(editor: Editor, typeName: string): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === typeName) return true;
  }
  return false;
}

export function FilterPickerContent({ filters, editor, onInsert, labels }: FilterPickerContentProps) {
  const l = { ...DEFAULT_FILTER_PICKER_LABELS, ...labels };

  if (filters.length === 0) {
    return (
      <Text tone="muted" className="p-3">
        {l.noFiltersAvailable}
      </Text>
    );
  }

  // Drives the hint below; the click handler re-reads the selection itself.
  const hasVariableSelected = editor !== null && findVariableNode(editor) !== null;

  const handleFilterClick = (filterName: string) => {
    if (!editor) {
      onInsert?.(`|${filterName}`);
      return;
    }

    const { state } = editor;
    const { selection } = state;
    const variableMatch = findVariableNode(editor);

    if (variableMatch) {
      // Apply filter to the selected variable
      const currentFilters = variableMatch.node.attrs.filters || [];
      const filterNameOnly = filterName.split(":")[0]; // Extract name from "pad:3"

      // Check if filter already exists
      const filterExists = currentFilters.some((f: { name: string }) => f.name === filterNameOnly);

      if (!filterExists) {
        // Parse filter (handle pad:3, truncate:5, etc.)
        const filterParts = filterName.split(":");
        const newFilter = {
          name: filterParts[0],
          arg: filterParts[1] || undefined,
        };

        const updatedFilters = [...currentFilters, newFilter];

        // Update the variable node with the new filter
        const tr = state.tr;
        tr.setNodeMarkup(variableMatch.pos, undefined, {
          ...variableMatch.node.attrs,
          filters: updatedFilters,
        });
        editor.view.dispatch(tr);
        editor.chain().focus().run();
      }
    } else if (filterName === "wrap" && selection.from !== selection.to) {
      // For wrap filter, if text is selected, wrap it in a wrappedText node
      const selectedText = state.doc.textBetween(selection.from, selection.to);

      if (selectedText.trim().length > 0) {
        // Check if selection is already inside a wrappedText node
        if (!isInsideNode(editor, "wrappedText")) {
          // Replace selection with wrappedText node
          editor
            .chain()
            .focus()
            .deleteSelection()
            .insertContent({
              type: "wrappedText",
              attrs: {
                text: selectedText,
              },
            })
            .run();
        }
      } else {
        onInsert?.(`|${filterName}`);
      }
    } else {
      // No variable selected, just insert the filter text
      onInsert?.(`|${filterName}`);
    }
  };

  return (
    <Box className="p-2 min-w-[250px]">
      {!hasVariableSelected && editor && (
        <Flex align="start" gap="2" className="mb-2 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <Text as="span" size="xs" tone="muted">
            {l.selectVariableFirst}
          </Text>
        </Flex>
      )}
      <Stack gap="2">
        {filters.map((filter) => {
          const filterName = filter.split(":")[0];
          return (
            <button
              key={filter}
              type="button"
              onClick={() => handleFilterClick(filter)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "flex items-center gap-2",
              )}
            >
              <Badge variant="secondary" className="font-mono text-xs">
                |{filter}
              </Badge>
              <Text as="span" size="xs" tone="muted">
                {filterName === "wrap" && l.filterDescWrap}
                {filterName === "pad" && l.filterDescPad}
                {filterName === "truncate" && l.filterDescTruncate}
              </Text>
            </button>
          );
        })}
      </Stack>
      <Stack gap="1" className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <Text size="xs" tone="muted">
          {l.exampleLabel("{{weather.temperature|pad:3}}")}
        </Text>
        <Text tone="muted" className="text-[10px]">
          {/* Filter name, not copy. */}
          <Code className="bg-transparent px-0 py-0 text-[10px] font-semibold text-muted-foreground">|wrap</Code>:{" "}
          {l.wrapInstruction}
        </Text>
      </Stack>
    </Box>
  );
}
