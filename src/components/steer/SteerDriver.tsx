import { useEffect } from "react";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { advanceSteering, useSteerLab } from "./steerStore";

/**
 * The only writer of the shared steering clock.
 *
 * One requestAnimationFrame loop advances the target tracks, the wavefront
 * phase, the data packets and the gimbal slew, then nudges `uiTick` about
 * eight times a second. The 3D scene reads `steerClock` directly, so nothing
 * in the Canvas re-renders per frame; the DOM instruments re-render only when
 * the tick changes.
 */
export function SteerDriver() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) useSteerLab.setState({ playing: false });
  }, [reduced]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let hud = 0;

    const loop = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.06, Math.max(0, (now - last) / 1000));
      last = now;

      const state = useSteerLab.getState();
      const moved = advanceSteering(dt, state);

      // A paused, untouched scene costs the DOM nothing.
      hud += dt;
      if ((state.playing || moved) && hud >= 0.12) {
        hud = 0;
        useSteerLab.setState((s) => ({ uiTick: s.uiTick + 1 }));
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
