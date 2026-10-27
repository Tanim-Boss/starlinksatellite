import { lazy, Suspense } from "react";
import { SignalPath } from "@/components/diagrams/SignalPath";
import { OrbitScale } from "@/components/diagrams/OrbitScale";
import { LaserMesh } from "@/components/diagrams/LaserMesh";
import { HandoverDemo } from "@/components/diagrams/HandoverDemo";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import {
  ChapterGrid,
  ExplorerTeaser,
  NextPageCTA,
  QuickSteps,
  StatsBand,
} from "@/components/home/HomeSections";
import {
  ArrowIcon,
  Eyebrow,
  LinkArrow,
  Reveal,
  Section,
  SectionHeading,
} from "@/components/site/primitives";
import { HERO_STATS } from "@/lib/content";
import { Link } from "@/lib/router";
import { GlobePoster } from "@/components/site/ScenePosters";

/*
 * The hero globe is the only thing on this page that needs three.js, so it is
 * fetched only after the text, the figures and the navigation have painted.
 * Everything visible above the fold is static SVG until then.
 */
const CinematicGlobe = lazy(() =>
  import("@/components/three/CinematicGlobe").then((m) => ({ default: m.CinematicGlobe })),
);

export function Home() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-beam/[0.06] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-signal/[0.05] blur-3xl"
          aria-hidden
        />

        <div className="page-shell relative">
          <div className="grid items-center gap-4 pb-6 pt-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-6 lg:pb-0 lg:pt-16">
            <div className="relative z-10 max-w-xl">
              <Eyebrow>
                <span className="relative mr-1 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-60 animate-blink" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
                </span>
                An interactive field guide
              </Eyebrow>

              <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
                How Starlink
                <br />
                <span className="text-gradient">actually works.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted md:text-[17px] md:leading-[1.65]">
                Eleven thousand satellites, a dish with no moving parts, and a mesh of lasers in
                the sky. Here is the whole chain — from the radio beam leaving your roof to the
                fibre that meets it on the ground.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/how-it-works"
                  className="group inline-flex items-center gap-2 rounded-full bg-signal px-5 py-3 text-[13px] font-semibold text-[#04121a] transition-colors hover:bg-white"
                >
                  Start with the basics
                  <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/explorer"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[13px] font-medium text-ink transition-colors hover:border-signal/50 hover:text-signal"
                >
                  <span className="text-[15px] leading-none">◍</span>
                  Open the 3D model
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">
                <span>9 chapters</span>
                <span className="h-1 w-1 rounded-full bg-faint/50" />
                <span>4 interactive figures</span>
                <span className="h-1 w-1 rounded-full bg-faint/50" />
                <span>updated Oct 2026</span>
              </div>
            </div>

            <div className="relative">
              <div className="relative mx-auto h-[46vh] min-h-[330px] w-full max-w-[640px] lg:h-[68vh] lg:max-w-none">
                <Suspense fallback={<GlobePoster />}>
                  <CinematicGlobe className="h-full w-full" />
                </Suspense>
                <div className="pointer-events-none absolute bottom-2 left-0 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blink" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                    parametric model · 528 satellites
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero stats */}
          <div className="relative mt-4 grid grid-cols-2 gap-y-6 border-t border-white/[0.08] py-7 sm:grid-cols-4 lg:mt-0">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="px-0 sm:px-6 sm:first:pl-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold leading-none tracking-tight text-white">
                    {s.value}
                  </span>
                  <span className="font-mono text-[10px] text-signal/90">{s.unit}</span>
                </div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  {s.label}
                </div>
              </div>
            ))}
            <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-signal/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The short version                                                */}
      {/* ---------------------------------------------------------------- */}
      <Section id="overview">
        <Reveal>
          <SectionHeading
            eyebrow="The 30-second version"
            title="Four hops, every time you click."
            lede="A Starlink connection is a relay race with four legs. Everything else in this guide is a detail of one of them."
          />
        </Reveal>
        <Reveal delay={80} className="mt-10">
          <QuickSteps />
        </Reveal>

        <Reveal delay={60} className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <p className="text-[12px] text-muted">
            The whole round trip is roughly a quarter of a second — a bit more than a geostationary
            satellite needs to send a signal <em>one way</em>.
          </p>
          <LinkArrow href="#/numbers">See the physics</LinkArrow>
        </Reveal>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Signal path                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Section id="signal-path" grid className="border-y border-white/[0.06] bg-[#05080f]">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <Reveal>
            <SectionHeading
              eyebrow="Step by step"
              title="Follow a single request."
              lede="Click through the four stages of a Starlink connection. Switch to the laser route to see how traffic can cross an ocean without touching the ground."
            />
          </Reveal>
          <Reveal delay={80} className="lg:justify-self-end">
            <p className="max-w-sm text-[12px] leading-relaxed text-faint">
              Each leg happens in milliseconds, for thousands of users at once. The satellite is not
              a router in the internet sense — most of the time it is a very fast, very high relay.
            </p>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <SignalPath />
        </Reveal>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Why low orbit                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Section id="why-low">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-12">
          <Reveal className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow="Why low orbit wins"
              title="Altitude is a latency problem."
              lede="Light is fast, but the trip to a geostationary satellite is 35,786 km each way. Starlink sits about 65 times closer — which is why the delay disappears."
            />
            <div className="mt-7 space-y-4">
              {[
                {
                  t: "About 2 ms, not 239 ms",
                  d: "At 550 km a signal reaches the satellite in under two milliseconds. At GEO altitude the same trip takes almost a quarter of a second.",
                },
                {
                  t: "Coverage comes from motion",
                  d: "Each satellite sees a circle only a few thousand kilometres wide, so the constellation flies many shells of satellites past every point on Earth.",
                },
                {
                  t: "Low orbits clean up after themselves",
                  d: "There is still a trace of atmosphere at 550 km. A dead satellite's orbit decays and it burns up within a few years, rather than orbiting for centuries.",
                },
              ].map((item, i) => (
                <div key={item.t} className="flex gap-3">
                  <span className="mt-0.5 font-mono text-[10px] text-signal/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-medium text-ink">{item.t}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <LinkArrow href="#/numbers">Try the latency calculator</LinkArrow>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <OrbitScale />
          </Reveal>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Laser mesh                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Section id="mesh" grid className="border-y border-white/[0.06] bg-[#05080f]">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <Reveal>
            <SectionHeading
              eyebrow="The mesh in the sky"
              title="Satellites that talk to each other."
              lede="Newer Starlink satellites carry optical terminals: narrow laser beams aimed at their neighbours. Traffic can cross continents without a single ground station in between."
            />
          </Reveal>
          <Reveal delay={80} className="lg:justify-self-end">
            <p className="max-w-sm text-[12px] leading-relaxed text-faint">
              Light in vacuum travels about 47% faster than light in optical fibre, and a straight
              shot through space is often shorter than a cable route. Over long distances, that adds
              up to tens of milliseconds.
            </p>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <LaserMesh />
        </Reveal>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Handover                                                         */}
      {/* ---------------------------------------------------------------- */}
      <Section id="handover">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
          <Reveal>
            <SectionHeading
              eyebrow="Nothing you notice"
              title="A link that moves while you don't."
              lede="The satellite serving you is overhead for only a few minutes. Starlink keeps the connection alive by switching to the next one before the current one sets — a handover measured in milliseconds."
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {["make-before-break", "scheduled from orbit predictions", "no dish movement"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <HandoverDemo />
          </Reveal>
        </div>
      </Section>

      <StatsBand />

      {/* ---------------------------------------------------------------- */}
      {/* Chapters                                                         */}
      {/* ---------------------------------------------------------------- */}
      <Section id="chapters">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <SectionHeading
              eyebrow="The full explainer"
              title="Nine chapters, in order."
              lede="From the shape of the constellation to the physics of the delay. Read straight through, or jump to what you came for."
            />
          </Reveal>
          <Reveal delay={60}>
            <LinkArrow href="#/how-it-works">Read all chapters</LinkArrow>
          </Reveal>
        </div>
        <Reveal delay={80}>
          <ChapterGrid />
        </Reveal>
      </Section>

      <Section className="pt-0">
        <Reveal>
          <ExplorerTeaser />
        </Reveal>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ preview                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Section id="faq" className="border-t border-white/[0.06] bg-[#05080f]">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <Reveal>
            <SectionHeading
              eyebrow="Questions"
              title="The short answers."
              lede="The things people actually ask about satellite internet."
            />
            <div className="mt-6">
              <LinkArrow href="#/faq">All questions</LinkArrow>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <FaqAccordion limit={4} />
          </Reveal>
        </div>
      </Section>

      <Section className="py-16 md:py-20">
        <Reveal>
          <NextPageCTA
            eyebrow="Continue"
            title="Start at the beginning: the constellation."
            body="Why thousands of satellites, arranged in shells, all racing around the planet at 27,000 km/h."
            to="/how-it-works"
            section="constellation"
            cta="Chapter 01"
          />
        </Reveal>
      </Section>
    </>
  );
}
