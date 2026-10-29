import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { textures } from "../config";
import { simState, useSimStore } from "../hooks/useSimStore";
import { worldToLatLon } from "../utils/orbit";
import { makeCloudTexture, makeFallbackEarthTexture } from "../utils/textures";

/**
 * Earth: day map, night-side city lights as emissive, a thin procedural cloud
 * layer, a fresnel atmosphere rim and a faint graticule.
 *
 * The whole assembly spins once per 24 simulated hours about the north pole;
 * earth-fixed features (dish, gateway) are children of the spinning group.
 * Satellites and orbit rings live outside it — they follow inertial space.
 *
 * Clicking the globe moves the user dish to the clicked location.
 */

/* -------------------------------------------------------------------------- */
/* Procedural fallback earth (used only if the shipped textures 404)         */
/* -------------------------------------------------------------------------- */

function loadEarthTextures(
  onDay: (t: THREE.Texture) => void,
  onNight: (t: THREE.Texture) => void,
): void {
  const loader = new THREE.TextureLoader();
  const apply = (tex: THREE.Texture) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  };

  const tryDay = (i: number) => {
    if (i >= 2) {
      onDay(makeFallbackEarthTexture());
      return;
    }
    const urls = [textures.day, "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"];
    loader.load(
      urls[i],
      (t) => {
        apply(t);
        onDay(t);
      },
      undefined,
      () => tryDay(i + 1),
    );
  };
  tryDay(0);

  const tryNight = (i: number) => {
    if (i >= 1) return; // No local night map? Ship one — see public/textures/.
    loader.load(
      [textures.night][0],
      (t) => {
        apply(t);
        onNight(t);
      },
      undefined,
      () => {},
    );
  };
  tryNight(0);
}

/* -------------------------------------------------------------------------- */
/* Atmosphere                                                                 */
/* -------------------------------------------------------------------------- */

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
      float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.5);
      vec3 col = vec3(0.35, 0.65, 1.0);
      gl_FragColor = vec4(col * rim * 1.05, rim * 0.85);
    }
  `,
});

/* -------------------------------------------------------------------------- */
/* Graticule                                                                  */
/* -------------------------------------------------------------------------- */

function makeGraticuleGeometry(): THREE.BufferGeometry {
  const pts: number[] = [];
  const SEG = 72;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let lat = -75; lat <= 75; lat += 15) {
    const la = THREE.MathUtils.degToRad(lat);
    const r = Math.cos(la);
    const y = Math.sin(la);
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2;
      const a1 = ((i + 1) / SEG) * Math.PI * 2;
      p.set(r * Math.cos(a0), y, r * Math.sin(a0));
      q.set(r * Math.cos(a1), y, r * Math.sin(a1));
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/* -------------------------------------------------------------------------- */
/* Earth assembly                                                             */
/* -------------------------------------------------------------------------- */

export function EarthAssembly({ children }: { children?: ReactNode }) {
  const spinRef = useRef<THREE.Group>(null);
  const [day, setDay] = useState<THREE.Texture | null>(null);
  const [night, setNight] = useState<THREE.Texture | null>(null);
  const cloud = useMemo(() => makeCloudTexture(), []);
  const graticule = useMemo(() => makeGraticuleGeometry(), []);

  useEffect(() => {
    loadEarthTextures(setDay, setNight);
  }, []);

  useEffect(() => {
    // Disposal for the procedural textures R3F does not manage itself.
    return () => {
      cloud.dispose();
      graticule.dispose();
      if (day) day.dispose();
      if (night) night.dispose();
    };
  }, [cloud, graticule, day, night]);

  useFrame(() => {
    if (spinRef.current) spinRef.current.rotation.y = simState.earthAngle;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const inv = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -simState.earthAngle,
    );
    const local = e.point.clone().applyQuaternion(inv);
    const { latDeg, lonDeg } = worldToLatLon(local);
    if (Math.abs(latDeg) > 85) return; // too close to a pole to place a dish
    useSimStore.getState().setUser({ name: "Custom", lat: latDeg, lon: lonDeg });
  };

  return (
    <group>
      <group ref={spinRef}>
        <mesh onClick={handleClick}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={day ?? undefined}
            emissiveMap={night ?? undefined}
            emissive={0xffffff}
            emissiveIntensity={1}
            roughness={0.86}
            metalness={0.02}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.004, 48, 48]} />
          <meshStandardMaterial
            map={cloud}
            transparent
            opacity={0.32}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
        <mesh scale={1.045} material={ATMOSPHERE_MATERIAL} raycast={() => null}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        <lineSegments geometry={graticule} raycast={() => null}>
          <lineBasicMaterial color="#3ddbd9" transparent opacity={0.06} />
        </lineSegments>
        {children}
      </group>
    </group>
  );
}
