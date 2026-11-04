import { useEffect, useRef, type ElementRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { camera as cameraCfg, type CameraMode } from "../config";
import { SATS, sitePositions } from "../hooks/useSimDriver";
import { clampZoom, simState, useSimStore } from "../hooks/useSimStore";
import { groundCameraFrame, satelliteBearing, turnTowardBearing } from "../utils/groundView";
import { satPosition, satVelocity } from "../utils/orbit";
import { useReducedMotion } from "@/lib/useMediaQuery";

const _toPos = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _toUp = new THREE.Vector3();
const _radial = new THREE.Vector3();
const _along = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _satPos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _north = new THREE.Vector3(0, 1, 0);
const _fromDirection = new THREE.Vector3();
const _toDirection = new THREE.Vector3();
const _sweep = new THREE.Quaternion();
const _step = new THREE.Quaternion();
const _aimCamera = new THREE.PerspectiveCamera();

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/**
 * Orbit uses normal OrbitControls. Dish is a ground-level third-person view,
 * keeping the fixed antenna and its linked satellite in frame; Laser follows
 * a spacecraft. Scripted cameras orient themselves explicitly because
 * OrbitControls is disabled in those modes; wheel and pinch adjust the lens.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const followZoom = useRef(cameraCfg.orbitDistance);
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const mode = useSimStore((s) => s.cameraMode);
  const storyActive = useSimStore((s) => s.storyActive);
  const scrollMode = useSimStore((s) => s.scrollMode);
  const reduced = useReducedMotion();
  const lastResetNonce = useRef(simState.resetViewNonce);
  const recentring = useRef(false);
  const bearing = useRef<number | null>(null);

  const trans = useRef({
    active: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    fromUp: new THREE.Vector3(0, 1, 0),
    fromFov: 50,
    toPos: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    toUp: new THREE.Vector3(0, 1, 0),
    toFov: 50,
  });
  const lastMode = useRef(mode);

  useEffect(() => {
    camera.near = 0.001;
    camera.far = 200;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Follow cameras own their pose; zoom their lens instead of letting
  // OrbitControls move the camera (which the next frame would undo).
  useEffect(() => {
    if (mode === "orbit" || scrollMode !== "zoom") return;
    const el = gl.domElement;
    const zoom = (factor: number) => {
      const state = useSimStore.getState();
      state.zoomTo(clampZoom((simState.zoomTarget ?? followZoom.current) * factor));
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1);
      zoom(Math.exp(THREE.MathUtils.clamp(delta * 0.001, -0.5, 0.5)));
    };
    let pinchDistance: number | null = null;
    const touch = (event: TouchEvent) => {
      if (event.touches.length !== 2) { pinchDistance = null; return; }
      event.preventDefault();
      const [a, b] = event.touches;
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinchDistance !== null && distance > 0) zoom(pinchDistance / distance);
      pinchDistance = distance;
    };
    const clear = () => { pinchDistance = null; };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", touch, { passive: false });
    el.addEventListener("touchmove", touch, { passive: false });
    el.addEventListener("touchend", clear);
    el.addEventListener("touchcancel", clear);
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", touch);
      el.removeEventListener("touchmove", touch);
      el.removeEventListener("touchend", clear);
      el.removeEventListener("touchcancel", clear);
    };
  }, [gl, mode, scrollMode]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const controls = controlsRef.current;
    const tr = trans.current;

    if (controls) {
      const el = controls.domElement;
      const wanted = scrollMode === "page" ? "pan-y" : "none";
      if (el && el.style.touchAction !== wanted) el.style.touchAction = wanted;
    }

    if (simState.resetViewNonce !== lastResetNonce.current) {
      lastResetNonce.current = simState.resetViewNonce;
      recentring.current = true;
    }

    if (mode === "dish") {
      const id = simState.connectedSat;
      if (id !== null) satPosition(SATS[id], simState.time, _satPos);
      const wanted = id === null ? null : satelliteBearing(sitePositions.dishGround, _satPos);
      if (bearing.current === null) bearing.current = wanted ?? 0;
      else if (wanted !== null) bearing.current = turnTowardBearing(bearing.current, wanted, dt * 2.5);
    } else {
      bearing.current = null;
    }

    if (lastMode.current !== mode) {
      lastMode.current = mode;
      followZoom.current = cameraCfg.orbitDistance;
      if (mode !== "orbit") simState.cameraDistance = cameraCfg.orbitDistance;
      computeGoal(mode, camera.position, bearing.current ?? 0, _toPos, _toTarget, _toUp);
      tr.fromPos.copy(camera.position);
      tr.fromTarget.copy(controls ? controls.target : _origin);
      tr.fromUp.copy(camera.up);
      tr.fromFov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
      tr.toPos.copy(_toPos);
      tr.toTarget.copy(_toTarget);
      tr.toUp.copy(_toUp);
      tr.toFov = mode === "dish" ? cameraCfg.dishFov : 50;
      tr.active = true;
      tr.t = 0;
    }

    if (tr.active) {
      // Follow the moving destination during the flight instead of arriving
      // at an outdated location. Sweep around Earth rather than through it.
      if (mode !== "orbit") {
        computeGoal(mode, camera.position, bearing.current ?? 0, tr.toPos, tr.toTarget, tr.toUp);
      }
      tr.t = reduced ? 1 : Math.min(1, tr.t + Math.min(rawDt, 0.25) / cameraCfg.transitionS);
      const e = easeInOutCubic(tr.t);
      _fromDirection.copy(tr.fromPos).normalize();
      _toDirection.copy(tr.toPos).normalize();
      _sweep.setFromUnitVectors(_fromDirection, _toDirection);
      _step.identity().slerp(_sweep, e);
      camera.position.copy(_fromDirection).applyQuaternion(_step)
        .multiplyScalar(THREE.MathUtils.lerp(tr.fromPos.length(), tr.toPos.length(), e));
      camera.up.lerpVectors(tr.fromUp, tr.toUp, e).normalize();
      if (controls) {
        controls.target.lerpVectors(tr.fromTarget, tr.toTarget, e);
        camera.lookAt(controls.target);
      }
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(tr.fromFov, tr.toFov, e);
        camera.updateProjectionMatrix();
      }
      if (tr.t >= 1) tr.active = false;
    } else if (mode === "dish" || mode === "laser") {
      computeGoal(mode, camera.position, bearing.current ?? 0, _toPos, _toTarget, _toUp);
      // Anchor the dish camera in the rotating local frame. Smooth only the
      // look direction, so high time speeds cannot leave it inside Earth.
      if (mode === "dish") camera.position.copy(_toPos);
      else camera.position.lerp(_toPos, Math.min(1, dt * 4));
      camera.up.copy(_toUp);
      if (controls) controls.target.copy(_toTarget);
      _aimCamera.position.copy(camera.position);
      _aimCamera.up.copy(camera.up);
      _aimCamera.lookAt(_toTarget);
      camera.quaternion.slerp(_aimCamera.quaternion, Math.min(1, dt * 6));
    } else if (controls) {
      camera.up.copy(_north);
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
          camera.position.copy(controls.target)
            .addScaledVector(_radial.normalize(), arrived ? target : next);
          if (arrived) simState.zoomTarget = null;
        } else {
          simState.zoomTarget = null;
        }
      }
      simState.cameraDistance = camera.position.distanceTo(controls.target);
    }

    if (mode !== "orbit" && !tr.active && camera instanceof THREE.PerspectiveCamera) {
      const target = simState.zoomTarget;
      if (target !== null) {
        followZoom.current = THREE.MathUtils.damp(followZoom.current, target, 7, dt);
        if (Math.abs(followZoom.current - target) < 0.005) {
          followZoom.current = target;
          simState.zoomTarget = null;
        }
      }
      simState.cameraDistance = followZoom.current;
      const baseFov = mode === "dish" ? cameraCfg.dishFov : 50;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
        Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) * followZoom.current / cameraCfg.orbitDistance,
      ));
      camera.updateProjectionMatrix();
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
      onStart={() => { simState.zoomTarget = null; }}
      enabled={false}
    />
  );
}

function computeGoal(
  mode: CameraMode,
  current: THREE.Vector3,
  bearing: number,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
  outUp: THREE.Vector3,
): void {
  if (mode === "orbit") {
    if (current.lengthSq() > 1e-6) outPos.copy(current).normalize().multiplyScalar(cameraCfg.orbitDistance);
    else outPos.set(0, 1.05, cameraCfg.orbitDistance);
    outTarget.set(0, 0, 0);
    outUp.copy(_north);
    return;
  }

  const id = simState.connectedSat;
  if (mode === "dish" || id === null) {
    if (id !== null) satPosition(SATS[id], simState.time, _satPos);
    groundCameraFrame(sitePositions.dishWorld, sitePositions.dishAperture, id === null ? null : _satPos,
      bearing, outPos, outTarget, outUp);
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
  outUp.copy(_radial);
}
