"use client";

import { memo, useRef } from "react";

import { AURORA_FRAG_PRELUDE, useAuroraCanvas } from "./aurora-canvas";

// Vertical variant: 6-stop colour ramp top→bottom. Intensity is computed by
// sampling at several horizontal offsets with a radius that grows toward the
// left edge, producing a gradual blur: sharp on the right, diffuse on the left.
const FRAG = `${AURORA_FRAG_PRELUDE}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec3 ramp = rampColor(1.0 - uv.y);

  // Noise drives organic horizontal shimmer.
  float n  = snoise(vec2(uv.y * 2.5 + uTime * 0.08, uTime * 0.18)) * 0.5;
       n  += snoise(vec2(uv.y * 5.0 - uTime * 0.05, uTime * 0.12 + 3.0)) * 0.25;

  // Gradual blur: sample intensity at several horizontal offsets.
  // blurR shrinks toward the right edge, so the right stays sharp
  // while the left becomes progressively more diffuse.
  float blurR = (1.0 - uv.x) * 0.09;
  float intensity = 0.0;
  float total = 0.0;
  for (int i = -4; i <= 4; i++) {
    float dx = float(i) * blurR;
    float xi = clamp((uv.x + dx - 0.4) * 2.0 + n * 0.22, 0.0, 1.0);
    float w = exp(-float(i * i) * 1.5);
    intensity += mix(0.03, uBlend, pow(xi, 2.0)) * w;
    total += w;
  }
  intensity /= total;

  fragColor = vec4(ramp, intensity);
}`;

// Softness that used to come from a CSS blur(6px) filter on the canvas —
// a second full-surface compositor blur every animated frame (issue #65).
// Instead we render the backing store at a fraction of the CSS size and let
// the compositor's bilinear upscale diffuse it in a single pass. 0.07 makes
// the bilinear tent's stddev ((1/scale)/sqrt(6) px) match the old 6px
// Gaussian, and won the pixel-diff sweep against the pre-change stories
// (0.05 / 0.07 / 0.1 / 0.15 / 1.0 tried — see issue #65's fix PR).
const RESOLUTION_SCALE = 0.07;

// Seasonal decor: rendered by Sidebar only while a season is active, in that
// season's palette — colors is required so the aurora can't appear unseasoned.
export const SidebarAurora = memo(function SidebarAurora({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAuroraCanvas(canvasRef, FRAG, colors, "SidebarAurora", RESOLUTION_SCALE);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "var(--radius-chrome, 14px)",
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
});
