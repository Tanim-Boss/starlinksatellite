import { createContext, useEffect, useMemo, useRef, useState, type ReactNode, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useApp } from "@/store";
import { earthState } from "@/lib/simClock";
import {
  CLOUDS_URLS,
  EARTH_URLS,
  NIGHT_URLS,
  loadTexture,
  makeFallbackEarth,
  makeGlowTexture,
} from "@/lib/textures";
import { earthFixedToLatLon } from "@/lib/astro";

/**
 * Ref to the inner (tilted, earth-fixed) group of the Earth assembly.
 * Components that draw earth-fixed geometry (stations, probe, ground track)
 * attach themselves through this context.
 */
export const EarthInnerContext = createContext<MutableRefObject<THREE.Group | null>>({
  current: null,
});

/** Faint lat/lon graticule on the surface (earth-fixed, y = north frame). */
function makeGraticuleGeometry(): THREE.BufferGeometry {
  const pts: number[] = [];
  const SEG = 72;
  const push = (a: THREE.Vector3, b: THREE.Vector3) => {
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };
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
      push(p, q);
    }
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const lo = THREE.MathUtils.degToRad(lon);
    for (let i = 0; i < SEG; i++) {
      const p0 = (i / SEG) * Math.PI * 2;
      const p1 = ((i + 1) / SEG) * Math.PI * 2;
      p.set(Math.cos(lo) * Math.sin(p0), Math.cos(p0), -Math.sin(lo) * Math.sin(p0));
      q.set(Math.cos(lo) * Math.sin(p1), Math.cos(p1), -Math.sin(lo) * Math.sin(p1));
      push(p, q);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** Fresnel limb-glow atmosphere shell. */
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
      gl_FragColor = vec4(col * rim * 1.5, rim);
    }
  `,
});

const GLOW_TEXTURE = makeGlowTexture();

export function EarthAssembly({ children }: { children?: ReactNode }) {
  const spinRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const [night, setNight] = useState<THREE.Texture | null>(null);
  const [clouds, setClouds] = useState<THREE.Texture | null>(null);

  const graticule = useMemo(() => makeGraticuleGeometry(), []);

  useEffect(() => {
    let alive = true;
    loadTexture(EARTH_URLS, (t) => alive && setMap(t), () => {
      if (alive) setMap(makeFallbackEarth());
    });
    loadTexture(NIGHT_URLS, (t) => alive && setNight(t));
    loadTexture(CLOUDS_URLS, (t) => alive && setClouds(t));
    return () => {
      alive = false;
    };
  }, []);

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.set(0, 0, earthState.angle);
    if (cloudsRef.current) {
      const { playing, speed } = useApp.getState();
      if (playing) cloudsRef.current.rotation.y += dt * speed * 0.0016;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const st = useApp.getState();
    const inner = innerRef.current;
    if (!inner) return;
    if (st.scenario !== "overlap") {
      if (st.selectedId !== null) st.selectSat(null);
      return;
    }
    const local = inner.worldToLocal(e.point.clone());
    const { latDeg, lonDeg } = earthFixedToLatLon(local);
    st.setProbe({ lat: latDeg, lon: lonDeg });
  };

  return (
    <EarthInnerContext.Provider value={innerRef}>
      {/* outer: spin about the (world z) north axis */}
      <group ref={spinRef}>
        {/* inner: tilt so the texture's +Y north pole aligns with world +Z */}
        <group ref={innerRef} rotation={[Math.PI / 2, 0, 0]}>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[1, 128, 128]} />
            <meshStandardMaterial
              map={map ?? undefined}
              color={map ? 0xffffff : 0x1d4e79}
              roughness={0.72}
              metalness={0.08}
              emissive={0xffffff}
              emissiveMap={night ?? undefined}
              emissiveIntensity={night ? 1.35 : 0}
            />
          </mesh>

          <lineSegments geometry={graticule} raycast={() => null}>
            <lineBasicMaterial color="#60a5fa" transparent opacity={0.16} />
          </lineSegments>

          {clouds && (
            <mesh ref={cloudsRef}>
              <sphereGeometry args={[1.006, 96, 96]} />
              <meshStandardMaterial
                map={clouds}
                transparent
                opacity={0.6}
                depthWrite={false}
                roughness={1}
              />
            </mesh>
          )}

          {children}

          {/* atmosphere limb glow + soft halo */}
          <mesh scale={1.05} raycast={() => null}>
            <sphereGeometry args={[1, 64, 64]} />
            <primitive object={ATMOSPHERE_MATERIAL} />
          </mesh>
          <sprite scale={[3.4, 3.4, 1]} raycast={() => null}>
            <spriteMaterial
              map={GLOW_TEXTURE}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.5}
            />
          </sprite>
        </group>
      </group>
    </EarthInnerContext.Provider>
  );
}
