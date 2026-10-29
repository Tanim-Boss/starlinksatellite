import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * One satellite model: a small bus, a single long solar panel and a flat
 * phased-array antenna face on the +Z side. Orientation happens per frame in
 * the satellite layer: +Z (the antenna) is pointed at Earth's centre, then
 * the body rolls slowly around the Earth-pointing axis.
 *
 * Sizes are exaggerated for visibility — the HUD and the About note say so.
 */
export function makeSatelliteGeometry(): THREE.BufferGeometry {
  const bus = new THREE.BoxGeometry(0.011, 0.008, 0.028);
  const panel = new THREE.BoxGeometry(0.1, 0.0016, 0.023).translate(0.027, 0, 0);
  const antenna = new THREE.BoxGeometry(0.01, 0.01, 0.002).translate(0, 0, 0.0155);
  const merged = mergeGeometries([bus, panel, antenna], false);
  if (!merged) throw new Error("Failed to merge satellite geometry");
  return merged;
}

/** Shared geometry + material for the InstancedMesh. */
export function useSatelliteMaterials(): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
} {
  const geometry = useMemo(() => makeSatelliteGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.55,
        emissive: 0x16324a,
        emissiveIntensity: 0.55,
      }),
    [],
  );
  return { geometry, material };
}
