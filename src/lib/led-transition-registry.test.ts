import { describe, expect, it } from "vitest";

import { DEVICE_MODELS } from "./devices";
import {
  defaultTransitionIdForModel,
  isLedTransitionId,
  LED_TRANSITION_IDS,
  LED_TRANSITIONS,
  resolveLedTransition,
  transitionsForModel,
  transitionSpecForDevice,
} from "./led-transition-registry";

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
    const fast = { delivery: "stream" as const, maxFps: 60, notes: "", sources: [] };
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
    const pixoo = DEVICE_MODELS.divoom_pixoo64.animation;
    expect(transitionSpecForDevice("flip", pixoo)).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 },
      degraded: true,
    });
    expect(transitionSpecForDevice("fade", pixoo)).toMatchObject({
      spec: { kind: "fade", maxFrames: 32 },
      degraded: true,
    });
    const tiny = { ...pixoo, maxFrames: 4 };
    expect(transitionSpecForDevice("flip", tiny)).toBeNull();
    expect(transitionSpecForDevice("fade", tiny)).not.toBeNull();
  });

  it("lists what each model can run, 'none' always available, with reasons", () => {
    const awtrix = transitionsForModel(DEVICE_MODELS.ulanzi_tc001_awtrix);
    expect(awtrix.find((a) => a.id === "none")!.available).toBe(true);
    expect(awtrix.filter((a) => a.available).map((a) => a.id)).toEqual(["none"]);
    expect(awtrix.find((a) => a.id === "flip")!.reason).toMatch(/unmeasured/);
    const flap = transitionsForModel(DEVICE_MODELS.vestaboard_note);
    expect(flap.filter((a) => a.available).map((a) => a.id)).toEqual(["none"]);
    const hub = transitionsForModel(DEVICE_MODELS.hub75_64x32);
    expect(hub.every((a) => a.available)).toBe(true);
    expect(hub.every((a) => !a.degraded)).toBe(true);
    const pixoo = transitionsForModel(DEVICE_MODELS.divoom_pixoo64);
    expect(pixoo.every((a) => a.available)).toBe(true);
    expect(pixoo.filter((a) => a.id !== "none").every((a) => a.degraded && /32 frames/.test(a.reason!))).toBe(true);
  });

  it("defaults to flip when the device can show it, otherwise none — nothing else", () => {
    expect(defaultTransitionIdForModel(DEVICE_MODELS.hub75_128x64)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.divoom_pixoo64)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe("none");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.vestaboard_flagship)).toBe("none");
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
    const pixoo = DEVICE_MODELS.divoom_pixoo64;
    expect(resolveLedTransition({ kind: "flip", stepMs: 120, halfFlap: true }, pixoo)).toMatchObject({
      id: "flip",
      spec: { kind: "flip", stepMs: 120, maxFrames: 32, halfFlap: false },
      source: "explicit",
      reason: expect.stringMatching(/32 frames/),
    });
    expect(resolveLedTransition({ kind: "flip", stepMs: 20 }, pixoo).spec).toMatchObject({ stepMs: 80 });
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
