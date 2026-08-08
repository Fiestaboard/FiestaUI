"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
  colorStops?: [string, string, string];
  amplitude?: number;
  blend?: number;
  speed?: number;
  time?: number;
}

export function Aurora({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  time,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ colorStops, amplitude, blend, speed, time });
  // Sync the ref before paint rather than during render: a render-phase ref
  // write runs on discarded/concurrent renders too, and React 19 warns
  // against it. useLayoutEffect fires before the browser paints, so the rAF
  // loop below still reads fresh values on the same frame.
  useLayoutEffect(() => {
    propsRef.current = { colorStops, amplitude, blend, speed, time };
  });

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    // ogl is loaded lazily so it never enters any consumer's synchronous
    // module graph — Aurora is the only export that reaches it (issue #64).
    // WebGL init already happens post-mount, so the extra microtask (or async
    // chunk fetch) before the first frame is invisible: the canvas fades in
    // from transparent either way.
    let cancelled = false;
    let teardown: (() => void) | undefined;

    void (async () => {
      const { Color, Mesh, Program, Renderer, Triangle } = await import("ogl");
      // Unmounted while the import was in flight: bail before touching the
      // DOM or creating any GL resources.
      if (cancelled) return;

      const renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.canvas.style.backgroundColor = "transparent";

      const geometry = new Triangle(gl);
      if (geometry.attributes.uv) {
        delete geometry.attributes.uv;
      }

      // Convert hex color stops to rgb triples, memoized on the stop values so
      // the conversion (and its allocations) only happens when they change,
      // not on every rAF frame.
      let cachedStopsKey = "";
      let cachedStops: number[][] = [];
      const toColorStops = (stops: [string, string, string]) => {
        const key = stops.join(",");
        if (key !== cachedStopsKey) {
          cachedStopsKey = key;
          cachedStops = stops.map((hex) => {
            const c = new Color(hex);
            return [c.r, c.g, c.b];
          });
        }
        return cachedStops;
      };

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: propsRef.current.amplitude },
          uColorStops: { value: toColorStops(propsRef.current.colorStops) },
          uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
          uBlend: { value: propsRef.current.blend },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });

      const renderFrame = (t: number) => {
        const props = propsRef.current;
        const timeVal = props.time ?? t * 0.01;
        program.uniforms.uTime.value = timeVal * (props.speed ?? 1.0) * 0.1;
        program.uniforms.uAmplitude.value = props.amplitude ?? 1.0;
        program.uniforms.uBlend.value = props.blend ?? 0.5;
        program.uniforms.uColorStops.value = toColorStops(props.colorStops);
        renderer.render({ scene: mesh });
      };

      // prefers-reduced-motion: freeze the aurora on a single frame instead of
      // running the rAF loop — the colour ramp stays, only the movement stops.
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      let appliedWidth = 0;
      let appliedHeight = 0;
      function resize() {
        if (!ctn) return;
        const width = ctn.offsetWidth;
        const height = ctn.offsetHeight;
        // renderer.setSize re-allocates the drawing buffer — skip when the
        // container hasn't actually changed size.
        if (width === appliedWidth && height === appliedHeight) return;
        appliedWidth = width;
        appliedHeight = height;
        renderer.setSize(width, height);
        program.uniforms.uResolution.value = [width, height];
        if (reducedMotion.matches) renderFrame(0);
      }
      // Coalesce resize events to one applied size per frame — a window drag
      // fires dozens of events per second, and each un-coalesced call would
      // re-allocate the GL drawing buffer (see scaled-board-display.tsx for
      // the same pattern).
      let resizeRafId: number | null = null;
      const onResize = () => {
        if (resizeRafId !== null) return;
        resizeRafId = requestAnimationFrame(() => {
          resizeRafId = null;
          resize();
        });
      };
      window.addEventListener("resize", onResize);

      ctn.appendChild(gl.canvas);

      let animateId = 0;
      const update = (t: number) => {
        animateId = requestAnimationFrame(update);
        renderFrame(t);
      };

      // Pause the rAF loop while the container is scrolled out of view — a
      // visible tab keeps firing rAF for off-screen elements, so without this
      // the shader keeps painting frames nobody can see. Restart on re-entry.
      let onScreen = true;
      const startOrFreeze = () => {
        cancelAnimationFrame(animateId);
        if (reducedMotion.matches) renderFrame(0);
        else if (onScreen) animateId = requestAnimationFrame(update);
      };
      reducedMotion.addEventListener("change", startOrFreeze);

      const observer = new IntersectionObserver((entries) => {
        onScreen = entries[0].intersectionRatio > 0;
        startOrFreeze();
      });
      observer.observe(ctn);

      resize();
      startOrFreeze();

      teardown = () => {
        cancelAnimationFrame(animateId);
        observer.disconnect();
        reducedMotion.removeEventListener("change", startOrFreeze);
        window.removeEventListener("resize", onResize);
        if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
        if (ctn && gl.canvas.parentNode === ctn) {
          ctn.removeChild(gl.canvas);
        }
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    })();

    return () => {
      // Handles both states: before init resolves (`cancelled` stops the
      // pending IIFE from touching anything) and after (`teardown` releases
      // the GL context, listeners, and canvas).
      cancelled = true;
      teardown?.();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
