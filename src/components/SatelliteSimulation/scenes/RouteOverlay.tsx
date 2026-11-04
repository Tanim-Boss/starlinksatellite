import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { colors } from "../config";
import { SATS, sitePositions } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { satPosition } from "../utils/orbit";
import { makeRouteGeometry, MAX_ROUTE_SATELLITES, MAX_ROUTE_SEGMENTS } from "../utils/routeGeometry";

/**
 * The highlighted relay route: User dish → Satellite A → laser hops →
 * Satellite B → gateway → Internet. Drawn as a thick, bright Line2 on top of
 * the thin background mesh, with glowing markers at every hop satellite.
 * Positions are rewritten into the line's interleaved buffer each frame —
 * no per-frame allocations.
 */
export function RouteOverlay() {
  const show = useSimStore((s) => s.toggles.laserMesh);
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<Line2>(null);
  const markersRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const points = useMemo(
    () => Array.from({ length: MAX_ROUTE_SATELLITES + 2 }, () => new THREE.Vector3()),
    [],
  );

  const lineGeo = useMemo(() => makeRouteGeometry(), []);

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

  const markerGeo = useMemo(() => new THREE.SphereGeometry(0.004, 12, 12), []);
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

    const markers = new THREE.InstancedMesh(markerGeo, markerMat, MAX_ROUTE_SATELLITES);
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
    if (!line || !markers || !show) return;

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
    const count = Math.min(ids.length, MAX_ROUTE_SATELLITES);
    points[0].copy(sitePositions.dishAperture);
    for (let i = 0; i < count; i++) {
      satPosition(SATS[ids[i]], t, points[i + 1]);
    }
    points[count + 1].copy(sitePositions.gatewayAntenna);

    const segments = Math.min(count + 1, MAX_ROUTE_SEGMENTS);
    for (let i = 0; i < segments; i++) {
      const a = points[i];
      const b = points[i + 1];
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

    for (let i = 0; i < MAX_ROUTE_SATELLITES; i++) {
      if (i < count) {
        dummy.position.copy(points[i + 1]);
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

  return <group ref={groupRef} visible={show} />;
}
