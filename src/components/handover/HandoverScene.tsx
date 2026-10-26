import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import {
  BEAM_ORIGIN,
  ROLE_COLOR,
  SAT_KEYS_3D,
  UP,
  frameState,
  makeSatelliteGeometry,
} from "./handoverFrame";
import { PhasedArrayFace } from "./PhasedArrayFace";
import { handoverClock, useHandoverUI, type CameraMode } from "./handoverStore";
import {
  ELEVATION_MASK_DEG,
  OBSERVER,
  PASSES,
  SCENARIO_DURATION_SEC,
  SIM_RATE_AT_1X,
  satelliteSnapshot,
} from "@/lib/handover";
import { EARTH_URLS, loadTexture, makeFallbackEarth, makeGlowTexture } from "@/lib/textures";
import { cn } from "@/utils/cn";

const GLOW_TEXTURE = makeGlowTexture();
const EARTH_CENTER = new THREE.Vector3(0, -1, 0);
const PANEL_TILT = 0.22;

/* -------------------------------------------------------------------------- */
/* Camera presets                                                             */
/* -------------------------------------------------------------------------- */

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const CAMERA_PRESETS: Record<CameraMode, CameraPreset> = {
  // Beside the roof: dish low in frame, the eastern sky and both pass arcs above.
  ground: { position: [-0.15, 0.04, 0.065], target: [0.04, 0.115, -0.018], fov: 72 },
  // Pulled back past the limb: the whole pass, the planet's curve, the same dish.
  space: { position: [0.29, 0.19, 0.35], target: [0, 0.035, 0], fov: 50 },
  // Right on top of the panel: the element lattice and the phase pattern.
  dish: { position: [0.068, 0.055, 0.076], target: [0, 0.021, 0.002], fov: 42 },
};

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Rotation that puts the observer's real lat/lon at the local "up" axis. */
function earthQuaternion() {
  const lat = THREE.MathUtils.degToRad(OBSERVER.lat);
  const lon = THREE.MathUtils.degToRad(OBSERVER.lon);
  const phi = lon + Math.PI;
  const up = new THREE.Vector3(
    -Math.cos(phi) * Math.cos(lat),
    Math.sin(lat),
    Math.sin(phi) * Math.cos(lat),
  ).normalize();
  const east = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).normalize();
  const north = new THREE.Vector3().crossVectors(up, east).normalize();

  const source = new THREE.Matrix4().makeBasis(east, up, north);
  const desired = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -1),
  );
  const rotation = desired.multiply(source.invert());
  return new THREE.Quaternion().setFromRotationMatrix(rotation);
}

/** Graticule on the globe, so the local patch has a sense of scale. */
function makeGraticuleGeometry(radius = 1.002) {
  const pts: number[] = [];
  const SEG = 96;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const push = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (let lat = -75; lat <= 75; lat += 15) {
    const la = THREE.MathUtils.degToRad(lat);
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2;
      const a1 = ((i + 1) / SEG) * Math.PI * 2;
      p.set(Math.cos(la) * Math.cos(a0), Math.sin(la), Math.cos(la) * Math.sin(a0)).multiplyScalar(radius);
      q.set(Math.cos(la) * Math.cos(a1), Math.sin(la), Math.cos(la) * Math.sin(a1)).multiplyScalar(radius);
      push(p, q);
    }
  }
  for (let lon = 0; lon < 360; lon += 15) {
    const lo = THREE.MathUtils.degToRad(lon);
    for (let i = 0; i < SEG; i++) {
      const p0 = (i / SEG) * Math.PI * 2;
      const p1 = ((i + 1) / SEG) * Math.PI * 2;
      p.set(Math.cos(lo) * Math.sin(p0), Math.cos(p0), -Math.sin(lo) * Math.sin(p0)).multiplyScalar(radius);
      q.set(Math.cos(lo) * Math.sin(p1), Math.cos(p1), -Math.sin(lo) * Math.sin(p1)).multiplyScalar(radius);
      push(p, q);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/* -------------------------------------------------------------------------- */
/* Timeline driver                                                            */
/* -------------------------------------------------------------------------- */

function SimulationDriver() {
  useFrame((_, delta) => {
    const ui = useHandoverUI.getState();
    if (!ui.playing) return;
    const step = Math.min(delta, 0.1) * SIM_RATE_AT_1X * ui.speed;
    let next = handoverClock.time + step;
    if (next >= SCENARIO_DURATION_SEC) {
      if (ui.loop) {
        next %= SCENARIO_DURATION_SEC;
      } else {
        next = SCENARIO_DURATION_SEC - 0.01;
        useHandoverUI.setState({ playing: false });
      }
    }
    handoverClock.time = next;
  });
  return null;
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

function Starfield() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 1200;
    const pos = new Float32Array(count * 3);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1;
      const theta = rnd() * Math.PI * 2;
      const r = 6 + rnd() * 4;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(theta) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(theta) * s * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geometry} raycast={() => null}>
      <pointsMaterial
        size={0.022}
        sizeAttenuation
        color="#cfe0f7"
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

function EarthGlobe() {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const quaternion = useMemo(earthQuaternion, []);
  const graticule = useMemo(() => makeGraticuleGeometry(), []);

  useEffect(() => {
    let alive = true;
    loadTexture(
      EARTH_URLS,
      (tex) => {
        if (alive) setMap(tex);
      },
      () => {
        if (alive) setMap(makeFallbackEarth());
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <group position={EARTH_CENTER.toArray()} quaternion={quaternion}>
      <mesh>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial
          map={map ?? undefined}
          color={map ? "#8ea4bd" : "#16394d"}
          roughness={0.94}
          metalness={0.03}
        />
      </mesh>
      <lineSegments geometry={graticule} raycast={() => null}>
        <lineBasicMaterial color="#7dd3fc" transparent opacity={0.16} depthWrite={false} />
      </lineSegments>
      {/* Limb glow. */}
      <mesh scale={1.018} raycast={() => null}>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={/* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
              vec3 col = vec3(0.24, 0.62, 1.0);
              gl_FragColor = vec4(col * rim * 1.2, rim * 0.9);
            }
          `}
        />
      </mesh>
    </group>
  );
}

/** A faint pad under the dish so the local site reads at every camera angle. */
function DishPad() {
  return (
    <group position={[0, 0.0004, 0]} raycast={() => null}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.0125, 0.0135, 64]} />
        <meshBasicMaterial color="#3ddbd9" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
        <circleGeometry args={[0.0125, 48]} />
        <meshBasicMaterial color="#0b1c2a" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Dish                                                                       */
/* -------------------------------------------------------------------------- */

function DishAssembly() {
  const camera = useHandoverUI((s) => s.camera);

  return (
    <group>
      {/* Mast + fixed bracket. Nothing here rotates during the simulation. */}
      <mesh position={[0, 0.0062, 0]} castShadow={false}>
        <cylinderGeometry args={[0.0032, 0.0055, 0.0124, 14]} />
        <meshStandardMaterial color="#2a3a50" metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.0138, 0]} rotation={[PANEL_TILT, 0, -0.25]}>
        <boxGeometry args={[0.012, 0.0016, 0.006]} />
        <meshStandardMaterial color="#22303f" metalness={0.6} roughness={0.4} />
      </mesh>

      <group position={[0, 0.0158, 0]} rotation={[PANEL_TILT, 0, -0.25]}>
        {/* Panel body */}
        <mesh position={[0, 0.0024, 0]}>
          <boxGeometry args={[0.05, 0.0034, 0.036]} />
          <meshStandardMaterial color="#0d1f2b" metalness={0.45} roughness={0.5} />
        </mesh>
        {/* Panel outline: keeps the fixed hardware readable from the ground view,
            where the array face is pointed away from the camera. */}
        <mesh position={[0, 0.0024, 0]} raycast={() => null}>
          <boxGeometry args={[0.0506, 0.0036, 0.0366]} />
          <meshBasicMaterial color="#3ddbd9" wireframe transparent opacity={0.28} />
        </mesh>
        <PhasedArrayFace />
      </group>

      {camera === "dish" && (
        <Html position={[0, 0.046, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[8, 0]}>
          <div className="whitespace-nowrap rounded-full border border-signal/30 bg-[#04121a]/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-signal">
            fixed panel · electronic steering
          </div>
        </Html>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Satellites                                                                 */
/* -------------------------------------------------------------------------- */

function SatelliteNodes() {
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const glowRefs = useRef<Array<THREE.Sprite | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const geometry = useMemo(makeSatelliteGeometry, []);
  const materials = useMemo(
    () =>
      SAT_KEYS_3D.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#ffffff",
            metalness: 0.45,
            roughness: 0.4,
            emissive: new THREE.Color("#1b4a57"),
            emissiveIntensity: 0.8,
          }),
      ),
    [],
  );
  const scratch = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const st = frameState();
    const showLabels = useHandoverUI.getState().showLabels;
    SAT_KEYS_3D.forEach((key, i) => {
      const sat = st.sats[key];
      const group = groupRefs.current[i];
      const glow = glowRefs.current[i];
      if (!group) return;
      group.position.set(sat.position[0], sat.position[1], sat.position[2]);
      group.visible = sat.elDeg > -1;

      scratch.set(ROLE_COLOR[sat.role]);
      const mat = materials[i];
      mat.color.copy(scratch);
      mat.emissive.copy(scratch).multiplyScalar(0.45);
      mat.emissiveIntensity = sat.beamOpacity > 0.4 ? 1.1 : 0.55;

      if (glow) {
        const gm = glow.material as THREE.SpriteMaterial;
        gm.color.copy(scratch);
        gm.opacity = sat.role === "out" ? 0.16 : sat.beamOpacity > 0.4 ? 0.75 : 0.4;
      }

      const label = labelRefs.current[i];
      if (label) {
        const visible = showLabels && sat.elDeg > -1;
        label.style.display = visible ? "block" : "none";
        if (visible) {
          const text = `SAT-${key} · ${sat.elDeg.toFixed(0)}°`;
          if (label.textContent !== text) label.textContent = text;
          label.style.color = ROLE_COLOR[sat.role];
          label.style.borderColor = `${ROLE_COLOR[sat.role]}55`;
          label.style.boxShadow =
            sat.role === "serving" ? "0 0 18px -4px rgba(61,219,217,0.8)" : "none";
        }
      }
    });
  });

  return (
    <>
      {SAT_KEYS_3D.map((key, i) => (
        <group
          key={key}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          <mesh geometry={geometry} material={materials[i]} raycast={() => null} />
          <sprite
            scale={[0.017, 0.017, 1]}
            raycast={() => null}
            ref={(el) => {
              glowRefs.current[i] = el;
            }}
          >
            <spriteMaterial
              map={GLOW_TEXTURE}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.6}
            />
          </sprite>
          <Html
            position={[0, 0.011, 0]}
            center
            style={{ pointerEvents: "none" }}
            zIndexRange={[7, 0]}
          >
            <div
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              style={{ transform: "translateY(-15px)" }}
              className="whitespace-nowrap rounded-full border bg-[#040a14]/80 px-1.5 py-[2px] font-mono text-[9px] tracking-[0.08em] text-signal"
            >
              SAT-{key}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Orbital sky paths                                                          */
/* -------------------------------------------------------------------------- */

function SkyPaths() {
  const lineRefs = useRef<Array<any>>([]);
  const paths = useMemo(
    () =>
      SAT_KEYS_3D.map((key) => {
        const points: [number, number, number][] = [];
        const { riseSec, setSec } = PASSES[key];
        for (let t = riseSec; t <= setSec; t += 2) {
          const snap = satelliteSnapshot(key, t);
          if (snap.elDeg > 0.5) points.push(snap.position);
        }
        return points;
      }),
    [],
  );

  useFrame(() => {
    const st = frameState();
    const show = useHandoverUI.getState().showPaths;
    SAT_KEYS_3D.forEach((key, i) => {
      const line = lineRefs.current[i];
      if (!line) return;
      const sat = st.sats[key];
      line.visible = show;
      const mat = line.material as THREE.Material & { color?: THREE.Color; opacity: number };
      if (!mat) return;
      if (mat.color) mat.color.set(ROLE_COLOR[sat.role]);
      mat.opacity = sat.role === "out" ? 0.14 : sat.beamOpacity > 0.4 ? 0.8 : 0.34;
      mat.transparent = true;
    });
  });

  return (
    <>
      {paths.map((points, i) => (
        <Line
          key={SAT_KEYS_3D[i]}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          points={points}
          color={ROLE_COLOR.visible}
          lineWidth={1.25}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Beams                                                                      */
/* -------------------------------------------------------------------------- */

interface BeamMaterials {
  core: THREE.MeshBasicMaterial;
  halo: THREE.MeshBasicMaterial;
}

function LinkBeams() {
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const coreRefs = useRef<Array<THREE.Mesh | null>>([]);
  const haloRefs = useRef<Array<THREE.Mesh | null>>([]);
  const packetRefs = useRef<Array<Array<THREE.Sprite | null>>>([]);
  const beamGeometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), []);

  const materials = useMemo<BeamMaterials[]>(
    () =>
      SAT_KEYS_3D.map(() => ({
        core: new THREE.MeshBasicMaterial({
          color: "#3ddbd9",
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
        halo: new THREE.MeshBasicMaterial({
          color: "#3ddbd9",
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      })),
    [],
  );

  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpMid = useMemo(() => new THREE.Vector3(), []);
  const tmpTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const st = frameState();
    const show = useHandoverUI.getState().showBeams;
    SAT_KEYS_3D.forEach((key, i) => {
      const sat = st.sats[key];
      const group = groupRefs.current[i];
      const core = coreRefs.current[i];
      const halo = haloRefs.current[i];
      if (!group || !core || !halo) return;

      const opacity = sat.beamOpacity;
      const showBeam = show && opacity > 0.015 && sat.elDeg > -1;
      group.visible = showBeam;
      if (!showBeam) {
        packetRefs.current[i]?.forEach((p) => {
          if (p) p.visible = false;
        });
        return;
      }

      tmpTarget.set(sat.position[0], sat.position[1], sat.position[2]);
      tmpDir.copy(tmpTarget).sub(BEAM_ORIGIN);
      const length = tmpDir.length();
      tmpDir.normalize();
      tmpMid.copy(BEAM_ORIGIN).addScaledVector(tmpDir, length / 2);

      const coreMesh = core;
      coreMesh.position.copy(tmpMid);
      coreMesh.quaternion.setFromUnitVectors(UP, tmpDir);
      coreMesh.scale.set(0.0009, length, 0.0009);

      const haloMesh = halo;
      haloMesh.position.copy(tmpMid);
      haloMesh.quaternion.copy(coreMesh.quaternion);
      haloMesh.scale.set(0.0038, length, 0.0038);

      const mat = materials[i];
      const color = ROLE_COLOR[sat.role];
      mat.core.color.set(color);
      mat.halo.color.set(color);
      mat.core.opacity = 0.85 * opacity;
      mat.halo.opacity = 0.16 * opacity;

      // Data packets running up the link, so the beam reads as "carrying traffic".
      const packets = packetRefs.current[i];
      if (packets) {
        const speed = 0.55;
        packets.forEach((packet, pi) => {
          if (!packet) return;
          packet.visible = opacity > 0.5;
          const phase = ((handoverClock.time * speed + pi * 0.5 + i * 0.17) % 1 + 1) % 1;
          packet.position.copy(BEAM_ORIGIN).addScaledVector(tmpDir, length * phase);
          const pm = packet.material as THREE.SpriteMaterial;
          pm.color.set(color);
          pm.opacity = opacity * (0.35 + 0.65 * Math.sin(Math.PI * phase));
        });
      }
    });
  });

  return (
    <>
      {SAT_KEYS_3D.map((key, i) => (
        <group
          key={key}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          <mesh
            ref={(el) => {
              haloRefs.current[i] = el;
            }}
            geometry={beamGeometry}
            material={materials[i].halo}
            raycast={() => null}
          />
          <mesh
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
            geometry={beamGeometry}
            material={materials[i].core}
            raycast={() => null}
          />
          {[0, 1].map((pi) => (
            <sprite
              key={pi}
              scale={[0.0055, 0.0055, 1]}
              raycast={() => null}
              ref={(el) => {
                if (!packetRefs.current[i]) packetRefs.current[i] = [null, null];
                packetRefs.current[i][pi] = el;
              }}
            >
              <spriteMaterial
                map={GLOW_TEXTURE}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.8}
              />
            </sprite>
          ))}
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Coverage / footprints                                                      */
/* -------------------------------------------------------------------------- */

function CoverageVolume() {
  const showCoverage = useHandoverUI((s) => s.showCoverage);
  const coneHeight = 0.062;
  const coneRadius = coneHeight * Math.tan(THREE.MathUtils.degToRad(90 - ELEVATION_MASK_DEG));
  const footprintRefs = useRef<Array<THREE.Mesh | null>>([]);
  const meshRef = useRef<THREE.Group>(null);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => EARTH_CENTER.clone(), []);

  useFrame(() => {
    const st = frameState();
    const show = useHandoverUI.getState().showCoverage;
    if (meshRef.current) meshRef.current.visible = show;

    SAT_KEYS_3D.forEach((key, i) => {
      const ring = footprintRefs.current[i];
      if (!ring) return;
      const sat = st.sats[key];
      ring.visible = show && sat.elDeg > 0;
      if (!ring.visible) return;
      point.set(sat.position[0], sat.position[1], sat.position[2]);
      normal.copy(point).sub(center).normalize();
      ring.position.copy(center).addScaledVector(normal, 1.0008);
      ring.quaternion.setFromUnitVectors(UP, normal);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.color.set(ROLE_COLOR[sat.role]);
      mat.opacity = sat.role === "out" ? 0.12 : 0.4;
    });
  });

  return (
    <>
      <group ref={meshRef}>
        {/* The cone of sky above the terminal's 25° elevation mask. */}
        <group position={[0, 0.021, 0]} raycast={() => null}>
          <mesh
            position={[0, coneHeight / 2, 0]}
            rotation={[Math.PI, 0, 0]}
            raycast={() => null}
          >
            <coneGeometry args={[coneRadius, coneHeight, 48, 1, true]} />
            <meshBasicMaterial
              color="#3ddbd9"
              transparent
              opacity={0.045}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0, coneHeight, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[coneRadius * 0.99, coneRadius, 72]} />
            <meshBasicMaterial
              color="#3ddbd9"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * coneRadius * 0.5, coneHeight * 0.5, Math.sin(a) * coneRadius * 0.5]}
                rotation={[0, -a, 0]}
                raycast={() => null}
              >
                <boxGeometry args={[0.0006, coneHeight, 0.0006]} />
                <meshBasicMaterial color="#3ddbd9" transparent opacity={0.22} />
              </mesh>
            );
          })}
        </group>
      </group>

      {showCoverage && (
        <Html
          position={[0, coneHeight * 1.06, -coneRadius * 0.98]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[5, 0]}
        >
          <div
            style={{ transform: "translateY(-6px)" }}
            className="whitespace-nowrap rounded border border-signal/25 bg-[#04121a]/80 px-1.5 py-[2px] font-mono text-[8px] uppercase tracking-[0.1em] text-signal/80"
          >
            25° visibility mask
          </div>
        </Html>
      )}

      {SAT_KEYS_3D.map((key, i) => (
        <mesh
          key={key}
          ref={(el) => {
            footprintRefs.current[i] = el;
          }}
          raycast={() => null}
        >
          <ringGeometry args={[0.0055, 0.0062, 48]} />
          <meshBasicMaterial
            color="#3ddbd9"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const mode = useHandoverUI((s) => s.camera);
  const anim = useRef<{ active: boolean; position: THREE.Vector3; target: THREE.Vector3; fov: number }>({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: CAMERA_PRESETS.ground.fov,
  });

  useEffect(() => {
    const preset = CAMERA_PRESETS[mode];
    anim.current = {
      active: true,
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
      fov: preset.fov,
    };
  }, [mode]);

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
    if (camera.position.distanceTo(a.position) < 0.0012) {
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
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Memoised so the status panel's ~14 Hz updates never re-render the whole
 * three.js tree; everything animated inside reads the shared clock instead.
 */
export const HandoverScene = memo(function HandoverScene({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <Canvas
        dpr={[1, 1.8]}
        camera={{
          position: CAMERA_PRESETS.ground.position,
          fov: CAMERA_PRESETS.ground.fov,
          near: 0.004,
          far: 40,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#02050c"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 3]} intensity={2.1} color="#dce9ff" />
        <directionalLight position={[-4, -1, -3]} intensity={0.35} color="#2f7fa8" />

        <SimulationDriver />
        <CameraRig />
        <Starfield />
        <EarthGlobe />
        <DishPad />
        <DishAssembly />
        <CoverageVolume />
        <SkyPaths />
        <LinkBeams />
        <SatelliteNodes />

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.05}
          maxDistance={3.4}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.7}
        />
      </Canvas>
    </div>
  );
});
