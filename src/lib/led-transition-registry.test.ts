import { describe, expect, it } from "vitest";

import { ACME_SIGN_MODEL, goldenCharacterSet } from "./charset-golden-cases";
import { DEVICE_MODELS, type DeviceModel } from "./devices";
import { SEQUENCE_PANEL_MODEL } from "./led-golden-cases";
import {
  defaultTransitionIdForModel,
  isLedTransitionId,
  LED_TRANSITION_IDS,
  LED_TRANSITIONS,
  resolveLedTransition,
  transitionsForModel,
  transitionSpecForDevice,
} from "./led-transition-registry";

/** The generic 32-frame sequence player the goldens pin; its partial set resolves to led_3x5's contents. */
const SEQUENCE_MODEL = SEQUENCE_PANEL_MODEL as unknown as DeviceModel;

describe("the transition menu", () => {
  it("has 'none' as a real entry beside every animated kind, each with label, description and requirements", () => {
    expect(LED_TRANSITION_IDS).toEqual(["none", "flip", "cascade", "slide", "wipe", "fade", "dissolve"]);
    expect(LED_TRANSITIONS.none.label).toMatch(/^None/);
    for (const id of LED_TRANSITION_IDS) {
      const e = LED_TRANSITIONS[id];
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.description.length).toBeGreaterThan(0);
      expect(e.monochrome).toBe(true);
      expect(e.requires.minFps).toBeGreaterThanOrEqual(0);
    }
    expect(isLedTransitionId("flip")).toBe(true);
    expect(isLedTransitionId("coarse")).toBe(false);
  });

  it("judges a streamed device by push rate", () => {
    const fast = { delivery: "stream" as const, maxFps: 60 };
    expect(transitionSpecForDevice("flip", fast)).toEqual({ spec: { kind: "flip" }, degraded: false });
    const slow = { ...fast, maxFps: 10 };
    expect(transitionSpecForDevice("flip", slow)).toMatchObject({
      spec: { kind: "flip", stepMs: 100, halfFlap: false },
      degraded: true,
    });
    expect(transitionSpecForDevice("slide", slow)).toEqual({ spec: { kind: "slide" }, degraded: false });
    const crawl = { ...fast, maxFps: 2 };
    expect(transitionSpecForDevice("flip", crawl)).toBeNull();
    expect(transitionSpecForDevice("none", crawl)).toEqual({ spec: "none", degraded: false });
  });

  it("judges a sequence player by its frame budget and compresses every entry into it", () => {
    const sequence = SEQUENCE_PANEL_MODEL.animation;
    expect(transitionSpecForDevice("flip", sequence)).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 },
      degraded: true,
    });
    expect(transitionSpecForDevice("fade", sequence)).toMatchObject({
      spec: { kind: "fade", maxFrames: 32 },
      degraded: true,
    });
    const tiny = { ...sequence, maxFrames: 4 };
    expect(transitionSpecForDevice("flip", tiny)).toBeNull();
    expect(transitionSpecForDevice("fade", tiny)).not.toBeNull();
  });

  it("lists what each model can run, 'none' always available, with reasons", () => {
    const awtrix = transitionsForModel(DEVICE_MODELS.ulanzi_tc001_awtrix);
    expect(awtrix.find((a) => a.id === "none")!.available).toBe(true);
    expect(awtrix.filter((a) => a.available).map((a) => a.id)).toEqual(["none"]);
    expect(awtrix.find((a) => a.id === "flip")!.reason).toMatch(/push rate is 2\./);
    const flap = transitionsForModel(DEVICE_MODELS.vestaboard_note);
    expect(flap.filter((a) => a.available).map((a) => a.id)).toEqual(["none"]);
    const hub = transitionsForModel(DEVICE_MODELS.hub75_64x32);
    expect(hub.every((a) => a.available)).toBe(true);
    expect(hub.every((a) => !a.degraded)).toBe(true);
    const sequence = transitionsForModel(SEQUENCE_MODEL);
    expect(sequence.every((a) => a.available)).toBe(true);
    expect(sequence.filter((a) => a.id !== "none").every((a) => a.degraded && /32 frames/.test(a.reason!))).toBe(true);
    // The Pixoo 64 snaps (hardware test, 2026-10-04): its verified safe
    // still-push rate is 2 a second, so only None is on its menu.
    const pixoo = transitionsForModel(DEVICE_MODELS.divoom_pixoo64);
    expect(pixoo.filter((a) => a.available).map((a) => a.id)).toEqual(["none"]);
    expect(pixoo.find((a) => a.id === "flip")!.reason).toMatch(/push rate is 2\./);
  });

  it("defaults to flip when the device can show it, otherwise none — nothing else", () => {
    expect(defaultTransitionIdForModel(DEVICE_MODELS.hub75_128x64)).toBe("flip");
    expect(defaultTransitionIdForModel(SEQUENCE_MODEL)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.divoom_pixoo64)).toBe("none");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe("none");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.vestaboard_flagship)).toBe("none");
  });

  it("knows only its own ids: an inherited name is not a transition, and a stale choice falls back", () => {
    expect(isLedTransitionId("flip")).toBe(true);
    expect(isLedTransitionId("constructor")).toBe(false);
    expect(isLedTransitionId("__proto__")).toBe(false);
    expect(isLedTransitionId("toString")).toBe(false);
    // A choice that is not an id — a stale setting, a typo in a plugin's
    // request — falls back to the default with a reason, never a crash and
    // never a prototype lookup.
    const hub = DEVICE_MODELS.hub75_64x32;
    const stale = resolveLedTransition("constructor" as never, hub);
    expect(stale).toMatchObject({ id: "flip", source: "fallback", requested: "constructor" });
    expect(stale.reason).toMatch(/Unknown transition "constructor"/);
    expect(resolveLedTransition({ kind: "toString" as never }, hub)).toMatchObject({
      id: "flip",
      source: "fallback",
      requested: "toString",
    });
    // Without a model there is still nothing to run: none, as a fallback.
    expect(resolveLedTransition("constructor" as never)).toMatchObject({
      id: "none",
      spec: "none",
      source: "fallback",
      requested: "constructor",
    });
    expect(() => transitionsForModel(hub)).not.toThrow();
  });

  it("honours a caller's tighter frame budget under a device's, and the device's under a looser one", () => {
    const sign = { ...ACME_SIGN_MODEL, charset: goldenCharacterSet("acme_sign_v1") } as unknown as DeviceModel;
    expect(resolveLedTransition({ kind: "flip", maxFrames: 6 }, sign).spec).toMatchObject({ maxFrames: 6 });
    expect(resolveLedTransition({ kind: "flip", maxFrames: 40 }, sign).spec).toMatchObject({ maxFrames: 12 });
    expect(resolveLedTransition({ kind: "fade", maxFrames: 4 }, sign).spec).toMatchObject({ maxFrames: 4 });
    expect(resolveLedTransition({ kind: "flip" }, sign).spec).toMatchObject({ maxFrames: 12 });
    // A streamed device has no budget of its own; the caller's stands.
    expect(resolveLedTransition({ kind: "flip", maxFrames: 9 }, DEVICE_MODELS.hub75_64x32).spec).toMatchObject({
      maxFrames: 9,
    });
  });

  it("resolves with the precedence: explicit > default, falling back with a reason", () => {
    const hub = DEVICE_MODELS.hub75_64x32;
    expect(resolveLedTransition(undefined, hub)).toMatchObject({ id: "flip", source: "default" });
    expect(resolveLedTransition("slide", hub)).toMatchObject({
      id: "slide",
      spec: { kind: "slide" },
      source: "explicit",
    });
    expect(resolveLedTransition("none", hub)).toMatchObject({ id: "none", spec: "none", source: "explicit" });
    const awtrix = DEVICE_MODELS.ulanzi_tc001_awtrix;
    const fell = resolveLedTransition("slide", awtrix);
    expect(fell).toMatchObject({ id: "none", spec: "none", source: "fallback", requested: "slide" });
    expect(fell.reason).toMatch(/frames a second/);
    // A caller's own timings survive, but never past the device: the budget
    // applies, a slow stream still loses its half-flap, a sequence player
    // still holds each frame at least its minimum, and `reason` says so.
    expect(resolveLedTransition({ kind: "flip", stepMs: 120, halfFlap: true }, SEQUENCE_MODEL)).toMatchObject({
      id: "flip",
      spec: { kind: "flip", stepMs: 120, maxFrames: 32, halfFlap: false },
      source: "explicit",
      reason: expect.stringMatching(/32 frames/),
    });
    expect(resolveLedTransition({ kind: "flip", stepMs: 20 }, SEQUENCE_MODEL).spec).toMatchObject({ stepMs: 80 });
    const slow = { ...DEVICE_MODELS.hub75_64x32, animation: { ...DEVICE_MODELS.hub75_64x32.animation, maxFps: 10 } };
    expect(resolveLedTransition({ kind: "flip", stepMs: 40, halfFlap: true }, slow)).toMatchObject({
      spec: { kind: "flip", stepMs: 100, halfFlap: false },
      reason: expect.stringMatching(/no half-flaps/),
    });
    // No model: explicit runs as written, default is none.
    expect(resolveLedTransition("wipe")).toMatchObject({ id: "wipe", spec: { kind: "wipe" }, source: "explicit" });
    expect(resolveLedTransition(undefined)).toMatchObject({ id: "none", spec: "none", source: "default" });
  });
});
