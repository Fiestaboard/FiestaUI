"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Input } from "../forms/input";

export interface DeviceCodeInputProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "maxLength" | "children"
> {
  /** Controlled code; letters/digits, at most eight. Separator/space input is normalized. */
  value: string;
  onValueChange: (value: string) => void;
  /** Applied to the segmented field wrapper. The ref and other attributes reach the native input. */
  className?: string;
}

function normalize(value: string) {
  return value
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8);
}

/**
 * Eight-cell TV code (07e 327:38256) backed by ONE native text field.
 * Paste, selection, keyboard navigation, forms and assistive technology see
 * one input; decorative cells mirror its selection. The host owns alphabet
 * validation, completeness, expiration and submission. No auto-submit.
 */
function DeviceCodeInput({
  value,
  onValueChange,
  className,
  ref,
  disabled,
  readOnly,
  onFocus,
  onBlur,
  onSelect,
  ...props
}: DeviceCodeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inputRef.current!);
  const [focused, setFocused] = React.useState(false);
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const pendingCaret = React.useRef<number | null>(null);
  const code = normalize(value);
  const invalid =
    props["aria-invalid"] === true ||
    props["aria-invalid"] === "true" ||
    props["aria-invalid"] === "grammar" ||
    props["aria-invalid"] === "spelling";

  React.useLayoutEffect(() => {
    if (pendingCaret.current != null) {
      const position = Math.min(pendingCaret.current, code.length);
      inputRef.current?.setSelectionRange(position, position);
      pendingCaret.current = null;
    }
  });

  return (
    <div
      data-slot="device-code-input"
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      className={cn(
        "@container/code relative w-full max-w-[343px] cursor-text data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      onPointerDown={(event) => {
        // Let the native field retain pointer selection and the touch paste
        // menu. The cell path also supports direct programmatic cell picks.
        if (disabled || event.target === inputRef.current) return;
        const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-code-index]");
        const index = cell ? Number(cell.dataset.codeIndex) : code.length;
        const start = Math.min(index, code.length);
        const end = Math.min(start + 1, code.length);
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(start, end);
        setSelection({ start, end });
      }}
    >
      <Input
        {...props}
        ref={inputRef}
        type="text"
        value={code}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={props.autoComplete ?? "one-time-code"}
        autoCapitalize="characters"
        spellCheck={false}
        className="absolute inset-0 h-full w-full px-[calc((100cqw/8-1ch)/2)] font-mono text-base tracking-[calc(100cqw/8-1ch)] opacity-0"
        onChange={(event) => {
          const next = normalize(event.currentTarget.value);
          const position = normalize(
            event.currentTarget.value.slice(0, event.currentTarget.selectionStart ?? 0),
          ).length;
          pendingCaret.current = position;
          setSelection({ start: position, end: position });
          onValueChange(next);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onSelect={(event) => {
          setSelection({ start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0 });
          onSelect?.(event);
        }}
      />
      <div
        data-slot="device-code-cells"
        aria-hidden="true"
        className="grid grid-cols-[repeat(4,minmax(0,1fr))_auto_repeat(4,minmax(0,1fr))] gap-1.5 font-mono text-base font-medium"
        dir="ltr"
      >
        {Array.from({ length: 8 }, (_, index) => {
          const selected = focused && index >= selection.start && index < selection.end;
          const active =
            focused && (selection.start === selection.end ? index === Math.min(selection.start, 7) : selected);
          return (
            <React.Fragment key={index}>
              {index === 4 && <span className="flex items-center text-muted-foreground">–</span>}
              <span
                data-slot="device-code-cell"
                data-code-index={index}
                data-active={active || undefined}
                data-selected={selected || undefined}
                className={cn(
                  "flex h-12 min-w-0 items-center justify-center rounded-md border border-input bg-transparent text-foreground",
                  selected && "bg-accent",
                  active && "border-ring shadow-[var(--focus-ring-shadow)]",
                  invalid && "border-destructive",
                )}
              >
                {code[index] ?? ""}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export { DeviceCodeInput };
