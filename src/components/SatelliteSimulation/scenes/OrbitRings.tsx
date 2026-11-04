import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SATS } from "../hooks/useSimDriver";
import { useSimStore } from "../hooks/useSimStore";
import { satPosition, type SatSim } from "../utils/orbit";

/**
 * Faint orbital-plane rings (toggleable). One ring per plane, drawn with the
 * same RAAN/inclination math as the satellites so they line up exactly.
 */
export function OrbitRings() {
  const show = useSimStore((s) => s.toggles.orbits);
  const rings = useMemo(() => {
    const perPlane = new Map<number, SatSim>();
    for (const sat of SATS) {
      if (!perPlane.has(sat.plane)) perPlane.set(sat.plane, sat);
    }
    return Array.from(perPlane.values()).map((sat) => {
      const pts: number[] = [];
      const p = new THREE.Vector3();
      const probe: SatSim = { ...sat, n: 1, m0: 0 };
      for (let i = 0; i < 192; i++) {
        satPosition(probe, (i / 192) * Math.PI * 2, p);
        pts.push(p.x, p.y, p.z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return geo;
    });
  }, []);

  useEffect(() => () => rings.forEach((geometry) => geometry.dispose()), [rings]);

  if (!show) return null;

  return (
    <group>
      {rings.map((geo, i) => (
        <lineLoop key={i} geometry={geo}>
          <lineBasicMaterial color="#76b9c6" transparent opacity={0.16} depthWrite={false} />
        </lineLoop>
      ))}
    </group>
  );
}
