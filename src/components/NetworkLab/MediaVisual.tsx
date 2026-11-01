import { useState, type CSSProperties } from "react";
import { Cable, Radio, Sun } from "lucide-react";
import { MEDIA_MODES, type MediaMode } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { ChoiceGroup, SimNote } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * Network media: the same six bits, three different ways of carrying them.
 *
 * Twisted pair moves voltage along copper, fiber moves light down a glass core,
 * Wi-Fi moves radio waves through the air. Switching the mode keeps the sender,
 * the receiver and the data identical — only the medium changes, which is the
 * whole point of the lesson.
 */

/** The payload every mode carries, so the comparison is like for like. */
const BITS = [0, 1, 1, 0, 1, 0];

const STAGES = [
  { title: "sender ডাটা তৈরি করল", detail: "সফটওয়্যারের ডাটা এখন বিটে (0 ও 1) ভাগ হলো।" },
  { title: "মিডিয়ায় সংকেত চলছে", detail: "বিটগুলো মিডিয়ার নিজের ভাষায় সংকেত হয়ে এগোচ্ছে।" },
  { title: "receiver সংকেত ধরল", detail: "অন্য প্রান্তের NIC সংকেত আবার বিটে বদলে নিল।" },
];

const MODE_ICON: Record<MediaMode["id"], typeof Cable> = {
  twisted: Cable,
  fiber: Sun,
  wifi: Radio,
};

function TwistedVisual({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  return (
    <g>
      {/* cable jacket */}
      <rect x="120" y="86" width="640" height="64" rx="32" fill="rgba(96,165,250,0.07)" stroke="rgba(148,176,224,0.28)" strokeWidth="1.3" />
      <text className="net-figure-label" x="132" y="78">
        TWISTED-PAIR CABLE — 4 PAIRS OF COPPER WIRE
      </text>
      {/* four twisted pairs */}
      {[0, 1, 2, 3].map((pair) => {
        const y = 102 + pair * 14;
        const color = ["#f4ad76", "#8edcec", "#a78bfa", "#8fdbd8"][pair];
        return (
          <path
            key={pair}
            d={`M120 ${y} q 20 -7 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`}
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            opacity="0.75"
          />
        );
      })}
      {/* electrical pulses travelling */}
      {[0, 1, 2].map((pulse) => (
        <rect
          key={pulse}
          className={playing && !reduced ? "net-travel" : undefined}
          style={
            {
              "--net-travel": "600px",
              "--net-duration": `${2.6 + pulse * 0.5}s`,
              animationDelay: `${pulse * 0.7}s`,
            } as CSSProperties
          }
          x="130"
          y="98"
          width="16"
          height="40"
          rx="6"
          fill="rgba(251,191,36,0.55)"
          opacity={playing ? 0.9 : 0.25}
        />
      ))}
      {/* voltage view of the same bits */}
      <text className="net-figure-label" x="120" y="196">
        ELECTRICAL VIEW — HIGH = 1, LOW = 0
      </text>
      <polyline
        points={BITS.map((bit, i) => {
          const x = 120 + i * 100;
          const y = bit ? 214 : 250;
          return `${x},${y} ${x + 100},${y}`;
        }).join(" ")}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2.4"
      />
      {BITS.map((bit, i) => (
        <text key={i} className="net-node-sub" x={120 + i * 100 + 42} y="272" fill="#fcd34d">
          {toBn(bit)}
        </text>
      ))}
    </g>
  );
}

function FiberVisual({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  return (
    <g>
      <rect x="120" y="86" width="640" height="64" rx="32" fill="rgba(167,139,250,0.07)" stroke="rgba(148,176,224,0.28)" strokeWidth="1.3" />
      <rect x="120" y="104" width="640" height="28" rx="14" fill="rgba(167,139,250,0.14)" stroke="rgba(196,181,253,0.5)" strokeWidth="1.1" />
      <text className="net-figure-label" x="132" y="78">
        OPTICAL FIBER — CORE INSIDE CLADDING
      </text>
      <text className="net-node-note" x="132" y="146">
        core (কাচ) — আলো এখানেই আটকে থেকে এগোয়
      </text>
      {/* zig-zag: total internal reflection */}
      <polyline
        points="120,118 160,106 200,130 240,106 280,130 320,106 360,130 400,106 440,130 480,106 520,130 560,106 600,130 640,106 680,130 720,106 760,118"
        fill="none"
        stroke="rgba(196,181,253,0.55)"
        strokeWidth="1.2"
        strokeDasharray="3 4"
      />
      {/* light pulses for the 1 bits */}
      {BITS.map((bit, i) =>
        bit ? (
          <circle
            key={i}
            className={playing && !reduced ? "net-travel" : undefined}
            style={
              {
                "--net-travel": `${480 - i * 20}px`,
                "--net-duration": `${2.2 + i * 0.3}s`,
              } as CSSProperties
            }
            cx={140 + i * 40}
            cy="118"
            r="7"
            fill="#e9d5ff"
            opacity={playing ? 0.95 : 0.35}
          />
        ) : null,
      )}
      <text className="net-figure-label" x="120" y="196">
        LIGHT VIEW — PULSE = 1, DARK = 0
      </text>
      {BITS.map((bit, i) => (
        <g key={i}>
          <rect
            x={120 + i * 100}
            y="210"
            width="100"
            height="46"
            rx="6"
            fill={bit ? "rgba(196,181,253,0.18)" : "rgba(148,176,224,0.04)"}
            stroke={bit ? "rgba(196,181,253,0.6)" : "rgba(148,176,224,0.18)"}
          />
          {bit ? (
            <circle cx={120 + i * 100 + 50} cy="233" r="10" fill="#e9d5ff" />
          ) : (
            <text className="net-node-note" x={120 + i * 100 + 34} y="238">
              আলো নেই
            </text>
          )}
          <text className="net-node-sub" x={120 + i * 100 + 42} y="272" fill="#c4b5fd">
            {toBn(bit)}
          </text>
        </g>
      ))}
    </g>
  );
}

function WifiVisual({
  playing,
  reduced,
  strength,
}: {
  playing: boolean;
  reduced: boolean;
  strength: number;
}) {
  const reachable = strength > 0;
  return (
    <g>
      {/* access point */}
      <g>
        <rect x="120" y="120" width="120" height="60" rx="10" fill="rgba(11,17,32,0.92)" stroke="rgba(167,139,250,0.55)" strokeWidth="1.4" />
        <text className="net-node-title" x="136" y="146">
          Access Point
        </text>
        <text className="net-node-sub" x="136" y="164">
          ROUTER / AP
        </text>
      </g>
      {/* radiating waves */}
      <g transform="translate(244 150)">
        {[26, 48, 70].map((radius, i) => (
          <circle
            key={radius}
            r={radius}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.6"
            className={playing && !reduced ? "net-wave" : undefined}
            style={{ animationDelay: `${i * 0.4}s` }}
            opacity={playing ? 0.85 : 0.3}
          />
        ))}
      </g>
      {/* walls */}
      {[420, 560].map((x) => (
        <g key={x}>
          <rect x={x} y="70" width="14" height="160" fill="rgba(148,176,224,0.14)" stroke="rgba(148,176,224,0.25)" />
          <text className="net-node-note" x={x - 8} y="64">
            দেয়াল
          </text>
        </g>
      ))}
      {/* receiver */}
      <g>
        <rect x="700" y="118" width="140" height="64" rx="10" fill="rgba(11,17,32,0.92)" stroke="rgba(61,219,217,0.5)" strokeWidth="1.4" />
        <text className="net-node-title" x="716" y="144">
          Client
        </text>
        <text className="net-node-sub" x="716" y="162">
          WI-FI ADAPTER
        </text>
      </g>
      {/* signal strength bars over the receiver */}
      <g transform="translate(700 84)">
        {[0, 1, 2, 3, 4].map((bar) => {
          const on = strength >= (bar + 1) * 20;
          return (
            <rect
              key={bar}
              x={bar * 16}
              y={24 - bar * 5}
              width="10"
              height={8 + bar * 5}
              rx="2"
              fill={on ? "#3ddbd9" : "rgba(148,176,224,0.16)"}
            />
          );
        })}
      </g>
      {/* packet travelling, only while the link still has signal */}
      {reachable && (
        <circle
          className={playing && !reduced ? "net-travel" : undefined}
          style={{ "--net-travel": "440px", "--net-duration": "2.4s" } as CSSProperties}
          cx="260"
          cy="150"
          r="7"
          fill="#3ddbd9"
          opacity={playing ? 0.95 : 0.3}
        />
      )}
      <text className="net-figure-label" x="120" y="262">
        WIRELESS VIEW — RADIO WAVES THROUGH THE AIR
      </text>
      <text className="net-node-note" x="120" y="284">
        {reachable
          ? "তরঙ্গ বাতাসে ছড়িয়ে পড়ে; দেয়াল ও দূরত্ব বাড়লে শক্তি কমে।"
          : "সংকেত এতটাই দুর্বল যে ডাটা আর পৌঁছাচ্ছে না।"}
      </text>
    </g>
  );
}

export function MediaVisual({ className }: { className?: string }) {
  const [mode, setMode] = useState<MediaMode["id"]>("twisted");
  const [distance, setDistance] = useState(12);
  const [walls, setWalls] = useState(1);
  const player = useStepPlayer(STAGES.length, 3000);
  const active = MEDIA_MODES.find((item) => item.id === mode) ?? MEDIA_MODES[0];
  const Icon = MODE_ICON[mode];

  // A deliberately simple link budget: distance and walls eat signal.
  const strength = Math.max(0, Math.min(100, Math.round(100 - (distance - 4) * 2.1 - walls * 18)));
  const quality =
    strength >= 76 ? "চমৎকার" : strength >= 51 ? "ভালো" : strength >= 26 ? "দুর্বল" : "প্রায় নেই";

  return (
    <div className={cn("space-y-4", className)}>
      <ChoiceGroup
        label="মিডিয়া বেছে নাও"
        value={mode}
        onChange={(id) => setMode(id as MediaMode["id"])}
        options={MEDIA_MODES.map((item) => ({ id: item.id, label: item.label }))}
      />

      <figure className="net-figure">
        <svg viewBox="0 0 960 300" role="img" aria-label={`${active.en} মিডিয়ায় ডাটা চলাচলের চিত্র`}>
          {/* sender and receiver stay put in every mode */}
          <g>
            <rect x="20" y="96" width="90" height="44" rx="8" fill="rgba(61,219,217,0.12)" stroke="rgba(61,219,217,0.5)" />
            <text className="net-node-sub" x="34" y="122" fill="#7ee7e2">
              SENDER
            </text>
            <rect x="850" y="96" width="90" height="44" rx="8" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.5)" />
            <text className="net-node-sub" x="856" y="122" fill="#c4b5fd">
              RECEIVER
            </text>
          </g>
          {mode === "twisted" && <TwistedVisual playing={player.playing} reduced={player.reduced} />}
          {mode === "fiber" && <FiberVisual playing={player.playing} reduced={player.reduced} />}
          {mode === "wifi" && (
            <WifiVisual playing={player.playing} reduced={player.reduced} strength={strength} />
          )}
        </svg>
        <figcaption className="bangla flex flex-wrap items-center gap-3 border-t border-white/[0.07] px-4 py-2.5 text-[11.5px] text-faint">
          <span className="flex items-center gap-1.5 text-laser">
            <Icon size={13} /> {active.en}
          </span>
          <span className="bangla">{active.binary}</span>
          <span className="bangla ml-auto">একই ডাটা: {BITS.map((bit) => toBn(bit)).join(" ")}</span>
        </figcaption>
      </figure>

      <StepControls player={player} label="মিডিয়া অ্যানিমেশন" />

      <div
        className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4 md:p-5"
        aria-live="polite"
      >
        <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
          ধাপ {toBn(player.index + 1)} / {toBn(STAGES.length)}
        </p>
        <h3 className="bangla mt-1.5 text-[16px] font-semibold text-white">
          {STAGES[player.index].title}
        </h3>
        <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">
          {STAGES[player.index].detail}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="bangla text-[13.5px] leading-relaxed text-ink">{active.howItWorks}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {active.pros.map((item) => (
              <li
                key={item}
                className="bangla rounded-xl border border-signal/25 bg-signal/[0.05] px-3 py-2 text-[12px] text-ink"
              >
                + {item}
              </li>
            ))}
            {active.cons.map((item) => (
              <li
                key={item}
                className="bangla rounded-xl border border-[#f87171]/25 bg-[#f87171]/[0.05] px-3 py-2 text-[12px] text-ink"
              >
                − {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <dl className="grid gap-2">
            {active.facts.map((fact) => (
              <div
                key={fact.label}
                className="bangla flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5"
              >
                <dt className="text-[12px] text-faint">{fact.label}</dt>
                <dd className="text-[12.5px] text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {mode === "wifi" && (
            <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
              <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
                সংকেত পরীক্ষা করো
              </p>
              <label className="bangla mt-3 block text-[12px] text-muted" htmlFor="net-distance">
                দূরত্ব: {toBn(distance)} মিটার
              </label>
              <input
                id="net-distance"
                type="range"
                min={4}
                max={40}
                step={1}
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
                className="mt-1.5 w-full accent-[#3ddbd9]"
              />
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="মাঝের দেয়ালের সংখ্যা">
                {[0, 1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={walls === count}
                    onClick={() => setWalls(count)}
                    className={cn(
                      "bangla rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                      walls === count
                        ? "border-signal bg-signal/15 text-signal"
                        : "border-white/12 text-muted hover:border-white/30 hover:text-white",
                    )}
                  >
                    {toBn(count)} টি দেয়াল
                  </button>
                ))}
              </div>
              <p className="bangla mt-3 text-[12.5px] leading-relaxed text-ink" aria-live="polite">
                সংকেতের শক্তি {toBn(strength)}% — মান <strong>{quality}</strong>
                {strength === 0 && " (এখন ডাটা পৌঁছাবে না)"}
              </p>
            </div>
          )}
        </div>
      </div>

      <SimNote />
    </div>
  );
}
