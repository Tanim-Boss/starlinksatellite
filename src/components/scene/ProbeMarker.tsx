import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { latLonToEarthFixed } from "@/lib/astro";
import { useApp } from "@/store";

const _dir = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);

/** Amber probe pin dropped on Earth in the coverage-overlap scenario. */
export function ProbeMarker() {
  const probe = useApp((s) => s.probe);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const s = 1 + 0.3 * Math.sin(clock.elapsedTime * 3);
    pulseRef.current.scale.setScalar(s);
  });

  if (!probe) return null;
  latLonToEarthFixed(probe.lat, probe.lon, _dir);
  const quat = new THREE.Quaternion().setFromUnitVectors(_UP, _dir.clone().normalize());
  return (
    <group position={_dir.clone()} quaternion={quat}>
      <mesh position={[0, 0.004, 0]}>
        <sphereGeometry args={[0.008, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <mesh ref={pulseRef} rotation-x={-Math.PI / 2} position={[0, 0.0015, 0]}>
        <ringGeometry args={[0.012, 0.021, 28]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.0012, 0.0012, 0.09, 8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
