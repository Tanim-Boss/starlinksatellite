import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BEAM_ORIGIN, UP, makeSatelliteGeometry } from "./handoverFrame";
import { handoverClock, useHandoverUI } from "./handoverStore";
import { allPositions, sampleSky, satScenePosition, SKY_TOTAL } from "@/lib/constellation";
import { ELEVATION_MASK_DEG } from "@/lib/handover";
import { makeGlowTexture } from "@/lib/textures";

const GLOW_TEXTURE = makeGlowTexture();

const COLOR_SERVING = new THREE.Color("#3ddbd9");
const COLOR_CANDIDATE = new THREE.Color("#fbbf24");
const COLOR_RELEASED = new THREE.Color("#60a5fa");
const COLOR_USABLE = new THREE.Color("#cfe3f7");
const COLOR_MASKED = new THREE.Color("#5b6b85");
const COLOR_HIDDEN = new THREE.Color("#2a3648");

const SIN_MASK = Math.sin((ELEVATION_MASK_DEG * Math.PI) / 180);
/** Trail length behind each satellite, simulated seconds. */
const TRAIL_SEC = 14;

/* -------------------------------------------------------------------------- */
/* The fleet                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * All 1,584 satellites as one Points cloud. Positions are read straight from
 * the constellation's scratch buffers (already computed for this frame), so the
 * whole shell costs one attribute upload per frame.
 */
function ConstellationFleet() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 3), 3));
    // Keep the cloud from being frustum-culled: it always straddles the globe.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1, 0), 3);
    return g;
  }, []);

  useFrame(() => {
    // Sample the live clock (not the cached frame state) so the position
    // buffers are guaranteed to match this exact instant.
    const st = sampleSky(handoverClock.time);
    const { px, py, pz } = allPositions();
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;

    const serving = st.current?.id ?? -1;
    const candidate = st.candidateLink?.id ?? -1;
    const released = st.releasedLink?.id ?? -1;

    for (let i = 0; i < SKY_TOTAL; i++) {
      const x = px[i];
      const y = py[i];
      const z = pz[i];
      pa[i * 3] = x;
      pa[i * 3 + 1] = y;
      pa[i * 3 + 2] = z;

      const r = Math.sqrt(x * x + y * y + z * z) || 1;
      const sinEl = y / r;
      let c = COLOR_HIDDEN;
      if (i === serving) c = COLOR_SERVING;
      else if (i === candidate) c = COLOR_CANDIDATE;
      else if (i === released) c = COLOR_RELEASED;
      else if (sinEl >= SIN_MASK) c = COLOR_USABLE;
      else if (sinEl >= 0) c = COLOR_MASKED;
      else c = COLOR_HIDDEN;
      ca[i * 3] = c.r;
      ca[i * 3 + 1] = c.g;
      ca[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points geometry={geometry} raycast={() => null} frustumCulled={false}>
      <pointsMaterial
        map={GLOW_TEXTURE}
        size={0.0026}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.95}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Motion trails                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A short streak behind every satellite above the horizon, rebuilt each frame.
 * This is what makes the shell read as *moving* rather than as a field of dots.
 */
function SkyTrails() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 6), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1, 0), 3);
    return g;
  }, []);

  useFrame(() => {
    const st = sampleSky(handoverClock.time);
    const show = useHandoverUI.getState().showPaths;
    const t = handoverClock.time;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;
    pa.fill(0);
    ca.fill(0);

    let w = 0;
    for (const sat of st.sats) {
      if (!show) break;
      if (w >= SKY_TOTAL - 1) break;
      const head = sat.position;
      const tail = satScenePosition(sat.id, t - TRAIL_SEC);
      pa[w * 6] = tail[0];
      pa[w * 6 + 1] = tail[1];
      pa[w * 6 + 2] = tail[2];
      pa[w * 6 + 3] = head[0];
      pa[w * 6 + 4] = head[1];
      pa[w * 6 + 5] = head[2];

      const c =
        sat.role === "serving"
          ? COLOR_SERVING
          : sat.role === "candidate"
            ? COLOR_CANDIDATE
            : sat.role === "released"
              ? COLOR_RELEASED
              : sat.visible
                ? COLOR_USABLE
                : COLOR_MASKED;
      const fade = sat.visible ? 1 : 0.5;
      // Tail fades to nothing so the streak has direction.
      ca[w * 6] = c.r * 0.05;
      ca[w * 6 + 1] = c.g * 0.05;
      ca[w * 6 + 2] = c.b * 0.05;
      ca[w * 6 + 3] = c.r * 0.75 * fade;
      ca[w * 6 + 4] = c.g * 0.75 * fade;
      ca[w * 6 + 5] = c.b * 0.75 * fade;
      w++;
    }
    geometry.setDrawRange(0, w * 2);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false} raycast={() => null}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}

/* -------------------------------------------------------------------------- */
/* The two satellites that matter                                             */
/* -------------------------------------------------------------------------- */

/** Highlighted models for the serving and next-candidate satellites. */
function FocusSatellites() {
  const geometry = useMemo(makeSatelliteGeometry, []);
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const glowRefs = useRef<Array<THREE.Sprite | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const materials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: "#3ddbd9",
        metalness: 0.45,
        roughness: 0.4,
        emissive: new THREE.Color("#1b4a57"),
        emissiveIntensity: 1,
      }),
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        metalness: 0.4,
        roughness: 0.45,
        emissive: new THREE.Color("#5a3b05"),
        emissiveIntensity: 0.9,
      }),
    ],
    [],
  );
  const scratch = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const st = sampleSky(handoverClock.time);
    const showLabels = useHandoverUI.getState().showLabels;
    const focus = [st.serving, st.candidate];

    focus.forEach((sat, idx) => {
      const group = groupRefs.current[idx];
      const glow = glowRefs.current[idx];
      const label = labelRefs.current[idx];
      if (!group) return;
      if (!sat) {
        group.visible = false;
        if (label) label.style.display = "none";
        return;
      }
      group.visible = true;
      group.position.set(...sat.position);
      const scale = sat.role === "serving" ? 1 : 0.78;
      group.scale.setScalar(scale);
      const color = sat.role === "serving" ? COLOR_SERVING : COLOR_CANDIDATE;
      const mat = materials[idx];
      scratch.copy(color);
      if (mat.emissive) mat.emissive.copy(scratch).multiplyScalar(0.35);

      if (glow) {
        const gm = glow.material as THREE.SpriteMaterial;
        gm.color.copy(color);
        gm.opacity = sat.role === "serving" ? 0.85 : 0.5;
      }

      if (label) {
        const visible = showLabels;
        label.style.display = visible ? "block" : "none";
        if (visible) {
          const text = `${sat.name} · ${sat.elDeg.toFixed(0)}°`;
          if (label.textContent !== text) label.textContent = text;
          label.style.color = sat.role === "serving" ? "#3ddbd9" : "#fbbf24";
          label.style.borderColor = sat.role === "serving" ? "#3ddbd955" : "#fbbf2455";
        }
      }
    });
  });

  return (
    <>
      {[0, 1].map((idx) => (
        <group
          key={idx}
          ref={(el) => {
            groupRefs.current[idx] = el;
          }}
        >
          <mesh geometry={geometry} material={materials[idx]} raycast={() => null} />
          <sprite
            scale={[0.016, 0.016, 1]}
            raycast={() => null}
            ref={(el) => {
              glowRefs.current[idx] = el;
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
          <Html position={[0, 0.011, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[7, 0]}>
            <div
              ref={(el) => {
                labelRefs.current[idx] = el;
              }}
              style={{ transform: "translateY(-15px)" }}
              className="whitespace-nowrap rounded-full border bg-[#040a14]/85 px-1.5 py-[2px] font-mono text-[9px] tracking-[0.06em]"
            >
              SAT
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Beams                                                                      */
/* -------------------------------------------------------------------------- */

interface BeamMaterialSet {
  core: THREE.MeshBasicMaterial;
  halo: THREE.MeshBasicMaterial;
}

/**
 * Three links can be drawn at once: the serving beam, the candidate being
 * prepared, and the fading beam of a satellite just released. During the
 * transfer the serving and candidate opacities cross-fade, which is the
 * make-before-break moment the whole lab is about.
 */
function SkyBeams() {
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), []);
  const coreRefs = useRef<Array<THREE.Mesh | null>>([]);
  const haloRefs = useRef<Array<THREE.Mesh | null>>([]);
  const materials = useMemo<BeamMaterialSet[]>(
    () =>
      [0, 1, 2].map(() => ({
        core: new THREE.MeshBasicMaterial({
          color: "#3ddbd9",
          transparent: true,
          opacity: 0.85,
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

  const target = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const st = sampleSky(handoverClock.time);
    const show = useHandoverUI.getState().showBeams;
    const links = [st.current, st.candidateLink, st.releasedLink];

    links.forEach((link, idx) => {
      const core = coreRefs.current[idx];
      const halo = haloRefs.current[idx];
      if (!core || !halo) return;
      const sat = link ? st.sats.find((s) => s.id === link.id) : null;
      const opacity = link ? link.opacity : 0;
      const visible = show && !!sat && opacity > 0.01;
      core.visible = visible;
      halo.visible = visible;
      if (!sat || !visible) return;

      target.set(...sat.position);
      dir.copy(target).sub(BEAM_ORIGIN);
      const length = dir.length();
      dir.normalize();
      mid.copy(BEAM_ORIGIN).addScaledVector(dir, length / 2);

      core.position.copy(mid);
      core.quaternion.setFromUnitVectors(UP, dir);
      core.scale.set(0.00075, length, 0.00075);
      halo.position.copy(mid);
      halo.quaternion.copy(core.quaternion);
      halo.scale.set(0.0034, length, 0.0034);

      const color =
        link!.kind === "serving" ? COLOR_SERVING : link!.kind === "candidate" ? COLOR_CANDIDATE : COLOR_RELEASED;
      const mat = materials[idx];
      mat.core.color.copy(color);
      mat.halo.color.copy(color);
      mat.core.opacity = 0.8 * opacity;
      mat.halo.opacity = 0.16 * opacity;
      // The transfer cross-fade is a little brighter so it reads on camera.
      if (st.phase === "transfer") mat.halo.opacity *= 1.6;
    });
  });

  return (
    <>
      {[0, 1, 2].map((idx) => (
        <group key={idx}>
          <mesh
            ref={(el) => {
              haloRefs.current[idx] = el;
            }}
            geometry={geometry}
            material={materials[idx].halo}
            raycast={() => null}
          />
          <mesh
            ref={(el) => {
              coreRefs.current[idx] = el;
            }}
            geometry={geometry}
            material={materials[idx].core}
            raycast={() => null}
          />
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Horizon orientation                                                        */
/* -------------------------------------------------------------------------- */

const HORIZON_LABELS: { text: string; pos: [number, number, number] }[] = [
  { text: "N", pos: [0, 0.004, -0.135] },
  { text: "E", pos: [0.135, 0.004, 0] },
  { text: "S", pos: [0, 0.004, 0.135] },
  { text: "W", pos: [-0.135, 0.004, 0] },
];

/** N/E/S/W markers, so the ground view has a compass. */
function CompassRing() {
  const show = useHandoverUI((s) => s.showLabels);
  if (!show) return null;
  return (
    <>
      {HORIZON_LABELS.map((h) => (
        <Html
          key={h.text}
          position={h.pos}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[4, 0]}
        >
          <div className="font-mono text-[10px] tracking-[0.1em] text-signal/45">{h.text}</div>
        </Html>
      ))}
    </>
  );
}

export const SkyLayer = memo(function SkyLayer() {
  return (
    <>
      <ConstellationFleet />
      <SkyTrails />
      <FocusSatellites />
      <SkyBeams />
      <CompassRing />
    </>
  );
});
