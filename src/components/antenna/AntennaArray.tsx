import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  ARRAY_N,
  elementPhaseDeg,
  phaseHue,
  steeringFromAngles,
} from "@/lib/phasedArray";
import { beamState, useBeamLab } from "./antennaStore";

/**
 * Scene units. The lattice uses exactly half-wavelength spacing in the model,
 * and 0.275 scene units here; the physical spacing is 12.5 mm, so the view is
 * a 22× magnification of a 0.2 m panel.
 */
const SPACING = 0.275;
const PANEL_SIZE = ARRAY_N * SPACING; // 4.4
const ELEMENT_Y = 0.205;

const ELEMENT_COLORS = new THREE.Color();
const dummy = new THREE.Object3D();

function elementPosition(i: number, j: number) {
  const x = (i - (ARRAY_N - 1) / 2) * SPACING;
  const z = ((ARRAY_N - 1) / 2 - j) * SPACING;
  return { x, z };
}

function cursor(on: boolean) {
  if (typeof document !== "undefined") document.body.style.cursor = on ? "pointer" : "";
}

/**
 * The face of the terminal: 256 fixed radiating elements. Nothing in this
 * component ever changes position. Steering only rewrites the instance
 * colours, which encode each element's commanded phase.
 */
function ElementLattice() {
  const elements = useRef<THREE.InstancedMesh>(null);
  const pads = useRef<THREE.InstancedMesh>(null);
  const setSelectedElement = useBeamLab((s) => s.setSelectedElement);
  const selected = useBeamLab((s) => s.selectedElement);
  const lastAngles = useRef({ az: Number.NaN, el: Number.NaN });

  const elementGeometry = useMemo(() => new THREE.CylinderGeometry(0.079, 0.086, 0.052, 12), []);
  const elementMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    [],
  );
  const padGeometry = useMemo(() => new THREE.CylinderGeometry(0.108, 0.116, 0.022, 12), []);
  const padMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x0a1626, metalness: 0.55, roughness: 0.55 }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = elements.current;
    const padMesh = pads.current;
    if (!mesh || !padMesh) return;

    for (let j = 0; j < ARRAY_N; j++) {
      for (let i = 0; i < ARRAY_N; i++) {
        const { x, z } = elementPosition(i, j);
        const idx = j * ARRAY_N + i;

        dummy.position.set(x, ELEMENT_Y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(x, ELEMENT_Y - 0.035, z);
        dummy.updateMatrix();
        padMesh.setMatrixAt(idx, dummy.matrix);

        ELEMENT_COLORS.setHSL(0.5, 0.75, 0.55);
        mesh.setColorAt(idx, ELEMENT_COLORS);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    padMesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.computeBoundingSphere();
    padMesh.computeBoundingSphere();
  }, []);

  useFrame(() => {
    const mesh = elements.current;
    if (!mesh || !mesh.instanceColor) return;
    const last = lastAngles.current;
    if (
      Math.abs(beamState.azDeg - last.az) < 0.03 &&
      Math.abs(beamState.elDeg - last.el) < 0.03
    ) {
      return;
    }
    last.az = beamState.azDeg;
    last.el = beamState.elDeg;

    const steer = steeringFromAngles(beamState.azDeg, beamState.elDeg);
    let idx = 0;
    for (let j = 0; j < ARRAY_N; j++) {
      for (let i = 0; i < ARRAY_N; i++) {
        const deg = elementPhaseDeg(i, j, steer);
        ELEMENT_COLORS.setHSL(phaseHue(deg) / 360, 0.78, 0.56);
        mesh.setColorAt(idx++, ELEMENT_COLORS);
      }
    }
    mesh.instanceColor.needsUpdate = true;
  });

  const sel = useMemo(() => {
    const { x, z } = elementPosition(selected.i, selected.j);
    return { x, z };
  }, [selected.i, selected.j]);

  return (
    <group>
      {/* Dark mounting pads under every radiator — also fixed. */}
      <instancedMesh
        ref={pads}
        args={[padGeometry, padMaterial, ARRAY_N * ARRAY_N]}
        raycast={() => null}
        frustumCulled={false}
      />

      <instancedMesh
        ref={elements}
        args={[elementGeometry, elementMaterial, ARRAY_N * ARRAY_N]}
        frustumCulled={false}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId === undefined) return;
          setSelectedElement({
            i: e.instanceId % ARRAY_N,
            j: Math.floor(e.instanceId / ARRAY_N),
          });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          cursor(true);
        }}
        onPointerOut={() => cursor(false)}
      />

      {/* Selected-element reticle. Position changes; the elements do not. */}
      <group position={[sel.x, ELEMENT_Y + 0.055, sel.z]}>
        <mesh rotation-x={-Math.PI / 2} raycast={() => null}>
          <ringGeometry args={[0.105, 0.14, 28]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.09, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.011, 0.011, 0.18, 8]} />
          <meshBasicMaterial
            color="#3ddbd9"
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/** The flat panel, its fixed mount, and the labels that explain both. */
export function AntennaArray() {
  const showLabels = useBeamLab((s) => s.showLabels);
  const view = useBeamLab((s) => s.view);
  const camera = useBeamLab((s) => s.camera);

  return (
    <group>
      {/* Plinth and ground plate — static hardware. */}
      <mesh position={[0, -0.28, 0]} receiveShadow={false}>
        <cylinderGeometry args={[2.55, 2.75, 0.3, 56]} />
        <meshStandardMaterial color="#08111e" metalness={0.62} roughness={0.46} />
      </mesh>
      <mesh position={[0, -0.44, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <ringGeometry args={[2.76, 2.82, 72]} />
        <meshBasicMaterial color="#2a5c72" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Chassis. */}
      <RoundedBox args={[PANEL_SIZE + 0.5, 0.24, PANEL_SIZE + 0.5]} radius={0.11} smoothness={3} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#101c2c" metalness={0.72} roughness={0.34} />
      </RoundedBox>
      <RoundedBox args={[PANEL_SIZE + 0.12, 0.08, PANEL_SIZE + 0.12]} radius={0.045} smoothness={3} position={[0, 0.17, 0]}>
        <meshStandardMaterial
          color="#04101a"
          metalness={0.5}
          roughness={0.52}
          emissive="#082b33"
          emissiveIntensity={0.55}
        />
      </RoundedBox>

      {/* Edge accents: the panel outline reads clearly from the sky camera. */}
      {[
        { p: [0, 0.18, (PANEL_SIZE + 0.5) / 2] as const, s: [PANEL_SIZE + 0.5, 0.012, 0.012] as const },
        { p: [0, 0.18, -(PANEL_SIZE + 0.5) / 2] as const, s: [PANEL_SIZE + 0.5, 0.012, 0.012] as const },
        { p: [(PANEL_SIZE + 0.5) / 2, 0.18, 0] as const, s: [0.012, 0.012, PANEL_SIZE + 0.5] as const },
        { p: [-(PANEL_SIZE + 0.5) / 2, 0.18, 0] as const, s: [0.012, 0.012, PANEL_SIZE + 0.5] as const },
      ].map((edge, n) => (
        <mesh key={n} position={edge.p as unknown as [number, number, number]} raycast={() => null}>
          <boxGeometry args={edge.s as unknown as [number, number, number]} />
          <meshBasicMaterial color="#3ddbd9" transparent opacity={0.42} toneMapped={false} />
        </mesh>
      ))}

      {/* Four feet, a fixed mast, and no motor anywhere. */}
      {[
        [-1.95, -1.95],
        [1.95, -1.95],
        [-1.95, 1.95],
        [1.95, 1.95],
      ].map(([x, z], n) => (
        <mesh key={n} position={[x, -0.17, z]} raycast={() => null}>
          <cylinderGeometry args={[0.11, 0.14, 0.34, 14]} />
          <meshStandardMaterial color="#0d1a2a" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}

      <ElementLattice />

      {showLabels && view === "beam" && camera === "sky" && (
        <>
          <Html
            position={[0, 0.8, PANEL_SIZE / 2 + 0.35]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="hidden whitespace-nowrap rounded-full border border-white/15 bg-[#040a14]/80 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#9fb3cf] backdrop-blur sm:block">
              Fixed flat panel · 256 elements
            </div>
          </Html>
          <Html
            position={[0, -0.04, -PANEL_SIZE / 2 - 0.7]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="hidden whitespace-nowrap rounded-full border border-signal/25 bg-[#04121a]/80 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-signal/90 backdrop-blur sm:block">
              No moving parts · electronic steering
            </div>
          </Html>
        </>
      )}

      {showLabels && view === "wave" && (
        <Html
          position={[3.3, 0.95, -2.55]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="hidden whitespace-nowrap rounded-full border border-warn/25 bg-[#120d04]/80 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-warn/90 backdrop-blur md:block">
            Phase colour = element phase
          </div>
        </Html>
      )}
    </group>
  );
}

