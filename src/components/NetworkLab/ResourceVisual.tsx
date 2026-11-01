import { useState } from "react";
import { FileText, Mail, Printer } from "lucide-react";
import { RESOURCES, type ResourceDef } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Callout, SimNote, Switch } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * Resources: what a network actually shares.
 *
 * One client, one server, three kinds of resource — hardware (printer), data
 * (file) and a running service (email) — so the point lands that a resource is
 * not only a machine. Turning the resource off shows the error path.
 */

type Vec = [number, number];

const CLIENT_BOX: [number, number, number, number] = [40, 110, 156, 84];
const SWITCH_BOX: [number, number, number, number] = [300, 122, 120, 60];
const SERVER_BOX: [number, number, number, number] = [520, 106, 168, 92];
const RESOURCE_BOX: [number, number, number, number] = [778, 96, 156, 112];

const STAGES: { title: string; points: Vec[]; target: "client" | "network" | "resource" }[] = [
  { title: "ক্লায়েন্ট request তৈরি করল", points: [[118, 152], [196, 152]], target: "client" },
  { title: "ডাটা নেটওয়ার্ক পথ দিয়ে গেল", points: [[196, 152], [360, 152], [520, 152]], target: "network" },
  { title: "সার্ভার রিসোর্স ব্যবহার করে কাজ করল", points: [[688, 152], [856, 152]], target: "resource" },
  { title: "ফলাফল রেসপন্স হয়ে ফিরল", points: [[856, 152], [688, 152], [360, 152], [196, 152], [118, 152]], target: "client" },
];

function toPath(points: Vec[]): string {
  return points.map((point, i) => `${i === 0 ? "M" : "L"}${point[0]} ${point[1]}`).join(" ");
}

function pointAlong(points: Vec[], t: number): Vec {
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

const ICONS = { printer: Printer, file: FileText, email: Mail } as const;

export function ResourceVisual({ className }: { className?: string }) {
  const [resourceId, setResourceId] = useState<ResourceDef["id"]>("printer");
  const [available, setAvailable] = useState(true);
  const player = useStepPlayer(STAGES.length, 3000);
  const resource = RESOURCES.find((item) => item.id === resourceId) ?? RESOURCES[0];
  const Icon = ICONS[resource.id];
  const stage = STAGES[player.index];
  const isError = player.index >= 2 && !available;
  const packet = pointAlong(stage.points, 1);

  const stepBody =
    player.index === 0
      ? resource.request
      : player.index === 1
        ? `request সুইচ ও মিডিয়া দিয়ে সার্ভারে পৌঁছাল। সার্ভার দেখল রিসোর্সটি (${resource.label}) শেয়ার করা আছে কি না।`
        : player.index === 2
          ? available
            ? resource.response
            : resource.unavailable
          : available
            ? "সার্ভার নিশ্চিতকরণ পাঠাল — কাজ হয়েছে। ক্লায়েন্ট এখন ফলাফল দেখাতে পারে।"
            : "সার্ভার ব্যর্থতার বার্তা পাঠাল। ক্লায়েন্ট স্ক্রিনে error দেখাবে, কিন্তু নেটওয়ার্ক চালুই থাকবে।";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        {RESOURCES.map((item) => {
          const ItemIcon = ICONS[item.id];
          const active = item.id === resourceId;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setResourceId(item.id);
                player.reset();
              }}
              className={cn(
                "bangla rounded-2xl border p-4 text-left transition-colors",
                active
                  ? "border-laser/60 bg-laser/[0.09]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25",
              )}
            >
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
                <ItemIcon size={15} className={active ? "text-laser" : "text-faint"} />
                {item.label}
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                {item.kind}
              </span>
              <span className="bangla mt-2 block text-[11.5px] leading-relaxed text-muted">
                {item.note}
              </span>
            </button>
          );
        })}
      </div>

      <figure className="net-figure">
        <svg viewBox="0 0 960 300" role="img" aria-label="ক্লায়েন্ট থেকে সার্ভার হয়ে শেয়ার্ড রিসোর্সে request যাওয়ার চিত্র">
          <path d="M196 152 H300" className={cn("net-link-wired", stage.target === "network" && "net-link--busy")} />
          <path d="M420 152 H520" className={cn("net-link-wired", stage.target === "network" && "net-link--busy")} />
          <path d="M688 152 H778" className={cn("net-link-wired", stage.target === "resource" && "net-link--busy", !available && "net-link--down")} />

          <rect x={CLIENT_BOX[0]} y={CLIENT_BOX[1]} width={CLIENT_BOX[2]} height={CLIENT_BOX[3]} rx="12" fill="rgba(11,17,32,0.92)" stroke={stage.target === "client" ? "#fbbf24" : "rgba(148,176,224,0.3)"} strokeWidth="1.4" />
          <text className="net-node-title" x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 32}>Client A</text>
          <text className="net-node-sub" x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 50}>REQUEST</text>
          <text className="net-node-note" x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 70}>রিসোর্স ব্যবহার করতে চায়</text>

          <rect x={SWITCH_BOX[0]} y={SWITCH_BOX[1]} width={SWITCH_BOX[2]} height={SWITCH_BOX[3]} rx="10" fill="rgba(11,17,32,0.92)" stroke={stage.target === "network" ? "#fbbf24" : "rgba(148,176,224,0.3)"} strokeWidth="1.4" />
          <text className="net-node-title" x={SWITCH_BOX[0] + 14} y={SWITCH_BOX[1] + 28}>Switch</text>
          <text className="net-node-note" x={SWITCH_BOX[0] + 14} y={SWITCH_BOX[1] + 48}>পথ দেখায়</text>

          <rect x={SERVER_BOX[0]} y={SERVER_BOX[1]} width={SERVER_BOX[2]} height={SERVER_BOX[3]} rx="12" fill="rgba(11,17,32,0.92)" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" />
          <text className="net-node-title" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 32}>Server</text>
          <text className="net-node-sub" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 50}>{resource.en.toUpperCase()}</text>
          <text className="net-node-note" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 70}>রিসোর্স শেয়ার করে</text>
          <text className="net-node-note" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 86}>{available ? "রিসোর্স চালু" : "রিসোর্স বন্ধ!"}</text>

          <rect
            x={RESOURCE_BOX[0]}
            y={RESOURCE_BOX[1]}
            width={RESOURCE_BOX[2]}
            height={RESOURCE_BOX[3]}
            rx="12"
            fill={available ? "rgba(167,139,250,0.1)" : "rgba(248,113,113,0.1)"}
            stroke={stage.target === "resource" ? "#fbbf24" : available ? "rgba(167,139,250,0.55)" : "rgba(248,113,113,0.7)"}
            strokeWidth="1.6"
          />
          <text className="net-node-title" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 34}>{resource.label}</text>
          <text className="net-node-sub" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 54}>SHARED RESOURCE</text>
          <text className="net-node-note" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 76}>{available ? "সবার জন্য খোলা" : "এখন পাওয়া যাবে না"}</text>
          <text className="net-node-note" x={RESOURCE_BOX[0] + 16} y={RESOURCE_BOX[1] + 94}>{resource.kind}</text>

          {/* printer queue, so a hardware resource feels concrete */}
          {resource.id === "printer" && available && (
            <g>
              {[0, 1, 2].map((job) => (
                <rect key={job} x={RESOURCE_BOX[0] + 16 + job * 34} y={RESOURCE_BOX[1] + 100 - 26} width="26" height="18" rx="3" fill="rgba(196,181,253,0.2)" stroke="rgba(196,181,253,0.5)" />
              ))}
              <text className="net-node-note" x={RESOURCE_BOX[0] + 126} y={RESOURCE_BOX[1] + 88}>print queue</text>
            </g>
          )}

          <circle
            cx={packet[0]}
            cy={packet[1]}
            r="7"
            fill={isError ? "#f87171" : player.index === 3 ? "#a78bfa" : "#3ddbd9"}
            stroke="#04060d"
            strokeWidth="1.4"
          />
          <text className="net-node-sub" x={packet[0] + 12} y={packet[1] - 10}>
            {isError ? "ERROR" : player.index === 3 ? "RESPONSE" : "REQUEST"}
          </text>

          <path
            d={toPath(player.index === 3 ? [[778, 240], [196, 240]] : [[196, 240], [778, 240]])}
            stroke={player.index === 3 ? "#a78bfa" : "#3ddbd9"}
            strokeWidth="1.5"
            strokeDasharray="5 6"
            fill="none"
            className={player.playing && !player.reduced ? "net-flow" : undefined}
          />
        </svg>
      </figure>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <StepControls player={player} label="রিসোর্স সিমুলেশন" />
          <Switch
            checked={available}
            onChange={(next) => {
              setAvailable(next);
              player.reset();
            }}
            onLabel={`${resource.label} চালু আছে`}
            offLabel={`${resource.label} বন্ধ (unavailable)`}
            description="বন্ধ করে আবার চালাও — সার্ভার তখন error response পাঠাবে।"
          />
          <div
            className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4"
            aria-live="polite"
          >
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
              ধাপ {toBn(player.index + 1)} / {toBn(STAGES.length)}
            </p>
            <h3 className="bangla mt-1.5 text-[15.5px] font-semibold text-white">
              {stage.title}
            </h3>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{stepBody}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Callout tone="violet" title="রিসোর্স কী কী হতে পারে?" icon={<Icon size={14} />}>
            <p className="bangla">
              ফাইল, প্রিন্টার, স্টোরেজ, অ্যাপ্লিকেশন, ডাটাবেস বা ইমেইলের মতো নেটওয়ার্ক সার্ভিস — সবই
              রিসোর্স। অর্থাৎ রিসোর্স কেবল হার্ডওয়্যার নয়; একটি চলমান সার্ভিসও রিসোর্স।
            </p>
          </Callout>
          <Callout tone={available ? "cyan" : "red"} title={available ? "রিসোর্স চালু আছে" : "রিসোর্স বন্ধ"}>
            <p className="bangla">
              {available
                ? "সার্ভার request পেলে রিসোর্সটি ব্যবহার করে কাজ সম্পন্ন করে এবং নিশ্চিতকরণ ফেরত দেয়।"
                : "রিসোর্স না থাকলে সার্ভার ব্যর্থতার বার্তা ফেরত দেয়। এতে নেটওয়ার্ক নষ্ট হয় না, শুধু ওই কাজটি হয় না।"}
            </p>
          </Callout>
        </div>
      </div>

      <SimNote />
    </div>
  );
}
