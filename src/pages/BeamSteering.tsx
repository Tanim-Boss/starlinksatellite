import { SteerLab } from "@/components/steer/SteerLab";
import { CONCEPT_NOTE, TECH_CARDS } from "@/components/steer/steerContent";
import { NextPageCTA } from "@/components/home/HomeSections";
import { Eyebrow, LinkArrow, Pill, Reveal } from "@/components/site/primitives";
import { Link } from "@/lib/router";

const BADGES = [
  "2 target satellites",
  "RF dish + optical laser",
  "Two-axis gimbal",
  "Live pointing telemetry",
  "5-stage walkthrough",
];

const READ_KEYS = [
  {
    tag: "01",
    title: "Watch the terminal, not the bus",
    body: "The satellite body keeps its attitude. Only the mast-mounted terminal rotates — an azimuth stage and an elevation stage — so slewing a beam costs a fraction of the fuel and time that turning the whole spacecraft would.",
  },
  {
    tag: "02",
    title: "The beam follows the gimbal",
    body: "Every orange wavefront, the laser line and the data packets are rebuilt each frame from the terminal's live pointing direction. Pick Satellite B and the entire beam sweeps across the sky instead of jumping.",
  },
  {
    tag: "03",
    title: "Error is the whole story",
    body: "Pointing error is the angle between where the terminal points and where the target sits. Inside the lock threshold the link closes; outside it, the telemetry shows the slew and the packets stop.",
  },
];

const MECHANISM_POINTS = [
  {
    term: "Target direction",
    body: "The attitude computer knows where each partner spacecraft is relative to the body frame — the source satellite's own coordinate system.",
  },
  {
    term: "Azimuth (az)",
    body: "Rotation about the vertical mast axis, measured from the body's reference direction. It decides which way around the horizon the terminal faces.",
  },
  {
    term: "Elevation (el)",
    body: "The tilt above the reference plane, applied by the second gimbal stage. Azimuth and elevation together uniquely define any pointing direction.",
  },
  {
    term: "Pointing control",
    body: "A closed-loop controller drives the two gimbal motors toward the commanded angles and holds them as the targets drift. Optical terminals add a fast fine-steering mirror for PAT — pointing, acquisition and tracking.",
  },
];

const ASSUMPTIONS = [
  {
    title: "Wavefronts are explanatory",
    body: "The orange rings are surfaces of constant phase drawn far apart so the beam is visible. They are not individual photons, not field lines, and not a literal rendering of every electromagnetic oscillation.",
  },
  {
    title: "Not an orbital or EM solver",
    body: "Targets follow slow closed apparent tracks in a fixed body frame. There is no Keplerian propagation, no link budget, no diffraction calculation and no atmospheric or pointing-jitter model.",
  },
  {
    title: "Illustrative scales and thresholds",
    body: "Spacecraft, beam widths and the 100 km-per-scene-unit range are all bent for legibility. The 1.4° RF and 0.35° optical lock thresholds, the Ka-band and 1550 nm labels, are representative teaching values, not a specification.",
  },
  {
    title: "Dish versus laser terminal",
    body: "A parabolic dish reflects radio waves over a beam several degrees wide; an optical terminal focuses a microradian laser through a telescope with PAT. The simulation swaps the hardware deliberately — they are not the same mechanism.",
  },
  {
    title: "One gimbal, simplified",
    body: "Real inter-satellite links use two-axis gimbals with backlash, calibration and momentum compensation, or body-pointing plus fine mirrors. Here the gimbal is an ideal first-order slew in the body frame.",
  },
  {
    title: "Not telemetry or firmware",
    body: "No live data, no proprietary control system and no reproduction of any spacecraft's hardware or software. Every number on the telemetry card is simulated and labelled as such.",
  },
];

export function BeamSteering() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#3ddbd9]/[0.05] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>Beam steering lab · interactive 3D</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.1rem,5.2vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              Steer the beam,
              <br />
              <span className="text-gradient">not the satellite.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
              A relay satellite in deep space holds a steady link with Satellite A — then hands
              its narrow beam to Satellite B. The spacecraft body never turns; a gimbaled terminal
              rotates through azimuth and elevation while the wavefronts, laser and data packets
              follow every degree of the slew in real time.
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
              <Link to="/steering" section="simulation">
                <span className="group inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-signal transition-colors hover:text-white">
                  Run the simulation
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
              <LinkArrow href="#/how-it-works@lasers">Read about laser links</LinkArrow>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-warn/20 bg-warn/[0.04] px-4 py-2.5">
              <Pill tone="amber">Educational simulation</Pill>
              <p className="text-[10.5px] leading-relaxed text-muted">{CONCEPT_NOTE}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <SteerLab />

      {/* How to read it */}
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

      {/* RF vs optical */}
      <section className="scroll-mt-24 border-t border-white/[0.06] bg-white/[0.012] py-10 md:py-14">
        <div className="page-shell">
          <Eyebrow>Two link technologies</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
            A parabolic dish is not a laser terminal.
          </h2>
          <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-muted">
            Both terminals steer a narrow beam from one spacecraft to another, but the carrier,
            the hardware and the pointing precision are different worlds. Switch between them
            inside the simulation and compare the beam width and lock behaviour.
          </p>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {(Object.values(TECH_CARDS)).map((card) => (
              <div key={card.id} className="rounded-2xl border border-white/[0.08] bg-[#070d1a] p-5">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      card.id === "rf"
                        ? "h-2 w-2 rounded-full bg-[#ff7a1a] shadow-[0_0_8px_#ff7a1a]"
                        : "h-2 w-2 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]"
                    }
                  />
                  <h3 className="text-[14px] font-semibold text-white">{card.title}</h3>
                </div>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                  {card.tagline}
                </p>
                <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
                  {card.points.map((point) => (
                    <div
                      key={point.label}
                      className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-2"
                    >
                      <dt className="text-[10.5px] text-faint">{point.label}</dt>
                      <dd className="text-right font-mono text-[10.5px] tabular-nums text-ink">
                        {point.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3.5 text-[11px] leading-relaxed text-muted">{card.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mechanism */}
      <section id="mechanism" className="scroll-mt-24 border-t border-white/[0.06] py-10 md:py-14">
        <div className="page-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>The mechanism · stage 5</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
              Two angles, one
              <br />
              pointing direction.
            </h2>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
              Open the <span className="text-ink">Mechanism</span> camera in the simulation to see
              the gimbal up close: the cyan azimuth ring and the amber elevation arc move while the
              bus behind them stays perfectly still.
            </p>
            <div className="mt-4">
              <LinkArrow href="#/how-it-works@lasers">PAT and laser crosslinks, in prose</LinkArrow>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {MECHANISM_POINTS.map((item) => (
              <div key={item.term} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-signal">
                  {item.term}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{item.body}</p>
              </div>
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
              A teaching model,
              <br />
              not a mission.
            </h2>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
              The lab is built to make one idea visible — a beam can be redirected by pointing a
              terminal, without rotating the spacecraft. Everything that would obscure that idea
              is simplified and listed here.
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
              title="Compare it with a dish that never moves."
              body="The beam lab shows the ground-side trick: a flat phased array steers its beam electronically with zero moving parts, the complement to this spacecraft gimbal."
              to="/antenna"
              cta="Open the dish beam lab"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
