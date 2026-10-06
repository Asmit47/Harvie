'use client';

import { PresentationControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'acting';

const STATE_VALUE: Record<OrbState, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  acting: 3,
};

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vObj;
  void main() {
    vObj = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vObj;
  uniform float uTime;
  uniform float uState;
  uniform vec2 uPointer;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float listen = smoothstep(0.35, 0.9, uState) * (1.0 - smoothstep(1.25, 1.75, uState));
    float think = smoothstep(1.25, 1.8, uState) * (1.0 - smoothstep(2.25, 2.8, uState));
    float act = smoothstep(2.2, 2.85, uState);
    float speed = mix(0.22, 0.72, max(think, act * 0.65));

    vec2 uv = vObj.xy;
    float n = fbm(uv * 1.35 + uTime * speed);
    float n2 = fbm(uv * 2.15 - uTime * speed * 0.72 + n);
    float fres = pow(1.0 - clamp(abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 1.55);
    float core = smoothstep(0.85, 0.05, length(uv - vec2(-0.12, 0.16)));

    vec3 hot = vec3(1.0, 0.827, 0.659);
    vec3 ember = vec3(0.961, 0.620, 0.357);
    vec3 rose = vec3(0.910, 0.439, 0.561);
    vec3 iris = vec3(0.545, 0.486, 0.965);

    vec3 color = mix(hot, ember, smoothstep(0.05, 0.82, length(uv)));
    color = mix(color, rose, n2 * 0.62);
    color = mix(color, iris, fres * (0.42 + think * 0.48) + n * think * 0.22);
    color = mix(color, hot, core * (0.45 + act * 0.25));
    color += ember * act * 0.16;

    float ripple = sin(length(uv - uPointer * 0.55) * 26.0 - uTime * 7.0);
    color += hot * listen * smoothstep(0.95, 0.05, length(uv - uPointer * 0.55)) * (0.5 + 0.5 * ripple) * 0.28;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function OrbMesh({ state, pointer }: { state: OrbState; pointer: MutableRefObject<{ x: number; y: number }> }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const target = STATE_VALUE[state];

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uState: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.1, 0.15) },
    }),
    [],
  );

  useFrame((_, delta) => {
    const mat = material.current;
    const body = mesh.current;
    if (!mat || !body) return;
    const step = Math.min(delta, 0.05);
    mat.uniforms.uTime.value += step;
    const current = mat.uniforms.uState.value as number;
    mat.uniforms.uState.value = THREE.MathUtils.damp(current, target, 4.2, step);
    mat.uniforms.uPointer.value.set(pointer.current.x, pointer.current.y);

    const stateNow = mat.uniforms.uState.value as number;
    const idle = 1 - Math.min(stateNow, 1);
    const breathe = 1 + Math.sin(mat.uniforms.uTime.value * (Math.PI / 2)) * 0.015 * idle;
    body.scale.setScalar(breathe);

    if (ring.current && ringMaterial.current) {
      const acting = Math.min(Math.max(stateNow - 2.2, 0) / 0.8, 1);
      const pulse = 0.5 + 0.5 * Math.sin(mat.uniforms.uTime.value * 3.4);
      ring.current.scale.setScalar(1 + pulse * 0.08);
      ringMaterial.current.opacity = acting * (0.18 + pulse * 0.42);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.05, 96, 96]} />
        <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
      </mesh>
      <mesh ref={ring} rotation={[1.15, 0.2, 0]}>
        <ringGeometry args={[1.42, 1.5, 80]} />
        <meshBasicMaterial ref={ringMaterial} color="#F59E5B" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function OrbScene({
  state,
  interactive,
  pointer,
  onReady,
}: {
  state: OrbState;
  interactive: boolean;
  pointer: MutableRefObject<{ x: number; y: number }>;
  onReady?: () => void;
}) {
  const mesh = <OrbMesh state={state} pointer={pointer} />;

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, interactive ? 4.15 : 5.6], fov: 32 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        onReady?.();
      }}
      style={{ width: '100%', height: '100%', pointerEvents: interactive ? 'auto' : 'none' }}
    >
      {interactive ? (
        <PresentationControls
          global={false}
          cursor={false}
          snap
          speed={1.4}
          polar={[-0.105, 0.105]}
          azimuth={[-0.105, 0.105]}
          damping={0.2}
        >
          {mesh}
        </PresentationControls>
      ) : (
        mesh
      )}
    </Canvas>
  );
}
