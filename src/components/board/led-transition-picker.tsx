"use client";

/**
 * LedTransitionPicker — choose how an LED board changes its message.
 *
 * One card per entry of the transition menu (../../lib/led-transition-registry),
 * "None" included, as a real radiogroup (`ToggleCardGroup`). Given a device
 * model, entries the device cannot run are marked `aria-disabled` and say
 * why; entries it runs degraded (a coarse or budgeted flip) say how. An
 * `aria-disabled` radio is skipped by the keyboard (Base UI's composite
 * never focuses one), so every unavailable entry's reason is also given
 * outside the radios, as a list the group is described by. Each card can
 * carry a tiny live preview — a small `LedMatrixDisplay` looping that
 * transition on the model's own geometry, the whole device scaled to fit —
 * which stands still under reduced motion.
 *
 * Models are open data: `model` takes a built-in id or a model object (an
 * output plugin's). An unknown id is no device — every entry is offered as
 * is and the id is reported on `data-unknown-model` — never a Vestaboard.
 */

import { useId, useState, useSyncExternalStore } from "react";

import {
  type DeviceModel,
  type DeviceModelRef,
  ledSpecForModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "../../lib/devices";
import {
  defaultTransitionIdForModel,
  LED_TRANSITION_IDS,
  LED_TRANSITIONS,
  type LedTransitionAvailability,
  type LedTransitionId,
  transitionsForModel,
} from "../../lib/led-transition-registry";
import { cn } from "../../lib/utils";
import { ToggleCard, ToggleCardGroup } from "../forms/toggle-card";
import { LedMatrixDisplay } from "./led-matrix-display";
import { useReducedMotion } from "./reduced-motion";

export interface LedTransitionPickerLabels {
  /** Accessible name for the group. */
  transitions: string;
  /** Marker on the model's default entry. */
  deviceDefault: string;
  /** Lead-in for an unavailable entry's reason. */
  unavailable: string;
  /** Lead-in for a degraded entry's note. */
  runsAs: string;
  /** Accessible name of a card's preview, given the entry's label. */
  previewLabel: (entryLabel: string) => string;
}

export const DEFAULT_LED_TRANSITION_PICKER_LABELS: LedTransitionPickerLabels = {
  transitions: "Transition",
  deviceDefault: "Device default",
  unavailable: "Not available on this device",
  runsAs: "Runs as",
  previewLabel: (entryLabel) => `${entryLabel} preview`,
};

export interface LedTransitionPickerProps {
  /**
   * The device the choice is for — a built-in id or a model object (a
   * plugin's). Without one every entry is offered as is and None is the
   * default. An unknown id is treated as no device and reported on
   * `data-unknown-model`.
   */
  model?: DeviceModelRef;
  value?: LedTransitionId;
  defaultValue?: LedTransitionId;
  onValueChange?: (id: LedTransitionId) => void;
  /** Loop a small preview of each transition inside its card. @default true */
  preview?: boolean;
  /** The two messages the previews alternate between. */
  previewMessages?: [string, string];
  /** Hide entries the device cannot run instead of marking them. */
  hideUnavailable?: boolean;
  columns?: "1" | "2" | "3";
  labels?: Partial<LedTransitionPickerLabels>;
  className?: string;
}

const DEFAULT_PREVIEW: [string, string] = ["72° {66}OK", "68° {65}UV2"];
const PREVIEW_PERIOD_MS = 2600;
/** How wide a preview aims to be, in CSS px: the pitch is chosen to fit the whole device in it. */
const PREVIEW_TARGET_WIDTH = 128;

/*
 * One clock for every preview on the page, so the cards change together and
 * a dozen previews cost one interval. Ticks are counted, not timed, so the
 * phase is the same wherever a card mounts; the interval runs only while a
 * preview is subscribed.
 */
let previewTick = 0;
const previewListeners = new Set<() => void>();
let previewTimer: ReturnType<typeof setInterval> | null = null;
function subscribePreviewClock(listener: () => void) {
  previewListeners.add(listener);
  if (previewTimer === null) {
    previewTimer = setInterval(() => {
      previewTick++;
      for (const l of previewListeners) l();
    }, PREVIEW_PERIOD_MS);
  }
  return () => {
    previewListeners.delete(listener);
    if (previewListeners.size === 0 && previewTimer !== null) {
      clearInterval(previewTimer);
      previewTimer = null;
    }
  };
}
const getPreviewTick = () => previewTick;
const getPreviewTickServer = () => 0;
/** A still preview needs no clock: nothing subscribed, no interval started. */
const subscribeNothing = () => () => {};

/** A small board that alternates its message on the shared clock — stilled under reduced motion. */
function TransitionPreview({
  availability,
  model,
  messages,
  label,
}: {
  availability: LedTransitionAvailability;
  model?: DeviceModel;
  messages: [string, string];
  label: string;
}) {
  const reduced = useReducedMotion();
  const tick = useSyncExternalStore(
    reduced ? subscribeNothing : subscribePreviewClock,
    getPreviewTick,
    getPreviewTickServer,
  );
  const spec = availability.spec;
  const geometry = model ? ledSpecForModel(model) : null;
  const width = geometry?.width ?? 64;
  const height = geometry?.height ?? 32;
  // The whole device, scaled: a pitch that keeps the preview about 128 px
  // wide, so a 64×64 Pixoo shows all 64 rows rather than being cropped and
  // a 128-wide HUB75 fits at one pixel per LED.
  const pitch = Math.max(1, Math.min(2, Math.floor(PREVIEW_TARGET_WIDTH / width)));
  const phase = reduced ? 0 : tick % 2;
  return (
    // Pinned to the card's bottom (`mt-auto`), so a row of cards with
    // descriptions of different lengths still lines its previews up.
    <div className="mt-auto flex justify-start pt-2" data-slot="led-transition-preview" data-phase={phase}>
      <LedMatrixDisplay
        message={messages[phase]}
        model={model}
        matrixWidth={width}
        matrixHeight={height}
        transition={spec === null || spec === "none" ? "none" : spec}
        size={pitch}
        glow={false}
        previewLabel={label}
      />
    </div>
  );
}

export function LedTransitionPicker({
  model,
  value,
  defaultValue,
  onValueChange,
  preview = true,
  previewMessages = DEFAULT_PREVIEW,
  hideUnavailable = false,
  columns = "2",
  labels,
  className,
}: LedTransitionPickerProps) {
  const l = { ...DEFAULT_LED_TRANSITION_PICKER_LABELS, ...labels };
  const reasonsId = useId();
  const lookup = model !== undefined ? tryResolveDeviceModel(model) : undefined;
  // An object is a plugin's model; one that is not a well-formed model is
  // no device either, and is reported by its id — never "[object Object]".
  const resolvedModel = lookup?.model && validateDeviceModel(lookup.model).ok ? lookup.model : undefined;
  const unknownModel =
    model !== undefined && resolvedModel === undefined
      ? typeof model === "string"
        ? model
        : String((model as { id?: unknown })?.id ?? "")
      : undefined;
  const availability: LedTransitionAvailability[] = resolvedModel
    ? transitionsForModel(resolvedModel)
    : LED_TRANSITION_IDS.map((id) => ({
        id,
        entry: LED_TRANSITIONS[id],
        available: true,
        spec: id === "none" ? "none" : { kind: id },
        degraded: false,
      }));
  const defaultId = resolvedModel ? defaultTransitionIdForModel(resolvedModel) : "none";
  const shown = hideUnavailable ? availability.filter((a) => a.available) : availability;
  const unavailable = new Set(availability.filter((a) => !a.available).map((a) => a.id));
  const unavailableEntries = hideUnavailable ? [] : availability.filter((a) => !a.available);
  // Unavailable entries stay in the group as radios marked `aria-disabled`,
  // so their cards and reasons are in the accessibility tree (and listed
  // again below the group); selecting one is refused here. The group is
  // controlled internally, so a refused move snaps back to the current
  // value.
  const [internal, setInternal] = useState<{ value: LedTransitionId; chosen: boolean; defaultId: LedTransitionId }>(
    () => ({ value: value ?? defaultValue ?? defaultId, chosen: defaultValue !== undefined, defaultId }),
  );
  // Uncontrolled, the value is re-derived when the model changes under it:
  // a default that was never overridden follows the new device's default,
  // and a choice the new device cannot run gives way to that default too —
  // a stale "flip" must not survive a switch to a device that only snaps.
  if (internal.defaultId !== defaultId) {
    const keep = internal.chosen && !unavailable.has(internal.value);
    const next = keep ? internal.value : defaultId;
    setInternal({ value: next, chosen: keep, defaultId });
    if (value === undefined && next !== internal.value) onValueChange?.(next);
  }
  const current = value ?? internal.value;
  const select = (id: LedTransitionId) => {
    if (unavailable.has(id)) return;
    setInternal((s) => ({ ...s, value: id, chosen: true }));
    onValueChange?.(id);
  };

  return (
    <div className={cn("flex w-full flex-col gap-3", className)} data-slot="led-transition-picker-root">
      <ToggleCardGroup
        aria-label={l.transitions}
        aria-describedby={unavailableEntries.length > 0 ? reasonsId : undefined}
        data-slot="led-transition-picker"
        data-model={resolvedModel?.id}
        data-unknown-model={unknownModel}
        value={current}
        onValueChange={(v) => select(v as LedTransitionId)}
        columns={columns}
        size="sm"
        indicator="trailing"
        className="w-full"
      >
        {shown.map((a) => (
          <ToggleCard
            key={a.id}
            value={a.id}
            aria-disabled={!a.available || undefined}
            data-transition={a.id}
            data-available={a.available ? "" : undefined}
            data-degraded={a.degraded ? "" : undefined}
            // A flex column of full height, so the preview can pin itself to
            // the bottom. An unavailable card keeps its text at full contrast
            // (the reason has to be read) and shows its state by the border.
            className={cn("flex h-full flex-col", !a.available && "border-dashed")}
            title={a.entry.label}
            meta={
              a.id === defaultId ? (
                <span className="text-xs text-muted-foreground" data-slot="led-transition-default">
                  {l.deviceDefault}
                </span>
              ) : undefined
            }
            description={
              <>
                {a.entry.description}
                {!a.available && a.reason && (
                  <span className="mt-1 block text-xs" data-slot="led-transition-reason">
                    {l.unavailable}: {a.reason}
                  </span>
                )}
                {a.available && a.degraded && a.reason && (
                  <span className="mt-1 block text-xs" data-slot="led-transition-reason">
                    {l.runsAs}: {a.reason}
                  </span>
                )}
              </>
            }
          >
            {preview && a.available && (
              <TransitionPreview
                availability={a}
                model={resolvedModel}
                messages={previewMessages}
                label={l.previewLabel(a.entry.label)}
              />
            )}
          </ToggleCard>
        ))}
      </ToggleCardGroup>
      {/* The keyboard never lands on an aria-disabled radio, so the reasons
          are listed here too — in browse order after the cards, and read
          with the group's name through aria-describedby. */}
      {unavailableEntries.length > 0 && (
        <ul
          id={reasonsId}
          aria-label={l.unavailable}
          data-slot="led-transition-unavailable"
          className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground"
        >
          {unavailableEntries.map((a) => (
            <li key={a.id} data-transition={a.id}>
              {a.entry.label}: {a.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
