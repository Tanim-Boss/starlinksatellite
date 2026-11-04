import * as THREE from "three";
import { camera as cameraCfg } from "../config";

const _worldNorth = new THREE.Vector3(0, 1, 0);
const _up = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _heading = new THREE.Vector3();
const _toDish = new THREE.Vector3();
const _toSky = new THREE.Vector3();

/** Local east/north basis, including a stable fallback near either pole. */
function localBasis(ground: THREE.Vector3): void {
  _up.copy(ground).normalize();
  _east.crossVectors(_worldNorth, _up);
  if (_east.lengthSq() < 1e-10) _east.set(1, 0, 0);
  _east.normalize();
  _north.crossVectors(_up, _east).normalize();
}

/** Bearing clockwise from local north; null when the target is at zenith. */
export function satelliteBearing(ground: THREE.Vector3, satellite: THREE.Vector3): number | null {
  localBasis(ground);
  _heading.copy(satellite).sub(ground);
  const east = _heading.dot(_east);
  const north = _heading.dot(_north);
  if (east * east + north * north < 1e-10) return null;
  return Math.atan2(east, north);
}

/**
 * Ground-level framing: stand behind the dish, looking between its panel and
 * the connected satellite. Both remain in the same vertical plane so the
 * beam and a handoff can be seen together. `bearing` may be smoothed by the
 * caller in the local Earth-fixed frame to avoid a jump on handoff.
 */
export function groundCameraFrame(
  ground: THREE.Vector3,
  aperture: THREE.Vector3,
  satellite: THREE.Vector3 | null,
  bearing: number,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
  outUp: THREE.Vector3,
): void {
  localBasis(ground);
  _heading.copy(_north).multiplyScalar(Math.cos(bearing)).addScaledVector(_east, Math.sin(bearing));
  outPosition.copy(ground)
    .addScaledVector(_up, cameraCfg.dishHeight)
    .addScaledVector(_heading, -cameraCfg.dishDistance);
  outUp.copy(_up);

  _toDish.copy(aperture).sub(outPosition).normalize();
  if (satellite) {
    _toSky.copy(satellite).sub(outPosition).normalize();
  } else {
    // A useful view of the horizon while no satellite is above the cutoff.
    _toSky.copy(_heading).multiplyScalar(0.65).addScaledVector(_up, 0.76).normalize();
  }
  // Give the antenna a little extra room above the bottom controls while
  // keeping the tracked satellite clear of the top telemetry, even at zenith.
  outTarget.copy(_toDish).multiplyScalar(0.55).addScaledVector(_toSky, 0.45)
    .normalize().multiplyScalar(0.2).add(outPosition);
}

/** Shortest angular step, bounded so a handoff doesn't whip the camera. */
export function turnTowardBearing(current: number, target: number, maxStep: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + THREE.MathUtils.clamp(difference, -maxStep, maxStep);
}
