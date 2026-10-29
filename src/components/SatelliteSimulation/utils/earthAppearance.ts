import type * as THREE from "three";

/**
 * Keep the placeholder dark and non-emissive until an actual night map is
 * available. The key forces three.js to rebuild its shader when either map
 * arrives (a material first compiled without a map cannot just acquire one).
 */
export function earthAppearance(day: THREE.Texture | null, night: THREE.Texture | null) {
  return {
    key: `${day ? "day" : "loading"}-${night ? "night" : "no-night"}`,
    map: day ?? undefined,
    color: day ? "#ffffff" : "#163c5c",
    emissiveMap: night ?? undefined,
    emissive: night ? "#ffffff" : "#000000",
    emissiveIntensity: night ? 0.22 : 0,
  };
}
