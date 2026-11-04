import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2,
  Pause,
  Play,
  RotateCcw,
  Route,
  Send,
  SkipForward,
  TableProperties,
  Wrench,
} from "lucide-react";
import {
  INTERNET_BACKGROUND_NODES,
  ROUTER_DESTINATIONS,
  ROUTER_EDGES,
  ROUTER_NODES,
  edgeCost,
  interfaceFor,
  neighbourChoices,
  pathCost,
  routerEdgeBetween,
  routerNode,
  routingTableFor,
  shortestPath,
  type RouteMetric,
  type RouterEdge,
} from "@/lib/network/devices";
import { cn } from "@/utils/cn";
import { Button, ChoiceGroup } from "./ui/primitives";

type JourneyStage = "idle" | "lookup" | "travel" | "done";

const SCENARIOS: { id: string; label: string; disabled: string[] }[] = [
  { id: "normal", label: "স্বাভাবিক", disabled: [] },
  { id: "Dhaka-sg-cut", label: "ঢাকা–সিঙ্গাপুর কেবল কাটা", disabled: ["Dhaka-singapore"] },
  { id: "eu-us-cut", label: "লন্ডন–ভার্জিনিয়া লিংক বন্ধ", disabled: ["London-Virginia"] },
  { id: "eu-link-cut", label: "ফ্রাঙ্কফুর্ট–লন্ডন লিংক বন্ধ", disabled: ["Frankfurt-London"] },
];

const EDGE_CURVES: Record<string, { x: number; y: number }> = {
  "Dhaka-singapore": { x: 382, y: 346 },
  "singapore-Frankfurt": { x: 618, y: 278 },
  "singapore-Virginia": { x: 714, y: 442 },
  "Mumbai-London": { x: 682, y: 104 },
  "chattogram-Chennai": { x: 364, y: 258 },
};

function reducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function edgePath(edge: RouterEdge) {
  const a = routerNode(edge.a);
  const b = routerNode(edge.b);
  const curve = EDGE_CURVES[edge.id];
  return curve ? `M ${a.x} ${a.y} Q ${curve.x} ${curve.y} ${b.x} ${b.y}` : `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function edgePoint(edge: RouterEdge, fromId: string, t: number) {
  const from = routerNode(fromId);
  const to = routerNode(edge.a === fromId ? edge.b : edge.a);
  const curve = EDGE_CURVES[edge.id];
  if (!curve) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  const one = 1 - t;
  return {
    x: one * one * from.x + 2 * one * t * curve.x + t * t * to.x,
    y: one * one * from.y + 2 * one * t * curve.y + t * t * to.y,
  };
}

function edgeMidpoint(edge: RouterEdge) {
  return edgePoint(edge, edge.a, 0.5);
}

function RouterGlyph({ x, y, active }: { x: number; y: number; active: boolean }) {
  const color = active ? "#7ee7e2" : "#9fb2cf";
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={27} fill={active ? "#0c3340" : "#0a1730"} stroke={color} strokeWidth={active ? 2.2 : 1.5} />
      <path d="M-13 -5 H8 M3 -11 L9 -5 L3 1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7 H-8 M-3 1 L-9 7 L-3 13" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={15} cy={-15} r={3} fill={active ? "#34d399" : "#50637e"} className={active ? "cs-blink" : undefined} />
    </g>
  );
}

export function RouterSimulation() {
  const reduced = useMemo(reducedMotion, []);
  const [destinationId, setDestinationId] = useState("de");
  const [metric, setMetric] = useState<RouteMetric>("latency");
  const [scenarioId, setScenarioId] = useState("normal");
  const [disabledEdgeIds, setDisabledEdgeIds] = useState<Set<string>>(new Set());
  const [congestionMs, setCongestionMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [stage, setStage] = useState<JourneyStage>("idle");
  const [hopIndex, setHopIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(0);

  const destination = ROUTER_DESTINATIONS.find((item) => item.id === destinationId) ?? ROUTER_DESTINATIONS[0];
  const options = useMemo(
    () => ({ metric, disabledEdgeIds, congestedEdgeId: "Dhaka-singapore", congestionMs }),
    [congestionMs, disabledEdgeIds, metric],
  );
  const path = useMemo(
    () => shortestPath("home-laptop", destination.nodeId, options),
    [destination.nodeId, options],
  );
  const totalCost = path.length ? pathCost(path, options) : Number.POSITIVE_INFINITY;
  const currentNodeId = stage === "done" ? destination.nodeId : path[Math.min(hopIndex, Math.max(0, path.length - 1))] ?? "home-laptop";
  const currentNode = routerNode(currentNodeId);
  const nextNodeId = stage !== "done" && path.length > hopIndex + 1 ? path[hopIndex + 1] : null;
  const nextNode = nextNodeId ? routerNode(nextNodeId) : null;
  const currentEdge = nextNodeId ? routerEdgeBetween(currentNodeId, nextNodeId) : undefined;
  const table = useMemo(() => routingTableFor(currentNodeId, options), [currentNodeId, options]);
  const selectedRow = table.find((row) => row.destinationId === destination.id);
  const choices = useMemo(
    () => neighbourChoices(currentNodeId, destination.nodeId, options),
    [currentNodeId, destination.nodeId, options],
  );
  const ttl = Math.max(1, 64 - hopIndex);
  const sourceIp = hopIndex <= 1 && stage !== "done" ? "192.168.1.10" : "203.0.113.5 (NAT public)";

  const resetJourney = useCallback(() => {
    setStage("idle");
    setHopIndex(0);
    progressRef.current = 0;
    setProgress(0);
    setPlaying(false);
  }, []);

  const advance = useCallback(() => {
    if (!path.length || stage === "idle" || stage === "done") return;
    if (stage === "lookup") {
      setStage("travel");
      progressRef.current = reduced ? 1 : 0;
      setProgress(progressRef.current);
      return;
    }
    if (hopIndex >= path.length - 2) {
      setStage("done");
      setPlaying(false);
      progressRef.current = 1;
      setProgress(1);
    } else {
      setHopIndex((value) => value + 1);
      setStage("lookup");
      progressRef.current = reduced ? 1 : 0;
      setProgress(progressRef.current);
    }
  }, [hopIndex, path.length, reduced, stage]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (!playing || stage === "idle" || stage === "done" || !path.length) return;
    let frame = 0;
    let last = performance.now();
    const travelCost = currentEdge ? edgeCost(currentEdge, options) : 1;
    const duration = (stage === "lookup" ? 1050 : Math.min(1500, 680 + travelCost * (metric === "hops" ? 40 : 5))) / speed;
    const tick = (now: number) => {
      const next = Math.min(1, progressRef.current + (now - last) / duration);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        advanceRef.current();
        return;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [currentEdge, metric, options, path.length, playing, speed, stage]);

  const startJourney = () => {
    if (!path.length) return;
    setStage("lookup");
    setHopIndex(0);
    progressRef.current = reduced ? 1 : 0;
    setProgress(progressRef.current);
    setPlaying(!reduced);
  };

  const nextStep = () => {
    if (stage === "idle" || stage === "done") return;
    if (progressRef.current < 1) {
      progressRef.current = 1;
      setProgress(1);
      return;
    }
    advance();
  };

  const chooseScenario = (id: string) => {
    const scenario = SCENARIOS.find((item) => item.id === id) ?? SCENARIOS[0];
    setScenarioId(id);
    setDisabledEdgeIds(new Set(scenario.disabled));
    resetJourney();
  };

  const toggleEdge = (edgeId: string) => {
    setScenarioId("custom");
    setDisabledEdgeIds((previous) => {
      const next = new Set(previous);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
    resetJourney();
  };

  const repairLinks = () => {
    setScenarioId("normal");
    setDisabledEdgeIds(new Set());
    setCongestionMs(0);
    resetJourney();
  };

  const packetPoint = (() => {
    if (stage === "idle") return routerNode("home-laptop");
    if (stage === "done") return routerNode(destination.nodeId);
    if (stage === "lookup" || !currentEdge) return currentNode;
    return edgePoint(currentEdge, currentNodeId, progress);
  })();

  const traveledEdgeIds = new Set<string>();
  for (let i = 0; i < Math.min(hopIndex, path.length - 1); i += 1) {
    const edge = routerEdgeBetween(path[i], path[i + 1]);
    if (edge) traveledEdgeIds.add(edge.id);
  }
  if (stage === "done") {
    for (let i = 0; i < path.length - 1; i += 1) {
      const edge = routerEdgeBetween(path[i], path[i + 1]);
      if (edge) traveledEdgeIds.add(edge.id);
    }
  }

  const status = (() => {
    if (!path.length) {
      return {
        title: "কোনো সচল route নেই",
        body: "বন্ধ লিংকগুলো গন্তব্যকে বিচ্ছিন্ন করে ফেলেছে। বাস্তব রাউটার তখন packet drop করে এবং সাধারণত ICMP Destination Unreachable বার্তা ফেরত পাঠানোর চেষ্টা করে। একটি লিংকে আবার ক্লিক করে চালু করো।",
      };
    }
    if (stage === "idle") {
      return {
        title: "Routing table আগেই তৈরি হয়ে আছে",
        body: "প্রতিটি router routing protocol দিয়ে প্রতিবেশীদের লিংক-তথ্য জেনে table বানিয়ে রাখে। Packet এলে সে পুরো Internet নতুন করে হিসাব করে না—Destination IP দিয়ে table-এর সবচেয়ে নির্দিষ্ট row (longest prefix match) খুঁজে next hop-এ পাঠায়।",
      };
    }
    if (stage === "lookup") {
      if (currentNode.kind === "device") {
        return {
          title: "ল্যাপটপ দেখল: গন্তব্য এই LAN-এ নেই",
          body: `Destination IP ${destination.serverIp} বাসার 192.168.1.0/24 নেটওয়ার্কের বাইরে। তাই ল্যাপটপ default gateway—বাসার রাউটারের কাছে packet পাঠাবে।`,
        };
      }
      return {
        title: `${currentNode.label}: routing table lookup`,
        body: `Destination network ${destination.network} মিলেছে। Table বলছে next hop ${selectedRow?.nextHopLabel ?? "—"}, exit interface ${selectedRow?.exitInterface ?? "—"}। এই router পুরো পথ জানে না; শুধু পরের এক hop জানে। TTL এখন ${ttl}।`,
      };
    }
    if (stage === "travel" && currentEdge && nextNode) {
      return {
        title: `${currentNode.label} → ${nextNode.label}`,
        body: `Packet ${currentEdge.label} ধরে যাচ্ছে (এই লিংকের খরচ ${edgeCost(currentEdge, options)}${metric === "latency" ? " ms" : " hop"})। Layer-2 frame-এর next-hop ঠিকানা এই লিংকের জন্য বদলেছে, কিন্তু ভেতরের Destination IP ${destination.serverIp} একই আছে।`,
      };
    }
    return {
      title: "Packet সার্ভারে পৌঁছেছে",
      body: `মোট ${path.length - 1}টি লিংক/hop পেরিয়ে আনুমানিক খরচ ${Number.isFinite(totalCost) ? totalCost : "—"}${metric === "latency" ? " ms" : ""}। Response ফেরার সময় প্রতিটি router আবার নিজের table দেখবে—ফেরার পথ সবসময় হুবহু একই নাও হতে পারে।`,
    };
  })();

  const selectClass =
    "bangla w-full rounded-xl border border-white/12 bg-[#0b1526] px-3 py-2.5 text-[13px] text-ink outline-none focus:border-signal/70";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/12 bg-[#070d18] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-signal">ROUTER · LAYER 3 · IP FORWARDING</p>
            <h3 className="bangla mt-1.5 text-[17px] font-semibold text-white">ঢাকা থেকে বিশ্বের সার্ভার—প্রতিটি Router শুধু পরের hop ঠিক করে</h3>
            <p className="bangla mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
              গন্তব্য বদলাও, latency বা hop count দিয়ে best path বেছে নাও, কোনো লিংকে ক্লিক করে কেবল
              কেটে দাও—তারপর দেখো routing table কীভাবে নতুন পথ বেছে নেয়।
            </p>
          </div>
          <span className="bangla inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] text-faint">
            <Globe2 size={12} className="text-signal" /> পটভূমির ছোট node = Internet-এর হাজারো router-এর ধারণা
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_0.85fr]">
          <ChoiceGroup
            label="গন্তব্য সার্ভার"
            value={destinationId}
            onChange={(value) => {
              setDestinationId(value);
              resetJourney();
            }}
            options={ROUTER_DESTINATIONS.map((item) => ({ id: item.id, label: item.label, hint: item.description }))}
            size="sm"
          />
          <ChoiceGroup
            label="Best path কোন মাপে?"
            value={metric}
            onChange={(value) => {
              setMetric(value as RouteMetric);
              resetJourney();
            }}
            options={[
              { id: "latency", label: "কম latency (ms)", hint: "Link-state cost-এর সরল রূপ" },
              { id: "hops", label: "কম hop", hint: "RIP-ধাঁচের hop count" },
            ]}
            size="sm"
          />
          <label className="bangla block text-[12px] text-muted" htmlFor="router-scenario">
            লিংক-ব্যর্থতার দৃশ্য
            <select id="router-scenario" className={cn(selectClass, "mt-1.5")} value={scenarioId} onChange={(e) => chooseScenario(e.target.value)}>
              {SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
              ))}
              {scenarioId === "custom" && <option value="custom">নিজে লিংক বদলেছ</option>}
            </select>
          </label>
          <ChoiceGroup
            label="গতি"
            value={String(speed)}
            onChange={(value) => setSpeed(Number(value))}
            options={[{ id: "0.5", label: "০.৫×" }, { id: "1", label: "১×" }, { id: "2", label: "২×" }]}
            size="sm"
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="bangla block text-[12px] text-muted" htmlFor="router-congestion">
            ঢাকা–সিঙ্গাপুর লিংকে ভিড়ের কারণে অতিরিক্ত দেরি: <strong className="text-white">+{congestionMs} ms</strong>
            <input
              id="router-congestion"
              type="range"
              min={0}
              max={90}
              step={5}
              value={congestionMs}
              onChange={(e) => {
                setCongestionMs(Number(e.target.value));
                resetJourney();
              }}
              className="mt-2 w-full accent-[#3ddbd9]"
            />
            <span className="text-[10.5px] text-faint">ভিড় বাড়ালে Dijkstra অন্য পথকে সস্তা মনে করতে পারে।</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={startJourney} disabled={!path.length || (stage !== "idle" && stage !== "done")} icon={<Send size={14} />}>
              Packet যাত্রা শুরু করো
            </Button>
            <Button onClick={() => setPlaying((v) => !v)} disabled={stage === "idle" || stage === "done"} icon={playing ? <Pause size={14} /> : <Play size={14} />}>
              {playing ? "থামাও" : "চালু করো"}
            </Button>
            <Button onClick={nextStep} disabled={stage === "idle" || stage === "done"} icon={<SkipForward size={14} />}>পরের ধাপ / hop</Button>
            <Button onClick={resetJourney} icon={<RotateCcw size={14} />}>রিসেট</Button>
            <Button onClick={repairLinks} icon={<Wrench size={14} />}>সব লিংক ঠিক করো</Button>
          </div>
        </div>
      </div>

      <figure className="net-figure net-figure--wide" aria-label="একাধিক router হয়ে packet যাওয়ার Internet routing সিমুলেশন">
        <svg viewBox="0 0 1000 560" role="img" aria-labelledby="router-svg-title router-svg-described">
          <title id="router-svg-title">ঢাকা থেকে নির্বাচিত সার্ভারে router-to-router packet যাত্রা</title>
          <desc id="router-svg-described">একটি ল্যাপটপ থেকে বাসার router, বাংলাদেশি ISP, আঞ্চলিক ও বৈশ্বিক router হয়ে সার্ভারে packet যাচ্ছে। প্রতিটি লিংকে আনুমানিক latency দেখানো হয়েছে।</desc>

          <g aria-hidden opacity={0.28}>
            {INTERNET_BACKGROUND_NODES.slice(0, 56).map((node, index) => {
              const next = INTERNET_BACKGROUND_NODES[(index + 11) % INTERNET_BACKGROUND_NODES.length];
              return <line key={`bgline-${node.id}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#36516f" strokeWidth={0.55} />;
            })}
            {INTERNET_BACKGROUND_NODES.map((node) => (
              <circle key={node.id} cx={node.x} cy={node.y} r={node.r} fill="#5f7b9d" />
            ))}
          </g>

          {[
            { label: "HOME LAN", x: 126, y: 306, rx: 112, ry: 82 },
            { label: "BANGLADESH ISP · AS", x: 326, y: 308, rx: 96, ry: 116 },
            { label: "REGIONAL TRANSIT · AS", x: 504, y: 258, rx: 142, ry: 154 },
            { label: "GLOBAL BACKBONE · AS", x: 794, y: 190, rx: 154, ry: 120 },
          ].map((region) => (
            <g key={region.label} aria-hidden>
              <ellipse cx={region.x} cy={region.y} rx={region.rx} ry={region.ry} fill="none" stroke="#36516f" strokeWidth={1} strokeDasharray="5 7" opacity={0.55} />
              <text x={region.x - region.rx + 8} y={region.y - region.ry + 15} className="net-mono" fontSize={7.5} fill="#697b98">{region.label}</text>
            </g>
          ))}

          {ROUTER_EDGES.map((edge) => {
            const isPath = path.some((nodeId, index) => index < path.length - 1 && routerEdgeBetween(nodeId, path[index + 1])?.id === edge.id);
            const traveled = traveledEdgeIds.has(edge.id);
            const isCurrent = currentEdge?.id === edge.id && stage !== "idle" && stage !== "done";
            const disabled = disabledEdgeIds.has(edge.id);
            const midpoint = edgeMidpoint(edge);
            const cost = edgeCost(edge, options);
            return (
              <g
                key={edge.id}
                role="button"
                tabIndex={0}
                aria-label={`${routerNode(edge.a).label} থেকে ${routerNode(edge.b).label} লিংক, খরচ ${cost}${metric === "latency" ? " milliseconds" : " hop"}—${disabled ? "চালু করো" : "বন্ধ করো"}`}
                aria-pressed={disabled}
                className="net-clickable"
                onClick={() => toggleEdge(edge.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleEdge(edge.id);
                  }
                }}
              >
                <path d={edgePath(edge)} fill="none" stroke="transparent" strokeWidth={18} pointerEvents="stroke" />
                <path
                  d={edgePath(edge)}
                  fill="none"
                  stroke={disabled ? "#f87171" : traveled ? "#34d399" : isCurrent ? "#fbbf24" : isPath ? "#3ddbd9" : "#49627f"}
                  strokeWidth={isPath || isCurrent ? 3 : 1.5}
                  strokeDasharray={disabled ? "5 6" : isPath && stage === "idle" ? "6 5" : undefined}
                  opacity={disabled ? 0.5 : isPath ? 0.98 : 0.55}
                  className={isCurrent && playing ? "net-flow" : undefined}
                />
                <rect x={midpoint.x - 23} y={midpoint.y - 10} width={46} height={20} rx={10} fill="#071326" fillOpacity={0.9} stroke={disabled ? "#f87171" : isPath ? "#3ddbd9" : "#2c425f"} strokeWidth={0.8} />
                <text x={midpoint.x} y={midpoint.y + 3} textAnchor="middle" className="net-mono" fontSize={7.4} fill={disabled ? "#fca5a5" : "#cfe9ff"}>
                  {disabled ? "DOWN" : metric === "latency" ? `${cost} ms` : "1 hop"}
                </text>
                {disabled && (
                  <g stroke="#f87171" strokeWidth={2} strokeLinecap="round">
                    <line x1={midpoint.x - 6} y1={midpoint.y - 18} x2={midpoint.x + 6} y2={midpoint.y - 6} />
                    <line x1={midpoint.x + 6} y1={midpoint.y - 18} x2={midpoint.x - 6} y2={midpoint.y - 6} />
                  </g>
                )}
              </g>
            );
          })}

          {ROUTER_NODES.map((node) => {
            const active = node.id === currentNodeId && stage !== "idle";
            const inPath = path.includes(node.id);
            const isDestination = node.id === destination.nodeId;
            return (
              <g key={node.id}>
                {node.kind === "router" ? (
                  <RouterGlyph x={node.x} y={node.y} active={active || inPath} />
                ) : (
                  <g>
                    <rect x={node.x - 43} y={node.y - 27} width={86} height={54} rx={12} fill={node.kind === "server" ? "#1b1532" : "#0a1730"} stroke={isDestination ? "#a78bfa" : active ? "#3ddbd9" : "#49627f"} strokeWidth={active || isDestination ? 2 : 1.3} />
                    {node.kind === "device" ? (
                      <g transform={`translate(${node.x} ${node.y - 3})`} aria-hidden>
                        <rect x={-17} y={-12} width={34} height={21} rx={2.5} fill="#0b1a2e" stroke="#9fb2cf" strokeWidth={1.4} />
                        <path d="M-21 12 H21 L26 18 H-26 Z" fill="#13243d" stroke="#9fb2cf" strokeWidth={1.1} />
                      </g>
                    ) : (
                      <g transform={`translate(${node.x} ${node.y - 2})`} aria-hidden>
                        {[0, 1, 2].map((row) => (
                          <g key={row}>
                            <rect x={-24} y={-15 + row * 11} width={48} height={8} rx={2} fill="#111c31" stroke="#5f7b9d" strokeWidth={0.8} />
                            <circle cx={-17} cy={-11 + row * 11} r={1.8} fill="#34d399" className={isDestination ? "cs-blink" : undefined} />
                            <line x1={-10} y1={-11 + row * 11} x2={14} y2={-11 + row * 11} stroke="#3c587c" strokeWidth={1.5} />
                          </g>
                        ))}
                      </g>
                    )}
                  </g>
                )}
                <rect x={node.x - 58} y={node.y + 34} width={116} height={31} rx={8} fill="#071326" fillOpacity={0.88} stroke="#223856" strokeWidth={0.7} />
                <text x={node.x} y={node.y + 47} textAnchor="middle" fontSize={9.3} fontWeight={700} fill={isDestination ? "#ddd6fe" : "#e9effc"}>{node.label}</text>
                <text x={node.x} y={node.y + 59} textAnchor="middle" className="net-mono" fontSize={6.3} fill="#7ee7e2">{node.en}</text>
              </g>
            );
          })}

          {stage !== "idle" && (
            <g transform={`translate(${packetPoint.x} ${packetPoint.y - 48})`} pointerEvents="none">
              <circle cy={18} r={17} fill="#fbbf24" opacity={0.16} className="net-packet-halo" />
              <rect x={-61} y={-20} width={122} height={40} rx={10} fill="#231806" fillOpacity={0.95} stroke="#fbbf24" strokeWidth={1.5} />
              <text x={0} y={-6} textAnchor="middle" className="net-mono" fontSize={7.4} fill="#fde68a">Dst IP {destination.serverIp}</text>
              <text x={0} y={7} textAnchor="middle" className="net-mono" fontSize={7.1} fill="#e9effc">GET /index.html · TTL {ttl}</text>
              <circle cy={19} r={5} fill="#fbbf24" stroke="#fff7ed" strokeWidth={1.2} />
            </g>
          )}
        </svg>
      </figure>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" aria-label="নির্বাচিত best path">
        <p className="bangla flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-signal">
          <Route size={13} /> Dijkstra অনুযায়ী বর্তমান best path {path.length ? `· মোট ${totalCost}${metric === "latency" ? " ms" : " hop"}` : "· নেই"}
        </p>
        {path.length ? (
          <ol className="mt-3 flex flex-wrap items-center gap-1.5">
            {path.map((nodeId, index) => {
              const node = routerNode(nodeId);
              const edge = index < path.length - 1 ? routerEdgeBetween(nodeId, path[index + 1]) : undefined;
              return (
                <li key={`${nodeId}-${index}`} className="flex items-center gap-1.5">
                  <span className={cn("bangla rounded-full border px-2.5 py-1.5 text-[10.5px]", nodeId === currentNodeId && stage !== "idle" ? "border-warn/70 bg-warn/10 text-warn" : "border-white/12 bg-[#0a1528] text-ink")}>{node.label}</span>
                  {edge && <span className="font-mono text-[9px] text-signal">—{edgeCost(edge, options)}{metric === "latency" ? "ms" : ""}→</span>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="bangla mt-2 text-[12px] text-[#fca5a5]">গন্তব্য বিচ্ছিন্ন—কোনো path নেই।</p>
        )}
        <p className="bangla mt-2.5 text-[11px] leading-relaxed text-faint">{destination.description} IP গুলো documentation/example range থেকে নেওয়া শিক্ষামূলক ঠিকানা।</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <section id="router-status" className="rounded-2xl border border-signal/25 bg-signal/[0.055] p-4" aria-live="polite">
            <h4 className="bangla text-[14px] font-semibold text-white">{status.title}</h4>
            <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{status.body}</p>
            {stage !== "idle" && stage !== "done" && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                <div className="h-full rounded-full bg-warn transition-[width] duration-100" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "বর্তমান অবস্থান", value: currentNode.label },
                { label: "Next hop", value: nextNode?.label ?? (stage === "done" ? "পৌঁছেছে" : "—") },
                { label: "Hop অগ্রগতি", value: path.length ? `${Math.min(hopIndex + (stage === "done" ? 1 : 0), path.length - 1)}/${path.length - 1}` : "—" },
                { label: "TTL", value: `${ttl}` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-[#071120] px-3 py-2.5 text-center">
                  <p className="bangla truncate text-[11.5px] font-semibold text-white" title={stat.value}>{stat.value}</p>
                  <p className="bangla mt-1 text-[9.5px] text-faint">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.025] p-4" aria-label="IP packet inspector">
            <h4 className="bangla text-[13.5px] font-semibold text-white">IP Packet Inspector</h4>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["Source IP", sourceIp],
                ["Destination IP (অপরিবর্তিত)", destination.serverIp],
                ["Destination network", destination.network],
                ["Payload", "GET /index.html"],
                ["এখনকার router", currentNode.label],
                ["পরের hop / interface", nextNode ? `${nextNode.label} · ${interfaceFor(currentNodeId, nextNode.id)}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.08] bg-[#071120] px-3 py-2.5">
                  <dt className="bangla font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">{label}</dt>
                  <dd className="mt-1 break-words font-mono text-[10.5px] text-cyan-100">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="bangla mt-3 text-[11px] leading-relaxed text-faint">
              লক্ষ্য করো: প্রতিটি hop-এ বাইরের Ethernet frame ও next-hop বদলায়, TTL কমে; কিন্তু IP packet-এর
              Destination IP শেষ পর্যন্ত একই থাকে। বাসার router পেরোনোর পর private source IP NAT হয়ে public
              ঠিকানায় বদলাতে পারে—এখানে সেটিও দেখানো হয়েছে।
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.025]" aria-label="বর্তমান router-এর routing table">
            <div className="border-b border-white/[0.08] p-4">
              <h4 className="bangla flex items-center gap-2 text-[13.5px] font-semibold text-white">
                <TableProperties size={16} className="text-signal" /> {currentNode.label}-এর Routing Table
              </h4>
              <p className="bangla mt-1 text-[11px] text-faint">শুধু এই router-এর দৃষ্টিভঙ্গি—সে জানে কোন network-এর জন্য কোন next hop।</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-faint">
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Destination network</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Next hop</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Exit interface</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Metric</th>
                  </tr>
                </thead>
                <tbody>
                  {currentNode.kind === "device" ? (
                    <tr className="bg-signal/[0.07]">
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-cyan-100">0.0.0.0/0 (default)</td>
                      <td className="bangla px-3 py-2.5 text-[11px] text-ink">বাসার রাউটার · 192.168.1.1</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted">Wi-Fi / eth0</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted">1</td>
                    </tr>
                  ) : currentNode.kind === "server" ? (
                    <tr>
                      <td colSpan={4} className="bangla px-3 py-3 text-[11.5px] text-muted">সার্ভার packet গ্রহণ করেছে; response পাঠানোর সময় সে তার নিজের default gateway ব্যবহার করবে।</td>
                    </tr>
                  ) : (
                    table.map((row) => (
                      <tr key={row.destinationId} className={cn("border-b border-white/[0.05]", row.destinationId === destination.id && "bg-warn/[0.08]")}>
                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-cyan-100">{row.network}</td>
                        <td className="bangla px-3 py-2.5 text-[11px] text-ink">{row.nextHopLabel}</td>
                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted">{row.exitInterface}</td>
                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted">{Number.isFinite(row.metric) ? `${row.metric}${metric === "latency" ? " ms" : " hop"}` : "∞"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-laser/25 bg-laser/[0.05] p-4" aria-label="কেন এই next hop সেরা">
            <h4 className="bangla text-[13.5px] font-semibold text-white">Best path কীভাবে হিসাব হলো?</h4>
            <p className="bangla mt-1.5 text-[11.5px] leading-relaxed text-muted">
              Dijkstra-র ভাবনা সরল: প্রতিবেশী পর্যন্ত এই লিংকের খরচ + ওই প্রতিবেশী থেকে গন্তব্যের জানা
              সবচেয়ে কম খরচ। যার যোগফল সবচেয়ে ছোট, সেই next hop।
            </p>
            <ul className="mt-3 space-y-2">
              {choices.slice(0, 5).map((choice, index) => {
                const chosen = choice.neighbour === nextNodeId;
                return (
                  <li key={choice.edge.id} className={cn("bangla flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[11.5px]", chosen ? "border-signal/50 bg-signal/[0.09] text-white" : "border-white/[0.08] bg-[#071120] text-muted")}>
                    <span>{index + 1}. {routerNode(choice.neighbour).label} হয়ে</span>
                    <span className="font-mono text-[10px]">
                      {Number.isFinite(choice.totalCost) ? `${choice.linkCost} + ${choice.remainingCost} = ${choice.totalCost}${metric === "latency" ? " ms" : " hop"}` : "পথ নেই"}
                      {chosen ? " · বাছাই করা" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="bangla mt-3 text-[11px] leading-relaxed text-faint">
              বাস্তবে একটি AS-এর ভেতরে OSPF/IS-IS link-state তথ্য ছড়িয়ে Dijkstra চালায়; বিভিন্ন ISP/AS-এর
              মধ্যে BGP policy অনুযায়ী route বাছাই করে। তাই Internet-এর “best” সবসময় শুধু সবচেয়ে কম
              latency নয়—খরচ, চুক্তি ও নীতিও গুরুত্বপূর্ণ।
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
