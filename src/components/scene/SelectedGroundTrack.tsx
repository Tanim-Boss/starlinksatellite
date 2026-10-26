import { useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SATS, satPosition, worldToEarthFixed } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";
import { EarthInnerContext } from "./Earth";

const TRAIL_LENGTH = 220;
const PUSH_EVERY_SEC = 0.35;

const _world = new THREE.Vector3();
const _fixed = new THREE.Vector3();

/**
 * Ground track of the selected satellite: a fading-ish polyline plus the
 * current sub-satellite point, drawn in the earth-fixed frame so it stays
 * glued to the surface when the Earth rotates. Attaches itself to the Earth
 * assembly's inner group.
 */
export function SelectedGroundTrack() {
  const innerRef = useContext(EarthInnerContext);
  const selectedId = useApp((s) => s.selectedId);

  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH * 3), 3));
    g.setDrawRange(0, 0);
    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.75 }),
    );
    l.frustumCulled = false;
    l.raycast = () => null;
    return l;
  }, []);

  const dot = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfde047 }),
    );
    m.frustumCulled = false;
    return m;
  }, []);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.add(line, dot);
    return () => {
      inner.remove(line);
      inner.remove(dot);
    };
  }, [innerRef, line, dot]);

  const pointsRef = useRef<THREE.Vector3[]>([]);
  const countRef = useRef(0);
  const lastPushRef = useRef(-1e9);
  const prevIdRef = useRef<number | null>(selectedId);

  useFrame(() => {
    const id = useApp.getState().selectedId;
    const trails = useApp.getState().toggles.trails;

    if (id !== prevIdRef.current) {
      prevIdRef.current = id;
      pointsRef.current = [];
      countRef.current = 0;
      lastPushRef.current = -1e9;
      line.geometry.setDrawRange(0, 0);
      dot.visible = false;
    }
    if (id == null || !trails) {
      dot.visible = false;
      return;
    }

    const sat = SATS[id];
    satPosition(sat, simClock.time, _world);
    worldToEarthFixed(_world, _fixed);
    dot.position.copy(_fixed);
    dot.visible = true;

    const t = simClock.time;
    if (t - lastPushRef.current >= PUSH_EVERY_SEC) {
      lastPushRef.current = t;
      const pts = pointsRef.current;
      pts.push(_fixed.clone());
      if (pts.length > TRAIL_LENGTH) pts.shift();
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pts.length; i++) {
        attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
      }
      attr.needsUpdate = true;
      line.geometry.setDrawRange(0, pts.length);
      countRef.current = pts.length;
    }
  });

  return null;
}
