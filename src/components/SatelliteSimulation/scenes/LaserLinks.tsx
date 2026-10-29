import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { colors } from "../config";
import { LASER_MESH, SATS } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { lineOfSightClear } from "../utils/links";
import { satPosition } from "../utils/orbit";

const LINK_COUNT = LASER_MESH.length;

const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();

const LASER_VERT = /* glsl */ `
  attribute float aU;      // 0 at sat A, 1 at sat B
  attribute float aVisible; // 0 when Earth blocks the link
  varying float vU;
  varying float vVisible;
  void main() {
    vU = aU;
    vVisible = aVisible;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LASER_FRAG = /* glsl */ `
  uniform float uTime;   // simulated seconds
  uniform float uPulses; // pulses along each link
  uniform float uSpeed;  // cycles per simulated second
  uniform vec3 uColor;
  varying float vU;
  varying float vVisible;
  void main() {
    float pulse = fract(vU * uPulses - uTime * uSpeed);
    float glow = pow(max(0.0, 1.0 - abs(pulse - 0.5) * 12.0), 3.0);
    float core = smoothstep(0.3, 0.0, abs(vU - 0.5)) * 0.3;
    float alpha = (0.08 + glow * 1.1 + core) * vVisible;
    gl_FragColor = vec4(uColor * (0.15 + glow * 1.6 + core), alpha);
  }
`;

/**
 * The inter-satellite laser mesh: one LineSegments with a shared
 * BufferGeometry, endpoints recomputed every frame, and a shader that draws
 * light pulses travelling along each link. Links whose straight line passes
 * through Earth (radius + atmosphere) are hidden — checked per frame because
 * satellites move.
 */
export function LaserLinks() {
  const show = useSimStore((s) => s.toggles.laserMesh);
  const geometry = useMemo(() => {
    const positions = new Float32Array(LINK_COUNT * 2 * 3);
    const uAttr = new Float32Array(LINK_COUNT * 2);
    const visAttr = new Float32Array(LINK_COUNT * 2);
    for (let i = 0; i < LINK_COUNT; i++) {
      uAttr[i * 2] = 0;
      uAttr[i * 2 + 1] = 1;
      visAttr[i * 2] = 1;
      visAttr[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aU", new THREE.BufferAttribute(uAttr, 1));
    g.setAttribute("aVisible", new THREE.BufferAttribute(visAttr, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPulses: { value: 3 },
          uSpeed: { value: 0.4 },
          uColor: { value: new THREE.Color(colors.laser) },
        },
        vertexShader: LASER_VERT,
        fragmentShader: LASER_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uTime.value = simState.time;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const visAttr = geometry.getAttribute("aVisible") as THREE.BufferAttribute;
    const t = simState.time;
    let k = 0;
    for (const link of LASER_MESH) {
      satPosition(SATS[link.a], t, _pa);
      satPosition(SATS[link.b], t, _pb);
      const clear = lineOfSightClear(_pa, _pb);
      posAttr.setXYZ(k, _pa.x, _pa.y, _pa.z);
      posAttr.setXYZ(k + 1, _pb.x, _pb.y, _pb.z);
      visAttr.setX(k, clear ? 1 : 0);
      visAttr.setX(k + 1, clear ? 1 : 0);
      k += 2;
    }
    posAttr.needsUpdate = true;
    visAttr.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} material={material} visible={show} frustumCulled={false} raycast={() => null} />
  );
}
