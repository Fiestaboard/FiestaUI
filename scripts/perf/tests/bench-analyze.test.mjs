import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyLeak, LEAK, linearFit, percentile, rankStories, summarize } from "../bench-analyze.mjs";

const story = (id, metrics) => ({ id, metrics });

test("percentile interpolates between neighbours", () => {
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([10], 0.9), 10);
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile([4, 1, 3, 2], 0), 1);
  assert.equal(percentile([4, 1, 3, 2], 1), 4);
});

test("percentile ignores non-finite samples", () => {
  assert.equal(percentile([1, NaN, 3, null, 5], 0.5), 3);
});

test("summarize reports the median of tight samples", () => {
  const result = summarize([100, 101, 102, 100, 101]);
  assert.equal(result.unstable, false);
  assert.equal(result.reason, null);
  assert.equal(result.value, 101);
  assert.equal(result.n, 5);
});

test("summarize suppresses the value when variance is high", () => {
  const result = summarize([10, 200, 15, 400, 12]);
  assert.equal(result.unstable, true);
  assert.equal(result.reason, "high-variance");
  assert.equal(result.value, null, "an unstable median must not be reported as fact");
  assert.ok(result.rawMedian > 0, "the raw median is still retained for debugging");
});

test("summarize rejects too few samples even when they agree", () => {
  const result = summarize([100, 100]);
  assert.equal(result.unstable, true);
  assert.equal(result.reason, "too-few-samples");
  assert.equal(result.value, null);
});

test("summarize handles an empty sample set", () => {
  const result = summarize([]);
  assert.deepEqual(
    { n: result.n, value: result.value, unstable: result.unstable, reason: result.reason },
    { n: 0, value: null, unstable: true, reason: "no-samples" },
  );
});

test("summarize treats near-zero medians as stable despite relative spread", () => {
  // 0.2ms median with 0.2ms IQR is a 100% ratio but pure rounding noise.
  const result = summarize([0.1, 0.2, 0.3, 0.2, 0.1]);
  assert.equal(result.unstable, false, "sub-millisecond jitter must not be called instability");
  assert.equal(result.ratio, 0);
});

test("linearFit recovers a known slope", () => {
  const { slope, intercept, r2 } = linearFit([10, 20, 30, 40]);
  assert.equal(slope, 10);
  assert.equal(intercept, 10);
  assert.equal(r2, 1);
});

test("linearFit reports a flat series as a perfect fit", () => {
  const { slope, r2 } = linearFit([5, 5, 5, 5]);
  assert.equal(slope, 0);
  assert.equal(r2, 1, "zero variance is a clean fit of a constant, not an undefined one");
});

test("linearFit tolerates a single point", () => {
  assert.deepEqual(linearFit([7]), { slope: 0, intercept: 7, r2: 0 });
});

test("classifyLeak flags monotonic heap growth", () => {
  const result = classifyLeak([1000, 1100, 1200, 1300, 1400]);
  assert.equal(result.verdict, "leak");
  assert.ok(result.slopeKb >= LEAK.slopeKb);
  assert.ok(result.r2 >= LEAK.minR2);
});

test("classifyLeak passes a stable heap", () => {
  const result = classifyLeak([1000, 1004, 998, 1002, 1000]);
  assert.equal(result.verdict, "clean");
});

test("classifyLeak downgrades a noisy trend to suspect", () => {
  // Mean slope clears the threshold, but the scatter makes the fit poor.
  const result = classifyLeak([1000, 1400, 1010, 1600, 1050, 1900]);
  assert.equal(result.verdict, "suspect");
  assert.equal(result.reason, "scatter");
  assert.ok(result.r2 < LEAK.minR2);
});

test("classifyLeak downgrades a plateau to suspect rather than calling it a leak", () => {
  // Regression test for a real false positive: heavy stories allocate a large
  // steady-state footprint over the first few cycles and then level off. The
  // overall slope clears the threshold; the second half does not. That is a
  // footprint, not unbounded growth.
  const plateau = [1000, 1300, 1500, 1600, 1620, 1630, 1635, 1638];
  const result = classifyLeak(plateau);
  assert.equal(result.verdict, "suspect");
  assert.equal(result.reason, "plateau");
  assert.ok(result.slopeKb >= LEAK.slopeKb, "the overall slope did clear the threshold");
  assert.ok(result.tailSlopeKb < LEAK.slopeKb, "but the tail had flattened");
});

test("classifyLeak still flags growth that never levels off", () => {
  const unbounded = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
  const result = classifyLeak(unbounded);
  assert.equal(result.verdict, "leak");
  assert.equal(result.reason, null);
  assert.ok(result.tailSlopeKb >= LEAK.slopeKb);
});

test("classifyLeak refuses to judge too few cycles", () => {
  const result = classifyLeak([1000, 1100, 1200]);
  assert.equal(result.verdict, "unknown");
  assert.equal(result.reason, "too-few-cycles");
  assert.equal(result.slopeKb, null);
});

test("classifyLeak subtracts the harness baseline before judging", () => {
  // Regression test for a real false positive: an early version of this
  // harness reported all 19 trivial ui-button stories as leaking ~146 KB per
  // cycle, because Storybook's own story switching retains that much on its
  // own. Against a control that did the same, the component is clean.
  const buttonLike = [1000, 1146, 1292, 1438, 1584];
  assert.equal(classifyLeak(buttonLike).verdict, "leak", "raw slope alone is misleading");
  const corrected = classifyLeak(buttonLike, { baselineSlopeKb: 146 });
  assert.equal(corrected.verdict, "clean");
  assert.ok(Math.abs(corrected.slopeKb) < 1);
  assert.equal(Math.round(corrected.rawSlopeKb), 146, "the raw slope is retained for debugging");
  assert.equal(corrected.baselineSlopeKb, 146);
});

test("classifyLeak still flags a component that leaks on top of the baseline", () => {
  const leaky = [1000, 1400, 1800, 2200, 2600];
  const result = classifyLeak(leaky, { baselineSlopeKb: 146 });
  assert.equal(result.verdict, "leak");
  assert.equal(Math.round(result.slopeKb), 254);
});

test("classifyLeak clamps nothing when a story retains less than the baseline", () => {
  const result = classifyLeak([1000, 1050, 1100, 1150, 1200], { baselineSlopeKb: 146 });
  assert.equal(result.verdict, "clean");
  assert.ok(result.slopeKb < 0, "a negative net slope is meaningful, not an error");
});

test("rankStories puts the most expensive story first", () => {
  const ranked = rankStories([
    story("cheap", { frameP95: 2, mountMs: 1, longTasks: 0 }),
    story("costly", { frameP95: 40, mountMs: 30, longTasks: 8 }),
    story("middling", { frameP95: 12, mountMs: 10, longTasks: 1 }),
  ]);
  assert.deepEqual(
    ranked.map((s) => s.id),
    ["costly", "middling", "cheap"],
  );
  assert.ok(ranked[0].score > ranked[1].score);
});

test("rankStories ignores retention entirely, since it is uncalibrated", () => {
  // Retention must not reorder anything: the measurement is dominated by a
  // story-size-proportional artifact the harness cannot yet subtract.
  const withRetention = rankStories([
    story("a", { frameP95: 10, mountMs: 10, longTasks: 1, retainedSlopeKb: 9999 }),
    story("b", { frameP95: 20, mountMs: 20, longTasks: 2, retainedSlopeKb: 0 }),
  ]);
  const without = rankStories([
    story("a", { frameP95: 10, mountMs: 10, longTasks: 1 }),
    story("b", { frameP95: 20, mountMs: 20, longTasks: 2 }),
  ]);
  assert.deepEqual(
    withRetention.map((s) => s.id),
    without.map((s) => s.id),
  );
  assert.deepEqual(
    withRetention.map((s) => s.score),
    without.map((s) => s.score),
  );
  assert.equal(withRetention[0].id, "b");
});

test("rankStories records unmeasured metrics instead of scoring them as zero cost", () => {
  const ranked = rankStories([
    story("partial", { frameP95: null, mountMs: 30, longTasks: 2 }),
    story("full", { frameP95: 40, mountMs: 30, longTasks: 2 }),
  ]);
  const partial = ranked.find((s) => s.id === "partial");
  assert.deepEqual(partial.missing, ["frameP95"]);
  const full = ranked.find((s) => s.id === "full");
  assert.deepEqual(full.missing, []);
});

test("rankStories breaks ties by id so runs are reproducible", () => {
  const metrics = { frameP95: 10, mountMs: 10, longTasks: 1 };
  const ranked = rankStories([story("zebra", metrics), story("alpha", metrics), story("mongoose", metrics)]);
  assert.deepEqual(
    ranked.map((s) => s.id),
    ["alpha", "mongoose", "zebra"],
  );
});

test("rankStories never scores a story below zero", () => {
  // Metrics arrive from measurement and could go negative after any future
  // baseline subtraction; a negative contribution would drag a genuinely
  // expensive story below an idle one.
  const ranked = rankStories([
    story("negative", { frameP95: 40, mountMs: -30, longTasks: 5 }),
    story("idle", { frameP95: 1, mountMs: 1, longTasks: 0 }),
  ]);
  assert.ok(
    ranked.every((s) => s.score >= 0),
    "no story may score below zero",
  );
  assert.equal(ranked[0].id, "negative", "it is still the more expensive story on frame cost");
});

test("rankStories survives a run where nothing measured", () => {
  const ranked = rankStories([story("a", {}), story("b", {})]);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every((s) => s.score === 0));
  assert.deepEqual(ranked[0].missing, ["frameP95", "mountMs", "longTasks"]);
});
