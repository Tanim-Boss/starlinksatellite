import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  SATELLITES,
  SKY_RADIUS,
  satelliteAt,
  satelliteTrackPoints,
  type SatelliteDef,
} from "@/lib/phasedArray";
import { makeGlowTexture } from "@/lib/textures";
import { antennaClock, useBeamLab } from "./antennaStore";

/* -------------------------------------------------------------------------- */
/* Sky dome                                                                   */
/* -------------------------------------------------------------------------- */

function makeDomeGeometry(radius: number) {
  const pts: number[] = [];
  const push = (a: THREE.Vector3, b: THREE.Vector3) =>
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);

  const p = new THREE.Vector3();
  const q = new THREE.Vector3();

  // Elevation rings.
  for (const elDeg of [30, 60]) {
    const el = (elDeg * Math.PI) / 180;
    const y = radius * Math.sin(el);
    const r = radius * Math.cos(el);
    for (let n = 0; n < 120; n++) {
      const a0 = (n / 120) * Math.PI * 2;
      const a1 = ((n + 1) / 120) * Math.PI * 2;
      p.set(Math.cos(a0) * r, y, Math.sin(a0) * r);
      q.set(Math.cos(a1) * r, y, Math.sin(a1) * r);
      push(p, q);
    }
  }

  // Meridians every 30°, with a denser forward arc.
  for (let azDeg = -180; azDeg < 180; azDeg += 30) {
    const az = (azDeg * Math.PI) / 180;
    for (let n = 0; n < 44; n++) {
      const e0 = ((n / 44) * 88 * Math.PI) / 180;
      const e1 = (((n + 1) / 44) * 88 * Math.PI) / 180;
      p.set(Math.cos(e0) * Math.sin(az) * radius, Math.sin(e0) * radius, Math.cos(e0) * Math.cos(az) * radius);
      q.set(Math.cos(e1) * Math.sin(az) * radius, Math.sin(e1) * radius, Math.cos(e1) * Math.cos(az) * radius);
      push(p, q);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function makeHorizonGeometry(radius: number) {
  const pts: number[] = [];
  const push = (a: THREE.Vector3, b: THREE.Vector3) =>
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const seg = 160;
  for (let n = 0; n < seg; n++) {
    const a0 = (n / seg) * Math.PI * 2;
    const a1 = ((n + 1) / seg) * Math.PI * 2;
    p.set(Math.cos(a0) * radius, 0, Math.sin(a0) * radius);
    q.set(Math.cos(a1) * radius, 0, Math.sin(a1) * radius);
    push(p, q);
  }
  // Graduations at 30° intervals.
  for (let azDeg = 0; azDeg < 360; azDeg += 30) {
    const a = (azDeg * Math.PI) / 180;
    p.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
    q.set(Math.sin(a) * (radius + 0.38), 0, Math.cos(a) * (radius + 0.38));
    push(p, q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

const COMPASS_LABELS: { label: string; azDeg: number }[] = [
  { label: "N", azDeg: 0 },
  { label: "NE", azDeg: 45 },
  { label: "E", azDeg: 90 },
  { label: "NW", azDeg: -45 },
  { label: "W", azDeg: -90 },
];

export function SkyDome() {
  const showLabels = useBeamLab((s) => s.showLabels);
  const dome = useMemo(() => makeDomeGeometry(SKY_RADIUS), []);
  const horizon = useMemo(() => makeHorizonGeometry(SKY_RADIUS), []);

  return (
    <group>
      <lineSegments geometry={dome} raycast={() => null}>
        <lineBasicMaterial color="#1a3648" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={horizon} raycast={() => null}>
        <lineBasicMaterial color="#2c5b72" transparent opacity={0.8} depthWrite={false} />
      </lineSegments>

      {showLabels && (
        <>
          {COMPASS_LABELS.map((c) => {
            const a = (c.azDeg * Math.PI) / 180;
            return (
              <Html
                key={c.label}
                position={[
                  Math.sin(a) * (SKY_RADIUS + 0.75),
                  0.28,
                  Math.cos(a) * (SKY_RADIUS + 0.75),
                ]}
                center
                zIndexRange={[8, 0]}
                style={{ pointerEvents: "none" }}
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#64809a]">
                  {c.label}
                </span>
              </Html>
            );
          })}
          <Html
            position={[0, SKY_RADIUS * Math.sin(Math.PI / 6) + 0.1, SKY_RADIUS * Math.cos(Math.PI / 6)]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="hidden font-mono text-[7.5px] tracking-[0.08em] text-[#48647b] sm:inline">
              30°
            </span>
          </Html>
          <Html
            position={[0, SKY_RADIUS * Math.sin(Math.PI / 3) + 0.1, SKY_RADIUS * Math.cos(Math.PI / 3)]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="hidden font-mono text-[7.5px] tracking-[0.08em] text-[#48647b] sm:inline">
              60°
            </span>
          </Html>
        </>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Orbit tracks                                                               */
/* -------------------------------------------------------------------------- */

function TrackLine({ def, selected }: { def: SatelliteDef; selected: boolean }) {
  const showTracks = useBeamLab((s) => s.showTracks);
  const points = useMemo(() => satelliteTrackPoints(def, 180), [def]);
  if (!showTracks) return null;
  return (
    <Line
      points={points}
      color={def.color}
      lineWidth={selected ? 1.5 : 0.75}
      transparent
      opacity={selected ? 0.6 : 0.22}
      dashed={!selected}
      dashSize={0.22}
      gapSize={0.2}
      depthWrite={false}
      raycast={() => null}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Satellite model                                                            */
/* -------------------------------------------------------------------------- */

function SatelliteNode({
  def,
  selected,
  showLabels,
}: {
  def: SatelliteDef;
  selected: boolean;
  showLabels: boolean;
}) {
  const node = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const label = useRef<HTMLSpanElement>(null);
  const glow = useMemo(() => makeGlowTexture(), []);
  const selectSat = useBeamLab((s) => s.selectSat);
  const axis = useMemo(() => new THREE.Vector3(), []);
  const towardEarth = useMemo(() => new THREE.Vector3(), []);
  const lastElevation = useRef(-999);

  const start = useMemo(() => satelliteAt(def, antennaClock.skyTime), [def]);

  useFrame(({ clock }) => {
    if (!node.current) return;
    const p = satelliteAt(def, antennaClock.skyTime);
    node.current.position.set(p.x, p.y, p.z);

    // The dish face (local +z) points at the terminal below.
    if (model.current) {
      towardEarth.set(-p.x, -p.y, -p.z).normalize();
      axis.set(0, 0, 1);
      model.current.quaternion.setFromUnitVectors(axis, towardEarth);
    }

    if (halo.current) {
      const t = useBeamLab.getState().playing ? clock.elapsedTime : 0;
      const s = selected ? 1.55 + 0.22 * Math.sin(t * 2.6) : 1.15;
      halo.current.scale.set(s, s, 1);
      (halo.current.material as THREE.SpriteMaterial).opacity = selected ? 0.62 : 0.3;
    }
    if (label.current) {
      const rounded = Math.round(p.elDeg);
      if (rounded !== lastElevation.current) {
        lastElevation.current = rounded;
        label.current.textContent = `${def.name} · ${rounded}°`;
      }
    }
  });

  return (
    <group
      ref={node}
      position={[start.x, start.y, start.z]}
      onClick={(e) => {
        e.stopPropagation();
        selectSat(def.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <sprite ref={halo} scale={[1.2, 1.2, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color={def.color}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      <group ref={model} scale={0.85}>
        {/* Bus */}
        <mesh>
          <boxGeometry args={[0.34, 0.15, 0.24]} />
          <meshStandardMaterial color="#c7d6e8" metalness={0.62} roughness={0.34} />
        </mesh>
        {/* Colour strip so the three satellites are distinguishable */}
        <mesh position={[0, 0.085, 0]}>
          <boxGeometry args={[0.3, 0.012, 0.04]} />
          <meshBasicMaterial color={def.color} toneMapped={false} />
        </mesh>
        {/* Solar wings */}
        <mesh position={[-0.46, 0, 0]}>
          <boxGeometry args={[0.56, 0.014, 0.26]} />
          <meshStandardMaterial
            color="#183a5a"
            metalness={0.45}
            roughness={0.48}
            emissive="#0b2b47"
            emissiveIntensity={0.75}
          />
        </mesh>
        <mesh position={[0.46, 0, 0]}>
          <boxGeometry args={[0.56, 0.014, 0.26]} />
          <meshStandardMaterial
            color="#183a5a"
            metalness={0.45}
            roughness={0.48}
            emissive="#0b2b47"
            emissiveIntensity={0.75}
          />
        </mesh>
        {/* Stub of the Ku-band array, facing the ground */}
        <mesh position={[0, -0.09, 0.09]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.085, 0.095, 0.035, 20]} />
          <meshStandardMaterial color="#dbe9ff" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.08, -0.1]} rotation-x={-Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
          <meshStandardMaterial color="#9fb3cf" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {showLabels && (
        <Html
          position={[0, 0.55, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] backdrop-blur ${
              selected
                ? "border-signal/50 bg-signal/15 text-signal"
                : "border-white/15 bg-[#040a14]/75 text-[#a8bad2]"
            }`}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: def.color }} />
            <span ref={label} />
          </div>
        </Html>
      )}
      {selected && showLabels && (
        <Html
          position={[0, -0.58, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="hidden whitespace-nowrap rounded-full border border-warn/35 bg-[#120d04]/85 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warn sm:block">
            Target
          </div>
        </Html>
      )}
    </group>
  );
}

export function SkySatellites() {
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const showLabels = useBeamLab((s) => s.showLabels);

  return (
    <group>
      {SATELLITES.map((def) => (
        <TrackLine key={`track-${def.id}`} def={def} selected={selectedSat === def.id} />
      ))}
      {SATELLITES.map((def) => (
        <SatelliteNode
          key={def.id}
          def={def}
          selected={selectedSat === def.id}
          showLabels={showLabels}
        />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Line of sight to the selected satellite                                    */
/* -------------------------------------------------------------------------- */

export function TargetSightLine() {
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 0.34,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      toneMapped: false,
    });
    const object = new THREE.Line(geometry, material);
    object.frustumCulled = false;
    return object;
  }, []);

  useFrame(() => {
    if (!selectedSat) return;
    const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    arr[0] = 0;
    arr[1] = 0.28;
    arr[2] = 0;
    const sat = satelliteAt(
      SATELLITES.find((s) => s.id === selectedSat)!,
      antennaClock.skyTime,
    );
    arr[3] = sat.x;
    arr[4] = sat.y;
    arr[5] = sat.z;
    pos.needsUpdate = true;
    line.computeLineDistances();
  });

  if (!selectedSat) return null;
  return <primitive object={line} raycast={() => null} />;
}

