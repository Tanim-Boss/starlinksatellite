import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SceneGate } from "@/components/site/SceneGate";
import { cn } from "@/utils/cn";
import { DISH_Y, SKY_RADIUS } from "@/lib/dishBeam";
import { useBeamLab, type BeamView } from "./beamStore";
import { Dish } from "./Dish";
import { SkyBackdrop } from "./SkyBackdrop";
import { SkySatellites } from "./SkySatellites";
import { SightLine } from "./SightLine";
import { WaveColumn } from "./WaveColumn";

/* -------------------------------------------------------------------------- */
/* Camera presets                                                             */
/* -------------------------------------------------------------------------- */

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

function presets(compact: boolean): Record<BeamView, CameraPreset> {
  if (compact) {
    return {
      sky: { position: [14.5, 3.7, 21], target: [0, 6.8, 0], fov: 63 },
      dish: { position: [3.8, 1.5, 6.1], target: [0, 2.2, 0], fov: 50 },
      orbit: { position: [12.5, 5.4, 18], target: [0, 6.4, 0], fov: 62 },
    };
  }
  return {
    sky: { position: [10, 2.6, 14.5], target: [0, 5.6, 0], fov: 58 },
    dish: { position: [2.7, 1.25, 4.3], target: [0, 1.9, 0], fov: 45 },
    orbit: { position: [8.2, 4.6, 12.4], target: [0, 6, 0], fov: 55 },
  };
}

function CameraRig({ compact }: { compact: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const view = useBeamLab((s) => s.view);
  const firstMount = useRef(true);
  const anim = useRef<{
    active: boolean;
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  }>({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 55,
  });

  useEffect(() => {
    const preset = presets(compact)[view];
    anim.current = {
      active: true,
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
      fov: preset.fov,
    };

    // The very first frame should already be composed: no slow swing in from
    // the origin while the page settles.
    if (firstMount.current && controls) {
      firstMount.current = false;
      anim.current.active = false;
      camera.position.copy(anim.current.position);
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
      controls.target.copy(anim.current.target);
      controls.update();
    }
  }, [view, compact, controls, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a.active) return;
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.1));
    camera.position.lerp(a.position, k);
    camera.fov += (a.fov - camera.fov) * k;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.lerp(a.target, k);
      controls.update();
    }
    if (camera.position.distanceTo(a.position) < 0.02) {
      a.active = false;
      camera.position.copy(a.position);
      camera.fov = a.fov;
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.copy(a.target);
        controls.update();
      }
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Post-load poster                                                           */
/* -------------------------------------------------------------------------- */

const POSTER_ARCS = [0.18, 0.32, 0.46, 0.6, 0.74, 0.88];

function DishPoster() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(60% 55% at 50% 82%, rgba(255,122,26,0.10) 0%, rgba(9,18,34,0.6) 55%, #03060e 100%)",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-55" fill="none">
        {POSTER_ARCS.map((t, i) => {
          const half = 16 + t * 92;
          const top = 236 - t * 196;
          return (
            <path
              key={t}
              d={`M ${200 - half} ${236 - t * 34} Q 200 ${top - 26 - i * 4} ${200 + half} ${236 - t * 34}`}
              stroke="#ff7a1a"
              strokeOpacity={0.55 - i * 0.06}
              strokeWidth={2.4 - i * 0.22}
              strokeLinecap="round"
            />
          );
        })}
        <ellipse cx="200" cy="236" rx="46" ry="11" fill="#cfd8e3" fillOpacity="0.88" />
        <path d="M154 236c12 8 80 8 92 0" stroke="#7f8b9a" strokeWidth="2.4" />
        <line x1="200" y1="246" x2="200" y2="272" stroke="#242b35" strokeWidth="3" />
        <path d="M200 272l-26 16M200 272l26 16M200 272v18" stroke="#242b35" strokeWidth="3" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

function SceneContents({ compact }: { compact: boolean }) {
  const view = useBeamLab((s) => s.view);

  return (
    <>
      <fog attach="fog" args={["#03060e", 24, 58]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#9fc6ff", "#04070d", 0.45]} />
      <directionalLight position={[6.5, 13, 8]} intensity={2.1} color="#dfe9ff" />
      <directionalLight position={[-8, 5, -7]} intensity={0.65} color="#3f7fa8" />
      <pointLight
        position={[0, DISH_Y + 0.5, 0]}
        intensity={2.2}
        distance={SKY_RADIUS}
        decay={2}
        color="#ff7a24"
      />

      <SkyBackdrop />
      <Dish />
      <WaveColumn compact={compact} />
      <SkySatellites />
      <SightLine />

      <CameraRig compact={compact} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.6}
        maxDistance={30}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.56}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        autoRotate={view === "orbit"}
        autoRotateSpeed={0.45}
      />
    </>
  );
}

/**
 * The canvas is memoised so the eight-per-second readout updates never touch
 * the three.js tree. Everything that moves inside reads the shared clock.
 */
export const DishScene = memo(function DishScene({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const initial = presets(compact).sky;
  return (
    <div className={cn("relative h-full w-full", className)}>
      <SceneGate
        caption="Raising the wavefronts…"
        poster={<DishPoster />}
        unavailableTitle="The dish needs WebGL for its 3D view."
        unavailableBody="This browser cannot create a 3D context, so the scene is off. The sky plot, the aim controls, the phase words and every readout below still work."
      >
        <Canvas
          dpr={compact ? [1, 1.5] : [1, 1.8]}
          camera={{
            position: initial.position,
            fov: initial.fov,
            near: 0.05,
            far: 120,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#03060e"]} />
          <SceneContents compact={compact} />
        </Canvas>
      </SceneGate>
    </div>
  );
});
