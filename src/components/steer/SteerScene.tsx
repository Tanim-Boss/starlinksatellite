import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SceneGate } from "@/components/site/SceneGate";
import { cn } from "@/utils/cn";
import { BeamLink } from "./BeamLink";
import { SourceSatellite } from "./SourceSatellite";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { TargetSatellites } from "./TargetSatellites";
import { TrackingLine } from "./TrackingLine";
import { useSteerLab, type CameraView } from "./steerStore";

/* -------------------------------------------------------------------------- */
/* Camera presets                                                              */
/* -------------------------------------------------------------------------- */

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

function presets(compact: boolean): Record<CameraView, CameraPreset> {
  if (compact) {
    return {
      overview: { position: [13.5, 7.8, 17.5], target: [0, 0.3, 0], fov: 60 },
      mechanism: { position: [3.4, 2.4, 4.4], target: [0, 1.0, 0], fov: 48 },
      beam: { position: [-2.4, 3.2, -5.6], target: [1.4, 0.4, 6.5], fov: 60 },
    };
  }
  return {
    overview: { position: [10.5, 6.4, 13.5], target: [0, 0.4, 0], fov: 50 },
    mechanism: { position: [2.4, 1.8, 3.1], target: [0, 1.02, 0], fov: 40 },
    beam: { position: [-1.6, 2.4, -4.2], target: [1.2, 0.6, 6], fov: 52 },
  };
}

function CameraRig({ compact }: { compact: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const view = useSteerLab((s) => s.view);
  const viewNonce = useSteerLab((s) => s.viewNonce);
  const firstMount = useRef(true);
  const anim = useRef({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 52,
  });

  useEffect(() => {
    const preset = presets(compact)[view];
    anim.current = {
      active: true,
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
      fov: preset.fov,
    };
    // First frame is already composed: no swing in while the page settles.
    if (firstMount.current && controls) {
      firstMount.current = false;
      anim.current.active = false;
      camera.position.copy(anim.current.position);
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
      controls.target.copy(anim.current.target);
      controls.update();
    }
  }, [view, viewNonce, compact, controls, camera]);

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
/* Poster while WebGL loads / is unavailable                                   */
/* -------------------------------------------------------------------------- */

function SteerPoster() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(70% 60% at 50% 45%, rgba(255,122,26,0.10) 0%, rgba(9,18,34,0.55) 55%, #02050c 100%)",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-70" fill="none">
        {[40, 80, 120, 160, 200].map((cx, i) => (
          <ellipse
            key={cx}
            cx={150 + (cx - 40) * 0.55}
            cy={190 - (cx - 40) * 0.42}
            rx={10 + i * 1.6}
            ry={4 + i * 0.7}
            stroke="#ff7a1a"
            strokeOpacity={0.6 - i * 0.09}
            strokeWidth={2}
          />
        ))}
        <line x1="150" y1="190" x2="330" y2="60" stroke="#3ddbd9" strokeWidth="1" strokeDasharray="5 5" strokeOpacity="0.6" />
        <rect x="132" y="178" width="36" height="26" rx="3" fill="#b9c4d2" fillOpacity="0.85" />
        <rect x="92" y="184" width="34" height="14" fill="#1d4e9b" fillOpacity="0.8" />
        <rect x="174" y="184" width="34" height="14" fill="#1d4e9b" fillOpacity="0.8" />
        <circle cx="330" cy="60" r="9" fill="#60a5fa" fillOpacity="0.85" />
        <circle cx="70" cy="90" r="7" fill="#3ddbd9" fillOpacity="0.85" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scene contents                                                              */
/* -------------------------------------------------------------------------- */

function SceneContents({ compact }: { compact: boolean }) {
  const tech = useSteerLab((s) => s.tech);
  const lights = useMemo(
    () => (
      <>
        <ambientLight intensity={0.38} />
        <hemisphereLight args={["#9fc6ff", "#05070d", 0.5]} />
        <directionalLight position={[8, 11, 6]} intensity={2.2} color="#dfe9ff" />
        <directionalLight position={[-7, 3, -8]} intensity={0.75} color="#3f7fa8" />
        <pointLight position={[0, 1.2, 0]} intensity={1.6} distance={9} decay={2} color="#ff8a3c" />
      </>
    ),
    [],
  );

  return (
    <>
      <fog attach="fog" args={["#02050c", 30, 72]} />
      {lights}
      <SpaceBackdrop />
      <SourceSatellite tech={tech} />
      <TargetSatellites />
      <TrackingLine />
      <BeamLink />
      <CameraRig compact={compact} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.7}
        maxDistance={38}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.75}
      />
    </>
  );
}

export const SteerScene = memo(function SteerScene({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const initial = presets(compact).overview;
  return (
    <div className={cn("relative h-full w-full", className)}>
      <SceneGate
        caption="Pointing the terminal…"
        poster={<SteerPoster />}
        unavailableTitle="The beam lab needs WebGL for its 3D view."
        unavailableBody="This browser cannot create a 3D context, so the scene is off. The target buttons, azimuth and elevation sliders, telemetry, stage narrative and every readout below still work."
      >
        <Canvas
          dpr={compact ? [1, 1.5] : [1, 1.8]}
          camera={{ position: initial.position, fov: initial.fov, near: 0.05, far: 160 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#02050c"]} />
          <SceneContents compact={compact} />
        </Canvas>
      </SceneGate>
    </div>
  );
});
