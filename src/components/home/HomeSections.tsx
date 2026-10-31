import { CHAPTERS, CONSTELLATION_STATS } from "@/lib/content";
import { Link } from "@/lib/router";
import { ArrowIcon, ChapterNum, Eyebrow, Pill } from "@/components/site/primitives";
import { cn } from "@/utils/cn";

/* -------------------------------------------------------------------------- */
/* The 30-second version                                                      */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    n: "01",
    title: "Your terminal",
    body: "A flat panel on your roof steers a narrow radio beam at a satellite overhead. No motors — the beam is aimed electronically.",
    icon: (
      <g>
        <rect x="18" y="30" width="30" height="4" rx="2" fill="currentColor" opacity="0.9" />
        <path d="M28 34v8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M33 24c6-8 6-14 0-20" stroke="currentColor" strokeWidth="1.3" opacity="0.6" fill="none" />
        <path d="M38 27c9-11 9-20 0-28" stroke="currentColor" strokeWidth="1.1" opacity="0.35" fill="none" />
        <circle cx="44" cy="14" r="2" fill="currentColor" />
      </g>
    ),
  },
  {
    n: "02",
    title: "The satellite",
    body: "550 km up, a mass-produced spacecraft receives the signal, amplifies it and points it back down — a relay moving at 27,000 km/h.",
    icon: (
      <g>
        <rect x="24" y="20" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="22" width="12" height="8" fill="currentColor" opacity="0.25" />
        <rect x="43" y="22" width="12" height="8" fill="currentColor" opacity="0.25" />
        <path d="M24 20v-6h16v6" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
        <circle cx="32" cy="26" r="2" fill="currentColor" />
      </g>
    ),
  },
  {
    n: "03",
    title: "The gateway",
    body: "A ground station tracks the satellite, picks up your traffic and hands it to fibre — the internet you already know.",
    icon: (
      <g>
        <path d="M32 38V26" stroke="currentColor" strokeWidth="1.6" />
        <path d="M20 24c7-9 17-9 24 0" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M24 29c5-6 11-6 16 0" stroke="currentColor" strokeWidth="1.2" opacity="0.65" fill="none" />
        <circle cx="32" cy="26" r="2" fill="currentColor" />
        <path d="M14 40h36" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      </g>
    ),
  },
  {
    n: "04",
    title: "And back",
    body: "The reply races down the same chain in a few tens of milliseconds. A satellite in view for minutes, a link that never seems to drop.",
    icon: (
      <g>
        <path d="M14 34c6 0 6-16 18-16s12 16 18 16" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M44 28l6 6-6 6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="34" r="2.4" fill="currentColor" />
      </g>
    ),
  },
];

export function QuickSteps() {
  return (
    <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <div
          key={s.n}
          className="panel panel-hover group relative overflow-hidden p-5"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-signal/80">{s.n}</span>
            <svg viewBox="0 0 64 48" className="h-10 w-14 text-signal/60 transition-colors group-hover:text-signal" aria-hidden>
              {s.icon}
            </svg>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-white">{s.title}</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stats band                                                                 */
/* -------------------------------------------------------------------------- */

export function StatsBand() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.08] bg-[#05080f]">
      <div className="dot-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-signal/[0.07] blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-14 md:py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>The constellation, in numbers</Eyebrow>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Approximate · October 2026
          </span>
        </div>
        <div className="grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {CONSTELLATION_STATS.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "relative px-0 sm:px-6",
                i === 0 && "sm:pl-0",
                i === 3 && "sm:pr-0",
                i > 0 && "before:absolute before:left-0 before:top-1 before:hidden before:h-full before:w-px before:bg-white/10 sm:before:block",
              )}
            >
              <div className="text-[clamp(2rem,4vw,2.9rem)] font-semibold leading-none tracking-tight text-white">
                {s.value}
              </div>
              <div className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-signal/80">
                {s.label}
              </div>
              <p className="mt-2 max-w-[16rem] text-[11.5px] leading-relaxed text-faint">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-3xl text-[11px] leading-relaxed text-faint">
          Counts vary between tracking sources because satellites are launched, raise their orbits,
          fail and re-enter continuously. SpaceX has been lowering the primary shell from about 550
          km toward 480 km during 2026 to speed up deorbiting of defunct spacecraft.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chapter grid                                                               */
/* -------------------------------------------------------------------------- */

export function ChapterGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHAPTERS.map((c, i) => (
        <Link
          key={c.id}
          to="/how-it-works"
          section={c.id}
          className="group panel panel-hover flex flex-col justify-between p-5"
        >
          <div>
            <ChapterNum n={c.num} />
            <h3 className="mt-3 text-[15px] font-semibold leading-snug text-white">{c.title}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">{c.card}</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Chapter {c.num}
            </span>
            <ArrowIcon className="text-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-signal" />
          </div>
          {i === 0 && (
            <span className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-signal/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </Link>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Broadcast vs LEO comparison teaser                                         */
/* -------------------------------------------------------------------------- */

export function ComparisonTeaser() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-[#08131f] via-[#060c16] to-[#080914]">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-signal/[0.08] blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-8 p-7 md:grid-cols-[1.1fr_0.9fr] md:items-center md:p-12">
        <div>
          <Pill>Interactive · WebGL</Pill>
          <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-[1.1] tracking-tight text-white">
            Compare two very different satellite systems.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted md:text-[15px]">
            A six-stage 3D story contrasts a fixed TV broadcast dish with a two-way phased-array
            terminal. See their antennas, true orbital altitudes, light-time delay, a 600-satellite
            laser mesh, and the handoffs that keep a moving network connected.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/comparison"
              className="group inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-[13px] font-semibold text-[#04121a] transition-colors hover:bg-white"
            >
              Open the comparison
              <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              6 stages · 78-second tour · 600 satellites
            </span>
          </div>
        </div>

        <div className="relative">
          <svg viewBox="0 0 420 300" className="w-full" aria-hidden>
            <defs>
              <radialGradient id="et-earth" cx="42%" cy="34%">
                <stop offset="0%" stopColor="#1b5b70" />
                <stop offset="60%" stopColor="#0d2b3c" />
                <stop offset="100%" stopColor="#061320" />
              </radialGradient>
              <radialGradient id="et-glow">
                <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="210" cy="150" r="140" fill="url(#et-glow)" />
            <ellipse cx="210" cy="150" rx="86" ry="86" fill="url(#et-earth)" stroke="#2f7f8c" strokeOpacity="0.5" />
            <ellipse cx="210" cy="150" rx="86" ry="86" fill="none" stroke="#3ddbd9" strokeOpacity="0.18" />
            <path d="M124 150a86 86 0 0 0 172 0" fill="none" stroke="rgba(148,176,224,0.12)" />
            <ellipse cx="210" cy="150" rx="140" ry="40" fill="none" stroke="#22d3ee" strokeOpacity="0.35" transform="rotate(-18 210 150)" />
            <ellipse cx="210" cy="150" rx="140" ry="40" fill="none" stroke="#818cf8" strokeOpacity="0.3" transform="rotate(22 210 150)" />
            <ellipse cx="210" cy="150" rx="152" ry="46" fill="none" stroke="#fb923c" strokeOpacity="0.22" transform="rotate(66 210 150)" />
            {[
              [86, 132],
              [332, 168],
              [150, 88],
              [286, 210],
              [210, 62],
              [122, 218],
              [300, 108],
              [180, 240],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="7" fill="#3ddbd9" opacity="0.1" />
                <circle cx={x} cy={y} r="2.6" fill={i % 3 === 0 ? "#fbbf24" : "#7ee7e2"} />
              </g>
            ))}
            <circle cx="210" cy="150" r="168" fill="none" stroke="rgba(148,176,224,0.08)" strokeDasharray="2 8" />
            <text x="210" y="286" textAnchor="middle" style={{ fontSize: 8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 2 }} fill="#60799a">
              SCHEMATIC · NOT TO SCALE
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cross-page CTA strip                                                       */
/* -------------------------------------------------------------------------- */

export function NextPageCTA({
  eyebrow,
  title,
  body,
  to,
  section,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  to: string;
  section?: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-2.5 text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h3>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
      <Link
        to={to}
        section={section}
        className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-signal/40 bg-signal/10 px-5 py-2.5 text-[13px] font-medium text-signal transition-colors hover:bg-signal hover:text-[#04121a] sm:self-auto"
      >
        {cta}
        <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
