import { useEffect, useRef, useState } from "react";
import { Switch } from "./ui/primitives";

/**
 * সিমুলেশন ৩: অপটিকাল ফাইবারের মধ্য দিয়ে আলোর প্রবাহ
 *
 * আলো ফাইবারের কোরে ঢুকে কোর-ক্ল্যাডিং সীমানায় পূর্ণ অভ্যন্তরীণ প্রতিফলনের
 * মাধ্যমে zigzag আকৃতিতে এগিয়ে চলে এবং দূর প্রান্তে বেরিয়ে আসে। ফাইবার বাঁকালে
 * বাইরের দেওয়ার পাশে পতন কোণ কমে যায় — কার্টিক কোণের নিচে নেমে গেলে আলো
 * বেরিয়ে পড়তে পারে, যা চিত্রে দেখানো হয়।
 */

const CANVAS_W = 760;
const CANVAS_H = 420;
const CORE_R = 9;
const N_GLASS = 1.5;
const N_AIR = 1.0;
const CRITICAL = (Math.asin(N_AIR / N_GLASS) * 180) / Math.PI; // ≈ 41.8°

function bezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  const omt = 1 - t;
  const omt2 = omt * omt;
  const t2 = t * t;
  const x =
    omt2 * omt * p0.x + 3 * omt2 * t * p1.x + 3 * omt * t2 * p2.x + t2 * t * p3.x;
  const y =
    omt2 * omt * p0.y + 3 * omt2 * t * p1.y + 3 * omt * t2 * p2.y + t2 * t * p3.y;
  return { x, y };
}

function bezierTangent(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  const x =
    -3 * (1 - t) * (1 - t) * p0.x +
    3 * (1 - t) * (1 - 4 * t) * p1.x +
    3 * (1 - 2 * t) * t * p2.x +
    3 * t * t * p3.x;
  const y =
    -3 * (1 - t) * (1 - t) * p0.y +
    3 * (1 - t) * (1 - 4 * t) * p1.y +
    3 * (1 - 2 * t) * t * p2.y +
    3 * t * t * p3.y;
  const len = Math.hypot(x, y);
  return len === 0 ? { x: 1, y: 0 } : { x: x / len, y: y / len };
}

interface Ray {
  x: number;
  y: number;
  angle: number;
  pts: number[];
  alive: boolean;
  delivered: boolean;
  leaked: boolean;
  lastIdx: number;
}

export function OpticalFiberFlow() {
  const [flowOn, setFlowOn] = useState(true);
  const [bend, setBend] = useState(70); // পিক্সেলে ফাইবার বাঁকানি
  const [rayMax, setRayMax] = useState(3); // একসাথে সর্বোচ্চ রশ্মি

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stats = useRef({ delivered: 0, leaked: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const p0 = { x: 60, y: 220 };
    const p3 = { x: 700, y: 220 };
    const cp1 = { x: 270, y: 220 - bend };
    const cp2 = { x: 490, y: 220 + bend };
    const samples = 400;
    const poly: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      poly.push(bezierPoint(i / samples, p0, cp1, cp2, p3));
    }
    const tangents: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      tangents.push(bezierTangent(i / samples, p0, cp1, cp2, p3));
    }

    const endDist = 16;
    const stepLen = 2;
    const spawnEvery = 45;
    let frame = 0;
    let spawnIdx = 0;
    const rays: Ray[] = [];

    const nearest = (x: number, y: number, fromIdx: number) => {
      let best = fromIdx;
      let bestD = Infinity;
      const lo = Math.max(0, fromIdx - 35);
      const hi = Math.min(samples, fromIdx + 35);
      for (let i = lo; i <= hi; i++) {
        const d = Math.hypot(x - poly[i].x, y - poly[i].y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return { idx: best, dist: bestD };
    };

    const drawTube = () => {
      const drawStroke = (width: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color;
        ctx.stroke();
      };
      drawStroke(52, "#111827"); // বাহ্যিক আবরণ
      drawStroke(30, "#24304a"); // কোটিং ও ক্ল্যাডিং ভেতরভাগ
      drawStroke(16, "rgba(34, 211, 238, 0.18)"); // কোরের আভাস
      // কেন্দ্ররেখা
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(148, 176, 224, 0.15)";
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const spawnRay = () => {
      const tan = tangents[0];
      rays.push({
        x: p0.x + tan.x * 6,
        y: p0.y + tan.y * 6,
        angle: Math.atan2(tan.y, tan.x),
        pts: [p0.x + tan.x * 6, p0.y + tan.y * 6],
        alive: true,
        delivered: false,
        leaked: false,
        lastIdx: 0,
      });
    };

    const loop = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawTube();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Kalpurush, ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("প্রেরক (LED/লেজার)", p0.x - 50, p0.y + 10);
      ctx.fillText("গ্রাহক (ফটোডায়োড)", p3.x - 10, p3.y + 26);

      if (flowOn) {
        frame++;
        if (frame % spawnEvery === 0 && spawnIdx < rayMax) {
          spawnRay();
          spawnIdx++;
        }
      }

      for (const ray of rays) {
        if (!ray.alive) continue;
        const nx = ray.x + Math.cos(ray.angle) * stepLen;
        const ny = ray.y + Math.sin(ray.angle) * stepLen;
        const { idx, dist } = nearest(nx, ny, ray.lastIdx);
        ray.lastIdx = idx;
        const tan = tangents[idx];
        const nxrm = -tan.y;
        const nyrm = tan.x;
        const side = (nx - poly[idx].x) * nxrm + (ny - poly[idx].y) * nyrm;
        const outX = side >= 0 ? nxrm : -nxrm;
        const outY = side >= 0 ? nyrm : -nyrm;

        if (dist > CORE_R) {
          const inwardX = -outX;
          const inwardY = -outY;
          const cosI = Math.max(
            -1,
            Math.min(
              1,
              Math.cos(ray.angle) * inwardX + Math.sin(ray.angle) * inwardY,
            ),
          );
          const i = Math.acos(cosI); // অভিলম্ব থেকে পতন কোণ
          if (i < CRITICAL * (Math.PI / 180)) {
            ray.leaked = true;
            ray.alive = false;
            stats.current.leaked++;
            ray.pts.push(nx, ny);
            continue;
          }
          const dDotN =
            Math.cos(ray.angle) * outX + Math.sin(ray.angle) * outY;
          ray.angle = Math.atan2(
            Math.sin(ray.angle) - 2 * dDotN * outY,
            Math.cos(ray.angle) - 2 * dDotN * outX,
          );
          ray.x = poly[idx].x + inwardX * (CORE_R - 1);
          ray.y = poly[idx].y + inwardY * (CORE_R - 1);
          ray.pts.push(ray.x, ray.y);
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(ray.x, ray.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ray.x = nx;
          ray.y = ny;
          ray.pts.push(nx, ny);
        }

        if (Math.hypot(ray.x - p3.x, ray.y - p3.y) < endDist) {
          ray.delivered = true;
          ray.alive = false;
          stats.current.delivered++;
        }
      }

      for (const ray of rays) {
        if (ray.pts.length < 4) continue;
        const leaked = ray.leaked;
        const last = ray.pts.length - 2;
        ctx.beginPath();
        ctx.moveTo(ray.pts[0], ray.pts[1]);
        for (let i = 2; i < ray.pts.length; i += 2) {
          ctx.lineTo(ray.pts[i], ray.pts[i + 1]);
        }
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = leaked
          ? "rgba(90, 200, 255, 0.45)"
          : "rgba(34, 211, 238, 0.9)";
        ctx.globalAlpha = leaked ? 0.5 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        const hx = ray.pts[last];
        const hy = ray.pts[last + 1];
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = leaked ? 0 : 10;
        ctx.fillStyle = leaked ? "#5ac8fa" : "#22d3ee";
        ctx.beginPath();
        ctx.arc(hx, hy, leaked ? 2 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (ray.delivered) {
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 14;
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath();
          ctx.arc(p3.x, p3.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (flowOn || rays.some((r) => r.alive)) {
        requestAnimationFrame(loop);
      }
    };

    loop();
  }, [flowOn, bend, rayMax]);

  return (
    <section className="page-shell py-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            সিমুলেশন ৩
          </span>
          <h3 className="bangla mt-1 text-[clamp(1.25rem,2.8vw,1.55rem)] font-semibold text-white">
            ফাইবারের মধ্য দিয়ে আলোর প্রবাহ
          </h3>
          <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
            আলো ফাইবারের কোরে ঢুকে কোর-ক্ল্যাডিং সীমানায় পূর্ণ অভ্যন্তরীণ প্রতিফলনের
            মাধ্যমে zigzag আকৃতিতে এগিয়ে চলে এবং দূর প্রান্তে বেরিয়ে আসে। ফাইবার বাঁকালে
            বাইরের দেওয়ার পাশে পতন কোণ কমে যায় — কার্টিক কোণের নিচে নেমে গেলে আলো
            বেরিয়ে পড়তে পারে, যা চিত্রে দেখানো হয়।
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={flowOn}
            onChange={setFlowOn}
            onLabel="আলো প্রবাহ চালু"
            offLabel="আলো প্রবাহ বন্ধ"
            description="নতুন রশ্মি সৃষ্টি বন্ধ করে দেবে"
          />
        </div>
      </div>

      <div className="figure-scroll max-w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-[760px] h-[420px] rounded-2xl border border-white/12 bg-[#0b1120] touch-pan-y"
          aria-label="ফাইবারের মধ্য দিয়ে আলোর প্রবাহ সিমুলেশন"
          role="img"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            ফাইবার বাঁকানি
          </p>
          <input
            type="range"
            min={0}
            max={150}
            step={5}
            value={bend}
            onChange={(e) => setBend(Number(e.currentTarget.value))}
            className="w-full accent-signal mt-2 h-1.5 bg-white/[0.06] rounded-lg border border-white/10 cursor-pointer"
          />
          <p className="bangla mt-2 text-[12px] leading-snug text-ink">
            বাঁকানি {bend} px
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            একসাথে রশ্মি
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setRayMax((c) => Math.max(1, c - 1))}
              disabled={rayMax <= 1}
              className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted disabled:opacity-60"
            >
              −
            </button>
            <span className="font-mono text-[11px] text-ink min-w-[14px] text-center">
              {rayMax}
            </span>
            <button
              type="button"
              onClick={() => setRayMax((c) => Math.min(8, c + 1))}
              disabled={rayMax >= 8}
              className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted disabled:opacity-60"
            >
              +
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              কার্টিক কোণ (কাঁচ-বায়ু)
            </p>
            <p className="bangla mt-1 text-[13px] text-ink">{CRITICAL.toFixed(1)}°</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            পৌঁছানো / বেরিয়ে পড়া
          </p>
          <p className="bangla mt-1 text-[13px] font-semibold text-ink">
            {stats.current.delivered} / {stats.current.leaked}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
        <p className="bangla text-[13px] leading-relaxed text-ink">
          <span className="font-semibold text-signal">কী ঘটছে:</span> আলো কোরের ভেতর
          চলে এবং কোর-ক্ল্যাডিং সীমানায় অভিলম্ব থেকে কার্টিক কোণ
          ({CRITICAL.toFixed(1)}°) এর বেশি কোণে পতিত হলে সীমানা থেকে ফিরে আসে।
          ফাইবার বাঁকানোর সময় বাইরের দেওয়ালে পতন কোণ কমে যায়; কার্টিক কোণের নিচে
          নেমে গেলে আলো ফাইবার থেকে বেরিয়ে পড়ে — দীর্ঘ দূরত্বের ফাইবারে বাঁক কম রাখা
          জরুরি।
        </p>
      </div>
    </section>
  );
}
