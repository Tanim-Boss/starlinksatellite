// Shared mutable simulation state.
// Updated once per frame by <SimulationDriver /> and read imperatively by the
// scene graph. Kept outside React state on purpose: writing it to a store every
// frame would re-render the whole tree 60 times per second.
export const simClock = {
  /** Simulated seconds since T0. */
  time: 0,
};

export const earthState = {
  /** Earth rotation angle (radians) about its north axis. */
  angle: 0,
};
