import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { textures } from "../config";
import { simState, useSimStore } from "../hooks/useSimStore";
import { worldToLatLon } from "../utils/orbit";
import { makeFallbackEarthTexture } from "../utils/textures";
import { earthAppearance } from "../utils/earthAppearance";

/** A subtle atmosphere at the limb, not a white shell over the surface. */
const ATMOSPHERE_MATERIAL = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
      gl_FragColor = vec4(vec3(0.20, 0.46, 0.85) * rim, rim * 0.5);
    }
  `,
});

/**
 * The local day map is the actual surface colour; the optional night map
 * adds dim city lights. Until the maps arrive, render a dark blue globe,
 * never an untextured white emissive sphere. A change in map availability
 * remounts the material so three.js compiles the correct shader variant.
 *
 * Earth-fixed objects live in the rotating group. Orbits stay inertial.
 */
export function EarthAssembly({ children }: { children?: ReactNode }) {
  const spinRef = useRef<THREE.Group>(null);
  const [day, setDay] = useState<THREE.Texture | null>(null);
  const [night, setNight] = useState<THREE.Texture | null>(null);
  const mode = useSimStore((s) => s.cameraMode);
  const { key: materialKey, ...materialProps } = earthAppearance(day, night);

  useEffect(() => {
    let alive = true;
    const owned: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    const accept = (texture: THREE.Texture, set: (value: THREE.Texture) => void) => {
      if (!alive) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      owned.push(texture);
      set(texture);
    };

    loader.load(
      textures.day,
      (texture) => accept(texture, setDay),
      undefined,
      () => {
        if (alive) accept(makeFallbackEarthTexture(), setDay);
      },
    );
    loader.load(textures.night, (texture) => accept(texture, setNight), undefined, () => {});

    return () => {
      alive = false;
      owned.forEach((texture) => texture.dispose());
    };
  }, []);

  useFrame(() => {
    if (spinRef.current) spinRef.current.rotation.y = simState.earthAngle;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const inv = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -simState.earthAngle,
    );
    const { latDeg, lonDeg } = worldToLatLon(e.point.clone().applyQuaternion(inv));
    if (Math.abs(latDeg) > 85) return;
    useSimStore.getState().setUser({ name: "Custom", lat: latDeg, lon: lonDeg });
  };

  return (
    <group ref={spinRef}>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial
          key={materialKey}
          {...materialProps}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* The ground camera is inside the atmospheric shell; hide the limb
          effect there so it cannot wash out the whole sky. */}
      {mode !== "dish" && (
        <mesh scale={1.035} material={ATMOSPHERE_MATERIAL} raycast={() => null}>
          <sphereGeometry args={[1, 48, 48]} />
        </mesh>
      )}
      {children}
    </group>
  );
}
