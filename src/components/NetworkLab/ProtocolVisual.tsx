import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  HTTP_NOTE,
  HTTP_REQUEST,
  HTTP_RESPONSE,
  PROTOCOL_CASES,
  PROTOCOL_STEPS,
} from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Button, Callout, SimNote } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * Protocol: the rules that make a request understandable.
 *
 * Two parts. First the happy path — an HTTP request going out and a response
 * coming back, with a simplified message inspector filling in as the steps run.
 * Then the rules game: send a message that breaks the format and watch the
 * server refuse it, which is the only way to feel why the rules exist.
 */

const STAGE_X = {
  client: 190,
  server: 770,
} as const;

export function ProtocolVisual({ className }: { className?: string }) {
  const player = useStepPlayer(PROTOCOL_STEPS.length, 3000);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [tested, setTested] = useState<Record<string, boolean>>({});
  const step = PROTOCOL_STEPS[player.index];
  const selectedCase = PROTOCOL_CASES.find((item) => item.id === caseId) ?? null;

  // The inspector fills in as the journey progresses.
  const showRequest = player.index >= 0;
  const showResponse = player.index >= 3;
  const atServer = player.index >= 2 && player.index <= 3;
  const atClient = player.index === 0 || player.index === 1 || player.index === 4;

  return (
    <div className={cn("space-y-5", className)}>
      <figure className="net-figure">
        <svg viewBox="0 0 960 280" role="img" aria-label="HTTP request ও response আদান-প্রদানের চিত্র">
          {/* client */}
          <rect
            x="60"
            y="90"
            width="260"
            height="110"
            rx="12"
            fill="rgba(11,17,32,0.92)"
            stroke={atClient ? "#fbbf24" : "rgba(148,176,224,0.3)"}
            strokeWidth="1.6"
          />
          <text className="net-node-title" x="80" y="122">Client</text>
          <text className="net-node-sub" x="80" y="140">WEB BROWSER</text>
          <text className="net-node-note" x="80" y="162">request তৈরি করে</text>
          <text className="net-node-note" x="80" y="180">response পড়ে পেজ আঁকে</text>

          {/* server */}
          <rect
            x="640"
            y="90"
            width="260"
            height="110"
            rx="12"
            fill="rgba(11,17,32,0.92)"
            stroke={atServer ? "#fbbf24" : "rgba(96,165,250,0.5)"}
            strokeWidth="1.6"
          />
          <text className="net-node-title" x="660" y="122">Server</text>
          <text className="net-node-sub" x="660" y="140">WEB SERVER</text>
          <text className="net-node-note" x="660" y="162">নিয়ম মিলিয়ে request পড়ে</text>
          <text className="net-node-note" x="660" y="180">status সহ response পাঠায়</text>

          {/* request arrow */}
          <path
            d="M320 128 H640"
            stroke="#3ddbd9"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#net-arrow-cyan)"
            className={player.index >= 1 && player.playing && !player.reduced ? "net-flow" : undefined}
            opacity={player.index >= 1 ? 1 : 0.4}
          />
          <text className="net-node-sub" x="404" y="118" fill="#7ee7e2">REQUEST →</text>

          {/* response arrow */}
          <path
            d="M640 168 H320"
            stroke="#a78bfa"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#net-arrow-violet)"
            className={player.index >= 3 && player.playing && !player.reduced ? "net-flow" : undefined}
            opacity={player.index >= 3 ? 1 : 0.4}
          />
          <text className="net-node-sub" x="404" y="190" fill="#c4b5fd">← RESPONSE</text>

          <defs>
            <marker id="net-arrow-cyan" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#3ddbd9" />
            </marker>
            <marker id="net-arrow-violet" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0 0 L9 4.5 L0 9 z" fill="#a78bfa" />
            </marker>
          </defs>

          {/* travelling packet */}
          <circle
            cx={player.index <= 1 ? STAGE_X.client : player.index >= 4 ? STAGE_X.client : STAGE_X.server}
            cy={player.index >= 3 ? 168 : 128}
            r="7"
            fill={player.index >= 3 ? "#a78bfa" : "#3ddbd9"}
            stroke="#04060d"
            strokeWidth="1.4"
          />
          <text className="net-figure-label" x="60" y="234">
            HTTP — APPLICATION LAYER PROTOCOL
          </text>
          <text className="net-node-note" x="60" y="256">
            একই নিয়ম দুই প্রান্ত মানে বলেই বার্তা বোঝা যায়
          </text>
        </svg>
      </figure>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <StepControls player={player} label="প্রোটোকল সিমুলেশন" />
          <div className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4" aria-live="polite">
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
              ধাপ {toBn(player.index + 1)} / {toBn(PROTOCOL_STEPS.length)} · {step.where}
            </p>
            <h3 className="bangla mt-1.5 text-[16px] font-semibold text-white">{step.title}</h3>
            <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{step.body}</p>
          </div>
          <ol className="space-y-1.5">
            {PROTOCOL_STEPS.map((item, index) => (
              <li key={item.title}>
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
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* message inspector */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
            <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-white">
              Message inspector (সরলীকৃত)
            </p>
            <div className="space-y-3 p-4">
              <div>
                <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-signal">
                  Request — ক্লায়েন্ট → সার্ভার
                </p>
                <pre className="net-code mt-2">
                  {showRequest
                    ? HTTP_REQUEST.join("\n")
                    : "…request এখনো তৈরি হয়নি"}
                </pre>
              </div>
              <div>
                <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-laser">
                  Response — সার্ভার → ক্লায়েন্ট
                </p>
                <pre className="net-code mt-2">
                  {showResponse ? HTTP_RESPONSE.join("\n") : "…সার্ভার এখনো জবাব দেয়নি"}
                </pre>
              </div>
            </div>
          </div>
          <p className="bangla rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-faint">
            {HTTP_NOTE}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ rules simulation */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla text-[13.5px] font-semibold text-white">
            নিয়ম মানলে হয়, না মানলে হয় না
          </p>
          <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">
            নিচের একটি বার্তা বেছে নিয়ে “সার্ভারে পাঠাও” চাপো। সার্ভার নিয়ম মিলিয়ে দেখবে — মিললে কাজ
            হবে, না মিললে বার্তা বাতিল হবে।
          </p>
          <div className="mt-3 space-y-2">
            {PROTOCOL_CASES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={caseId === item.id}
                onClick={() => setCaseId(item.id)}
                className={cn(
                  "bangla flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] transition-colors",
                  caseId === item.id
                    ? "border-signal/60 bg-signal/10 text-white"
                    : "border-white/10 text-muted hover:border-white/25 hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                <span className="net-code shrink-0 text-[10.5px] text-faint">
                  {item.lines[0]}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!selectedCase}
              onClick={() => selectedCase && setTested((prev) => ({ ...prev, [selectedCase.id]: true }))}
            >
              সার্ভারে পাঠাও
            </Button>
            <Button
              variant="quiet"
              disabled={!selectedCase || !tested[selectedCase.id ?? ""]}
              onClick={() => setTested((prev) => {
                const next = { ...prev };
                if (selectedCase) delete next[selectedCase.id];
                return next;
              })}
            >
              ফলাফল মুছো
            </Button>
          </div>
        </div>

        <div aria-live="polite">
          {!selectedCase ? (
            <Callout tone="slate" title="একটি বার্তা বেছে নাও">
              <p className="bangla">
                বাঁ দিকের তালিকা থেকে একটি বার্তা বেছে নাও, তারপর “সার্ভারে পাঠাও” চাপলে সার্ভারের
                সিদ্ধান্ত এখানে দেখা যাবে।
              </p>
            </Callout>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
                <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-white">
                  পাঠানো বার্তা
                </p>
                <pre className="net-code p-4">{selectedCase.lines.join("\n")}</pre>
              </div>

              {tested[selectedCase.id] ? (
                selectedCase.ok ? (
                  <Callout tone="cyan" title="সার্ভার বার্তা গ্রহণ করেছে" icon={<Check size={14} />}>
                    <p className="bangla">{selectedCase.why}</p>
                    <p className="net-code">HTTP/1.1 200 OK</p>
                  </Callout>
                ) : (
                  <Callout tone="red" title="সার্ভার বার্তা প্রত্যাখ্যান করেছে" icon={<X size={14} />}>
                    <p className="bangla">{selectedCase.why}</p>
                    <p className="net-code">ERROR — request not processed</p>
                  </Callout>
                )
              ) : (
                <Callout tone="amber" title="সার্ভার এখনো বার্তাটি পরীক্ষা করেনি">
                  <p className="bangla">
                    “সার্ভারে পাঠাও” চাপলে সার্ভার নিয়ম মিলিয়ে দেখবে এবং ফলাফল এখানে দেখাবে।
                  </p>
                </Callout>
              )}
            </div>
          )}
        </div>
      </div>

      <SimNote />
    </div>
  );
}
