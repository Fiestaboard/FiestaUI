"use client";

/*
 * The touch editor bar (slice 1.6b: C5, WEB-04, C6) — what
 * `TemplateEditorToolbar size="touch"` renders. Kept in its own module so the
 * desktop row stays as it was; the toolbar owns the editor state (undo,
 * selection, clipboard) and hands it down.
 *
 * Figma 07 `315:99828` "Web / Editor toolbar · touch":
 *   • a 60 px bar on `card`, a 1 px `border` on top, px 4;
 *   • labelled 52 px tools (EditorTool), no hover-only tooltips;
 *   • split-flap: Variables · Colors · Formatting · Formula │ Undo · Redo ·
 *     More, a 1×32 divider before the history tools;
 *   • LED (CANON): Variables · Text color · Icon · Size · Formula · More —
 *     More holds Undo/Redo (and the host's Effects).
 * Every picker is the 1.3 non-modal bottom sheet (grabber, no scrim), so the
 * docked preview above stays live (07c `306:36342`, `57:65460`).
 *
 * Draw mode on touch (Jev `jev_decide` brush_sheet, p = 0.95): the bar becomes
 * Brush · Undo · Redo · Done. Brush opens a sheet with the 48 px colour
 * swatches, the eraser and the 44 px stamp grid; a pick closes it so the
 * board is free to paint.
 */

import {
  Check,
  ClipboardPaste,
  Copy,
  Download,
  Ellipsis,
  Eraser,
  Paintbrush,
  Palette,
  Pencil,
  Redo2,
  Scissors,
  Sigma,
  Sparkles,
  Type,
  Undo2,
  Variable,
} from "lucide-react";
import { type ReactNode, useId } from "react";
import { createPortal } from "react-dom";

import type { Code62Glyph } from "../../lib/board-characters";
import type { BoardColorName } from "../../lib/board-colors";
import type { BoardIconName } from "../../lib/board-icons";
import type { CharacterSet } from "../../lib/character-sets";
import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Switch } from "../forms/switch";
import { SegmentedControl, SegmentedControlItem } from "../forms/toggle-card";
import { Text } from "../typography/text";
import {
  type BlockColorChoice,
  ColorPickerContent,
  type ColorPickerLabels,
  colorSwatchClassName,
} from "./color-picker-content";
import type { DeviceType } from "./constants";
import { DrawCharPickerContent, type DrawCharPickerLabels } from "./draw-char-picker-content";
import { EditorTool } from "./editor-tool";
import { FormattingPickerContent, type FormattingPickerLabels } from "./formatting-picker-content";
import type { LineAlignment } from "./template-editor";
import type { FormattingVariable, TemplateEditorToolbarLabels } from "./template-editor-toolbar";
import { ToolbarDropdown } from "./toolbar-dropdown";
import type { DrawBrush } from "./utils/draw-mode";

/** Which tool set the bar offers (08 C5 `capabilities`). Canvas is 1.11. */
export type EditorToolbarCapabilities = "split-flap" | "led-text";

export interface TouchToolbarProps {
  l: TemplateEditorToolbarLabels;
  capabilities: EditorToolbarCapabilities;
  className?: string;
  container?: Element | null;
  // History and clipboard, owned by the toolbar.
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasClipboardContent: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  // Insertion.
  onInsert: (token: string) => void;
  onInsertFormula: () => void;
  onTextColor: (color: BoardColorName) => void;
  onBlockColor: (choice: BlockColorChoice) => void;
  onIcon: (icon: BoardIconName) => void;
  /** The Variables body (the toolbar's lazy picker, or the host's), given the insert-and-close callback. */
  renderVariables: (close: () => void) => ReactNode;
  hasVariables: boolean;
  hasColors: boolean;
  formatting?: Record<string, FormattingVariable>;
  set: CharacterSet | null;
  setIcons: readonly BoardIconName[];
  drawColors: readonly BoardColorName[];
  deviceType?: DeviceType;
  code62Glyph?: Code62Glyph;
  // Line state.
  currentAlignment: LineAlignment;
  onAlignmentChange?: (alignment: LineAlignment) => void;
  currentWrapEnabled: boolean;
  onWrapToggle?: () => void;
  onSyncFromBoard?: () => void;
  syncFromBoardPending: boolean;
  // Draw mode.
  drawMode: boolean;
  onDrawModeToggle?: () => void;
  brush: DrawBrush;
  onDrawBrushChange?: (brush: DrawBrush) => void;
  // Host slots.
  entityButton?: ReactNode;
  moreContent?: ReactNode;
  renderSizePicker?: (ctx: { close: () => void }) => ReactNode;
  colorPickerLabels?: Partial<ColorPickerLabels>;
  formattingPickerLabels?: Partial<FormattingPickerLabels>;
  drawCharPickerLabels?: Partial<DrawCharPickerLabels>;
}

/** Long lists open at half height and drag to full (the 1.3 detents). */
const LIST_DETENTS = ["half", "full"] as const;

const ALIGNMENTS: readonly LineAlignment[] = ["left", "center", "right"];

function Divider() {
  return <span aria-hidden="true" data-slot="editor-tools-divider" className="mx-0.5 h-8 w-px shrink-0 bg-border" />;
}

/** A full-width row in the More sheet: a 44 px outline button with its icon. */
function MoreAction({
  icon,
  children,
  ...props
}: { icon: ReactNode; children: ReactNode } & Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Button variant="outline" size="touch" className="flex-1 justify-start" {...props}>
      {icon}
      {children}
    </Button>
  );
}

export function TouchToolbar(props: TouchToolbarProps) {
  const { l, capabilities, className, container, drawMode } = props;
  const wrapSwitchId = useId();
  const wrapLabelId = useId();
  const alignLabelId = useId();
  const led = capabilities === "led-text";

  const undoTool = (
    <EditorTool icon={<Undo2 />} label={l.undoAriaLabel} disabled={!props.canUndo} onClick={props.onUndo} />
  );
  const redoTool = (
    <EditorTool icon={<Redo2 />} label={l.redoAriaLabel} disabled={!props.canRedo} onClick={props.onRedo} />
  );

  const brushSheet = (
    <ToolbarDropdown
      key="brush"
      size="touch"
      presentation="sheet"
      label={l.brush}
      icon={<Paintbrush />}
      detents={LIST_DETENTS}
      data-testid="draw-brush-tool"
    >
      {(close) => {
        const pick = (next: DrawBrush) => {
          props.onDrawBrushChange?.(next);
          close();
        };
        return (
          <div className="flex flex-col gap-3">
            {props.drawColors.length > 0 && (
              <div role="group" aria-label={l.brush} className="grid w-full grid-cols-4 gap-2">
                {props.drawColors.map((name) => {
                  const selected = props.brush.kind === "color" && props.brush.color === name;
                  const colorName = l.drawColors[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      data-testid={`draw-color-${name}`}
                      aria-pressed={selected}
                      onClick={() => pick({ kind: "color", color: name })}
                      className={colorSwatchClassName(
                        name,
                        "touch",
                        "focus-ring",
                        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
                      )}
                    >
                      {colorName}
                    </button>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="touch"
              aria-pressed={props.brush.kind === "eraser"}
              data-testid="draw-color-eraser"
              className={cn("w-full", props.brush.kind === "eraser" && "border-foreground bg-accent")}
              onClick={() => pick({ kind: "eraser" })}
            >
              <Eraser />
              {l.drawEraser}
            </Button>
            <DrawCharPickerContent
              size="touch"
              current={props.brush}
              deviceType={props.deviceType}
              code62Glyph={props.code62Glyph}
              charset={props.set ?? undefined}
              labels={props.drawCharPickerLabels}
              onSelect={pick}
            />
          </div>
        );
      }}
    </ToolbarDropdown>
  );

  const variablesTool = (
    <ToolbarDropdown
      key="variables"
      size="touch"
      presentation="sheet"
      label={l.variables}
      icon={<Variable />}
      disabled={!props.hasVariables}
      detents={LIST_DETENTS}
    >
      {(close) => props.renderVariables(close)}
    </ToolbarDropdown>
  );

  /**
   * One colour sheet, three faces. Split-flap "Colors": tiles and code 62,
   * stays open so several tiles can go in (07 `57:65460`). LED "Text color":
   * every colour group but icons. LED "Icon": icons only.
   */
  const colorTool = (face: "colors" | "text" | "icon") => {
    const label = face === "colors" ? l.colors : face === "text" ? l.textColor : l.icon;
    const icon = face === "icon" ? <Sparkles /> : <Palette />;
    const enabled =
      face === "icon"
        ? props.setIcons.length > 0
        : props.hasColors || Boolean(props.set?.colorSpans || props.set?.blockSpans);
    return (
      <ToolbarDropdown key={face} size="touch" presentation="sheet" label={label} icon={icon} disabled={!enabled}>
        {(close) => (
          <div className="flex flex-col gap-3">
            <ColorPickerContent
              size="touch"
              sections={
                face === "icon" ? ["icons"] : face === "text" ? ["tiles", "textColors", "blockColors"] : undefined
              }
              // Tiles stay open (07); a span or an icon is one pick, then close.
              onInsert={props.onInsert}
              deviceType={props.deviceType}
              code62Glyph={props.code62Glyph}
              charset={props.set ?? undefined}
              onInsertTextColor={
                props.set?.colorSpans
                  ? (color) => {
                      props.onTextColor(color);
                      close();
                    }
                  : undefined
              }
              onInsertBlockColor={
                props.set?.blockSpans
                  ? (choice) => {
                      props.onBlockColor(choice);
                      close();
                    }
                  : undefined
              }
              onInsertIcon={
                props.setIcons.length > 0
                  ? (icon) => {
                      props.onIcon(icon);
                      close();
                    }
                  : undefined
              }
              labels={props.colorPickerLabels}
            />
            {face !== "icon" && (
              <Text size="sm" tone="muted">
                {l.colorsHint}
              </Text>
            )}
          </div>
        )}
      </ToolbarDropdown>
    );
  };

  const formattingTool = (
    <ToolbarDropdown key="formatting" size="touch" presentation="sheet" label={l.formatting} icon={<Type />}>
      {(close) => (
        <div className="flex flex-col gap-3">
          {props.formatting && Object.keys(props.formatting).length > 0 && (
            <FormattingPickerContent
              formatting={props.formatting}
              labels={props.formattingPickerLabels}
              onInsert={(syntax) => {
                props.onInsert(syntax);
                close();
              }}
            />
          )}
          <div className="flex items-center gap-2">
            <Text as="span" size="sm" id={alignLabelId}>
              {l.align}
            </Text>
            <SegmentedControl
              size="touch"
              aria-labelledby={alignLabelId}
              value={props.currentAlignment}
              onValueChange={(next) => props.onAlignmentChange?.(next as LineAlignment)}
            >
              {ALIGNMENTS.map((alignment) => (
                <SegmentedControlItem key={alignment} value={alignment}>
                  {alignment === "left"
                    ? l.alignLeftShort
                    : alignment === "center"
                      ? l.alignCenterShort
                      : l.alignRightShort}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
          <Text size="xs" tone="muted">
            {l.formattingHint}
          </Text>
        </div>
      )}
    </ToolbarDropdown>
  );

  const formulaTool = <EditorTool key="formula" icon={<Sigma />} label={l.formula} onClick={props.onInsertFormula} />;

  const sizeTool = (
    <ToolbarDropdown
      key="size"
      size="touch"
      presentation="sheet"
      label={l.size}
      icon={<Type />}
      disabled={!props.renderSizePicker}
    >
      {(close) => props.renderSizePicker?.({ close })}
    </ToolbarDropdown>
  );

  const moreTool = (
    <ToolbarDropdown key="more" size="touch" presentation="sheet" label={l.more} icon={<Ellipsis />}>
      {(close) => (
        <div className="flex flex-col gap-3">
          {led && (
            <div className="flex gap-2">
              <MoreAction icon={<Undo2 />} disabled={!props.canUndo} onClick={props.onUndo}>
                {l.undoAriaLabel}
              </MoreAction>
              <MoreAction icon={<Redo2 />} disabled={!props.canRedo} onClick={props.onRedo}>
                {l.redoAriaLabel}
              </MoreAction>
            </div>
          )}
          <div role="group" aria-label={l.clipboard} className="flex gap-2">
            <MoreAction icon={<Scissors />} disabled={!props.hasSelection} onClick={props.onCut}>
              {l.cutAriaLabel}
            </MoreAction>
            <MoreAction icon={<Copy />} disabled={!props.hasSelection} onClick={props.onCopy}>
              {l.copyAriaLabel}
            </MoreAction>
            <MoreAction icon={<ClipboardPaste />} disabled={!props.hasClipboardContent} onClick={props.onPaste}>
              {l.pasteAriaLabel}
            </MoreAction>
          </div>
          {props.onDrawModeToggle && (
            <MoreAction
              icon={<Pencil />}
              onClick={() => {
                close();
                props.onDrawModeToggle?.();
              }}
            >
              {l.drawMode}
            </MoreAction>
          )}
          {props.onSyncFromBoard && (
            <MoreAction icon={<Download />} loading={props.syncFromBoardPending} onClick={props.onSyncFromBoard}>
              {l.syncFromBoard}
            </MoreAction>
          )}
          {props.entityButton}
          <div className="flex min-h-12 items-center gap-3">
            <label id={wrapLabelId} htmlFor={wrapSwitchId} className="min-w-0 flex-1 text-base text-foreground">
              {l.wrapLine}
            </label>
            <Switch
              id={wrapSwitchId}
              size="touch"
              aria-labelledby={wrapLabelId}
              checked={props.currentWrapEnabled}
              onCheckedChange={() => props.onWrapToggle?.()}
              disabled={!props.onWrapToggle}
            />
          </div>
          {props.moreContent}
        </div>
      )}
    </ToolbarDropdown>
  );

  let tools: ReactNode;
  if (drawMode) {
    tools = (
      <>
        {brushSheet}
        <Divider />
        {undoTool}
        {redoTool}
        <EditorTool icon={<Check />} label={l.drawDone} onClick={props.onDrawModeToggle} />
      </>
    );
  } else if (led) {
    tools = (
      <>
        {variablesTool}
        {colorTool("text")}
        {colorTool("icon")}
        {sizeTool}
        {formulaTool}
        {moreTool}
      </>
    );
  } else {
    tools = (
      <>
        {variablesTool}
        {colorTool("colors")}
        {formattingTool}
        {formulaTool}
        <Divider />
        {undoTool}
        {redoTool}
        {moreTool}
      </>
    );
  }

  const bar = (
    <div
      role="group"
      aria-label={l.tools}
      data-slot="editor-toolbar"
      data-size="touch"
      data-capabilities={capabilities}
      className={cn("flex w-full items-center border-t border-border bg-card px-1 py-1", className)}
    >
      {tools}
    </div>
  );

  return container ? createPortal(bar, container) : bar;
}
