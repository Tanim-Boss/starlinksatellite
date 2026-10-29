import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A compact bus, solar panel and Earth-facing antenna. These are still vastly
 * larger than real spacecraft, but are small enough to read as points on an
 * orbit instead of overlapping, flashing panels strewn across the globe.
 */
export function makeSatelliteGeometry(): THREE.BufferGeometry {
  const bus = new THREE.BoxGeometry(0.0055, 0.0045, 0.009);
  const panel = new THREE.BoxGeometry(0.021, 0.0008, 0.006).translate(0.006, 0, 0);
  const antenna = new THREE.BoxGeometry(0.005, 0.005, 0.001).translate(0, 0, 0.005);

  for (const [part, color] of [
    [bus, "#cbd9e4"],
    [panel, "#7392af"],
    [antenna, "#eef4f6"],
  ] as const) {
    const tint = new THREE.Color(color);
    const count = part.getAttribute("position").count;
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) tint.toArray(values, i * 3);
    part.setAttribute("color", new THREE.BufferAttribute(values, 3));
  }

  const merged = mergeGeometries([bus, panel, antenna], false);
  bus.dispose();
  panel.dispose();
  antenna.dispose();
  if (!merged) throw new Error("Failed to merge satellite geometry");
  return merged;
}

export function useSatelliteMaterials(): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
} {
  const geometry = useMemo(() => makeSatelliteGeometry(), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x101c27,
      emissiveIntensity: 0.35,
    }),
    [],
  );
  return { geometry, material };
}
