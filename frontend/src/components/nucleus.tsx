'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useWorkspaceStore } from '@/stores/workspace-store';

const vertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Same fbm/plasma math as the hand-tuned orb. Color and a few uniforms
// change with state. The blob shape stays the one Harvie already had.
const fragmentShader = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_state;
  uniform vec2 u_pointer;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0; float amplitude = 0.5;
    for (int i = 0; i < 5; i++) { value += amplitude * noise(p); p *= 2.0; amplitude *= 0.5; }
    return value;
  }

  void main() {
    vec2 uv = v_texCoord * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float listen = smoothstep(0.35, 0.85, u_state) * (1.0 - smoothstep(1.2, 1.75, u_state));
    float think = smoothstep(1.25, 1.8, u_state) * (1.0 - smoothstep(2.25, 2.8, u_state));
    float act = smoothstep(2.2, 2.85, u_state);
    float speed = 0.8 + think * 0.85 + act * 0.2;
    float t = u_time * speed;

    vec3 ember = vec3(245.0 / 255.0, 158.0 / 255.0, 91.0 / 255.0);
    vec3 hot = vec3(255.0 / 255.0, 211.0 / 255.0, 168.0 / 255.0);
    vec3 iris = vec3(139.0 / 255.0, 124.0 / 255.0, 246.0 / 255.0);
    vec3 accent = mix(ember, iris, think * 0.72);
    accent = mix(accent, hot, act * 0.34 + listen * 0.08);

    vec2 q = vec2(fbm(uv + t * 0.1), fbm(uv + vec2(1.0)));
    vec2 r = vec2(fbm(uv + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(uv + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));
    float f = fbm(uv + 4.0 * r);

    float ripple = sin(length(uv - u_pointer) * 16.0 - t * 6.0) * listen * 0.055;
    float distanceFromCore = length(uv);
    float blob = smoothstep(0.6, 0.25, distanceFromCore + f * 0.3 + ripple);
    float pulse = 0.5 + 0.5 * sin(u_time * 3.1);
    float glow = (0.08 + act * 0.06 * pulse) / (distanceFromCore + 0.15);
    float ring = smoothstep(0.018, 0.0, abs(distanceFromCore - (0.48 + pulse * 0.06))) * act;

    vec3 color = accent * (f * f * f + 0.6 * f * f + 0.5 * f) * blob + accent * glow * blob;
    color += hot * ring * 0.55;
    float alpha = clamp(blob + glow * blob + ring * 0.65, 0.0, 1.0);

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

const RENDER_SIZE = 320;
const STATE_VALUE = { idle: 0, listening: 1, thinking: 2, acting: 3 } as const;

export type OrbState = keyof typeof STATE_VALUE;

export function Nucleus({
  state,
  pointerRef,
}: {
  state?: OrbState;
  pointerRef?: MutableRefObject<{ x: number; y: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  const storeStatus = useWorkspaceStore((current) => current.agentStatus);
  const resolved = state ?? storeStatus;
  const stateRef = useRef(resolved);
  stateRef.current = resolved;
  const fallbackPointer = useRef({ x: 0, y: 0 });
  const activePointer = pointerRef ?? fallbackPointer;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = RENDER_SIZE * dpr;
    canvas.height = RENDER_SIZE * dpr;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const stateLoc = gl.getUniformLocation(program, 'u_state');
    const pointerLoc = gl.getUniformLocation(program, 'u_pointer');

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resLoc, canvas.width, canvas.height);

    let frame = 0;
    let visible = true;
    let blended = 0;
    const draw = (now: number) => {
      const target = STATE_VALUE[stateRef.current] ?? 0;
      blended += (target - blended) * 0.08;
      const point = activePointer.current;
      gl.uniform1f(timeLoc, reduceMotion ? 0 : now * 0.001);
      gl.uniform1f(stateLoc, reduceMotion ? target : blended);
      gl.uniform2f(pointerLoc, point.x, point.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const render = (now: number) => {
      if (!visible || document.hidden) return;
      draw(now);
      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
      }
    });
    const onVisibility = () => {
      if (!document.hidden && visible && !reduceMotion) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
      }
    };
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    draw(0);
    if (!reduceMotion) frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activePointer, reduceMotion]);

  useEffect(() => {
    if (pointerRef) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      fallbackPointer.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
