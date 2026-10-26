import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useApp } from "@/store";
import { Scene } from "@/components/Scene";
import { Header } from "@/components/ui/Header";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { BottomBar } from "@/components/ui/BottomBar";

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-slate-100">
      <Canvas
        camera={{ position: [3.2, 1.7, 4.0], fov: 42, near: 0.01, far: 400 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => {
          const st = useApp.getState();
          if (st.selectedId !== null) st.selectSat(null);
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <Header />
      <ControlPanel />
      <InfoPanel />
      <BottomBar />

      {/* Small-screen notice */}
      <div className="absolute bottom-28 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-slate-700/60 bg-slate-950/80 p-3 text-center text-xs text-slate-300 backdrop-blur-md lg:hidden">
        This 3D experience works best on a larger screen. Rotate your device to landscape.
      </div>
    </div>
  );
}
