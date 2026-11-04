# Orbital Learning Lab — satellite simulation & computer network lab

An interactive teaching site with two projects behind one home menu
(`#/`):

1. **Satellite simulation project** — an independent, interactive field guide
   comparing a traditional TV broadcast satellite with the Starlink
   constellation. Its landing page (`#/satellite`) is a 3D simulation built
   around the Branch Education reference animation below: it explores the two
   dishes, one- and two-way signals, GEO and LEO orbits, distance, latency, and
   a moving satellite network.
2. **Computer Network — Interactive Visual Learning Lab** (`#/network`) — a
   Bangla module for school and college students in Bangladesh. Server, client,
   media, NIC, resources, user and protocol each get a plain-language
   explanation, a clickable diagram or simulation, a real-life example and a
   short quiz.

Built with React, TypeScript, Vite, Tailwind CSS, three.js and React Three
Fiber. Every simulation is an educational model running in the browser: no live
telemetry, no real server and no real network traffic.

## Routes

| Route | Description |
| --- | --- |
| `#/` | Home hub: the menu into both projects |
| `#/satellite` | Orbital's interactive broadcast-vs-Starlink landing page |
| `#/how-it-works` | Nine-chapter Starlink explainer |
| `#/simulation` | Detailed Starlink-focused satellite internet simulation |
| `#/comparison` | Interactive 3D view of Earth with a GEO broadcast-TV satellite and a 550 km LEO Starlink satellite flying in the same equatorial plane |
| `#/faq` | Common questions and sources |
| `#/network` | Computer Network lab home: what a network is, plus every lesson |
| `#/network/playground` | Interactive network playground: clients, switch, server, NIC, media, shared resource and a packet you can send |
| `#/network/server-client` | Live client–server simulation: laptop/desktop clients send requests to a rack server — queue, latency, processing time and timeouts |
| `#/network/media` | Twisted pair, optical fiber and Wi-Fi carrying the same bits |
| `#/network/nic` | Inside one computer: where the NIC sits and what it does |
| `#/network/resources` | Shared printer, shared file and email service |
| `#/network/user` | User → browser → client device → network → server → back |
| `#/network/protocol` | HTTP request/response, an HTTP-vs-HTTPS packet animation, a step-by-step TLS handshake and a protocol-rules simulation |
| `#/network/learn` | Guided learning mode: the seven steps in order, with quizzes |
| `#/network/challenge` | Challenge mode: order the download path, then five what-if scenarios |

## The satellite landing-page simulation

At `#/satellite`, choose one of four views:

- **Compare** — see a geostationary broadcast satellite and low-orbit
  satellites around Earth together.
- **The dishes** — compare a receive-only parabolic TV dish with a two-way,
  electronically steered phased-array terminal.
- **Broadcast** — focus on a GEO satellite that stays over an equatorial point
  as Earth rotates and covers a wide region.
- **Starlink** — see a 600-satellite model of a moving LEO constellation, a
  representative handoff, and an optional laser mesh.

Drag the model to rotate it and use the wheel to zoom; when the canvas is
focused, use arrow keys to rotate and plus or minus to zoom. Pause or resume the
simulation, change its time speed, toggle orbit paths, signals and laser links,
reset the camera, or expand the view. The scene pauses when it is off screen or
in a hidden tab. Reduced-motion preferences start it paused. A labelled static
fallback and all comparison text remain usable on devices without WebGL.

Below the simulation, the page compares altitude, signal direction, latency,
terminals and coverage, and follows a simplified two-way internet request.

## The Computer Network learning lab

`#/network` is written in plain Bangla with the English technical term beside
it. Each lesson follows the same rhythm — **সহজ ব্যাখ্যা → interactive
visualization → বাস্তব উদাহরণ → ছোট quiz** — and every control does something
real:

- **Playground.** Click any component (client, NIC, cable, switch, server,
  shared resource) to read what it does. Pick a client and a resource, then send
  a request: the packet walks client → NIC → media → switch → server → resource
  and back, one explained step at a time, with start, pause, step and reset
  controls. Cut a cable, take a client offline, switch a link between wired and
  Wi-Fi, or turn the resource off and the simulation shows what breaks — and
  what does not.
- **Server and client.** A student sends an email; six steps show the request
  leaving, the server working and the response returning.
- **Media.** The same six bits travel as voltage in twisted pair, as light
  pulses in fiber, and as radio waves over Wi-Fi, where a distance slider and
  wall count move a signal-strength meter.
- **NIC.** A motherboard diagram highlights the NIC while data moves from the
  application through the OS network stack, out of the port or antenna, and into
  the receiver's NIC; Ethernet and Wi-Fi adapters are compared side by side.
- **Resources.** Printer, file and email service — including what a server
  answers when the resource is unavailable.
- **User.** The full chain from a person to a web server and back, with the
  difference between a user and a client spelled out.
- **Protocol.** A simplified HTTP message inspector fills in as the steps run,
  then a rules simulation accepts `GET /index.html HTTP/1.1` and rejects a
  request with no path, an unknown version or an unknown method. Below that, the
  same message is sent down two animated lanes at once — plain HTTP and HTTPS —
  past an attacker sitting in the middle of the network who reads the first in
  clear text and only ciphertext from the second; a switch turns the TLS layer
  off so HTTPS collapses back into HTTP. A TLS sequence diagram then walks the
  handshake (ClientHello, ServerHello, certificate, verification, ECDHE key
  exchange, session key, Finished, encrypted HTTP) on a step player: every row
  carries the technical message name *and* its meaning in one Bangla line, the
  eight messages are grouped into the three jobs they do (identity, key,
  tunnel), and messages that have not happened yet stay visible as faint ghosts.
  A reading-depth switch (সহজ / মাধ্যমিক / বিস্তারিত) swaps the explanation
  without touching the diagram, so class 6 and class 12 read the same picture at
  the depth they need, and every step keeps a real-life analogy. A session-key
  panel fills in only once both sides derive the same key, and a
  forged-certificate switch stops the connection before any key exists — the
  later steps then collapse instead of pretending they happen.
  The difference table covers ports, plaintext vs ciphertext, identity, integrity,
  cost and where each protocol is used.
- **Guided mode** walks the seven topics in order with a question set each, and
  **challenge mode** asks for the download path in order (the router is optional,
  but only in the middle of the path) before five what-if scenarios.

Reduced-motion preferences stop the decorative animation and keep the steps
clickable; nothing autoplays on arrival. The diagrams are keyboard reachable
(Tab to a node, Enter to open it) and every page carries a note that the
behaviour is simulated.

## Accuracy and visual scale

This is an **educational model, not live tracking or telemetry**, and it is not
affiliated with SpaceX. The landing-page drawing compresses the GEO orbit and
expands the LEO orbit, satellites, dishes and signals so they can be seen
together. The labels and comparison figures are approximate: a representative
GEO altitude is 35,786 km and a representative Starlink LEO altitude is about
550 km. GEO internet round-trip latency is commonly around 500–600 ms; Starlink
is often around 20–40 ms, depending on the route and conditions. A TV broadcast
receiver is one-way and does not itself have an internet round-trip latency.

The `#/comparison` page draws both spacecraft in one plane — the equatorial
plane the TV satellite must occupy to stand still — and puts the Starlink
satellite 550 km above the ground inside it, so only the altitude differs.
Its coverage cone is cut at Starlink's real 25° minimum elevation mask rather
than the geometric horizon: for a 550 km satellite that is a circle about
941 km in radius (≈1,880 km across, ≈0.54% of Earth's surface, ~2.8 M km²).
For comparison the same spacecraft would see 4.0% of Earth down to the true
horizon, and the TV satellite's horizon cap is 42.4%. Operational Starlink
shells are actually inclined about 53°; the 3D comparison is a like-for-like
altitude comparison, not a ground-track simulation.

The landing-page constellation uses a simplified circular-orbit model (600
spacecraft in 20 planes at a 53° inclination, approximately 95 minutes per
orbit). A ground point rotates with Earth, the GEO spacecraft follows the same
rotation, and the selected LEO spacecraft changes as the geometry changes.
Rendered inter-satellite links are only drawn when their physical line of sight
clears Earth. The ground location, signal pulses and links are illustrative, and
not a representation of operational Starlink routing.

The legacy `#/simulation` and `#/comparison` experiences contain additional
physical-orbit, handoff and relay models. See
[`src/components/SatelliteComparison/README.md`](src/components/SatelliteComparison/README.md)
for details of the six-stage comparison component. All visual sizes and other
simplifications are disclosed in the interface.

## Development

```bash
npm install
npm run dev           # http://localhost:3000, also exposed as an Arena preview
npm run typecheck
npm run build         # static, code-split output in dist/
npm run build:single  # single HTML build in dist-single/ (textures remain separate)
npm run preview
npm test              # typecheck, route, lab, simulation, math, comparison and network tests
npm run test:lab      # landing-page controls and no-WebGL fallback in jsdom
npm run test:lab-math # landing-page orbit, scale and handoff calculations
npm run test:network  # network lab: diagram clicks, packet flow, quizzes, challenge
```

The dev and preview servers bind to `0.0.0.0` and accept proxied preview hosts.
Build with `npx vite build --base=/your-path/` for a static sub-path; textures
are resolved from the configured Vite base. Fonts and Earth textures are local;
no external font or texture host is required.

## Structure

```text
src/pages/Hub.tsx     home page: the menu into both projects
src/components/OrbitLab/  satellite landing-page shell, controls, styling and 3D scene
src/pages/OrbitLab.tsx    satellite comparison, metrics and signal journey
src/lib/network/      network lab data: page list, Bangla copy and the cable /
                      wireless media catalogue with its photo credits
src/components/NetworkLab/
                        network lab simulations, diagrams and shared UI
src/pages/network/    the ten network lab pages
src/components/SatelliteComparison/
                          standalone six-stage comparison component (not routed)
                          and shared orbit math used by the landing page
src/components/SatelliteSimulation/
                          detailed legacy Starlink simulation
src/pages/                legacy guide pages
public/textures/          local Earth day, night and cloud maps
public/media/             real photographs of cables, connectors and a router
scripts/                  route, UI and orbital-math tests
```

## Credits

- The supplied reference animation features Branch Education. The related
  [How does Starlink satellite internet work?](https://www.youtube.com/watch?v=qs2QcycggWU)
  explainer informed the educational comparison and the 3D scene.
- Earth day, night and cloud textures are based on the
  [three.js examples](https://github.com/mrdoob/three.js/tree/master/examples/textures/planets).
- Typography: Space Grotesk and IBM Plex Mono, bundled locally through
  Fontsource; the Bangla lab uses Hind Siliguri, also bundled locally. Icons:
  Lucide.
- Cable and connector photographs in `public/media/` are cropped and
  re-compressed copies of Wikimedia Commons files: `coax-cable.jpg` (Peter
  Trieb, public domain), `coax-connector.jpg` (Colin, CC BY-SA 3.0),
  `ethernet-cable.jpg` (Disk Depot Ltd., CC BY-SA 4.0),
  `ethernet-connector.jpg` (Khairil Yusof, CC BY 2.0), `fiber-cable.jpg`
  (Adamantios, CC BY-SA 3.0), `fiber-connector.jpg` (CC BY-SA 3.0) and
  `wireless-router.jpg` (Raimond Spekking, CC BY-SA 4.0). The exact source and
  licence of each file is also listed on the lesson page and in
  `src/lib/network/media.ts`.
