import { useEffect, useState, type CSSProperties } from "react";
import { Send } from "lucide-react";
import {
  HTTP_HTTPS_DIFF,
  HTTPS_NOTE,
  PAYLOAD_SAMPLES,
} from "@/lib/network/copy";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { Button, Callout, ChoiceGroup, Switch } from "./ui/primitives";

/*
 * HTTP vs HTTPS, side by side.
 *
 * The same message leaves the same browser down two wires at the same time.
 * On the top wire it is written in the open, so the attacker in the middle of
 * the network reads it without any effort. On the bottom wire TLS turns the
 * same bytes into ciphertext first, so the same attacker captures noise.
 *
 * The TLS switch is the point of the exercise: turn it off and HTTPS collapses
 * back into plain HTTP, which is what "HTTPS = HTTP + TLS" actually means.
 */

const LANE = {
  http: { top: 10, wireY: 112, attackerY: 148 },
  https: { top: 250, wireY: 352, attackerY: 388 },
} as const;

const WIRE_LEFT = 212;
const WIRE_RIGHT = 748;
const BOX_Y = 46;
const BOX_H = 104;
const BROWSER_X = 32;
const SERVER_X = 748;
const ATTACKER_X = 368;
const ATTACKER_W = 224;
const ATTACKER_H = 74;
const CHIP_Y_OFFSET = 13;
const CAPTURE_DELAY = 1400;

const MONO = 6.1;

function chipWidth(text: string, locked: boolean) {
  return Math.round(14 + text.length * MONO + (locked ? 18 : 0));
}

function LockGlyph({
  x,
  y,
  color,
  open = false,
}: {
  x: number;
  y: number;
  color: string;
  open?: boolean;
}) {
  return (
    <g stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <rect x={x} y={y + 4} width="10" height="7" rx="1.6" fill={color} fillOpacity={open ? 0.12 : 0.28} />
      <path d={open ? `M${x + 2} ${y + 4} V${y + 2.4} a3 3 0 0 1 6 0` : `M${x + 2} ${y + 4} V${y + 2.4} a3 3 0 0 1 6 0 V${y + 4}`} />
      <circle cx={x + 5} cy={y + 7.4} r="1" fill={color} stroke="none" />
    </g>
  );
}

function EyeGlyph({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round">
      <path d="M0 6 Q7 -1.5 14 6 Q7 13.5 0 6 Z" />
      <circle cx="7" cy="6" r="2.3" fill={color} stroke="none" />
    </g>
  );
}

interface LaneTone {
  accent: string;
  accentSoft: string;
  laneFill: string;
  laneStroke: string;
  title: string;
  subtitle: string;
  port: string;
  address: string;
  secure: boolean;
}

function laneTone(secure: boolean, isHttps: boolean): LaneTone {
  if (secure) {
    return {
      accent: "#3ddbd9",
      accentSoft: "#7ee7e2",
      laneFill: "rgba(61,219,217,0.035)",
      laneStroke: "rgba(61,219,217,0.22)",
      title: "HTTPS",
      subtitle: "TLS এনক্রিপশন",
      port: "port 443",
      address: "https://bank.example",
      secure: true,
    };
  }
  return {
    accent: "#fbbf24",
    accentSoft: "#fcd34d",
    laneFill: "rgba(251,191,36,0.03)",
    laneStroke: "rgba(251,191,36,0.2)",
    title: isHttps ? "HTTPS · TLS বন্ধ" : "HTTP",
    subtitle: isHttps ? "এখন আর এনক্রিপশন নেই" : "কোনো এনক্রিপশন নেই",
    port: isHttps ? "port 443 · plain" : "port 80",
    address: isHttps ? "https://bank.example" : "http://bank.example",
    secure: false,
  };
}

function BrowserCard({ tone, toneName }: { tone: LaneTone; toneName: string }) {
  const y = toneName === "http" ? LANE.http.top + BOX_Y : LANE.https.top + BOX_Y;
  return (
    <g>
      <rect
        x={BROWSER_X}
        y={y}
        width="180"
        height={BOX_H}
        rx="10"
        fill="rgba(11,17,32,0.95)"
        stroke={tone.laneStroke}
        strokeWidth="1.3"
      />
      <rect
        x={BROWSER_X + 10}
        y={y + 10}
        width="160"
        height="46"
        rx="6"
        fill="#04060d"
        stroke="rgba(148,176,224,0.18)"
      />
      <rect
        x={BROWSER_X + 16}
        y={y + 16}
        width="148"
        height="14"
        rx="7"
        fill="rgba(255,255,255,0.05)"
      />
      <text
        className="net-mono"
        x={BROWSER_X + 22}
        y={y + 26}
        fontSize="8"
        fill={tone.accentSoft}
      >
        {tone.address}
      </text>
      {/* page placeholder lines */}
      <rect x={BROWSER_X + 18} y={y + 38} width="52" height="3" rx="1.5" fill="rgba(255,255,255,0.16)" />
      <rect x={BROWSER_X + 18} y={y + 45} width="96" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />
      <LockGlyph x={BROWSER_X + 14} y={y + 66} color={tone.accent} open={!tone.secure} />
      <text
        x={BROWSER_X + 31}
        y={y + 76}
        fontSize="10.5"
        fill={tone.accentSoft}
      >
        {tone.secure ? "Secure · তালা বন্ধ" : "Not secure · খোলা তালা"}
      </text>
      <text className="net-mono" x={BROWSER_X + 14} y={y + 95} fontSize="8" fill="#697b98">
        BROWSER · CLIENT
      </text>
    </g>
  );
}

function ServerCard({ tone, toneName }: { tone: LaneTone; toneName: string }) {
  const y = toneName === "http" ? LANE.http.top + BOX_Y : LANE.https.top + BOX_Y;
  return (
    <g>
      <rect
        x={SERVER_X}
        y={y}
        width="180"
        height={BOX_H}
        rx="10"
        fill="rgba(11,17,32,0.95)"
        stroke={tone.laneStroke}
        strokeWidth="1.3"
      />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect
            x={SERVER_X + 12}
            y={y + 12 + row * 17}
            width="156"
            height="13"
            rx="3"
            fill="rgba(255,255,255,0.035)"
            stroke="rgba(148,176,224,0.12)"
          />
          <circle cx={SERVER_X + 20} cy={y + 18.5 + row * 17} r="1.8" fill={tone.accent} opacity="0.8" />
          <circle cx={SERVER_X + 28} cy={y + 18.5 + row * 17} r="1.8" fill="#60a5fa" opacity="0.55" />
          <text className="net-mono" x={SERVER_X + 38} y={y + 22.5 + row * 17} fontSize="7" fill="#4b5b75">
            ●●●●●●●●●●●●
          </text>
        </g>
      ))}
      <LockGlyph x={SERVER_X + 12} y={y + 66} color={tone.accent} open={!tone.secure} />
      <text x={SERVER_X + 29} y={y + 76} fontSize="10.5" fill={tone.accentSoft}>
        {tone.secure ? "TLS এখানেই শেষ হয়" : "বার্তা খোলা অবস্থায় থাকে"}
      </text>
      <text className="net-mono" x={SERVER_X + 12} y={y + 95} fontSize="8" fill="#697b98">
        WEB SERVER
      </text>
    </g>
  );
}

function AttackerNode({
  toneName,
  captured,
  secure,
  readout,
  status,
}: {
  toneName: "http" | "https";
  captured: boolean;
  secure: boolean;
  readout: string;
  status: string;
}) {
  const y = toneName === "http" ? LANE.http.attackerY : LANE.https.attackerY;
  return (
    <g>
      <rect
        x={ATTACKER_X}
        y={y}
        width={ATTACKER_W}
        height={ATTACKER_H}
        rx="10"
        fill="rgba(248,113,113,0.055)"
        stroke="rgba(248,113,113,0.35)"
        strokeWidth="1.2"
      />
      <EyeGlyph x={ATTACKER_X + 12} y={y + 12} color="#fca5a5" />
      <text x={ATTACKER_X + 34} y={y + 22} fontSize="10.5" fill="#fca5a5">
        মাঝপথের নেটওয়ার্ক · attacker
      </text>
      <text
        className="net-mono"
        x={ATTACKER_X + 12}
        y={y + 47}
        fontSize="9.5"
        fill={captured ? (secure ? "#7ee7e2" : "#fca5a5") : "#697b98"}
      >
        {captured ? readout : "… কিছু ধরা পড়েনি"}
      </text>
      <text
        x={ATTACKER_X + 12}
        y={y + 65}
        fontSize="10"
        fill={captured ? (secure ? "#3ddbd9" : "#f87171") : "#697b98"}
      >
        {captured ? status : "বার্তা পাঠালে এখানে দেখা যাবে"}
      </text>
      {/* the tap on the wire */}
      <path
        d={`M${ATTACKER_X + ATTACKER_W / 2} ${toneName === "http" ? LANE.http.wireY : LANE.https.wireY} V${y}`}
        stroke="rgba(248,113,113,0.45)"
        strokeWidth="1.2"
        strokeDasharray="3 5"
        fill="none"
      />
    </g>
  );
}

function PacketChip({
  text,
  x,
  y,
  tone,
  locked,
  width,
}: {
  text: string;
  x: number;
  y: number;
  tone: LaneTone;
  locked: boolean;
  width: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height="26"
        rx="7"
        fill={locked ? "rgba(61,219,217,0.14)" : "rgba(251,191,36,0.13)"}
        stroke={tone.accent}
        strokeWidth="1.3"
      />
      {locked && <LockGlyph x={x + 7} y={y + 7} color={tone.accent} />}
      <text
        className="net-mono"
        x={x + (locked ? 23 : 9)}
        y={y + 16.5}
        fontSize="10"
        fill={tone.accentSoft}
      >
        {text}
      </text>
    </g>
  );
}

export function HttpVsHttps({ className }: { className?: string }) {
  const [payloadId, setPayloadId] = useState(PAYLOAD_SAMPLES[0].id);
  const [tlsOn, setTlsOn] = useState(true);
  const [sent, setSent] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [run, setRun] = useState(0);
  const reduced = useReducedMotion();
  const payload = PAYLOAD_SAMPLES.find((item) => item.id === payloadId) ?? PAYLOAD_SAMPLES[0];

  const httpTone = laneTone(false, false);
  const httpsTone = laneTone(tlsOn, true);

  // Reveal what the attacker captured only after the packet has crossed the wire.
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setCaptured(true), CAPTURE_DELAY);
    return () => window.clearTimeout(id);
  }, [sent, run, payloadId, tlsOn]);

  const send = () => {
    setCaptured(false);
    setSent(true);
    setRun((current) => current + 1);
  };

  const reset = () => {
    setCaptured(false);
    setSent(false);
  };

  const changePayload = (id: string) => {
    setPayloadId(id);
    setSent(false);
    setCaptured(false);
  };

  const toggleTls = (next: boolean) => {
    setTlsOn(next);
    setSent(false);
    setCaptured(false);
  };

  const httpText = payload.plain;
  const httpsText = tlsOn ? payload.cipher : payload.plain;
  const httpWidth = chipWidth(httpText, false);
  const httpsWidth = chipWidth(httpsText, tlsOn);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
        <ChoiceGroup
          label="কী পাঠাবে?"
          size="sm"
          value={payloadId}
          onChange={changePayload}
          options={PAYLOAD_SAMPLES.map((item) => ({ id: item.id, label: item.label }))}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={send} icon={<Send size={13} />}>
            {sent ? "আবার দুটি লেনে পাঠাও" : "দুটি লেনে একই বার্তা পাঠাও"}
          </Button>
          <Button variant="quiet" onClick={reset} disabled={!sent}>
            লগ মুছো
          </Button>
          <p className="bangla ml-auto text-[11.5px] text-faint">
            {sent ? "প্যাকেট পথে…" : "একই বার্তা, দুটি ভিন্ন পথ"}
          </p>
        </div>
        <div className="mt-3">
          <Switch
            checked={tlsOn}
            onChange={toggleTls}
            onLabel="HTTPS লেনে TLS স্তর চালু"
            offLabel="TLS স্তর বন্ধ — HTTPS-ও এখন প্লেইন টেক্সট"
            description="TLS বন্ধ করে দেখো: HTTPS আসলে HTTP-ই, শুধু TLS মোড়কে মোড়া।"
          />
        </div>
      </div>

      <figure className="net-figure net-figure--wide">
        <svg
          viewBox="0 0 960 500"
          role="img"
          aria-label="একই বার্তা HTTP ও HTTPS দিয়ে পাঠানো হচ্ছে — মাঝপথের attacker কী দেখতে পাচ্ছে তার তুলনা"
        >
          <defs>
            <marker id="hh-arrow-http" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#fbbf24" />
            </marker>
            <marker id="hh-arrow-https" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#3ddbd9" />
            </marker>
          </defs>

          {(["http", "https"] as const).map((key) => {
            const tone = key === "http" ? httpTone : httpsTone;
            const top = key === "http" ? LANE.http.top : LANE.https.top;
            const wireY = key === "http" ? LANE.http.wireY : LANE.https.wireY;
            const secure = key === "https" && tlsOn;
            const chipText = key === "http" ? httpText : httpsText;
            const width = key === "http" ? httpWidth : httpsWidth;
            const startX = WIRE_LEFT + 4;
            const endX = WIRE_RIGHT - width - 6;
            const chipTop = wireY - CHIP_Y_OFFSET;
            const locked = key === "https" && tlsOn;

            return (
              <g key={key}>
                {/* lane */}
                <rect
                  x="12"
                  y={top}
                  width="936"
                  height="230"
                  rx="16"
                  fill={tone.laneFill}
                  stroke={tone.laneStroke}
                  strokeWidth="1.2"
                />
                <text className="net-mono" x="32" y={top + 27} fontSize="11" fill={tone.accent}>
                  {tone.title}
                </text>
                <text x={32 + tone.title.length * 7.2 + 10} y={top + 27} fontSize="11" fill="#8b9bb9">
                  {tone.subtitle}
                </text>
                <text
                  className="net-mono"
                  x="928"
                  y={top + 27}
                  fontSize="9"
                  textAnchor="end"
                  fill="#697b98"
                >
                  {tone.port}
                </text>

                <BrowserCard tone={tone} toneName={key} />
                <ServerCard tone={tone} toneName={key} />

                {/* wire */}
                <path
                  d={`M${WIRE_LEFT} ${wireY} H${WIRE_RIGHT}`}
                  stroke={tone.accent}
                  strokeOpacity="0.5"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                  fill="none"
                  className="net-flow"
                  markerEnd={secure ? "url(#hh-arrow-https)" : "url(#hh-arrow-http)"}
                />

                {!sent && (
                  <text
                    x={(WIRE_LEFT + WIRE_RIGHT) / 2}
                    y={wireY - 8}
                    fontSize="10"
                    textAnchor="middle"
                    fill="#697b98"
                  >
                    “বার্তা পাঠাও” চাপলে প্যাকেট এই পথে যাবে
                  </text>
                )}

                {sent && (
                  <g
                    key={`${key}-${run}`}
                    className={reduced ? undefined : "hh-packet"}
                    style={
                      (reduced
                        ? { transform: `translate(${(startX + endX) / 2}px, ${chipTop}px)` }
                        : {
                            "--hh-from": `${startX}px`,
                            "--hh-to": `${endX}px`,
                            "--hh-y": `${chipTop}px`,
                          }) as CSSProperties
                    }
                  >
                    <PacketChip
                      text={chipText}
                      x={0}
                      y={0}
                      tone={tone}
                      locked={locked}
                      width={width}
                    />
                  </g>
                )}

                <AttackerNode
                  toneName={key}
                  captured={captured}
                  secure={secure}
                  readout={key === "http" ? httpText : httpsText}
                  status={
                    secure
                      ? "শুধু সাইফারটেক্সট — অর্থ বোঝা যায় না"
                      : "প্লেইন টেক্সট — সহজেই পড়া যাচ্ছে"
                  }
                />
              </g>
            );
          })}

          <text className="net-figure-label" x="32" y="492">
            SAME MESSAGE · TWO WIRES · ONE EAVESDROPPER
          </text>
        </svg>
      </figure>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
          <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-white">
            attacker-এর স্ক্রিন — মাঝপথের নেটওয়ার্কে যা ধরা পড়ল
          </p>
          <div className="space-y-3 p-4">
            <div>
              <p className="net-code text-warn">HTTP → {sent ? httpText : "…"}</p>
              <p className="bangla mt-1 text-[11.5px] leading-relaxed text-warn/90">
                {sent ? "সহজেই পড়া যাচ্ছে — পাসওয়ার্ড, কুকি, সব।" : "এখনো কিছু পাঠানো হয়নি।"}
              </p>
            </div>
            <div className="border-t border-white/[0.07] pt-3">
              <p className={cn("net-code", tlsOn ? "text-signal" : "text-warn")}>
                HTTPS → {sent ? httpsText : "…"}
              </p>
              <p
                className={cn(
                  "bangla mt-1 text-[11.5px] leading-relaxed",
                  tlsOn ? "text-signal/90" : "text-warn/90",
                )}
              >
                {!sent
                  ? "এখনো কিছু পাঠানো হয়নি।"
                  : tlsOn
                    ? "শুধু এলোমেলো বাইট — কোনো অর্থ নেই, চাবি ছাড়া খোলা যায় না।"
                    : "TLS বন্ধ, তাই HTTPS-ও প্লেইন টেক্সট — সব পড়া যাচ্ছে।"}
              </p>
            </div>
          </div>
        </div>

        <Callout tone={tlsOn ? "cyan" : "amber"} title="একই পথ, দুই রকম প্যাকেট">
          <p>{HTTPS_NOTE}</p>
          <p className="text-[11.5px] text-faint">
            {sent
              ? `তুমি যা পাঠালে: “${payload.plain}” — ${payload.risk}`
              : "নিচের বার্তাটি বেছে নিয়ে পাঠালে দেখা যাবে, কে কী পড়তে পারে।"}
          </p>
        </Callout>
      </div>
    </div>
  );
}

/** The HTTP / HTTPS difference table. */
export function HttpHttpsDiffTable({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-white/12", className)}>
      <table className="w-full min-w-[680px] border-collapse text-left">
        <caption className="sr-only">HTTP ও HTTPS-এর ধাপে ধাপে পার্থক্য</caption>
        <thead>
          <tr className="bg-white/[0.04]">
            <th scope="col" className="bangla px-4 py-3 text-[12px] font-semibold text-white">
              বিষয়
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold">
              <span className="net-mono text-[11px] tracking-[0.12em] text-warn">HTTP</span>
              <span className="bangla ml-2 text-[11px] font-normal text-muted">প্লেইন</span>
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold">
              <span className="net-mono text-[11px] tracking-[0.12em] text-signal">HTTPS</span>
              <span className="bangla ml-2 text-[11px] font-normal text-muted">TLS মোড়কে</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {HTTP_HTTPS_DIFF.map((row) => (
            <tr key={row.id} className="border-t border-white/[0.07] align-top">
              <th
                scope="row"
                className="bangla px-4 py-3 text-[12.5px] font-medium text-ink"
              >
                {row.topic}
              </th>
              <td className="bangla px-4 py-3 text-[12px] leading-relaxed text-warn/85">
                {row.http}
              </td>
              <td className="bangla px-4 py-3 text-[12px] leading-relaxed text-signal/90">
                {row.https}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
