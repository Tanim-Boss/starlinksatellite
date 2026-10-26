import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  SAT_FOCUS_SCALE,
  SAT_SWARM_SCALE,
  buildStarlinkModel,
  makeSwarmGeometry,
  orientSatelliteMatrix,
  orientSatelliteQuaternion,
  skyFrameState,
} from "./handoverFrame";
import { DataLink } from "./DataLink";
import { handoverClock, useHandoverUI } from "./handoverStore";
import { allPositions, satScenePosition, SKY_TOTAL } from "@/lib/constellation";
import { ELEVATION_MASK_DEG } from "@/lib/handover";
import { makeGlowTexture } from "@/lib/textures";

/* -------------------------------------------------------------------------- */
/* Colour language                                                            */
/* -------------------------------------------------------------------------- */

const COLOR_SERVING = new THREE.Color("#3ddbd9");
const COLOR_CANDIDATE = new THREE.Color("#fbbf24");
const COLOR_RELEASED = new THREE.Color("#60a5fa");
const COLOR_USABLE = new THREE.Color("#cfe3f7");
const COLOR_MASKED = new THREE.Color("#5b6b85");
const COLOR_HIDDEN = new THREE.Color("#2a3648");
const COLOR_LASER = new THREE.Color("#a78bfa");
const COLOR_GATEWAY = new THREE.Color("#fbbf24");

/** Instance tints (multiplied over the model's vertex colours). */
const TINT_RELEASED = new THREE.Color(0.68, 0.8, 1.0);
const TINT_USABLE = new THREE.Color(0.95, 0.97, 1.0);
const TINT_MASKED = new THREE.Color(0.5, 0.56, 0.64);

const SIN_MASK = Math.sin((ELEVATION_MASK_DEG * Math.PI) / 180);
/** Trail length behind each satellite, simulated seconds. */
const TRAIL_SEC = 24;

/**
 * The gateway that carries traffic to the terrestrial internet: a fixed site
 * ~450 km away, south-south-west of the dish, sitting on the Earth's curve.
 */
const GATEWAY_POS = new THREE.Vector3(-0.0298, -0.0025, 0.064);

/* -------------------------------------------------------------------------- */
/* The swarm: every satellite near the dish, as real-looking spacecraft       */
/* -------------------------------------------------------------------------- */

/**
 * Satellites above the horizon are drawn as instanced Starlink models — flat
 * bus, one solar wing, white Ku-array belly facing Earth, laser terminals on
 * the deck — oriented along their velocity vector like the real fleet. One
 * draw call for the whole visible sky.
 */
function SwarmSatellites() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(makeSwarmGeometry, []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.55,
        roughness: 0.42,
      }),
    [],
  );
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, TINT_USABLE); // creates the instanceColor attribute
    if (mesh.instanceColor) mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const st = skyFrameState();
    const { px, py, pz, vx, vy, vz } = allPositions();
    const servingId = st.serving?.id ?? -1;
    const candidateId = st.candidate?.id ?? -1;
    const releasedId = st.releasedLink?.id ?? -1;

    let n = 0;
    for (let i = 0; i < SKY_TOTAL; i++) {
      if (py[i] <= 0.002) continue; // below the horizon — the far fleet draws it
      if (i === servingId || i === candidateId) continue; // drawn as focus models
      orientSatelliteMatrix(matrix, px[i], py[i], pz[i], vx[i], vy[i], vz[i], SAT_SWARM_SCALE);
      mesh.setMatrixAt(n, matrix);

      const r = Math.sqrt(px[i] * px[i] + py[i] * py[i] + pz[i] * pz[i]) || 1;
      const sinEl = py[i] / r;
      if (i === releasedId) tint.copy(TINT_RELEASED);
      else if (sinEl >= SIN_MASK) tint.copy(TINT_USABLE);
      else tint.copy(TINT_MASKED);
      mesh.setColorAt(n, tint);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, SKY_TOTAL]}
      frustumCulled={false}
      raycast={() => null}
    />
  );
}

/**
 * The rest of the shell — spacecraft over the far side of the planet — stays a
 * field of faint dots. From the ground camera they are behind the Earth; from
 * the space camera they show the shell as a shell.
 */
function DistantFleet() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SKY_TOTAL * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1, 0), 3);
    return g;
  }, []);
  const glow = useMemo(() => makeGlowTexture(), []);

  useFrame(() => {
    const st = skyFrameState();
    const { px, py, pz } = allPositions();
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;
    const servingId = st.serving?.id ?? -1;
    const releasedId = st.releasedLink?.id ?? -1;

    let n = 0;
    for (let i = 0; i < SKY_TOTAL; i++) {
      if (py[i] > 0.002) continue; // near side — the swarm draws it
      pa[n * 3] = px[i];
      pa[n * 3 + 1] = py[i];
      pa[n * 3 + 2] = pz[i];
      const c = i === servingId ? COLOR_SERVING : i === releasedId ? COLOR_RELEASED : COLOR_HIDDEN;
      ca[n * 3] = c.r;
      ca[n * 3 + 1] = c.g;
      ca[n * 3 + 2] = c.b;
      n++;
    }
    geometry.setDrawRange(0, n);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points geometry={geometry} raycast={() => null} frustumCulled={false}>
      <pointsMaterial
        map={glow}
        size={0.0032}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Motion trails                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A streak behind every satellite above the horizon, rebuilt each frame. This
 * is what makes the shell read as *moving* the way the real train does: each
 * spacecraft crosses the sky in a few minutes and never hovers.
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
    const st = skyFrameState();
    const show = useHandoverUI.getState().showPaths;
    const t = handoverClock.time;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;

    let w = 0;
    if (show) {
      for (const sat of st.sats) {
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
        const fade = sat.visible ? 1 : 0.45;
        // Tail fades to nothing so the streak has direction.
        ca[w * 6] = c.r * 0.04;
        ca[w * 6 + 1] = c.g * 0.04;
        ca[w * 6 + 2] = c.b * 0.04;
        ca[w * 6 + 3] = c.r * 0.8 * fade;
        ca[w * 6 + 4] = c.g * 0.8 * fade;
        ca[w * 6 + 5] = c.b * 0.8 * fade;
        w++;
      }
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

/** Detailed, role-tinted models for the serving and next-candidate satellites. */
function FocusSatellites() {
  const glow = useMemo(() => makeGlowTexture(), []);
  const models = useMemo(
    () => [buildStarlinkModel(SAT_FOCUS_SCALE), buildStarlinkModel(SAT_FOCUS_SCALE)],
    [],
  );
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const glowRefs = useRef<Array<THREE.Sprite | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const st = skyFrameState();
    const { vx, vy, vz } = allPositions();
    const showLabels = useHandoverUI.getState().showLabels;
    const focus = [st.serving, st.candidate];

    focus.forEach((sat, idx) => {
      const holder = groupRefs.current[idx];
      const model = models[idx];
      const glowSprite = glowRefs.current[idx];
      const label = labelRefs.current[idx];
      if (!holder) return;
      if (!sat) {
        holder.visible = false;
        if (label) label.style.display = "none";
        return;
      }
      holder.visible = true;
      holder.position.set(...sat.position);
      orientSatelliteQuaternion(quat, sat.position[0], sat.position[1], sat.position[2], vx[sat.id], vy[sat.id], vz[sat.id]);
      model.group.quaternion.copy(quat);

      const serving = sat.role === "serving";
      model.tint(serving ? COLOR_SERVING : COLOR_CANDIDATE, serving ? 1.25 : 0.9);

      if (glowSprite) {
        const gm = glowSprite.material as THREE.SpriteMaterial;
        gm.color.copy(serving ? COLOR_SERVING : COLOR_CANDIDATE);
        // The candidate pulses while the terminal is preparing the new link.
        gm.opacity = serving
          ? 0.8
          : 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(handoverClock.time * 5));
      }

      if (label) {
        label.style.display = showLabels ? "block" : "none";
        if (showLabels) {
          const text = serving
            ? `CONNECTED · ${sat.name.replace("STARLINK-", "S-")} · ${sat.elDeg.toFixed(0)}° · ${sat.rangeKm.toFixed(0)} km`
            : `NEXT · ${sat.name.replace("STARLINK-", "S-")} · ${sat.elDeg.toFixed(0)}° ${sat.rising ? "rising" : "falling"}`;
          if (label.textContent !== text) label.textContent = text;
          label.style.color = serving ? "#3ddbd9" : "#fbbf24";
          label.style.borderColor = serving ? "#3ddbd955" : "#fbbf2455";
          label.style.boxShadow = serving ? "0 0 18px -4px rgba(61,219,217,0.8)" : "none";
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
          <primitive object={models[idx].group} />
          <sprite
            scale={[0.021, 0.021, 1]}
            raycast={() => null}
            ref={(el) => {
              glowRefs.current[idx] = el;
            }}
          >
            <spriteMaterial
              map={glow}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.6}
            />
          </sprite>
          <Html position={[0, 0.014, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[7, 0]}>
            <div
              ref={(el) => {
                labelRefs.current[idx] = el;
              }}
              style={{ transform: "translateY(-16px)" }}
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
/* Radio links: dish ↔ satellites, with the data moving along them            */
/* -------------------------------------------------------------------------- */

const _servingPos = new THREE.Vector3();
const _candidatePos = new THREE.Vector3();
const _releasedPos = new THREE.Vector3();

/**
 * Three links can be drawn at once: the serving beam, the candidate being
 * prepared, and the fading beam of a satellite just released. During the
 * transfer the two opacities cross-fade — make-before-break — and packets run
 * on both while the new link takes the traffic.
 */
function SkyDataLinks() {
  const findPos = (id: number | undefined, out: THREE.Vector3) => {
    if (id === undefined || id < 0) return null;
    const { px, py, pz } = allPositions();
    if (py[id] <= -0.05) return null;
    return out.set(px[id], py[id], pz[id]);
  };

  return (
    <>
      <DataLink
        getLink={() => {
          const st = skyFrameState();
          const link = st.current;
          const target = link ? findPos(link.id, _servingPos) : null;
          if (!link || !target) return null;
          return { target, color: COLOR_SERVING, opacity: link.opacity, packets: true };
        }}
      />
      <DataLink
        getLink={() => {
          const st = skyFrameState();
          const link = st.candidateLink;
          const target = link ? findPos(link.id, _candidatePos) : null;
          if (!link || !target) return null;
          const transferring = st.phase === "transfer";
          return {
            target,
            color: COLOR_CANDIDATE,
            opacity: link.opacity,
            // Packets only start flowing on the new link once the transfer is
            // actually underway — before that it is control-plane preparation.
            packets: transferring || link.opacity > 0.55,
          };
        }}
      />
      <DataLink
        getLink={() => {
          const st = skyFrameState();
          const link = st.releasedLink;
          const target = link ? findPos(link.id, _releasedPos) : null;
          if (!link || !target) return null;
          return { target, color: COLOR_RELEASED, opacity: link.opacity * 0.8, packets: false };
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Laser mesh                                                                 */
/* -------------------------------------------------------------------------- */

const LASER_SEGMENTS = 2;
const LASER_PACKETS_PER_SEGMENT = 3;

/**
 * Optical inter-satellite links: from the serving spacecraft to its two
 * nearest neighbours in the shell. This is how traffic can travel without ever
 * touching the ground — violet lines with packets moving along them.
 */
function LaserMeshLinks() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const packetRefs = useRef<Array<THREE.Sprite | null>>([]);
  const glow = useMemo(() => makeGlowTexture(), []);
  const packetMats = useMemo(
    () =>
      Array.from(
        { length: LASER_SEGMENTS * LASER_PACKETS_PER_SEGMENT },
        () =>
          new THREE.SpriteMaterial({
            map: glow,
            color: "#c4b5fd",
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [glow],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(LASER_SEGMENTS * 6), 3),
    );
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);
    return g;
  }, []);

  // Neighbour ids are re-picked a few times a second, not every frame.
  const neighbours = useRef<number[]>([]);
  const lastPick = useRef(Number.NaN);
  const ends = useRef<Float32Array>(new Float32Array(LASER_SEGMENTS * 3));

  useFrame(() => {
    const st = skyFrameState();
    const show = useHandoverUI.getState().showBeams;
    const { px, py, pz } = allPositions();
    const t = handoverClock.time;
    const serving = st.serving;
    const line = lineRef.current;

    if (!show || !serving) {
      if (line) line.visible = false;
      packetRefs.current.forEach((p) => p && (p.visible = false));
      return;
    }

    // Pick the two nearest other satellites above the horizon (throttled).
    if (Math.abs(t - lastPick.current) > 0.25) {
      lastPick.current = t;
      const sx = px[serving.id];
      const sy = py[serving.id];
      const sz = pz[serving.id];
      let best1 = -1;
      let best2 = -1;
      let d1 = Infinity;
      let d2 = Infinity;
      for (const sat of st.sats) {
        if (sat.id === serving.id) continue;
        const dx = px[sat.id] - sx;
        const dy = py[sat.id] - sy;
        const dz = pz[sat.id] - sz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < d1) {
          d2 = d1;
          best2 = best1;
          d1 = d;
          best1 = sat.id;
        } else if (d < d2) {
          d2 = d;
          best2 = sat.id;
        }
      }
      neighbours.current = [best1, best2].filter((i) => i >= 0);
    }

    const ids = neighbours.current;
    const pa = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pa.array as Float32Array;
    let w = 0;
    for (let s = 0; s < LASER_SEGMENTS; s++) {
      const id = ids[s];
      if (id === undefined) continue;
      arr[w * 6] = px[serving.id];
      arr[w * 6 + 1] = py[serving.id];
      arr[w * 6 + 2] = pz[serving.id];
      arr[w * 6 + 3] = px[id];
      arr[w * 6 + 4] = py[id];
      arr[w * 6 + 5] = pz[id];
      ends.current[w * 3] = px[id];
      ends.current[w * 3 + 1] = py[id];
      ends.current[w * 3 + 2] = pz[id];
      w++;
    }
    geometry.setDrawRange(0, w * 2);
    pa.needsUpdate = true;
    if (line) line.visible = w > 0;

    // Packets shuttling along each laser link.
    packetRefs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const seg = Math.floor(i / LASER_PACKETS_PER_SEGMENT);
      const k = i % LASER_PACKETS_PER_SEGMENT;
      if (seg >= w) {
        sprite.visible = false;
        return;
      }
      sprite.visible = true;
      const phase = (t * 0.9 + k / LASER_PACKETS_PER_SEGMENT) % 1;
      sprite.position.set(
        px[serving.id] + (ends.current[seg * 3] - px[serving.id]) * phase,
        py[serving.id] + (ends.current[seg * 3 + 1] - py[serving.id]) * phase,
        pz[serving.id] + (ends.current[seg * 3 + 2] - pz[serving.id]) * phase,
      );
      const m = sprite.material as THREE.SpriteMaterial;
      m.opacity = 0.5 + 0.5 * Math.sin(Math.PI * phase);
    });
  });

  return (
    <group>
      <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false} raycast={() => null}>
        <lineBasicMaterial
          color={COLOR_LASER}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      {packetMats.map((mat, i) => (
        <sprite
          key={i}
          scale={[0.0034, 0.0034, 1]}
          material={mat}
          raycast={() => null}
          ref={(el) => {
            packetRefs.current[i] = el;
          }}
        />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Gateway: where the traffic reaches the terrestrial internet                */
/* -------------------------------------------------------------------------- */

/**
 * A ground gateway station ~450 km away. While a satellite serves the dish it
 * also feeds a gateway (or hands the traffic to one over the laser mesh); this
 * draws that leg so the whole path — dish → sky → fibre — is visible.
 */
function GatewayLink() {
  const groupRef = useRef<THREE.Group>(null);
  const dishRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const satPos = useMemo(() => new THREE.Vector3(), []);
  const toSat = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const upAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    const st = skyFrameState();
    const showLabels = useHandoverUI.getState().showLabels;
    const serving = st.serving;
    if (labelRef.current) labelRef.current.style.display = showLabels ? "block" : "none";
    if (!serving) return;
    const { px, py, pz } = allPositions();
    satPos.set(px[serving.id], py[serving.id], pz[serving.id]);
    // Aim the gateway's dish at whatever satellite is carrying traffic.
    if (dishRef.current) {
      toSat.copy(satPos).sub(GATEWAY_POS).normalize();
      quat.setFromUnitVectors(upAxis, toSat);
      dishRef.current.quaternion.copy(quat);
    }
  });

  return (
    <group ref={groupRef}>
      {/* The station itself */}
      <group position={GATEWAY_POS.toArray()}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0002, 0]} raycast={() => null}>
          <ringGeometry args={[0.0042, 0.0048, 40]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0.0028, 0.0011, 0.0016]} raycast={() => null}>
          <boxGeometry args={[0.0034, 0.0022, 0.0026]} />
          <meshStandardMaterial color="#1c2a3a" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.0016, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.0004, 0.0006, 0.0032, 8]} />
          <meshStandardMaterial color="#3a4a5e" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Tracking dish on the mast — points at the serving satellite */}
        <mesh ref={dishRef} position={[0, 0.0038, 0]} raycast={() => null}>
          <coneGeometry args={[0.0024, 0.0016, 20, 1, true]} />
          <meshStandardMaterial color="#d7e3ea" metalness={0.25} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <Html position={[0, 0.0075, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[4, 0]}>
          <div
            ref={(el) => {
              labelRef.current = el;
            }}
            className="whitespace-nowrap rounded border border-warn/30 bg-[#0b0f18]/85 px-1.5 py-[2px] font-mono text-[8px] uppercase tracking-[0.1em] text-warn/90"
          >
            gateway · fibre → internet
          </div>
        </Html>
      </group>

      {/* Satellite → gateway feed, with packets running down it */}
      <DataLink
        origin={GATEWAY_POS}
        coneBottom={0.0008}
        coneTop={0.0042}
        packetScale={0.004}
        getLink={() => {
          const st = skyFrameState();
          const show = useHandoverUI.getState().showBeams;
          const serving = st.serving;
          if (!show || !serving) return null;
          const { px, py, pz } = allPositions();
          satPos.set(px[serving.id], py[serving.id], pz[serving.id]);
          return {
            target: satPos,
            color: COLOR_GATEWAY,
            opacity: 0.55 + 0.35 * (st.current?.opacity ?? 1),
            packets: true,
            thin: true,
          };
        }}
      />
    </group>
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
      <SwarmSatellites />
      <DistantFleet />
      <SkyTrails />
      <FocusSatellites />
      <SkyDataLinks />
      <LaserMeshLinks />
      <GatewayLink />
      <CompassRing />
    </>
  );
});
