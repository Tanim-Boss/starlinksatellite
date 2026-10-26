import { AltitudeLab } from "@/components/diagrams/AltitudeLab";
import { LatencyRace } from "@/components/diagrams/LatencyRace";
import { OrbitScale } from "@/components/diagrams/OrbitScale";
import {
  Eyebrow,
  LinkArrow,
  Reveal,
  Section,
  SectionHeading,
} from "@/components/site/primitives";
import { NextPageCTA } from "@/components/home/HomeSections";
import {
  EARTH_RADIUS_KM,
  MU_KM3_S2,
  SPEED_OF_LIGHT_KM_S,
  coverageInfo,
  orbitalPeriodSec,
  orbitalVelocityKmS,
} from "@/lib/astro";

const A = EARTH_RADIUS_KM + 550;
const V = orbitalVelocityKmS(A);
const T = orbitalPeriodSec(A);
const COV = coverageInfo(550);

const CONSTANTS = [
  { k: "Earth radius", v: `${EARTH_RADIUS_KM.toLocaleString("en-US")} km`, note: "mean equatorial" },
  { k: "Gravitational parameter", v: `${MU_KM3_S2.toLocaleString("en-US")} km³/s²`, note: "μ for Earth" },
  { k: "Speed of light (vacuum)", v: `${SPEED_OF_LIGHT_KM_S.toLocaleString("en-US")} km/s`, note: "c" },
  { k: "Speed of light in fibre", v: "≈200,000 km/s", note: "n ≈ 1.47" },
  { k: "Starlink altitude", v: "≈550 km (→ 480 km)", note: "2026 transition" },
  { k: "GEO altitude", v: "35,786 km", note: "geostationary" },
];

const DERIVED = [
  { k: "Orbital speed at 550 km", v: `${V.toFixed(2)} km/s` },
  { k: "Orbital period at 550 km", v: `${(T / 60).toFixed(1)} min` },
  { k: "Ground footprint diameter", v: `≈${Math.round(COV.capDiameterKm).toLocaleString("en-US")} km` },
  { k: "Footprint area", v: `≈${(COV.areaKm2 / 1e6).toFixed(1)} million km²` },
  { k: "One-way light time, zenith", v: `${COV.minLatencyMs.toFixed(1)} ms` },
  { k: "One-way light time, horizon", v: `${COV.maxLatencyMs.toFixed(1)} ms` },
];

export function Numbers() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="page-shell relative pb-12">
          <Reveal>
            <Eyebrow>The numbers</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5.4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
              Distance is destiny.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              Orbital speed, footprint size and latency all come from the same three variables:
              Earth&apos;s radius, its gravity and the altitude of the satellite. Move one slider and
              watch the rest respond.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="page-shell py-12 md:py-16">
        <Reveal>
          <AltitudeLab />
        </Reveal>

        <Reveal delay={60} className="mt-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-5">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Constants used
              </h3>
              <dl className="mt-3">
                {CONSTANTS.map((c) => (
                  <div
                    key={c.k}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] py-2 last:border-0"
                  >
                    <dt className="text-[12px] text-muted">{c.k}</dt>
                    <dd className="flex items-baseline gap-2">
                      <span className="font-mono text-[11.5px] text-ink">{c.v}</span>
                      <span className="font-mono text-[9px] text-faint">{c.note}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="panel p-5">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Derived for a 550 km orbit
              </h3>
              <dl className="mt-3">
                {DERIVED.map((c) => (
                  <div
                    key={c.k}
                    className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] py-2 last:border-0"
                  >
                    <dt className="text-[12px] text-muted">{c.k}</dt>
                    <dd className="font-mono text-[11.5px] text-signal">{c.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                Footprint numbers use the geometric horizon at zero elevation. A usable link needs a
                minimum elevation angle, so the real service area is smaller.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-14">
          <SectionHeading
            eyebrow="The crossover"
            title="Where space beats glass."
            lede="Fibre is brilliant over short distances and hopelessly indirect across an ocean. A laser mesh in low orbit is neither — it is a compromise that wins in a specific band of distances."
          />
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <LatencyRace />
        </Reveal>

        <Reveal delay={60} className="mt-8">
          <OrbitScale />
        </Reveal>

        <Reveal delay={60} className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h3 className="text-sm font-semibold text-white">Why these models are deliberately simple</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "No congestion",
                d: "Real throughput is shared inside a spot beam. Peak-hour contention can dominate latency numbers in dense areas.",
              },
              {
                t: "No routing or peering",
                d: "Every network path bends toward internet exchanges. The straight-line distance is never the actual distance.",
              },
              {
                t: "No weather or obstructions",
                d: "Rain fade, trees and buildings all cost packets. A clean-sky model is the best case, not the average.",
              },
            ].map((c) => (
              <div key={c.t}>
                <h4 className="text-[12.5px] font-medium text-ink">{c.t}</h4>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center gap-6">
          <LinkArrow href="#/faq">Common questions</LinkArrow>
          <LinkArrow href="#/how-it-works">Back to the explainer</LinkArrow>
        </div>
      </div>

      <Section className="pb-16 pt-0">
        <Reveal>
          <NextPageCTA
            eyebrow="Finally"
            title="The questions people actually ask."
            body="Why so many satellites? What happens in a city? Does the dish move? Short, direct answers."
            to="/faq"
            cta="Read the FAQ"
          />
        </Reveal>
      </Section>
    </>
  );
}
