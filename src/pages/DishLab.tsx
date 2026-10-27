import { DishLab as DishBeamSimulation } from "@/components/beam/DishLab";
import { NextPageCTA } from "@/components/home/HomeSections";
import { Eyebrow, LinkArrow, Pill, Reveal } from "@/components/site/primitives";
import { ARRAY_COLS, ARRAY_ROWS, FREQ_GHZ, WAVELENGTH_MM } from "@/lib/dishBeam";
import { Link } from "@/lib/router";

const BADGES = [
  `${ARRAY_COLS} × ${ARRAY_ROWS} elements`,
  `${FREQ_GHZ} GHz · λ ≈ ${Math.round(WAVELENGTH_MM)} mm`,
  "0 moving parts",
  "3 satellites",
  "4-bit phase words",
];

const READ_KEYS = [
  {
    tag: "01",
    title: "Orange means “in step”",
    body: "Each ring is a surface where the waves from every element arrive together. Where the rings are bright, the fields add; the beam is simply the direction where that happens all the way up to the satellite.",
  },
  {
    tag: "02",
    title: "The panel never turns",
    body: "There is no motor and no gimbal. The beam is aimed by changing the timing at each element — thousands of times a second, far faster than any moving dish could follow a satellite across the sky.",
  },
  {
    tag: "03",
    title: "Every number is a phase word",
    body: "The four digits riding each ring are the quantised phase setting of one array row — a visual device for a continuous wavefront, but the pattern is real array theory. Steer the beam and the words change with it.",
  },
];

const ASSUMPTIONS = [
  {
    title: "Ideal array, one factor",
    body: "A uniform 16 × 16 lattice of isotropic elements with half-wavelength spacing at 12 GHz. Only the far-field array factor is modelled: no mutual coupling, no element pattern, no ground plane and no amplitude taper.",
  },
  {
    title: "Four-bit phase shifters",
    body: "Element phases are quantised to 22.5° steps. Real terminals use more resolution, calibrate every element and often apply a taper; those details are not public, and none of them are simulated here.",
  },
  {
    title: "The scale is bent, deliberately",
    body: "The real wavelength is 25 mm and the satellite is hundreds of kilometres away. In the scene the wavefront spacing is drawn around a metre, the sky is compressed to twelve units and the spacecraft are much too large to be honest.",
  },
  {
    title: "Tracks, not ephemerides",
    body: "The three satellites follow closed apparent tracks at a readable pace. They are not propagated from orbital elements, and their motion never depends on where the beam points.",
  },
  {
    title: "No link budget",
    body: "Beamwidth, phase step and delay come from the array geometry. Data rate, modulation, rain fade, polarisation and atmospheric loss are all outside the model.",
  },
  {
    title: "Not Starlink firmware",
    body: "This is textbook array theory with a cinematic face. It is not telemetry, not a control system, and not a reproduction of any product's hardware; real terminals differ by generation.",
  },
];

export function DishLab() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#ff6a14]/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>Dish beam lab · interactive</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.1rem,5.2vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              The dish that
              <br />
              <span className="text-gradient">never moves.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
              A flat panel on a tripod, pointed at the sky. It has no motors, yet the beam finds a
              satellite that is already racing overhead — because the timing of the waves, not the
              hardware, decides where they add up. This is that trick, simulated: one fixed dish, a
              column of wavefronts and the phase words that steer them.
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
              <Link to="/antenna" section="simulation">
                <span className="group inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-signal transition-colors hover:text-white">
                  Run the simulation
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
              <LinkArrow href="#/how-it-works@terminal">Read about the terminal</LinkArrow>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-warn/20 bg-warn/[0.04] px-4 py-2.5">
              <Pill tone="amber">Educational simulation</Pill>
              <p className="text-[10.5px] leading-relaxed text-muted">
                Not a live Starlink control system, not telemetry, not proprietary firmware. The phase
                model is textbook array theory; the scene, the satellite tracks and the scale are
                simplified and labelled as such.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <DishBeamSimulation />

      <section className="border-t border-white/[0.06] py-10 md:py-12">
        <div className="page-shell">
          <div className="grid gap-3 md:grid-cols-3">
            {READ_KEYS.map((key) => (
              <div key={key.tag} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
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
            ))}
          </div>
        </div>
      </section>

      <section
        id="assumptions"
        className="scroll-mt-24 border-t border-white/[0.06] bg-white/[0.012] py-10 md:py-14"
      >
        <div className="page-shell grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <Eyebrow>Assumptions &amp; limits</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
              A teaching model,
              <br />
              not a terminal.
            </h2>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
              The simulation is built to make one idea visible: a beam can be steered by timing
              alone. Everything that would obscure that idea has been simplified — and listed here
              rather than hidden.
            </p>
            <div className="mt-4">
              <LinkArrow href="#/how-it-works@terminal">The physics, in prose</LinkArrow>
            </div>
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
              title="See where the beam lands in the constellation."
              body="The 3D explorer zooms out from this one terminal to the whole shell: thousands of satellites on real shell parameters, the ground stations they talk to, and the laser links between them."
              to="/explorer"
              cta="Open the 3D explorer"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
