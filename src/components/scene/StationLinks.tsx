import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  GATEWAYS,
  GATEWAY_MIN_ELEVATION_DEG,
  SATS,
  earthFixedToWorld,
  latLonToEarthFixed,
  satPosition,
} from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";

const MIN_ELEV = THREE.MathUtils.degToRad(GATEWAY_MIN_ELEVATION_DEG);

const _gwFixed = new THREE.Vector3();
const _gwWorld = new THREE.Vector3();
const _up = new THREE.Vector3();
const _satPos = new THREE.Vector3();
const _toSat = new THREE.Vector3();
const _pulse = new THREE.Vector3();

/**
 * Signal beams between ground gateways and the highest-elevation satellite
 * each station can see. Link targets are re-evaluated periodically; the small
 * pulses travelling along the beams visualise data flowing to/from space.
 */
export function StationLinks() {
  const visible = useApp((s) => s.toggles.beams);
  const accRef = useRef(0);
  const linkRef = useRef<number[]>(new Array(GATEWAYS.length).fill(-1));

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GATEWAYS.length * 2 * 3), 3));
    return g;
  }, []);

  const pulseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GATEWAYS.length * 3), 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!visible) return;
    accRef.current += dt;
    const recompute = accRef.current >= 0.12;
    if (recompute) accRef.current = 0;
    const t = simClock.time;

    const pos = lineGeo.attributes.position as THREE.BufferAttribute;
    const pulsePos = pulseGeo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < GATEWAYS.length; i++) {
      const gw = GATEWAYS[i];
      latLonToEarthFixed(gw.lat, gw.lon, _gwFixed);
      earthFixedToWorld(_gwFixed, _gwWorld);
      _up.copy(_gwWorld).normalize();

      if (recompute) {
        let best = -1;
        let bestElev = MIN_ELEV;
        for (let j = 0; j < SATS.length; j++) {
          satPosition(SATS[j], t, _satPos);
          _toSat.subVectors(_satPos, _gwWorld);
          const dist = _toSat.length();
          if (dist < 1e-6) continue;
          _toSat.divideScalar(dist);
          const elev = Math.asin(THREE.MathUtils.clamp(_toSat.dot(_up), -1, 1));
          if (elev > bestElev) {
            bestElev = elev;
            best = j;
          }
        }
        linkRef.current[i] = best;
      }

      const best = linkRef.current[i];
      if (best >= 0) {
        satPosition(SATS[best], t, _satPos);
        pos.setXYZ(i * 2, _gwWorld.x, _gwWorld.y, _gwWorld.z);
        pos.setXYZ(i * 2 + 1, _satPos.x, _satPos.y, _satPos.z);
        const phase = ((t * 0.35) % 1 + 1) % 1;
        _pulse.copy(_gwWorld).lerp(_satPos, phase);
        pulsePos.setXYZ(i, _pulse.x, _pulse.y, _pulse.z);
      } else {
        pos.setXYZ(i * 2, _gwWorld.x, _gwWorld.y, _gwWorld.z);
        pos.setXYZ(i * 2 + 1, _gwWorld.x, _gwWorld.y, _gwWorld.z);
        pulsePos.setXYZ(i, _gwWorld.x, _gwWorld.y, _gwWorld.z);
      }
    }
    pos.needsUpdate = true;
    pulsePos.needsUpdate = true;
  });

  if (!visible) return null;
  return (
    <group>
      <lineSegments geometry={lineGeo} frustumCulled={false} raycast={() => null}>
        <lineBasicMaterial
          color="#a3e635"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points geometry={pulseGeo} frustumCulled={false} raycast={() => null}>
        <pointsMaterial
          color="#d9f99d"
          size={0.016}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
