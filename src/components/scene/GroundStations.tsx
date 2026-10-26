import { useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { GATEWAYS, latLonToEarthFixed } from "@/lib/astro";
import { useApp } from "@/store";

const _dir = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

/**
 * Gateway antennas on Earth's surface (earth-fixed frame, so they rotate
 * with the planet). Renders inside the Earth assembly's inner group.
 */
/** Only a handful of gateway labels — 13 of them turn the globe into soup. */
const LABELLED = new Set([9, 1, 10, 12, 11, 13]);

export function GroundStations() {
  const visible = useApp((s) => s.toggles.stations);
  const labelsVisible = useApp((s) => s.toggles.labels);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < GATEWAYS.length; i++) {
      const m = ringRefs.current[i];
      if (!m) continue;
      const s = 1 + 0.25 * Math.sin(t * 2 + i * 1.7);
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.3 * Math.sin(t * 2 + i * 1.7);
    }
  });

  if (!visible) return null;
  return (
    <group>
      {GATEWAYS.map((gw, i) => {
        latLonToEarthFixed(gw.lat, gw.lon, _dir);
        const quat = new THREE.Quaternion().setFromUnitVectors(_UP, _dir.clone().normalize());
        return (
          <group key={gw.name} position={_dir.clone()} quaternion={quat}>
            {/* antenna cone, apex pointing away from Earth */}
            <mesh position={[0, 0.007, 0]}>
              <coneGeometry args={[0.006, 0.016, 12]} />
              <meshStandardMaterial
                color="#a3e635"
                emissive="#65a30d"
                emissiveIntensity={0.9}
                roughness={0.4}
              />
            </mesh>
            {/* pulsing ring on the ground */}
            <mesh
              ref={(el) => {
                ringRefs.current[i] = el;
              }}
              rotation-x={-Math.PI / 2}
              position={[0, 0.0012, 0]}
            >
              <ringGeometry args={[0.008, 0.013, 24]} />
              <meshBasicMaterial color="#a3e635" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            {labelsVisible && LABELLED.has(i) && (
              <Html
                position={[0, 0.032, 0]}
                center
                zIndexRange={[40, 0]}
                wrapperClass="pointer-events-none"
                style={{ pointerEvents: "none" }}
              >
                <div className="whitespace-nowrap rounded border border-lime-400/25 bg-[#060b16]/80 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-lime-300/90">
                  {gw.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
