"use client";

import { type RefObject, useEffect } from "react";

/**
 * Shared WebGL2 core for the sidebar auroras. The vertical and horizontal
 * variants differ only in their fragment main() (ramp axis + intensity
 * falloff); everything else — vertex shader, simplex noise, program
 * bootstrap, resize handling, render loop — lives here once.
 */

export const AURORA_VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

/** Fragment shader preamble: uniforms + 2D simplex noise (Ashima). */
export const AURORA_FRAG_PRELUDE = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec3  uColorStops[6];
uniform vec2  uResolution;
uniform float uBlend;
out vec4 fragColor;

vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x,289.0); }
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod(i,289.0);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m; m=m*m;
  vec3 x2=2.*fract(p*C.www)-1.;
  vec3 h=abs(x2)-.5; vec3 ox=floor(x2+.5); vec3 a0=x2-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

/* 6-stop colour ramp shared by both variants; t in [0,1] along the ramp axis. */
vec3 rampColor(float t){
  float fi = clamp(t * 5.0, 0.0, 4.999);
  int   ix = int(fi);
  float fr = fract(fi);
  vec3 colA, colB;
  if      (ix == 0) { colA = uColorStops[0]; colB = uColorStops[1]; }
  else if (ix == 1) { colA = uColorStops[1]; colB = uColorStops[2]; }
  else if (ix == 2) { colA = uColorStops[2]; colB = uColorStops[3]; }
  else if (ix == 3) { colA = uColorStops[3]; colB = uColorStops[4]; }
  else              { colA = uColorStops[4]; colB = uColorStops[5]; }
  return mix(colA, colB, fr);
}
`;

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

/**
 * Compiles `fragSource`, uploads the 6 colour stops, and runs the RAF
 * render loop with parent-sized canvas. `label` prefixes console errors.
 *
 * `resolutionScale` (0–1, default 1) shrinks the canvas backing store
 * relative to its CSS size; the compositor's bilinear upscale then supplies
 * free softness. Auroras are decorative, so a variant that used to stack a
 * CSS `blur()` on top of the shader (issue #65) can instead render fewer
 * pixels and get the same diffuse look from a single pass.
 */
export function useAuroraCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  fragSource: string,
  colors: string[],
  label: string,
  resolutionScale = 1,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) {
      console.error(`${label}: WebGL2 not available`);
      return;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function compileShader(type: number, src: string) {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error(`${label} shader error:`, gl!.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vert = compileShader(gl.VERTEX_SHADER, AURORA_VERT);
    const frag = compileShader(gl.FRAGMENT_SHADER, fragSource);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(`${label} link error:`, gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uStops = gl.getUniformLocation(prog, "uColorStops");
    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uBlend = gl.getUniformLocation(prog, "uBlend");

    gl.uniform3fv(uStops, new Float32Array(colors.slice(0, 6).flatMap(hexToRgb)));
    gl.uniform1f(uBlend, 0.75);

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const { width: w, height: h } = parent.getBoundingClientRect();
      const bw = Math.max(1, Math.round(w * resolutionScale));
      const bh = Math.max(1, Math.round(h * resolutionScale));
      canvas!.width = bw;
      canvas!.height = bh;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      gl!.viewport(0, 0, bw, bh);
      gl!.uniform2f(uRes, bw, bh);
    }

    let rafId = 0;
    const draw = (time: number) => {
      gl!.uniform1f(uTime, time);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    };
    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick);
      draw(ts * 0.001);
    };

    // prefers-reduced-motion: freeze the aurora on a single frame instead of
    // running the loop — the colour ramp stays, only the movement stops.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Pause the loop while the canvas is scrolled off-screen (a visible tab
    // keeps firing rAF for off-screen elements); resume it on re-entry.
    let onScreen = true;
    const startOrFreeze = () => {
      cancelAnimationFrame(rafId);
      if (reducedMotion.matches) draw(0);
      else if (onScreen) rafId = requestAnimationFrame(tick);
    };
    reducedMotion.addEventListener("change", startOrFreeze);

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0].intersectionRatio > 0;
      startOrFreeze();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion.matches) draw(0);
    });
    ro.observe(canvas.parentElement!);
    resize();
    startOrFreeze();

    // Do NOT call loseContext() — permanently destroys context, breaks React 18 Strict Mode remount.
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      reducedMotion.removeEventListener("change", startOrFreeze);
      ro.disconnect();
      // Free the GPU objects built in this effect run so palette changes and
      // Strict-Mode remounts don't orphan them on the (deliberately kept-alive)
      // context. Deleting resources is distinct from loseContext().
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buf);
    };
  }, [canvasRef, fragSource, colors, label, resolutionScale]);
}
