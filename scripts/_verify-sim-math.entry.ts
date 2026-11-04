/**
 * Math verification entry — bundled and executed by _verify-sim-math.mjs.
 * Exercises the pure orbit/link/routing functions headlessly.
 */
import * as THREE from "three";
import { camera as cameraCfg, cities, constellation, defaultGateway, earth as earthCfg, stationSize } from "../src/components/SatelliteSimulation/config";
import {
  SATS,
  LASER_MESH,
  advanceLinks,
  advanceSecondaryFade,
  sitePositions,
  updateSitePositions,
} from "../src/components/SatelliteSimulation/hooks/useSimDriver";
import {
  KM_PER_UNIT,
  ORBIT_PERIOD_MIN,
  ORBIT_SPEED_KM_S,
  earthAngle,
  latLonToWorld,
  satPosition,
  satVelocity,
  shouldRenderSatellite,
} from "../src/components/SatelliteSimulation/utils/orbit";
import {
  bestSatelliteFor,
  bfsRoute,
  computeRoute,
  elevationDeg,
  lineOfSightClear,
  routeIsValid,
} from "../src/components/SatelliteSimulation/utils/links";
import { simState } from "../src/components/SatelliteSimulation/hooks/useSimStore";
import { groundCameraFrame, satelliteBearing, turnTowardBearing } from "../src/components/SatelliteSimulation/utils/groundView";
import { makeRouteGeometry, MAX_ROUTE_SEGMENTS } from "../src/components/SatelliteSimulation/utils/routeGeometry";
import { earthAppearance } from "../src/components/SatelliteSimulation/utils/earthAppearance";

const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

export function runChecks(assert: (name: string, cond: boolean, extra?: string) => void): void {
  /* The untextured/loading globe must never emit solid white light. Adding a
     map also needs a new material key so three.js recompiles its shader. */
  const dayMap = new THREE.Texture();
  const nightMap = new THREE.Texture();
  const loadingEarth = earthAppearance(null, null);
  const daytimeEarth = earthAppearance(dayMap, null);
  const mappedEarth = earthAppearance(dayMap, nightMap);
  assert("loading and missing-night Earth are not white emissive spheres", loadingEarth.emissiveIntensity === 0 && loadingEarth.emissive === "#000000" && daytimeEarth.emissiveIntensity === 0);
  assert("Earth material recompiles when each texture arrives", loadingEarth.key !== daytimeEarth.key && daytimeEarth.key !== mappedEarth.key && mappedEarth.map === dayMap && mappedEarth.emissiveMap === nightMap);
  dayMap.dispose();
  nightMap.dispose();

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

  /* Every instance remains on its own ring at all times, with equal spacing
     within a plane. The analytic velocity is tangent to that same orbit. */
  let planesStayExact = true;
  let slotsStaySpaced = true;
  let velocityIsTangent = true;
  const normal = new THREE.Vector3();
  const first = new THREE.Vector3();
  const second = new THREE.Vector3();
  const ringPoint = new THREE.Vector3();
  for (let plane = 0; plane < constellation.planes; plane++) {
    const base = plane * constellation.satsPerPlane;
    const probe = { ...SATS[base], n: 1, m0: 0 };
    satPosition(probe, 0, first);
    satPosition(probe, Math.PI / 2, second);
    normal.crossVectors(first, second).normalize();
    for (const t of [0, 317.2, 5000, 123456]) {
      for (let slot = 0; slot < constellation.satsPerPlane; slot++) {
        const sat = SATS[base + slot];
        satPosition(sat, t, ringPoint);
        satVelocity(sat, t, _v);
        planesStayExact &&= Math.abs(ringPoint.dot(normal)) < 1e-9 && Math.abs(ringPoint.length() - expectedRadius) < 1e-9;
        velocityIsTangent &&= Math.abs(ringPoint.dot(_v)) < 1e-8;
        satPosition(SATS[base + (slot + 1) % constellation.satsPerPlane], t, second);
        const spacing = 2 * expectedRadius * Math.sin(Math.PI / constellation.satsPerPlane);
        slotsStaySpaced &&= Math.abs(ringPoint.distanceTo(second) - spacing) < 1e-9;
      }
    }
  }
  assert("all satellites stay exactly on their orbital planes", planesStayExact);
  assert("satellites remain evenly spaced within every plane", slotsStaySpaced);
  assert("satellite velocity stays tangent to the orbit", velocityIsTangent);
  let velocityMatchesPosition = true;
  for (let i = 0; i < SATS.length; i += 13) {
    const t = 1345.6;
    const h = 0.01;
    satPosition(SATS[i], t - h, first);
    satPosition(SATS[i], t + h, second);
    second.sub(first).multiplyScalar(KM_PER_UNIT / (2 * h));
    satVelocity(SATS[i], t, _v);
    velocityMatchesPosition &&= second.distanceTo(_v) < 1e-6;
  }
  assert("velocity is the derivative of the displayed orbit", velocityMatchesPosition);

  const visibleByPlane = Array.from({ length: constellation.planes }, () => 0);
  SATS.forEach((sat, i) => {
    if (shouldRenderSatellite(i, SATS.length, 150)) visibleByPlane[sat.plane]++;
  });
  assert("reduced quality samples all planes evenly", visibleByPlane.reduce((a, b) => a + b, 0) === 150 && Math.min(...visibleByPlane) >= 6);

  /* 5. Earth rotation: one turn per sidereal day */
  assert(
    "earth rotates 2pi per sidereal day",
    Math.abs(earthAngle(86164.0905) - Math.PI * 2) < 1e-9,
  );

  /* 6. Elevation: over several periods plenty of satellites clear the
     25° connect threshold at the rotating Dhaka ground location. */
  const dish = new THREE.Vector3();
  const gateway = new THREE.Vector3();
  let maxElev = -Infinity;
  let satCount25 = 0;
  for (const sat of SATS) {
    let satMax = -Infinity;
    for (let k = 0; k <= 288; k++) {
      const t = (k / 288) * period * 3; // three orbital periods
      latLonToWorld(23.81, 90.41, 1, t, dish);
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
    latLonToWorld(23.81, 90.41, 1, t, dish);
    latLonToWorld(34.05, -118.24, 1, t, gateway);
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

  if (bestRoute) {
    assert("route stays above Earth and the atmosphere", bestRoute.waypoints.slice(1, -2).every((point, i) => lineOfSightClear(point, bestRoute!.waypoints[i + 2])));
  }
  const routeGeometry = makeRouteGeometry();
  const routeBuffer = routeGeometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute;
  assert("route line buffer holds the maximum relay path", routeBuffer.count === MAX_ROUTE_SEGMENTS);
  routeGeometry.dispose();

  /* Ground camera and physics must share the same rotating surface anchor. */
  let anchorsMatch = true;
  let cameraAboveGround = true;
  let subjectsFit = true;
  let subjectsClearControls = true;
  let checkedFrames = 0;
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const camera = new THREE.PerspectiveCamera(cameraCfg.dishFov, 16 / 9, 0.001, 200);
  for (const city of cities) {
    for (const t of [0, 1000, 5000, 10000]) {
      updateSitePositions(city, defaultGateway, t);
      latLonToWorld(city.lat, city.lon, 1, t, dish);
      anchorsMatch &&= dish.distanceTo(sitePositions.dishGround) < 1e-10;
      anchorsMatch &&= Math.abs(sitePositions.dishAperture.length() - (stationSize.baseRadius + stationSize.dishApertureHeight)) < 1e-10;
      const pick = bestSatelliteFor(SATS, dish, t, 25);
      if (!pick) continue;
      satPosition(pick.sat, t, _p);
      const bearing = satelliteBearing(dish, _p) ?? 0;
      groundCameraFrame(sitePositions.dishWorld, sitePositions.dishAperture, _p, bearing, camPos, camTarget, camUp);
      cameraAboveGround &&= camPos.length() > 1 && camUp.dot(dish) > 0.999;
      camera.position.copy(camPos);
      camera.up.copy(camUp);
      camera.lookAt(camTarget);
      camera.updateMatrixWorld();
      const dishScreen = sitePositions.dishAperture.clone().project(camera);
      const satScreen = _p.clone().project(camera);
      subjectsFit &&= Math.abs(dishScreen.x) < 1 && Math.abs(dishScreen.y) < 1 && Math.abs(satScreen.x) < 1 && Math.abs(satScreen.y) < 1 && dishScreen.z < 1 && satScreen.z < 1;
      subjectsClearControls &&= dishScreen.y > -0.55 && satScreen.y < 0.65;
      checkedFrames++;
    }
  }
  assert("ground and visual anchors follow the same Earth rotation", anchorsMatch);
  assert("dish camera stays above Earth with local up", cameraAboveGround && checkedFrames > 20, `${checkedFrames} views`);
  assert("dish and linked satellite fit together in the ground camera", subjectsFit);
  assert("ground subjects stay clear of top and bottom controls", subjectsClearControls);
  latLonToWorld(89.99, 45, 1, 0, dish);
  const zenith = dish.clone().multiplyScalar(expectedRadius);
  groundCameraFrame(dish, dish.clone().multiplyScalar(1.007), null, 0, camPos, camTarget, camUp);
  assert("ground view remains well-defined while searching near a pole", camPos.length() > 1 && Number.isFinite(camTarget.length()) && satelliteBearing(dish, zenith) === null);
  const acrossNorth = turnTowardBearing(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
  assert("camera takes the short, bounded turn across the bearing seam", Math.abs(acrossNorth - (Math.PI - 0.05)) < 1e-9);

  /* Handoffs should choose a usable satellite, retain the old beam, and
     restart its fade on every switch rather than only the first one. */
  simState.connectedSat = null;
  simState.secondarySat = null;
  simState.secondaryAlpha = 0;
  let handoffs = 0;
  let handoffsValid = true;
  let fadesRestart = true;
  const dhaka = cities[0];
  for (let t = 0; t < period * 2; t += 2) {
    simState.time = t;
    updateSitePositions(dhaka, defaultGateway, t);
    const old = simState.connectedSat;
    advanceLinks();
    const current = simState.connectedSat;
    if (current !== null) {
      satPosition(SATS[current], t, _p);
      handoffsValid &&= elevationDeg(sitePositions.dishGround, _p) >= 25 - 1e-8;
    }
    if (old !== null && current !== null && old !== current) {
      handoffs++;
      handoffsValid &&= simState.handoffFrom === old && simState.handoffSat === current && simState.secondarySat === old;
      fadesRestart &&= simState.secondaryAlpha === 1;
      advanceSecondaryFade(0.4);
      fadesRestart &&= Math.abs(simState.secondaryAlpha - 0.5) < 1e-9;
      advanceSecondaryFade(0.4);
      fadesRestart &&= simState.secondarySat === null;
    }
  }
  assert("ground link hands off between usable satellites", handoffsValid && handoffs > 2, `${handoffs} handoffs`);
  assert("old beam fade restarts on every handoff", fadesRestart && handoffs > 2);
  if (bestRoute) {
    // A route for the wrong current satellite must not be shown as live.
    assert("stale routes are invalidated after a handoff", !routeIsValid(bestRoute, SATS, dish, gateway, -1, 0, 25));
  }
}
