import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PlugZap, Power, Radio, RotateCcw, Send, SkipBack, SkipForward, Wifi } from "lucide-react";
import { COMPONENT_INFO, componentInfo, RESOURCES } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { Button, ChoiceGroup, InfoPanel, StepList, Switch } from "./ui/primitives";

/*
 * The interactive network playground.
 *
 * A small LAN drawn as SVG: three clients with their own NIC, a switch, a
 * server and one shared resource. Every node is a real button — click or press
 * Enter to read what it does — and a request can be fired from any client so
 * the packet visibly walks client → NIC → media → switch → server → resource
 * and back. Everything runs on a timer in the browser; no server is contacted.
 */

type Vec = [number, number];
type ClientId = "client-a" | "client-b" | "client-c";
type MediaKind = "wired" | "wireless";
type ResourceId = "printer" | "file" | "email";
type NodeId = ClientId | "switch" | "server" | "resource";

interface ClientSpec {
  id: ClientId;
  label: string;
  bn: string;
  box: [number, number, number, number];
  /** Cable/Wi-Fi path from the client's NIC to the switch. */
  link: Vec[];
  switchPort: Vec;
}

const CLIENTS: ClientSpec[] = [
  {
    id: "client-a",
    label: "Client A",
    bn: "ক্লায়েন্ট A",
    box: [40, 40, 150, 84],
    link: [
      [190, 82],
      [300, 82],
      [300, 250],
      [400, 250],
    ],
    switchPort: [400, 250],
  },
  {
    id: "client-b",
    label: "Client B",
    bn: "ক্লায়েন্ট B",
    box: [40, 236, 150, 84],
    link: [
      [190, 278],
      [400, 278],
    ],
    switchPort: [400, 278],
  },
  {
    id: "client-c",
    label: "Client C",
    bn: "ক্লায়েন্ট C",
    box: [40, 432, 150, 84],
    link: [
      [190, 474],
      [300, 474],
      [300, 306],
      [400, 306],
    ],
    switchPort: [400, 306],
  },
];

const SWITCH_BOX: [number, number, number, number] = [400, 236, 150, 84];
const SERVER_BOX: [number, number, number, number] = [760, 150, 160, 100];
const RESOURCE_BOX: [number, number, number, number] = [760, 350, 160, 96];
/** Switch → server link. */
const UPLINK: Vec[] = [
  [550, 278],
  [660, 278],
  [660, 200],
  [760, 200],
];
/** Server → shared resource. */
const RESOURCE_LINK: Vec[] = [
  [840, 250],
  [840, 350],
];

function clientCenter(client: ClientSpec): Vec {
  return [client.box[0] + 75, client.box[1] + 42];
}

function nicCenter(client: ClientSpec): Vec {
  return [client.box[0] + 123, client.box[1] + 42];
}

function toPath(points: Vec[]): string {
  return points.map((point, i) => `${i === 0 ? "M" : "L"}${point[0]} ${point[1]}`).join(" ");
}

function pointAlong(points: Vec[], t: number): Vec {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const length = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return points[0];
  let remaining = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const ratio = lengths[i] === 0 ? 0 : remaining / lengths[i];
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * ratio,
        points[i][1] + (points[i + 1][1] - points[i][1]) * ratio,
      ];
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

function midpoint(points: Vec[]): Vec {
  return pointAlong(points, 0.5);
}

/* -------------------------------------------------------------------------- */
/* Flow                                                                       */
/* -------------------------------------------------------------------------- */

type FlowKind = "request" | "process" | "response";

interface FlowStep {
  id: string;
  title: string;
  where: string;
  detail: string;
  kind: FlowKind;
  points: Vec[];
  target: NodeId;
}

type FlowPhase = "idle" | "running" | "done" | "failed";

interface Flow {
  steps: FlowStep[];
  index: number;
  progress: number;
  playing: boolean;
  phase: FlowPhase;
  status: string;
  note?: string;
}

const IDLE_FLOW: Flow = {
  steps: [],
  index: 0,
  progress: 0,
  playing: false,
  phase: "idle",
  status: "এখনো কোনো প্যাকেট পাঠানো হয়নি। ক্লায়েন্ট ও রিসোর্স বেছে নিয়ে “রিকোয়েস্ট পাঠাও” চাপো।",
};

const STEP_MS = 1400;

function buildFlow(
  client: ClientSpec,
  resource: ResourceId,
  resourceUp: boolean,
): { steps: FlowStep[]; note?: string } {
  const center = clientCenter(client);
  const nic = nicCenter(client);
  const toSwitch = [...client.link];
  const backToClient = [...client.link].reverse();
  const resourceLabel = RESOURCES.find((item) => item.id === resource)?.label ?? "রিসোর্স";

  const steps: FlowStep[] = [
    {
      id: "make-request",
      title: `${client.label}-এ request তৈরি হলো`,
      where: `${client.label} · application`,
      detail: `${client.bn} একটি সার্ভিস চাইছে। অ্যাপ্লিকেশন request তৈরি করল — এখনো সব কিছু কম্পিউটারের ভেতরেই।`,
      kind: "request",
      points: [center, nic],
      target: client.id,
    },
    {
      id: "nic-media",
      title: "NIC ডাটাকে সংকেতে বদলে মিডিয়ায় দিল",
      where: "NIC → media",
      detail:
        "NIC প্যাকেটকে মিডিয়ার উপযোগী সংকেতে রূপান্তর করল — তার হলে বৈদ্যুতিক সংকেত, Wi-Fi হলে বেতার তরঙ্গ।",
      kind: "request",
      points: [nic, ...toSwitch],
      target: "switch",
    },
    {
      id: "switch-routes",
      title: "সুইচ ঠিকানা দেখে সার্ভারের দিকে পাঠাল",
      where: "switch → server",
      detail:
        "সুইচ গন্তব্যের ঠিকানা দেখে সঠিক পোর্টে ডাটা দিল। বাইরের নেটওয়ার্কে যেতে হলে এই কাজটি করত রাউটার।",
      kind: "request",
      points: [client.switchPort, [475, 278], ...UPLINK],
      target: "server",
    },
    {
      id: "server-resource",
      title: resourceUp
        ? `সার্ভার ${resourceLabel} থেকে সার্ভিস নিল`
        : "সার্ভার রিসোর্স পেল না — ব্যর্থতা ধরা পড়ল",
      where: "server → resource",
      detail: resourceUp
        ? `সার্ভার request পড়ে প্রোটোকল মিলিয়ে দেখল, তারপর ${resourceLabel} ব্যবহার করে কাজটি সম্পন্ন করল।`
        : `রিসোর্স (${resourceLabel}) চালু নেই। সার্ভার request প্রক্রিয়া করতে পারল না, তাই সে error response তৈরি করবে।`,
      kind: "process",
      points: [[760, 200], [840, 200], ...RESOURCE_LINK],
      target: "resource",
    },
    {
      id: "make-response",
      title: resourceUp ? "সার্ভার রেসপন্স তৈরি করল" : "সার্ভার ব্যর্থতার বার্তা তৈরি করল",
      where: "server",
      detail: resourceUp
        ? "কাজ শেষ। সার্ভার ফলাফল একটি response-এ প্যাকেট করল — প্রোটোকল অনুযায়ী একটি status সহ।"
        : "রিসোর্স না পেয়ে সার্ভার একটি error status সহ response তৈরি করল (যেমন 404 বা service unavailable)।",
      kind: "response",
      points: [...RESOURCE_LINK].reverse().concat([[840, 200]]),
      target: "server",
    },
    {
      id: "response-back",
      title: "রেসপন্স একই পথে ক্লায়েন্টে ফিরল",
      where: "media → NIC → client",
      detail: `response সুইচ ও মিডিয়া দিয়ে ফিরে এসে ${client.bn}-এর NIC-এ পৌঁছাল। এখন ফলাফল স্ক্রিনে দেখানো যাবে।`,
      kind: "response",
      points: [...UPLINK].reverse().concat(backToClient, [center]),
      target: client.id,
    },
  ];

  return {
    steps,
    note: resourceUp
      ? undefined
      : "রিসোর্স বন্ধ থাকায় এই যাত্রায় শেষ পর্যন্ত একটি error response ফিরবে — বাস্তবেও তাই হয়।",
  };
}

/* -------------------------------------------------------------------------- */
/* Small SVG pieces                                                           */
/* -------------------------------------------------------------------------- */

function Clickable({
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <g
      className={cn("net-clickable", className)}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {children}
    </g>
  );
}

function Waves({ origin, disabled }: { origin: Vec; disabled?: boolean }) {
  return (
    <g transform={`translate(${origin[0]} ${origin[1]})`} opacity={disabled ? 0.3 : 1}>
      {[10, 18, 26].map((radius, i) => (
        <circle
          key={radius}
          r={radius}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.6"
          className="net-wave"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function NetworkDiagram({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [activeClient, setActiveClient] = useState<ClientId>("client-a");
  const [resourceId, setResourceId] = useState<ResourceId>("printer");
  const [media, setMedia] = useState<Record<ClientId, MediaKind>>({
    "client-a": "wired",
    "client-b": "wireless",
    "client-c": "wired",
  });
  const [linkUp, setLinkUp] = useState<Record<string, boolean>>({
    "client-a": true,
    "client-b": true,
    "client-c": true,
    uplink: true,
  });
  const [online, setOnline] = useState<Record<ClientId, boolean>>({
    "client-a": true,
    "client-b": true,
    "client-c": true,
  });
  const [resourceUp, setResourceUp] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow>(IDLE_FLOW);
  const timer = useRef<number | undefined>(undefined);

  const client = CLIENTS.find((item) => item.id === activeClient) ?? CLIENTS[0];
  const resource = RESOURCES.find((item) => item.id === resourceId) ?? RESOURCES[0];

  const stop = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => stop, [stop]);

  // The packet timer. One interval per run; the state machine moves itself.
  useEffect(() => {
    if (!flow.playing || flow.phase !== "running") return;
    stop();
    timer.current = window.setInterval(() => {
      setFlow((current) => {
        if (!current.playing) return current;
        const nextProgress = current.progress + 40 / STEP_MS;
        if (nextProgress < 1) return { ...current, progress: nextProgress };
        if (current.index >= current.steps.length - 1) {
          return {
            ...current,
            progress: 1,
            playing: false,
            phase: "done",
            status:
              "যাত্রা শেষ: request গিয়েছিল, কাজ হয়েছে, response ফিরে এসেছে। আবার চালাতে “রিসেট” করে নতুন request পাঠাও।",
          };
        }
        const next = current.index + 1;
        return { ...current, index: next, progress: 0, status: current.steps[next].title };
      });
    }, 40);
    return stop;
  }, [flow.playing, flow.phase, stop]);

  const sendRequest = useCallback(() => {
    stop();
    if (!online[activeClient]) {
      setFlow({
        ...IDLE_FLOW,
        phase: "failed",
        status: `${client.bn} বন্ধ আছে। বন্ধ কম্পিউটারের কোনো NIC সংকেত পাঠাতে পারে না, তাই request তৈরিই হলো না।`,
      });
      return;
    }
    if (!linkUp[activeClient]) {
      setFlow({
        ...IDLE_FLOW,
        phase: "failed",
        status: `${client.bn}-এর সংযোগ বিচ্ছিন্ন। মিডিয়া না থাকলে প্যাকেট চলার পথ নেই — সংযোগ যুক্ত করে আবার চেষ্টা করো।`,
      });
      return;
    }
    if (!linkUp.uplink) {
      setFlow({
        ...IDLE_FLOW,
        phase: "failed",
        status: "সুইচ ও সার্ভারের মধ্যকার লিংক খোলা। ক্লায়েন্টের ডাটা সুইচ পর্যন্ত যায়, কিন্তু সার্ভারে পৌঁছাতে পারে না।",
      });
      return;
    }
    const built = buildFlow(client, resourceId, resourceUp);
    setFlow({
      steps: built.steps,
      index: 0,
      progress: 0,
      playing: !reduced,
      phase: "running",
      status: built.steps[0].title,
      note: built.note,
    });
  }, [activeClient, client, linkUp, online, reduced, resourceId, resourceUp, stop]);

  const reset = useCallback(() => {
    stop();
    setFlow(IDLE_FLOW);
  }, [stop]);

  const stepTo = useCallback(
    (index: number) => {
      stop();
      setFlow((current) => {
        if (current.steps.length === 0) return current;
        const clamped = Math.max(0, Math.min(current.steps.length - 1, index));
        return {
          ...current,
          index: clamped,
          progress: 0,
          playing: false,
          phase: "running",
          status: current.steps[clamped].title,
        };
      });
    },
    [stop],
  );

  const stepBy = useCallback(
    (delta: number) => {
      stop();
      setFlow((current) => {
        if (current.steps.length === 0) return current;
        const clamped = Math.max(0, Math.min(current.steps.length - 1, current.index + delta));
        return {
          ...current,
          index: clamped,
          progress: 0,
          playing: false,
          phase: "running",
          status: current.steps[clamped].title,
        };
      });
    },
    [stop],
  );

  const togglePlay = useCallback(() => {
    setFlow((current) => {
      if (current.phase === "idle" || current.steps.length === 0) return current;
      if (current.phase === "done") {
        return { ...current, index: 0, progress: 0, playing: true, phase: "running", status: current.steps[0].title };
      }
      return { ...current, playing: !current.playing };
    });
  }, []);

  const currentStep = flow.steps[flow.index];
  const packetPos = useMemo(() => {
    if (!currentStep) return null;
    if (flow.phase === "done") {
      const last = flow.steps[flow.steps.length - 1];
      return pointAlong(last.points, 1);
    }
    if (flow.phase === "failed") return null;
    return pointAlong(currentStep.points, reduced ? 1 : flow.progress);
  }, [currentStep, flow.phase, flow.progress, flow.index, flow.steps, reduced]);

  const activeNode = flow.phase === "running" || flow.phase === "done" ? currentStep?.target : undefined;
  const selectedCard = selected ? componentInfo(selected) : undefined;
  const resourceLabel = resource.label;

  return (
    <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]", className)}>
      {/* ------------------------------------------------------------ figure */}
      <div className="space-y-3">
        <figure className="net-figure">
          <svg viewBox="0 0 960 560" role="img" aria-label="ছোট একটি নেটওয়ার্কের ডায়াগ্রাম: তিনটি ক্লায়েন্ট, একটি সুইচ, একটি সার্ভার ও একটি শেয়ার্ড রিসোর্স">
            {/* links */}
            {CLIENTS.map((item) => {
              const up = linkUp[item.id];
              const wireless = media[item.id] === "wireless";
              const busy =
                up &&
                activeClient === item.id &&
                (flow.phase === "running" || flow.phase === "done");
              return (
                <g key={item.id}>
                  <Clickable
                    label={`${item.label}-এর ${wireless ? "Wi-Fi" : "ইথারনেট কেবল"} সংযোগ — মিডিয়া`}
                    selected={selected === "media"}
                    onSelect={() => setSelected("media")}
                  >
                    {/* invisible wide stroke = hit area for pointer and touch */}
                    <path d={toPath(item.link)} stroke="transparent" strokeWidth="18" fill="none" />
                    <path
                      d={toPath(item.link)}
                      className={cn(
                        wireless ? "net-link-wireless" : "net-link-wired",
                        !up && "net-link--down",
                        busy && "net-link--busy",
                        busy && !reduced && "net-flow",
                      )}
                    />
                  </Clickable>
                  {wireless && up && <Waves origin={item.link[0]} />}
                  {!up && (
                    <g transform={`translate(${midpoint(item.link)[0]} ${midpoint(item.link)[1]})`}>
                      <line x1="-9" y1="-9" x2="9" y2="9" stroke="#f87171" strokeWidth="2.6" strokeLinecap="round" />
                      <line x1="9" y1="-9" x2="-9" y2="9" stroke="#f87171" strokeWidth="2.6" strokeLinecap="round" />
                      <text className="net-node-note" x="14" y="4" fill="#fca5a5">
                        বিচ্ছিন্ন
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            <Clickable
              label="সুইচ ও সার্ভারের লিংক — মিডিয়া"
              selected={selected === "media"}
              onSelect={() => setSelected("media")}
            >
              <path d={toPath(UPLINK)} stroke="transparent" strokeWidth="18" fill="none" />
              <path
                d={toPath(UPLINK)}
                className={cn(
                  "net-link-wired",
                  !linkUp.uplink && "net-link--down",
                  flow.phase === "running" && "net-link--busy",
                )}
              />
            </Clickable>
            {!linkUp.uplink && (
              <g transform={`translate(${midpoint(UPLINK)[0]} ${midpoint(UPLINK)[1]})`}>
                <line x1="-9" y1="-9" x2="9" y2="9" stroke="#f87171" strokeWidth="2.6" strokeLinecap="round" />
                <line x1="9" y1="-9" x2="-9" y2="9" stroke="#f87171" strokeWidth="2.6" strokeLinecap="round" />
              </g>
            )}

            <path d={toPath(RESOURCE_LINK)} className="net-link-wired" />

            {/* clients */}
            {CLIENTS.map((item) => {
              const off = !online[item.id];
              const center = clientCenter(item);
              const isActive = activeNode === item.id;
              const isSelected = selected === "client";
              return (
                <g key={item.id}>
                  <Clickable
                    label={`${item.bn} — ক্লিক করে কাজ দেখো`}
                    selected={isSelected || activeClient === item.id}
                    onSelect={() => {
                      setSelected("client");
                      setActiveClient(item.id);
                    }}
                    className={cn(
                      "net-node",
                      isSelected && "net-node--selected",
                      isActive && "net-node--active",
                      off && "net-node--off",
                    )}
                  >
                    <rect
                      className="net-node-box net-focus-ring"
                      x={item.box[0]}
                      y={item.box[1]}
                      width={item.box[2]}
                      height={item.box[3]}
                      rx="12"
                      fill="rgba(11,17,32,0.9)"
                      stroke="rgba(148,176,224,0.28)"
                      strokeWidth="1.4"
                    />
                    <text className="net-node-title" x={item.box[0] + 14} y={item.box[1] + 30}>
                      {item.label}
                    </text>
                    <text className="net-node-sub" x={item.box[0] + 14} y={item.box[1] + 50}>
                      {off ? "OFFLINE" : "CLIENT"}
                    </text>
                    <text className="net-node-note" x={item.box[0] + 14} y={item.box[1] + 72}>
                      {off ? "বন্ধ আছে" : "request পাঠাতে পারে"}
                    </text>
                    <circle
                      cx={item.box[0] + item.box[2] - 16}
                      cy={item.box[1] + 18}
                      r="4.5"
                      fill={off ? "#f87171" : "#3ddbd9"}
                    />
                  </Clickable>

                  {/* NIC chip — its own hit target */}
                  <Clickable
                    label={`${item.label}-এর NIC — ক্লিক করে কাজ দেখো`}
                    selected={selected === "nic"}
                    onSelect={() => setSelected("nic")}
                    className={cn("net-node", selected === "nic" && "net-node--selected")}
                  >
                    <rect
                      className="net-node-box net-focus-ring"
                      x={item.box[0] + 104}
                      y={item.box[1] + 31}
                      width="38"
                      height="22"
                      rx="4"
                      fill="rgba(61,219,217,0.12)"
                      stroke="rgba(61,219,217,0.5)"
                      strokeWidth="1.2"
                    />
                    <text className="net-node-sub" x={item.box[0] + 112} y={item.box[1] + 46} fill="#7ee7e2">
                      NIC
                    </text>
                  </Clickable>

                  {isActive && !reduced && (
                    <circle className="net-ping" cx={center[0]} cy={center[1]} r="18" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
                  )}
                </g>
              );
            })}

            {/* switch */}
            <Clickable
              label="সুইচ — ক্লিক করে কাজ দেখো"
              selected={selected === "switch"}
              onSelect={() => setSelected("switch")}
              className={cn("net-node", selected === "switch" && "net-node--selected", activeNode === "switch" && "net-node--active")}
            >
              <rect
                className="net-node-box net-focus-ring"
                x={SWITCH_BOX[0]}
                y={SWITCH_BOX[1]}
                width={SWITCH_BOX[2]}
                height={SWITCH_BOX[3]}
                rx="12"
                fill="rgba(11,17,32,0.92)"
                stroke="rgba(148,176,224,0.3)"
                strokeWidth="1.4"
              />
              <text className="net-node-title" x={SWITCH_BOX[0] + 16} y={SWITCH_BOX[1] + 32}>
                Switch
              </text>
              <text className="net-node-sub" x={SWITCH_BOX[0] + 16} y={SWITCH_BOX[1] + 50}>
                SWITCH / ROUTER
              </text>
              <text className="net-node-note" x={SWITCH_BOX[0] + 16} y={SWITCH_BOX[1] + 70}>
                সঠিক পোর্টে ডাটা দেয়
              </text>
              {[0, 1, 2].map((port) => (
                <rect
                  key={port}
                  x={SWITCH_BOX[0] + 16 + port * 26}
                  y={SWITCH_BOX[1] + SWITCH_BOX[3] - 16}
                  width="18"
                  height="7"
                  rx="2"
                  fill={CLIENTS[port] && linkUp[CLIENTS[port].id] ? "rgba(61,219,217,0.55)" : "rgba(248,113,113,0.5)"}
                />
              ))}
            </Clickable>

            {/* server */}
            <Clickable
              label="সার্ভার — ক্লিক করে কাজ দেখো"
              selected={selected === "server"}
              onSelect={() => setSelected("server")}
              className={cn("net-node", selected === "server" && "net-node--selected", activeNode === "server" && "net-node--active")}
            >
              <rect
                className="net-node-box net-focus-ring"
                x={SERVER_BOX[0]}
                y={SERVER_BOX[1]}
                width={SERVER_BOX[2]}
                height={SERVER_BOX[3]}
                rx="12"
                fill="rgba(11,17,32,0.92)"
                stroke="rgba(96,165,250,0.45)"
                strokeWidth="1.5"
              />
              <text className="net-node-title" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 32}>
                Server
              </text>
              <text className="net-node-sub" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 50}>
                SERVICE PROVIDER
              </text>
              <text className="net-node-note" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 70}>
                print / file / mail service
              </text>
              <text className="net-node-note" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 88}>
                NIC আছে, তাই নেটওয়ার্কে কথা বলে
              </text>
            </Clickable>

            {/* resource */}
            <Clickable
              label={`${resourceLabel} — শেয়ার্ড রিসোর্স, ক্লিক করে কাজ দেখো`}
              selected={selected === "resource"}
              onSelect={() => setSelected("resource")}
              className={cn(
                "net-node",
                selected === "resource" && "net-node--selected",
                activeNode === "resource" && "net-node--active",
                !resourceUp && "net-node--off",
              )}
            >
              <rect
                className="net-node-box net-focus-ring"
                x={RESOURCE_BOX[0]}
                y={RESOURCE_BOX[1]}
                width={RESOURCE_BOX[2]}
                height={RESOURCE_BOX[3]}
                rx="12"
                fill="rgba(11,17,32,0.92)"
                stroke={resourceUp ? "rgba(167,139,250,0.5)" : "rgba(248,113,113,0.6)"}
                strokeWidth="1.5"
              />
              <text className="net-node-title" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 32}>
                {resource.label}
              </text>
              <text className="net-node-sub" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 50}>
                SHARED RESOURCE
              </text>
              <text className="net-node-note" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 70}>
                {resourceUp ? "সবার জন্য খোলা" : "এখন বন্ধ"}
              </text>
            </Clickable>

            {/* packet */}
            {packetPos && (
              <g>
                {!reduced && (
                  <circle className="net-packet-halo" cx={packetPos[0]} cy={packetPos[1]} r="13" fill="rgba(61,219,217,0.28)" />
                )}
                <circle
                  cx={packetPos[0]}
                  cy={packetPos[1]}
                  r="6"
                  fill={currentStep?.kind === "response" ? "#a78bfa" : "#3ddbd9"}
                  stroke="#04060d"
                  strokeWidth="1.4"
                />
                <text className="net-node-sub" x={packetPos[0] + 12} y={packetPos[1] - 8}>
                  {currentStep?.kind === "response" ? "RESPONSE" : "PACKET"}
                </text>
              </g>
            )}

            {/* legend */}
            <g transform="translate(40 520)">
              <line x1="0" y1="0" x2="30" y2="0" className="net-link-wired" />
              <text className="net-node-note" x="38" y="4">
                wired (ইথারনেট কেবল)
              </text>
              <line x1="200" y1="0" x2="230" y2="0" className="net-link-wireless" />
              <text className="net-node-note" x="238" y="4">
                wireless (Wi-Fi)
              </text>
              <line x1="410" y1="-6" x2="422" y2="6" stroke="#f87171" strokeWidth="2.4" />
              <line x1="422" y1="-6" x2="410" y2="6" stroke="#f87171" strokeWidth="2.4" />
              <text className="net-node-note" x="432" y="4">
                সংযোগ বিচ্ছিন্ন
              </text>
              <circle cx="610" cy="0" r="6" fill="#3ddbd9" />
              <text className="net-node-note" x="622" y="4">
                request প্যাকেট
              </text>
              <circle cx="760" cy="0" r="6" fill="#a78bfa" />
              <text className="net-node-note" x="772" y="4">
                response প্যাকেট
              </text>
            </g>
          </svg>
        </figure>

        <p
          className="bangla rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink"
          aria-live="polite"
        >
          <span className="mr-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
            অবস্থা
          </span>
          {flow.status}
        </p>
        {flow.note && (
          <p className="bangla rounded-xl border border-warn/35 bg-warn/[0.07] p-3 text-[12px] leading-relaxed text-ink">
            {flow.note}
          </p>
        )}
      </div>

      {/* ----------------------------------------------------------- controls */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <ChoiceGroup
            label="কোন ক্লায়েন্ট থেকে পাঠাবে?"
            value={activeClient}
            onChange={(id) => setActiveClient(id as ClientId)}
            options={CLIENTS.map((item) => ({ id: item.id, label: item.bn }))}
            size="sm"
          />
          <div className="mt-3">
            <ChoiceGroup
              label="কোন রিসোর্স চাইবে?"
              value={resourceId}
              onChange={(id) => setResourceId(id as ResourceId)}
              options={RESOURCES.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={sendRequest} icon={<Send size={13} />}>
              রিকোয়েস্ট পাঠাও
            </Button>
            <Button
              variant="ghost"
              onClick={togglePlay}
              disabled={flow.steps.length === 0}
              ariaLabel={flow.playing ? "প্যাকেট থামাও" : "প্যাকেট চালাও"}
            >
              {flow.playing ? "থামাও" : "চালু করো"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => stepBy(-1)}
              disabled={flow.steps.length === 0 || flow.index === 0}
              ariaLabel="আগের ধাপে যাও"
              icon={<SkipBack size={13} />}
            >
              আগের ধাপ
            </Button>
            <Button
              variant="ghost"
              onClick={() => stepBy(1)}
              disabled={flow.steps.length === 0 || flow.index >= flow.steps.length - 1}
              ariaLabel="পরের ধাপে যাও"
              icon={<SkipForward size={13} />}
            >
              পরের ধাপ
            </Button>
            <Button
              variant="quiet"
              onClick={reset}
              ariaLabel="সিমুলেশন রিসেট করো"
              icon={<RotateCcw size={13} />}
            >
              রিসেট
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            সংযোগ পরীক্ষা করো
          </p>
          <Switch
            checked={online[activeClient]}
            onChange={(next) => setOnline((prev) => ({ ...prev, [activeClient]: next }))}
            onLabel={`${client.bn} চালু আছে`}
            offLabel={`${client.bn} বন্ধ (offline)`}
            description="বন্ধ করলে দেখো request কীভাবে ব্যর্থ হয়।"
          />
          <Switch
            checked={linkUp[activeClient]}
            onChange={(next) => setLinkUp((prev) => ({ ...prev, [activeClient]: next }))}
            onLabel={`${client.bn}-এর সংযোগ যুক্ত`}
            offLabel={`${client.bn}-এর সংযোগ বিচ্ছিন্ন`}
            description="কেবল খুলে দেওয়া বা Wi-Fi বন্ধ করার সমান।"
          />
          <Switch
            checked={linkUp.uplink}
            onChange={(next) => setLinkUp((prev) => ({ ...prev, uplink: next }))}
            onLabel="সুইচ ↔ সার্ভার লিংক যুক্ত"
            offLabel="সুইচ ↔ সার্ভার লিংক খোলা"
            description="এই লিংক খুললে কোনো ক্লায়েন্টই সার্ভারে পৌঁছাবে না।"
          />
          <Switch
            checked={resourceUp}
            onChange={setResourceUp}
            onLabel={`${resourceLabel} চালু আছে`}
            offLabel={`${resourceLabel} বন্ধ (unavailable)`}
            description="রিসোর্স বন্ধ থাকলে সার্ভার error response পাঠায়।"
          />
          <div className="pt-1">
            <ChoiceGroup
              label={`${client.bn}-এর মিডিয়া`}
              value={media[activeClient]}
              onChange={(id) => setMedia((prev) => ({ ...prev, [activeClient]: id as MediaKind }))}
              options={[
                { id: "wired", label: "Wired (ইথারনেট)" },
                { id: "wireless", label: "Wi-Fi (বেতার)" },
              ]}
              size="sm"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            {media[activeClient] === "wireless" ? <Wifi size={12} /> : <PlugZap size={12} />}
            এখনকার মিডিয়া
          </p>
          <p className="bangla text-[12.5px] leading-relaxed text-muted">
            {media[activeClient] === "wireless"
              ? `${client.bn} বেতার তরঙ্গে (Wi-Fi) যুক্ত — তার নেই, কিন্তু দেয়াল ও দূরত্বে সংকেত দুর্বল হতে পারে।`
              : `${client.bn} তামার ইথারনেট কেবলে যুক্ত — বৈদ্যুতিক সংকেতে ডাটা চলে, সংযোগ বেশি স্থিতিশীল।`}
          </p>
        </div>

        {flow.steps.length > 0 && (
          <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
              প্যাকেটের ধাপসমূহ ({toBn(flow.index + 1)}/{toBn(flow.steps.length)})
            </p>
            <StepList
              className="mt-2.5"
              steps={flow.steps.map((step) => ({ title: step.title, where: step.where }))}
              index={flow.index}
              onPick={stepTo}
            />
            {currentStep && (
              <p className="bangla mt-3 rounded-xl border border-signal/30 bg-signal/[0.07] p-3 text-[12.5px] leading-relaxed text-ink">
                {currentStep.detail}
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla mb-2.5 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            <Power size={12} />
            নির্বাচিত অংশের বিবরণ
          </p>
          <InfoPanel card={selectedCard} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {COMPONENT_INFO.filter((item) => item.id !== "user" && item.id !== "router").map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
                className={cn(
                  "bangla rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  selected === item.id
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-white/10 text-muted hover:border-white/25 hover:text-white",
                )}
              >
                {item.title}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={selected === "router"}
              onClick={() => setSelected("router")}
              className={cn(
                "bangla rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                selected === "router"
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-white/10 text-muted hover:border-white/25 hover:text-white",
              )}
            >
              রাউটার
            </button>
            <button
              type="button"
              aria-pressed={selected === "user"}
              onClick={() => setSelected("user")}
              className={cn(
                "bangla rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                selected === "user"
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-white/10 text-muted hover:border-white/25 hover:text-white",
              )}
            >
              ইউজার
            </button>
          </div>
          <p className="bangla mt-2 flex items-center gap-1.5 text-[11px] text-faint">
            <Radio size={11} />
            ডায়াগ্রামের অংশগুলো কীবোর্ড দিয়েও নির্বাচন করা যায়: Tab করে গিয়ে Enter চাপো।
          </p>
        </div>
      </div>
    </div>
  );
}
