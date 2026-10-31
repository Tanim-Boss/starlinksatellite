import { useEffect, useState, type ReactNode } from "react";
import {
  EARTH_RADIUS_KM,
  SHELLS,
  orbitalPeriodSec,
  orbitalVelocityKmS,
} from "@/lib/astro";
import { CHAPTERS } from "@/lib/content";
import {
  ChapterNum,
  Eyebrow,
  LinkArrow,
  Reveal,
  SectionHeading,
} from "@/components/site/primitives";
import { SatelliteAnatomy } from "@/components/diagrams/SatelliteAnatomy";
import { PhasedArray } from "@/components/diagrams/PhasedArray";
import { SpotBeams } from "@/components/diagrams/SpotBeams";
import { CoverageMap } from "@/components/diagrams/CoverageMap";
import { ShellDiagram } from "@/components/diagrams/ShellDiagram";
import { LaserMesh } from "@/components/diagrams/LaserMesh";
import { HandoverDemo } from "@/components/diagrams/HandoverDemo";
import { PassTimeline } from "@/components/diagrams/PassTimeline";
import { LatencyBudget } from "@/components/diagrams/LatencyBudget";
import { NextPageCTA } from "@/components/home/HomeSections";
import { Link } from "@/lib/router";

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

const A_KM = EARTH_RADIUS_KM + 550;
const V_KM_S = orbitalVelocityKmS(A_KM);
const PERIOD_MIN = orbitalPeriodSec(A_KM) / 60;

const Chapter = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => (
  <article id={id} className="scroll-mt-28 border-t border-white/[0.08] py-14 first:border-0 first:pt-0 md:py-16">
    {children}
  </article>
);

const ChapterHeader = ({
  num,
  title,
  lede,
}: {
  num: string;
  title: string;
  lede: string;
}) => (
  <Reveal>
    <ChapterNum n={num} />
    <h2 className="mt-3 text-[clamp(1.6rem,3.4vw,2.3rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-white">
      {title}
    </h2>
    <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted md:text-[15.5px] md:leading-[1.7]">
      {lede}
    </p>
  </Reveal>
);

const Prose = ({ children }: { children: ReactNode }) => (
  <div className="max-w-2xl space-y-4 text-[14px] leading-[1.75] text-muted md:text-[14.5px]">
    {children}
  </div>
);

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] text-ink">{value}</div>
    </div>
  );
}

/** Scroll-spy for the chapter rail. */
function useActiveChapter(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    // Chapter navigation remains usable without scroll-spy support; the first
    // chapter simply stays highlighted instead of failing the whole page.
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

export function HowItWorks() {
  const active = useActiveChapter(CHAPTER_IDS);

  return (
    <>
      {/* Page header */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-signal/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-12">
          <Reveal>
            <Eyebrow>The full explainer</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5.4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
              The whole system, <span className="text-gradient">one layer at a time.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              Nine chapters, from the shape of the constellation to the milliseconds at the end.
              Each one stands alone, but together they describe a single journey your data makes
              several times a second.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {["~14 min read", "9 chapters", "physics + published parameters"].map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {m}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="page-shell">
        <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
          {/* Chapter rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 py-16">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">Chapters</p>
              <nav className="mt-4 space-y-0.5">
                {CHAPTERS.map((c) => (
                  <Link
                    key={c.id}
                    to="/how-it-works"
                    section={c.id}
                    className={`group flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                      active === c.id ? "bg-white/[0.04] text-signal" : "text-muted hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-[9px] text-faint">{c.num}</span>
                    {c.short}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <LinkArrow href="#/comparison">Open the satellite comparison</LinkArrow>
              </div>
            </div>
          </aside>

          {/* Chapters. A <section>, not a nested <main>: there is already one
              landmark in App, and nesting them is invalid HTML. */}
          <div className="pb-4">
            {/* Mobile chapter strip */}
            <div className="sticky top-16 z-30 -mx-5 border-b border-white/[0.06] bg-[#04060d]/95 px-5 py-2 backdrop-blur-md lg:hidden">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {CHAPTERS.map((c) => (
                  <Link
                    key={c.id}
                    to="/how-it-works"
                    section={c.id}
                    className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
                      active === c.id
                        ? "border-signal/50 bg-signal/10 text-signal"
                        : "border-white/10 text-faint"
                    }`}
                  >
                    {c.num} {c.short}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-2 lg:pt-16">
              {/* 01 */}
              <Chapter id="constellation">
                <ChapterHeader
                  num={CHAPTERS[0].num}
                  title={CHAPTERS[0].title}
                  lede={CHAPTERS[0].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <div className="grid gap-6 lg:grid-cols-[1fr_318px] lg:items-start">
                    <Prose>
                      <p>
                        A single satellite in low Earth orbit is above you for a few minutes and
                        then gone. To keep an entire planet covered, Starlink arranges its fleet in{" "}
                        <span className="text-ink">shells</span>: groups of satellites sharing an
                        altitude and an inclination, spread across many orbital{" "}
                        <span className="text-ink">planes</span> like segments of an orange.
                      </p>
                      <p>
                        Each plane is a ring of satellites, evenly spaced. A satellite in one plane
                        holds its distance from its neighbours, so the constellation behaves like a
                        rigid grid that rotates overhead. Cross one plane with another and you get a
                        mesh that covers every latitude within its inclination limit.
                      </p>
                      <p>
                        Inclination is the tilt of the plane relative to the equator, and it decides
                        what the shell can serve. The main 53° shells cover most of the populated
                        world. Near-polar shells exist because a 53° orbit simply never passes
                        overhead north of 53° — and those polar planes crowd together as they
                        converge, covering the last latitudes efficiently.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <StatPill label="Published shells" value="4 families" />
                        <StatPill label="Main shell" value="550 km / 53°" />
                        <StatPill label="New altitude" value="~480 km" />
                      </div>
                    </Prose>
                    <ShellDiagram />
                  </div>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          {["Shell", "Altitude", "Inclination", "Planes", "Sats/plane", "Total"].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-faint"
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {SHELLS.map((sh) => (
                          <tr key={sh.key} className="border-t border-white/[0.06]">
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-2 text-[12px] text-ink">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: sh.color }} />
                                {sh.short}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{sh.altitudeKm} km</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{sh.inclinationDeg}°</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{sh.planes}</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{sh.satsPerPlane}</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-ink">
                              {sh.totalSats.toLocaleString("en-US")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    <p className="border-t border-white/[0.06] bg-white/[0.015] px-3 py-2.5 text-[10px] leading-relaxed text-faint">
                      Published Gen1 shell parameters, as authorised by the FCC. The operational
                      constellation has evolved since — altitudes have shifted downward and newer
                      satellites are larger — but the architecture is the same.
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={100} className="mt-6">
                  <CoverageMap />
                </Reveal>
              </Chapter>

              {/* 02 */}
              <Chapter id="orbit">
                <ChapterHeader
                  num={CHAPTERS[1].num}
                  title={CHAPTERS[1].title}
                  lede={CHAPTERS[1].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <Prose>
                      <p>
                        Starlink satellites do not hover. They fall around Earth continuously at
                        about <span className="text-ink">7.6 km/s</span> — roughly 27,000 km/h —
                        completing a lap every <span className="text-ink">95 minutes</span> — about
                        15 orbits a day. Nothing you have ever travelled in moves this fast.
                      </p>
                      <p>
                        The altitude is a compromise. Lower means less latency and a satellite that
                        re-enters the atmosphere quickly when it dies. It also means a smaller
                        footprint per satellite, so you need more of them. Higher means wider
                        coverage with fewer spacecraft, but a longer round trip for every packet and
                        satellites that linger as debris for decades.
                      </p>
                      <p>
                        SpaceX has been lowering the primary shell from about 550 km toward 480 km
                        during 2026. The stated reasons are space safety and faster disposal: at
                        lower altitude, drag brings a failed satellite down in years rather than
                        decades.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <StatPill label="Circular velocity" value={`${V_KM_S.toFixed(2)} km/s`} />
                        <StatPill label="Orbital period" value={`${PERIOD_MIN.toFixed(1)} min`} />
                        <StatPill label="Laps per day" value={`${(1440 / PERIOD_MIN).toFixed(1)}`} />
                        <StatPill label="Altitude" value="550 → 480 km" />
                      </div>
                    </Prose>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#060b16] p-5">
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                        The two equations
                      </h3>
                      <div className="mt-4 space-y-4 font-mono text-[12px]">
                        <div>
                          <div className="text-signal">v = √(μ / r)</div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
                            μ = 398,600 km³/s², r = 6,921 km → {V_KM_S.toFixed(2)} km/s
                          </p>
                        </div>
                        <div>
                          <div className="text-signal">T = 2π √(r³ / μ)</div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
                            → {PERIOD_MIN.toFixed(1)} minutes per orbit
                          </p>
                        </div>
                        <div>
                          <div className="text-signal">λ = arccos(R / (R + h))</div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
                            footprint half-angle ≈ 23° at 550 km
                          </p>
                        </div>
                      </div>
                      <p className="mt-5 border-t border-white/[0.08] pt-4 text-[11px] leading-relaxed text-muted">
                        These three equations explain most of the design: speed, revisit time and
                        coverage. Everything else is engineering and radio.
                      </p>
                      <div className="mt-4">
                        <LinkArrow href="#/comparison">Compare orbit and latency</LinkArrow>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </Chapter>

              {/* 03 */}
              <Chapter id="satellite">
                <ChapterHeader
                  num={CHAPTERS[2].num}
                  title={CHAPTERS[2].title}
                  lede={CHAPTERS[2].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <SatelliteAnatomy />
                </Reveal>
                <Reveal delay={80} className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      t: "Built like aircraft, not like science",
                      d: "Flat-packed, mass-produced and launched in batches of roughly 20–30, so each spacecraft is closer to a consumer product than a one-off instrument.",
                    },
                    {
                      t: "It decides a lot on its own",
                      d: "Onboard software points beams, schedules traffic and performs autonomous collision avoidance using tracked objects and its own propulsion.",
                    },
                    {
                      t: "It is designed to die",
                      d: "At end of life the satellite uses its thruster to lower its orbit and burn up — leaving nothing behind but a short-lived streak.",
                    },
                  ].map((c) => (
                    <div key={c.t} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <h3 className="text-[13px] font-medium text-ink">{c.t}</h3>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.d}</p>
                    </div>
                  ))}
                </Reveal>
              </Chapter>

              {/* 04 */}
              <Chapter id="terminal">
                <ChapterHeader
                  num={CHAPTERS[3].num}
                  title={CHAPTERS[3].title}
                  lede={CHAPTERS[3].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <PhasedArray />
                </Reveal>
                <Reveal delay={80} className="mt-6">
                  <Prose>
                    <p>
                      The terminal is the part you can actually see, and it looks almost
                      disappointingly simple: a flat rectangle on a pole. Inside is a grid of small
                      antenna elements, each fed the same signal with a slightly different delay.
                      Because the waves interfere, the array radiates strongly in one direction and
                      cancels itself elsewhere. Change the delays and the beam swings — in
                      microseconds, with nothing mechanical to wear out.
                    </p>
                    <p>
                      That speed matters: the satellite crosses the sky fast, and the terminal also
                      has to follow the network&apos;s schedule of which satellite to talk to next. A
                      motorised dish could never keep up with that agility, let alone do it for
                      thousands of users per satellite.
                    </p>
                    <p>
                      What the terminal cannot do is see through things. Trees, buildings and even
                      heavy rain in the wrong direction interrupt the link. Installation is mostly
                      about finding a clear cone of sky.
                    </p>
                  </Prose>
                </Reveal>
              </Chapter>

              {/* 05 */}
              <Chapter id="radio">
                <ChapterHeader
                  num={CHAPTERS[4].num}
                  title={CHAPTERS[4].title}
                  lede={CHAPTERS[4].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <SpotBeams />
                </Reveal>
                <Reveal delay={80} className="mt-6">
                  <Prose>
                    <p>
                      Your terminal talks to the satellite in the Ku band — roughly 10.7–12.7 GHz
                      downlink and 14.0–14.5 GHz uplink. The gateway link uses the higher Ka band,
                      where more bandwidth is available and the ground antenna can be pointed
                      precisely.
                    </p>
                    <p>
                      The satellite does not broadcast one big signal over its whole footprint. It
                      paints dozens of narrow spot beams, each a cell of a few tens of kilometres.
                      Neighbouring cells use different frequency sub-bands to avoid interference;
                      the same sub-bands are then reused in cells far enough apart. This is the same
                      trick your phone uses, turned inside out.
                    </p>
                    <p>
                      Capacity is the consequence. Everyone in one cell shares that cell&apos;s slice
                      of the satellite&apos;s throughput, and as the satellite moves the cells move
                      with it. In a city with many terminals per cell, the shared slice runs out; in
                      the countryside it is barely used.
                    </p>
                  </Prose>
                </Reveal>
              </Chapter>

              {/* 06 */}
              <Chapter id="gateways">
                <ChapterHeader
                  num={CHAPTERS[5].num}
                  title={CHAPTERS[5].title}
                  lede={CHAPTERS[5].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                    <Prose>
                      <p>
                        The satellite&apos;s main job is not to be the internet. It is to be the
                        wire between you and the internet. Most traffic goes up to the spacecraft,
                        across to a{" "}
                        <span className="text-ink">gateway</span> — a ground station with large
                        tracking antennas — and down into fibre within a few hundred kilometres.
                      </p>
                      <p>
                        Gateways need power, a clear view of the sky and, critically, a fibre
                        connection to an internet exchange. A gateway in the middle of an ocean or a
                        desert is useless without backhaul. This is why coverage maps and gateway
                        maps are not the same thing.
                      </p>
                      <p>
                        The ground segment also handles the unglamorous parts: billing,
                        authentication, spectrum coordination, peering agreements and the routing
                        decisions that decide which path your packets take.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <StatPill label="User link" value="Ku band" />
                        <StatPill label="Gateway link" value="Ka band" />
                        <StatPill label="Distance to fibre" value="a few hundred km" />
                      </div>
                    </Prose>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#060b16] p-4">
                      <svg viewBox="0 0 380 300" className="w-full" role="img" aria-label="A Starlink gateway site with antennas connected to a fibre network">
                        <defs>
                          <linearGradient id="gw-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#070f1b" />
                            <stop offset="100%" stopColor="#040a12" />
                          </linearGradient>
                        </defs>
                        <rect width="380" height="300" rx="10" fill="url(#gw-sky)" />
                        {/* satellite */}
                        <g transform="translate(190 46)">
                          <rect x="-34" y="-7" width="16" height="14" rx="2" fill="#10293a" stroke="#3ddbd9" />
                          <rect x="18" y="-7" width="16" height="14" rx="2" fill="#10293a" stroke="#3ddbd9" />
                          <rect x="-12" y="-9" width="24" height="18" rx="3" fill="#14394a" stroke="#7ee7e2" strokeWidth="1.3" />
                          <text y="-20" textAnchor="middle" style={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#6f8ea8">
                            SATELLITE
                          </text>
                        </g>
                        {/* beams */}
                        <path d="M176 66 L 92 208" stroke="#3ddbd9" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.75" />
                        <path d="M204 66 L 288 208" stroke="#3ddbd9" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.75" />
                        {/* ground */}
                        <path d="M0 236 H380 V300 H0 Z" fill="#07131c" />
                        <line x1="0" y1="236" x2="380" y2="236" stroke="#254e63" />
                        {/* antenna farm */}
                        <g transform="translate(92 214)">
                          <path d="M0 22 V6" stroke="#7dd3fc" strokeWidth="2" />
                          <path d="M-16 6 A 16 16 0 0 1 16 6" fill="none" stroke="#7dd3fc" strokeWidth="1.6" />
                          <circle cx="0" cy="6" r="2.2" fill="#7dd3fc" />
                        </g>
                        <g transform="translate(288 214)">
                          <path d="M0 22 V6" stroke="#7dd3fc" strokeWidth="2" />
                          <path d="M-16 6 A 16 16 0 0 1 16 6" fill="none" stroke="#7dd3fc" strokeWidth="1.6" />
                          <circle cx="0" cy="6" r="2.2" fill="#7dd3fc" />
                        </g>
                        <ellipse cx="190" cy="230" rx="120" ry="16" fill="rgba(61,219,217,0.04)" stroke="rgba(61,219,217,0.14)" />
                        <text x="190" y="256" textAnchor="middle" style={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#5b7791">
                          GATEWAY SITE
                        </text>
                        {/* fibre */}
                        <path d="M92 238 Q 190 270 288 238" fill="none" stroke="#a3e635" strokeWidth="1.6" />
                        <path d="M190 266 V292" stroke="#a3e635" strokeWidth="2" strokeDasharray="4 4" />
                        <text x="190" y="286" textAnchor="middle" style={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#86a838">
                          FIBRE TO INTERNET
                        </text>
                      </svg>
                      <p className="mt-2 px-1 text-[10px] leading-relaxed text-faint">
                        A gateway is a hand-off. The satellite relays between your terminal and an
                        antenna that is already wired into the internet.
                      </p>
                    </div>
                  </div>
                </Reveal>
              </Chapter>

              {/* 07 */}
              <Chapter id="lasers">
                <ChapterHeader
                  num={CHAPTERS[6].num}
                  title={CHAPTERS[6].title}
                  lede={CHAPTERS[6].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <LaserMesh />
                </Reveal>
                <Reveal delay={80} className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      t: "How the link works",
                      d: "A narrow infrared beam is aimed at a telescope on a neighbouring satellite. Both ends must hold pointing to a fraction of a degree while moving at 7.6 km/s.",
                    },
                    {
                      t: "Why it helps",
                      d: "Traffic can cross an ocean or a desert with no gateway underneath, extending service over regions that have no fibre at all.",
                    },
                    {
                      t: "What it doesn't fix",
                      d: "Lasers add weight, power draw and complexity, and they still need a ground gateway at each end to reach the internet.",
                    },
                  ].map((c) => (
                    <div key={c.t} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <h3 className="text-[13px] font-medium text-ink">{c.t}</h3>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.d}</p>
                    </div>
                  ))}
                </Reveal>
              </Chapter>

              {/* 08 */}
              <Chapter id="handover">
                <ChapterHeader
                  num={CHAPTERS[7].num}
                  title={CHAPTERS[7].title}
                  lede={CHAPTERS[7].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <HandoverDemo />
                  <div className="mt-6"><PassTimeline /></div>
                </Reveal>
                <Reveal delay={80} className="mt-6">
                  <Prose>
                    <p>
                      A pass lasts a handful of minutes. As one satellite sinks toward the horizon,
                      another is already climbing. The ground segment and the satellite schedule the
                      next link in advance — a <span className="text-ink">make-before-break</span>{" "}
                      switch — so packets are already flowing on the new path before the old one is
                      released.
                    </p>
                    <p>
                      If the next satellite is obstructed, congested or briefly unavailable, the
                      terminal picks a different one or waits for the next pass. That is why a
                      poorly sited dish shows short outages even though the sky is full of
                      spacecraft: the handover has nowhere good to go.
                    </p>
                  </Prose>
                </Reveal>
              </Chapter>

              {/* 09 */}
              <Chapter id="latency">
                <ChapterHeader
                  num={CHAPTERS[8].num}
                  title={CHAPTERS[8].title}
                  lede={CHAPTERS[8].lede}
                />
                <Reveal delay={60} className="mt-8">
                  <LatencyBudget />
                </Reveal>
                <Reveal delay={80} className="mt-6">
                  <Prose>
                    <p>
                      The speed of light is 299,792 km/s in vacuum and roughly 200,000 km/s in
                      optical fibre. That difference is the entire reason a low-orbit network can
                      beat a terrestrial one over long distances — and the reason it can never beat
                      a local fibre loop.
                    </p>
                    <p>
                      For a video call or a game, what matters is round-trip time and its variance.
                      Starlink&apos;s typical 25–60 ms is in the same league as many fixed
                      connections. The variance is the interesting part: a handover, a congested
                      cell or a rain shower can all add jitter that a cable never sees.
                    </p>
                    <p>
                      Finally, remember that the biggest delay is often not the sky at all. It is
                      the distance from the gateway to the server, and the queueing inside it.
                    </p>
                  </Prose>
                  <div className="mt-5">
                    <LinkArrow href="#/comparison">Compare the round-trip delay</LinkArrow>
                  </div>
                </Reveal>
              </Chapter>

              {/* Closing */}
              <div className="border-t border-white/[0.08] py-14">
                <Reveal>
                  <SectionHeading
                    eyebrow="Caveats"
                    title="What this system is not."
                    lede="A realistic picture matters more than a flattering one."
                  />
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        t: "Not a replacement for every network",
                        d: "In dense cities, fibre is cheaper per bit, faster and more reliable. Starlink's advantage is geography, not raw performance.",
                      },
                      {
                        t: "Not weather-proof",
                        d: "Heavy rain and snow can attenuate the Ku-band link. The terminal also has to melt snow and ice, using extra power.",
                      },
                      {
                        t: "Not free of the ground",
                        d: "Gateways, power, spectrum licences and local regulation all remain. Coverage is political as well as physical.",
                      },
                      {
                        t: "Not static",
                        d: "Altitudes, satellite generations and the regulatory picture change quickly. Treat every number here as a snapshot.",
                      },
                    ].map((c) => (
                      <div key={c.t} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <h3 className="text-[13px] font-medium text-ink">{c.t}</h3>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.d}</p>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>

              <div className="pb-16">
                <Reveal>
                  <NextPageCTA
                    eyebrow="Next"
                    title="Compare the two satellite systems."
                    body="Watch the fixed TV broadcast beam, low-orbit handoffs, latency and laser mesh in a guided 3D story."
                    to="/comparison"
                    cta="Open the comparison"
                  />
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
