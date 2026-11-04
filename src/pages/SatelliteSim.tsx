import { SatelliteSimulation } from "@/components/SatelliteSimulation";
import { NextPageCTA } from "@/components/home/HomeSections";
import { Eyebrow, LinkArrow, Pill, Reveal } from "@/components/site/primitives";
import { Link } from "@/lib/router";

const BADGES = [
  "480 satellites · 24 planes",
  "550 km · 7.6 km/s · 95 min",
  "Phased-array dish, 0 moving parts",
  "Laser mesh with live routing",
];

const READ_KEYS = [
  {
    tag: "01",
    title: "Orange is radio, cyan is laser",
    body: "The orange beam is your dish talking to a satellite over radio; the cyan lines are lasers between satellites. White dots are the fleet. The legend in the corner says the same thing.",
  },
  {
    tag: "02",
    title: "The dish never moves",
    body: "It is a flat phased array on a tripod. Choose Dish to see it on the ground: the orange beam changes direction as the link hands off from one satellite to another, while the antenna stays still.",
  },
  {
    tag: "03",
    title: "Lasers never touch the ground",
    body: "Every laser link is a straight line through vacuum. Links that would pass through Earth are hidden, and the bright route is the shortest laser path from your dish to a gateway.",
  },
];

const ASSUMPTIONS = [
  {
    title: "Physically based orbits, exaggerated sizes",
    body: "Satellites follow real circular orbits at 550 km, 53° inclination, with the correct speed and 95-minute period, arranged in evenly spaced planes by RAAN and mean-anomaly math. Satellite, dish and beam sizes are bent for legibility; the legend does not pretend otherwise.",
  },
  {
    title: "Make-before-break handoffs",
    body: "As the connected satellite approaches the 25° minimum elevation, the link can switch to a better satellite in view; below the cutoff it switches if another is available. The old beam fades for clarity — real handovers involve electronic beamforming, not a visible fade.",
  },
  {
    title: "Routing is shortest-hop, not operational",
    body: "The relay route is a BFS over the laser mesh — the fewest laser hops from your dish to a gateway's satellite. Real routing also accounts for capacity, congestion and weather; this shows the topology, not the schedule.",
  },
  {
    title: "Latency is light-time only",
    body: "The HUD's millisecond figure is the path length divided by the speed of light. Real latency adds processing, modulation and queuing delays — but for a satellite internet link, distance is the dominant term, which is the point.",
  },
  {
    title: "Click the globe",
    body: "Click anywhere on Earth to move your dish there; pick a gateway from the controls and watch a long relay route form. Story Mode flies you through the whole chain automatically.",
  },
  {
    title: "Not live tracking",
    body: "This is an educational simulation built from published shell parameters. It is not telemetry, not a control system, and not a reproduction of any network's live state.",
  },
];

export function SatelliteSim() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#3ddbd9]/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>Satellite internet simulation · interactive 3D</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.1rem,5.2vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              The satellite internet,
              <br />
              <span className="text-gradient">in one scene.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
              Hundreds of satellites on real orbits. A dish with no moving parts that tracks the
              sky and hands off seamlessly. A laser mesh that relays your traffic across oceans —
              down to a gateway and into the internet. Everything below is interactive: change the
              time speed, move the dish, pick a gateway, or choose Dish to watch the antenna
              track satellites from the ground. Story Mode plays the whole chain for you.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {BADGES.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link to="/simulation" section="simulation">
                <span className="group inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-signal transition-colors hover:text-white">
                  Jump into the simulation
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
              <LinkArrow href="#/how-it-works@lasers">Read about laser links</LinkArrow>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-warn/20 bg-warn/[0.04] px-4 py-2.5">
              <Pill tone="amber">Educational simulation</Pill>
              <p className="text-[10.5px] leading-relaxed text-muted">
                Satellite, dish and beam sizes are exaggerated for visibility; orbits, speeds and
                geometry are physically based. Not live tracking, not a control system.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="simulation" className="relative scroll-mt-24 py-8 md:py-10">
        <div className="page-shell">
          <div className="panel overflow-hidden">
            <div className="h-[78vh] min-h-[460px] w-full">
              <SatelliteSimulation />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#040a13] px-4 py-2.5 md:px-5">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
                480 satellites · 24 planes · 53° · 550 km · phased array · laser mesh · BFS routing
              </p>
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
                Choose Orbit / Dish / Laser below the scene · click the globe to move the dish
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to read it */}
      <section className="border-t border-white/[0.06] py-10 md:py-12">
        <div className="page-shell">
          <div className="grid gap-3 md:grid-cols-3">
            {READ_KEYS.map((key) => (
              <Reveal key={key.tag}>
                <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-signal/80">{key.tag}</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">
                      how to read it
                    </span>
                  </div>
                  <h3 className="mt-2 text-[12.5px] font-medium text-white">{key.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{key.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Assumptions */}
      <section
        id="assumptions"
        className="scroll-mt-24 border-t border-white/[0.06] bg-white/[0.012] py-10 md:py-14"
      >
        <div className="page-shell grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <Eyebrow>Assumptions &amp; limits</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
              A teaching model of the
              <br />
              whole chain.
            </h2>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
              The simulation is built to make one idea visible: from a flat dish on the ground to
              the internet, a satellite internet connection is a relay chain. Everything that would
              obscure that idea has been simplified — and listed here rather than hidden.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ASSUMPTIONS.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <h3 className="text-[12px] font-medium text-white">{item.title}</h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-20">
        <div className="page-shell pt-10 md:pt-12">
          <Reveal>
            <NextPageCTA
              eyebrow="Next"
              title="Compare broadcast TV with satellite internet."
              body="See why a fixed geostationary broadcast dish and a two-way low-orbit terminal behave so differently."
              to="/comparison"
              cta="Open TV vs Starlink"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
