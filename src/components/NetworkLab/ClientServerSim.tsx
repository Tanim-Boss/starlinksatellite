import { useEffect, useRef, useState } from "react";
import { Power, Send, Users } from "lucide-react";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Button, ChoiceGroup } from "./ui/primitives";

/*
 * Client ↔ server, as a live little network.
 *
 * Three client machines — two laptops and a desktop — send requests to one
 * rack server. Amber packets carry the request out, teal packets carry the
 * response back. The server works on one job at a time, so simultaneous
 * requests pile up in its queue; turning the server off mid-flight loses
 * requests, and a client that hears nothing for 7 s gives up (Timeout).
 *
 * The engine below reads only refs, never state, so callbacks belonging to a
 * packet already in flight stay correct whatever the controls do meanwhile.
 */

type ReqTypeId = "home" | "login" | "video";

const REQ_TYPES: Record<ReqTypeId, { label: string; path: string; factor: number }> = {
  home: { label: "GET /home", path: "/home", factor: 1 },
  login: { label: "POST /login", path: "/login", factor: 1.5 },
  video: { label: "GET /video", path: "/video", factor: 3 },
};

/** Request label → the path the little browser shows once the reply lands. */
const REQ_TYPES_URL: Record<string, string> = Object.fromEntries(
  Object.values(REQ_TYPES).map((type) => [type.label, type.path]),
);

const REQ_OPTIONS = [
  { id: "home", label: "GET /home (হালকা)" },
  { id: "login", label: "POST /login (মাঝারি)" },
  { id: "video", label: "GET /video (ভারী)" },
];

type Vec = [number, number];

interface ClientDef {
  name: string;
  kind: "laptop" | "desktop";
  deviceBn: string;
  accent: string;
  x: number;
  y: number;
  port: Vec;
}

const CLIENTS: ClientDef[] = [
  { name: "Client A", kind: "laptop", deviceBn: "ল্যাপটপ", accent: "#38bdf8", x: 36, y: 20, port: [258, 88] },
  { name: "Client B", kind: "desktop", deviceBn: "ডেস্কটপ", accent: "#a78bfa", x: 36, y: 222, port: [272, 308] },
  { name: "Client C", kind: "laptop", deviceBn: "ল্যাপটপ", accent: "#34d399", x: 36, y: 436, port: [258, 504] },
];

/** Rack geometry + the three network jacks on its left edge. */
const SX = 756;
const SY = 64;
const SW = 210;
const SH = 508;
const SERVER_PORTS: Vec[] = [
  [SX, 214],
  [SX, 322],
  [SX, 430],
];
/** How far each cable bows away from a straight line. */
const CABLE_BOW = [-30, 0, 30];

const TIMEOUT_MS = 7000;
const MAX_LOG_LINES = 30;
const QUEUE_SLOTS = 5;

type ClientPhase = "idle" | "waiting" | "ok" | "timeout";

interface ClientState {
  phase: ClientPhase;
  text: string;
  reqLabel?: string;
  url: string;
}

const IDLE_CLIENT: ClientState = { phase: "idle", text: "অপেক্ষায়", url: "example.com" };

const PHASE_FILL: Record<ClientPhase, string> = {
  idle: "#8b9bb9",
  waiting: "#fcd34d",
  ok: "#6ee7b7",
  timeout: "#fca5a5",
};

interface Packet {
  id: number;
  kind: "request" | "response";
  x: number;
  y: number;
}

interface Job {
  id: number;
  client: number;
  label: string;
  factor: number;
  startedAt: number;
  done: boolean;
  dead: boolean;
  timeoutId?: number;
}

interface CurrentJob {
  label: string;
  clientName: string;
  unit: number;
}

function cableControl(client: number): Vec {
  const [x1, y1] = CLIENTS[client].port;
  const [x2, y2] = SERVER_PORTS[client];
  return [(x1 + x2) / 2, (y1 + y2) / 2 + CABLE_BOW[client]];
}

function cablePath(client: number): string {
  const [x1, y1] = CLIENTS[client].port;
  const [cx, cy] = cableControl(client);
  const [x2, y2] = SERVER_PORTS[client];
  return `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
}

function quadPoint(p0: Vec, c: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

/* -------------------------------------------------------------------------- */
/* What a client screen shows: a tiny browser that reacts to the request      */
/* -------------------------------------------------------------------------- */

function ScreenContent({
  w,
  h,
  phase,
  accent,
  url,
  reduced,
}: {
  w: number;
  h: number;
  phase: ClientPhase;
  accent: string;
  url: string;
  reduced: boolean;
}) {
  const loaded = phase === "ok";
  const lineOpacity = loaded ? 0.75 : 0.28;
  const blockW = (w - 28) / 3;
  const chipY = h - 12;

  return (
    <g>
      {/* browser chrome */}
      <rect x="0" y="0" width={w} height="18" fill="rgba(255,255,255,0.06)" />
      <circle cx="10" cy="9" r="3" fill="#f87171" opacity="0.85" />
      <circle cx="22" cy="9" r="3" fill="#fbbf24" opacity="0.85" />
      <circle cx="34" cy="9" r="3" fill="#34d399" opacity="0.85" />
      <rect x="44" y="4" width={w - 52} height="10" rx="5" fill="rgba(2,6,17,0.55)" stroke="rgba(148,176,224,0.18)" strokeWidth="0.6" />
      <text className="net-mono" x="50" y="11.8" fontSize="6.8" fill="#9fb4d8">
        {url}
      </text>

      {/* page body: image block + text lines, faint until the response lands */}
      <rect x="10" y="26" width="52" height="30" rx="4" fill={accent} opacity={loaded ? 0.9 : 0.35} />
      <polygon points="14,52 26,38 36,46 44,40 58,52" fill="rgba(255,255,255,0.4)" />
      <circle cx="50" cy="33" r="3" fill="rgba(255,255,255,0.55)" />
      <rect x="70" y="28" width={w - 80} height="5" rx="2.5" fill="rgba(255,255,255,0.9)" opacity={lineOpacity} />
      <rect x="70" y="37" width={w - 96} height="5" rx="2.5" fill="rgba(255,255,255,0.9)" opacity={lineOpacity} />
      <rect x="70" y="46" width={w - 88} height="5" rx="2.5" fill="rgba(255,255,255,0.9)" opacity={lineOpacity} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={10 + i * (blockW + 4)}
          y="64"
          width={blockW}
          height={h - 86}
          rx="3"
          fill="rgba(255,255,255,0.9)"
          opacity={loaded ? 0.3 : 0.12}
        />
      ))}

      {/* status chip */}
      {phase === "waiting" && (
        <g>
          <circle
            className={reduced ? undefined : "cs-spin"}
            cx="16"
            cy={chipY}
            r="5.5"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinecap="round"
          />
          <text x="26" y={chipY + 3} fontSize="8" fill="#fcd34d">
            লোড হচ্ছে…
          </text>
        </g>
      )}
      {phase === "ok" && (
        <g>
          <circle cx="16" cy={chipY} r="6" fill="#1d9e75" />
          <path d={`M13.2 ${chipY} l2.2 2.2 L19.4 ${chipY - 2.6}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text className="net-mono" x="26" y={chipY + 3} fontSize="8" fill="#6ee7b7">
            200 OK
          </text>
        </g>
      )}
      {phase === "timeout" && (
        <g>
          <circle cx="16" cy={chipY} r="6" fill="#b91c1c" />
          <path d={`M13.8 ${chipY - 2.2} l4.4 4.4 M18.2 ${chipY - 2.2} l-4.4 4.4`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <text className="net-mono" x="26" y={chipY + 3} fontSize="8" fill="#fca5a5">
            Timeout
          </text>
        </g>
      )}
      {phase === "idle" && (
        <g>
          <circle cx="16" cy={chipY} r="3" fill="#697b98" />
          <text className="net-mono" x="24" y={chipY + 2.6} fontSize="7.5" fill="#697b98">
            ready
          </text>
        </g>
      )}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* The devices                                                                */
/* -------------------------------------------------------------------------- */

interface DeviceProps {
  def: ClientDef;
  state: ClientState;
  reduced: boolean;
  onSend: () => void;
}

function DeviceLabels({ cx, nameY, def, state }: { cx: number; nameY: number; def: ClientDef; state: ClientState }) {
  return (
    <g>
      <circle cx={cx - 62} cy={nameY - 4} r="4" fill={def.accent} />
      <text className="net-node-title" x={cx - 52} y={nameY}>
        {def.name} — {def.deviceBn}
      </text>
      <text x={cx - 52} y={nameY + 18} fontSize="11.5" fontWeight="600" fill={PHASE_FILL[state.phase]}>
        {state.text}
      </text>
    </g>
  );
}

function Laptop({ def, state, reduced, onSend }: DeviceProps) {
  return (
    <g
      transform={`translate(${def.x} ${def.y})`}
      className="net-clickable"
      role="button"
      tabIndex={0}
      aria-label={`${def.name} (${def.deviceBn}) থেকে request পাঠাও`}
      onClick={onSend}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSend();
        }
      }}
    >
      <rect className="net-focus-ring" x="-6" y="-8" width="238" height="204" rx="14" fill="transparent" stroke="transparent" />
      <ellipse cx="112" cy="152" rx="104" ry="7" fill="rgba(0,0,0,0.35)" />

      {/* lid + screen */}
      <rect x="12" y="0" width="200" height="128" rx="10" fill="url(#cs-bezel)" stroke="rgba(148,176,224,0.35)" strokeWidth="1.2" />
      <circle cx="112" cy="5" r="2" fill="#5b6b87" />
      <rect x="20" y="9" width="184" height="110" rx="4" fill="url(#cs-screen)" />
      <g transform="translate(20 9)">
        <ScreenContent w={184} h={110} phase={state.phase} accent={def.accent} url={state.url} reduced={reduced} />
      </g>
      <polygon points="20,119 92,9 132,9 60,119" fill="rgba(255,255,255,0.045)" />

      {/* ethernet plug on the right edge */}
      <rect x="212" y="63" width="9" height="10" rx="2" fill="#22304d" stroke="rgba(61,219,217,0.45)" strokeWidth="0.8" />

      {/* hinge + keyboard deck */}
      <rect x="82" y="128" width="60" height="5" rx="2" fill="#0d1424" />
      <polygon points="0,148 224,148 212,134 12,134" fill="url(#cs-alu)" stroke="rgba(148,176,224,0.35)" strokeWidth="1" />
      <rect x="62" y="137.5" width="100" height="4" rx="2" fill="rgba(4,6,13,0.35)" />
      <rect x="102" y="144.5" width="20" height="2.5" rx="1.2" fill="rgba(4,6,13,0.4)" />

      <DeviceLabels cx={112} nameY={170} def={def} state={state} />
    </g>
  );
}

function Desktop({ def, state, reduced, onSend }: DeviceProps) {
  return (
    <g
      transform={`translate(${def.x} ${def.y})`}
      className="net-clickable"
      role="button"
      tabIndex={0}
      aria-label={`${def.name} (${def.deviceBn}) থেকে request পাঠাও`}
      onClick={onSend}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSend();
        }
      }}
    >
      <rect className="net-focus-ring" x="-6" y="-8" width="248" height="212" rx="14" fill="transparent" stroke="transparent" />
      <ellipse cx="112" cy="168" rx="112" ry="7" fill="rgba(0,0,0,0.35)" />

      {/* PC tower */}
      <rect x="192" y="26" width="36" height="116" rx="7" fill="url(#cs-bezel)" stroke="rgba(148,176,224,0.35)" strokeWidth="1.2" />
      <circle cx="210" cy="41" r="4.5" fill="none" stroke="#3ddbd9" strokeWidth="1.4" />
      <circle cx="210" cy="41" r="1.6" fill="#3ddbd9" />
      <rect x="199" y="53" width="22" height="5" rx="2" fill="rgba(255,255,255,0.14)" />
      {[68, 76, 84, 92, 100].map((y) => (
        <line key={y} x1="199" y1={y} x2="221" y2={y} stroke="rgba(255,255,255,0.13)" strokeWidth="2" />
      ))}
      <circle cx="210" cy="128" r="2.5" fill="#34d399" />
      {/* ethernet plug on the tower */}
      <rect x="228" y="81" width="8" height="10" rx="2" fill="#22304d" stroke="rgba(61,219,217,0.45)" strokeWidth="0.8" />

      {/* monitor */}
      <rect x="4" y="0" width="182" height="118" rx="9" fill="url(#cs-bezel)" stroke="rgba(148,176,224,0.35)" strokeWidth="1.2" />
      <rect x="12" y="8" width="166" height="96" rx="4" fill="url(#cs-screen)" />
      <g transform="translate(12 8)">
        <ScreenContent w={166} h={96} phase={state.phase} accent={def.accent} url={state.url} reduced={reduced} />
      </g>
      <polygon points="12,104 76,8 110,8 46,104" fill="rgba(255,255,255,0.045)" />
      <circle cx="95" cy="111" r="2" fill="#5b6b87" />
      <polygon points="86,118 104,118 108,142 82,142" fill="#141d31" stroke="rgba(148,176,224,0.25)" strokeWidth="0.8" />
      <rect x="52" y="142" width="86" height="7" rx="3.5" fill="url(#cs-alu)" stroke="rgba(148,176,224,0.3)" strokeWidth="0.8" />

      {/* keyboard + mouse */}
      <rect x="30" y="154" width="122" height="12" rx="4" fill="#141d31" stroke="rgba(148,176,224,0.3)" strokeWidth="0.8" />
      <rect x="36" y="157.5" width="110" height="2" rx="1" fill="rgba(255,255,255,0.16)" />
      <rect x="36" y="161.5" width="110" height="2" rx="1" fill="rgba(255,255,255,0.16)" />
      <ellipse cx="172" cy="160" rx="9" ry="6.5" fill="#141d31" stroke="rgba(148,176,224,0.3)" strokeWidth="0.8" />
      <line x1="172" y1="154.5" x2="172" y2="159" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

      <DeviceLabels cx={116} nameY={186} def={def} state={state} />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* The rack server                                                            */
/* -------------------------------------------------------------------------- */

const RACK_UNITS = ["UNIT 1 · WEB", "UNIT 2 · APP", "UNIT 3 · DB", "UNIT 4 · FILE"];

function ServerRack({
  on,
  busy,
  queueLen,
  current,
  reduced,
}: {
  on: boolean;
  busy: boolean;
  queueLen: number;
  current: CurrentJob | null;
  reduced: boolean;
}) {
  const statusBn = !on ? "বন্ধ" : busy ? "প্রসেস করছে…" : "নিষ্ক্রিয়";
  const statusColor = !on ? "#f87171" : busy ? "#fbbf24" : "#3ddbd9";
  const border = !on ? "rgba(248,113,113,0.55)" : busy ? "rgba(251,191,36,0.6)" : "rgba(167,139,250,0.5)";

  return (
    <g transform={`translate(${SX} ${SY})`}>
      <ellipse cx={SW / 2} cy={SH + 16} rx={SW / 2 + 6} ry="8" fill="rgba(0,0,0,0.35)" />
      <rect x="0" y="0" width={SW} height={SH} rx="16" fill="url(#cs-rack)" stroke={border} strokeWidth="1.6" />

      {/* side rails + screws */}
      <rect x="8" y="10" width="6" height={SH - 20} rx="3" fill="rgba(255,255,255,0.06)" />
      <rect x={SW - 14} y="10" width="6" height={SH - 20} rx="3" fill="rgba(255,255,255,0.06)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i} fill="rgba(255,255,255,0.2)">
          <circle cx="11" cy={34 + i * 62} r="2" />
          <circle cx={SW - 11} cy={34 + i * 62} r="2" />
        </g>
      ))}

      {/* header plate */}
      <text className="net-node-title" x="24" y="30" fontSize="15">
        Server
      </text>
      <text className="net-node-sub" x="24" y="47">
        RACK SERVER · WEB-01
      </text>
      {on && <circle cx="172" cy="28" r="10" fill="#34d399" opacity="0.22" />}
      <circle cx="172" cy="28" r="6" fill={on ? "#34d399" : "#f87171"} stroke="#020a14" strokeWidth="1.2" />

      {/* status LCD */}
      <rect x="24" y="60" width="162" height="46" rx="6" fill="#020a14" stroke={statusColor} strokeWidth="1" opacity="0.95" />
      <text x="105" y="82" textAnchor="middle" fontSize="13" fontWeight="600" fill={statusColor}>
        {statusBn}
      </text>
      <text className="net-mono" x="105" y="97" textAnchor="middle" fontSize="7" fill="#697b98">
        {current ? `${current.label} · ${current.clientName}` : on ? "READY" : "OFFLINE"}
      </text>

      {/* rack units */}
      <g opacity={on ? 1 : 0.55}>
        {RACK_UNITS.map((unit, i) => {
          const uy = 118 + i * 62;
          const active = on && busy && current?.unit === i;
          return (
            <g key={unit}>
              <rect
                x="24"
                y={uy}
                width="162"
                height="54"
                rx="7"
                fill="url(#cs-unit)"
                stroke={active ? "rgba(251,191,36,0.75)" : "rgba(148,176,224,0.22)"}
                strokeWidth={active ? 1.4 : 1}
              />
              <rect x="30" y={uy + 12} width="5" height="30" rx="2" fill="rgba(255,255,255,0.18)" />
              {[42, 70].map((bx) => (
                <g key={bx}>
                  <rect x={bx} y={uy + 9} width="24" height="36" rx="3" fill="rgba(2,6,17,0.5)" stroke="rgba(148,176,224,0.18)" strokeWidth="0.7" />
                  <circle
                    className={active && !reduced ? "cs-blink" : undefined}
                    cx={bx + 6}
                    cy={uy + 40}
                    r="1.8"
                    fill={!on ? "#39445c" : active ? "#fbbf24" : "#34d399"}
                  />
                </g>
              ))}
              {[0, 1, 2, 3, 4].map((col) =>
                [0, 1, 2].map((row) => (
                  <circle key={`${col}-${row}`} cx={106 + col * 7} cy={uy + 16 + row * 8} r="1.5" fill="rgba(255,255,255,0.16)" />
                )),
              )}
              <text className="net-mono" x="104" y={uy + 47} fontSize="6.8" fill="#8b9bb9">
                {unit}
              </text>
              <circle cx="174" cy={uy + 16} r="3" fill={on ? "#34d399" : "#39445c"} />
              <circle
                className={active && !reduced ? "cs-blink" : undefined}
                cx="174"
                cy={uy + 28}
                r="3"
                fill={!on ? "#39445c" : active ? "#fbbf24" : "#1f6f5f"}
              />
            </g>
          );
        })}
      </g>

      {/* queue */}
      <text x="24" y="392" fontSize="11" fill="#c7d3ea">
        অপেক্ষার কিউ
      </text>
      <text className="net-mono" x="186" y="392" textAnchor="end" fontSize="7.5" fill="#697b98">
        {`QUEUE ${queueLen}`}
      </text>
      {Array.from({ length: QUEUE_SLOTS }, (_, k) => {
        const filled = k < queueLen;
        return (
          <g key={k}>
            <rect
              x={24 + k * 32}
              y="400"
              width="26"
              height="26"
              rx="5"
              fill={filled ? "#f59e0b" : "rgba(148,176,224,0.08)"}
              stroke={filled ? "#fbbf24" : "rgba(148,176,224,0.25)"}
              strokeWidth="1"
            />
            {filled && <rect x={30 + k * 32} y="408.5" width="14" height="9" rx="2" fill="rgba(2,6,17,0.45)" />}
          </g>
        );
      })}
      {queueLen > QUEUE_SLOTS && (
        <text className="net-mono" x="186" y="418" textAnchor="end" fontSize="9" fill="#fbbf24">
          {`+${queueLen - QUEUE_SLOTS}`}
        </text>
      )}

      {/* bottom vent strip + casters */}
      <rect x="24" y="442" width="162" height="18" rx="4" fill="rgba(255,255,255,0.04)" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <circle key={i} cx={36 + i * 15} cy="451" r="2" fill="rgba(255,255,255,0.14)" />
      ))}
      <rect x="30" y={SH} width="16" height="10" rx="3" fill="#0d1424" />
      <rect x={SW - 46} y={SH} width="16" height="10" rx="3" fill="#0d1424" />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* The simulation                                                             */
/* -------------------------------------------------------------------------- */

export function ClientServerSim({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  const [reqType, setReqType] = useState<ReqTypeId>("home");
  const [latency, setLatency] = useState(800);
  const [procMs, setProcMs] = useState(700);
  const [serverOn, setServerOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const [current, setCurrent] = useState<CurrentJob | null>(null);
  const [clients, setClients] = useState<ClientState[]>([IDLE_CLIENT, IDLE_CLIENT, IDLE_CLIENT]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [logLines, setLogLines] = useState<string[]>([
    `${"0.0".padStart(5, " ")}s  একটা Client বেছে request পাঠাও।`,
  ]);

  /* Engine state lives in refs so in-flight callbacks never go stale. */
  const t0Ref = useRef(Date.now());
  const reqTypeRef = useRef<ReqTypeId>("home");
  const latencyRef = useRef(800);
  const procRef = useRef(700);
  const serverOnRef = useRef(true);
  const busyRef = useRef(false);
  const queueRef = useRef<Job[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Set<number>>(new Set());
  const rafsRef = useRef<Set<number>>(new Set());
  const mountedRef = useRef(true);
  const logBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    reqTypeRef.current = reqType;
    latencyRef.current = latency;
    procRef.current = procMs;
  });

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const rafs = rafsRef.current;
    return () => {
      mountedRef.current = false;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      rafs.forEach((id) => window.cancelAnimationFrame(id));
      rafs.clear();
    };
  }, []);

  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLines]);

  function later(ms: number, fn: () => void): number {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }

  function clearLater(id?: number) {
    if (id === undefined) return;
    window.clearTimeout(id);
    timersRef.current.delete(id);
  }

  function addLog(message: string) {
    const stamp = `${(((Date.now() - t0Ref.current) / 1000).toFixed(1)).padStart(5, " ")}s`;
    setLogLines((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), `${stamp}  ${message}`]);
  }

  function setClientAt(index: number, next: ClientState) {
    setClients((prev) => prev.map((item, i) => (i === index ? next : item)));
  }

  function syncQueue() {
    setQueueLen(queueRef.current.length);
  }

  /** Animate one packet along a client's cable, then run `done`. */
  function fly(client: number, kind: Packet["kind"], duration: number, done: () => void) {
    const from = kind === "request" ? CLIENTS[client].port : SERVER_PORTS[client];
    const to = kind === "request" ? SERVER_PORTS[client] : CLIENTS[client].port;
    const control = cableControl(client);
    const id = nextIdRef.current++;
    setPackets((prev) => [...prev, { id, kind, x: from[0], y: from[1] }]);

    const started = performance.now();
    const step = (now: number) => {
      if (!mountedRef.current) return;
      const p = Math.min(1, (now - started) / duration);
      const [x, y] = quadPoint(from, control, to, p);
      setPackets((prev) => prev.map((packet) => (packet.id === id ? { ...packet, x, y } : packet)));
      if (p < 1) {
        const raf = requestAnimationFrame(step);
        rafsRef.current.add(raf);
      } else {
        setPackets((prev) => prev.filter((packet) => packet.id !== id));
        done();
      }
    };
    const first = requestAnimationFrame(step);
    rafsRef.current.add(first);
  }

  /** The server takes the next queued job, if it is on and idle. */
  function work() {
    if (busyRef.current || queueRef.current.length === 0 || !serverOnRef.current) return;
    const job = queueRef.current.shift()!;
    busyRef.current = true;
    setBusy(true);
    setCurrent({ label: job.label, clientName: CLIENTS[job.client].name, unit: job.id % RACK_UNITS.length });
    syncQueue();
    addLog(`Server প্রসেস করছে : ${job.label} (${CLIENTS[job.client].name})`);

    later(procRef.current * job.factor, () => {
      busyRef.current = false;
      setBusy(false);
      setCurrent(null);

      if (!serverOnRef.current) {
        addLog(`Server বন্ধ হয়ে যাওয়ায় ${CLIENTS[job.client].name}-এর কাজটি শেষ হলো না`);
        work();
        return;
      }

      addLog(`Server → ${CLIENTS[job.client].name} : 200 OK`);
      fly(job.client, "response", latencyRef.current, () => {
        job.done = true;
        clearLater(job.timeoutId);
        const sec = ((Date.now() - job.startedAt) / 1000).toFixed(1);
        if (job.dead) addLog(`${CLIENTS[job.client].name} : দেরিতে response পেল (${sec}s)`);
        setClientAt(job.client, {
          phase: "ok",
          text: `200 OK · ${sec}s`,
          reqLabel: job.label,
          url: `example.com${REQ_TYPES_URL[job.label] ?? ""}`,
        });
      });
      work();
    });
  }

  function send(client: number) {
    const type = REQ_TYPES[reqTypeRef.current];
    const name = CLIENTS[client].name;
    const job: Job = {
      id: nextIdRef.current++,
      client,
      label: type.label,
      factor: type.factor,
      startedAt: Date.now(),
      done: false,
      dead: false,
    };

    setClientAt(client, {
      phase: "waiting",
      text: `অপেক্ষায়… ${type.label}`,
      reqLabel: type.label,
      url: `example.com${type.path}`,
    });
    addLog(`${name} → Server : ${type.label}`);

    job.timeoutId = later(TIMEOUT_MS, () => {
      if (!job.done) {
        job.dead = true;
        setClientAt(client, {
          phase: "timeout",
          text: "Timeout",
          reqLabel: type.label,
          url: `example.com${type.path}`,
        });
        addLog(`${name} : কোনো উত্তর এলো না (Timeout)`);
      }
    });

    fly(client, "request", latencyRef.current, () => {
      if (!serverOnRef.current) {
        addLog(`Server বন্ধ — ${name}-এর request হারিয়ে গেল`);
        return;
      }
      queueRef.current.push(job);
      syncQueue();
      if (busyRef.current) addLog(`${name}-এর request কিউতে অপেক্ষা করছে`);
      work();
    });
  }

  function toggleServer() {
    const next = !serverOnRef.current;
    serverOnRef.current = next;
    setServerOn(next);
    if (!next) {
      queueRef.current = [];
      syncQueue();
      addLog("Server বন্ধ করা হলো");
    } else {
      addLog("Server আবার চালু");
      work();
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ------------------------------------------------------------ controls */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <ChoiceGroup
            label="Request ধরন"
            options={REQ_OPTIONS}
            value={reqType}
            onChange={(id) => setReqType(id as ReqTypeId)}
          />
          <div className="flex items-center gap-4 pb-1">
            <span className="bangla flex items-center gap-1.5 text-[12px] text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef9f27]" />
              Request
            </span>
            <span className="bangla flex items-center gap-1.5 text-[12px] text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d9e75]" />
              Response
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CLIENTS.map((client, i) => (
            <Button key={client.name} variant="ghost" icon={<Send size={13} />} onClick={() => send(i)}>
              {client.name} পাঠাক
            </Button>
          ))}
          <Button
            variant="primary"
            icon={<Users size={14} />}
            onClick={() => {
              send(0);
              send(1);
              send(2);
            }}
          >
            সবাই একসাথে
          </Button>
          <span className="bangla text-[11.5px] text-faint">
            নিচের ল্যাপটপ/ডেস্কটপে ক্লিক করলেও সেই ক্লায়েন্ট request পাঠাবে
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cs-latency" className="bangla flex items-center justify-between text-[12px] text-muted">
              নেটওয়ার্ক দেরি
              <span className="font-mono text-[11px] text-signal">{latency} ms</span>
            </label>
            <input
              id="cs-latency"
              type="range"
              min={300}
              max={1500}
              step={100}
              value={latency}
              onChange={(event) => setLatency(Number(event.target.value))}
              className="mt-1.5 w-full accent-[#3ddbd9]"
            />
          </div>
          <div>
            <label htmlFor="cs-proc" className="bangla flex items-center justify-between text-[12px] text-muted">
              সার্ভারের গতি (প্রতি কাজ)
              <span className="font-mono text-[11px] text-signal">{procMs} ms</span>
            </label>
            <input
              id="cs-proc"
              type="range"
              min={300}
              max={1500}
              step={100}
              value={procMs}
              onChange={(event) => setProcMs(Number(event.target.value))}
              className="mt-1.5 w-full accent-[#3ddbd9]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant={serverOn ? "danger" : "primary"}
            icon={<Power size={14} />}
            onClick={toggleServer}
            ariaPressed={!serverOn}
          >
            {serverOn ? "সার্ভার বন্ধ করো" : "সার্ভার চালু করো"}
          </Button>
          <p className="bangla text-[12px] text-muted" aria-live="polite">
            সার্ভার এখন <span className={serverOn ? "text-signal" : "text-[#fca5a5]"}>{serverOn ? "চালু" : "বন্ধ"}</span>
            {serverOn && busy ? " · একটি request প্রসেস হচ্ছে" : ""} · কিউতে {toBn(queueLen)}টি request
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- figure */}
      <figure className="net-figure">
        <svg
          viewBox="0 0 1000 640"
          role="img"
          aria-label="ক্লায়েন্ট-সার্ভার ডায়াগ্রাম: বাঁয়ে দুটি ল্যাপটপ ও একটি ডেস্কটপ ক্লায়েন্ট, ডানে একটি র‍্যাক সার্ভার; কেবল দিয়ে প্যাকেট চলাচল করে"
        >
          <defs>
            <linearGradient id="cs-bezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#26334f" />
              <stop offset="1" stopColor="#111a2e" />
            </linearGradient>
            <linearGradient id="cs-screen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#10233f" />
              <stop offset="1" stopColor="#0a1628" />
            </linearGradient>
            <linearGradient id="cs-alu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3c4c6e" />
              <stop offset="1" stopColor="#1c2740" />
            </linearGradient>
            <linearGradient id="cs-rack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b2740" />
              <stop offset="1" stopColor="#0c1424" />
            </linearGradient>
            <linearGradient id="cs-unit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#273453" />
              <stop offset="1" stopColor="#131e33" />
            </linearGradient>
          </defs>

          {/* cables */}
          {CLIENTS.map((client, i) => {
            const linkBusy = clients[i].phase === "waiting" || packets.length > 0;
            return (
              <g key={client.name}>
                <path
                  d={cablePath(i)}
                  className={cn(
                    "net-link-wired",
                    !serverOn && "net-link--down",
                    serverOn && linkBusy && clients[i].phase === "waiting" && "net-link--busy",
                  )}
                />
                {/* jack where the cable plugs into the rack */}
                <rect
                  x={SX - 6}
                  y={SERVER_PORTS[i][1] - 8}
                  width="12"
                  height="16"
                  rx="3"
                  fill="#16223c"
                  stroke="rgba(61,219,217,0.4)"
                  strokeWidth="0.8"
                />
                <circle cx={SX} cy={SERVER_PORTS[i][1] - 12} r="2" fill={serverOn ? "#3ddbd9" : "#f87171"} />
              </g>
            );
          })}

          {/* clients */}
          {CLIENTS.map((client, i) =>
            client.kind === "laptop" ? (
              <Laptop key={client.name} def={client} state={clients[i]} reduced={reduced} onSend={() => send(i)} />
            ) : (
              <Desktop key={client.name} def={client} state={clients[i]} reduced={reduced} onSend={() => send(i)} />
            ),
          )}

          {/* server */}
          <ServerRack on={serverOn} busy={busy} queueLen={queueLen} current={current} reduced={reduced} />

          {/* packets in flight */}
          {packets.map((packet) => (
            <g key={packet.id}>
              {!reduced && (
                <circle
                  className="net-packet-halo"
                  cx={packet.x}
                  cy={packet.y}
                  r="13"
                  fill={packet.kind === "request" ? "rgba(239,159,39,0.28)" : "rgba(29,158,117,0.28)"}
                />
              )}
              <circle
                cx={packet.x}
                cy={packet.y}
                r="7"
                fill={packet.kind === "request" ? "#ef9f27" : "#1d9e75"}
                stroke="#04060d"
                strokeWidth="1.4"
              />
              <circle cx={packet.x - 2} cy={packet.y - 2} r="2" fill="rgba(255,255,255,0.55)" />
            </g>
          ))}
        </svg>
      </figure>

      {/* ---------------------------------------------------------------- log */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">লগ · Log</p>
        <div
          ref={logBoxRef}
          role="log"
          aria-live="polite"
          aria-label="সিমুলেশনের লগ"
          className="mt-2 max-h-56 min-h-[150px] overflow-y-auto font-mono text-[12px] leading-[1.7] text-[#cfe9ff]"
        >
          {logLines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
