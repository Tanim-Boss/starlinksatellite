import { useEffect } from "react";
import {
  aimAtSatellite,
  clampSteering,
  satelliteAt,
  satelliteById,
} from "@/lib/phasedArray";
import { antennaClock, beamState, useBeamLab } from "./antennaStore";

/**
 * One animation loop for the whole lab. It advances the sky clock (satellite
 * motion), the wave clock, and the sweep/tracking controller, then writes the
 * beam direction into both the mutable frame state and the React store.
 *
 * Orbital time depends only on this clock — never on the beam direction — so
 * steering the beam cannot make a satellite change course.
 */
export function BeamDriver() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPush = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.06, Math.max(0, (now - last) / 1000));
      last = now;
      const st = useBeamLab.getState();

      if (st.playing) {
        const scaled = dt * st.speed;
        antennaClock.waveTime += scaled;
        antennaClock.skyTime += scaled;

        if (st.sweeping) {
          // A slow two-axis scan: wide horizontally, a gentler vertical bob.
          const t = antennaClock.waveTime;
          const az = 55 * Math.sin(t * 0.32);
          const el = 54 + 14 * Math.sin(t * 0.15 + 0.7);
          const next = clampSteering(az, el);
          beamState.azDeg = next.azDeg;
          beamState.elDeg = next.elDeg;
        } else if (st.tracking && st.selectedSat) {
          const sat = satelliteAt(satelliteById(st.selectedSat), antennaClock.skyTime);
          const aim = aimAtSatellite(sat);
          beamState.azDeg = aim.azDeg;
          beamState.elDeg = aim.elDeg;
        } else {
          beamState.azDeg = st.azDeg;
          beamState.elDeg = st.elDeg;
        }

        if (now - lastPush > 100) {
          lastPush = now;
          useBeamLab.setState((s) => ({
            azDeg: Math.round(beamState.azDeg * 10) / 10,
            elDeg: Math.round(beamState.elDeg * 10) / 10,
            skyTick: s.skyTick + 1,
          }));
        }
      } else {
        // Paused: slider changes still apply immediately, but nothing drifts.
        beamState.azDeg = st.azDeg;
        beamState.elDeg = st.elDeg;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
