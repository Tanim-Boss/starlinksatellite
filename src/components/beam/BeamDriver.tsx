import { useEffect } from "react";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { advanceBeam, useBeamLab } from "./beamStore";

/**
 * The only writer of the shared clock.
 *
 * One requestAnimationFrame loop advances the satellites, the wavefronts and
 * the beam slew, then nudges `uiTick` about eight times a second. The 3D scene
 * reads `beamClock` directly, so nothing in the Canvas re-renders per frame;
 * the DOM instruments re-render only when the tick changes.
 */
export function BeamDriver() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) useBeamLab.setState({ playing: false });
  }, [reduced]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let hud = 0;

    const loop = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.06, Math.max(0, (now - last) / 1000));
      last = now;

      const state = useBeamLab.getState();
      const moved = advanceBeam(dt, state);

      // Only wake the DOM when something is actually changing: a paused scene
      // with no input costs nothing.
      hud += dt;
      if ((state.playing || moved) && hud >= 0.12) {
        hud = 0;
        useBeamLab.setState((s) => ({ uiTick: s.uiTick + 1 }));
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
