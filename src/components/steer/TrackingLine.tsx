import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ANTENNA_Y, getTarget, targetPositionAt } from "@/lib/steering";
import { steerClock, useSteerLab } from "./steerStore";

/**
 * The geometric line of sight from the gimbal pivot to the *selected* target.
 * It is not the beam: during a handover the orange beam visibly departs from
 * this cyan dashed line until the gimbal catches up. They coincide on lock.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float dash = step(0.45, fract(vUv.y * 24.0));
    float ends = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));
    gl_FragColor = vec4(0.36, 0.88, 0.88, dash * ends * uOpacity);
  }
`;

const UP = new THREE.Vector3(0, 1, 0);

export function TrackingLine() {
  const mesh = useRef<THREE.Mesh>(null);
  const visible = useSteerLab((s) => s.showTrackingLine);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.6 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.014, 0.014, 1, 6, 1, true), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const node = mesh.current;
    if (!node || !visible) return;
    const def = getTarget(useSteerLab.getState().targetId);
    const point = targetPositionAt(def, steerClock.t);
    a.set(0, ANTENNA_Y, 0);
    b.set(point[0], point[1], point[2]);
    delta.copy(b).sub(a);
    const length = delta.length();
    node.position.copy(a).add(b).multiplyScalar(0.5);
    node.scale.set(1, length, 1);
    node.quaternion.setFromUnitVectors(UP, delta.normalize());
  });

  if (!visible) return null;
  return <mesh ref={mesh} geometry={geometry} material={material} raycast={() => null} />;
}
