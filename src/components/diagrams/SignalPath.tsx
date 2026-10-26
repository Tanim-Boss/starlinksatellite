import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

type Mode = "relay" | "laser";

const STEPS = [
  {
    key: "uplink",
    label: "1 · Uplink",
    title: "Your terminal sends the request",
    body: "A flat phased array on your roof steers a narrow Ku-band beam at the satellite overhead. The beam is aimed electronically — no motors move.",
  },
  {
    key: "satellite",
    label: "2 · Relay",
    title: "The satellite receives and re-transmits",
    body: "The satellite amplifies the signal, shifts its frequency and points it back down — a “bent pipe” in the sky. It also decides which gateway or laser route to use next.",
  },
  {
    key: "gateway",
    label: "3 · Gateway",
    title: "A ground station joins the internet",
    body: "A gateway antenna tracks the satellite and hands the traffic to fibre. From there it travels the ordinary internet backbone to the server you asked for.",
  },
  {
    key: "return",
    label: "4 · Return",
    title: "And the whole trip happens in reverse",
    body: "The reply comes back through the same chain in a few tens of milliseconds. Everything below happens many times a second, for every user on the satellite.",
  },
] as const;

/**
 * Illustrated end-to-end signal path. Steps highlight each leg; a laser mode
 * shows traffic hopping satellite-to-satellite instead of dropping to a
 * gateway in the same region.
 */
export function SignalPath() {
  const [mode, setMode] = useState<Mode>("relay");
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 5200);
    return () => window.clearInterval(t);
  }, [paused]);

  const active = STEPS[step].key;
  const show = (key: string) => active === key;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#060b16]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-signal/30 bg-signal/10 font-mono text-[10px] text-signal">
            ↔
          </span>
          <h3 className="text-sm font-semibold text-white">The full signal path</h3>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          {(
            [
              { id: "relay", label: "Via gateway" },
              { id: "laser", label: "Via laser mesh" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setPaused(true);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                mode === m.id ? "bg-signal/15 text-signal" : "text-faint hover:text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="figure-scroll signal-path-figure">
        <svg viewBox="0 0 900 470" className="w-full" role="img" aria-label="Diagram of a Starlink signal path from a user terminal up to a satellite, down to a gateway and into the internet">
          <defs>
            <linearGradient id="space-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#08111f" />
              <stop offset="100%" stopColor="#050a13" />
            </linearGradient>
            <linearGradient id="earth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d2438" />
              <stop offset="100%" stopColor="#071421" />
            </linearGradient>
            <linearGradient id="beam-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="node-glow">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </radialGradient>
            <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0H0V60" fill="none" stroke="rgba(140,170,220,0.07)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="900" height="470" fill="url(#space-fade)" />
          <rect width="900" height="470" fill="url(#map-grid)" />

          {/* Stars */}
          {[
            [60, 52],
            [140, 108],
            [232, 66],
            [300, 150],
            [610, 48],
            [720, 96],
            [840, 58],
            [385, 42],
            [500, 108],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#cfe9ff" opacity={0.5} />
          ))}

          {/* Earth limb */}
          <path d="M-40 470 Q 450 366 940 470 Z" fill="url(#earth-fill)" />
          <path d="M-40 470 Q 450 366 940 470" fill="none" stroke="#1d4c63" strokeWidth="1.4" />
          <path
            d="M-40 470 Q 450 366 940 470"
            fill="none"
            stroke="#3ddbd9"
            strokeOpacity="0.35"
            strokeWidth="0.7"
          />

          {/* Ground content: house / terminal */}
          <g>
            <g transform="translate(196 388)">
              <path d="M0 30 L0 72 L92 72 L92 30 Z" fill="#0d1a2b" stroke="#2f4a6b" strokeWidth="1.2" />
              <path d="M-8 34 L46 0 L100 34" fill="none" stroke="#33526f" strokeWidth="2" strokeLinejoin="round" />
              <rect x="38" y="44" width="16" height="28" fill="#13293d" stroke="#2f4a6b" />
              {/* terminal */}
              <g transform="translate(80 12)">
                <rect x="-16" y="-4" width="32" height="7" rx="3" fill="#10283a" stroke="#3ddbd9" strokeWidth="1.3" />
                <rect x="-2" y="3" width="4" height="9" fill="#2c4a63" />
              </g>
            </g>
            <text x="242" y="410" className="fill-[#7d90ad]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }}>
              USER TERMINAL
            </text>
          </g>

          {/* Gateway */}
          <g transform="translate(694 400)">
            <rect x="-34" y="26" width="68" height="34" rx="3" fill="#0d1a2b" stroke="#2f4a6b" strokeWidth="1.1" />
            <path d="M-22 26 L-22 8 L22 8 L22 26" fill="none" stroke="#33526f" strokeWidth="1.2" />
            <g transform="translate(0 -2)">
              <path d="M-22 0 Q 0 -22 22 0" fill="none" stroke="#7dd3fc" strokeWidth="1.4" />
              <path d="M-14 6 Q 0 -8 14 6" fill="none" stroke="#7dd3fc" strokeWidth="1.1" opacity="0.75" />
              <circle cx="0" cy="10" r="2.6" fill="#7dd3fc" />
            </g>
            <text x="0" y="86" textAnchor="middle" className="fill-[#7d90ad]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }}>
              GATEWAY
            </text>
          </g>

          {/* Internet / data centre */}
          <g transform="translate(806 250)">
            <rect x="-30" y="-28" width="60" height="54" rx="6" fill="#0b1626" stroke="#3f5e86" strokeWidth="1.2" />
            {[-16, -6, 4, 14].map((y) => (
              <g key={y}>
                <rect x="-22" y={y - 12} width="44" height="7" rx="1.5" fill="#132437" stroke="#2f4a6b" strokeWidth="0.8" />
                <circle cx="-16" cy={y - 8.5} r="1.3" fill="#7dd3fc" />
                <circle cx="-11" cy={y - 8.5} r="1.3" fill="#3ddbd9" />
              </g>
            ))}
            <text x="0" y="46" textAnchor="middle" className="fill-[#7d90ad]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }}>
              INTERNET
            </text>
          </g>

          {/* Satellite */}
          <g transform="translate(452 158)">
            <circle r="64" fill="url(#node-glow)" opacity={show("satellite") ? 1 : 0.4} />
            <g transform="rotate(-8)">
              <rect x="-34" y="-11" width="20" height="22" rx="2" fill="#13293d" stroke="#4d7fa8" strokeWidth="1.1" />
              <rect x="14" y="-11" width="20" height="22" rx="2" fill="#13293d" stroke="#4d7fa8" strokeWidth="1.1" />
              <rect x="-44" y="-6" width="10" height="12" fill="#1b3a52" stroke="#5b8db6" strokeWidth="0.8" />
              <rect x="34" y="-6" width="10" height="12" fill="#1b3a52" stroke="#5b8db6" strokeWidth="0.8" />
              <rect x="-14" y="-13" width="28" height="26" rx="3" fill="#1b3448" stroke="#8fc7ea" strokeWidth="1.3" />
              <rect x="-9" y="13" width="18" height="5" rx="2" fill="#0f2233" stroke="#3ddbd9" strokeWidth="0.9" />
              <circle cx="0" cy="0" r="2.4" fill="#3ddbd9" opacity="0.9" />
            </g>
            <text x="0" y="-46" textAnchor="middle" className="fill-[#8fb3d4]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }}>
              STARLINK
            </text>
          </g>

          {/* Second satellite for laser mode */}
          {mode === "laser" && (
            <g transform="translate(642 116)">
              <g transform="rotate(6) scale(0.8)">
                <rect x="-34" y="-11" width="20" height="22" rx="2" fill="#13293d" stroke="#4d7fa8" strokeWidth="1.2" />
                <rect x="14" y="-11" width="20" height="22" rx="2" fill="#13293d" stroke="#4d7fa8" strokeWidth="1.2" />
                <rect x="-14" y="-13" width="28" height="26" rx="3" fill="#1b3448" stroke="#8fc7ea" strokeWidth="1.4" />
                <rect x="-9" y="13" width="18" height="5" rx="2" fill="#0f2233" stroke="#a78bfa" strokeWidth="1" />
              </g>
            </g>
          )}

          {/* Links */}
          <g fill="none">
            {/* user uplink */}
            <path
              d="M288 392 Q 350 250 435 182"
              stroke={show("uplink") || show("return") ? "#3ddbd9" : "#2b7f83"}
              strokeWidth={show("uplink") || show("return") ? 2 : 1.2}
              strokeOpacity={show("uplink") || show("return") ? 0.95 : 0.55}
              className={show("uplink") || show("return") ? "animate-dash" : undefined}
            />
            {mode === "relay" ? (
              <path
                d="M470 172 Q 580 268 686 392"
                stroke={show("gateway") || show("return") || show("satellite") ? "#7dd3fc" : "#2b5f83"}
                strokeWidth={show("gateway") || show("return") ? 1.9 : 1.1}
                strokeOpacity="0.9"
                className={show("gateway") || show("return") ? "animate-dash" : undefined}
              />
            ) : (
              <>
                <path
                  d="M500 138 L 604 126"
                  stroke="#a78bfa"
                  strokeWidth="1.8"
                  className="animate-dash-slow"
                  strokeOpacity="0.9"
                />
                <path
                  d="M660 140 Q 700 260 706 388"
                  stroke="#a78bfa"
                  strokeWidth="1.6"
                  strokeDasharray="3 6"
                  strokeOpacity="0.8"
                />
              </>
            )}
            {/* gateway to internet */}
            <path
              d="M708 392 Q 770 350 792 278"
              stroke={show("gateway") || show("return") ? "#3ddbd9" : "#2b7f83"}
              strokeWidth={show("gateway") || show("return") ? 1.9 : 1.1}
              className={show("gateway") || show("return") ? "animate-dash" : undefined}
              strokeOpacity="0.85"
            />
          </g>

          {/* Travelling packets */}
          {(show("uplink") || show("return")) && (
            <circle r="3.4" fill="#e8fffe">
              <animateMotion
                dur="2.2s"
                repeatCount="indefinite"
                path={show("uplink") ? "M288 392 Q 350 250 435 182" : "M435 182 Q 350 250 288 392"}
              />
            </circle>
          )}
          {(show("gateway") || show("return")) && (
            <circle r="3.4" fill="#dff2ff">
              <animateMotion
                dur="2.2s"
                repeatCount="indefinite"
                path={show("return") ? "M686 392 Q 580 268 470 172" : "M470 172 Q 580 268 686 392"}
              />
            </circle>
          )}

          {/* Step annotations */}
          {show("uplink") && (
            <g>
              <text x="300" y="300" className="fill-[#7ee7e2]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}>
                Ku-BAND
              </text>
              <text x="300" y="315" className="fill-[#5b6a86]" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }}>
                10.7–12.7 GHz
              </text>
            </g>
          )}
          {show("satellite") && (
            <g>
              <text x="505" y="200" className="fill-[#8fc7ea]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}>
                BENT PIPE
              </text>
              <text x="505" y="214" className="fill-[#5b6a86]" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }}>
                amplify · shift · re-aim
              </text>
            </g>
          )}
          {show("gateway") && (
            <g>
              <text x="716" y="320" className="fill-[#7ee7e2]" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}>
                KA-BAND
              </text>
              <text x="716" y="334" className="fill-[#5b6a86]" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }}>
                fibre backhaul →
              </text>
            </g>
          )}
        </svg>
        </div>

        {/* live step caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-[#060b16] via-[#060b16]/85 to-transparent px-5 pb-4 pt-10 sm:block">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-signal/30 bg-signal/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal">
              {STEPS[step].label}
            </span>
            <span className="text-[10px] text-faint">
              {mode === "laser" ? "Laser route · traffic can skip the local gateway" : "Relay route · up, down, then fibre"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] p-5">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setStep(i);
                setPaused(true);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                i === step
                  ? "border-signal/50 bg-signal/10 text-signal"
                  : "border-white/10 text-faint hover:border-white/25 hover:text-muted",
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-auto rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint transition-colors hover:text-muted"
            aria-label={paused ? "Resume automatic step-through" : "Pause automatic step-through"}
          >
            {paused ? "▶ auto" : "❙❙ pause"}
          </button>
        </div>
        <div className="mt-4 min-h-[64px]">
          <h4 className="text-[15px] font-semibold text-white">{STEPS[step].title}</h4>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
            {STEPS[step].body}
          </p>
        </div>
      </div>
    </div>
  );
}
