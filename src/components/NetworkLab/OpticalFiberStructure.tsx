import { useState } from "react";
import { Callout } from "./ui/primitives";

/**
 * সিমুলেশন ২: অপটিকাল ফাইবারের অভ্যন্তরীণ ও বাহ্যিক কাঠামো
 *
 * ফাইবারের চারটি অংশ: কোর (core), ক্ল্যাডিং (cladding), বাফার কোটিং (buffer
 * coating) ও জ্যাকেট (jacket)। অভ্যন্তরীণ কাঠামো (কোর + ক্ল্যাডিং) আলোকে বন্ধে
 * রাখে, বাহ্যিক কাঠামো (কোটিং + জ্যাকেট) ফাইবারকে রক্ষা করে।
 */

type LayerId = "core" | "cladding" | "coating" | "jacket";

interface Layer {
  id: LayerId;
  bn: string;
  en: string;
  desc: string;
  role: string;
  example: string;
}

const LAYERS: Layer[] = [
  {
    id: "core",
    bn: "কোর",
    en: "Core",
    desc:
      "ফাইবারের কেন্দ্রীয় অংশ, যার ভেতর দিয়ে আলো চলে। কোরের অপবর্তন সহগ (refractive index) ক্ল্যাডিংয়ের চেয়ে বেশি, তাই কোর-ক্ল্যাডিং সীমানায় পতন কোণ কার্টিক কোণ অতিক্রম করলে আলো সীমানা থেকে ফিরে আসে — এটাই পূর্ণ অভ্যন্তরীণ প্রতিফলন।",
    role: "আলো পরিবহনের কেন্দ্রীয় মাধ্যম",
    example:
      "অপটিকাল ফাইবারের কোর জರ್ಮানিয়াম-ডপড সিলিকা দিয়ে তৈরি, যা লেজার আলোকে দীর্ঘ দূরত্ব নিয়ে যায়।",
  },
  {
    id: "cladding",
    bn: "ক্ল্যাডিং",
    en: "Cladding",
    desc:
      "কোরকে ঘিরে থাকা পর্দা, যার অপবর্তন সহগ কম। কোর-ক্ল্যাডিং সীমানায় পূর্ণ অভ্যন্তরীণ প্রতিফলন ঘটাতে সাহায্য করে, ফলে আলো ফাইবারের ভেতরেই বন্ধ থাকে এবং দূরে পৌঁছায়।",
    role: "কোর-ক্ল্যাডিং সীমানায় প্রতিফলন তৈরি করা",
    example:
      "শুদ্ধ সিলিকা ক্ল্যাডিং কোরকে আলোর বন্ধনে রাখে, যাতে সিগন্যাল বেরিয়ে না পড়ে।",
  },
  {
    id: "coating",
    bn: "বাফার কোটিং",
    en: "Buffer coating",
    desc:
      "ক্ল্যাডিংয়ের বাইরের নরম কোটিং। এটি ফাইবারের আর্দ্রতা, রসায়ন ও আঘাত থেকে রক্ষা করে এবং মাইক্রো বেণ্ডিং কমানে সাহায্য করে।",
    role: "ভিতরের সুরক্ষা কোটিং",
    example:
      "আক্রাইলেট বা পলিমার কোটিং ফাইবারের ভঙ্গুর সিলিকা কোরকে রক্ষা করে।",
  },
  {
    id: "jacket",
    bn: "জ্যাকেট",
    en: "Jacket",
    desc:
      "ফাইবারের সবচেয়ে বাইরের সুরক্ষা আবরণ। এটি ফাইবার কেবলকে ঘর্ষণ, রসায়ন, তাপ ও কঠোর আবহাওয়া থেকে বাঁচায়; ভেতরে একাধিক ফাইबर থাকতে পারে।",
    role: "বাহ্যিক সুরক্ষা আবরণ",
    example:
      "দরজা-জানালা থেকে শুরু করে সমুদ্রতলের কেবল — সব ফাইবারের বাইরে মজবুত পলিমার জ্যাকেট থাকে।",
  },
];

export function OpticalFiberStructure() {
  const [view, setView] = useState<"all" | "inner" | "outer">("all");
  const [selected, setSelected] = useState<LayerId | null>(null);

  const layer = LAYERS.find((l) => l.id === selected);

  const opacity = (id: LayerId) => {
    if (view === "all") return 1;
    if (view === "inner") return id === "core" || id === "cladding" ? 1 : 0.25;
    return id === "coating" || id === "jacket" ? 1 : 0.25;
  };

  const cx = 170;
  const cy = 300;
  const rCore = 28;
  const rClad = 55;
  const rCoat = 85;
  const rJacket = 105;

  return (
    <section className="page-shell py-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            সিমুলেশন ২
          </span>
          <h3 className="bangla mt-1 text-[clamp(1.25rem,2.8vw,1.55rem)] font-semibold text-white">
            অপটিকাল ফাইবারের অভ্যন্তরীণ ও বাহ্যিক কাঠামো
          </h3>
          <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
            ফাইবারের চারটি অংশ আছে: কোর, ক্ল্যাডিং, বাফার কোটিং ও জ্যাকেট।
            অভ্যন্তরীণ কাঠামো (কোর + ক্ল্যাডিং) আলোকে বন্ধে রাখে, আর বাহ্যিক কাঠামো
            (কোটিং + জ্যাকেট) ফাইবারকে রক্ষা করে। চিত্রের যেকোনো অংশে ক্লিক করলে তার
            বিস্তারিত ব্যাখ্যা নিচে দেখানো হবে।
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              view === "all"
                ? "border-signal bg-signal/15 text-signal"
                : "border-white/12 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white"
            }`}
          >
            সম্পূর্ণ কাঠামো
          </button>
          <button
            type="button"
            onClick={() => setView("inner")}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              view === "inner"
                ? "border-laser bg-laser/15 text-laser"
                : "border-white/12 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white"
            }`}
          >
            অভ্যন্তরীণ কাঠামো
          </button>
          <button
            type="button"
            onClick={() => setView("outer")}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              view === "outer"
                ? "border-[#fbbf24] bg-[#fbbf24]/15 text-[#fbbf24]"
                : "border-white/12 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white"
            }`}
          >
            বাহ্যিক কাঠামো
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12 items-start">
        <div className="min-w-[340px]">
          <div className="rounded-2xl border border-white/12 bg-[#0b1120] p-6">
            <svg
              viewBox="0 0 720 340"
              className="w-full h-auto max-w-[460px] mx-auto"
              aria-label="অপটিকাল ফাইবারের কাঠানের ছবি"
              role="img"
            >
              {/* বাহ্যিক কাঠামো: জ্যাকেট ও কোটিং */}
              <circle
                cx={cx}
                cy={cy}
                r={rJacket}
                fill="#334155"
                stroke="#475569"
                strokeWidth="1.5"
                opacity={opacity("jacket")}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected("jacket")}
              />
              <circle
                cx={cx}
                cy={cy}
                r={rCoat}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1.5"
                opacity={opacity("coating")}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected("coating")}
              />
              {/* অভ্যন্তরীণ কাঠামো: ক্ল্যাডিং ও কোর */}
              <circle
                cx={cx}
                cy={cy}
                r={rClad}
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1.5"
                opacity={opacity("cladding")}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected("cladding")}
              />
              <circle
                cx={cx}
                cy={cy}
                r={rCore}
                fill="#22d3ee"
                stroke="#81e6d9"
                strokeWidth="1"
                opacity={opacity("core")}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected("core")}
              />
              <defs>
                <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle
                cx={cx}
                cy={cy}
                r={rCore + 10}
                fill="url(#coreGlow)"
                opacity={opacity("core")}
              />

              <g stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" fill="none">
                <line x1={cx + rJacket - 8} y1={cy - 40} x2={250} y2={100} />
                <line x1={cx + rCoat + 12} y1={cy - 8} x2={390} y2={150} />
                <line x1={cx + rClad} y1={cy + 18} x2={400} y2={240} />
                <line x1={cx + rCore + 6} y1={cy + 42} x2={250} y2={300} />
              </g>
              <g fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="13" fill="#94a3b8">
                <text x={255} y={98} fontWeight="600" fill="#fbbf24">
                  জ্যাকেট (Jacket)
                </text>
                <text x={395} y={148} fontWeight="600" fill="#a78bfa">
                  বাফার কোটিং (Buffer coating)
                </text>
                <text x={405} y={238} fontWeight="600" fill="#c4b5fd">
                  ক্ল্যাডিং (Cladding)
                </text>
                <text x={255} y={298} fontWeight="600" fill="#22d3ee">
                  কোর (Core)
                </text>
              </g>
            </svg>
            <p className="bangla mt-4 text-[12.5px] leading-relaxed text-muted text-center">
              ক্রস-সেকশন: কোরকে ক্ল্যাডিং, কোটিং ও জ্যাকেট আবৃত করে। কোনো অংশে ক্লিক
              করলে তার বিস্তারিত নিচে দেখানো হবে।
            </p>
          </div>
        </div>

        <div className="min-w-[340px]">
          <div className="rounded-2xl border border-white/12 bg-[#0b1120] p-6">
            <h4 className="bangla mb-3 text-[13px] font-semibold text-signal">
              দীর্ঘদৃশ্য কাঠামো (longitudinal view)
            </h4>
            <svg viewBox="0 0 300 220" className="w-full h-auto max-w-[300px] mx-auto" aria-hidden>
              <rect
                x="20"
                y="40"
                width="260"
                height="100"
                rx="14"
                fill="#334155"
                stroke="#475569"
                strokeWidth="1.5"
                opacity={opacity("jacket")}
              />
              <rect
                x="40"
                y="55"
                width="220"
                height="70"
                rx="10"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1.5"
                opacity={opacity("coating")}
              />
              <rect
                x="60"
                y="70"
                width="180"
                height="40"
                rx="7"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1.5"
                opacity={opacity("cladding")}
              />
              <rect
                x="96"
                y="87"
                width="108"
                height="6"
                rx="3"
                fill="#22d3ee"
                opacity={opacity("core")}
              />
              <circle cx="190" cy="165" r="30" fill="none" stroke="#3ddbd9" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M170 150 Q190 145 210 150" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
              <path d="M170 180 Q190 185 210 180" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
              <circle cx="170" cy="150" r="2.5" fill="#22d3ee" />
              <circle cx="210" cy="150" r="2.5" fill="#22d3ee" />
              <circle cx="190" cy="165" r="2" fill="#fff" />
            </svg>
            <p className="bangla mt-3 text-[12px] leading-relaxed text-muted text-center">
              বাঁকা অবস্থাতেও কোর-ক্ল্যাডিং সীমানায় পূর্ণ অভ্যন্তরীণ প্রতিফলনের মাধ্যমে আলো
              এগিয়ে চলে।
            </p>
          </div>
        </div>
      </div>

      {selected && layer && (
        <div className="mt-8 rounded-2xl border border-signal/30 bg-signal/[0.08] p-5 md:p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="shrink-0 rounded-full border border-signal/50 bg-signal/20 p-1.5">
              <svg className="h-4 w-4 text-signal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="bangla text-[14px] font-semibold text-white">
                {layer.bn}<span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-signal">
                  {layer.en}
                </span>
              </p>
              <p className="bangla mt-1 text-[11px] text-faint">{layer.role}</p>
            </div>
          </div>
          <p className="bangla text-[13px] leading-relaxed text-ink">{layer.desc}</p>
          <p className="bangla mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink">
            <span className="mr-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal">
              বাস্তব উদাহরণ
            </span>
            {layer.example}
          </p>
        </div>
      )}
      {!selected && (
        <Callout tone="cyan" title="একটি অংশ বেছে নিন">
          <p className="bangla text-[12.5px] leading-relaxed text-muted">
            উপরের চিত্রে কোর, ক্ল্যাডিং, বাফার কোটিং বা জ্যাকেটের উপর ক্লিক করুন — তার নাম,
            কাজ ও বাস্তব উদাহরণ এখানে দেখাবে।
          </p>
        </Callout>
      )}
    </section>
  );
}
