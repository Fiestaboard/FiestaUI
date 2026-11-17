import { LocateFixed } from "lucide-react";
import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";

import { cn } from "../../lib/utils";
import { Input, type InputProps } from "../forms/input";
import { Kbd, useKbdPlatform } from "../typography/kbd";

export interface GoToCellPosition {
  row: number;
  column: number;
}
export interface GoToCellLabels {
  input?: string;
  hint?: string;
  format?: (row: number, column: number) => string;
  invalid?: string;
  range?: (rows: number, columns: number) => string;
}
export interface GoToCellProps extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "size" | "children"> {
  columns: number;
  rows: number;
  onGo: (position: GoToCellPosition) => void;
  /** Current caret coordinates; changing them replaces the field's query. */
  value?: GoToCellPosition;
  /** Host resolver for a band name or search term; coordinates are handled locally. */
  onSearch?: (query: string) => void;
  shortcut?: boolean;
  size?: "default" | "touch";
  labels?: GoToCellLabels;
}
const defaultFormat = (row: number, column: number) => `Row ${row} · Col ${column}`;
function coordinate(query: string): GoToCellPosition | undefined {
  const normalized = query.trim().replace(/[·,]/g, " ");
  const rowFirst = normalized.match(/^r(?:ow)?\s*(\d+)\s*c(?:ol(?:umn)?)?\s*(\d+)$/i);
  if (rowFirst) return { row: Number(rowFirst[1]), column: Number(rowFirst[2]) };
  const columnFirst = normalized.match(/^c(?:ol(?:umn)?)?\s*(\d+)\s*r(?:ow)?\s*(\d+)$/i);
  if (columnFirst) return { row: Number(columnFirst[2]), column: Number(columnFirst[1]) };
  const pair = normalized.match(/^(\d+)\s+(\d+)$/);
  return pair ? { row: Number(pair[1]), column: Number(pair[2]) } : undefined;
}

/** Inline coordinate navigation. The host owns caret/viewport updates and free-text search. */
export function GoToCell({
  columns,
  rows,
  onGo,
  value = { row: 1, column: 1 },
  onSearch,
  shortcut = true,
  size = "default",
  labels = {},
  disabled,
  readOnly,
  className,
  onKeyDown,
  onFocus,
  ref,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  ...props
}: GoToCellProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!, []);
  const platform = useKbdPlatform();
  const validBounds = Number.isSafeInteger(rows) && rows > 0 && Number.isSafeInteger(columns) && columns > 0;
  const inactive = disabled || !validBounds;
  const clamp = (number: number, max: number) =>
    Number.isFinite(number) ? Math.max(1, Math.min(Math.floor(number), max)) : 1;
  const display = (labels.format ?? defaultFormat)(
    clamp(value.row, validBounds ? rows : 1),
    clamp(value.column, validBounds ? columns : 1),
  );
  const [query, setQuery] = useState(display);
  const [error, setError] = useState("");
  const [previousDisplay, setPreviousDisplay] = useState(display);
  if (previousDisplay !== display) {
    setPreviousDisplay(display);
    setQuery(display);
    setError("");
  }
  useEffect(() => {
    if (!shortcut || inactive) return;
    const focus = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "j"
      )
        return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    document.addEventListener("keydown", focus);
    return () => document.removeEventListener("keydown", focus);
  }, [shortcut, inactive]);
  const go = () => {
    const position = coordinate(query);
    if (position) {
      if (position.row >= 1 && position.row <= rows && position.column >= 1 && position.column <= columns) {
        setError("");
        onGo(position);
      } else setError(labels.range?.(rows, columns) ?? `Use rows 1–${rows} and columns 1–${columns}.`);
    } else if (query.trim() && onSearch && !/^[\s\d+.,·-]+$/.test(query)) {
      setError("");
      onSearch(query.trim());
    } else setError(labels.invalid ?? "Enter a row and column, for example 14 49 or r14c49.");
  };
  return (
    <div data-slot="go-to-cell" className={cn("w-55 max-w-full text-sm", size === "touch" && "text-base", className)}>
      <div
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-md border border-input bg-card pl-2.5 pr-1.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-[var(--focus-ring-shadow)] coarse:min-h-touch",
          size === "touch" && "min-h-touch",
          inactive && "opacity-50",
          error && "border-destructive focus-within:border-destructive",
        )}
      >
        <LocateFixed aria-hidden="true" className="size-4 shrink-0 text-foreground" />
        <Input
          {...props}
          ref={input}
          type="text"
          size={size}
          value={query}
          disabled={inactive}
          readOnly={readOnly}
          aria-label={ariaLabel ?? labels.input ?? "Go to cell"}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={[describedBy, `${id}-hint`, error ? `${id}-error` : ""].filter(Boolean).join(" ")}
          aria-keyshortcuts={shortcut ? (platform === "apple" ? "Meta+J" : "Control+J") : undefined}
          enterKeyHint="go"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
          onChange={(event) => {
            setQuery(event.target.value);
            setError("");
          }}
          onFocus={(event) => {
            onFocus?.(event);
            if (!event.defaultPrevented) event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing || inactive) return;
            if (event.key === "Enter") {
              event.preventDefault();
              if (!readOnly) go();
            }
            if (event.key === "Escape" && (query !== display || error)) {
              event.preventDefault();
              setQuery(display);
              setError("");
              event.currentTarget.select();
            }
          }}
        />
        {shortcut && <Kbd aria-hidden="true" keys={["mod", "J"]} platform={platform} className="shrink-0 gap-2" />}
      </div>
      <span id={`${id}-hint`} className="sr-only">
        {labels.hint ?? "Enter a row and column, then press Enter to jump. Escape restores the current position."}
      </span>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs leading-4 text-destructive [overflow-wrap:anywhere]">
          {error}
        </p>
      )}
    </div>
  );
}
