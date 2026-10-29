import { useEffect } from "react";
import * as THREE from "three";
import { constellation, links as linksCfg, stationSize, storySegments, type City } from "../config";
import { OMEGA_EARTH, buildConstellation, latLonToWorld, satPosition, type SatSim } from "../utils/orbit";
import {
  buildLaserMesh,
  computeRoute,
  elevationDeg,
  routeIsValid,
  type LaserLink,
  type RouteInfo,
} from "../utils/links";
import { simState, useSimStore } from "./useSimStore";

/* -------------------------------------------------------------------------- */
/* Shared simulation objects (built once per page session)                    */
/* -------------------------------------------------------------------------- */

export const SATS: SatSim[] = buildConstellation(constellation);
export const LASER_MESH: LaserLink[] = buildLaserMesh(
  SATS,
  constellation.planes,
  constellation.satsPerPlane,
);

/** World anchors shared by the physics, beams and camera. The surface
 * points are used for elevation/routing; the raised anchors belong only to
 * the deliberately enlarged visual models. */
export const sitePositions = {
  dishGround: new THREE.Vector3(0, 1, 0),
  dishWorld: new THREE.Vector3(0, stationSize.baseRadius, 0),
  dishAperture: new THREE.Vector3(0, stationSize.baseRadius + stationSize.dishApertureHeight, 0),
  gatewayGround: new THREE.Vector3(0, 1, 0),
  gatewayWorld: new THREE.Vector3(0, stationSize.baseRadius, 0),
  gatewayAntenna: new THREE.Vector3(0, stationSize.baseRadius + stationSize.gatewayAntennaHeight, 0),
};

/** Update all site anchors at the same simulation time as the satellites. */
export function updateSitePositions(user: City, gateway: City, t: number): void {
  latLonToWorld(user.lat, user.lon, 1, t, sitePositions.dishGround);
  sitePositions.dishWorld.copy(sitePositions.dishGround).multiplyScalar(stationSize.baseRadius);
  sitePositions.dishAperture.copy(sitePositions.dishGround)
    .multiplyScalar(stationSize.baseRadius + stationSize.dishApertureHeight);
  latLonToWorld(gateway.lat, gateway.lon, 1, t, sitePositions.gatewayGround);
  sitePositions.gatewayWorld.copy(sitePositions.gatewayGround).multiplyScalar(stationSize.baseRadius);
  sitePositions.gatewayAntenna.copy(sitePositions.gatewayGround)
    .multiplyScalar(stationSize.baseRadius + stationSize.gatewayAntennaHeight);
}

/* -------------------------------------------------------------------------- */
/* Reusable scratch objects (no per-frame allocations)                        */
/* -------------------------------------------------------------------------- */

const _pos = new THREE.Vector3();
const _prevPos = new THREE.Vector3();

/* -------------------------------------------------------------------------- */
/* Driver                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The only writer of the simulation clock.
 *
 * One rAF loop advances simulated time, evaluates which satellites are above
 * the dish's minimum elevation, performs make-before-break handoffs, recomputes
 * the relay route, and nudges `uiTick` about eight times a second. The scene
 * graph reads `simState` imperatively, so nothing in React re-renders per
 * frame; the HUD re-renders only when the tick changes.
 */
export function SimDriver({ active }: { active: boolean }) {
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let routeAccum = 0;
    let uiAccum = 0;
    let storyAccum = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = now;
      let dt = (now - last) / 1000;
      last = now;
      if (dt <= 0) return;
      dt = Math.min(dt, 0.05);

      const state = useSimStore.getState();
      const running = (state.playing || state.storyActive) && active;

      if (running) simState.time += dt * state.speed;
      simState.earthAngle = OMEGA_EARTH * simState.time;

      // Link maintenance runs whenever the simulation is active, even while
      // paused: positions are static then, so the dish converges on its
      // satellite and the route forms without waiting for play.
      if (active) {
        updateSitePositions(state.user, state.gateway, simState.time);
        const previousSat = simState.connectedSat;
        advanceLinks();

        routeAccum += dt;
        const invalidRoute = simState.route && !routeIsValid(
          simState.route, SATS, sitePositions.dishGround, sitePositions.gatewayGround,
          simState.connectedSat, simState.time, linksCfg.minElevationDeg,
        );
        if (routeAccum >= 1.5 || previousSat !== simState.connectedSat || invalidRoute) {
          routeAccum = 0;
          simState.route = computeRoute(
            SATS,
            LASER_MESH,
            sitePositions.dishGround,
            sitePositions.gatewayGround,
            simState.connectedSat !== null ? SATS[simState.connectedSat] : null,
            simState.time,
            linksCfg.minElevationDeg,
          );
        }
      }

      // The old beam of a handoff fades out over 0.8 real seconds.
      advanceSecondaryFade(dt);

      // Story Mode advances on real seconds, independent of sim speed.
      if (!state.storyActive) storyAccum = 0;
      if (state.storyActive && active) {
        storyAccum += dt;
        const seg = storySegments[state.storyIndex];
        if (seg && storyAccum >= seg.durationS) {
          storyAccum -= seg.durationS;
          const next = state.storyIndex + 1;
          if (next >= storySegments.length) {
            useSimStore.setState({
              storyActive: false,
              storyIndex: 0,
              storyCaption: "",
              cameraMode: "orbit",
              speed: 60,
              playing: true,
            });
          } else {
            useSimStore.setState({
              storyIndex: next,
              storyCaption: storySegments[next].caption,
              cameraMode: storySegments[next].camera,
              speed: storySegments[next].speed,
            });
          }
        }
      }

      uiAccum += dt;
      if (uiAccum >= 0.12) {
        uiAccum = 0;
        useSimStore.setState((s) => ({ uiTick: s.uiTick + 1 }));
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return null;
}

/** Fade each previous beam independently; a new handoff resets alpha to 1. */
export function advanceSecondaryFade(dt: number): void {
  if (simState.secondarySat === null) return;
  simState.secondaryAlpha = Math.max(0, simState.secondaryAlpha - Math.max(0, dt) / 0.8);
  if (simState.secondaryAlpha === 0) simState.secondarySat = null;
}

/**
 * Link maintenance: counts satellites above the dish's minimum elevation,
 * acquires the highest one, and keeps it until a better handoff candidate
 * appears as the current satellite approaches the minimum elevation.
 */
export function advanceLinks(): void {
  const t = simState.time;
  const minElev = linksCfg.minElevationDeg;
  const margin = linksCfg.handoffMarginDeg;
  let visible = 0;
  let bestId = -1;
  let bestEl = -Infinity;

  for (const sat of SATS) {
    satPosition(sat, t, _pos);
    const el = elevationDeg(sitePositions.dishGround, _pos);
    if (el >= minElev) {
      visible++;
      if (el > bestEl) {
        bestEl = el;
        bestId = sat.id;
      }
    }
  }
  simState.visibleCount = visible;

  const current = simState.connectedSat;
  if (current !== null) {
    satPosition(SATS[current], t, _prevPos);
    simState.connectedElevation = elevationDeg(sitePositions.dishGround, _prevPos);
  }

  if (bestId >= 0) {
    if (current === null) {
      // First acquisition.
      simState.connectedSat = bestId;
      simState.connectedElevation = bestEl;
      simState.handoffFrom = null;
      simState.handoffSat = bestId;
      simState.handoffAt = performance.now();
    } else if (current === bestId) {
      simState.connectedElevation = bestEl;
    } else if (
      simState.connectedElevation < minElev ||
      (simState.connectedElevation <= minElev + margin && bestEl >= simState.connectedElevation + margin)
    ) {
      // Prefer a better satellite just before the old one sets. The previous
      // beam fades out while the new beam is already established.
      simState.secondarySat = current;
      simState.secondaryAlpha = 1;
      simState.connectedSat = bestId;
      simState.connectedElevation = bestEl;
      simState.handoffFrom = current;
      simState.handoffSat = bestId;
      simState.handoffAt = performance.now();
    }
  } else if (current !== null) {
    // Nothing overhead: drop the link (the old beam keeps fading out).
    simState.secondarySat = current;
    simState.secondaryAlpha = 1;
    simState.connectedSat = null;
    simState.connectedElevation = 0;
  }
}

export type { RouteInfo };
