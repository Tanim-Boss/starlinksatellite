import { useState, type CSSProperties } from "react";
import {
  Fingerprint,
  GraduationCap,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import {
  TLS_LEVELS,
  TLS_NOTE,
  TLS_PHASES,
  TLS_STEPS,
  type TlsLevel,
  type TlsStep,
} from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Switch } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * The TLS handshake, drawn as a sequence diagram and explained at three depths.
 *
 * The diagram is the same picture at every depth: two lifelines, eight messages
 * grouped into three jobs (who are you? → which key? → is the tunnel safe?).
 * Arrows only appear as the player reaches them, so the picture fills in the
 * way the real conversation happens.
 *
 * What changed here is legibility rather than decoration:
 *  - every row carries the technical name AND its one-line Bangla meaning, so a
 *    student never has to decode "ClientHello" on their own;
 *  - the three jobs are visible as coloured bands inside the figure and as
 *    status cards above it, with a live needs-more/exists-yet state;
 *  - the "সহজ / মাধ্যমিক / বিস্তারিত" switch swaps the explanation, never the
 *    diagram — the same picture serves a class 6 reader and a class 12 reader;
 *  - every step keeps a real-life analogy, which is the part beginners actually
 *    remember;
 *  - a small packet runs along the active arrow so the direction of the message
 *    is shown, not just written.
 *
 * The certificate switch is still the second lesson: break the trust chain and
 * the browser stops before any key exists, which is exactly why a certificate
 * matters more than the padlock icon.
 */

const VIEW_W = 960;
const VIEW_H = 588;

/* Geometry, in SVG user units. Cards are 240 wide and their centres are the
   two lifelines, which keeps the sequence diagram symmetrical. */
const CLIENT_X = 140;
const SERVER_X = 820;
const SPAN = SERVER_X - CLIENT_X;
const MID_X = (CLIENT_X + SERVER_X) / 2;
const ROW_TOP = 176;
const ROW_GAP = 50;
const LAST_INDEX = TLS_STEPS.length - 1;

const CLIENT_RANDOM = "a7 1f 9c 2b 6e 04";
const SERVER_RANDOM = "3c 82 5e 11 d9 77";
const SHARED_SECRET = "7d 4a 02 b8 91 ce";
const SESSION_KEY = "4f 0b 9e 22 13 88";

const VERIFY_INDEX = TLS_STEPS.findIndex((step) => step.id === "verify");
const KEY_INDEX = TLS_STEPS.findIndex((step) => step.id === "session-key");

function rowY(index: number) {
  return ROW_TOP + index * ROW_GAP;
}

/** First and last step of each of the three jobs, used for the bands. */
const PHASE_BANDS = TLS_PHASES.map((phase) => {
  const indexes = TLS_STEPS.map((step, i) => (step.phase === phase.id ? i : -1)).filter((i) => i >= 0);
  return {
    ...phase,
    first: indexes[0],
    last: indexes[indexes.length - 1],
    number: TLS_PHASES.findIndex((p) => p.id === phase.id) + 1,
  };
});

function phaseOf(step: TlsStep): (typeof PHASE_BANDS)[number] {
  return PHASE_BANDS.find((phase) => phase.id === step.phase) ?? PHASE_BANDS[0];
}

/** Short English tag for each job, shown beside its number. */
const PHASE_EN: Record<string, string> = {
  identity: "IDENTITY",
  keys: "KEY",
  tunnel: "TUNNEL",
};

type PhaseState = "done" | "active" | "pending" | "failed" | "blocked";

const PHASE_STATE_LABEL: Record<PhaseState, string> = {
  done: "✓ সম্পন্ন",
  active: "চলছে…",
  pending: "বাকি",
  failed: "✕ ব্যর্থ",
  blocked: "সংযোগ বন্ধ",
};

const PHASE_STATE_COLOR: Record<PhaseState, string> = {
  done: "#3ddbd9",
  active: "#fbbf24",
  pending: "#697b98",
  failed: "#f87171",
  blocked: "#697b98",
};

/* -------------------------------------------------------------------------- */
/* Glyphs                                                                     */
/* -------------------------------------------------------------------------- */

function LockGlyph({ x, y, color, open }: { x: number; y: number; color: string; open?: boolean }) {
  return (
    <g stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <rect x={x} y={y + 4} width="10" height="7" rx="1.6" fill={color} fillOpacity="0.28" />
      {open ? (
        <path d={`M${x + 2} ${y + 4} V${y + 2.4} a3 3 0 0 1 6 0`} />
      ) : (
        <path d={`M${x + 2} ${y + 4} V${y + 2.4} a3 3 0 0 1 6 0 V${y + 4}`} />
      )}
      <circle cx={x + 5} cy={y + 7.4} r="1" fill={color} stroke="none" />
    </g>
  );
}

function KeyGlyph({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <circle cx={x + 4} cy={y + 5} r="3.4" />
      <path
        d={`M${x + 6.6} ${y + 7.4} L${x + 13} ${y + 13.5} M${x + 10} ${y + 10.6} L${x + 8} ${y + 12.6} M${x + 12} ${y + 12.6} L${x + 10} ${y + 14.6}`}
      />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function TlsHandshake({ className }: { className?: string }) {
  const player = useStepPlayer(TLS_STEPS.length, 3200);
  const [forged, setForged] = useState(false);
  const [level, setLevel] = useState<TlsLevel>("medium");

  const step = TLS_STEPS[player.index];
  const phase = phaseOf(step);
  const levelOption = TLS_LEVELS.find((option) => option.id === level) ?? TLS_LEVELS[1];

  // A broken certificate stops the handshake at the verification step: no key
  // is derived, so nothing after it can happen.
  const broken = forged && player.index >= VERIFY_INDEX;
  const locked = !broken && player.index >= TLS_STEPS.length - 2;

  const keyReady = player.index >= KEY_INDEX && !broken;

  // The player can still be stepped past the failure (or the switch can be
  // flipped mid-run), so the explanation has to say what is actually true:
  // nothing beyond the failed verification ever happens.
  const stalled = broken && player.index > VERIFY_INDEX;
  const accent = stalled ? "#f87171" : phase.color;

  const badge = broken
    ? { text: "সার্টিফিকেট যাচাই ব্যর্থ — সংযোগ বাতিল", color: "#f87171", fill: "rgba(248,113,113,0.1)" }
    : locked
      ? { text: "TLS tunnel চালু — সব ডাটা এনক্রিপ্টেড", color: "#3ddbd9", fill: "rgba(61,219,217,0.1)" }
      : { text: "TLS handshake চলছে…", color: "#fbbf24", fill: "rgba(251,191,36,0.09)" };

  /** The explanation that matches the chosen depth. */
  const explanation = level === "simple" ? [step.simple] : [step.body];

  function phaseState(index: number): PhaseState {
    const band = PHASE_BANDS[index];
    if (broken) return index === 0 ? "failed" : "blocked";
    if (player.index >= band.last) return "done";
    if (player.index >= band.first) return "active";
    return "pending";
  }

  const packetStyle = { "--tls-span": `${SPAN}px` } as CSSProperties;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ---------------------------------------------------------------- */}
      {/* Depth switch + the three jobs                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-3 rounded-2xl border border-white/12 bg-[#04060d] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="bangla flex items-center gap-2 text-[12.5px] font-semibold text-white">
            <GraduationCap size={15} className="shrink-0 text-signal" />
            ব্যাখ্যা কোন স্তরের জন্য পড়বে?
          </p>
          <div
            role="group"
            aria-label="ব্যাখ্যার স্তর"
            className="flex shrink-0 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
          >
            {TLS_LEVELS.map((option) => {
              const active = option.id === level;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`ব্যাখ্যার স্তর ${option.label}`}
                  onClick={() => setLevel(option.id)}
                  className={cn(
                    "bangla rounded-full px-3 py-1.5 text-[12px] leading-none transition-colors",
                    active
                      ? "bg-signal font-semibold text-[#04121a]"
                      : "text-muted hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="bangla text-[11.5px] leading-relaxed text-faint">
          {levelOption.note} · চিত্রটি সব স্তরে একই থাকে, শুধু ব্যাখ্যার গভীরতা বদলায়।
        </p>

        <div className="hairline" />

        <div className="grid gap-2 sm:grid-cols-3">
          {PHASE_BANDS.map((band, index) => {
            const state = phaseState(index);
            const isCurrent = band.id === phase.id && !broken;
            return (
              <div
                key={band.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "rounded-xl border px-3 py-2 transition-colors",
                  isCurrent ? "border-white/25 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]",
                )}
                style={isCurrent ? { borderColor: `${band.color}66`, background: `${band.color}0f` } : undefined}
              >
                <p className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  <span style={{ color: band.color }}>
                    ধাপ {toBn(band.number)} · {PHASE_EN[band.id] ?? band.id}
                  </span>
                  <span
                    className="bangla shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] normal-case tracking-normal"
                    style={{
                      color: PHASE_STATE_COLOR[state],
                      borderColor: `${PHASE_STATE_COLOR[state]}66`,
                    }}
                  >
                    {PHASE_STATE_LABEL[state]}
                  </span>
                </p>
                <p
                  className="bangla mt-1 text-[12.5px] font-semibold"
                  style={{ color: state === "pending" || state === "blocked" ? "#8b9bb9" : "#e9effc" }}
                >
                  {band.title}
                </p>
                <p className="bangla mt-0.5 text-[11px] leading-snug text-faint">{band.question}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Sequence diagram                                                  */}
      {/* ---------------------------------------------------------------- */}
      <figure className="net-figure net-figure--wide">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="TLS handshake-এর ধাপে ধাপে চিত্র: ClientHello, ServerHello, Certificate, যাচাই, key exchange, session key, Finished এবং এনক্রিপ্টেড HTTP"
        >
          <defs>
            <marker id="tls-arrow-req" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#3ddbd9" />
            </marker>
            <marker id="tls-arrow-rep" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#a78bfa" />
            </marker>
            <marker id="tls-arrow-start-rep" markerWidth="9" markerHeight="9" refX="2" refY="4.5" orient="auto">
              <path d="M9 0 L0 4.5 L9 9 z" fill="#a78bfa" />
            </marker>
            <marker id="tls-arrow-start-req" markerWidth="9" markerHeight="9" refX="2" refY="4.5" orient="auto">
              <path d="M9 0 L0 4.5 L9 9 z" fill="#3ddbd9" />
            </marker>
          </defs>

          {/* The three jobs, as coloured bands behind the rows. */}
          {PHASE_BANDS.map((band) => {
            const top = rowY(band.first) - 24;
            const height = rowY(band.last) + 24 - top;
            const isCurrent = band.id === phase.id && !broken;
            // After a failed certificate these jobs never happen, so the band
            // is reduced to a faint rail instead of promising rows that the
            // browser never sends.
            if (broken && band.number > 1) {
              return (
                <rect
                  key={`band-${band.id}`}
                  x="18"
                  y={top}
                  width="3.5"
                  height={height}
                  rx="1.75"
                  fill={band.color}
                  opacity="0.16"
                />
              );
            }
            return (
              <g key={`band-${band.id}`}>
                <rect
                  x="18"
                  y={top}
                  width={VIEW_W - 36}
                  height={height}
                  rx="12"
                  fill={isCurrent ? `${band.color}0d` : "rgba(255,255,255,0.014)"}
                  stroke={isCurrent ? `${band.color}33` : "transparent"}
                />
                <rect x="18" y={top} width="3.5" height={height} rx="1.75" fill={band.color} opacity={isCurrent ? 0.85 : 0.28} />
                <text x={VIEW_W - 30} y={top + 15} fontSize="9" textAnchor="end" fill={band.color} opacity={isCurrent ? 0.95 : 0.6}>
                  {`${toBn(band.number)} · ${band.title}`}
                </text>
              </g>
            );
          })}

          {/* Lifelines */}
          <path
            d={`M${CLIENT_X} 104 V${rowY(LAST_INDEX) + 26}`}
            stroke="rgba(148,176,224,0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            fill="none"
          />
          <path
            d={`M${SERVER_X} 104 V${rowY(LAST_INDEX) + 26}`}
            stroke="rgba(148,176,224,0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            fill="none"
          />

          {/* Client and server cards */}
          <g>
            <rect
              x="20"
              y="16"
              width="240"
              height="78"
              rx="13"
              fill="rgba(11,17,32,0.95)"
              stroke="rgba(61,219,217,0.35)"
              strokeWidth="1.3"
            />
            <text x="34" y="42" fontSize="12.5" fontWeight="600" fill="#e9effc">
              ব্রাউজার (client)
            </text>
            <text className="net-mono" x="34" y="59" fontSize="8.5" fill="#7ee7e2">
              https://bank.example
            </text>
            <LockGlyph x={34} y={67} color={locked ? "#3ddbd9" : "#697b98"} open={!locked} />
            <text x="56" y="79" fontSize="10" fill={locked ? "#7ee7e2" : "#697b98"}>
              {locked ? "তালা বন্ধ · এনক্রিপ্টেড" : "তালা এখনো খোলা"}
            </text>
          </g>
          <g>
            <rect
              x="700"
              y="16"
              width="240"
              height="78"
              rx="13"
              fill="rgba(11,17,32,0.95)"
              stroke="rgba(167,139,250,0.35)"
              strokeWidth="1.3"
            />
            <text x="714" y="42" fontSize="12.5" fontWeight="600" fill="#e9effc">
              সার্ভার (server)
            </text>
            <text className="net-mono" x="714" y="59" fontSize="8.5" fill="#c4b5fd">
              TLS terminates here
            </text>
            <KeyGlyph x={714} y={65} color={keyReady ? "#a78bfa" : "#697b98"} />
            <text x="737" y="79" fontSize="10" fill={keyReady ? "#c4b5fd" : "#697b98"}>
              {keyReady ? "session key তৈরি" : "চাবি এখনো নেই"}
            </text>
          </g>

          {/* Run state */}
          <g>
            <rect x="282" y="24" width="396" height="32" rx="16" fill={badge.fill} stroke={badge.color} strokeOpacity="0.5" />
            {locked ? (
              <LockGlyph x={300} y={34} color={badge.color} />
            ) : (
              <g>
                <circle cx="307" cy="40" r="6.4" fill="none" stroke={badge.color} strokeWidth="1.3" />
                <path
                  d={broken ? "M304 37 L310 43 M310 37 L304 43" : "M307 36.6 V40.4 M307 43.2 V43.6"}
                  stroke={badge.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            )}
            <text x="322" y="44" fontSize="11" fill={badge.color}>
              {badge.text}
            </text>
          </g>

          {/* Rows */}
          {TLS_STEPS.map((item, index) => {
            const y = rowY(index);
            const reached = index <= player.index;
            const active = index === player.index;
            const itemPhase = phaseOf(item);

            // Once the certificate fails, nothing later in the handshake exists.
            if (broken && index > VERIFY_INDEX) return null;

            const isWireRow = item.direction !== "local";

            // Messages still to come are drawn as faint ghosts: the ladder is
            // visible from the start, but only the part that has happened is
            // readable. That is easier to follow than a diagram that keeps
            // growing a row at a time.
            if (!reached) {
              return (
                <g key={item.id} opacity="0.42">
                  <circle
                    cx="56"
                    cy={y}
                    r="12.5"
                    fill="none"
                    stroke={itemPhase.color}
                    strokeOpacity="0.35"
                    strokeDasharray="3 3"
                  />
                  <text x="56" y={y + 4} fontSize="10.5" textAnchor="middle" fill={itemPhase.color} opacity="0.7">
                    {toBn(index + 1)}
                  </text>
                  {isWireRow && (
                    <path
                      d={`M${CLIENT_X} ${y} H${SERVER_X}`}
                      stroke={item.direction === "reply" ? "#a78bfa" : "#3ddbd9"}
                      strokeOpacity="0.2"
                      strokeWidth="1.2"
                      strokeDasharray="2 9"
                      fill="none"
                    />
                  )}
                  <text x={MID_X} y={y - 6} fontSize="9.5" textAnchor="middle" fill="#44546f">
                    {item.title.split(" — ")[0]}
                  </text>
                </g>
              );
            }

            const isRequest = item.direction === "request";
            const isReply = item.direction === "reply";
            const isBoth = item.direction === "both";
            const isWire = isRequest || isReply || isBoth;
            const lineColor = isReply ? "#a78bfa" : "#3ddbd9";

            return (
              <g
                key={item.id}
                className="tls-row"
                role="button"
                tabIndex={0}
                aria-label={`ধাপ ${toBn(index + 1)}: ${item.title}`}
                aria-current={active ? "step" : undefined}
                onClick={() => player.go(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    player.go(index);
                  }
                }}
              >
                <title>{`${toBn(index + 1)}. ${item.title}`}</title>

                <rect
                  className="tls-row-bg"
                  x="16"
                  y={y - 23}
                  width={VIEW_W - 32}
                  height="46"
                  rx="10"
                  fill={active ? "rgba(61,219,217,0.07)" : "transparent"}
                  stroke={active ? "rgba(61,219,217,0.24)" : "transparent"}
                />

                {/* step number, tinted by the job it belongs to */}
                {active && (
                  <circle className="tls-breathe" cx="56" cy={y} r="17" fill={itemPhase.color} opacity="0.35" />
                )}
                <circle
                  cx="56"
                  cy={y}
                  r="12.5"
                  fill={active ? itemPhase.color : "rgba(4,6,13,0.92)"}
                  stroke={itemPhase.color}
                  strokeOpacity={active ? 1 : 0.55}
                  strokeWidth="1.3"
                />
                <text
                  x="56"
                  y={y + 4}
                  fontSize="10.5"
                  fontWeight="600"
                  textAnchor="middle"
                  fill={active ? "#04121a" : itemPhase.color}
                >
                  {toBn(index + 1)}
                </text>

                {/* the message itself */}
                {isWire && (
                  <g>
                    {/* encrypted messages travel inside a pipe: a wide, faint
                        stroke under the line reads as the tunnel wall. */}
                    {item.encrypted && (
                      <path
                        d={`M${CLIENT_X} ${y} H${SERVER_X}`}
                        stroke={lineColor}
                        strokeOpacity="0.18"
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                      />
                    )}
                    <path
                      d={`M${CLIENT_X} ${y} H${SERVER_X}`}
                      stroke={lineColor}
                      strokeWidth={active ? 2.4 : 1.7}
                      strokeDasharray={active && !player.reduced ? "7 6" : undefined}
                      className={active && !player.reduced ? "net-flow" : undefined}
                      fill="none"
                      markerEnd={isReply ? "url(#tls-arrow-rep)" : "url(#tls-arrow-req)"}
                      markerStart={isBoth ? "url(#tls-arrow-start-req)" : undefined}
                    />

                    {/* the packet that carries the message */}
                    {active &&
                      (!player.reduced ? (
                        <>
                          <circle className="tls-packet" style={packetStyle} cx={CLIENT_X} cy={y} r="3.6" fill={lineColor} />
                          {isBoth && (
                            <circle
                              className="tls-packet tls-packet--left"
                              style={packetStyle}
                              cx={CLIENT_X}
                              cy={y}
                              r="3.6"
                              fill={lineColor}
                            />
                          )}
                        </>
                      ) : (
                        <circle cx={MID_X} cy={y} r="3.4" fill={lineColor} />
                      ))}

                    {item.encrypted && (
                      <g>
                        <LockGlyph x={CLIENT_X + 10} y={y - 28} color="#7ee7e2" />
                        <text x={CLIENT_X + 26} y={y - 19} fontSize="8.5" fill="#7ee7e2">
                          এনক্রিপ্টেড
                        </text>
                      </g>
                    )}

                    {/* technical name, then what it means in one line */}
                    <text
                      className="net-mono"
                      x={MID_X}
                      y={y - 20}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill={active ? "#ffffff" : item.encrypted ? "#7ee7e2" : isReply ? "#c4b5fd" : "#9fe8ff"}
                    >
                      {item.wire[0]}
                    </text>
                    <text
                      x={MID_X}
                      y={y - 7}
                      fontSize="10.5"
                      textAnchor="middle"
                      fill={active ? "#e9effc" : "#8b9bb9"}
                    >
                      {item.moment}
                    </text>
                  </g>
                )}

                {/* work that happens inside one machine: nothing crosses the wire */}
                {item.direction === "local" && item.id === "verify" && (
                  <g>
                    <rect
                      x="84"
                      y={y - 21}
                      width="312"
                      height="42"
                      rx="9"
                      fill={broken ? "rgba(248,113,113,0.09)" : "rgba(251,191,36,0.07)"}
                      stroke={broken ? "rgba(248,113,113,0.6)" : "rgba(251,191,36,0.45)"}
                      strokeDasharray="4 4"
                    />
                    <text
                      x="96"
                      y={y - 6}
                      fontSize="9.5"
                      fill={broken ? "#fca5a5" : "#fcd34d"}
                      opacity="0.85"
                    >
                      ব্রাউজারের নিজের ভেতরে — কোনো বার্তা যায় না
                    </text>
                    <text x="96" y={y + 10} fontSize="11" fill={broken ? "#fca5a5" : "#fcd34d"}>
                      {broken
                        ? "স্বাক্ষর ✕ · CA অপরিচিত ✕ · মেয়াদ ✓"
                        : "স্বাক্ষর ✓ · ডোমেইন নাম ✓ · মেয়াদ ✓"}
                    </text>
                  </g>
                )}

                {item.direction === "local" && item.id === "session-key" && (
                  <g>
                    <rect
                      x="84"
                      y={y - 21}
                      width="256"
                      height="42"
                      rx="9"
                      fill="rgba(251,191,36,0.07)"
                      stroke="rgba(251,191,36,0.45)"
                      strokeDasharray="4 4"
                    />
                    <text
                      className="net-mono"
                      x="212"
                      y={y - 5}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="#fcd34d"
                      opacity="0.85"
                    >
                      client random + server random + secret
                    </text>
                    <text x="212" y={y + 11} fontSize="10.5" textAnchor="middle" fill="#fcd34d">
                      session key তৈরি হচ্ছে
                    </text>

                    <rect
                      x="620"
                      y={y - 21}
                      width="256"
                      height="42"
                      rx="9"
                      fill="rgba(251,191,36,0.07)"
                      stroke="rgba(251,191,36,0.45)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="748"
                      y={y - 5}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="#fcd34d"
                      opacity="0.85"
                    >
                      একই হিসাব, উল্টো দিক থেকে
                    </text>
                    <text x="748" y={y + 11} fontSize="10.5" textAnchor="middle" fill="#fcd34d">
                      session key তৈরি হচ্ছে
                    </text>

                    {/* the two keys meeting in the middle */}
                    <path
                      d={`M342 ${y} H618`}
                      stroke="#fcd34d"
                      strokeWidth="1.3"
                      strokeDasharray="4 5"
                      fill="none"
                      markerEnd="url(#tls-arrow-req)"
                      markerStart="url(#tls-arrow-start-req)"
                      opacity="0.6"
                    />
                    <text x={MID_X} y={y - 10} fontSize="10" textAnchor="middle" fill="#8b9bb9">
                      দুই পক্ষ আলাদাভাবে হিসাব করে — চাবি কখনো পাঠানো হয় না
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Failure banner: the handshake ends here. */}
          {broken && (
            <g>
              <rect
                x={MID_X - 210}
                y={rowY(VERIFY_INDEX) + 30}
                width="420"
                height="38"
                rx="11"
                fill="rgba(248,113,113,0.1)"
                stroke="rgba(248,113,113,0.55)"
              />
              <text x={MID_X} y={rowY(VERIFY_INDEX) + 54} fontSize="11.5" textAnchor="middle" fill="#fca5a5">
                ✕ সংযোগ এখানেই বন্ধ — কোনো session key তৈরি হয়নি
              </text>
            </g>
          )}

          <text className="net-figure-label" x="18" y={VIEW_H - 12}>
            TLS HANDSHAKE · 8 MESSAGES · 3 JOBS · 1 ROUND TRIP
          </text>
        </svg>
      </figure>

      {/* How to read the picture */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[10.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="30" height="8" viewBox="0 0 30 8" aria-hidden="true">
            <path d="M0 4 H24" stroke="#3ddbd9" strokeWidth="1.7" />
            <path d="M24 0 L30 4 L24 8 z" fill="#3ddbd9" />
          </svg>
          খোলা বার্তা — যে কেউ পড়তে পারে
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="30" height="8" viewBox="0 0 30 8" aria-hidden="true">
            <path d="M0 4 H24" stroke="#7ee7e2" strokeWidth="8" strokeOpacity="0.18" strokeLinecap="round" />
            <path d="M0 4 H24" stroke="#7ee7e2" strokeWidth="1.7" />
            <path d="M24 0 L30 4 L24 8 z" fill="#7ee7e2" />
          </svg>
          এনক্রিপ্টেড — টানেলের ভেতরে
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-signal">
            ▶
          </span>
          ব্রাউজার → সার্ভার
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-laser">
            ◀
          </span>
          সার্ভার → ব্রাউজার
        </span>
        <span className="bangla ml-auto text-faint">ছবির যেকোনো সারিতে ক্লিক করে সেই ধাপে যাও</span>
      </div>

      <StepControls player={player} label="TLS handshake" />

      {/* ---------------------------------------------------------------- */}
      {/* Step explanation + keys                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div
            className="space-y-3 rounded-2xl border p-4"
            aria-live="polite"
            style={{ borderColor: `${accent}59`, background: `${accent}0d` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: accent }}>
                ধাপ {toBn(player.index + 1)} / {toBn(TLS_STEPS.length)} · {stalled ? "সংযোগ বন্ধ" : step.tag}
              </p>
              <span
                className="bangla rounded-full border px-2 py-0.5 text-[9.5px] text-faint"
                style={{ borderColor: "rgba(255,255,255,0.16)" }}
              >
                {levelOption.label} স্তর
              </span>
            </div>

            <h3 className="bangla text-[16px] font-semibold leading-snug text-white">
              {stalled ? "এখান থেকে আর কোনো বার্তা যায় না" : step.title}
            </h3>

            {stalled ? (
              <>
                <p className="bangla text-[13px] leading-relaxed text-muted">
                  সার্টিফিকেট যাচাইয়েই ব্রাউজার থেমে গেছে, তাই “{step.title.split(" — ")[0]}” পর্যন্ত
                  কথোপকথন আর এগোয় না। কোনো session key তৈরি হয় না, কোনো HTTP বার্তাও পাঠানো হয় না —
                  পাসওয়ার্ড হাতে পৌঁছানোর প্রশ্নই ওঠে না।
                </p>
                <div className="rounded-xl border border-[#f87171]/40 bg-[#f87171]/[0.08] p-3">
                  <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-[#fca5a5]">
                    মনে রাখো
                  </p>
                  <p className="bangla mt-1 text-[12.5px] leading-relaxed text-ink">
                    তালা আইকনটা আসল প্রশ্ন নয়। আসল প্রশ্ন হলো — যাচাই পেরোচ্ছে কি না। যাচাই ব্যর্থ হলে
                    সংযোগই হয় না, আর কোনো ডাটা তারে ওঠে না।
                  </p>
                </div>
              </>
            ) : (
              <>
                {explanation.map((paragraph) => (
                  <p key={paragraph} className="bangla text-[13px] leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </>
            )}

            {level === "deep" && !stalled && (
              <div className="rounded-xl border border-laser/30 bg-laser/[0.07] p-3">
                <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-laser">
                  ভেতরের খুঁটিনাটি
                </p>
                <p className="bangla mt-1 text-[12.5px] leading-relaxed text-ink">{step.detail}</p>
              </div>
            )}

            {!stalled && (
              <>
                <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-3">
                  <p className="bangla flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-warn">
                    <Lightbulb size={11} className="shrink-0" /> উপমা দিয়ে বুঝি
                  </p>
                  <p className="bangla mt-1 text-[12.5px] leading-relaxed text-ink">{step.analogy}</p>
                </div>

                <div>
                  <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                    তার যা দেখা যায়
                  </p>
                  <pre className="net-code mt-1.5 rounded-lg border border-white/[0.07] bg-[#04060d] p-2.5 text-[11px]">
                    {step.wire.join("\n")}
                  </pre>
                </div>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
            <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-white">
              সার্ভারের সার্টিফিকেট
            </p>
            <dl className="space-y-2 p-4 text-[11.5px]">
              {[
                ["CN (ডোমেইন)", "bank.example"],
                ["Issuer (কে স্বাক্ষর করেছে)", forged ? "Unknown CA — স্বাক্ষর নেই" : "Trusted Root CA"],
                ["মেয়াদ", "2026-02-01 → 2027-02-01"],
                ["Public key", "ECDHE P-256"],
                ["স্বাক্ষর যাচাই", forged ? "invalid ✕" : "valid ✓"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="bangla text-faint">{label}</dt>
                  <dd
                    className={cn(
                      "net-code shrink-0 text-right text-[11px]",
                      forged && (label === "Issuer (কে স্বাক্ষর করেছে)" || label === "স্বাক্ষর যাচাই")
                        ? "text-[#fca5a5]"
                        : "text-ink",
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-white/[0.07] p-3">
              <Switch
                checked={forged}
                onChange={(next) => {
                  setForged(next);
                  if (next && player.index > VERIFY_INDEX) player.go(VERIFY_INDEX);
                }}
                onLabel="জাল সার্টিফিকেট — CA স্বাক্ষর নেই"
                offLabel="বৈধ সার্টিফিকেট (CA স্বাক্ষরিত)"
                description="চালু করলে ব্রাউজার কীভাবে সংযোগ বাতিল করে তা দেখো।"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
            <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-white">
              চাবি কোথা থেকে এল
            </p>
            <div className="space-y-2 p-4">
              {[
                { label: "client random", value: CLIENT_RANDOM, ready: player.index >= 0 },
                { label: "server random", value: SERVER_RANDOM, ready: player.index >= 1 },
                { label: "shared secret (ECDHE)", value: SHARED_SECRET, ready: player.index >= 4 && !broken },
                { label: "session key", value: SESSION_KEY, ready: keyReady },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
                    row.label === "session key"
                      ? row.ready
                        ? "border-signal/50 bg-signal/10"
                        : "border-white/10 bg-white/[0.02]"
                      : "border-white/[0.07] bg-white/[0.02]",
                  )}
                >
                  <span className="net-code shrink-0 text-[9.5px] uppercase tracking-[0.12em] text-faint">
                    {row.label}
                  </span>
                  <span className={cn("net-code text-[10.5px]", row.ready ? "text-ink" : "text-faint")}>
                    {row.ready ? row.value : "—"}
                  </span>
                </div>
              ))}
              <p
                className={cn(
                  "bangla flex items-start gap-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed",
                  broken
                    ? "border-[#f87171]/40 bg-[#f87171]/[0.08] text-[#fca5a5]"
                    : keyReady
                      ? "border-signal/35 bg-signal/[0.07] text-signal"
                      : "border-white/10 bg-white/[0.02] text-muted",
                )}
              >
                {broken ? (
                  <>
                    <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                    <span>
                      সার্টিফিকেট যাচাই ব্যর্থ, তাই ব্রাউজার handshake-ই থামিয়ে দিয়েছে — পাসওয়ার্ড পাঠানোর প্রশ্নই
                      আসে না।
                    </span>
                  </>
                ) : keyReady ? (
                  <>
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                    <span>
                      দুই পক্ষ আলাদাভাবে হিসাব করেও একই session key পেয়েছে। বাকি সব HTTP বার্তা এই symmetric চাবিতেই
                      এনক্রিপ্ট হবে।
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldQuestion size={13} className="mt-0.5 shrink-0" />
                    <span>চাবি এখনো তৈরি হয়নি — handshake-এর ধাপগুলো এগোলে এখানে দেখা যাবে।</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <ol className="space-y-1.5">
            {TLS_STEPS.map((item, index) => {
              const active = index === player.index;
              const done = index < player.index && !(broken && index > VERIFY_INDEX);
              const itemPhase = phaseOf(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => player.go(index)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "bangla flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[12.5px] transition-colors",
                      active
                        ? "border-white/25 bg-white/[0.06] text-white"
                        : "border-transparent text-muted hover:border-white/15 hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[9.5px]"
                      style={{
                        borderColor: active ? itemPhase.color : `${itemPhase.color}66`,
                        background: active ? itemPhase.color : "transparent",
                        color: active ? "#04121a" : itemPhase.color,
                      }}
                    >
                      {done ? "✓" : toBn(index + 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.title.split(" — ")[0]}</span>
                    <span className="shrink-0 text-[10.5px] text-faint">{item.moment}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="bangla rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-faint">
            {TLS_NOTE}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* What the handshake actually bought                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-2xl border border-laser/30 bg-laser/[0.06] p-4 md:p-5">
        <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-laser">
          handshake শেষ হলে কী বদলাল
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            {
              icon: <Fingerprint size={14} />,
              title: "পরিচয় নিশ্চিত",
              body: "সার্টিফিকেট ও CA স্বাক্ষর মিলে গেছে — সামনের সার্ভারটি সত্যিই bank.example।",
            },
            {
              icon: <KeyRound size={14} />,
              title: "গোপন চাবি তৈরি",
              body: "ECDHE-তে দুই পক্ষের কাছে একই session key, আর সেটি কখনো তারে পাঠানো হয়নি।",
            },
            {
              icon: <LockKeyhole size={14} />,
              title: "বার্তা অখণ্ড",
              body: "Finished ও AEAD tag মিলেছে — কেউ একটা বাইট বদলালেই ধরা পড়বে।",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="bangla flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                <span className="text-laser">{card.icon}</span>
                {card.title}
              </p>
              <p className="bangla mt-1 text-[11.5px] leading-relaxed text-muted">{card.body}</p>
            </div>
          ))}
        </div>
        <p className="bangla mt-3 text-[11.5px] leading-relaxed text-faint">
          এরপর HTTP-র নিয়ম বদলায় না — শুধু প্রতিটি বাইট এনক্রিপ্ট হয়ে যায়। ব্রাউজারের বন্ধ তালা 🔒 এই তিনটি
          প্রতিশ্রুতিরই সারসংক্ষেপ।
        </p>
      </div>
    </div>
  );
}
