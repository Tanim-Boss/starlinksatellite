import { useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { TLS_NOTE, TLS_STEPS } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Callout, Switch } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * The TLS handshake, drawn as a sequence diagram.
 *
 * Every row is one step of the handshake. Arrows only appear as the player
 * reaches them, so the diagram fills in the way the real conversation happens:
 * hello, hello, certificate, verify, key exchange, shared session key, finished,
 * and only then the HTTP request inside the tunnel.
 *
 * The certificate switch is the second lesson: break the trust chain and the
 * browser stops before any key exists, which is exactly why a certificate
 * matters more than the padlock icon.
 */

const CLIENT_X = 136;
const SERVER_X = 824;
const ROW_TOP = 140;
const ROW_GAP = 48;
const LIFELINE_END = 508;

const CLIENT_RANDOM = "a7 1f 9c 2b 6e 04";
const SERVER_RANDOM = "3c 82 5e 11 d9 77";
const SHARED_SECRET = "7d 4a 02 b8 91 ce";
const SESSION_KEY = "4f 0b 9e 22 13 88";

const VERIFY_INDEX = TLS_STEPS.findIndex((step) => step.id === "verify");
const KEY_INDEX = TLS_STEPS.findIndex((step) => step.id === "session-key");

function rowY(index: number) {
  return ROW_TOP + index * ROW_GAP;
}

function LockGlyph({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <rect x={x} y={y + 4} width="10" height="7" rx="1.6" fill={color} fillOpacity="0.28" />
      <path d={`M${x + 2} ${y + 4} V${y + 2.4} a3 3 0 0 1 6 0 V${y + 4}`} />
      <circle cx={x + 5} cy={y + 7.4} r="1" fill={color} stroke="none" />
    </g>
  );
}

function KeyGlyph({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <circle cx={x + 4} cy={y + 5} r="3.4" />
      <path d={`M${x + 6.6} ${y + 7.4} L${x + 13} ${y + 13.5} M${x + 10} ${y + 10.6} L${x + 8} ${y + 12.6} M${x + 12} ${y + 12.6} L${x + 10} ${y + 14.6}`} />
    </g>
  );
}

export function TlsHandshake({ className }: { className?: string }) {
  const player = useStepPlayer(TLS_STEPS.length, 3200);
  const [forged, setForged] = useState(false);
  const step = TLS_STEPS[player.index];

  // A broken certificate stops the handshake at the verification step: no key
  // is derived, so nothing after it can happen.
  const broken = forged && player.index >= VERIFY_INDEX;
  const locked = !broken && player.index >= TLS_STEPS.length - 2;

  const badge = broken
    ? { text: "সার্টিফিকেট যাচাই ব্যর্থ — সংযোগ বাতিল", color: "#f87171", fill: "rgba(248,113,113,0.1)" }
    : locked
      ? { text: "TLS tunnel চালু — সব ডাটা এনক্রিপ্টেড", color: "#3ddbd9", fill: "rgba(61,219,217,0.1)" }
      : { text: "TLS handshake চলছে…", color: "#fbbf24", fill: "rgba(251,191,36,0.09)" };

  const keyReady = player.index >= KEY_INDEX && !broken;

  return (
    <div className={cn("space-y-4", className)}>
      <figure className="net-figure net-figure--wide">
        <svg
          viewBox="0 0 960 552"
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
            <marker id="tls-arrow-req-start" markerWidth="9" markerHeight="9" refX="2" refY="4.5" orient="auto">
              <path d="M9 0 L0 4.5 L9 9 z" fill="#3ddbd9" />
            </marker>
          </defs>

          {/* client and server blocks */}
          <g>
            <rect
              x="36"
              y="26"
              width="200"
              height="78"
              rx="12"
              fill="rgba(11,17,32,0.95)"
              stroke="rgba(61,219,217,0.35)"
              strokeWidth="1.3"
            />
            <text x="50" y="54" fontSize="12.5" fontWeight="600" fill="#e9effc">
              ব্রাউজার (client)
            </text>
            <text className="net-mono" x="50" y="70" fontSize="8.5" fill="#7ee7e2">
              https://bank.example
            </text>
            <LockGlyph x={50} y={78} color={locked ? "#3ddbd9" : "#697b98"} />
            <text x="67" y="88" fontSize="10" fill={locked ? "#7ee7e2" : "#697b98"}>
              {locked ? "তালা বন্ধ · এনক্রিপ্টেড" : "তালা এখনো খোলা"}
            </text>
          </g>
          <g>
            <rect
              x="724"
              y="26"
              width="200"
              height="78"
              rx="12"
              fill="rgba(11,17,32,0.95)"
              stroke="rgba(167,139,250,0.35)"
              strokeWidth="1.3"
            />
            <text x="738" y="54" fontSize="12.5" fontWeight="600" fill="#e9effc">
              সার্ভার (server)
            </text>
            <text className="net-mono" x="738" y="70" fontSize="8.5" fill="#c4b5fd">
              TLS terminates here
            </text>
            <KeyGlyph x={738} y={76} color={keyReady ? "#a78bfa" : "#697b98"} />
            <text x="757" y="88" fontSize="10" fill={keyReady ? "#c4b5fd" : "#697b98"}>
              {keyReady ? "session key তৈরি" : "চাবি এখনো নেই"}
            </text>
          </g>

          {/* the "handshake is unencrypted, the tunnel is not" badge */}
          <g>
            <rect x="330" y="36" width="300" height="30" rx="15" fill={badge.fill} stroke={badge.color} strokeOpacity="0.5" />
            {locked ? (
              <LockGlyph x={352} y={42} color={badge.color} />
            ) : (
              <g>
                <circle cx="359" cy="51" r="6.4" fill="none" stroke={badge.color} strokeWidth="1.3" />
                <path
                  d={broken ? "M356 48 L362 54 M362 48 L356 54" : "M359 47.6 V51.4 M359 54.2 V54.6"}
                  stroke={badge.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            )}
            <text x="374" y="55" fontSize="11" fill={badge.color}>
              {badge.text}
            </text>
          </g>

          {/* lifelines */}
          <path
            d={`M${CLIENT_X} 104 V${LIFELINE_END}`}
            stroke="rgba(148,176,224,0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            fill="none"
          />
          <path
            d={`M${SERVER_X} 104 V${LIFELINE_END}`}
            stroke="rgba(148,176,224,0.22)"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            fill="none"
          />

          {TLS_STEPS.map((item, index) => {
            const y = rowY(index);
            const reached = index <= player.index;
            const active = index === player.index;
            // Once the certificate fails, nothing later in the handshake exists.
            if (!reached || (broken && index > VERIFY_INDEX)) return null;

            const isRequest = item.direction === "request";
            const isReply = item.direction === "reply";
            const isBoth = item.direction === "both";

            return (
              <g key={item.id}>
                {active && (
                  <rect
                    x="20"
                    y={y - 22}
                    width="920"
                    height="44"
                    rx="10"
                    fill="rgba(61,219,217,0.05)"
                    stroke="rgba(61,219,217,0.16)"
                  />
                )}

                {(isRequest || isReply || isBoth) && (
                  <path
                    d={`M${CLIENT_X} ${y} H${SERVER_X}`}
                    stroke={isReply ? "#a78bfa" : "#3ddbd9"}
                    strokeWidth={active ? 2.4 : 1.7}
                    strokeDasharray={active ? "7 6" : undefined}
                    className={active && !player.reduced ? "net-flow" : undefined}
                    fill="none"
                    markerEnd={isReply ? "url(#tls-arrow-rep)" : "url(#tls-arrow-req)"}
                    markerStart={isBoth ? (isReply ? "url(#tls-arrow-start-rep)" : "url(#tls-arrow-req-start)") : undefined}
                  />
                )}

                {item.direction === "local" && (
                  <>
                    <rect
                      x={item.id === "session-key" ? 40 : 44}
                      y={y - 15}
                      width="192"
                      height="30"
                      rx="8"
                      fill="rgba(251,191,36,0.07)"
                      stroke="rgba(251,191,36,0.45)"
                      strokeDasharray="4 4"
                    />
                    {item.id !== "session-key" && (
                      <text x={CLIENT_X} y={y + 4} fontSize="10.5" textAnchor="middle" fill="#fcd34d">
                        সার্টিফিকেট যাচাই ✓
                      </text>
                    )}
                    {item.id === "session-key" && (
                      <>
                        <rect
                          x={724}
                          y={y - 15}
                          width="196"
                          height="30"
                          rx="8"
                          fill="rgba(251,191,36,0.07)"
                          stroke="rgba(251,191,36,0.45)"
                          strokeDasharray="4 4"
                        />
                        <text x={CLIENT_X} y={y + 4} fontSize="10.5" textAnchor="middle" fill="#fcd34d">
                          session key
                        </text>
                        <text x={822} y={y + 4} fontSize="10.5" textAnchor="middle" fill="#fcd34d">
                          session key
                        </text>
                        <text x={(CLIENT_X + SERVER_X) / 2} y={y + 4} fontSize="10" textAnchor="middle" fill="#697b98">
                          দুই পক্ষ আলাদাভাবে হিসাব করে — একই চাবি
                        </text>
                      </>
                    )}
                  </>
                )}

                {/* arrow label */}
                {(isRequest || isReply || isBoth) && (
                  <g>
                    {item.encrypted && (
                      <LockGlyph x={(CLIENT_X + SERVER_X) / 2 - 92} y={y - 16} color="#7ee7e2" />
                    )}
                    <text
                      className="net-mono"
                      x={(CLIENT_X + SERVER_X) / 2}
                      y={y - 7}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill={active ? "#ffffff" : item.encrypted ? "#7ee7e2" : isReply ? "#c4b5fd" : "#9fe8ff"}
                    >
                      {item.wire[0]}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {broken && (
            <g>
              <rect
                x={(CLIENT_X + SERVER_X) / 2 - 190}
                y={rowY(VERIFY_INDEX) + 22}
                width="380"
                height="34"
                rx="10"
                fill="rgba(248,113,113,0.1)"
                stroke="rgba(248,113,113,0.55)"
              />
              <text
                x={(CLIENT_X + SERVER_X) / 2}
                y={rowY(VERIFY_INDEX) + 44}
                fontSize="11.5"
                textAnchor="middle"
                fill="#fca5a5"
              >
                ✕ সংযোগ এখানেই বন্ধ — কোনো session key তৈরি হয়নি
              </text>
            </g>
          )}

          <text className="net-figure-label" x="36" y="534">
            TLS HANDSHAKE · SIMPLIFIED TO ONE ROUND TRIP
          </text>
        </svg>
      </figure>

      <StepControls player={player} label="TLS handshake" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div
            className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4"
            aria-live="polite"
          >
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
              ধাপ {toBn(player.index + 1)} / {toBn(TLS_STEPS.length)} · {step.tag}
            </p>
            <h3 className="bangla mt-1.5 text-[16px] font-semibold text-white">{step.title}</h3>
            <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{step.body}</p>
            <p className="bangla font-mono mt-3 text-[9px] uppercase tracking-[0.16em] text-faint">
              তারে যা দেখা যায়
            </p>
            <pre className="net-code mt-1.5 rounded-lg border border-white/[0.07] bg-[#04060d] p-2.5 text-[11px]">
              {step.wire.join("\n")}
            </pre>
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
                onChange={setForged}
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
                {
                  label: "client random",
                  value: CLIENT_RANDOM,
                  ready: player.index >= 0,
                },
                {
                  label: "server random",
                  value: SERVER_RANDOM,
                  ready: player.index >= 1,
                },
                {
                  label: "shared secret (ECDHE)",
                  value: SHARED_SECRET,
                  ready: player.index >= 4 && !broken,
                },
                {
                  label: "session key",
                  value: SESSION_KEY,
                  ready: keyReady,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                    row.label === "session key"
                      ? row.ready
                        ? "border-signal/50 bg-signal/10"
                        : "border-white/10 bg-white/[0.02]"
                      : "border-white/[0.07] bg-white/[0.02]",
                  )}
                >
                  <span className="net-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
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
                      সার্টিফিকেট যাচাই ব্যর্থ, তাই ব্রাউজার handshake-ই থামিয়ে দিয়েছে — পাসওয়ার্ড পাঠানোর
                      প্রশ্নই আসে না।
                    </span>
                  </>
                ) : keyReady ? (
                  <>
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                    <span>
                      দুই পক্ষ আলাদাভাবে হিসাব করেও একই session key পেয়েছে। বাকি সব HTTP বার্তা এই
                      symmetric চাবিতেই এনক্রিপ্ট হবে।
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldQuestion size={13} className="mt-0.5 shrink-0" />
                    <span>
                      চাবি এখনো তৈরি হয়নি — handshake-এর ধাপগুলো এগোলে এখানে দেখা যাবে।
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <ol className="space-y-1.5">
            {TLS_STEPS.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => player.go(index)}
                  aria-current={index === player.index ? "step" : undefined}
                  className={cn(
                    "bangla flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-[12.5px] transition-colors",
                    index === player.index
                      ? "border-signal/50 bg-signal/10 text-white"
                      : "border-transparent text-muted hover:border-white/15 hover:bg-white/[0.03]",
                  )}
                >
                  <span className="font-mono text-[9.5px] text-faint">{toBn(index + 1)}</span>
                  {item.title.split(" — ")[0]}
                </button>
              </li>
            ))}
          </ol>

          <p className="bangla rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-faint">
            {TLS_NOTE}
          </p>
        </div>
      </div>

      <Callout tone="violet" title="handshake শেষ হলে কী বদলাল">
        <p>
          ব্রাউজার এখন জানে সার্ভারটি সত্যিই যাকে বলে সে-ই (সার্টিফিকেট), দুই পক্ষের কাছে একই গোপন
          session key আছে (ECDHE), এবং কেউ বার্তা বদলায়নি (Finished-এর যাচাই)। এরপর HTTP-র নিয়ম
          বদলায় না — শুধু প্রতিটি বাইট এনক্রিপ্ট হয়ে যায়।
        </p>
      </Callout>
    </div>
  );
}
