import { useEffect, useRef, type ElementRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { camera as cameraCfg } from "../config";
import { SATS, sitePositions } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { satPosition, satVelocity } from "../utils/orbit";
import { useReducedMotion } from "@/lib/useMediaQuery";

const _fromPos = new THREE.Vector3();
const _toPos = new THREE.Vector3();
const _fromTarget = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _radial = new THREE.Vector3();
const _along = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _satPos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _origin = new THREE.Vector3(0, 0, 0);

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/**
 * The three camera modes, with ~1.5 s eased transitions between them:
 *
 *  - Orbit View: whole Earth, OrbitControls with damping, zoom limits and a
 *    slow auto-rotate while idle. Drag rotates, the mouse wheel / pinch /
 *    zoom buttons and slider dolly between `orbitMin` and `orbitMax`, and
 *    "Reset view" frames the whole planet again. When the visitor picks
 *    "Page scroll" the wheel is handed back to the page instead.
 *  - Dish View: first-person above the dish, looking up at the sky.
 *  - Laser View: cinematic fly-along beside the dish-connected satellite.
 *
 * Controls are enabled only in Orbit View; during a transition the camera
 * lerps position and target under the rig's own control.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const mode = useSimStore((s) => s.cameraMode);
  const storyActive = useSimStore((s) => s.storyActive);
  const scrollMode = useSimStore((s) => s.scrollMode);
  const reduced = useReducedMotion();
  const lastResetNonce = useRef(simState.resetViewNonce);
  const recentring = useRef(false);
  const interactWired = useRef(false);

  const trans = useRef({
    active: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });
  const lastMode = useRef(mode);

  // Keep the default camera frustum sane for the close-up modes.
  useEffect(() => {
    camera.near = 0.02;
    camera.far = 200;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    const tr = trans.current;

    // A direct grab (drag / wheel / pinch) cancels any button-driven dolly,
    // so the visitor's input always wins over an in-flight zoom animation.
    if (controls && !interactWired.current) {
      interactWired.current = true;
      controls.addEventListener("start", () => {
        simState.zoomTarget = null;
      });
    }
    // OrbitControls forces `touch-action: none` on connect; in page-scroll
    // mode hand vertical touch scrolling back to the page.
    if (controls) {
      const el = controls.domElement;
      const wanted = scrollMode === "page" ? "pan-y" : "none";
      if (el && el.style.touchAction !== wanted) el.style.touchAction = wanted;
    }

    // "Reset / full view": recenter on Earth while the dolly below restores
    // the default framing distance.
    if (simState.resetViewNonce !== lastResetNonce.current) {
      lastResetNonce.current = simState.resetViewNonce;
      recentring.current = true;
    }

    if (lastMode.current !== mode) {
      lastMode.current = mode;
      computeGoal(mode, camera.position, _toPos, _toTarget);
      _fromPos.copy(camera.position);
      _fromTarget.copy(controls ? controls.target : _origin);
      tr.fromPos.copy(_fromPos);
      tr.toPos.copy(_toPos);
      tr.fromTarget.copy(_fromTarget);
      tr.toTarget.copy(_toTarget);
      tr.active = true;
      tr.t = 0;
    }

    if (tr.active) {
      tr.t = Math.min(1, tr.t + dt / cameraCfg.transitionS);
      const e = easeInOutCubic(tr.t);
      camera.position.lerpVectors(tr.fromPos, tr.toPos, e);
      if (controls) controls.target.lerpVectors(tr.fromTarget, tr.toTarget, e);
      if (tr.t >= 1) tr.active = false;
    } else if (mode === "dish" || mode === "laser") {
      // Follow modes keep the camera locked to their subject.
      computeGoal(mode, camera.position, _toPos, _toTarget);
      camera.position.lerp(_toPos, Math.min(1, dt * 4));
      if (controls) controls.target.lerp(_toTarget, Math.min(1, dt * 4));
    } else if (controls) {
      // Orbit view: apply any pending button/slider zoom as a smooth dolly
      // along the current view direction, then let OrbitControls damp.
      if (recentring.current) {
        controls.target.lerp(_origin, Math.min(1, dt * 5));
        if (controls.target.length() < 0.002) {
          controls.target.copy(_origin);
          recentring.current = false;
        }
      }
      const target = simState.zoomTarget;
      if (target !== null) {
        _radial.copy(camera.position).sub(controls.target);
        const dist = _radial.length();
        if (dist > 1e-6) {
          const next = THREE.MathUtils.damp(dist, target, 7, dt);
          const arrived = Math.abs(next - target) < 0.005;
          camera.position
            .copy(controls.target)
            .addScaledVector(_radial.normalize(), arrived ? target : next);
          if (arrived) simState.zoomTarget = null;
        } else {
          simState.zoomTarget = null;
        }
      }
      controls.update();
    }

    // Publish the live distance so the zoom slider / readout stay in sync
    // with wheel, pinch and drag zooms — not just the buttons.
    if (controls) {
      simState.cameraDistance = camera.position.distanceTo(controls.target);
    }

    if (controls) controls.enabled = mode === "orbit" && !tr.active;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      panSpeed={0.6}
      rotateSpeed={0.55}
      zoomSpeed={0.9}
      enableZoom={scrollMode === "zoom"}
      minDistance={cameraCfg.orbitMin}
      maxDistance={cameraCfg.orbitMax}
      autoRotate={mode === "orbit" && !storyActive && !reduced}
      autoRotateSpeed={0.35}
      enabled={false}
    />
  );
}

/** Computes the camera goal for a mode. */
function computeGoal(
  mode: "orbit" | "dish" | "laser",
  current: THREE.Vector3,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  if (mode === "orbit") {
    // Keep the current viewing direction, framed at the orbit distance.
    if (current.lengthSq() > 1e-6) {
      outPos.copy(current).normalize().multiplyScalar(cameraCfg.orbitDistance);
    } else {
      outPos.set(0, 1.4, cameraCfg.orbitDistance);
    }
    outTarget.set(0, 0, 0);
    return;
  }

  if (mode === "dish") {
    _radial.copy(sitePositions.dishWorld).normalize();
    outPos.copy(sitePositions.dishAperture).addScaledVector(_radial, cameraCfg.dishOffset);
    outTarget.copy(sitePositions.dishAperture).addScaledVector(_radial, 0.5);
    return;
  }

  // Laser view: fly along beside the dish-connected satellite.
  const id = simState.connectedSat;
  if (id === null) {
    // No link yet: drift above the dish instead of snapping to the origin.
    _radial.copy(sitePositions.dishWorld).normalize();
    outPos.copy(sitePositions.dishAperture).addScaledVector(_radial, cameraCfg.laserOffset);
    outTarget.copy(sitePositions.dishAperture).addScaledVector(_radial, 0.5);
    return;
  }
  const sat = SATS[id];
  satPosition(sat, simState.time, _satPos);
  satVelocity(sat, simState.time, _vel);
  _along.copy(_vel).normalize();
  _radial.copy(_satPos).normalize();
  _perp.crossVectors(_along, _radial).normalize();
  outPos.copy(_satPos).addScaledVector(_perp, cameraCfg.laserOffset);
  outTarget.copy(_satPos).addScaledVector(_along, 0.4);
}
