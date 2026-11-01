import { useState, type CSSProperties } from "react";
import { NIC_COMPARE, NIC_STEPS } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { ChoiceGroup, SimNote } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * Inside one computer: where the NIC sits and what it does.
 *
 * The drawing keeps the NIC physically at the edge of the motherboard, because
 * that is the idea — the software lives inside, the network is outside, and the
 * NIC is the hardware that converts between the two.
 */

type AdapterKind = "ethernet" | "wifi";

const STAGE_BOXES: Record<string, [number, number, number, number]> = {
  app: [80, 208, 120, 64],
  os: [80, 92, 120, 78],
  nic: [330, 148, 96, 76],
  port: [426, 168, 34, 36],
  receiver: [700, 152, 56, 52],
};

export function NicVisual({ className }: { className?: string }) {
  const player = useStepPlayer(NIC_STEPS.length, 3000);
  const [adapter, setAdapter] = useState<AdapterKind>("ethernet");
  const step = NIC_STEPS[player.index];
  const stage = step.where;

  /** Active stage gets the amber highlight used everywhere in the lab. */
  const tone = (id: string) =>
    stage === id
      ? { fill: "rgba(251,191,36,0.16)", stroke: "#fbbf24", strokeWidth: 2 }
      : { fill: "rgba(11,17,32,0.92)", stroke: "rgba(148,176,224,0.3)", strokeWidth: 1.4 };

  return (
    <div className={cn("space-y-4", className)}>
      <ChoiceGroup
        label="কোন ধরনের অ্যাডাপ্টার দেখবে?"
        value={adapter}
        onChange={(id) => setAdapter(id as AdapterKind)}
        options={[
          { id: "ethernet", label: "Ethernet NIC (তার)" },
          { id: "wifi", label: "Wi-Fi adapter (বেতার)" },
        ]}
      />

      <figure className="net-figure">
        <svg viewBox="0 0 960 330" role="img" aria-label="একটি কম্পিউটারের ভেতরে NIC-এর অবস্থান ও কাজের চিত্র">
          {/* computer case */}
          <rect x="40" y="40" width="420" height="256" rx="14" fill="rgba(148,176,224,0.04)" stroke="rgba(148,176,224,0.22)" strokeDasharray="4 5" />
          <text className="net-figure-label" x="56" y="32">
            COMPUTER / MOTHERBOARD
          </text>

          {/* software */}
          <g>
            <rect x={STAGE_BOXES.app[0]} y={STAGE_BOXES.app[1]} width={STAGE_BOXES.app[2]} height={STAGE_BOXES.app[3]} rx="8" {...tone("app")} />
            <text className="net-node-title" x={STAGE_BOXES.app[0] + 12} y={STAGE_BOXES.app[1] + 28}>
              অ্যাপ
            </text>
            <text className="net-node-sub" x={STAGE_BOXES.app[0] + 12} y={STAGE_BOXES.app[1] + 46}>
              APPLICATION
            </text>
          </g>

          {/* CPU / OS network stack */}
          <g>
            <rect x={STAGE_BOXES.os[0]} y={STAGE_BOXES.os[1]} width={STAGE_BOXES.os[2]} height={STAGE_BOXES.os[3]} rx="8" {...tone("os")} />
            <text className="net-node-title" x={STAGE_BOXES.os[0] + 12} y={STAGE_BOXES.os[1] + 28}>
              CPU
            </text>
            <text className="net-node-sub" x={STAGE_BOXES.os[0] + 12} y={STAGE_BOXES.os[1] + 46}>
              OS + NETWORK
            </text>
            <text className="net-node-sub" x={STAGE_BOXES.os[0] + 12} y={STAGE_BOXES.os[1] + 62}>
              STACK
            </text>
          </g>

          {/* memory + storage, for context */}
          <g>
            <rect x="230" y="92" width="86" height="54" rx="8" fill="rgba(11,17,32,0.8)" stroke="rgba(148,176,224,0.2)" />
            <text className="net-node-sub" x="244" y="124">RAM</text>
            <rect x="230" y="160" width="86" height="54" rx="8" fill="rgba(11,17,32,0.8)" stroke="rgba(148,176,224,0.2)" />
            <text className="net-node-sub" x="240" y="192">STORAGE</text>
          </g>

          {/* data path inside the computer */}
          <path
            d="M140 208 V170 H330"
            fill="none"
            stroke={player.index >= 1 ? "#3ddbd9" : "rgba(148,176,224,0.3)"}
            strokeWidth="2"
            strokeDasharray="5 6"
            className={player.playing && !player.reduced ? "net-flow" : undefined}
          />
          <path
            d="M426 186 H700"
            fill="none"
            stroke={adapter === "wifi" ? "rgba(167,139,250,0.6)" : "rgba(159,232,255,0.5)"}
            strokeWidth="2"
            strokeDasharray={adapter === "wifi" ? "6 7" : undefined}
            className={player.index >= 3 && player.playing && !player.reduced ? "net-flow" : undefined}
          />

          {/* NIC */}
          <g>
            <rect
              x={STAGE_BOXES.nic[0]}
              y={STAGE_BOXES.nic[1]}
              width={STAGE_BOXES.nic[2]}
              height={STAGE_BOXES.nic[3]}
              rx="9"
              fill={stage === "nic" ? "rgba(251,191,36,0.18)" : "rgba(61,219,217,0.12)"}
              stroke={stage === "nic" ? "#fbbf24" : "rgba(61,219,217,0.65)"}
              strokeWidth="2"
            />
            <text className="net-node-title" x={STAGE_BOXES.nic[0] + 12} y={STAGE_BOXES.nic[1] + 30} fill="#e9effc">
              NIC
            </text>
            <text className="net-node-sub" x={STAGE_BOXES.nic[0] + 12} y={STAGE_BOXES.nic[1] + 48} fill="#7ee7e2">
              HARDWARE
            </text>
            <text className="net-node-sub" x={STAGE_BOXES.nic[0] + 12} y={STAGE_BOXES.nic[1] + 64} fill="#7ee7e2">
              INTERFACE
            </text>
            {adapter === "wifi" && (
              <g transform={`translate(${STAGE_BOXES.nic[0] + 78} ${STAGE_BOXES.nic[1] - 4})`}>
                <line x1="0" y1="0" x2="0" y2="-26" stroke="#a78bfa" strokeWidth="2" />
                {[8, 16, 24].map((radius, i) => (
                  <circle
                    key={radius}
                    r={radius}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="1.4"
                    className={player.playing && !player.reduced ? "net-wave" : undefined}
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </g>
            )}
          </g>

          {/* port / antenna socket */}
          <g>
            <rect
              x={STAGE_BOXES.port[0]}
              y={STAGE_BOXES.port[1]}
              width={STAGE_BOXES.port[2]}
              height={STAGE_BOXES.port[3]}
              rx="4"
              fill={stage === "port" ? "rgba(251,191,36,0.25)" : "rgba(96,165,250,0.18)"}
              stroke={stage === "port" ? "#fbbf24" : "rgba(96,165,250,0.6)"}
              strokeWidth="1.4"
            />
            <text className="net-node-sub" x={STAGE_BOXES.port[0] - 6} y={STAGE_BOXES.port[1] + 54} fill="#93c5fd">
              {adapter === "wifi" ? "ANTENNA" : "RJ-45"}
            </text>
          </g>

          {/* receiver computer */}
          <rect x="690" y="70" width="230" height="196" rx="14" fill="rgba(148,176,224,0.04)" stroke="rgba(148,176,224,0.22)" strokeDasharray="4 5" />
          <text className="net-figure-label" x="706" y="62">
            RECEIVER COMPUTER
          </text>
          <rect
            x={STAGE_BOXES.receiver[0]}
            y={STAGE_BOXES.receiver[1]}
            width={STAGE_BOXES.receiver[2]}
            height={STAGE_BOXES.receiver[3]}
            rx="8"
            fill={stage === "receiver" ? "rgba(251,191,36,0.18)" : "rgba(61,219,217,0.12)"}
            stroke={stage === "receiver" ? "#fbbf24" : "rgba(61,219,217,0.6)"}
            strokeWidth="1.8"
          />
          <text className="net-node-sub" x={STAGE_BOXES.receiver[0] + 8} y={STAGE_BOXES.receiver[1] + 32} fill="#7ee7e2">
            NIC
          </text>
          <rect x="790" y="120" width="110" height="112" rx="8" fill="rgba(11,17,32,0.85)" stroke="rgba(148,176,224,0.22)" />
          <text className="net-node-sub" x="804" y="150">OS</text>
          <text className="net-node-sub" x="804" y="170">+ APP</text>

          {/* travelling packet */}
          <circle
            className={player.playing && !player.reduced ? "net-travel" : undefined}
            style={{ "--net-travel": "500px", "--net-duration": "2.6s" } as CSSProperties}
            cx="200"
            cy="186"
            r="6.5"
            fill="#3ddbd9"
            opacity={player.index >= 2 ? 0.95 : 0.25}
          />
        </svg>
        <figcaption className="bangla border-t border-white/[0.07] px-4 py-2.5 text-[11.5px] text-faint">
          হলুদ ঘর = এখন যে অংশ কাজ করছে। {adapter === "wifi" ? "Wi-Fi অ্যাডাপ্টারে অ্যান্টেনা থাকে, কেবল পোর্ট থাকে না।" : "Ethernet NIC-এ RJ-45 পোর্ট থাকে, যেখানে কেবল ঢোকে।"}
        </figcaption>
      </figure>

      <StepControls player={player} label="NIC অ্যানিমেশন" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
            ধাপ {toBn(player.index + 1)} / {toBn(NIC_STEPS.length)}
          </p>
          <h3 className="bangla text-[16px] font-semibold text-white" aria-live="polite">
            {step.title}
          </h3>
          <p className="bangla text-[13px] leading-relaxed text-muted">{step.body}</p>
          <p className="net-code rounded-xl border border-white/10 bg-[#04060d] p-3">{step.detail}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/12">
          <table className="w-full border-collapse text-left">
            <caption className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-left text-[12.5px] font-semibold text-white">
              Ethernet NIC ও Wi-Fi অ্যাডাপ্টারের তুলনা
            </caption>
            <thead>
              <tr className="bg-white/[0.02]">
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-faint">
                  বিষয়
                </th>
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-signal">
                  Ethernet NIC
                </th>
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-laser">
                  Wi-Fi adapter
                </th>
              </tr>
            </thead>
            <tbody>
              {NIC_COMPARE.map((row) => (
                <tr key={row.label} className="border-t border-white/[0.06]">
                  <th scope="row" className="bangla px-3 py-2 text-[12px] font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="bangla px-3 py-2 text-[12px] text-muted">{row.ethernet}</td>
                  <td className="bangla px-3 py-2 text-[12px] text-muted">{row.wifi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SimNote />
    </div>
  );
}
