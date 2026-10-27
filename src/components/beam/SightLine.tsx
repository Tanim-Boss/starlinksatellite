import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DISH_Y, getSatellite, satellitePosition } from "@/lib/dishBeam";
import { beamClock, useBeamLab } from "./beamStore";

/**
 * A thin, dashed line from the panel to the satellite it is pointed at.
 *
 * The beam is not a laser: the orange column is the region where the array's
 * waves reinforce, and this cyan line is only the geometric line of sight. The
 * two coincide when the beam is on target, which is the point of the HUD's
 * error readout.
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
    float dash = step(0.42, fract(vUv.y * 26.0));
    float ends = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));
    gl_FragColor = vec4(0.42, 0.9, 0.9, dash * ends * uOpacity);
  }
`;

export function SightLine() {
  const mesh = useRef<THREE.Mesh>(null);
  const visible = useBeamLab((s) => s.showSightLine);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.55 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.022, 0.022, 1, 6, 1, true), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const node = mesh.current;
    if (!node || !visible) return;
    const def = getSatellite(useBeamLab.getState().targetId);
    const point = satellitePosition(def, beamClock.t);
    a.set(0, DISH_Y + 0.05, 0);
    b.set(point[0], point[1], point[2]);
    delta.copy(b).sub(a);
    const length = delta.length();
    node.position.copy(a).add(b).multiplyScalar(0.5);
    node.scale.set(1, length, 1);
    node.quaternion.setFromUnitVectors(up, delta.normalize());
  });

  if (!visible) return null;

  return <mesh ref={mesh} geometry={geometry} material={material} raycast={() => null} />;
}
