import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { MAX_RELAY_HOPS } from "./links";

// A path can contain one satellite more than its number of laser hops, plus
// the dish and gateway endpoints. Allocate the entire dynamic line buffer.
export const MAX_ROUTE_SATELLITES = MAX_RELAY_HOPS + 1;
export const MAX_ROUTE_SEGMENTS = MAX_ROUTE_SATELLITES + 1;

export function makeRouteGeometry(): LineGeometry {
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array((MAX_ROUTE_SEGMENTS + 1) * 3));
  return geometry;
}
