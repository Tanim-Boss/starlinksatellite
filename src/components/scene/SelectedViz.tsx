import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  KM_PER_UNIT,
  SATS,
  SHELLS,
  coverageInfo,
  orbitalVelocityKmS,
  satPosition,
} from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";
import { formatInt } from "@/lib/format";

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

const PULSE_GEOMETRY = new THREE.SphereGeometry(0.008, 8, 8);

/**
 * Everything that visualises the currently selected satellite:
 *  - its coverage footprint (spherical cap + crisp rim) on Earth's surface
 *  - the signal beam cone from the satellite down to the footprint edge
 *  - a pulse travelling down the beam
 *  - a nadir line to the sub-satellite point
 *  - a pulsing billboard ring + a DOM label
 */
export function SelectedViz() {
  const selectedId = useApp((s) => s.selectedId);
  const beamsOn = useApp((s) => s.toggles.beams);
  const labelsOn = useApp((s) => s.toggles.labels);

  const capGroupRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const billRef = useRef<THREE.Group>(null);
  const labelGroupRef = useRef<THREE.Group>(null);

  const shell = selectedId !== null ? SHELLS[SATS[selectedId].shell] : null;
  const shellKey = shell?.key;

  const capGeom = useMemo(() => {
    if (!shell) return null;
    const lambda = Math.acos(1 / (1 + shell.altitudeKm / KM_PER_UNIT));
    return new THREE.SphereGeometry(1.0018, 48, 24, 0, Math.PI * 2, 0, lambda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellKey]);

  const edgeGeom = useMemo(() => {
    if (!shell) return null;
    const lambda = Math.acos(1 / (1 + shell.altitudeKm / KM_PER_UNIT));
    const pts: number[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      pts.push(Math.sin(lambda) * Math.cos(a), Math.cos(lambda), Math.sin(lambda) * Math.sin(a));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellKey]);

  const coneGeom = useMemo(() => {
    if (!shell) return null;
    const h = shell.altitudeKm / KM_PER_UNIT;
    const d = (h * (2 + h)) / (1 + h); // apex -> base (tangent plane) distance
    const rho = Math.sqrt(h * (2 + h)) / (1 + h); // base radius at the tangent circle
    return new THREE.ConeGeometry(rho, d, 64, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellKey]);

  const nadirLine = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.5 }));
    l.frustumCulled = false;
    l.raycast = () => null;
    return l;
  }, []);

  useFrame(({ clock }) => {
    const id = useApp.getState().selectedId;
    if (id == null) return;
    const sat = SATS[id];
    satPosition(sat, simClock.time, _pos);
    _dir.copy(_pos).normalize();

    if (capGroupRef.current) {
      capGroupRef.current.quaternion.setFromUnitVectors(_UP, _dir);
    }

    const h = SHELLS[sat.shell].altitudeKm / KM_PER_UNIT;
    const d = (h * (2 + h)) / (1 + h);
    const baseDist = 1 / (1 + h);

    if (coneRef.current) {
      coneRef.current.position.copy(_dir).multiplyScalar(baseDist + d / 2);
      coneRef.current.quaternion.setFromUnitVectors(_UP, _dir);
    }
    const nadirAttr = nadirLine.geometry.attributes.position as THREE.BufferAttribute;
    nadirAttr.setXYZ(0, _pos.x, _pos.y, _pos.z);
    nadirAttr.setXYZ(1, _dir.x * 1.0005, _dir.y * 1.0005, _dir.z * 1.0005);
    nadirAttr.needsUpdate = true;
    if (pulseRef.current) {
      const tt = clock.elapsedTime;
      const p = (tt * 0.5) % 2;
      const phase = p < 1 ? p : 2 - p; // ping-pong: down to Earth, back up
      pulseRef.current.position.copy(_dir).multiplyScalar(1 + h - phase * d);
      const s = 0.006 + 0.002 * Math.sin(tt * 6);
      pulseRef.current.scale.setScalar(s / 0.008);
    }
    if (billRef.current) {
      billRef.current.position.copy(_pos);
      billRef.current.scale.setScalar(1 + 0.18 * Math.sin(clock.elapsedTime * 4));
    }
    if (labelGroupRef.current) {
      labelGroupRef.current.position.copy(_pos);
    }
  });

  if (selectedId === null || !shell || !capGeom || !edgeGeom || !coneGeom) return null;
  const sat = SATS[selectedId];
  const cov = coverageInfo(shell.altitudeKm);
  const speed = orbitalVelocityKmS(sat.aKm);

  return (
    <group>
      {/* coverage footprint */}
      <group ref={capGroupRef}>
        <mesh geometry={capGeom}>
          <meshBasicMaterial
            color={shell.color}
            transparent
            opacity={0.22}
            side={THREE.FrontSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <lineLoop geometry={edgeGeom} raycast={() => null}>
          <lineBasicMaterial color={shell.color} transparent opacity={0.9} />
        </lineLoop>
      </group>

      {/* signal beam */}
      {beamsOn && (
        <group>
          <mesh ref={coneRef} geometry={coneGeom}>
            <meshBasicMaterial
              color="#67e8f9"
              transparent
              opacity={0.07}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <primitive object={nadirLine} />
          <mesh ref={pulseRef} geometry={PULSE_GEOMETRY}>
            <meshBasicMaterial
              color="#a5f3fc"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* highlight ring */}
      <group ref={billRef}>
        <Billboard>
          <mesh raycast={() => null}>
            <ringGeometry args={[0.02, 0.027, 40]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      </group>

      {/* label */}
      {labelsOn && (
        <group ref={labelGroupRef}>
          <Html center zIndexRange={[40, 0]} wrapperClass="pointer-events-none" style={{ pointerEvents: "none" }}>
            <div
              className="flex -translate-y-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-yellow-300/50 bg-[#060b16]/90 px-2.5 py-1 shadow-lg shadow-black/40 backdrop-blur-sm"
              style={{ fontSize: 10 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />
              <span className="font-mono text-[10px] font-semibold tracking-wide text-white">
                {sat.name}
              </span>
              <span className="font-mono text-[9px] text-cyan-300">{speed.toFixed(2)} km/s</span>
              <span className="hidden font-mono text-[9px] text-slate-400 sm:inline">
                ⌀{formatInt(cov.capDiameterKm)} km
              </span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
