/**
 * Math verification entry — bundled and executed by _verify-sim-math.mjs.
 * Exercises the pure orbit/link/routing functions headlessly.
 */
import * as THREE from "three";
import { constellation, earth as earthCfg } from "../src/components/SatelliteSimulation/config";
import {
  SATS,
  LASER_MESH,
} from "../src/components/SatelliteSimulation/hooks/useSimDriver";
import {
  ORBIT_PERIOD_MIN,
  ORBIT_SPEED_KM_S,
  earthAngle,
  latLonToWorld,
  satPosition,
  satVelocity,
} from "../src/components/SatelliteSimulation/utils/orbit";
import {
  bestSatelliteFor,
  bfsRoute,
  computeRoute,
  elevationDeg,
  lineOfSightClear,
} from "../src/components/SatelliteSimulation/utils/links";

const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

export function runChecks(assert: (name: string, cond: boolean, extra?: string) => void): void {
  /* 1. Constellation construction */
  assert(
    `constellation size (${SATS.length})`,
    SATS.length === constellation.planes * constellation.satsPerPlane,
    `${SATS.length} sats`,
  );
  const expectedRadius = (earthCfg.radiusKm + constellation.altitudeKm) / earthCfg.radiusKm;
  satPosition(SATS[0], 0, _p);
  assert(
    "orbit radius in scene units",
    Math.abs(_p.length() - expectedRadius) < 1e-9,
    _p.length().toFixed(4),
  );

  /* 2. Period and speed (physical) */
  assert(
    "orbital period ~95 min",
    Math.abs(ORBIT_PERIOD_MIN - 95.4) < 0.6,
    `${ORBIT_PERIOD_MIN.toFixed(2)} min`,
  );
  assert(
    "orbital speed ~7.6 km/s",
    Math.abs(ORBIT_SPEED_KM_S - 7.61) < 0.05,
    `${ORBIT_SPEED_KM_S.toFixed(3)} km/s`,
  );

  /* 3. Periodicity: position at t and t+period are identical */
  const period = ORBIT_PERIOD_MIN * 60;
  satPosition(SATS[7], 1234.5, _p);
  satPosition(SATS[7], 1234.5 + period, _v);
  assert("position repeats after one period", _p.distanceTo(_v) < 1e-9);

  /* 4. Velocity magnitude matches the circular-orbit speed */
  satVelocity(SATS[0], 0, _v);
  assert(
    "velocity magnitude ~7.6 km/s",
    Math.abs(_v.length() - ORBIT_SPEED_KM_S) < 1e-6,
    _v.length().toFixed(3),
  );

  /* 5. Earth rotation: one turn per sidereal day */
  assert(
    "earth rotates 2pi per sidereal day",
    Math.abs(earthAngle(86164.0905) - Math.PI * 2) < 1e-9,
  );

  /* 6. Elevation: the dish sees satellites over passes. With 24 planes at
     15° RAAN spacing, ground-track crossings sit ~15° apart, so closest
     approaches cap around ~55° — but plenty of satellites clear the 25°
     connect threshold the dish logic uses. */
  const dish = new THREE.Vector3();
  const gateway = new THREE.Vector3();
  let maxElev = -Infinity;
  let satCount25 = 0;
  for (const sat of SATS) {
    let satMax = -Infinity;
    for (let k = 0; k <= 288; k++) {
      const t = (k / 288) * period * 3; // three orbital periods
      latLonToWorld(23.81, 90.41, 1.004, earthAngle(t), dish);
      satPosition(sat, t, _v);
      const el = elevationDeg(dish, _v);
      if (el > satMax) satMax = el;
    }
    if (satMax > maxElev) maxElev = satMax;
    if (satMax >= 25) satCount25++;
  }
  assert("satellites clear the 25° dish threshold over Dhaka", satCount25 >= 20, `${satCount25}/480 sats`);
  assert("closest pass has healthy elevation", maxElev > 40, `${maxElev.toFixed(1)}°`);

  /* 7. Line-of-sight: close pairs clear, antipodal pairs blocked */
  satPosition(SATS[0], 0, _p);
  satPosition(SATS[1], 0, _v); // neighbour in the same plane
  assert("neighbour link is clear", lineOfSightClear(_p, _v));
  const anti = _p.clone().multiplyScalar(-1);
  assert("antipodal link is blocked", !lineOfSightClear(_p, anti));

  /* 8. Laser mesh size */
  assert(
    "laser mesh has 4 links per satellite",
    LASER_MESH.length === SATS.length * 2,
    `${LASER_MESH.length} links`,
  );

  /* 9. BFS routing across planes */
  const target = SATS.find((s) => s.plane === 12)!;
  const route = bfsRoute(LASER_MESH, SATS[0].id, target.id, 16);
  assert("BFS finds a cross-plane route", route !== null && route.length > 0, route?.length + " hops");
  assert("BFS route within the hop budget", (route?.length ?? 99) <= 16);

  /* 10. Full relay route Dhaka → Los Angeles */
  let bestRoute = null;
  for (let k = 0; k <= 288; k++) {
    const t = (k / 288) * period;
    latLonToWorld(23.81, 90.41, 1.004, earthAngle(t), dish);
    latLonToWorld(34.05, -118.24, 1.004, earthAngle(t), gateway);
    const pick = bestSatelliteFor(SATS, dish, t, 25);
    if (!pick) continue;
    const r = computeRoute(SATS, LASER_MESH, dish, gateway, pick.sat, t, 25);
    if (r && (!bestRoute || r.hops < bestRoute.hops)) bestRoute = r;
  }
  assert("relay route found Dhaka → LA", bestRoute !== null);
  if (bestRoute) {
    assert(
      "route has laser hops",
      bestRoute.hops >= 0 && bestRoute.hops <= 16,
      `${bestRoute.hops} hops`,
    );
    assert(
      "route length is plausible",
      bestRoute.lengthKm > 6000 && bestRoute.lengthKm < 25000,
      `${bestRoute.lengthKm.toFixed(0)} km`,
    );
    assert(
      "latency is light-time plausible",
      bestRoute.latencyMs > 20 && bestRoute.latencyMs < 90,
      `${bestRoute.latencyMs.toFixed(1)} ms`,
    );
  }
}
