'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const vertexShader = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Same fbm/plasma math as before, but now outputs real alpha instead of a
// hardcoded 1.0. That's what lets it sit on top of the app background
// instead of painting its own black square.
const fragmentShader = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform float u_time;
  uniform vec2 u_resolution;

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
    float t = u_time * 0.8;
    vec3 accent = vec3(163.0 / 255.0, 230.0 / 255.0, 53.0 / 255.0);

    vec2 q = vec2(fbm(uv + t * 0.1), fbm(uv + vec2(1.0)));
    vec2 r = vec2(fbm(uv + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(uv + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));
    float f = fbm(uv + 4.0 * r);

    float distanceFromCore = length(uv);
    float blob = smoothstep(0.6, 0.25, distanceFromCore + f * 0.3);
    float glow = 0.08 / (distanceFromCore + 0.15);

    vec3 color = accent * (f * f * f + 0.6 * f * f + 0.5 * f) * blob + accent * glow * blob;
    float alpha = clamp(blob + glow * blob, 0.0, 1.0);

    // premultiplied: color already scaled by alpha
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// Internal render resolution is FIXED. The orb is scaled visually by its
// parent (see nucleus-shell.tsx) using CSS width/height, never by
// reallocating the WebGL drawing buffer mid-animation. That reallocation
// on every resize tick was the main source of the choppy transition.
const RENDER_SIZE = 320;

export function Nucleus() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

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
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied-alpha blend

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
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resLoc, canvas.width, canvas.height);

    let frame = 0;
    const render = (now: number) => {
      gl.uniform1f(timeLoc, reduceMotion ? 0 : now * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduceMotion) frame = requestAnimationFrame(render);
    };
    render(0);

    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}