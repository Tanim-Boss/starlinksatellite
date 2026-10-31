import { lazy, Suspense, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { PerformanceMonitor } from "@react-three/drei";
import { comparisonConfig } from "../config";
import { useComparisonStore } from "../hooks/useComparisonStore";
import { LoadingScreen } from "../ui/LoadingScreen";

const World = lazy(() => import("./World").then((module) => ({ default: module.World })));

function FramerateControl({ active }: { active: boolean }) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  useEffect(() => {
    setFrameloop(active ? "always" : "demand");
  }, [active, setFrameloop]);
  return null;
}

export function ComparisonCanvas({ active }: { active: boolean }) {
  const lowQuality = useComparisonStore((state) => state.lowQuality);
  const reducedMotion = useComparisonStore((state) => state.reducedMotion);
  const setLowQuality = useCallback(() => useComparisonStore.getState().setLowQuality(true), []);

  return (
    <Canvas
      camera={{ position: [0.15, 3.6, 11.4], fov: 39, near: 0.04, far: 180 }}
      dpr={comparisonConfig.performance.dpr}
      frameloop={active ? "always" : "demand"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      shadows={!lowQuality}
      style={{ touchAction: "pan-y" }}
    >
      <FramerateControl active={active} />
      <PerformanceMonitor
        ms={500}
        iterations={6}
        threshold={0.65}
        bounds={() => [comparisonConfig.performance.fpsFloor, 60]}
        onDecline={setLowQuality}
        onFallback={setLowQuality}
      />
      <Suspense fallback={<LoadingScreen />}>
        <World />
        {!lowQuality && !reducedMotion && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={comparisonConfig.performance.bloomHigh}
              luminanceThreshold={0.4}
              luminanceSmoothing={0.18}
              mipmapBlur
              radius={0.72}
            />
          </EffectComposer>
        )}
        {lowQuality && !reducedMotion && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={comparisonConfig.performance.bloomReduced}
              luminanceThreshold={0.58}
              luminanceSmoothing={0.14}
              mipmapBlur
              radius={0.42}
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
