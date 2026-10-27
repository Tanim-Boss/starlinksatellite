import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ANTENNA_Y, type TechMode } from "@/lib/steering";
import { makeReticleTexture, makeSolarTexture } from "@/components/beam/beamTextures";
import { makeGlowTexture } from "@/lib/textures";
import { steerClock, useSteerLab } from "./steerStore";

const DEG = Math.PI / 180;

/** Closed parabolic profile (radius, height) revolved around the local Y. */
const DISH_PROFILE: [number, number][] = [
  [0, -0.135],
  [0.12, -0.128],
  [0.24, -0.1],
  [0.34, -0.055],
  [0.4, -0.018],
  [0.42, 0.002],
  [0.415, 0.024],
  [0.36, 0.02],
  [0.2, 0.012],
  [0, 0.016],
];

/** A thin cylinder stretched exactly between two points. */
function Strut({
  from,
  to,
  radius,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const delta = b.clone().sub(a);
    const len = delta.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.75} />
    </mesh>
  );
}

/** The RF head: a parabolic reflector with its feed horn on three struts. */
function DishHead() {
  const geometry = useMemo(() => {
    const points = DISH_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(points, 64);
    // The lathe axis is +Y; rotate the whole reflector so it faces +Z.
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const struts = useMemo(() => [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3], []);

  return (
    <group position={[0, 0, 0.06]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#d6dde8"
          roughness={0.32}
          metalness={0.72}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Rim — a torus already lies in the XY plane, the dish's mouth plane. */}
      <mesh>
        <torusGeometry args={[0.416, 0.012, 10, 64]} />
        <meshStandardMaterial color="#9aa6b6" roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Feed horn and its three support struts. */}
      {struts.map((angle) => {
        const x = Math.cos(angle) * 0.36;
        const y = Math.sin(angle) * 0.36;
        return (
          <Strut
            key={angle}
            from={[x, y, 0.02]}
            to={[x * 0.16, y * 0.16, 0.42]}
            radius={0.009}
            color="#39424f"
          />
        );
      })}
      <mesh position={[0, 0, 0.46]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.09, 0.12, 18]} />
        <meshStandardMaterial color="#c8d2e0" roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.4]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial
          color="#ffb066"
          emissive="#ff7a1a"
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The optical head: a baffle-shaded telescope tube with a glowing aperture. */
function OpticalHead() {
  const glow = useMemo(() => makeGlowTexture(), []);
  return (
    <group position={[0, 0, 0.06]}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.15, 0.17, 0.42, 28]} />
        <meshStandardMaterial color="#2b323d" roughness={0.42} metalness={0.78} />
      </mesh>
      {/* Baffles — rings around the tube's Z axis, so no extra rotation. */}
      {[-0.14, 0, 0.14].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[0.165, 0.014, 8, 40]} />
          <meshStandardMaterial color="#171c24" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
      {/* Aperture: the laser exit pupil, facing +Z. */}
      <mesh position={[0, 0, 0.22]}>
        <circleGeometry args={[0.125, 28]} />
        <meshStandardMaterial
          color="#e9d5ff"
          emissive="#a78bfa"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <sprite position={[0, 0, 0.24]} scale={[0.55, 0.55, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color="#a78bfa"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* Rear electronics box. */}
      <mesh position={[0, 0, -0.26]}>
        <boxGeometry args={[0.24, 0.24, 0.12]} />
        <meshStandardMaterial color="#39424f" roughness={0.45} metalness={0.8} />
      </mesh>
    </group>
  );
}

function MechanismLabel({
  position,
  text,
  color = "#9fe8ff",
}: {
  position: [number, number, number];
  text: string;
  color?: string;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={9}
      zIndexRange={[12, 0]}
      style={{ pointerEvents: "none" }}
      wrapperClass="pointer-events-none"
    >
      <span
        className="whitespace-nowrap rounded-full border bg-[#040a14]/85 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] backdrop-blur"
        style={{ borderColor: `${color}55`, color }}
      >
        {text}
      </span>
    </Html>
  );
}

/**
 * The source spacecraft: a metallic bus with blue solar wings and, on a mast,
 * the two-axis gimbal that carries the steerable terminal. The bus never
 * rotates — only the azimuth and elevation stages do, which is the point of
 * the whole simulation.
 */
export function SourceSatellite({ tech }: { tech: TechMode }) {
  const azRef = useRef<THREE.Group>(null);
  const elRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  const showLabels = useSteerLab((s) => s.showLabels);
  const view = useSteerLab((s) => s.view);
  const solar = useMemo(() => makeSolarTexture(), []);
  const reticle = useMemo(() => makeReticleTexture(), []);
  const detail = view === "mechanism";

  const bus = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b9c4d2", roughness: 0.34, metalness: 0.74 }),
    [],
  );
  const frame = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#39424f", roughness: 0.45, metalness: 0.82 }),
    [],
  );
  const cells = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: solar,
        roughness: 0.46,
        metalness: 0.4,
        emissive: "#0a2550",
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      }),
    [solar],
  );
  const foil = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c39a5c", roughness: 0.5, metalness: 0.85 }),
    [],
  );

  useFrame((state) => {
    if (azRef.current) azRef.current.rotation.y = steerClock.az * DEG;
    if (elRef.current) elRef.current.rotation.x = -steerClock.el * DEG;
    if (ledRef.current) {
      ledRef.current.emissiveIntensity = 1.4 + 1.2 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3));
    }
  });

  return (
    <group>
      {/* Bus */}
      <mesh material={bus}>
        <boxGeometry args={[0.95, 1.05, 0.82]} />
      </mesh>
      <mesh material={frame} position={[0, 0.58, 0]}>
        <boxGeometry args={[0.7, 0.08, 0.62]} />
      </mesh>
      {/* Gold-foil equipment panel */}
      <mesh material={foil} position={[0, 0, 0.42]}>
        <boxGeometry args={[0.72, 0.78, 0.03]} />
      </mesh>
      {/* Thruster nozzles */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, -0.58, -0.1]} rotation-x={Math.PI}>
          <cylinderGeometry args={[0.07, 0.11, 0.14, 14]} />
          <meshStandardMaterial color="#20262f" roughness={0.5} metalness={0.66} />
        </mesh>
      ))}
      {/* Status LED */}
      <mesh position={[0.36, 0.28, 0.43]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial
          ref={ledRef}
          color="#3ddbd9"
          emissive="#3ddbd9"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Solar wings */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.62, 0, 0]} rotation-z={Math.PI / 2} material={frame}>
            <cylinderGeometry args={[0.035, 0.035, 0.3, 10]} />
          </mesh>
          <mesh position={[side * 1.78, 0, 0]} material={frame}>
            <boxGeometry args={[2.32, 0.04, 0.96]} />
          </mesh>
          <mesh position={[side * 1.78, 0, 0]} material={cells}>
            <boxGeometry args={[2.24, 0.022, 0.88]} />
          </mesh>
          {/* Wing hinge */}
          <mesh position={[side * 0.98, 0, 0]} rotation-z={Math.PI / 2} material={frame}>
            <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
          </mesh>
        </group>
      ))}

      {/* Mast to the gimbal pivot */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.36, 14]} />
        <meshStandardMaterial color="#2a313c" roughness={0.42} metalness={0.78} />
      </mesh>

      {/* Two-axis gimbal */}
      <group position={[0, ANTENNA_Y, 0]}>
        {/* Fixed azimuth reference ring */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.31, 0.008, 8, 64]} />
          <meshBasicMaterial
            color="#3ddbd9"
            transparent
            opacity={detail ? 0.55 : 0.22}
            depthWrite={false}
          />
        </mesh>

        <group ref={azRef}>
          {/* Turntable */}
          <mesh>
            <cylinderGeometry args={[0.17, 0.2, 0.1, 24]} />
            <meshStandardMaterial color="#39424f" roughness={0.42} metalness={0.82} />
          </mesh>
          {/* Azimuth tick, rotates with the stage */}
          <mesh position={[0, 0.06, 0.31]}>
            <boxGeometry args={[0.05, 0.03, 0.02]} />
            <meshBasicMaterial color="#3ddbd9" toneMapped={false} />
          </mesh>

          {/* Fixed elevation reference ring (in the azimuth frame) */}
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.56, 0.006, 8, 64]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={detail ? 0.5 : 0.18}
              depthWrite={false}
            />
          </mesh>

          <group ref={elRef}>
            {/* Yoke */}
            <mesh position={[0, 0.05, 0.02]}>
              <boxGeometry args={[0.36, 0.1, 0.2]} />
              <meshStandardMaterial color="#46505e" roughness={0.4} metalness={0.8} />
            </mesh>
            {[-0.17, 0.17].map((y) => (
              <mesh key={y} position={[0, y, 0.06]}>
                <boxGeometry args={[0.06, 0.16, 0.14]} />
                <meshStandardMaterial color="#39424f" roughness={0.44} metalness={0.8} />
              </mesh>
            ))}
            {/* Elevation axle along X */}
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.035, 0.035, 0.42, 12]} />
              <meshStandardMaterial color="#525d6c" roughness={0.4} metalness={0.75} />
            </mesh>
            {/* Elevation tick, sweeps with the head */}
            <mesh position={[0, 0, 0.56]}>
              <boxGeometry args={[0.04, 0.04, 0.02]} />
              <meshBasicMaterial color="#fbbf24" toneMapped={false} />
            </mesh>

            {tech === "rf" ? <DishHead /> : <OpticalHead />}

            {showLabels && detail && (
              <>
                <MechanismLabel position={[0.42, -0.12, 0]} text="Azimuth stage · Y axis" />
                <MechanismLabel position={[0.34, 0.22, 0.1]} text="Elevation stage" color="#fbbf24" />
                <MechanismLabel
                  position={[0, 0.28, 0.55]}
                  text={tech === "rf" ? "Feed horn" : "Optical aperture"}
                  color={tech === "rf" ? "#ff9a4d" : "#c4b5fd"}
                />
              </>
            )}
          </group>
        </group>

        {showLabels && detail && (
          <MechanismLabel position={[0, -0.28, 0.34]} text="Gimbal pivot" />
        )}
      </group>

      {/* Source label */}
      {showLabels && (
        <Html
          position={[0, -0.95, 0]}
          center
          distanceFactor={13}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: "none" }}
          wrapperClass="pointer-events-none"
        >
          <span className="whitespace-nowrap rounded-full border border-white/20 bg-[#040a14]/85 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#dce7f7] backdrop-blur">
            Source satellite
          </span>
        </Html>
      )}

      {/* Soft selection halo behind the bus to anchor the scene. */}
      <sprite scale={[3.4, 3.4, 1]} raycast={() => null}>
        <spriteMaterial
          map={reticle}
          color="#5f7ea8"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
