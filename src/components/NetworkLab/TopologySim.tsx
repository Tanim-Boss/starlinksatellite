import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Power, RotateCcw, Scissors, Send, Unplug } from "lucide-react";
import { toBn } from "@/lib/format";
import { useReducedMotion } from "@/lib/useMediaQuery";
import {
  NODE_RADIUS,
  TOPOLOGIES,
  TOPOLOGY_META,
  TOPOLOGY_ORDER,
  busSegmentKey,
  busSegmentLabel,
  busSegments,
  endpoints,
  hasAlternateRoute,
  nodeById,
  planSend,
  pointAlong,
  reachableFrom,
  topology as topoById,
  towards,
  type BusSpec,
  type DeviceKind,
  type Point,
  type TerminatorState,
  type Topology,
  type TopologyId,
  type TopoNode,
} from "@/lib/network/topology";
import { cn } from "@/utils/cn";
import { Button, SimNote } from "./ui/primitives";

/*
 * The topology laboratory.
 *
 * One SVG stage renders seven network shapes — bus, ring, star, tree, full
 * mesh, partial mesh and a hybrid — and the visitor can do the three things a
 * textbook cannot show: switch a device off, cut a cable (including a bus
 * segment between its two real terminators) and pick exactly who sends a
 * packet to whom. A breadth-first route is computed first, then that route is
 * animated, so an impossible path reports *why* it is impossible instead of
 * pretending to deliver.
 *
 * Everything is local: a timer in this component, no network calls.
 */

const VIEW_WIDTH = 880;
const VIEW_HEIGHT = 540;
/** One cable in the animation takes this long. */
const HOP_MS = 420;

type Phase = "idle" | "running" | "ok" | "fail";

type Tone = "travel" | "ok" | "fail";

interface PacketPos extends Point {
  tone: Tone;
}

interface Result {
  path: string[];
  hops: number;
  alternate: boolean;
}

function defaultPair(id: TopologyId): { source: string; target: string } {
  const list = endpoints(TOPOLOGIES[id]);
  return { source: list[0]?.id ?? "", target: list[1]?.id ?? "" };
}

function labelOf(topo: Topology, id: string): string {
  return nodeById(topo, id)?.label ?? id;
}

const PHASE_TONE: Record<Phase, string> = {
  idle: "border-white/10 bg-white/[0.03] text-ink",
  running: "border-warn/35 bg-warn/[0.07] text-ink",
  ok: "border-signal/40 bg-signal/[0.08] text-ink",
  fail: "border-[#f87171]/40 bg-[#f87171]/[0.08] text-ink",
};

export function TopologySim() {
  const reduced = useReducedMotion();

  const [topoId, setTopoId] = useState<TopologyId>("bus");
  const [source, setSource] = useState(() => defaultPair("bus").source);
  const [target, setTarget] = useState(() => defaultPair("bus").target);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [cuts, setCuts] = useState<ReadonlySet<string>>(() => new Set());
  const [terminators, setTerminators] = useState<TerminatorState>({ left: true, right: true });
  const [packet, setPacket] = useState<PacketPos | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState(TOPOLOGY_META.bus.caption);
  const [result, setResult] = useState<Result | null>(null);
  const [heard, setHeard] = useState(false);

  const topo = topoById(topoId);
  const meta = TOPOLOGY_META[topoId];

  const runRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    runRef.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  /** Clear the current trip (packet, route, status) without touching damage. */
  const clearTrip = useCallback(
    (nextStatus?: string) => {
      stop();
      setPacket(null);
      setPhase("idle");
      setResult(null);
      setHeard(false);
      setStatus(nextStatus ?? TOPOLOGY_META[topoId].caption);
    },
    [stop, topoId],
  );

  const reachable = useMemo(
    () => reachableFrom(topo, source, removed, cuts, terminators),
    [topo, source, removed, cuts, terminators],
  );

  const devices = useMemo(() => endpoints(topo), [topo]);
  const reachableDevices = devices.filter((node) => reachable.has(node.id)).length;
  const sourceOnline = !removed.has(source);

  /* ------------------------------------------------------------- animation */

  const animate = useCallback(
    (points: Point[], msPerLeg: number): Promise<boolean> => {
      const token = runRef.current;
      const last = points[points.length - 1];
      if (reduced || points.length < 2) {
        if (last) setPacket({ x: last.x, y: last.y, tone: "travel" });
        return Promise.resolve(true);
      }
      const total = (points.length - 1) * msPerLeg;
      return new Promise((resolve) => {
        const started = performance.now();
        const frame = (now: number) => {
          if (token !== runRef.current) {
            resolve(false);
            return;
          }
          const t = Math.min(1, (now - started) / total);
          const point = pointAlong(points, t);
          setPacket({ x: point.x, y: point.y, tone: "travel" });
          if (t < 1) {
            rafRef.current = requestAnimationFrame(frame);
          } else {
            rafRef.current = null;
            resolve(true);
          }
        };
        rafRef.current = requestAnimationFrame(frame);
      });
    },
    [reduced],
  );

  const send = useCallback(async () => {
    stop();
    const token = runRef.current;
    setResult(null);
    setHeard(false);
    setPacket(null);

    const outcome = planSend(topo, source, target, removed, cuts, terminators);

    if (outcome.kind === "blocked") {
      setPhase("running");
      setStatus(outcome.message);
      if (outcome.points.length > 1) {
        const finished = await animate(outcome.points, HOP_MS);
        if (!finished || token !== runRef.current) return;
      }
      const last = outcome.points[outcome.points.length - 1];
      if (last) setPacket({ x: last.x, y: last.y, tone: "fail" });
      setPhase("fail");
      setResult({
        path: outcome.path,
        hops: Math.max(0, outcome.path.length - 1),
        alternate: false,
      });
      setStatus(outcome.message);
      return;
    }

    if (outcome.kind === "bus-echo") {
      setPhase("running");
      setStatus("প্যাকেট মূল তার বেয়ে যাচ্ছে…");
      const arrived = await animate(outcome.points, HOP_MS);
      if (!arrived || token !== runRef.current) return;
      const end = outcome.points[outcome.points.length - 1];
      const back = outcome.points[outcome.points.length - 2] ?? end;
      setStatus("প্রতিফলিত সংকেত ফিরে আসছে (echo)…");
      const bounced1 = await animate([end, back], 260);
      if (!bounced1 || token !== runRef.current) return;
      const bounced2 = await animate([back, end], 260);
      if (!bounced2 || token !== runRef.current) return;
      setPacket({ x: end.x, y: end.y, tone: "fail" });
      setPhase("fail");
      setStatus(outcome.message);
      return;
    }

    setPhase("running");
    setHeard(outcome.broadcast);
    setStatus(
      outcome.broadcast
        ? `${labelOf(topo, source)} সংকেত পাঠাল, পুরো বাস শুনছে…`
        : `${labelOf(topo, source)} → ${labelOf(topo, target)}: প্যাকেট পথে আছে…`,
    );
    const arrived = await animate(outcome.points, HOP_MS);
    if (!arrived || token !== runRef.current) return;

    const alternate = hasAlternateRoute(topo, source, target, outcome.path, removed, cuts);
    const last = outcome.points[outcome.points.length - 1];
    if (last) setPacket({ x: last.x, y: last.y, tone: "ok" });
    setPhase("ok");
    setResult({ path: outcome.path, hops: outcome.hops, alternate });

    if (outcome.broadcast) {
      setStatus(
        `পৌঁছেছে! সংকেত সব ডিভাইস শুনেছে, কিন্তু ঠিকানা মিলেছে বলে কেবল ${labelOf(
          topo,
          target,
        )} গ্রহণ করেছে। বাসে সবার মধ্যে একটিই তার, তাই hop ধরা হয় ১।`,
      );
    } else {
      setStatus(
        `পৌঁছেছে! পথ: ${outcome.path
          .map((id) => labelOf(topo, id))
          .join(" → ")} — ${toBn(outcome.hops)} hop, বিকল্প পথ ${
          alternate ? "আছে" : "নেই"
        }।`,
      );
    }
  }, [animate, cuts, removed, source, stop, target, terminators, topo]);

  /* --------------------------------------------------------------- actions */

  const pickTopology = useCallback(
    (id: TopologyId) => {
      stop();
      const pair = defaultPair(id);
      setTopoId(id);
      setSource(pair.source);
      setTarget(pair.target);
      setRemoved(new Set());
      setCuts(new Set());
      setTerminators({ left: true, right: true });
      setPacket(null);
      setResult(null);
      setPhase("idle");
      setHeard(false);
      setStatus(TOPOLOGY_META[id].caption);
    },
    [stop],
  );

  const toggleDevice = useCallback(
    (id: string) => {
      clearTrip();
      const wasOff = removed.has(id);
      setRemoved((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setStatus(
        wasOff
          ? `${labelOf(topo, id)} আবার চালু হলো। এখন কোন কোন ডিভাইসে পৌঁছানো যায় দেখো।`
          : `${labelOf(topo, id)} বন্ধ করা হলো — সে আর পাঠাতে বা নিতে পারবে না, বাকিরা কী করে দেখো।`,
      );
    },
    [clearTrip, removed, topo],
  );

  const toggleCut = useCallback(
    (key: string, onLabel: string, offLabel: string) => {
      clearTrip();
      const nowCut = !cuts.has(key);
      setCuts((previous) => {
        const next = new Set(previous);
        if (nowCut) next.add(key);
        else next.delete(key);
        return next;
      });
      setStatus(nowCut ? onLabel : offLabel);
    },
    [clearTrip, cuts],
  );

  const toggleTerminator = useCallback(
    (side: "left" | "right") => {
      clearTrip();
      const next = { left: terminators.left, right: terminators.right };
      next[side] = !next[side];
      setTerminators(next);
      setStatus(
        next[side]
          ? `${side === "left" ? "বাম" : "ডান"} terminator আবার বসানো হলো — সংকেত শুষে নেওয়া হচ্ছে।`
          : `${side === "left" ? "বাম" : "ডান"} terminator খুলে ফেলা হলো — তারের প্রান্ত খোলা, এখন সংকেত প্রতিফলিত হবে।`,
      );
    },
    [clearTrip, terminators],
  );

  const repairAll = useCallback(() => {
    clearTrip();
    setRemoved(new Set());
    setCuts(new Set());
    setTerminators({ left: true, right: true });
    setStatus("সব ডিভাইস চালু, সব তার জোড়া, দুই terminator-ই বসানো।");
  }, [clearTrip]);

  /* ------------------------------------------------------------------ view */

  const anyCut = cuts.size > 0 || !terminators.left || !terminators.right;

  const nodeState = (node: TopoNode) => {
    const off = removed.has(node.id);
    const unreachable = !off && sourceOnline && !reachable.has(node.id) && node.kind !== "switch";
    return { off, unreachable };
  };

  const handleKey = (event: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
      {/* ----------------------------------------------------------- the stage */}
      <div className="min-w-0 space-y-3">
        <figure className="net-figure topo-figure">
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            role="group"
            aria-labelledby="topo-svg-title"
            aria-describedby="topo-svg-desc"
            className="net-svg"
          >
            <title id="topo-svg-title">{meta.title} টোপোলজি</title>
            <desc id="topo-svg-desc">
              {meta.how} ডিভাইসে ক্লিক করলে বন্ধ হয়, তারে ক্লিক করলে কাটা যায়, আর নির্বাচিত উৎস থেকে
              গন্তব্যে প্যাকেট পাঠানো যায়।
            </desc>

            <defs>
              <radialGradient id="topo-stage-glow" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="rgba(61,219,217,0.1)" />
                <stop offset="100%" stopColor="rgba(61,219,217,0)" />
              </radialGradient>
            </defs>

            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#topo-stage-glow)" />

            {/* faint dot grid so the stage reads as a lab bench */}
            <g className="topo-grid" aria-hidden>
              {Array.from({ length: 12 }, (_, row) =>
                Array.from({ length: 19 }, (_, column) => (
                  <circle key={`${row}-${column}`} cx={40 + column * 45} cy={40 + row * 42} r="1" />
                )),
              )}
            </g>

            {topo.bus ? (
              <BusStage
                bus={topo.bus}
                topo={topo}
                cuts={cuts}
                removed={removed}
                terminators={terminators}
                heard={heard}
                phase={phase}
                source={source}
                target={target}
                reachable={reachable}
                onToggleCut={(index) => {
                  const key = busSegmentKey(index);
                  const cut = cuts.has(key);
                  toggleCut(
                    key,
                    `তার কাটা গেল (${busSegmentLabel(topo.bus as BusSpec, index)}) — কাটা প্রান্তে terminator নেই, এখন echo হবে।`,
                    "তার জোড়া লাগানো হলো।",
                  );
                  if (!cut) setPacket(null);
                }}
                onToggleTerminator={toggleTerminator}
                onToggleDevice={toggleDevice}
                onKey={handleKey}
              />
            ) : (
              <MeshStage
                topo={topo}
                cuts={cuts}
                phase={phase}
                source={source}
                target={target}
                onToggleCut={(edgeId, label) => {
                  toggleCut(edgeId, `${label} তার কাটা গেল।`, `${label} তার আবার যুক্ত হলো।`);
                }}
                onToggleDevice={toggleDevice}
                onKey={handleKey}
                nodeState={nodeState}
              />
            )}

            {heard && phase === "ok" && topo.bus && (
              <g aria-hidden>
                {endpoints(topo)
                  .filter((node) => node.id !== source && node.id !== target && !removed.has(node.id))
                  .map((node) => (
                    <circle
                      key={`heard-${node.id}`}
                      className="topo-heard"
                      cx={node.x}
                      cy={node.y}
                      r="36"
                      fill="none"
                      stroke="rgba(251,191,36,0.55)"
                      strokeWidth="1.4"
                    />
                  ))}
              </g>
            )}

            {packet && (
              <g transform={`translate(${packet.x} ${packet.y})`} className="topo-packet">
                {!reduced && (
                  <circle
                    className="topo-packet-halo"
                    r="15"
                    fill={packet.tone === "fail" ? "rgba(248,113,113,0.3)" : "rgba(61,219,217,0.28)"}
                  />
                )}
                <circle
                  r="8"
                  fill={packet.tone === "fail" ? "#f87171" : packet.tone === "ok" ? "#3ddbd9" : "#7ee7e2"}
                  stroke="#04060d"
                  strokeWidth="1.6"
                />
                <circle r="2.6" fill="#04060d" opacity="0.55" />
              </g>
            )}

            <text className="net-figure-label" x="24" y="30">
              {meta.en.toUpperCase()} · SIMULATED
            </text>
            <text className="topo-figure-hint" x={VIEW_WIDTH - 24} y="30" textAnchor="end">
              ডিভাইসে ক্লিক = বন্ধ/চালু · তারে ক্লিক = কাটা/জোড়া
            </text>
          </svg>
        </figure>

        {/* legend */}
        <ul className="bangla flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-muted">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-[#9fe8ff]/60" /> তার (সচল)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#f87171]" /> কাটা তার
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-signal bg-signal/20" /> উৎস
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-warn bg-warn/20" /> গন্তব্য
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7ee7e2]" /> প্যাকেট
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f87171]" /> ব্যর্থ / echo
          </li>
          {topo.bus && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm border border-faint bg-white/10" /> terminator
            </li>
          )}
        </ul>

        <p
          id="topo-status"
          aria-live="polite"
          className={cn("bangla rounded-xl border p-3 text-[12.5px] leading-relaxed", PHASE_TONE[phase])}
        >
          <span className="mr-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
            অবস্থা
          </span>
          {status}
        </p>

        <SimNote />
      </div>

      {/* --------------------------------------------------------- controls */}
      <div className="space-y-3">
        <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            টোপোলজি বদলাও
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label="টোপোলজি বেছে নাও">
            {TOPOLOGY_ORDER.map((id) => {
              const active = id === topoId;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickTopology(id)}
                  className={cn(
                    "bangla rounded-xl border px-2.5 py-2 text-left transition-colors",
                    active
                      ? "border-signal bg-signal/15 text-signal"
                      : "border-white/10 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white",
                  )}
                >
                  <span className="block text-[12.5px] leading-snug">{TOPOLOGY_META[id].title}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.12em] text-faint">
                    {TOPOLOGY_META[id].en}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="bangla mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11.5px] leading-relaxed text-muted">
            {meta.tagline}
          </p>
        </section>

        <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            কে কার কাছে পাঠাবে?
          </p>
          <PickerRow
            label="উৎস (প্রেরক)"
            accent="signal"
            nodes={devices}
            selected={source}
            removed={removed}
            onPick={(id) => {
              clearTrip();
              setSource(id);
            }}
          />
          <PickerRow
            label="গন্তব্য (প্রাপক)"
            accent="warn"
            nodes={devices}
            selected={target}
            removed={removed}
            onPick={(id) => {
              clearTrip();
              setTarget(id);
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={send}
              disabled={phase === "running"}
              icon={<Send size={13} />}
            >
              প্যাকেট পাঠাও
            </Button>
            <Button variant="quiet" onClick={repairAll} icon={<RotateCcw size={13} />}>
              সব ঠিক করো
            </Button>
          </div>
          <p className="bangla mt-2 text-[11px] leading-relaxed text-faint">
            সুইচ কখনো ডাটার উৎস বা গন্তব্য নয় — সে শুধু পথ দেখায়। তাই এখানে কেবল কম্পিউটার আছে।
          </p>
        </section>

        <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            <Unplug size={12} /> নেটওয়ার্ক ভাঙো ও সারাও
          </p>

          <p className="bangla mt-2.5 text-[11px] font-medium text-ink">ডিভাইস</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topo.nodes.map((node) => {
              const off = removed.has(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-label={`${node.label} — ${off ? "চালু করো" : "বন্ধ করো"}`}
                  aria-pressed={off}
                  onClick={() => toggleDevice(node.id)}
                  className={cn(
                    "bangla inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                    off
                      ? "border-[#f87171]/50 bg-[#f87171]/10 text-[#fca5a5] line-through"
                      : "border-white/12 text-muted hover:border-white/30 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      off ? "bg-[#f87171]" : "bg-signal",
                    )}
                  />
                  {node.label}
                  {off && <span className="font-mono text-[8.5px] uppercase">off</span>}
                </button>
              );
            })}
          </div>

          <p className="bangla mt-3 flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <Scissors size={11} /> তার / সেগমেন্ট
          </p>
          <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto pr-1">
            {topo.bus
              ? busSegments(topo.bus).map((segment) => {
                  const key = busSegmentKey(segment.index);
                  const cut = cuts.has(key);
                  return (
                    <CutRow
                      key={key}
                      label={busSegmentLabel(topo.bus as BusSpec, segment.index)}
                      cut={cut}
                      onToggle={() => toggleCut(key, "তার কাটা গেল — এখন echo হবে।", "তার জোড়া লাগানো হলো।")}
                    />
                  );
                })
              : topo.links.map((edge) => {
                  const cut = cuts.has(edge.id);
                  const arrow = edge.oneWay ? " → " : " ↔ ";
                  const label = `${labelOf(topo, edge.a)}${arrow}${labelOf(topo, edge.b)}`;
                  return (
                    <CutRow
                      key={edge.id}
                      label={label}
                      cut={cut}
                      onToggle={() =>
                        toggleCut(edge.id, `${label} তার কাটা গেল।`, `${label} তার আবার যুক্ত হলো।`)
                      }
                    />
                  );
                })}
          </div>

          {topo.bus && (
            <>
              <p className="bangla mt-3 text-[11px] font-medium text-ink">Terminator</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(["left", "right"] as const).map((side) => {
                  const on = terminators[side];
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${side === "left" ? "বাম" : "ডান"} terminator ${
                        on ? "খুলে ফেলো" : "আবার বসাও"
                      }`}
                      onClick={() => toggleTerminator(side)}
                      className={cn(
                        "bangla rounded-xl border px-2.5 py-1.5 text-left text-[11.5px] transition-colors",
                        on
                          ? "border-white/12 text-muted hover:border-white/30 hover:text-white"
                          : "border-[#f87171]/50 bg-[#f87171]/10 text-[#fca5a5]",
                      )}
                    >
                      {side === "left" ? "বাম" : "ডান"} terminator
                      <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[0.12em]">
                        {on ? "50Ω · লাগানো" : "খোলা প্রান্ত"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {(removed.size > 0 || anyCut) && (
            <p className="bangla mt-3 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-[11.5px] leading-relaxed text-ink">
              এখন বন্ধ ডিভাইস {toBn(removed.size)}টি, কাটা তার {toBn(cuts.size)}টি
              {topo.bus && (!terminators.left || !terminators.right) ? ", terminator খোলা" : ""}।
              “সব ঠিক করো” চাপলে সব আগের অবস্থায় ফিরবে।
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            <Power size={12} /> এই মুহূর্তের অবস্থা
          </p>
          <dl className="mt-2.5 grid grid-cols-2 gap-2">
            <Stat
              label="সংযোগযোগ্য ডিভাইস"
              value={`${toBn(reachableDevices)} / ${toBn(devices.length)}`}
              tone={reachableDevices === devices.length ? "ok" : "warn"}
            />
            <Stat
              label="সচল তার"
              value={topo.bus ? `${toBn(busSegments(topo.bus).length - cuts.size)} / ${toBn(
                busSegments(topo.bus).length,
              )}` : `${toBn(topo.links.length - cuts.size)} / ${toBn(topo.links.length)}`}
              tone={cuts.size === 0 ? "ok" : "warn"}
            />
            <Stat
              label="সর্বশেষ পথ"
              value={result ? `${toBn(result.hops)} hop` : "—"}
              tone={result ? "ok" : "muted"}
            />
            <Stat
              label="বিকল্প পথ"
              value={result ? (result.alternate ? "আছে" : "নেই") : "—"}
              tone={result ? (result.alternate ? "ok" : "warn") : "muted"}
            />
          </dl>

          {result && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <p className="bangla font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                প্যাকেটের পথ
              </p>
              <p className="bangla mt-1 flex flex-wrap items-center gap-1 text-[12px] text-ink">
                {result.path.length === 0 && <span className="text-faint">কোনো পথ নেই</span>}
                {result.path.map((id, index) => (
                  <span key={`${id}-${index}`} className="flex items-center gap-1">
                    {index > 0 && <span className="text-faint">→</span>}
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5">
                      {labelOf(topo, id)}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          )}

          <p className="bangla mt-2.5 text-[11px] leading-relaxed text-faint">
            {topo.bus
              ? "বাসে কাটা তার বা খোলা terminator থাকলে সংকেত প্রতিফলিত হয়ে পুরো নেটওয়ার্ক অচল হয় — তাই সব ডিভাইস লাল/অনুপস্থিত দেখায়।"
              : "দেখো, উৎস থেকে কোন ডিভাইসগুলোতে এখনো পৌঁছানো যায়। যেগুলো দেখা যাচ্ছে না, সেগুলোতে এই মুহূর্তে কোনো সচল পথ নেই।"}
          </p>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage: bus                                                                 */
/* -------------------------------------------------------------------------- */

function BusStage({
  bus,
  topo,
  cuts,
  removed,
  terminators,
  source,
  target,
  reachable,
  phase,
  heard,
  onToggleCut,
  onToggleTerminator,
  onToggleDevice,
  onKey,
}: {
  bus: BusSpec;
  topo: Topology;
  cuts: ReadonlySet<string>;
  removed: ReadonlySet<string>;
  terminators: TerminatorState;
  source: string;
  target: string;
  reachable: ReadonlySet<string>;
  phase: Phase;
  heard: boolean;
  onToggleCut: (index: number) => void;
  onToggleTerminator: (side: "left" | "right") => void;
  onToggleDevice: (id: string) => void;
  onKey: (event: KeyboardEvent<SVGGElement>, action: () => void) => void;
}) {
  const segments = busSegments(bus);
  const busDown = cuts.size > 0 || !terminators.left || !terminators.right;

  return (
    <g>
      {segments.map((segment) => {
        const key = busSegmentKey(segment.index);
        const cut = cuts.has(key);
        const mid = (segment.fromX + segment.toX) / 2;
        const label = busSegmentLabel(bus, segment.index);
        return (
          <g
            key={key}
            role="button"
            tabIndex={0}
            aria-label={`${label} — তার ${cut ? "জোড়া লাগাও" : "কাটো"}`}
            aria-pressed={cut}
            className="topo-link-hit topo-link-hit--bus"
            onClick={() => onToggleCut(segment.index)}
            onKeyDown={(event) => onKey(event, () => onToggleCut(segment.index))}
          >
            {/* generous invisible hit area on the cable */}
            <line
              x1={segment.fromX}
              y1={bus.y}
              x2={segment.toX}
              y2={bus.y}
              className="topo-link-hitline"
            />
            <line
              x1={segment.fromX}
              y1={bus.y}
              x2={cut ? mid - 9 : segment.toX}
              y2={bus.y}
              className={cn("topo-backbone", cut && "topo-backbone--cut")}
            />
            {cut && (
              <>
                <line
                  x1={mid + 9}
                  y1={bus.y}
                  x2={segment.toX}
                  y2={bus.y}
                  className="topo-backbone topo-backbone--cut"
                />
                <CrossMark x={mid} y={bus.y} />
              </>
            )}
            <CutBadge x={mid} y={bus.y - 19} on={cut} />
          </g>
        );
      })}

      {/* terminators: one at each end, absorbing the signal */}
      <Terminator
        side="left"
        x={bus.left}
        y={bus.y}
        on={terminators.left}
        onToggle={() => onToggleTerminator("left")}
        onKey={onKey}
      />
      <Terminator
        side="right"
        x={bus.right}
        y={bus.y}
        on={terminators.right}
        onToggle={() => onToggleTerminator("right")}
        onKey={onKey}
      />

      {bus.taps.map((tap) => {
        const node = nodeById(topo, tap.nodeId);
        if (!node) return null;
        const off = removed.has(node.id);
        const edge = towards(node, { x: tap.x, y: bus.y }, NODE_RADIUS + 1);
        return (
          <g key={`drop-${node.id}`} aria-hidden>
            <line
              x1={edge.x}
              y1={edge.y}
              x2={tap.x}
              y2={bus.y}
              className={cn("topo-drop", off && "topo-drop--off", busDown && "topo-drop--corrupt")}
            />
            <circle cx={tap.x} cy={bus.y} r="4.5" className={cn("topo-tap", busDown && "topo-tap--down")} />
          </g>
        );
      })}

      {topo.nodes.map((node) => (
        <Device
          key={node.id}
          node={node}
          off={removed.has(node.id)}
          selectedSource={node.id === source}
          selectedTarget={node.id === target}
          unreachable={!removed.has(node.id) && !reachable.has(node.id)}
          phase={phase}
          onToggle={() => onToggleDevice(node.id)}
          onKey={onKey}
        />
      ))}

      <BusCore
        bus={bus}
        source={source}
        target={target}
        reachable={reachable}
        busDown={busDown}
        heard={heard}
      />
    </g>
  );
}

/** The bus cable's own text plate: "one shared cable, terminators at both ends". */
function BusCore({
  bus,
  source,
  target,
  reachable,
  busDown,
  heard,
}: {
  bus: BusSpec;
  source: string;
  target: string;
  reachable: ReadonlySet<string>;
  busDown: boolean;
  heard: boolean;
}) {
  const active = reachable.size > 1 && !busDown;
  return (
    <g aria-hidden>
      <text
        className="topo-plate"
        x={(bus.left + bus.right) / 2}
        y={VIEW_HEIGHT - 42}
        textAnchor="middle"
      >
        {busDown
          ? "মূল তার কাটা / terminator নেই — সংকেত প্রতিফলিত হচ্ছে (echo)"
          : `একই coaxial তারে সব ডিভাইস · ${
              source !== target && active ? "সবাই সংকেত শোনে, ঠিকানামাত্র গ্রহণ করে" : "সবাই একই তার ভাগ করে"
            }`}
      </text>
      {heard && (
        <text
          className="topo-plate topo-plate--warm"
          x={(bus.left + bus.right) / 2}
          y={VIEW_HEIGHT - 22}
          textAnchor="middle"
        >
          সব ডিভাইস সংকেত পেয়েছে · ঠিকানামাত্র গ্রহণ করেছে
        </text>
      )}
    </g>
  );
}

function Terminator({
  side,
  x,
  y,
  on,
  onToggle,
  onKey,
}: {
  side: "left" | "right";
  x: number;
  y: number;
  on: boolean;
  onToggle: () => void;
  onKey: (event: KeyboardEvent<SVGGElement>, action: () => void) => void;
}) {
  // The body sits outside the cable, like the resistor screwed onto the end.
  const bodyX = side === "left" ? x - 30 : x + 8;
  const labelX = side === "left" ? x - 11 : x + 11;
  const hatch = Array.from({ length: 4 }, (_, index) => bodyX + 5 + index * 5);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={`${side === "left" ? "বাম" : "ডান"} terminator — ${
        on ? "খুলে ফেলো" : "আবার বসাও"
      }`}
      className={cn("topo-terminal", !on && "topo-terminal--open")}
      onClick={onToggle}
      onKeyDown={(event) => onKey(event, onToggle)}
    >
      <rect
        x={bodyX}
        y={y - 15}
        width="24"
        height="30"
        rx="3"
        className="topo-terminal-body"
      />
      {on ? (
        <g className="topo-terminal-hatch" aria-hidden>
          {hatch.map((hx) => (
            <line key={hx} x1={hx} y1={y + 9} x2={hx + 6} y2={y - 9} />
          ))}
        </g>
      ) : (
        <g className="topo-terminal-cross" aria-hidden>
          <line x1={bodyX + 4} y1={y - 9} x2={bodyX + 20} y2={y + 9} />
          <line x1={bodyX + 20} y1={y - 9} x2={bodyX + 4} y2={y + 9} />
        </g>
      )}
      <line
        x1={side === "left" ? bodyX + 24 : x}
        y1={y}
        x2={side === "left" ? x : bodyX}
        y2={y}
        className="topo-terminal-lead"
      />
      <text className="topo-terminal-label" x={labelX} y={y + 34} textAnchor="middle">
        TERM 50Ω
      </text>
      <text
        className={cn("topo-terminal-state", !on && "topo-terminal-state--open")}
        x={labelX}
        y={y + 47}
        textAnchor="middle"
      >
        {on ? "সংকেত শুষে নেয়" : "প্রান্ত খোলা"}
      </text>
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage: everything with point-to-point cables                               */
/* -------------------------------------------------------------------------- */

function MeshStage({
  topo,
  cuts,
  source,
  target,
  phase,
  onToggleCut,
  onToggleDevice,
  onKey,
  nodeState,
}: {
  topo: Topology;
  cuts: ReadonlySet<string>;
  source: string;
  target: string;
  phase: Phase;
  onToggleCut: (edgeId: string, label: string) => void;
  onToggleDevice: (id: string) => void;
  onKey: (event: KeyboardEvent<SVGGElement>, action: () => void) => void;
  nodeState: (node: TopoNode) => { off: boolean; unreachable: boolean };
}) {
  return (
    <g>
      {topo.links.map((edge) => {
        const a = nodeById(topo, edge.a);
        const b = nodeById(topo, edge.b);
        if (!a || !b) return null;
        const cut = cuts.has(edge.id);
        const start = towards(a, b, NODE_RADIUS);
        const end = towards(b, a, NODE_RADIUS);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const bend = edge.bend ?? 0;
        const normal = { x: -dy / length, y: dx / length };
        const mid = {
          x: (start.x + end.x) / 2 + normal.x * bend,
          y: (start.y + end.y) / 2 + normal.y * bend,
        };
        const control = {
          x: mid.x + normal.x * bend,
          y: mid.y + normal.y * bend,
        };
        // A bowed cable is a quadratic curve; a straight one stays a line so
        // the chevron and the cut gap keep an exact direction.
        const cable = `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`;
        const gapA = towards(mid, start, 9);
        const gapB = towards(mid, end, 9);
        const label = `${a.label} ${edge.oneWay ? "→" : "↔"} ${b.label}`;
        return (
          <g
            key={edge.id}
            role="button"
            tabIndex={0}
            aria-pressed={cut}
            aria-label={`${label} — তার ${cut ? "জোড়া লাগাও" : "কাটো"}`}
            className="topo-link-hit"
            onClick={() => onToggleCut(edge.id, label)}
            onKeyDown={(event) => onKey(event, () => onToggleCut(edge.id, label))}
          >
            {bend === 0 ? (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className="topo-link-hitline"
              />
            ) : (
              <path d={cable} className="topo-link-hitline" fill="none" />
            )}
            {edge.oneWay && !cut && (
              <DirectionChevron start={start} control={control} end={end} />
            )}
            {cut ? (
              <>
                {bend === 0 ? (
                  <>
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={gapA.x}
                      y2={gapA.y}
                      className="topo-link topo-link--cut"
                    />
                    <line
                      x1={gapB.x}
                      y1={gapB.y}
                      x2={end.x}
                      y2={end.y}
                      className="topo-link topo-link--cut"
                    />
                  </>
                ) : (
                  <path d={cable} className="topo-link topo-link--cut" fill="none" />
                )}
                <CrossMark x={mid.x} y={mid.y} />
              </>
            ) : bend === 0 ? (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className="topo-link"
              />
            ) : (
              <path d={cable} className="topo-link" fill="none" />
            )}
            <CutBadge x={mid.x} y={mid.y} on={cut} />
          </g>
        );
      })}

      {topo.nodes.map((node) => {
        const state = nodeState(node);
        return (
          <Device
            key={node.id}
            node={node}
            off={state.off}
            unreachable={state.unreachable}
            selectedSource={node.id === source}
            selectedTarget={node.id === target}
            phase={phase}
            onToggle={() => onToggleDevice(node.id)}
            onKey={onKey}
          />
        );
      })}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Small stage pieces                                                         */
/* -------------------------------------------------------------------------- */

/** A visible chevron on a one-way cable: data only travels this way. */
function DirectionChevron({
  start,
  control,
  end,
}: {
  start: Point;
  control: Point;
  end: Point;
}) {
  const t = 0.62;
  const mt = 1 - t;
  const point = {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
  const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const back = { x: point.x - ux * 7, y: point.y - uy * 7 };
  return (
    <g className="topo-arrow-mark" aria-hidden>
      <line x1={point.x} y1={point.y} x2={back.x - uy * 5} y2={back.y + ux * 5} />
      <line x1={point.x} y1={point.y} x2={back.x + uy * 5} y2={back.y - ux * 5} />
    </g>
  );
}

function CutBadge({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={cn("topo-cut-badge", on && "topo-cut-badge--on")} aria-hidden>
      <circle r="10" className="topo-cut-disc" />
      <g className="topo-cut-icon">
        <circle cx="-3.2" cy="2.4" r="1.8" />
        <circle cx="-3.2" cy="-2.4" r="1.8" />
        <path d="M-1.6 1.9 L5 0 M-1.6 -1.9 L5 0" />
      </g>
    </g>
  );
}

function CrossMark({ x, y }: { x: number; y: number }) {
  return (
    <g className="topo-cut-mark" transform={`translate(${x} ${y})`} aria-hidden>
      <line x1="-5" y1="-5" x2="5" y2="5" />
      <line x1="5" y1="-5" x2="-5" y2="5" />
    </g>
  );
}

function Device({
  node,
  off,
  unreachable,
  selectedSource,
  selectedTarget,
  phase,
  onToggle,
  onKey,
}: {
  node: TopoNode;
  off: boolean;
  unreachable: boolean;
  selectedSource: boolean;
  selectedTarget: boolean;
  phase: Phase;
  onToggle: () => void;
  onKey: (event: KeyboardEvent<SVGGElement>, action: () => void) => void;
}) {
  const accent = off ? "#f87171" : node.kind === "switch" ? "#7ee7e2" : "#9fe8ff";
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={off}
      aria-label={`${node.label} — ${off ? "চালু করো" : "বন্ধ করো"}`}
      className={cn(
        "topo-node",
        off && "topo-node--off",
        unreachable && "topo-node--unreachable",
        selectedSource && "topo-node--source",
        selectedTarget && "topo-node--target",
        phase === "running" && (selectedSource || selectedTarget) && "topo-node--engaged",
      )}
      onClick={onToggle}
      onKeyDown={(event) => onKey(event, onToggle)}
    >
      {(selectedSource || selectedTarget) && (
        <rect
          x={node.x - 37}
          y={node.y - 37}
          width="74"
          height="74"
          rx="18"
          className={selectedSource ? "topo-node-ring topo-node-ring--source" : "topo-node-ring topo-node-ring--target"}
        />
      )}
      <rect
        x={node.x - 31}
        y={node.y - 31}
        width="62"
        height="62"
        rx="15"
        className="topo-node-box"
        style={{ color: accent }}
      />
      <g className="topo-glyph" transform={`translate(${node.x} ${node.y})`}>
        <DeviceGlyph kind={node.kind} color={accent} />
      </g>
      <circle
        cx={node.x + 22}
        cy={node.y - 22}
        r="4"
        fill={off ? "#f87171" : "#3ddbd9"}
        className={off ? undefined : "topo-node-led"}
      />
      {off && (
        <g className="topo-node-off-mark" aria-hidden>
          <line x1={node.x - 12} y1={node.y - 12} x2={node.x + 12} y2={node.y + 12} />
          <line x1={node.x + 12} y1={node.y - 12} x2={node.x - 12} y2={node.y + 12} />
        </g>
      )}
      <rect
        x={node.x - Math.max(38, node.label.length * 7.2 + 16) / 2}
        y={node.y + 35}
        width={Math.max(38, node.label.length * 7.2 + 16)}
        height="17"
        rx="8.5"
        className="topo-label-plate"
        aria-hidden
      />
      <text className="net-node-title" x={node.x} y={node.y + 47} textAnchor="middle">
        {node.label}
      </text>
      {node.tag && (
        <>
          <rect
            x={node.x - (node.tag.length * 5.6 + 10) / 2}
            y={node.y + 50}
            width={node.tag.length * 5.6 + 10}
            height="12"
            rx="6"
            className="topo-label-plate"
            aria-hidden
          />
          <text className="topo-node-tag" x={node.x} y={node.y + 59} textAnchor="middle">
            {node.tag}
          </text>
        </>
      )}
      <title>
        {node.label} — {off ? "ক্লিক করে চালু করো" : "ক্লিক করে বন্ধ করো"}
      </title>
    </g>
  );
}

/** Tiny line-art for the three device kinds. Drawn around (0, 0). */
function DeviceGlyph({ kind, color }: { kind: DeviceKind; color: string }): ReactNode {
  if (kind === "switch") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round">
        <rect x="-18" y="-13" width="36" height="24" rx="3" fill="rgba(61,219,217,0.12)" />
        {[0, 1, 2, 3].map((index) => (
          <rect
            key={index}
            x={-14 + index * 8}
            y="-4"
            width="5.5"
            height="6"
            rx="1"
            fill={color}
            stroke="none"
            opacity="0.7"
          />
        ))}
        <path d="M-14 6 H14" strokeWidth="1" opacity="0.4" />
      </g>
    );
  }
  if (kind === "server") {
    return (
      <g fill="none" stroke={color} strokeWidth="1.5">
        <rect x="-15" y="-16" width="30" height="9" rx="2" fill="rgba(167,139,250,0.12)" />
        <rect x="-15" y="-4" width="30" height="9" rx="2" fill="rgba(167,139,250,0.12)" />
        <rect x="-15" y="8" width="30" height="9" rx="2" fill="rgba(167,139,250,0.12)" />
        <circle cx="9" cy="-11.5" r="1.4" fill={color} />
        <circle cx="9" cy="0.5" r="1.4" fill={color} />
        <circle cx="9" cy="12.5" r="1.4" fill={color} />
      </g>
    );
  }
  return (
    <g fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round">
      <rect x="-17" y="-16" width="34" height="22" rx="3" fill="rgba(159,232,255,0.1)" />
      <line x1="-12" y1="-9" x2="6" y2="-9" strokeWidth="1.2" opacity="0.5" />
      <line x1="-12" y1="-4" x2="10" y2="-4" strokeWidth="1.2" opacity="0.28" />
      <path d="M-6 8 h12" strokeWidth="2" />
      <path d="M-11 12 h22" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Control-panel pieces                                                       */
/* -------------------------------------------------------------------------- */

function PickerRow({
  label,
  nodes,
  selected,
  removed,
  accent,
  onPick,
}: {
  label: string;
  nodes: TopoNode[];
  selected: string;
  removed: ReadonlySet<string>;
  accent: "signal" | "warn";
  onPick: (id: string) => void;
}) {
  return (
    <div className="mt-2.5">
      <p className="bangla flex items-center gap-1.5 text-[11px] text-muted">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-sm border",
            accent === "signal" ? "border-signal bg-signal/25" : "border-warn bg-warn/25",
          )}
        />
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {nodes.map((node) => {
          const off = removed.has(node.id);
          const active = node.id === selected;
          return (
            <button
              key={node.id}
              type="button"
              aria-pressed={active}
              aria-label={`${node.label} — ${label} হিসেবে বেছে নাও${off ? " (বন্ধ)" : ""}`}
              onClick={() => onPick(node.id)}
              className={cn(
                "bangla inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                active
                  ? accent === "signal"
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-warn bg-warn/15 text-warn"
                  : "border-white/12 text-muted hover:border-white/30 hover:text-white",
                off && "opacity-60",
              )}
            >
              {node.label}
              {off && <span className="font-mono text-[8.5px] uppercase">off</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CutRow({ label, cut, onToggle }: { label: string; cut: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={cut}
      aria-label={`${label} — তার ${cut ? "জোড়া লাগাও" : "কাটো"}`}
      onClick={onToggle}
      className={cn(
        "bangla flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1 text-left text-[11.5px] transition-colors",
        cut
          ? "border-[#f87171]/50 bg-[#f87171]/10 text-[#fca5a5]"
          : "border-white/10 text-muted hover:border-white/30 hover:text-white",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.1em]">
        {cut ? "কাটা" : "সচল"}
      </span>
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
      <dt className="bangla text-[10.5px] leading-snug text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-mono text-[13px]",
          tone === "ok" ? "text-signal" : tone === "warn" ? "text-warn" : "text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
