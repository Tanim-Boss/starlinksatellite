import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { colors, stationSize } from "../config";
import { useSimStore } from "../hooks/useSimStore";
import { latLonToEarthFixed } from "../utils/orbit";
import { makeGlowTexture } from "../utils/textures";

const _upY = new THREE.Vector3(0, 1, 0);
const _radial = new THREE.Vector3();

/**
 * The gateway ground station (earth-fixed) and the "Internet" node floating
 * above it. The shared driver calculates its world anchor from the same
 * Earth rotation used by the scene. The internet node terminates the route.
 * Sizes are exaggerated for visibility.
 */
export function GatewayStation() {
  const gateway = useSimStore((s) => s.gateway);
  const glow = useMemo(() => makeGlowTexture(), []);

  const local = useMemo(() => {
    const v = new THREE.Vector3();
    latLonToEarthFixed(gateway.lat, gateway.lon, stationSize.baseRadius, v);
    return v;
  }, [gateway]);

  const orientation = useMemo(() => {
    _radial.copy(local).normalize();
    return new THREE.Quaternion().setFromUnitVectors(_upY, _radial);
  }, [local]);

  useEffect(() => {
    return () => {
      glow.dispose();
    };
  }, [glow]);


  return (
    <group position={[local.x, local.y, local.z]} quaternion={orientation} scale={0.375}>
      {/* Ground station building */}
      <mesh position={[0, 0.006, 0]}>
        <boxGeometry args={[0.016, 0.012, 0.016]} />
        <meshStandardMaterial color="#101826" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Tracking dish on the roof */}
      <mesh position={[0, 0.016, 0]} rotation={[0.7, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.003, 16]} />
        <meshStandardMaterial color="#d8e2ee" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Gateway marker glow */}
      <sprite position={[0, 0.024, 0]} scale={[0.05, 0.05, 1]} raycast={() => null}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>

      {/* The Internet node: a glowing sphere with a halo, high above the gateway */}
      <mesh position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.011, 24, 24]} />
        <meshBasicMaterial color={colors.sat} />
      </mesh>
      <sprite position={[0, 0.09, 0]} scale={[0.09, 0.09, 1]} raycast={() => null}>
        <spriteMaterial map={glow} color={colors.route} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </sprite>
      {/* Faint beam from gateway to the internet node */}
      <mesh position={[0, 0.052, 0]}>
        <cylinderGeometry args={[0.0008, 0.0008, 0.084, 8]} />
        <meshBasicMaterial color={colors.route} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
