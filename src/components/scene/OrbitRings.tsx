import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SATS, SHELLS, type Sat } from "@/lib/astro";
import { useApp } from "@/store";

interface RingDef {
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
}

/** One circular orbit ring per displayed orbital plane. */
function makeRing(sat: Sat): RingDef {
  // Orbit normal (angular momentum direction) for a circular orbit.
  const normal = new THREE.Vector3(
    Math.sin(sat.raan) * sat.sini,
    -Math.cos(sat.raan) * sat.sini,
    Math.cos(sat.inc),
  );
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  const pts: number[] = [];
  const SEG = 128;
  const p = new THREE.Vector3();
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    p.set(Math.cos(a) * sat.aUnits, 0, Math.sin(a) * sat.aUnits).applyQuaternion(q);
    pts.push(p.x, p.y, p.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(SHELLS[sat.shell].color),
    transparent: true,
    opacity: 0.3,
  });
  return { geometry, material };
}

export function OrbitRings({ force = false, opacity = 0.3 }: { force?: boolean; opacity?: number }) {
  const toggle = useApp((s) => s.toggles.rings);
  const visible = force || toggle;
  // One ring per plane: every satellite with slot 0 starts a plane.
  const rings = useMemo(() => SATS.filter((s) => s.slot === 0).map(makeRing), []);
  useEffect(() => {
    rings.forEach((r) => {
      r.material.opacity = opacity;
    });
  }, [rings, opacity]);

  if (!visible) return null;
  return (
    <group>
      {rings.map((r, i) => (
        <lineLoop key={i} geometry={r.geometry} material={r.material} raycast={() => null} />
      ))}
    </group>
  );
}
