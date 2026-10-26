import { ExplorerStage } from "@/components/explorer/ExplorerStage";
import { Eyebrow, LinkArrow, Reveal, SectionHeading } from "@/components/site/primitives";
import { NextPageCTA } from "@/components/home/HomeSections";

const NOTES = [
  {
    t: "Parametric, not telemetry",
    d: "Positions come from published shell altitudes and inclinations propagated with a circular two-body model. There is no live tracking data here — the satellites are where the maths says they should be, not where the real ones are.",
  },
  {
    t: "To scale horizontally, exaggerated vertically",
    d: "Distances between orbits and Earth are to scale (1 unit = 6,371 km). Spacecraft themselves are drawn far larger than reality so you can see and click them.",
  },
  {
    t: "A representative fleet",
    d: "528 satellites stand in for a constellation of more than 11,000. Every plane shown is a sample of a real shell, not a complete plane.",
  },
];

export function Explorer() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-32">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>3D explorer</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              Fly the constellation.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[16.5px]">
              Four shells, their orbital planes and a representative fleet of satellites, rendered
              live. Select a spacecraft to inspect its footprint and light time, drop a probe on the
              ground, or switch views to watch gateways and laser links at work.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="page-shell py-8 md:py-10">
        <Reveal>
          <ExplorerStage />
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <Reveal>
            <SectionHeading
              eyebrow="Honesty about the model"
              title="What you are looking at."
              lede="A visual model built to explain geometry and physics — not a mission control screen."
            />
            <div className="mt-6">
              <LinkArrow href="#/how-it-works">Read how the real system works</LinkArrow>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="space-y-3">
              {NOTES.map((n, i) => (
                <div key={n.t} className="flex gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <span className="font-mono text-[10px] text-signal/70">0{i + 1}</span>
                  <div>
                    <h3 className="text-[13px] font-medium text-ink">{n.t}</h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{n.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-12">
          <Reveal>
            <NextPageCTA
              eyebrow="Next"
              title="The numbers behind the picture."
              body="Move the altitude slider, watch coverage and latency trade places, and find where fibre still beats a laser mesh."
              to="/numbers"
              cta="Explore the numbers"
            />
          </Reveal>
        </div>
      </div>
    </>
  );
}
