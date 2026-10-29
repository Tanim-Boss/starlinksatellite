import { useEffect } from "react";
import * as THREE from "three";
import { constellation, links as linksCfg, storySegments } from "../config";
import { OMEGA_EARTH, buildConstellation, satPosition, type SatSim } from "../utils/orbit";
import {
  buildLaserMesh,
  computeRoute,
  elevationDeg,
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

/**
 * World-space anchor points the scene components publish each frame and the
 * driver reads for link math. Written imperatively so the driver never needs
 * React state for positions.
 */
export const sitePositions = {
  /** Dish aperture (phased-array face), world space. */
  dishAperture: new THREE.Vector3(0, 1.04, 0),
  /** Dish base on the ground, world space. */
  dishWorld: new THREE.Vector3(0, 1.004, 0),
  /** Gateway antenna feed, world space. */
  gatewayAntenna: new THREE.Vector3(0, 1.04, 0),
  /** Gateway base on the ground, world space. */
  gatewayWorld: new THREE.Vector3(0, 1.004, 0),
};

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
    let secondaryAccum = 0;
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
        advanceLinks(dt);

        routeAccum += dt;
        if (routeAccum >= 1.5) {
          routeAccum = 0;
          simState.route = computeRoute(
            SATS,
            LASER_MESH,
            sitePositions.dishAperture,
            sitePositions.gatewayAntenna,
            simState.connectedSat !== null ? SATS[simState.connectedSat] : null,
            simState.time,
            linksCfg.minElevationDeg,
          );
        }
      }

      // The old beam of a handoff fades out over 0.8 real seconds.
      if (simState.secondarySat !== null) {
        secondaryAccum += dt;
        simState.secondaryAlpha = Math.max(0, 1 - secondaryAccum / 0.8);
        if (simState.secondaryAlpha <= 0) simState.secondarySat = null;
      }

      // Story Mode advances on real seconds, independent of sim speed.
      if (state.storyActive) {
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
              speed: 600,
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

/**
 * Link maintenance: counts satellites above the dish's minimum elevation,
 * keeps the dish locked to the highest one, and performs a handoff when the
 * current satellite drops toward the horizon.
 */
function advanceLinks(dt: number): void {
  const t = simState.time;
  const minElev = linksCfg.minElevationDeg;
  const margin = linksCfg.handoffMarginDeg;
  let visible = 0;
  let bestId = -1;
  let bestEl = -Infinity;

  for (const sat of SATS) {
    satPosition(sat, t, _pos);
    const el = elevationDeg(sitePositions.dishAperture, _pos);
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
    simState.connectedElevation = elevationDeg(sitePositions.dishAperture, _prevPos);
  }

  if (bestId >= 0) {
    if (current === null) {
      // First acquisition.
      simState.connectedSat = bestId;
      simState.connectedElevation = bestEl;
      simState.handoffSat = bestId;
      simState.handoffAt = performance.now();
    } else if (current === bestId) {
      simState.connectedElevation = bestEl;
    } else if (simState.connectedElevation < minElev - margin) {
      // Make-before-break: the new beam fades in while the old one fades out.
      simState.secondarySat = current;
      simState.secondaryAlpha = 1;
      simState.connectedSat = bestId;
      simState.connectedElevation = bestEl;
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
  void dt;
}

export type { RouteInfo };
