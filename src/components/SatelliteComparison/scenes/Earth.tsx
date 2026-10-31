import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { comparisonConfig, earthSceneRadius } from "../config";
import { comparisonClock } from "../hooks/useComparisonStore";
import { makeCloudTexture } from "../utils/textures";

interface EarthTextures {
  day: THREE.Texture | null;
  night: THREE.Texture | null;
  clouds: THREE.Texture | null;
}

const FRESNEL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRESNEL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float rim = pow(1.0 - facing, 3.2);
    float glow = smoothstep(0.0, 0.9, rim) * 0.52;
    gl_FragColor = vec4(uColor * (0.72 + rim), glow);
  }
`;

/** Day map, city lights, drifting cloud shell and a thin fresnel atmosphere. */
export function EarthGlobe() {
  const surfaceRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const atmosphereUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(comparisonConfig.colors.atmosphere) } }),
    [],
  );
  const [textures, setTextures] = useState<EarthTextures>({ day: null, night: null, clouds: null });

  useEffect(() => {
    let alive = true;
    const owned: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    const cloudTexture = makeCloudTexture();
    if (cloudTexture) {
      owned.push(cloudTexture);
      setTextures((current) => ({ ...current, clouds: cloudTexture }));
    }

    const loadTexture = (url: string, key: "day" | "night") => {
      loader.load(
        url,
        (texture) => {
          if (!alive) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          owned.push(texture);
          setTextures((current) => ({ ...current, [key]: texture }));
        },
        undefined,
        () => {
          // Keep the fallback globe if an optional local texture was removed.
        },
      );
    };

    loadTexture(comparisonConfig.textures.day, "day");
    loadTexture(comparisonConfig.textures.night, "night");
    return () => {
      alive = false;
      owned.forEach((texture) => texture.dispose());
    };
  }, []);

  useFrame(() => {
    const rotation = comparisonClock.simTime * ((Math.PI * 2) / comparisonConfig.earthRotationPeriodS);
    if (surfaceRef.current) surfaceRef.current.rotation.y = rotation;
    if (cloudRef.current) cloudRef.current.rotation.y = rotation * 1.025;
  });

  return (
    <group>
      <group ref={surfaceRef}>
        <mesh>
          <sphereGeometry args={[earthSceneRadius, 96, 72]} />
          <meshStandardMaterial
            map={textures.day ?? undefined}
            color={textures.day ? "#ffffff" : "#123149"}
            emissiveMap={textures.night ?? undefined}
            emissive={textures.night ? "#ffffff" : "#000000"}
            emissiveIntensity={textures.night ? 0.34 : 0}
            roughness={0.88}
            metalness={0}
          />
        </mesh>
      </group>
      {textures.clouds && (
        <group ref={cloudRef}>
          <mesh scale={1.008}>
            <sphereGeometry args={[earthSceneRadius, 64, 48]} />
            <meshLambertMaterial
              map={textures.clouds}
              color="#cddbeb"
              transparent
              opacity={0.16}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      <mesh scale={1.045} raycast={() => null}>
        <sphereGeometry args={[earthSceneRadius, 48, 48]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={FRESNEL_VERTEX}
          fragmentShader={FRESNEL_FRAGMENT}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
