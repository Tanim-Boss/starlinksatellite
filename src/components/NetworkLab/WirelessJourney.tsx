import { useState, type ReactNode } from "react";
import { Antenna, ArrowRight, Radio, Router, Waves, Wifi } from "lucide-react";
import {
  MEDIA_CREDITS,
  WIRELESS_MEDIA,
  WIRELESS_STEPS,
  mediaAsset,
  type WirelessStep,
} from "@/lib/network/media";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { ChoiceGroup, SimNote } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * Wireless media: the same data, no wire.
 *
 * Three layers, so the lesson can go from the object to the physics:
 *   1. the scene — two antennas, the air between them, a packet crossing it;
 *   2. the modulation — how bits are written onto a radio wave;
 *   3. the media family — radio, microwave, infrared and satellite links.
 *
 * The scene deliberately keeps the laptop, the router and the air (not a
 * cable) as the only things on screen: "the medium is the air" is the point.
 */

/* -------------------------------------------------------------------------- */
/* 1. The scene                                                               */
/* -------------------------------------------------------------------------- */

const HOP_LABEL: Record<WirelessStep["hop"], string> = {
  app: "অ্যাপ (ডাটা তৈরি)",
  nic: "Wi-Fi অ্যাডাপ্টার (মডুলেশন)",
  antenna: "অ্যান্টেনা (তরঙ্গ ছাড়া)",
  air: "বাতাস — তরঙ্গের পথ",
  peer: "রাউটার / রিসিভার",
};

function Wave({ x, y, active, dir = 1 }: { x: number; y: number; active: boolean; dir?: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
      {[18, 34, 50].map((radius, index) => (
        <path
          key={radius}
          d={`M ${radius} ${-radius} A ${radius} ${radius} 0 0 1 ${radius} ${radius}`}
          fill="none"
          stroke={active ? "#3ddbd9" : "#a78bfa"}
          strokeWidth={active ? 2.2 : 1.5}
          strokeLinecap="round"
          opacity={active ? 0.95 : 0.45}
          className={active ? "net-wave-arc" : undefined}
          style={{ animationDelay: `${index * 0.35}s` }}
        />
      ))}
    </g>
  );
}

function Device({
  active,
  title,
  sub,
  children,
}: {
  active: boolean;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={180}
        height={104}
        rx={12}
        fill={active ? "rgba(61,219,217,0.14)" : "rgba(11,17,32,0.9)"}
        stroke={active ? "rgba(61,219,217,0.9)" : "rgba(148,176,224,0.28)"}
        strokeWidth={active ? 2 : 1.2}
        className="net-device-box"
      />
      {children}
      <text className="net-node-title" x={12} y={20}>
        {title}
      </text>
      <text className="net-node-sub" x={12} y={34}>
        {sub}
      </text>
    </g>
  );
}

function AirScene({
  hop,
  walls,
  playing,
  reduced,
}: {
  hop: WirelessStep["hop"];
  walls: number;
  playing: boolean;
  reduced: boolean;
}) {
  const airActive = walls === 0;
  /** How much of the signal survives the walls: 0 → none, 2 → most of it gone. */
  const reach = walls === 0 ? 0.95 : walls === 1 ? 0.55 : 0.3;

  return (
    <svg viewBox="0 0 960 330" role="img" aria-label="তার ছাড়া বাতাসের ভেতর দিয়ে ডাটা যাওয়ার চিত্র">
      {/* the medium itself: air, drawn as a band, because there is no cable */}
      <g>
        <rect
          x={210}
          y={96}
          width={500}
          height={132}
          rx={16}
          fill={hop === "air" ? "rgba(167,139,250,0.1)" : "rgba(167,139,250,0.04)"}
          stroke={hop === "air" ? "rgba(167,139,250,0.6)" : "rgba(167,139,250,0.22)"}
          strokeDasharray="7 7"
        />
        <text className="net-figure-label" x={222} y={88}>
          NO CABLE — THE MEDIUM IS THE AIR
        </text>
        {Array.from({ length: 11 }).map((_, index) => (
          <circle
            key={index}
            cx={238 + index * 44}
            cy={162}
            r={1.6}
            fill="rgba(196,181,253,0.5)"
            className={playing && !reduced ? "net-air-mote" : undefined}
            style={{ animationDelay: `${index * 0.18}s` }}
          />
        ))}
      </g>

      {/* sender: laptop + antenna */}
      <g transform="translate(20 96)">
        <Device active={hop === "app" || hop === "nic"} title="ল্যাপটপ" sub="SENDER · CLIENT">
          <rect x={14} y={44} width={80} height={44} rx={4} fill="rgba(61,219,217,0.12)" stroke="rgba(61,219,217,0.55)" />
          <rect x={20} y={50} width={68} height={32} rx={2} fill={hop === "app" ? "rgba(61,219,217,0.35)" : "rgba(61,219,217,0.12)"} />
          <rect x={6} y={88} width={96} height={6} rx={3} fill="rgba(148,176,224,0.4)" />
          {hop === "nic" && (
            <g>
              <rect x={104} y={44} width={64} height={30} rx={4} fill="rgba(251,191,36,0.22)" stroke="rgba(251,191,36,0.8)" />
              <text className="net-node-sub" x={110} y={62} fill="#fcd34d">
                NIC
              </text>
            </g>
          )}
          <rect x={166} y={30} width={4} height={54} rx={2} fill={hop === "antenna" ? "#3ddbd9" : "#8b9bb9"} />
          <text className="net-node-note" x={104} y={96} fill="#8b9bb9">
            ~~~~~~ bits
          </text>
        </Device>
      </g>

      {/* waves out of the laptop antenna */}
      <Wave x={196} y={150} active={hop === "antenna" || hop === "air"} />

      {/* The packet crossing the air. Walls do not stop it abruptly; they thin
          it out, which is what a weak signal actually looks like. */}
      <g>
        <circle
          className={playing && !reduced ? "net-travel-air" : undefined}
          cx={230}
          cy={162}
          r={7.5}
          fill={walls >= 2 ? "#f87171" : walls === 1 ? "#fbbf24" : "#3ddbd9"}
          opacity={Math.max(0.28, reach)}
        />
        <circle
          cx={230}
          cy={162}
          r={13}
          fill="none"
          stroke={walls >= 2 ? "rgba(248,113,113,0.45)" : "rgba(61,219,217,0.4)"}
          strokeWidth={1}
          opacity={Math.max(0.3, reach)}
        />
      </g>

      {/* walls between the two ends */}
      {Array.from({ length: walls }).map((_, index) => {
        const x = 330 + index * 110;
        return (
          <g key={x}>
            <rect x={x} y={96} width={12} height={132} fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.45)" />
            <text className="net-node-note" x={x - 4} y={242} fill="#fca5a5">
              দেয়াল
            </text>
          </g>
        );
      })}

      {/* waves into the router antenna */}
      <Wave x={716} y={150} active={hop === "air"} dir={-1} />

      {/* receiver: router / access point */}
      <g transform="translate(760 96)">
        <Device active={hop === "peer"} title="রাউটার / AP" sub="RECEIVER · ACCESS POINT">
          <rect x={14} y={56} width={100} height={34} rx={6} fill="rgba(167,139,250,0.14)" stroke="rgba(167,139,250,0.6)" />
          <rect x={26} y={30} width={4} height={28} rx={2} fill="#c4b5fd" />
          <rect x={58} y={26} width={4} height={32} rx={2} fill="#c4b5fd" />
          <rect x={92} y={30} width={4} height={28} rx={2} fill="#c4b5fd" />
          {[0, 1, 2, 3].map((led) => (
            <circle key={led} cx={30 + led * 22} cy={80} r={2.6} fill={hop === "peer" ? "#3ddbd9" : "#8b9bb9"} />
          ))}
        </Device>
      </g>

      {/* hop labels under the scene */}
      <g transform="translate(20 268)">
        {(["app", "nic", "antenna", "air", "peer"] as const).map((item, index) => {
          const active = hop === item;
          return (
            <g key={item} transform={`translate(${index * 188} 0)`}>
              <rect
                x={0}
                y={0}
                width={176}
                height={34}
                rx={8}
                fill={active ? "rgba(61,219,217,0.14)" : "rgba(255,255,255,0.02)"}
                stroke={active ? "rgba(61,219,217,0.6)" : "rgba(255,255,255,0.08)"}
              />
              <text
                className="net-node-note"
                x={10}
                y={22}
                fill={active ? "#7ee7e2" : "#8b9bb9"}
              >
                {HOP_LABEL[item]}
              </text>
            </g>
          );
        })}
      </g>

      <text className="net-node-note" x={222} y={318} fill={airActive ? "#8b9bb9" : "#fca5a5"}>
        {airActive
          ? "দেয়াল নেই — তরঙ্গ বাধাহীনভাবে দুই প্রান্তের মধ্যে যাতায়াত করছে।"
          : "প্রতিটি দেয়াল তরঙ্গ দুর্বল করে; কিছু দেয়াল পেরোনো যায়, কিছু আটকে দেয়।"}
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Modulation: bits → wave                                                 */
/* -------------------------------------------------------------------------- */

/** A simplified constellation: amplitude + phase per symbol, and its bit value. */
const SCHEMES = [
  {
    id: "bpsk",
    label: "BPSK",
    bitsPerSymbol: 1,
    /** phase (radians) and relative amplitude for each symbol. */
    points: [
      { phase: 0, amp: 1, bits: "0" },
      { phase: Math.PI, amp: 1, bits: "1" },
    ],
  },
  {
    id: "qpsk",
    label: "QPSK",
    bitsPerSymbol: 2,
    points: [
      { phase: Math.PI / 4, amp: 1, bits: "00" },
      { phase: (3 * Math.PI) / 4, amp: 1, bits: "01" },
      { phase: (5 * Math.PI) / 4, amp: 1, bits: "10" },
      { phase: (7 * Math.PI) / 4, amp: 1, bits: "11" },
    ],
  },
  {
    id: "qam16",
    label: "16-QAM",
    bitsPerSymbol: 4,
    points: [
      { phase: Math.PI / 4, amp: 1, bits: "0000" },
      { phase: (3 * Math.PI) / 4, amp: 0.75, bits: "0101" },
      { phase: (5 * Math.PI) / 4, amp: 0.5, bits: "1010" },
      { phase: (7 * Math.PI) / 4, amp: 1.2, bits: "1111" },
    ],
  },
  {
    id: "qam256",
    label: "256-QAM",
    bitsPerSymbol: 8,
    points: [
      { phase: Math.PI / 4, amp: 1, bits: "00001111" },
      { phase: (3 * Math.PI) / 4, amp: 0.8, bits: "01011010" },
      { phase: (5 * Math.PI) / 4, amp: 0.6, bits: "10100101" },
      { phase: (7 * Math.PI) / 4, amp: 1.15, bits: "11110000" },
    ],
  },
] as const;

type SchemeId = (typeof SCHEMES)[number]["id"];

const SYMBOL_SLOTS = 6;
/** Per-symbol column width inside the 640-unit waveform viewBox. */
const SLOT = 78;

/** Wall choices for the air path. Distinct from the Wi-Fi lesson's labels so
 *  the two figures never read as the same control. */
const WALL_LABELS = ["বাধা নেই", "একটি দেয়াল", "দুই দেয়াল"] as const;

function wavePath(phase: number, amp: number, x0: number, width: number, yMid: number) {
  const points: string[] = [];
  const steps = 26;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x0 + t * width;
    // two carrier cycles per symbol slot
    const y = yMid - Math.sin(t * Math.PI * 4 + phase) * amp * 20;
    points.push(`${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function ModulationDemo() {
  const [schemeId, setSchemeId] = useState<SchemeId>("qpsk");
  const scheme = SCHEMES.find((item) => item.id === schemeId) ?? SCHEMES[1];
  const symbols = Array.from({ length: SYMBOL_SLOTS }, (_, index) => scheme.points[index % scheme.points.length]);
  const bits = symbols.map((symbol) => symbol.bits).join("");
  const snrNeed = { bpsk: 6, qpsk: 10, qam16: 18, qam256: 30 }[schemeId];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            ডাটা তরঙ্গে লেখা হচ্ছে — modulation
          </p>
          <h3 className="bangla mt-1 text-[14px] font-semibold text-white">
            বিট কীভাবে তরঙ্গে পরিণত হয়
          </h3>
        </div>
        <ChoiceGroup
          label="modulation বেছে নাও"
          size="sm"
          value={schemeId}
          onChange={(id) => setSchemeId(id as SchemeId)}
          options={SCHEMES.map((item) => ({ id: item.id, label: item.label }))}
        />
      </div>

      <svg
        viewBox="0 0 660 215"
        className="net-svg mt-3 w-full"
        role="img"
        aria-label={`${scheme.label}-এ বিট থেকে তরঙ্গ তৈরির চিত্র`}
      >
        <text className="net-figure-label" x={0} y={14}>
          BITS ON THE WIRELESS LINK
        </text>
        {symbols.map((symbol, index) => {
          const x = index * SLOT + 4;
          return (
            <g key={index}>
              <rect
                x={x}
                y={24}
                width={70}
                height={22}
                rx={5}
                fill={index % 2 ? "rgba(61,219,217,0.1)" : "rgba(167,139,250,0.1)"}
                stroke="rgba(148,176,224,0.22)"
              />
              <text
                className="net-node-sub"
                x={x + 35}
                y={40}
                textAnchor="middle"
                fill={index % 2 ? "#7ee7e2" : "#c4b5fd"}
                style={{ letterSpacing: "0.18em" }}
              >
                {symbol.bits.split("").map((bit) => toBn(Number(bit))).join("")}
              </text>
            </g>
          );
        })}

        {/* the carrier, one segment per symbol */}
        <text className="net-figure-label" x={0} y={74}>
          SAME CARRIER WAVE — EACH SYMBOL CHANGES ITS PHASE &amp; HEIGHT
        </text>
        <line x1={0} y1={132} x2={SLOT * SYMBOL_SLOTS - 12} y2={132} stroke="rgba(148,176,224,0.2)" strokeDasharray="3 5" />
        {symbols.map((symbol, index) => (
          <path
            key={`wave-${index}`}
            d={wavePath(symbol.phase, symbol.amp, index * SLOT + 4, 70, 132)}
            fill="none"
            stroke={index % 2 ? "#3ddbd9" : "#a78bfa"}
            strokeWidth={2.1}
            strokeLinecap="round"
          />
        ))}

        {/* I/Q constellation */}
        <g transform="translate(570 128)">
          {[-1, -0.5, 0.5, 1].map((step) => (
            <g key={step}>
              <line x1={-34} y1={step * 26} x2={34} y2={step * 26} stroke="rgba(148,176,224,0.14)" />
              <line x1={step * 34} y1={-34} x2={step * 34} y2={34} stroke="rgba(148,176,224,0.14)" />
            </g>
          ))}
          {scheme.points.map((point, index) => (
            <circle
              key={index}
              cx={Math.cos(point.phase) * point.amp * 30}
              cy={-Math.sin(point.phase) * point.amp * 30}
              r={4.5}
              fill={index % 2 ? "#3ddbd9" : "#a78bfa"}
            />
          ))}
          <text className="net-figure-label" x={-34} y={52}>
            I / Q
          </text>
        </g>
      </svg>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="bangla text-[10px] text-faint">এক প্রতীকে</p>
          <p className="bangla text-[12.5px] text-ink">{toBn(scheme.bitsPerSymbol)} বিট</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="bangla text-[10px] text-faint">যতটা ডাটা পাঠানো হচ্ছে</p>
          <p className="bangla break-all font-mono text-[11px] leading-relaxed text-ink">
            {bits.split("").map((bit) => toBn(Number(bit))).join(" ")}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="bangla text-[10px] text-faint">দরকারি সংকেত-মান (SNR)</p>
          <p className="bangla text-[12.5px] text-ink">
            প্রায় {toBn(snrNeed)} dB
            {snrNeed >= 30 ? " — দুর্বল সংকেতে ভুল বাড়ে" : ""}
          </p>
        </div>
      </div>
      <p className="bangla mt-3 text-[12px] leading-relaxed text-muted">
        তরঙ্গের আকার (amplitude) ও অবস্থান (phase) বদলে প্রতীকে একাধিক বিট বসানো হয়।
        বেশি বিট মানে বেশি গতি, কিন্তু দুর্বল সংকেতে প্রতীভেদের ফারাক কমে যায় — তাই 높은
        modulation-এ ভালো সংকেত দরকার।
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. The wireless family                                                     */
/* -------------------------------------------------------------------------- */

const WIRELESS_ICON = {
  radio: Wifi,
  microwave: Radio,
  infrared: Waves,
  satellite: Antenna,
} as const;

function WirelessFamily() {
  const [selected, setSelected] = useState<string>("radio");
  const media = WIRELESS_MEDIA.find((item) => item.id === selected) ?? WIRELESS_MEDIA[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {WIRELESS_MEDIA.map((item) => {
          const Icon = WIRELESS_ICON[item.id];
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(item.id)}
              className={cn(
                "bangla rounded-2xl border p-3.5 text-left transition-colors",
                active
                  ? "border-signal/70 bg-signal/[0.1]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon size={14} style={{ color: item.color }} />
                <span className="text-[12.5px] font-semibold text-white">{item.label}</span>
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                {item.en}
              </span>
              <span className="mt-1.5 block text-[11.5px] leading-relaxed text-muted">{item.summary}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-4 md:p-5">
          <p className="bangla flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            <Radio size={12} /> {media.en}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { label: "তরঙ্গ", value: media.wave },
              { label: "ব্যান্ড", value: media.band },
              { label: "দূরত্ব", value: media.range },
              { label: "কী বাধা দেয়", value: media.obstacle },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <dt className="bangla text-[10px] text-faint">{row.label}</dt>
                <dd className="bangla mt-0.5 text-[12px] leading-snug text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="bangla mt-3 text-[12.5px] leading-relaxed text-muted">
            <span className="text-faint">কোথায় ব্যবহার: </span>
            {media.use}
          </p>
          <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
            <span className="text-faint">এই সাইটের বিষয়ের সঙ্গে: </span>
            {media.starlink}
          </p>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-white/10">
          <img
            src={mediaAsset("wireless-router.jpg")}
            alt="দুইটি অ্যান্টেনাসহ একটি বেতার রাউটার — তার ছাড়া ডাটা ছড়ানোর যন্ত্র।"
            width={500}
            height={500}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="bangla bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-faint">
            <span className="flex items-center gap-1.5 text-ink">
              <Router size={12} /> বেতার রাউটারের অ্যান্টেনা
            </span>
            <span className="mt-1 block">
              ডাটা এখানেই তরঙ্গে বদলে বাতাসে ছড়িয়ে পড়ে — কোনো কেবল লাগে না।
            </span>
          </figcaption>
        </figure>
      </div>

      <div className="rounded-2xl border border-warn/30 bg-warn/[0.06] p-4">
        <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-warn">
          তার বনাম বাতাস
        </p>
        <p className="bangla mt-2 text-[12.5px] leading-relaxed text-ink">
          তারে ডাটা যায় নির্দিষ্ট পথে, তাই অন্য কারো সাথে ভাগ করতে হয় না। বাতাসে তরঙ্গ সব
          দিকে ছড়ায়, তাই একই চ্যানেলে অন্য নেটওয়ার্ক থাকলে ভিড় হয় — আর দেয়াল, দূরত্ব ও
          বৃষ্টি সংকেত কমিয়ে দেয়। এটাই wireless-এর মূল বিনিময়: স্বাধীনতা পাচ্ছ, নিশ্চয়তা
          হারাচ্ছ।
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The exported lesson                                                        */
/* -------------------------------------------------------------------------- */

export function WirelessJourney({ className }: { className?: string }) {
  const player = useStepPlayer(WIRELESS_STEPS.length, 3600);
  const [walls, setWalls] = useState(0);
  const step = WIRELESS_STEPS[player.index];
  const credit = MEDIA_CREDITS.find((item) => item.file === "wireless-router.jpg");

  return (
    <div className={cn("space-y-4", className)}>
      <figure className="net-figure">
        <AirScene hop={step.hop} walls={walls} playing={player.playing} reduced={player.reduced} />
        <figcaption className="bangla flex flex-wrap items-center gap-3 border-t border-white/[0.07] px-4 py-2.5 text-[11.5px] text-faint">
          <span className="flex items-center gap-1.5 text-laser">
            <Wifi size={13} /> বেতার মাধ্যম
          </span>
          <span>তারের বদলে বাতাস</span>
          <span className="ml-auto flex items-center gap-1 text-signal">
            ধাপ: {toBn(player.index + 1)} <ArrowRight size={12} /> {step.detail}
          </span>
        </figcaption>
      </figure>

      <div className="flex flex-wrap items-center gap-2">
        <span className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
          বাধা যোগ করো
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="দুই প্রান্তের মাঝে দেয়ালের সংখ্যা">
          {[0, 1, 2].map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={walls === count}
              onClick={() => setWalls(count)}
              className={cn(
                "bangla rounded-full border px-3 py-1.5 text-[11.5px] transition-colors",
                walls === count
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-white/12 text-muted hover:border-white/30 hover:text-white",
              )}
            >
              {WALL_LABELS[count]}
            </button>
          ))}
        </div>
      </div>

      <StepControls player={player} label="বেতার ডাটা চলাচলের ধাপ" />

      <div className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4 md:p-5" aria-live="polite">
        <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
          ধাপ {toBn(player.index + 1)} / {toBn(WIRELESS_STEPS.length)} · {step.detail}
        </p>
        <h3 className="bangla mt-1.5 text-[16px] font-semibold text-white">{step.title}</h3>
        <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{step.body}</p>
      </div>

      <ModulationDemo />

      <div>
        <h3 className="bangla text-[14px] font-semibold text-white">বেতার মাধ্যমের পরিবার</h3>
        <p className="bangla mt-1 text-[12.5px] leading-relaxed text-muted">
          “বেতার” মানে কেবল Wi-Fi নয় — রেডিও, মাইক্রোওয়েভ, ইনফ্রারেড আর স্যাটেলাইট লিংক,
          সবই তারবিহীন মাধ্যম। প্রতিটির তরঙ্গ, দূরত্ব ও বাধা আলাদা।
        </p>
      </div>
      <WirelessFamily />

      {credit && (
        <p className="bangla text-[10.5px] leading-relaxed text-faint">
          রাউটারের ছবি:{" "}
          <a
            href={credit.source}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-white/20 underline-offset-2 hover:text-signal"
          >
            {credit.title}
          </a>{" "}
          — {credit.author} · {credit.license}
        </p>
      )}

      <SimNote />
    </div>
  );
}
