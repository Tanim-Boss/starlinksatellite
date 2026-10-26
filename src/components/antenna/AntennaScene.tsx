import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SceneGate } from "@/components/site/SceneGate";
import { cn } from "@/utils/cn";
import { AntennaArray } from "./AntennaArray";
import { ElementWavefrontRings, InterferenceSheet, MainBeam, RadiationPattern } from "./BeamAndWaves";
import { SkyDome, SkySatellites, TargetSightLine } from "./SatelliteSky";
import { useBeamLab, type CameraView } from "./antennaStore";

/* -------------------------------------------------------------------------- */
/* Camera presets                                                             */
/* -------------------------------------------------------------------------- */

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

function presets(compact: boolean): Record<CameraView, CameraPreset> {
  return compact
    ? {
        sky: { position: [12, 9.6, 21], target: [0, 4.4, 0], fov: 52 },
        panel: { position: [0.8, 11.5, 8.8], target: [0, 0.2, 0], fov: 48 },
      }
    : {
        sky: { position: [8.6, 7.6, 15.5], target: [0, 4.3, 0], fov: 46 },
        panel: { position: [0.6, 8.6, 6.8], target: [0, 0.15, 0], fov: 38 },
      };
}

function CameraRig({ compact }: { compact: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const mode = useBeamLab((s) => s.camera);
  const nonce = useBeamLab((s) => s.cameraNonce);
  const anim = useRef<{
    active: boolean;
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  }>({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 46,
  });

  useEffect(() => {
    const preset = presets(compact)[mode];
    anim.current = {
      active: true,
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
      fov: preset.fov,
    };
  }, [mode, nonce, compact, controls]);

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
/* Static sky and ground                                                      */
/* -------------------------------------------------------------------------- */

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld).y;
    vec3 low = vec3(0.008, 0.016, 0.032);
    vec3 high = vec3(0.012, 0.041, 0.075);
    vec3 col = mix(low, high, smoothstep(-0.1, 0.85, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyShell() {
  return (
    <mesh scale={[60, 60, 60]} raycast={() => null}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function Starfield() {
  const geometry = useMemo(() => {
    const count = 1500;
    const pos = new Float32Array(count * 3);
    let seed = 19;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const u = rnd() * 1.2 - 0.2; // keep the lower hemisphere sparse
      const theta = rnd() * Math.PI * 2;
      const r = 40 + rnd() * 12;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      pos[i * 3] = Math.cos(theta) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(theta) * s * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geometry} raycast={() => null}>
      <pointsMaterial
        color="#bcd4f2"
        size={0.085}
        sizeAttenuation
        transparent
        opacity={0.62}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

function GroundPlane() {
  const rings = useMemo(() => {
    const pts: number[] = [];
    const push = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (const r of [4, 7, 10, 13, 16]) {
      const seg = 128;
      for (let n = 0; n < seg; n++) {
        const a0 = (n / seg) * Math.PI * 2;
        const a1 = ((n + 1) / seg) * Math.PI * 2;
        p.set(Math.cos(a0) * r, -0.545, Math.sin(a0) * r);
        q.set(Math.cos(a1) * r, -0.545, Math.sin(a1) * r);
        push(p, q);
      }
    }
    for (let az = 0; az < 360; az += 30) {
      const a = (az * Math.PI) / 180;
      p.set(Math.sin(a) * 3.2, -0.545, Math.cos(a) * 3.2);
      q.set(Math.sin(a) * 16, -0.545, Math.cos(a) * 16);
      push(p, q);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.55, 0]} raycast={() => null}>
        <circleGeometry args={[22, 72]} />
        <meshStandardMaterial color="#050a13" roughness={0.95} metalness={0.1} />
      </mesh>
      <lineSegments geometry={rings} raycast={() => null}>
        <lineBasicMaterial color="#163243" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Scene contents                                                             */
/* -------------------------------------------------------------------------- */

function SceneContents({ compact }: { compact: boolean }) {
  const view = useBeamLab((s) => s.view);
  const showLabels = useBeamLab((s) => s.showLabels);

  return (
    <>
      <fog attach="fog" args={["#02050c", 26, 70]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#9cc7ff", "#040a14", 0.35]} />
      <directionalLight position={[9, 13, 7]} intensity={2.2} color="#dce9ff" />
      <directionalLight position={[-7, 5, -8]} intensity={0.55} color="#2f7fa8" />
      <pointLight position={[0, 1.6, 0]} intensity={2.4} distance={8} color="#3ddbd9" />

      <SkyShell />
      <Starfield />
      <GroundPlane />
      <SkyDome />

      <AntennaArray />
      <SkySatellites />
      <TargetSightLine />

      <MainBeam view={view} />
      {view === "wave" && (
        <>
          <InterferenceSheet />
          <ElementWavefrontRings />
        </>
      )}
      {view === "pattern" && <RadiationPattern showLabels={showLabels} />}

      <CameraRig compact={compact} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4}
        maxDistance={40}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI * 0.492}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Memoised so the lab's 10 Hz readout updates never re-render the three.js
 * tree. Everything that moves inside reads the shared beam/sky state.
 */
export const AntennaScene = memo(function AntennaScene({
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
        caption="Calibrating the array…"
        unavailableTitle="The phased-array scene needs WebGL."
        unavailableBody="This browser cannot create a 3D context, so the live scene is off. The sliders, the array close-up, the radiation cut and the guided experiment below all still work."
      >
        <Canvas
          dpr={compact ? [1, 1.5] : [1, 1.75]}
          camera={{
            position: initial.position,
            fov: initial.fov,
            near: 0.05,
            far: 90,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#02050c"]} />
          <SceneContents compact={compact} />
        </Canvas>
      </SceneGate>
    </div>
  );
});
