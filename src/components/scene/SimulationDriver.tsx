import { useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OMEGA_EARTH } from "@/lib/astro";
import { earthState, simClock } from "@/lib/simClock";
import { useApp } from "@/store";

let uiAcc = 0;

/**
 * Advances the simulation clock and Earth rotation once per frame, and bumps
 * a low-frequency `uiTick` so data readouts re-render ~5x/second instead of
 * every frame.
 */
export function SimulationDriver() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  useFrame((_, dt) => {
    const st = useApp.getState();
    const step = Math.min(dt, 0.1); // clamp huge deltas (tab switches)
    if (st.playing) {
      simClock.time += step * st.speed;
      if (st.toggles.earthSpin) {
        earthState.angle = (earthState.angle + step * st.speed * OMEGA_EARTH) % (Math.PI * 2);
      }
    }
    uiAcc += dt;
    if (uiAcc >= 0.2) {
      uiAcc = 0;
      useApp.setState({ uiTick: useApp.getState().uiTick + 1 });
    }
  });

  return null;
}
