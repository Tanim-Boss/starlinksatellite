import { OrbitControls } from "@react-three/drei";
import { useApp } from "@/store";
import { Environment } from "./scene/Environment";
import { EarthAssembly } from "./scene/Earth";
import { OrbitRings } from "./scene/OrbitRings";
import { Satellites } from "./scene/Satellites";
import { LaserLinks } from "./scene/LaserLinks";
import { CoverageCaps } from "./scene/CoverageCaps";
import { GroundStations } from "./scene/GroundStations";
import { ProbeMarker } from "./scene/ProbeMarker";
import { SelectedGroundTrack } from "./scene/SelectedGroundTrack";
import { SelectedViz } from "./scene/SelectedViz";
import { StationLinks } from "./scene/StationLinks";
import { CameraRig } from "./scene/CameraRig";
import { SimulationDriver } from "./scene/SimulationDriver";

export function Scene() {
  const autoRotate = useApp((s) => s.toggles.autoRotate);

  return (
    <>
      <color attach="background" args={["#010409"]} />
      <ambientLight intensity={0.08} />
      {/* "Sun" light — matches the sun glow sprite direction in Environment */}
      <directionalLight position={[14, 7, 10]} intensity={2.8} />

      <SimulationDriver />
      <Environment />
      <OrbitRings />

      <EarthAssembly>
        <GroundStations />
        <ProbeMarker />
        <SelectedGroundTrack />
      </EarthAssembly>

      <Satellites />
      <CoverageCaps />
      <StationLinks />
      <LaserLinks />
      <SelectedViz />
      <CameraRig />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.09}
        maxDistance={60}
        enableDamping
        dampingFactor={0.07}
        autoRotate={autoRotate}
        autoRotateSpeed={0.7}
        onStart={() => useApp.getState().focusCamera(null)}
      />
    </>
  );
}
