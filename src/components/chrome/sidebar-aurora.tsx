"use client";

import { memo, useRef } from "react";

import { PRIDE_SEASON } from "../../lib/seasons";
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

export const SidebarAurora = memo(function SidebarAurora({
  colors = PRIDE_SEASON.colors,
}: {
  colors?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAuroraCanvas(canvasRef, FRAG, colors, "SidebarAurora");

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "14px",
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
});
