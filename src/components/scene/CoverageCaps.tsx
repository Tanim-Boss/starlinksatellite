import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { KM_PER_UNIT, SATS, SHELLS, satPosition, type Sat } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";

const SAMPLE_COUNT = 36;

/** Spherical cap on the unit sphere covering the satellite's footprint. */
function makeCapGeometry(altitudeKm: number): THREE.BufferGeometry {
  const lambda = Math.acos(1 / (1 + altitudeKm / KM_PER_UNIT));
  return new THREE.SphereGeometry(1.0012, 40, 20, 0, Math.PI * 2, 0, lambda);
}

const _dir = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

/**
 * A sample of coverage footprints across all shells. Additive blending makes
 * overlaps visibly brighter — the point of the "coverage overlap" scenario.
 */
export function CoverageCaps() {
  const visible = useApp((s) => s.toggles.caps);
  const groupRef = useRef<THREE.Group>(null);

  const sample = useMemo(() => {
    const stride = Math.max(1, Math.floor(SATS.length / SAMPLE_COUNT));
    const arr: Sat[] = [];
    for (let i = 0; i < SATS.length && arr.length < SAMPLE_COUNT; i += stride) {
      arr.push(SATS[i]);
    }
    return arr;
  }, []);

  const geometries = useMemo(() => SHELLS.map((sh) => makeCapGeometry(sh.altitudeKm)), []);
  const materials = useMemo(
    () =>
      SHELLS.map(
        (sh) =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(sh.color),
            transparent: true,
            opacity: 0.13,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;
    const t = simClock.time;
    sample.forEach((sat, i) => {
      const child = group.children[i];
      if (!child) return;
      satPosition(sat, t, _dir);
      child.quaternion.setFromUnitVectors(_UP, _dir.normalize());
    });
  });

  if (!visible) return null;
  return (
    <group ref={groupRef}>
      {sample.map((sat) => (
        <mesh key={sat.id} geometry={geometries[sat.shell]} material={materials[sat.shell]} />
      ))}
    </group>
  );
}
