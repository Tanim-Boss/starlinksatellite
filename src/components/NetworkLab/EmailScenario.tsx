import { EMAIL_STEPS } from "@/lib/network/copy";
import { cn } from "@/utils/cn";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";
import { StepList } from "./ui/primitives";

/*
 * Server ↔ client, told as one story: a student sends an email.
 *
 * Six steps, one packet, and a station lit up at each step so the direction of
 * travel (request out, response back) is visible rather than described.
 */

type Vec = [number, number];

/** Where the packet is during each of the six steps. */
const STAGES: { points: Vec[]; target: string }[] = [
  { points: [[140, 116], [140, 152]], target: "client" },
  { points: [[140, 152], [204, 152]], target: "client" },
  { points: [[204, 152], [276, 146]], target: "nic" },
  { points: [[276, 146], [430, 146], [618, 146]], target: "switch" },
  { points: [[618, 146], [756, 146], [842, 152]], target: "server" },
  { points: [[842, 152], [618, 146], [430, 146], [276, 146], [204, 152], [140, 152]], target: "client" },
];

const CLIENT_BOX: [number, number, number, number] = [40, 84, 200, 136];
const NIC_BOX: [number, number, number, number] = [250, 128, 54, 34];
const SWITCH_BOX: [number, number, number, number] = [560, 112, 120, 66];
const SERVER_BOX: [number, number, number, number] = [756, 84, 172, 136];

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

export function EmailScenario({ className }: { className?: string }) {
  const player = useStepPlayer(EMAIL_STEPS.length, 3200);
  const reduced = player.reduced;
  const step = EMAIL_STEPS[player.index];
  const stage = STAGES[player.index];
  const isResponse = step.where === "response";

  const boxTone = (id: string) =>
    cn(
      "net-node-box",
      stage.target === id ? "net-node--active" : "",
    );

  return (
    <div className={cn("space-y-4", className)}>
      <figure className="net-figure">
        <svg viewBox="0 0 960 300" role="img" aria-label="ইমেইল পাঠানোর ধাপগুলো দেখানো একটি নেটওয়ার্ক ডায়াগ্রাম">
          {/* media path */}
          <path
            d="M304 146 H560"
            className={cn("net-link-wired", stage.target === "switch" && "net-link--busy")}
          />
          <path
            d="M680 146 H756"
            className={cn("net-link-wired", stage.target === "server" && "net-link--busy")}
          />
          <path
            d="M304 146 H560 M680 146 H756"
            className={cn("net-link-wireless", stage.target === "switch" && "net-link--busy")}
            transform="translate(0 12)"
            opacity="0.35"
          />

          {/* client computer */}
          <g className={cn("net-node", boxTone("client"))}>
            <rect
              className="net-focus-ring"
              x={CLIENT_BOX[0]}
              y={CLIENT_BOX[1]}
              width={CLIENT_BOX[2]}
              height={CLIENT_BOX[3]}
              rx="12"
              fill="rgba(11,17,32,0.92)"
              stroke="rgba(148,176,224,0.3)"
              strokeWidth="1.4"
            />
            <text className="net-node-title" x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 30}>
              Client
            </text>
            <text className="net-node-sub" x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 48}>
              রাফসানের কম্পিউটার
            </text>
            <rect x={CLIENT_BOX[0] + 16} y={CLIENT_BOX[1] + 60} width="168" height="52" rx="6" fill="rgba(148,176,224,0.08)" />
            <text className="net-node-note" x={CLIENT_BOX[0] + 26} y={CLIENT_BOX[1] + 80}>
              To: শিক্ষক
            </text>
            <text className="net-node-note" x={CLIENT_BOX[0] + 26} y={CLIENT_BOX[1] + 98}>
              বিষয়: অ্যাসাইনমেন্ট
            </text>
          </g>

          {/* NIC */}
          <g className={cn("net-node", boxTone("nic"))}>
            <rect
              className="net-focus-ring"
              x={NIC_BOX[0]}
              y={NIC_BOX[1]}
              width={NIC_BOX[2]}
              height={NIC_BOX[3]}
              rx="5"
              fill="rgba(61,219,217,0.12)"
              stroke="rgba(61,219,217,0.55)"
              strokeWidth="1.3"
            />
            <text className="net-node-sub" x={NIC_BOX[0] + 12} y={NIC_BOX[1] + 22} fill="#7ee7e2">
              NIC
            </text>
          </g>

          {/* switch */}
          <g className={cn("net-node", boxTone("switch"))}>
            <rect
              className="net-focus-ring"
              x={SWITCH_BOX[0]}
              y={SWITCH_BOX[1]}
              width={SWITCH_BOX[2]}
              height={SWITCH_BOX[3]}
              rx="10"
              fill="rgba(11,17,32,0.92)"
              stroke="rgba(148,176,224,0.3)"
              strokeWidth="1.4"
            />
            <text className="net-node-title" x={SWITCH_BOX[0] + 14} y={SWITCH_BOX[1] + 28}>
              Switch
            </text>
            <text className="net-node-note" x={SWITCH_BOX[0] + 14} y={SWITCH_BOX[1] + 48}>
              মিডিয়া ও পথ
            </text>
          </g>

          {/* server */}
          <g className={cn("net-node", boxTone("server"))}>
            <rect
              className="net-focus-ring"
              x={SERVER_BOX[0]}
              y={SERVER_BOX[1]}
              width={SERVER_BOX[2]}
              height={SERVER_BOX[3]}
              rx="12"
              fill="rgba(11,17,32,0.92)"
              stroke="rgba(96,165,250,0.45)"
              strokeWidth="1.5"
            />
            <text className="net-node-title" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 30}>
              Server
            </text>
            <text className="net-node-sub" x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 48}>
              MAIL SERVICE
            </text>
            <rect x={SERVER_BOX[0] + 16} y={SERVER_BOX[1] + 60} width="140" height="56" rx="6" fill="rgba(96,165,250,0.08)" />
            <text className="net-node-note" x={SERVER_BOX[0] + 26} y={SERVER_BOX[1] + 80}>
              mailbox queue
            </text>
            <text className="net-node-note" x={SERVER_BOX[0] + 26} y={SERVER_BOX[1] + 98}>
              {player.index >= 4 ? "কাজ সম্পন্ন" : "request এর অপেক্ষায়"}
            </text>
          </g>

          {/* direction arrow */}
          <g>
            <path
              d={isResponse ? "M756 236 H304" : "M304 236 H756"}
              stroke={isResponse ? "#a78bfa" : "#3ddbd9"}
              strokeWidth="1.6"
              strokeDasharray="5 6"
              fill="none"
              className={reduced ? undefined : "net-flow"}
            />
            <text className="net-node-sub" x="440" y="258" fill={isResponse ? "#c4b5fd" : "#7ee7e2"}>
              {isResponse ? "RESPONSE ←" : "→ REQUEST"}
            </text>
          </g>

          {/* packet */}
          <g>
            {!reduced && (
              <circle
                className="net-packet-halo"
                cx={pointAlong(stage.points, player.playing ? 0.5 : 1)[0]}
                cy={pointAlong(stage.points, player.playing ? 0.5 : 1)[1]}
                r="13"
                fill={isResponse ? "rgba(167,139,250,0.28)" : "rgba(61,219,217,0.28)"}
              />
            )}
            <circle
              cx={pointAlong(stage.points, 1)[0]}
              cy={pointAlong(stage.points, 1)[1]}
              r="6.5"
              fill={isResponse ? "#a78bfa" : "#3ddbd9"}
              stroke="#04060d"
              strokeWidth="1.4"
            />
          </g>
        </svg>
      </figure>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <StepControls player={player} label="ইমেইল সিমুলেশন" />
          <StepList
            steps={EMAIL_STEPS.map((item) => ({ title: item.title, where: item.where }))}
            index={player.index}
            onPick={player.go}
          />
        </div>

        <div
          className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4 md:p-5"
          aria-live="polite"
        >
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
            ধাপ {player.index + 1} · {step.where}
          </p>
          <h3 className="bangla mt-1.5 text-[16px] font-semibold leading-snug text-white">
            {step.title}
          </h3>
          <p className="bangla mt-2.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
          <p className="net-code mt-3 rounded-xl border border-white/10 bg-[#04060d] p-3">
            {step.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
