import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { colors } from "../config";
import { SATS, sitePositions } from "../hooks/useSimDriver";
import { simState } from "../hooks/useSimStore";
import { satPosition } from "../utils/orbit";

/** Waypoints = dish aperture + up to 10 satellites + gateway antenna. */
const MAX_HOPS = 10;
const MAX_SEGMENTS = MAX_HOPS + 1;

const _satPos = new THREE.Vector3();

/**
 * The highlighted relay route: User dish → Satellite A → laser hops →
 * Satellite B → gateway → Internet. Drawn as a thick, bright Line2 on top of
 * the thin background mesh, with glowing markers at every hop satellite.
 * Positions are rewritten into the line's interleaved buffer each frame —
 * no per-frame allocations.
 */
export function RouteOverlay() {
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<Line2>(null);
  const markersRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lineGeo = useMemo(() => {
    const g = new LineGeometry();
    // One dummy segment to allocate the interleaved buffers; the real
    // polyline is written into them directly each frame.
    g.setPositions([0, 0, 0, 0.001, 0, 0]);
    return g;
  }, []);

  const lineMat = useMemo(
    () =>
      new LineMaterial({
        color: new THREE.Color(colors.route),
        linewidth: 2.6,
        transparent: true,
        opacity: 0.95,
        dashed: false,
      }),
    [],
  );
  const size = useThree((s) => s.size);

  const markerGeo = useMemo(() => new THREE.SphereGeometry(0.012, 12, 12), []);
  const markerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.route) }),
    [],
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const line = new Line2(lineGeo, lineMat);
    line.visible = false;
    line.frustumCulled = false;
    line.raycast = () => null;
    group.add(line);
    lineRef.current = line;

    const markers = new THREE.InstancedMesh(markerGeo, markerMat, MAX_HOPS);
    markers.visible = false;
    markers.frustumCulled = false;
    markers.raycast = () => null;
    group.add(markers);
    markersRef.current = markers;

    return () => {
      group.remove(line);
      group.remove(markers);
      lineGeo.dispose();
      lineMat.dispose();
      markerGeo.dispose();
      markerMat.dispose();
    };
  }, [groupRef, lineGeo, lineMat, markerGeo, markerMat]);

  useFrame(() => {
    const line = lineRef.current;
    const markers = markersRef.current;
    if (!line || !markers) return;

    lineMat.resolution.set(size.width, size.height);

    const route = simState.route;
    if (!route || route.satIds.length === 0) {
      line.visible = false;
      markers.visible = false;
      return;
    }

    const ids = route.satIds;
    const t = simState.time;
    // Rebuild the polyline from live positions: dish → each hop satellite →
    // gateway antenna.
    const instanceStart = lineGeo.attributes.instanceStart as THREE.InterleavedBufferAttribute;
    const instanceEnd = lineGeo.attributes.instanceEnd as THREE.InterleavedBufferAttribute;
    const arr = instanceStart.data.array as Float32Array;
    const dish = sitePositions.dishAperture;
    const gateway = sitePositions.gatewayAntenna;
    const pts: THREE.Vector3[] = [dish];
    for (let i = 0; i < ids.length && pts.length <= MAX_HOPS; i++) {
      satPosition(SATS[ids[i]], t, _satPos);
      pts.push(_satPos.clone());
    }
    pts.push(gateway);

    const segments = Math.min(pts.length - 1, MAX_SEGMENTS);
    for (let i = 0; i < segments; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      arr[i * 6] = a.x;
      arr[i * 6 + 1] = a.y;
      arr[i * 6 + 2] = a.z;
      arr[i * 6 + 3] = b.x;
      arr[i * 6 + 4] = b.y;
      arr[i * 6 + 5] = b.z;
    }
    instanceStart.data.needsUpdate = true;
    instanceEnd.data.needsUpdate = true;
    lineGeo.instanceCount = segments;
    line.visible = true;

    for (let i = 0; i < MAX_HOPS; i++) {
      if (i < ids.length) {
        satPosition(SATS[ids[i]], t, _satPos);
        dummy.position.copy(_satPos);
        dummy.updateMatrix();
        markers.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -1000, 0);
        dummy.updateMatrix();
        markers.setMatrixAt(i, dummy.matrix);
      }
    }
    markers.instanceMatrix.needsUpdate = true;
    markers.visible = true;
  });

  return <group ref={groupRef} />;
}
