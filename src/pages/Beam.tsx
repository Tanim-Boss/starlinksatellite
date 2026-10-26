import { BeamLab } from "@/components/beam/BeamLab";
import { Eyebrow, LinkArrow, Reveal, SectionHeading } from "@/components/site/primitives";
import { NextPageCTA } from "@/components/home/HomeSections";
import { BEAM_MASK_DEG } from "@/lib/beam";
import { Link } from "@/lib/router";

const STEPS = [
  {
    k: "01",
    t: "Acquire",
    d: "The terminal looks at the sky above its mask, works out where each satellite is, and picks the highest one. A beam exists only where the phases say it does.",
  },
  {
    k: "02",
    t: "Track",
    d: "The satellite sweeps across the sky at roughly a degree per second. The terminal rewrites the phase offset on all 1,280 elements every few microseconds. Nothing tilts.",
  },
  {
    k: "03",
    t: "Prepare",
    d: "Before the current satellite gets low, the network reserves the next one. A second link is brought up while the first is still carrying traffic — make-before-break.",
  },
  {
    k: "04",
    t: "Re-aim",
    d: "The phase pattern is recalculated and the beam jumps to the new satellite. The old link is released. Your video call does not notice.",
  },
];

/** Figures from Branch Education's teardown of Dishy and the Starlink spacecraft. */
const HARDWARE = [
  { v: "1,280", u: "elements", d: "Patch antennas on one flat PCB, roughly 55 cm across, in a hexagonal lattice. No horn, no reflector." },
  { v: "20", u: "beamformers", d: "Each coordinates 32 front-end modules; each module drives two antennas. That is the whole steering chain." },
  { v: "~3,500×", u: "gain", d: "The combined main beam is far stronger than 1,280 elements adding up linearly — interference concentrates it." },
  { v: "~100°", u: "field of view", d: "The cone of sky the beam can be steered across without physically moving the panel." },
  { v: "4", u: "arrays per satellite", d: "Two on the spacecraft serve terminals, two serve ground stations — plus laser terminals on newer models." },
  { v: "64QAM", u: "modulation", d: "Six bits per symbol, encoded in amplitude and phase. The beam is the pipe; this is what fills it." },
];

const HONESTY = [
  {
    t: "A representative fleet, not live telemetry",
    d: "The sky is populated by the same 528-satellite subset the 3D explorer uses, propagated from published shell altitudes and inclinations with a circular two-body model. The real constellation has more than 11,000 spacecraft; this is a geometric stand-in.",
  },
  {
    t: "A simple handover policy",
    d: "Here the terminal keeps a satellite until it drops to 30° elevation, then switches to the highest satellite above the 25° mask. Real scheduling also weighs capacity, obstructions, ground-station visibility and network load.",
  },
  {
    t: "An intentionally slow re-aim",
    d: "The visible swing between satellites is stretched to eight simulated seconds so you can follow it. The real array re-tunes in microseconds; a handover is effectively instant.",
  },
  {
    t: "Schematic hardware",
    d: "The aperture drawing is a 40 × 32 lattice and the gain plot is an ideal 16-element array factor. Dishy actually uses 1,280 elements in a hexagonal lattice, 20 beamformer chips and roughly a 100° field of view.",
  },
];

export function Beam() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-signal/[0.08] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-10">
          <Reveal>
            <Eyebrow>Beam lab</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5.4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
              Your dish never moves.
              <br />
              <span className="text-gradient">Its beam does.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              A Starlink terminal has no motor, no gimbal and no moving dish. It is a flat grid of
              1,280 tiny antennas that steers a radio beam electronically — and every couple of
              minutes it walks that beam across the sky onto a completely different satellite. This
              page animates that handover using real orbital geometry.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {["0 moving parts", "1,280 antenna elements", `${BEAM_MASK_DEG}° elevation mask`, "~1 switch every 2 min"].map(
                (m) => (
                  <span
                    key={m}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                  >
                    {m}
                  </span>
                ),
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <LinkArrow href="#/how-it-works@terminal">How beamforming works</LinkArrow>
              <a
                href="https://www.youtube.com/watch?v=qs2QcycggWU"
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-white"
              >
                Branch Education explainer <span aria-hidden>↗</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="page-shell py-8 md:py-10">
        <Reveal>
          <BeamLab />
        </Reveal>

        {/* How a handover works */}
        <div className="mt-12 md:mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="What just happened"
              title="Four steps, repeated all day."
              lede="The dish is a fixed flat panel. Everything you saw in the animation above happens in the timing of the signals, not in the hardware."
            />
          </Reveal>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.k} delay={i * 50}>
                <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-signal">{s.k}</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <h3 className="mt-2.5 text-[13.5px] font-medium text-white">{s.t}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80}>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-signal/20 bg-signal/[0.04] px-4 py-3">
              <p className="text-[11.5px] leading-relaxed text-muted">
                Try it: press <span className="text-ink">Next switch</span> to jump to a handover,
                click any satellite in the sky to hold the beam on it, or drag the elevation chart to
                scrub through the half hour.
              </p>
              <div className="ml-auto flex items-center gap-4">
                <LinkArrow href="#/explorer">See the whole fleet</LinkArrow>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Hardware numbers, straight from the source video */}
        <div className="mt-12 md:mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="Inside Dishy"
              title="The hardware, by the numbers."
              lede="Figures from Branch Education's teardown of a Starlink terminal and spacecraft — the same pieces this page animates."
            />
          </Reveal>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HARDWARE.map((h, i) => (
              <Reveal key={h.u} delay={i * 40}>
                <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[20px] font-semibold leading-none text-signal">{h.v}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">{h.u}</span>
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{h.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Honesty + source */}
        <div className="mt-12 grid gap-8 md:mt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <Reveal>
            <SectionHeading
              eyebrow="Honesty about the model"
              title="What is real here, and what is simplified."
              lede="The geometry is real enough to be useful and simplified enough to run in a browser. Every shortcut is labelled."
            />
            <div className="mt-6 space-y-2.5">
              {HONESTY.map((h, i) => (
                <div key={h.t} className="flex gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <span className="mt-0.5 font-mono text-[9px] text-signal/70">0{i + 1}</span>
                  <div>
                    <h3 className="text-[12.5px] font-medium text-ink">{h.t}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{h.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="space-y-4">
              <a
                href="https://www.youtube.com/watch?v=qs2QcycggWU"
                target="_blank"
                rel="noreferrer noopener"
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1a2b] via-[#081120] to-[#0a0f1d] p-5 transition-colors hover:border-signal/40"
              >
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-signal/40 bg-signal/10 text-[10px] text-signal">
                    ▶
                  </span>
                  Source explainer · YouTube
                </div>
                <h3 className="mt-4 text-[17px] font-semibold leading-snug text-white group-hover:text-signal">
                  How does Starlink satellite internet work?
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  Branch Education&apos;s 3D teardown of Dishy McFlatface: patch antennas, phase
                  shifting, beamforming, beam steering and 64QAM — the video this page follows.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                  Watch on YouTube <span aria-hidden>↗</span>
                </span>
              </a>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h3 className="text-[13px] font-medium text-white">Go deeper</h3>
                <div className="mt-3 space-y-2.5">
                  <Link to="/how-it-works" section="terminal" className="block text-[12px] text-muted hover:text-signal">
                    Chapter 04 — the dish on your roof
                  </Link>
                  <Link to="/how-it-works" section="handover" className="block text-[12px] text-muted hover:text-signal">
                    Chapter 08 — handing you off invisibly
                  </Link>
                  <Link to="/numbers" className="block text-[12px] text-muted hover:text-signal">
                    Numbers — the altitude / latency trade-off
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h3 className="text-[13px] font-medium text-white">The numbers used here</h3>
                <dl className="mt-3 space-y-2 text-[11px]">
                  {[
                    ["Earth radius", "6,371 km"],
                    ["Shell 1 altitude", "550 km"],
                    ["Shell 1 inclination", "53.0°"],
                    ["Terminal", "47.6° N, 122.4° W"],
                    ["Elevation mask", `${BEAM_MASK_DEG}°`],
                    ["Ku-band", "12.2 GHz"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-1.5 last:border-0 last:pb-0">
                      <dt className="text-faint">{k}</dt>
                      <dd className="font-mono text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 md:mt-16">
          <Reveal>
            <NextPageCTA
              eyebrow="Next"
              title="Now zoom out."
              body="Put this dish on a spinning Earth, add the other shells, gateways, laser links and 11,000 satellites, and watch the whole constellation move."
              to="/explorer"
              cta="Open the 3D explorer"
            />
          </Reveal>
        </div>
      </div>
    </>
  );
}
