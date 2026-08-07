/**
 * Pure analysis logic for runtime-bench reports.
 *
 * No I/O, no Playwright, no process access — every export here is a plain data
 * transform so it can be unit-tested directly. All judgement about what counts
 * as a stable measurement, a leak, or an expensive story lives in this file;
 * bench.mjs only drives the browser and renders.
 *
 * The governing constraint: this harness is an INSTRUMENT for the perf-explore
 * loop, never a CI gate. It therefore does not need to be precise enough to
 * block a merge — which is exactly the requirement that would have made it
 * flaky on shared runners. It produces a ranking and a leak signal, both of
 * which survive noise that would wreck an absolute threshold.
 *
 * See docs/superpowers/specs/2026-08-07-perf-explore-loop-design.md.
 */

export const STABILITY = {
  /** Reject a measurement whose IQR exceeds this fraction of its median. */
  unstableRatio: 0.35,
  /** Fewer samples than this and we do not trust the spread estimate at all. */
  minSamples: 3,
  /**
   * Relative spread is meaningless as a value approaches zero: a median of
   * 0.2ms with an IQR of 0.1ms is a 50% ratio but a rounding artifact, not
   * instability. Below this, treat the measurement as stable.
   */
  minMedian: 1,
};

export const LEAK = {
  /**
   * Net retained KB per mount/unmount cycle at or above which we flag.
   *
   * This is deliberately high. Cycling any story through Storybook's own
   * story-switching machinery grows the heap ~145 KB/cycle all by itself, and
   * that floor varies by ±20-30 KB between stories that cannot possibly differ
   * in retention (measured across the 19 `ui-button--*` stories, which ranged
   * 133-177 KB/cycle). Baseline subtraction removes the floor; this threshold
   * clears the residual spread with room to spare. An undisposed WebGL context
   * or a surviving rAF loop retains far more than this.
   */
  slopeKb: 64,
  /** Fit quality required to call it a leak rather than a suspicion. */
  minR2: 0.8,
  /** Below this many cycles a slope is not worth fitting. */
  minCycles: 4,
};

/**
 * Relative weights for the composite cost score.
 *
 * Frame cost leads because it is paid continuously. Mount cost is paid once
 * and long-task count partially overlaps frame cost, so both are discounted.
 *
 * Retention is deliberately absent: it is measured but not calibrated (see
 * RETENTION_CALIBRATION below), so folding it into the ranking would let an
 * uninterpretable number reorder the results.
 */
export const WEIGHTS = {
  frameP95: 0.5,
  mountMs: 0.35,
  longTasks: 0.15,
};

/**
 * Why retention verdicts are suppressed by default.
 *
 * The measurement works — it reliably produces a clean, linear heap series —
 * but the artifact it has to be corrected for is PROPORTIONAL to story weight,
 * and subtracting a constant control baseline cannot remove a proportional
 * effect. Measured on this repo:
 *
 *   ui-button--default (trivial)                 ~141 KB/cycle
 *   design-system-inventory--compact-showcase    ~224 KB/cycle
 *   design-system-inventory--all-components      ~504 KB/cycle
 *
 * A trivial Button cannot retain 141 KB per mount/unmount cycle, so the floor
 * is Storybook's own per-render retention, and it scales with how much the
 * story renders. After constant subtraction the residue still tracked story
 * size almost perfectly: 9 of 45 components ranked as "leaking" in mount-cost
 * order, which is a size signal wearing a leak costume.
 *
 * Correcting this needs a size-proportional model (regress retention against a
 * weight proxy across several control stories, subtract the prediction) — real
 * work, and not something to guess at. Until then the series is reported as
 * data and the verdict is withheld, because a false leak issue costs a
 * maintainer far more than a missing one.
 */
export const RETENTION_CALIBRATION = "uncalibrated";

/** Linear-interpolated percentile. `p` is a fraction in [0, 1]. */
export function percentile(values, p) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Reduce repeated samples to a reportable measurement.
 *
 * When the samples are too few or too scattered, `value` is null and
 * `unstable` is true. That distinction matters downstream: the explorer is
 * instructed to read a null as "unknown", never as "fine". Suppressing the
 * number is deliberate — an unstable median quoted in an issue body would be
 * treated as fact by every reader after it.
 */
export function summarize(samples, { unstableRatio = STABILITY.unstableRatio } = {}) {
  const clean = samples.filter((v) => Number.isFinite(v));
  if (clean.length === 0) {
    return { n: 0, value: null, rawMedian: null, iqr: null, ratio: null, unstable: true, reason: "no-samples" };
  }

  const rawMedian = percentile(clean, 0.5);
  const iqr = percentile(clean, 0.75) - percentile(clean, 0.25);
  const ratio = rawMedian > STABILITY.minMedian ? iqr / rawMedian : 0;

  let reason = null;
  if (clean.length < STABILITY.minSamples) reason = "too-few-samples";
  else if (ratio > unstableRatio) reason = "high-variance";

  const unstable = reason !== null;
  return { n: clean.length, value: unstable ? null : rawMedian, rawMedian, iqr, ratio, unstable, reason };
}

/**
 * Least-squares fit of `ys` against x = 0, 1, 2, ... Returns slope per step
 * and r² so callers can tell a trend from a scatter.
 */
export function linearFit(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };

  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - meanX) * (ys[i] - meanY);
    sxx += (i - meanX) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - (intercept + slope * i)) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  // A perfectly flat series has zero total variance; that is a clean fit of a
  // constant, not an undefined one.
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Classify heap-after-GC readings taken once per mount/unmount cycle.
 *
 * A real teardown bug grows the heap monotonically with cycle count, which is
 * a much stronger signal than any single absolute reading — that is why this
 * fits a slope instead of thresholding a total.
 *
 * `baselineSlopeKb` is the slope a control story produced under the identical
 * procedure, and subtracting it is not optional. Storybook's own story
 * switching retains ~145 KB per cycle no matter what is being mounted, so the
 * raw slope says almost nothing about the component: an early version of this
 * harness reported every one of 19 trivial Button stories as leaking ~146
 * KB/cycle. What survives baseline subtraction is the component's own
 * retention.
 */
export function classifyLeak(heapKbByCycle, { baselineSlopeKb = 0, thresholds = LEAK } = {}) {
  const clean = heapKbByCycle.filter((v) => Number.isFinite(v));
  if (clean.length < thresholds.minCycles) {
    return {
      verdict: "unknown",
      slopeKb: null,
      rawSlopeKb: null,
      baselineSlopeKb,
      r2: null,
      reason: "too-few-cycles",
      cycles: clean.length,
    };
  }

  const { slope, r2 } = linearFit(clean);
  const net = slope - baselineSlopeKb;

  // A leak keeps growing; an allocation footprint plateaus. Heavier stories
  // allocate more per mount and take longer to settle, so the slope over the
  // whole series scales with story size and flags big-but-healthy components:
  // an earlier version reported 8 of 45 stories as leaking, ranked almost
  // perfectly by mount cost. Requiring the SECOND HALF to still be climbing
  // separates unbounded growth from a footprint that has levelled off.
  const half = clean.slice(Math.floor(clean.length / 2));
  const tailSlope = half.length >= 2 ? linearFit(half).slope : slope;
  const netTail = tailSlope - baselineSlopeKb;

  let verdict;
  let reason = null;
  if (net < thresholds.slopeKb) {
    verdict = "clean";
  } else if (netTail < thresholds.slopeKb) {
    verdict = "suspect";
    reason = "plateau";
  } else if (r2 >= thresholds.minR2) {
    verdict = "leak";
  } else {
    verdict = "suspect";
    reason = "scatter";
  }

  return {
    verdict,
    slopeKb: net,
    tailSlopeKb: netTail,
    rawSlopeKb: slope,
    baselineSlopeKb,
    r2,
    reason,
    cycles: clean.length,
  };
}

/**
 * Rank stories by composite cost.
 *
 * Each metric is normalised against the highest value observed in this run,
 * so the score is explicitly relative — comparing scores across runs or
 * machines is meaningless and the report says so. Metrics that came back
 * unstable contribute nothing and are listed in `missing`, so a story is never
 * ranked low merely because it failed to measure.
 */
export function rankStories(stories, weights = WEIGHTS) {
  const keys = Object.keys(weights);
  const maxes = {};
  for (const key of keys) {
    const values = stories.map((s) => s.metrics?.[key]).filter((v) => Number.isFinite(v) && v > 0);
    maxes[key] = values.length > 0 ? Math.max(...values) : 0;
  }

  return (
    stories
      .map((story) => {
        const missing = [];
        let score = 0;
        for (const key of keys) {
          const value = story.metrics?.[key];
          if (!Number.isFinite(value)) {
            missing.push(key);
            continue;
          }
          // Clamp at zero. Baseline subtraction can make net retention
          // negative, which means "retains less than the control" — that is no
          // cost, not negative cost. Left unclamped it drags a story's whole
          // composite score below zero and misranks it against stories that
          // simply measured slightly above the floor.
          if (maxes[key] > 0) score += (Math.max(0, value) / maxes[key]) * weights[key];
        }
        return { ...story, score, missing };
      })
      // Tie-break on id so the ranking is reproducible across runs.
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  );
}
