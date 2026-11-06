import { useEffect, useRef, useState } from "react";
import { Switch } from "./ui/primitives";

/**
 * সিমুলেশন ১: পূর্ণ অভ্যন্তরীণ প্রতিফলন (Total Internal Reflection)
 *
 * লেজার আলো কাঁচ ব্লকের ভেতর চলে এবং কাঁচ-বায়ু সীমানায় পতিত হলে, অভিলম্ব থেকে
 * পতন কোণ একটি নির্দিষ্ট সীমা (কার্টিক কোণ) পার করলে আলো সীমানা থেকে ফিরে আসে —
 * এটাই পূর্ণ অভ্যন্তরীণ প্রতিফলন। একাধিক কাঁচ ব্লক জুড়ো দিলে আলো সীমার ভেতর দূরে
 * পৌঁছায়, যা অপটিক্যাল ফাইবারের মূল নীতিস্বরূপ।
 */

const CANVAS_W = 760;
const CANVAS_H = 400;
const SLAB_W = 150;
const TOP_Y = 150;
const BOTTOM_Y = 260;

export function OpticalFiberTIR() {
  const [laserOn, setLaserOn] = useState(true);
  const [incidence, setIncidence] = useState(58); // কাঁচ-বায়ু সীমানায় পতন কোণ (অধিলম্ব থেকে), ডিগ্রী
  const [nGlass, setNGlass] = useState(1.5);
  const [slabCount, setSlabCount] = useState(3);
  const [showGlass, setShowGlass] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrl = useRef({
    laserOn,
    incidence,
    nGlass,
    slabCount,
    showGlass,
  });
  ctrl.current = { laserOn, incidence, nGlass, slabCount, showGlass };

  const nAir = 1.0;
  const critical =
    nAir / nGlass >= 1 ? 90 : (Math.asin(nAir / nGlass) * 180) / Math.PI;
  const totalInternal = incidence >= critical;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const xStart = 170;
    const chainEnd = xStart + ctrl.current.slabCount * SLAB_W;
    const cy = (TOP_Y + BOTTOM_Y) / 2;

    let x = xStart + 22;
    let y = cy;
    const trail: number[] = [];
    let active = true;
    let farEndReached = false;
    let leakSegment:
      | { x1: number; y1: number; x2: number; y2: number }
      | null = null;

    // রশ্মির দিক: উপরে-নিচে দেওয়ার দেওয়ার মধ্যবর্তী সীমানায় পতন কোণ = `incidence`,
    // তাই অনুভূমিক অক্ষ থেকে কোণ = ৯০° - incidence
    let a = ((90 - ctrl.current.incidence) * Math.PI) / 180;
    if (a <= 0.02) a = 0.02;
    if (a >= Math.PI / 2 - 0.02) a = Math.PI / 2 - 0.02;
    let vx = Math.cos(a);
    let vy = Math.sin(a);

    const stepLen = 1.5;
    const maxSteps = 6000;
    let steps = 0;

    const exitAngleRad = (): number => {
      const r = Math.asin(
        Math.min(1, (ctrl.current.nGlass / 1.0) * Math.sin((ctrl.current.incidence * Math.PI) / 180)),
      );
      return Math.PI / 2 - r; // সীমানার বাইরে analytical রশ্মির দিক
    };

    const drawSlabs = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (ctrl.current.showGlass) {
        for (let k = 0; k < ctrl.current.slabCount; k++) {
          const bx = xStart + k * SLAB_W;
          ctx.fillStyle = "rgba(56, 78, 116, 0.42)";
          ctx.strokeStyle = "rgba(110, 145, 200, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.fillRect(bx, TOP_Y, SLAB_W, BOTTOM_Y - TOP_Y);
          ctx.strokeRect(bx, TOP_Y, SLAB_W, BOTTOM_Y - TOP_Y);
          ctx.fillStyle = "#94a3b8";
          ctx.font =
            "11px Kalpurush, ui-sans-serif, system-ui, sans-serif";
          ctx.fillText(`কাঁচ ব্লক ${k + 1}`, bx + 10, TOP_Y + 17);
        }
      }
      // লেজার ইউনিট (বাইরে বাঁদিকে)
      ctx.fillStyle = ctrl.current.laserOn ? "#3ddbd9" : "#475569";
      ctx.beginPath();
      ctx.arc(xStart - 26, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(xStart - 26, cy - 5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.font =
        "11px Kalpurush, ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("লেজার", xStart - 42, cy + 20);
    };

    const drawTrail = () => {
      for (let i = 2; i < trail.length; i += 2) {
        const alpha = i / trail.length;
        ctx.strokeStyle = `rgba(240, 80, 90, ${0.1 + alpha * 0.85})`;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[i - 2], trail[i - 1]);
        ctx.lineTo(trail[i], trail[i + 1]);
        ctx.stroke();
      }
      if (trail.length >= 2) {
        const hx = trail[trail.length - 2];
        const hy = trail[trail.length - 1];
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const drawExit = () => {
      if (leakSegment) {
        const { x1, y1, x2, y2 } = leakSegment;
        ctx.strokeStyle = "rgba(90, 200, 255, 0.55)";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      if (farEndReached) {
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(chainEnd, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#94a3b8";
        ctx.font =
          "12px Kalpurush, ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText("দূর প্রান্তে আলো পৌঁছেছে", chainEnd - 72, cy - 14);
      }
    };

    const draw = () => {
      drawSlabs();
      drawTrail();
      drawExit();
    };

    const advance = () => {
      if (!ctrl.current.laserOn) {
        active = false;
        draw();
        return;
      }
      if (!active || steps > maxSteps) return;

      const nx = x + vx * stepLen;
      const ny = y + vy * stepLen;
      let wallHit = false;

      if (ny <= TOP_Y && vy < 0) {
        wallHit = true;
        x = nx;
        y = TOP_Y;
        if (totalInternal) {
          vy = -vy; // পূর্ণ অভ্যন্তরীণ প্রতিফলন
        } else {
          const ea = exitAngleRad();
          leakSegment = {
            x1: x,
            y1: y,
            x2: x + Math.cos(ea) * 130,
            y2: y - Math.sin(ea) * 130,
          };
          active = false;
        }
      } else if (ny >= BOTTOM_Y && vy > 0) {
        wallHit = true;
        x = nx;
        y = BOTTOM_Y;
        if (totalInternal) {
          vy = -vy;
        } else {
          const ea = exitAngleRad();
          leakSegment = {
            x1: x,
            y1: y,
            x2: x + Math.cos(ea) * 130,
            y2: y + Math.sin(ea) * 130,
          };
          active = false;
        }
      } else if (nx >= chainEnd) {
        farEndReached = true;
        x = chainEnd;
        y = ny;
        active = false;
      } else if (nx <= xStart) {
        active = false;
      } else {
        x = nx;
        y = ny;
        trail.push(x, y);
        if (trail.length > 1200) trail.splice(0, trail.length - 1200);
      }

      steps++;
      if (wallHit) {
        trail.push(x, y);
        if (trail.length > 1200) trail.splice(0, trail.length - 1200);
      }
      draw();
      if (active) {
        requestAnimationFrame(advance);
      }
    };

    const loop = () => {
      draw();
      if (ctrl.current.laserOn && active) requestAnimationFrame(advance);
    };
    loop();
  }, [laserOn, incidence, nGlass, slabCount, showGlass]);

  return (
    <section className="page-shell py-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            সিমুলেশন ১
          </span>
          <h3 className="bangla mt-1 text-[clamp(1.25rem,2.8vw,1.55rem)] font-semibold text-white">
            পূর্ণ অভ্যন্তরীণ প্রতিফলন — লেজার আর কাঁচ
          </h3>
          <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
            লেজার আলো কাঁচ ব্লকের ভেতর চলে এবং কাঁচ-বায়ু সীমানায় পতিত হলে,
            অভিলম্ব থেকে পতন কোণ একটি নির্দিষ্ট সীমা (কার্টিক কোণ) পার করলে আলো
            সীমানা থেকে ফিরে আসে — এটাই পূর্ণ অভ্যন্তরীণ প্রতিফলন। একাধিক কাঁচ
            ব্লক জুড়ো দিলে আলো সীমার ভেতর দূরে পৌঁছায়, যা অপটিক্যাল ফাইবারের
            মূল নীতিস্বরূপ।
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={laserOn}
            onChange={setLaserOn}
            onLabel="লেজার চালু"
            offLabel="লেজার বন্ধ"
            description="অন্ধকারে রশ্মিটি স্পষ্ট দেখতে চালু রাখুন"
          />
        </div>
      </div>

      <div className="figure-scroll max-w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-[760px] h-[400px] rounded-2xl border border-white/12 bg-[#0b1120] shadow-[0_0_40px_-20px_rgba(240,80,90,0.35)] touch-pan-y"
          aria-label="পূর্ণ অভ্যন্তরীণ প্রতিফলন সিমুলেশন"
          role="img"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            পতন কোণ i
          </p>
          <input
            type="range"
            min={5}
            max={88}
            step={1}
            value={incidence}
            onChange={(e) => setIncidence(Number(e.currentTarget.value))}
            className="w-full accent-signal mt-2 h-1.5 bg-white/[0.06] rounded-lg border border-white/10 cursor-pointer"
          />
          <p className="bangla mt-2 text-[12px] leading-snug text-ink">
            {incidence}° — সীমানায় পতন কোণ
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            কাঁচের refractive index n
          </p>
          <input
            type="range"
            min={100}
            max={200}
            step={1}
            value={Math.round(nGlass * 100)}
            onChange={(e) => setNGlass(Number(e.currentTarget.value) / 100)}
            className="w-full accent-laser mt-2 h-1.5 bg-white/[0.06] rounded-lg border border-white/10 cursor-pointer"
          />
          <p className="bangla mt-2 text-[12px] leading-snug text-ink">
            n = {nGlass.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            কাঁচ ব্লক সংখ্যা
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setSlabCount((c) => Math.max(1, c - 1))}
              disabled={slabCount <= 1}
              className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted disabled:opacity-60"
            >
              −
            </button>
            <span className="font-mono text-[11px] text-ink min-w-[14px] text-center">
              {slabCount}
            </span>
            <button
              type="button"
              onClick={() => setSlabCount((c) => Math.min(6, c + 1))}
              disabled={slabCount >= 6}
              className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted disabled:opacity-60"
            >
              +
            </button>
          </div>
          <p className="bangla mt-2 text-[12px] leading-snug text-ink">
            জুড়ো ব্লক: {slabCount}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              কাঁচ মডেল
            </p>
            <Switch checked={showGlass} onChange={setShowGlass} onLabel="দৃশ্যমান" offLabel="লুকানো" />
          </div>
          <p className="bangla text-[12px] leading-snug text-ink mt-2">
            কার্টিক কোণ ≈ {critical.toFixed(1)}°
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
        <p className="bangla text-[13px] leading-relaxed text-ink">
          <span className="font-semibold text-signal">কী ঘটছে:</span> পতন কোণ i যখন কার্টিক
          কোণ ({critical.toFixed(1)}°) এর কম হয়, তখন আলো কাঁচ-বায়ু সীমানা কেটে বাইরে
          বেরিয়ে যায় (প্রবক্ষப்பு)। i কার্টিক কোণের बरোबर বা বেশি হলে আলো সীমানা থেকে
          ফিরে আসে — এটাই পূর্ণ অভ্যন্তরীণ প্রতিফলন। কাঁচ ব্লকগুলো একে অপরের সাথে জুড়ো
          থাকলে আলো সীমার ভেতর থেকে দূরে পৌঁছায়, ঠিক যেভাবে ফাইবারের কোরের ভেতর
          আলো দীর্ঘ দূরত্ব যাত্রা করে। কাঁচের refractive index (n) বাড়ালে কার্টিক কোণ
          কমে যায়, তাই সহজেই প্রতিফলন শুরু হয়।
        </p>
        <p className="bangla mt-3 text-[12.5px] leading-relaxed text-muted">
          রেফারেন্স: বাস্তব লেজার লাইটের পরীক্ষা —{" "}
          <a
            href="https://www.youtube.com/watch?v=NAaHPRsveJk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline"
          >
            YouTube রেফারেন্স ভিডিও
          </a>
        </p>
      </div>
    </section>
  );
}
