"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input, type InputProps } from "./input";

export interface SecretInputProps extends Omit<InputProps, "type"> {
  /**
   * Accessible name for the toggle while the secret is masked — i.e. the
   * action the button performs. Defaults to English "Show"; apps that
   * localize pass their own string (this package never depends on i18n).
   */
  showLabel?: string;
  /** Accessible name for the toggle while the secret is revealed. Default "Hide". */
  hideLabel?: string;
  /** Initial visibility for the uncontrolled case. */
  defaultVisible?: boolean;
  /** Controlled visibility; pair with {@link SecretInputProps.onVisibleChange}. */
  visible?: boolean;
  /** Fired with the next visibility whenever the toggle is activated. */
  onVisibleChange?: (visible: boolean) => void;
  /**
   * Disables only the toggle, leaving the field editable. For write-only
   * secrets the server returns a placeholder (`"***"`) rather than the value,
   * so there is nothing to reveal — but the user may still type a new one.
   */
  revealDisabled?: boolean;
  /** Classes for the relative wrapper (e.g. `flex-1` in a settings row). */
  containerClassName?: string;
}

/**
 * Password/token field with a reveal toggle.
 *
 * Composes {@link Input} rather than re-declaring a bordered control, so the
 * field can never drift from the design system's control tokens, and mounts
 * the toggle inside the field as a ghost icon {@link Button}.
 *
 * Value styling defaults to `font-mono` — secrets are keys and tokens, where
 * character-level legibility matters — and is overridable through `className`.
 */
function SecretInput({
  className,
  containerClassName,
  showLabel = "Show",
  hideLabel = "Hide",
  defaultVisible = false,
  visible: visibleProp,
  onVisibleChange,
  revealDisabled = false,
  disabled,
  ref,
  ...props
}: SecretInputProps) {
  const [uncontrolledVisible, setUncontrolledVisible] = React.useState(defaultVisible);
  const isControlled = visibleProp !== undefined;
  const visible = isControlled ? visibleProp : uncontrolledVisible;

  // A revealed secret must never survive the toggle being taken away: if the
  // field flips to `revealDisabled` (the value was replaced by a write-only
  // placeholder) while unmasked, the user would be left staring at a secret
  // with no control to re-mask it.
  const effectivelyVisible = visible && !revealDisabled;

  const handleToggle = () => {
    const next = !effectivelyVisible;
    if (!isControlled) setUncontrolledVisible(next);
    onVisibleChange?.(next);
  };

  const Icon = effectivelyVisible ? EyeOff : Eye;

  return (
    <div
      data-slot="secret-input"
      data-visible={effectivelyVisible ? "" : undefined}
      className={cn("relative w-full", containerClassName)}
    >
      <Input
        ref={ref}
        type={effectivelyVisible ? "text" : "password"}
        disabled={disabled}
        // Secrets are not prose: spell-check underlines and mobile
        // auto-capitalisation are noise at best and corruption at worst once
        // the value is revealed. All three stay overridable via {...props}.
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={cn("pr-9 font-mono", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        // Rendered after the input so the natural tab order is field → toggle.
        // type="button" keeps it out of implicit form submission.
        onClick={handleToggle}
        disabled={disabled || revealDisabled}
        // The NAME carries the state, and deliberately not `aria-pressed`
        // alongside it. A button labelled "Hide" that also reports itself as
        // pressed announces "Hide, toggle button, pressed" — two state signals
        // pointing opposite ways, since "pressed" here would mean "the secret
        // is shown". One channel, and it is the same one Sidebar's collapse
        // toggle uses: a label that names the action the press performs.
        aria-label={effectivelyVisible ? hideLabel : showLabel}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  );
}

export { SecretInput };
