/**
 * Transitions are a menu.
 *
 * The flip is FiestaBoard's signature, and it is *one entry* in a menu that
 * always contains "none". Every entry declares what it needs to look the way
 * it is meant to (a frame rate for a streamed device, a frame count for one
 * that plays an uploaded sequence) and how it degrades inside a device's
 * frame budget — so a device model (./devices) can say which entries it can
 * run, a settings screen can offer exactly those, and a choice that a device
 * cannot honour falls back predictably with a reason the UI can show.
 *
 * Selection precedence, in one place ({@link resolveLedTransition}):
 *
 *   explicit choice (a board or page setting; later, a plugin's request)
 *     > the device model's default (flip when it is fast enough, else none)
 *
 * An explicit choice the device cannot run falls back to the model's
 * default — never silently to a different animation — and the result says
 * so (`source: "fallback"`, `reason`).
 *
 * The coarse, budgeted flip is not a menu entry: it is what "flip" *becomes*
 * on a device that can show one frame per step (or only N frames in all),
 * derived by {@link transitionSpecForModel}. A user picks "flip"; the
 * device decides how many frames that is.
 */

import { type DeviceAnimation, type DeviceModel, type DeviceModelRef, resolveDeviceModel } from "./devices";
import { DEFAULT_LED_FLIP_STEP_MS, type LedTransitionKind, type LedTransitionSpec } from "./led-transitions";

/** Every menu entry: the six animated kinds and "none". */
export type LedTransitionId = "none" | LedTransitionKind;

export interface LedTransitionEntry {
  id: LedTransitionId;
  label: string;
  description: string;
  /**
   * What the entry needs to look as intended. `minFps` is a streamed
   * device's push rate or a sequence player's playback rate; `fullFps` is
   * the rate at which the entry has every frame it wants (a flip's
   * half-flaps). `minFrames` is the smallest sequence budget that still reads
   * as this transition.
   */
  requires: { minFps: number; fullFps: number; minFrames: number };
  /** Every entry draws on a one-colour panel; recorded so a menu can say so. */
  monochrome: true;
  /**
   * How the entry fits a device frame budget (`LedTransitionSpec.maxFrames`):
   * `subsample` shortens the flip's stagger and then its scramble so every cell
   * still lands on its target; `quantise` samples the continuous change at N evenly spaced
   * points, the last being the settled frame; `none` has nothing to fit.
   */
  budget: "subsample" | "quantise" | "none";
}

export const LED_TRANSITIONS: Readonly<Record<LedTransitionId, LedTransitionEntry>> = {
  none: {
    id: "none",
    label: "None — change instantly",
    description: "The new message replaces the old one in a single frame.",
    requires: { minFps: 0, fullFps: 0, minFrames: 1 },
    monochrome: true,
    budget: "none",
  },
  flip: {
    id: "flip",
    label: "Flip",
    description:
      "Every changing cell scrambles through glyphs from the board's own character set, then lands on its new one — FiestaBoard's take on the split-flap cascade.",
    // One scramble step per 200 ms still reads as a cascade; two frames per
    // 80 ms step shows the half-turned flap. A sequence of 8 frames is the
    // least that still shows a scramble rather than a flicker.
    requires: { minFps: 5, fullFps: 25, minFrames: 8 },
    monochrome: true,
    budget: "subsample",
  },
  cascade: {
    id: "cascade",
    label: "Cascade",
    description: "One flip per changed cell, in reading order.",
    requires: { minFps: 10, fullFps: 30, minFrames: 6 },
    monochrome: true,
    budget: "quantise",
  },
  slide: {
    id: "slide",
    label: "Slide",
    description: "The new message pushes the old one up and off the panel.",
    requires: { minFps: 10, fullFps: 30, minFrames: 6 },
    monochrome: true,
    budget: "quantise",
  },
  wipe: {
    id: "wipe",
    label: "Wipe",
    description: "A curtain reveals the new message from left to right.",
    requires: { minFps: 10, fullFps: 30, minFrames: 6 },
    monochrome: true,
    budget: "quantise",
  },
  fade: {
    id: "fade",
    label: "Fade",
    description: "The old message dims as the new one brightens.",
    requires: { minFps: 10, fullFps: 30, minFrames: 4 },
    monochrome: true,
    budget: "quantise",
  },
  dissolve: {
    id: "dissolve",
    label: "Dissolve",
    description: "Pixels switch from old to new in a scattered order.",
    requires: { minFps: 10, fullFps: 30, minFrames: 4 },
    monochrome: true,
    budget: "quantise",
  },
};

export const LED_TRANSITION_IDS = Object.keys(LED_TRANSITIONS) as LedTransitionId[];

export function isLedTransitionId(value: unknown): value is LedTransitionId {
  return typeof value === "string" && value in LED_TRANSITIONS;
}

/** One menu entry judged against one device. */
export interface LedTransitionAvailability {
  id: LedTransitionId;
  entry: LedTransitionEntry;
  available: boolean;
  /** Why it is unavailable, or how it is degraded when it is. */
  reason?: string;
  /** What the device would actually run: the spec with budget and cadence
   *  applied, or `"none"`. `null` when unavailable. */
  spec: LedTransitionSpec | "none" | null;
  /** The entry runs, but not as intended (coarse flip, quantised to a budget). */
  degraded: boolean;
}

/**
 * The spec a device would run for an entry, with its cadence and frame
 * budget applied — or `null` when the device cannot run it at all.
 *
 * - A device with no frame interface (`delivery: "none"`) runs only "none".
 * - A **sequence** player is judged by its frame budget: an entry needs at
 *   least `requires.minFrames`; a flip becomes one frame per step with no
 *   half-flaps (a half-flap would be a frame the budget does not have), and
 *   everything is compressed to `maxFrames`. Its `maxFps` is the playback
 *   cadence the sequence is authored at, not a limit that is judged.
 * - A **streamed** device is judged by its push rate: an entry needs
 *   `requires.minFps`; a flip below `fullFps` is coarse (one frame per step).
 */
export function transitionSpecForDevice(
  id: LedTransitionId,
  animation: DeviceAnimation,
): { spec: LedTransitionSpec | "none"; degraded: boolean; reason?: string } | null {
  if (id === "none") return { spec: "none", degraded: false };
  const entry = LED_TRANSITIONS[id];
  if (animation.delivery === "none") return null;
  if (animation.delivery === "sequence") {
    const budget = animation.maxFrames;
    if (budget !== undefined && budget < entry.requires.minFrames) return null;
    const stepMs = Math.max(DEFAULT_LED_FLIP_STEP_MS, animation.minFrameMs ?? DEFAULT_LED_FLIP_STEP_MS);
    const spec: LedTransitionSpec = id === "flip" ? { kind: "flip", stepMs, halfFlap: false } : { kind: id };
    if (budget !== undefined) spec.maxFrames = budget;
    const reason =
      budget !== undefined
        ? id === "flip"
          ? `Compressed to ${budget} frames: one frame per step, no half-flaps`
          : `Compressed to ${budget} frames`
        : id === "flip"
          ? "One frame per step, no half-flaps"
          : undefined;
    return { spec, degraded: reason !== undefined, reason };
  }
  if (animation.maxFps < entry.requires.minFps) return null;
  if (id === "flip" && animation.maxFps < entry.requires.fullFps) {
    const stepMs = Math.max(DEFAULT_LED_FLIP_STEP_MS, Math.ceil(1000 / animation.maxFps));
    return {
      spec: { kind: "flip", stepMs, halfFlap: false },
      degraded: true,
      reason: `${stepMs} ms per step, no half-flaps: the device pushes about ${animation.maxFps} frames a second`,
    };
  }
  return { spec: id === "flip" ? { kind: "flip" } : { kind: id }, degraded: false };
}

/** Why an entry is off the menu for a device. */
function unavailableReason(id: LedTransitionId, animation: DeviceAnimation): string {
  const entry = LED_TRANSITIONS[id];
  if (animation.delivery === "none") return "This device takes one message, not frames; it changes by itself.";
  if (animation.delivery === "sequence") {
    return `Needs at least ${entry.requires.minFrames} frames; this device plays sequences of up to ${animation.maxFrames}.`;
  }
  return `Needs about ${entry.requires.minFps} frames a second; this device's push rate is ${animation.maxFps} (${animation.maxFps < 5 ? "unmeasured" : "measured"}).`;
}

/** The whole menu, judged against a device model (an id or a plugin's object). "none" is always available. */
export function transitionsForModel(ref: DeviceModelRef): LedTransitionAvailability[] {
  const model = resolveDeviceModel(ref);
  return LED_TRANSITION_IDS.map((id) => {
    const entry = LED_TRANSITIONS[id];
    const result = transitionSpecForDevice(id, model.animation);
    if (!result) {
      return {
        id,
        entry,
        available: false,
        reason: unavailableReason(id, model.animation),
        spec: null,
        degraded: false,
      };
    }
    return { id, entry, available: true, reason: result.reason, spec: result.spec, degraded: result.degraded };
  });
}

/**
 * The owner's rule: a message change flips when the device can show a flip,
 * and snaps otherwise. Nothing else is ever a default.
 */
export function defaultTransitionIdForModel(ref: DeviceModelRef): LedTransitionId {
  return transitionSpecForDevice("flip", resolveDeviceModel(ref).animation) ? "flip" : "none";
}

export interface ResolvedLedTransition {
  /** The entry that will run. */
  id: LedTransitionId;
  /** The spec to plan with, or `"none"` to snap. */
  spec: LedTransitionSpec | "none";
  /** Where it came from. `fallback`: the explicit choice could not run here. */
  source: "explicit" | "default" | "fallback";
  /** The explicit choice that was set aside, when `source` is `fallback`. */
  requested?: LedTransitionId;
  /** Why the choice fell back, or how the entry is degraded. */
  reason?: string;
}

/**
 * Apply the precedence: an explicit choice wins when the device can run it;
 * otherwise the model's default. A spec with its own timings is kept as
 * given (its `kind` is checked, its numbers are the caller's), except that a
 * device frame budget is always applied. Without a model there is no device
 * to ask: an explicit choice runs as written and nothing is a default.
 */
export function resolveLedTransition(
  choice: LedTransitionId | LedTransitionSpec | undefined,
  ref?: DeviceModelRef,
): ResolvedLedTransition {
  const model: DeviceModel | undefined = ref === undefined ? undefined : resolveDeviceModel(ref);
  const requested: LedTransitionId | undefined =
    choice === undefined ? undefined : typeof choice === "string" ? choice : choice.kind;
  if (!model) {
    if (choice === undefined || choice === "none")
      return { id: "none", spec: "none", source: choice ? "explicit" : "default" };
    return { id: requested!, spec: typeof choice === "string" ? { kind: choice } : choice, source: "explicit" };
  }
  if (requested !== undefined) {
    const result = transitionSpecForDevice(requested, model.animation);
    if (result) {
      // A caller's own timings are kept, but never past what the device can
      // show: a slow stream still drops the half-flap, a sequence player
      // still holds each frame at least its minimum, and a budget always
      // applies. `reason` then describes exactly that degradation.
      let spec: LedTransitionSpec | "none" = result.spec;
      if (typeof choice === "object" && result.spec !== "none") {
        const device = result.spec;
        spec = { ...choice };
        if (device.stepMs !== undefined)
          spec.stepMs = Math.max(choice.stepMs ?? DEFAULT_LED_FLIP_STEP_MS, device.stepMs);
        if (device.halfFlap === false) spec.halfFlap = false;
        if (device.maxFrames !== undefined) spec.maxFrames = device.maxFrames;
      }
      return { id: requested, spec, source: "explicit", reason: result.reason };
    }
    const fallbackId = defaultTransitionIdForModel(model);
    const fallback = transitionSpecForDevice(fallbackId, model.animation)!;
    return {
      id: fallbackId,
      spec: fallback.spec,
      source: "fallback",
      requested,
      reason: unavailableReason(requested, model.animation),
    };
  }
  const id = defaultTransitionIdForModel(model);
  const result = transitionSpecForDevice(id, model.animation)!;
  return { id, spec: result.spec, source: "default", reason: result.reason };
}
