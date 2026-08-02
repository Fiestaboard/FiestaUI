"use client";

import { memo, useRef } from "react";

import { AURORA_FRAG_PRELUDE, useAuroraCanvas } from "./aurora-canvas";

// Horizontal variant: colours run left→right, intensity builds a soft
// vertical glow concentrated in the bottom ~40% of the bar, fading upward,
// consistent with the vertical desktop sidebar aurora.
const FRAG = `${AURORA_FRAG_PRELUDE}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec3 ramp = rampColor(uv.x);

  // Noise samples along X — makes the aurora boundary undulate vertically over time.
  float n  = snoise(vec2(uv.x * 2.5 + uTime * 0.08, uTime * 0.18)) * 0.5;
       n  += snoise(vec2(uv.x * 5.0 - uTime * 0.05, uTime * 0.12 + 3.0)) * 0.25;

  // pow(yi, 2.0) has zero slope at yi=0 so the boundary dissolves smoothly.
  // No floor: above the boundary intensity is exactly 0, no ghost film.
  float yi = clamp(((1.0 - uv.y) - 0.4) * 2.0 + n * 0.18, 0.0, 1.0);
  float intensity = pow(yi, 2.0) * uBlend;

  fragColor = vec4(ramp, intensity);
}`;

// Seasonal decor: rendered by Sidebar only while a season is active, in that
// season's palette — colors is required so the aurora can't appear unseasoned.
export const SidebarAuroraHorizontal = memo(function SidebarAuroraHorizontal({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useAuroraCanvas(canvasRef, FRAG, colors, "SidebarAuroraHorizontal");

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "var(--radius-chrome-mobile, 16px)",
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
});
