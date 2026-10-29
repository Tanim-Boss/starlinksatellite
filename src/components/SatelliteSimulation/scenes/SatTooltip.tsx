import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SATS } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { satPosition } from "../utils/orbit";
import { makeTooltipTexture } from "../utils/textures";

const _pos = new THREE.Vector3();

/**
 * Billboard tooltip over the hovered satellite: ID, altitude, speed and
 * link count. Renders as a THREE.Sprite so it always faces the camera and
 * needs no DOM projection. The map is regenerated only when the selected
 * satellite changes.
 */
export function SatTooltip() {
  const spriteRef = useRef<THREE.Sprite>(null);
  const prevMap = useRef<THREE.Texture | null>(null);
  const selected = useSimStore((s) => s.selectedSat);
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (selected === null) {
      setMap(null);
      return;
    }
    const next = makeTooltipTexture(selected);
    setMap(next);
    // Release the previous card; the maker caches by sat id, so only the
    // outgoing texture needs disposing.
    if (prevMap.current && prevMap.current !== next) prevMap.current.dispose();
    prevMap.current = next;
  }, [selected]);

  useEffect(() => {
    return () => {
      if (map) map.dispose();
    };
  }, [map]);

  useFrame(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    if (selected === null || !map) {
      sprite.visible = false;
      return;
    }
    satPosition(SATS[selected], simState.time, _pos);
    sprite.position.copy(_pos).addScaledVector(_pos.clone().normalize(), 0.025);
    sprite.visible = true;
  });

  return (
    <sprite ref={spriteRef} scale={[0.17, 0.075, 1]} visible={false} raycast={() => null}>
      <spriteMaterial map={map ?? undefined} transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}
