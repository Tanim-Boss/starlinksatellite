import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SATS, SHELLS, satPosition } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";

const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();

/**
 * Optical inter-satellite links: consecutive satellites within each orbital
 * plane are chained together (in reality each V1.5+ satellite also links to
 * cross-plane neighbours — simplified here for clarity).
 */
export function LaserLinks() {
  const visible = useApp((s) => s.toggles.laser);
  const lineRef = useRef<THREE.LineSegments>(null);

  const segments = useMemo(() => {
    const segs: { a: number; b: number; color: THREE.Color }[] = [];
    for (let i = 0; i < SATS.length; i++) {
      const s = SATS[i];
      const next = i + 1;
      if (next < SATS.length && SATS[next].shell === s.shell && SATS[next].plane === s.plane) {
        segs.push({ a: s.id, b: SATS[next].id, color: new THREE.Color(SHELLS[s.shell].color) });
      } else {
        // Wrap around: link the last slot of the plane back to the first.
        let first = i;
        while (first - 1 >= 0 && SATS[first - 1].shell === s.shell && SATS[first - 1].plane === s.plane) {
          first--;
        }
        segs.push({ a: s.id, b: first, color: new THREE.Color(SHELLS[s.shell].color) });
      }
    }
    return segs;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segments.length * 2 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(segments.length * 2 * 3), 3));
    return g;
  }, [segments]);

  useFrame(() => {
    if (!visible) return;
    const line = lineRef.current;
    if (!line) return;
    const t = simClock.time;
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    const col = line.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      satPosition(SATS[seg.a], t, _pa);
      satPosition(SATS[seg.b], t, _pb);
      pos.setXYZ(i * 2, _pa.x, _pa.y, _pa.z);
      pos.setXYZ(i * 2 + 1, _pb.x, _pb.y, _pb.z);
      col.setXYZ(i * 2, seg.color.r, seg.color.g, seg.color.b);
      col.setXYZ(i * 2 + 1, seg.color.r, seg.color.g, seg.color.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  if (!visible) return null;
  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false} raycast={() => null}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
