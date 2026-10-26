import { HandoverSim } from "@/components/handover/HandoverSim";
import { AntennaDiagram } from "@/components/handover/AntennaDiagram";
import { Eyebrow, LinkArrow, Reveal, SectionHeading } from "@/components/site/primitives";
import { NextPageCTA } from "@/components/home/HomeSections";
import { HONESTY_NOTES, SCIENCE_QA } from "@/lib/handoverContent";
import { ELEVATION_MASK_DEG, OBSERVER, SCENARIO } from "@/lib/handover";
import { Link } from "@/lib/router";

const BADGES = [
  "1,584-satellite shell",
  "72 orbital planes",
  "550 km · 53°",
  `${ELEVATION_MASK_DEG}° elevation mask`,
  "make-before-break",
  "phased-array steering",
];

const FLOW = [
  { n: "01", t: "SAT-A connected", bn: "A-এর সঙ্গে link" },
  { n: "02", t: "SAT-B becomes suitable", bn: "B উপযুক্ত হচ্ছে" },
  { n: "03", t: "Connection transfers", bn: "beam B-তে যাচ্ছে" },
  { n: "04", t: "SAT-B connected", bn: "B এখন active" },
  { n: "05", t: "SAT-C becomes suitable", bn: "C এগিয়ে আসছে" },
  { n: "06", t: "Connection transfers", bn: "B → C handover" },
];

export function Beam() {
  const first = SCENARIO.events[0];
  const second = SCENARIO.events[1];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-signal/[0.08] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>Handover lab</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.1rem,5.2vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
              How a Starlink dish switches
              <br />
              <span className="text-gradient">between satellites.</span>
            </h1>
            <p
              lang="bn"
              className="bangla mt-4 max-w-2xl text-[15px] leading-[1.9] text-signal/90 md:text-[16px]"
            >
              আকাশে ১,৫৮৪টি স্যাটেলাইট চলছে — বাস্তবে যেভাবে চলে। সেখান থেকে ডিশের beam কীভাবে
              এক স্যাটেলাইট ছেড়ে আরেকটিতে যায় (handover), সেটাই এখানে ধরে ধরে দেখা যায়।
            </p>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted md:text-[15px]">
              {OBSERVER.name}: one fixed dish, a whole LEO shell overhead. All 1,584 satellites of a
              Starlink-class shell are propagated from real orbital geometry, dozens are above the
              horizon at any moment, and the terminal hands the beam from one to the next roughly
              every minute. Switch to <span className="text-ink">Lesson</span> for the slower
              three-satellite A → B → C walkthrough of the same manoeuvre.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {BADGES.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <LinkArrow href="#handover-sim">Jump to the simulation</LinkArrow>
              <LinkArrow href="#dish">How the dish steers without moving</LinkArrow>
              <LinkArrow href="#/antenna">Steer the array yourself</LinkArrow>
            </div>
          </Reveal>
        </div>
      </section>

      <div id="handover-sim" className="page-shell scroll-mt-24 py-8 md:py-10">
        <Reveal>
          <HandoverSim />
        </Reveal>

        {/* flow strip ------------------------------------------------------ */}
        <div className="mt-10 md:mt-12">
          <Reveal>
            <SectionHeading
              eyebrow="One handover, five moves"
              title="Acquire → track → prepare → transfer → release."
              lede="The lesson room walks the loop with three named satellites (A → B → C). The full-sky room runs exactly the same moves, but against 1,584 candidates and a new one every minute."
            />
          </Reveal>
          <Reveal delay={60}>
            <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FLOW.map((f) => (
                <li
                  key={f.n}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3"
                >
                  <span className="font-mono text-[10px] text-signal">{f.n}</span>
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-right">
                    <span className="block text-[12px] text-ink">{f.t}</span>
                    <span lang="bn" className="bangla mt-0.5 block text-[11px] text-faint">
                      {f.bn}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              Lesson model: switches land at {Math.round(first?.tSec ?? 0)} s and{" "}
              {Math.round(second?.tSec ?? 0)} s of a {SCENARIO.durationSec} s loop. In the full-sky
              model the dish changes satellite roughly once a minute, and never below the{" "}
              {ELEVATION_MASK_DEG}° mask.
            </p>
          </Reveal>
        </div>

        {/* Dish close-up / antenna ---------------------------------------- */}
        <div id="dish" className="mt-12 scroll-mt-24 md:mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="Inside the dish"
              title="Nothing tilts. The signal does."
              lede="A Starlink terminal is a flat panel of patch antennas. Steering the beam means changing the phase of each element — not turning the hardware."
            />
          </Reveal>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-7">
            <Reveal>
              <AntennaDiagram />
            </Reveal>

            <Reveal delay={60}>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <h3 lang="bn" className="bangla-heading text-[14px] font-semibold text-white">
                    Electronic beam steering আসলে কী?
                  </h3>
                  <p lang="bn" className="bangla mt-2 text-[12.5px] leading-[1.9] text-muted">
                    ডিশের ভেতরে শত শত ছোট antenna element বসানো থাকে। প্রতিটি element থেকে একই
                    signal পাঠানো হয়, কিন্তু প্রতিটির phase সামান্য আলাদা। কোনো নির্দিষ্ট দিকে
                    তরঙ্গগুলো মিলে গিয়ে শক্তিশালী হয় (constructive interference), অন্য দিকে
                    দুর্বল হয়ে যায়। ফলে element-গুলোর phase বদলালেই beam-এর দিক বদলায় —
                    কোনো মোটর, কোনো ঘোরানো অংশ লাগে না।
                  </p>
                </div>

                <div className="rounded-2xl border border-warn/25 bg-warn/[0.05] p-4">
                  <h3 lang="bn" className="bangla-heading text-[13.5px] font-semibold text-warn">
                    যান্ত্রিক দিক ও handover এক নয়
                  </h3>
                  <p lang="bn" className="bangla mt-2 text-[12px] leading-[1.9] text-muted">
                    সাধারণ Starlink dish-টি ইনস্টল করার সময় একটি নির্দিষ্ট tilt-এ বসানো হয় এবং
                    এরপর আর ঘোরে না। satellite track করা এবং handover — দুটোই ঘটে electronic beam
                    steering-এ। handover-এর সময় পুরো dish মোটরে ঘুরে satellite অনুসরণ করে — এটি
                    ভুল ধারণা।
                  </p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-warn/80">
                    not a motorised tracking dish
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <h3 lang="bn" className="bangla-heading text-[13.5px] font-semibold text-white">
                    Elevation, visibility আর connection-এর সম্পর্ক
                  </h3>
                  <p lang="bn" className="bangla mt-2 text-[12px] leading-[1.9] text-muted">
                    elevation কমলে satellite আরও দূরে, দিগন্তের কাছে থাকে — বাতাস ও বাধা বেশি,
                    signal দুর্বল। তাই {ELEVATION_MASK_DEG}°-এর নিচের satellite ব্যবহার করা হয় না।
                    আরও গুরুত্বপূর্ণ: শুধু “নিকটতম” satellite নয়, visibility, elevation, capacity,
                    routing — সব মিলিয়ে ঠিক হয় কোন satellite-এ beam যাবে।
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Science Q&A ---------------------------------------------------- */}
        <div className="mt-12 md:mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="বাংলায় বিজ্ঞান"
              title="প্রশ্ন ও উত্তর।"
              lede="The six questions students ask first, answered in Bangla — each one tied to something happening in the simulation above."
            />
          </Reveal>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {SCIENCE_QA.map((qa, i) => (
              <Reveal key={qa.q} delay={i * 40}>
                <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-[9px] text-signal/80">0{i + 1}</span>
                    <div>
                      <h3 lang="bn" className="bangla-heading text-[13.5px] font-semibold text-white">
                        {qa.q}
                      </h3>
                      <p lang="bn" className="bangla mt-1.5 text-[12px] leading-[1.9] text-muted">
                        {qa.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Honesty -------------------------------------------------------- */}
        <div className="mt-12 md:mt-16">
          <Reveal>
            <SectionHeading
              eyebrow="মডেল সম্পর্কে সৎ কথা"
              title="What is real here, what is simplified."
              lede="Every shortcut is labelled, because a teaching model that pretends to be telemetry teaches the wrong thing."
            />
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {HONESTY_NOTES.map((h, i) => (
              <Reveal key={h.t} delay={i * 40}>
                <div className="h-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-signal/70">0{i + 1}</span>
                    <h3 lang="bn" className="bangla-heading text-[12.5px] font-medium text-ink">
                      {h.t}
                    </h3>
                  </div>
                  <p lang="bn" className="bangla mt-1.5 text-[11.5px] leading-[1.85] text-muted">
                    {h.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={80}>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-signal/20 bg-signal/[0.04] px-4 py-3">
              <p lang="bn" className="bangla text-[11.5px] leading-[1.85] text-muted">
                এখানে দেখানো সব মান simulation-generated example — বাস্তব satellite telemetry নয়।
                SpaceX-এর প্রকৃত handover ও scheduling algorithm প্রকাশ্য নয়, এবং পরিস্থিতিভেদে
                তা ভিন্নভাবে কাজ করতে পারে।
              </p>
              <div className="ml-auto flex items-center gap-4">
                <LinkArrow href="#/explorer">See the whole fleet</LinkArrow>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Go deeper ------------------------------------------------------ */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
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
                <Link to="/antenna" className="block text-[12px] text-muted hover:text-signal">
                  Array lab — steer the beam yourself
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h3 className="text-[13px] font-medium text-white">The numbers used in this simulation</h3>
              <dl className="mt-3 space-y-2 text-[11px]">
                {[
                  ["Earth radius", "6,371 km"],
                  ["Shell altitude", "550 km"],
                  ["Elevation mask", `${ELEVATION_MASK_DEG}°`],
                  ["Handover floor", "40°"],
                  ["Simulated switch 1", `${Math.round(first?.tSec ?? 0)} s`],
                  ["Simulated switch 2", `${Math.round(second?.tSec ?? 0)} s`],
                  ["Observer", `${OBSERVER.latLabel} ${OBSERVER.lonLabel}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-1.5 last:border-0 last:pb-0">
                    <dt className="text-faint">{k}</dt>
                    <dd className="font-mono text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 md:mt-16">
          <Reveal>
            <NextPageCTA
              eyebrow="Next"
              title="Now put it on a spinning planet."
              body="Zoom out from this one dish to the whole constellation: four shells, orbital planes, gateways, laser links and thousands of satellites moving at once."
              to="/explorer"
              cta="Open the 3D explorer"
            />
          </Reveal>
        </div>
      </div>
    </>
  );
}
