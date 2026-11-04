import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { comparisonConfig } from "../config";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";
import { makeBinaryTexture } from "../utils/textures";

const AXIS_UP = new THREE.Vector3(0, 1, 0);
const RING_COUNT = 4;

const WAVE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WAVE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float shimmer = 0.74 + 0.26 * sin(uTime * 5.0 + vUv.x * 6.2831);
    float edge = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
    gl_FragColor = vec4(uColor * shimmer, uOpacity * edge);
  }
`;

const BINARY_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BINARY_FRAGMENT = /* glsl */ `
  uniform sampler2D uDigits;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uFlow;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float flow = fract(vUv.y * 2.0 + uTime * uFlow * 0.32);
    vec2 digitUv = vec2(fract(vUv.x * 2.0), flow);
    float glyph = texture2D(uDigits, digitUv).a;
    float center = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5));
    float alpha = glyph * center * uOpacity;
    if (alpha < 0.025) discard;
    gl_FragColor = vec4(uColor * (0.62 + glyph * 0.55), alpha);
  }
`;

interface SignalBeamProps {
  sourceRef: RefObject<THREE.Object3D | null>;
  targetRef: RefObject<THREE.Object3D | null>;
  showReceive: boolean;
  showTransmit: boolean;
  showBinary?: boolean;
  active?: boolean;
}

/** A shader-driven, two-way-or-one-way link between a terminal and a satellite. */
export function SignalBeam({
  sourceRef,
  targetRef,
  showReceive,
  showTransmit,
  showBinary = false,
  active = true,
}: SignalBeamProps) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const waveMaterialRefs = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const binaryMaterialRefs = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const sourcePosition = useMemo(() => new THREE.Vector3(), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const alignment = useMemo(() => new THREE.Quaternion(), []);
  const digitTexture = useMemo(() => makeBinaryTexture(), []);
  const stage = useComparisonStore((state) => state.stage);
  const binaryUniforms = useMemo(
    () =>
      [1, -1].map((flow) => ({
        uDigits: { value: digitTexture },
        uColor: { value: new THREE.Color(comparisonConfig.colors.radio) },
        uTime: { value: 0 },
        uFlow: { value: flow },
        uOpacity: { value: 0.8 },
      })),
    [digitTexture],
  );
  const waveUniforms = useMemo(
    () =>
      Array.from({ length: RING_COUNT * 2 }, () => ({
        uColor: { value: new THREE.Color(comparisonConfig.colors.radio) },
        uTime: { value: 0 },
        uOpacity: { value: 0.78 },
      })),
    [],
  );

  useEffect(() => () => digitTexture?.dispose(), [digitTexture]);

  useFrame(() => {
    const root = rootRef.current;
    const source = sourceRef.current;
    const target = targetRef.current;
    if (!root || !source || !target) return;

    source.getWorldPosition(sourcePosition);
    target.getWorldPosition(targetPosition);
    direction.subVectors(targetPosition, sourcePosition);
    const distance = direction.length();
    if (distance < 0.001) return;
    direction.multiplyScalar(1 / distance);

    root.position.copy(sourcePosition);
    alignment.setFromUnitVectors(AXIS_UP, direction);
    root.quaternion.copy(alignment);
    root.scale.set(1, distance, 1);

    const time = comparisonClock.simTime;
    const receivePhase = (time * 0.72) % 1;
    const transmitPhase = (time * 0.91) % 1;
    for (let index = 0; index < ringRefs.current.length; index += 1) {
      const ring = ringRefs.current[index];
      const material = waveMaterialRefs.current[index];
      if (!ring || !material) continue;
      const isTransmit = index >= RING_COUNT;
      const subIndex = index % RING_COUNT;
      const phase = isTransmit ? transmitPhase : receivePhase;
      const travelling = (phase + subIndex / RING_COUNT) % 1;
      const position = isTransmit ? travelling : 1 - travelling;
      ring.visible = active && (isTransmit ? showTransmit : showReceive);
      ring.position.y = position;
      const ringSize = 0.1 + 0.13 * (0.45 + 0.55 * Math.sin((position + time) * Math.PI));
      ring.scale.set(ringSize, ringSize, ringSize);
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = active ? 0.7 : 0;
    }

    const binaryUp = binaryMaterialRefs.current[0];
    const binaryDown = binaryMaterialRefs.current[1];
    if (binaryUp) {
      binaryUp.uniforms.uTime.value = time;
      binaryUp.uniforms.uOpacity.value = active && showBinary && showTransmit && stage >= 1 ? 0.86 : 0;
    }
    if (binaryDown) {
      binaryDown.uniforms.uTime.value = time;
      binaryDown.uniforms.uOpacity.value = active && showBinary && showReceive && stage >= 1 ? 0.72 : 0;
    }
  });

  return (
    <group ref={rootRef}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.22, 1, 28, 1, true]} />
        <meshBasicMaterial
          color={comparisonConfig.colors.radio}
          transparent
          opacity={active ? 0.07 : 0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1, 10, 1]} />
        <meshBasicMaterial
          color="#ffc18b"
          transparent
          opacity={active ? 0.46 : 0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: RING_COUNT * 2 }, (_, index) => (
        <mesh
          key={`ring-${index}`}
          ref={(node) => {
            ringRefs.current[index] = node;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          scale={0.16}
        >
          <torusGeometry args={[1, 0.012, 6, 48]} />
          <shaderMaterial
            ref={(material) => {
              waveMaterialRefs.current[index] = material;
            }}
            uniforms={waveUniforms[index]}
            vertexShader={WAVE_VERTEX}
            fragmentShader={WAVE_FRAGMENT}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      {showBinary && digitTexture && (
        <>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 1, 18, 1, true]} />
            <shaderMaterial
              ref={(material) => {
                binaryMaterialRefs.current[0] = material;
              }}
              uniforms={binaryUniforms[0]}
              vertexShader={BINARY_VERTEX}
              fragmentShader={BINARY_FRAGMENT}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 1, 18, 1, true]} />
            <shaderMaterial
              ref={(material) => {
                binaryMaterialRefs.current[1] = material;
              }}
              uniforms={binaryUniforms[1]}
              vertexShader={BINARY_VERTEX}
              fragmentShader={BINARY_FRAGMENT}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
