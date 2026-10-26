import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BEAM_ORIGIN, UP } from "./handoverFrame";
import { handoverClock } from "./handoverStore";
import { makeGlowTexture } from "@/lib/textures";

/**
 * One radio link between the dish and a satellite, drawn the way the data
 * actually moves:
 *
 *  - a Ku-band beam cone that widens from the panel toward the spacecraft;
 *  - cyan packets climbing the uplink (your traffic leaving the dish);
 *  - amber packets falling the downlink (the reply coming back).
 *
 * Everything is driven by a `getLink()` callback sampled each frame, so the
 * parent decides which satellite this link points at and how opaque it is —
 * including the make-before-break cross-fade during a handover.
 */

export interface LinkSample {
  /** Satellite end of the link, scene units. Null hides the whole link. */
  target: THREE.Vector3 | null;
  /** Optional moving origin (defaults to the dish's beam origin). */
  origin?: THREE.Vector3;
  /** Role colour of the beam. */
  color: THREE.ColorRepresentation;
  /** 0..1 master opacity (cross-fades during transfer). */
  opacity: number;
  /** Draw the packet flow (off for a link that was just released). */
  packets?: boolean;
  /** Narrower cone for satellite-to-ground/satellite links. */
  thin?: boolean;
}

const PACKET_COUNT = 5;
/** Simulated seconds for one packet to cross the link. */
const PACKET_CROSS_SEC = 1.1;
const UP_COLOR = "#7df3e8";
const DOWN_COLOR = "#f6ba68";

interface DataLinkProps {
  getLink: () => LinkSample | null;
  origin?: THREE.Vector3;
  /** Beam radius at the dish and at the satellite, scene units. */
  coneBottom?: number;
  coneTop?: number;
  packetScale?: number;
}

export function DataLink({
  getLink,
  origin = BEAM_ORIGIN,
  coneBottom = 0.0011,
  coneTop = 0.0055,
  packetScale = 0.005,
}: DataLinkProps) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const coneRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const upRefs = useRef<Array<THREE.Sprite | null>>([]);
  const downRefs = useRef<Array<THREE.Sprite | null>>([]);

  // Unit cylinder, wide at +Y (satellite end), narrow at -Y (dish end).
  const coneGeo = useMemo(
    () => new THREE.CylinderGeometry(coneTop, coneBottom, 1, 14, 1, true),
    [coneTop, coneBottom],
  );
  const coneMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#3ddbd9",
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#3ddbd9",
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const upMats = useMemo(
    () =>
      Array.from(
        { length: PACKET_COUNT },
        () =>
          new THREE.SpriteMaterial({
            map: glow,
            color: UP_COLOR,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [glow],
  );
  const downMats = useMemo(
    () =>
      Array.from(
        { length: PACKET_COUNT },
        () =>
          new THREE.SpriteMaterial({
            map: glow,
            color: DOWN_COLOR,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [glow],
  );

  const dir = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const link = getLink();
    const visible = !!link && !!link.target && link.opacity > 0.015;
    if (coneRef.current) coneRef.current.visible = visible;
    if (haloRef.current) haloRef.current.visible = visible;
    const showPackets = visible && link!.packets !== false && link!.opacity > 0.12;
    upRefs.current.forEach((s) => s && (s.visible = showPackets));
    downRefs.current.forEach((s) => s && (s.visible = showPackets));
    if (!visible || !link || !link.target) return;

    const from = link.origin ?? origin;
    const thinScale = link.thin ? 0.35 : 1;
    target.copy(link.target);
    dir.copy(target).sub(from);
    const length = dir.length();
    if (length < 1e-6) return;
    dir.normalize();
    mid.copy(from).addScaledVector(dir, length / 2);

    // A horizontal-ish perpendicular for the packet lane offset.
    side.crossVectors(dir, UP);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    side.normalize().multiplyScalar(0.0016 * thinScale);

    const cone = coneRef.current!;
    cone.position.copy(mid);
    cone.quaternion.setFromUnitVectors(UP, dir);
    cone.scale.set(thinScale, length, thinScale);
    const halo = haloRef.current!;
    halo.position.copy(mid);
    halo.quaternion.copy(cone.quaternion);
    halo.scale.set(2.4 * thinScale, length, 2.4 * thinScale);

    color.set(link.color);
    coneMat.color.copy(color);
    haloMat.color.copy(color);
    coneMat.opacity = 0.5 * link.opacity;
    haloMat.opacity = 0.11 * link.opacity;

    if (!showPackets) return;
    const t = handoverClock.time / PACKET_CROSS_SEC;
    for (let k = 0; k < PACKET_COUNT; k++) {
      const pUp = (t + k / PACKET_COUNT) % 1;
      const pDown = (t + 0.5 + k / PACKET_COUNT) % 1;
      const up = upRefs.current[k];
      const down = downRefs.current[k];
      if (up) {
        up.position.copy(from).addScaledVector(dir, length * pUp).add(side);
        const m = up.material as THREE.SpriteMaterial;
        m.opacity = link.opacity * (0.25 + 0.75 * Math.sin(Math.PI * pUp));
      }
      if (down) {
        down.position.copy(from).addScaledVector(dir, length * (1 - pDown)).sub(side);
        const m = down.material as THREE.SpriteMaterial;
        m.opacity = link.opacity * (0.25 + 0.75 * Math.sin(Math.PI * pDown));
      }
    }
  });

  return (
    <group>
      <mesh ref={haloRef} geometry={coneGeo} material={haloMat} raycast={() => null} />
      <mesh ref={coneRef} geometry={coneGeo} material={coneMat} raycast={() => null} />
      {upMats.map((mat, k) => (
        <sprite
          key={`u${k}`}
          scale={[packetScale, packetScale, 1]}
          raycast={() => null}
          material={mat}
          ref={(el) => {
            upRefs.current[k] = el;
          }}
        />
      ))}
      {downMats.map((mat, k) => (
        <sprite
          key={`d${k}`}
          scale={[packetScale * 0.9, packetScale * 0.9, 1]}
          raycast={() => null}
          material={mat}
          ref={(el) => {
            downRefs.current[k] = el;
          }}
        />
      ))}
    </group>
  );
}
