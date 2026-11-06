import { useCallback, useEffect, useRef, useState } from "react";
import { Switch } from "./ui/primitives";

/**
 * সিমুলেশন ৪: ডাটা থেকে আলোর পルス, আর পルス থেকে ডাটা
 *
 * ফাইবারের এক প্রান্তে লেজার/LED দিয়ে ডাটা পাঠালে ডাটা বিটে রূপান্তরিত হয়:
 * ১ বিটে আলো জ্বলে (পルス), ০ বিটে আলো নিভে থাকে। পルスগুলো ফাইবারের মধ্য দিয়ে
 * ভ্রমণ করে এবং অপর প্রান্তে ফটোডায়োড পルス গুলোকে পুনরায় বিটে — এবং তারপর
 * লেখায় রূপান্তর করে।
 */

const CANVAS_W = 760;
const CANVAS_H = 300;
const TUBE_Y = 150;
const TUBE_H = 44;
const TX_X = 110;
const RX_X = 650;

function textToBits(text: string): string[] {
  const bits: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1 ? "1" : "0");
    }
  }
  return bits;
}

function bitsToText(bits: (string | null)[]): string {
  let out = "";
  for (let i = 0; i + 7 < bits.length; i += 8) {
    const chunk = bits.slice(i, i + 8);
    if (chunk.some((b) => b === null)) {
      out += "�";
      continue;
    }
    let code = 0;
    for (const b of chunk) code = (code << 1) | (b === "1" ? 1 : 0);
    out += String.fromCharCode(code);
  }
  return out;
}

interface Pulse {
  x: number;
  bitIndex: number;
  alive: boolean;
}

export function OpticalFiberData() {
  const [text, setText] = useState("হ্যালো ফাইবার");
  const [sending, setSending] = useState(false);
  const [speed, setSpeed] = useState(3); // পিক্সেল প্রতি ফ্রেম
  const [bitIndex, setBitIndex] = useState(0);
  const [received, setReceived] = useState<(string | null)[]>([]);
  const [decoded, setDecoded] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulses = useRef<Pulse[]>([]);
  const frame = useRef(0);

  const bits = textToBits(text);
  const bitDuration = 40; // ফ্রেম প্রতি বিট

  const reset = useCallback(() => {
    setBitIndex(0);
    setReceived(Array(bits.length).fill(null));
    setDecoded("");
    pulses.current = [];
    frame.current = 0;
  }, [bits.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const drawTube = () => {
      ctx.beginPath();
      ctx.roundRect(TX_X - 10, TUBE_Y - TUBE_H / 2, RX_X - TX_X + 20, TUBE_H, 14);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(TX_X, TUBE_Y - TUBE_H / 2 + 8, RX_X - TX_X, TUBE_H - 16, 8);
      ctx.fillStyle = "#24304a";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(TX_X, TUBE_Y);
      ctx.lineTo(RX_X, TUBE_Y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(34, 211, 238, 0.14)";
      ctx.stroke();
    };

    const drawStation = (x: number, label: string, active: boolean) => {
      ctx.fillStyle = active ? "#22d3ee" : "#475569";
      ctx.fillRect(x - 22, TUBE_Y - 30, 44, 26);
      ctx.fillStyle = "#04121a";
      ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, x, TUBE_Y - 16);
      ctx.textAlign = "start";
    };

    const loop = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawTube();

      drawStation(TX_X, "TX", sending);
      drawStation(RX_X, "RX", true);

      if (sending && bitIndex < bits.length) {
        frame.current++;
        if (frame.current % bitDuration === 0) {
          if (bits[bitIndex] === "1") {
            pulses.current.push({ x: TX_X, bitIndex, alive: true });
          }
          setBitIndex((prev) => prev + 1);
        }
      }

      for (const p of pulses.current) {
        if (!p.alive) continue;
        p.x += speed;
        if (p.x >= RX_X) {
          setReceived((prev) => {
            const next = [...prev];
            next[p.bitIndex] = bits[p.bitIndex];
            return next;
          });
          p.alive = false;
        }
      }

      for (const p of pulses.current) {
        if (!p.alive) continue;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(p.x, TUBE_Y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (sending || pulses.current.some((p) => p.alive)) {
        requestAnimationFrame(loop);
      }
    };

    loop();
  }, [sending, speed, bitIndex, bits]);

  // প্রাপ্ত বিটগুলো থেকে লেখা পুনর্গঠন
  useEffect(() => {
    setDecoded(bitsToText(received));
  }, [received]);

  const allReceived = bits.every((_, i) => received[i] !== null);
  const match = allReceived && decoded === text;

  return (
    <section className="page-shell py-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            সিমুলেশন ৪
          </span>
          <h3 className="bangla mt-1 text-[clamp(1.25rem,2.8vw,1.55rem)] font-semibold text-white">
            ডাটা থেকে আলোর পルス, আর পルス থেকে ডাটা
          </h3>
          <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
            ফাইবারের এক প্রান্তে লেজার/LED দিয়ে ডাটা পাঠালে ডাটা বিটে রূপান্তরিত হয়:
            ১ বিটে আলো জ্বলে (পルス), ০ বিটে আলো নিভে থাকে। পルスগুলো ফাইবারের
            মধ্য দিয়ে ভ্রমণ করে এবং অপর প্রান্তে ফটোডায়োড পルス গুলোকে পুনরায় বিটে
            — এবং তারপর লেখায় রূপান্তর করে।
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={sending}
            onChange={setSending}
            onLabel="প্রচালন চালু"
            offLabel="প্রচালন বন্ধ"
            description="ডাটা বিট অনুযায়ী পルス সৃষ্টি হবে"
          />
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-[12px] text-muted hover:border-white/30 hover:text-white"
          >
            রিসেট
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[340px_1fr_340px] items-start">
        {/* প্রেরক */}
        <div className="rounded-2xl border border-white/12 bg-[#0b1120] p-5">
          <p className="bangla mb-2 text-[12.5px] font-semibold text-signal">
            প্রেরক (Transmitter)
          </p>
          <label className="bangla block text-[12px] text-muted mb-2">ডাটা লিখুন</label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.currentTarget.value);
              if (!sending) reset();
            }}
            className="w-full rounded border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-ink focus:border-signal/60 focus:outline-none"
          />
          <p className="bangla mt-3 mb-1 text-[12px] text-muted">বাইনারি বিট স্ট্রিম</p>
          <div className="font-mono text-[11px] leading-relaxed text-signal/80 break-all max-w-full mb-3">
            {bits.map((b, i) => (
              <span
                key={i}
                className={`inline-block w-5 h-5 rounded border text-[10px] leading-none text-center m-0.5 ${
                  i < bitIndex
                    ? b === "1"
                      ? "border-signal bg-signal/25 text-signal"
                      : "border-signal/50 bg-white/[0.05] text-signal/60"
                    : "border-white/10 bg-white/[0.03] text-faint"
                }`}
              >
                {b}
              </span>
            ))}
          </div>
          <p className="bangla mt-2 text-[12px] leading-snug text-ink">
            মোট বিট: {bits.length}। ১ বিটে লেজার/LED আলো জ্বালায় (পルス তৈরি), ০
            বিটে আলো নিভে যায়।
          </p>
        </div>

        {/* ফাইবারের সিমুলেশন */}
        <div className="figure-scroll max-w-full">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full max-w-[760px] h-[300px] rounded-2xl border border-white/12 bg-[#0b1120] touch-pan-y"
            aria-label="ডাটা থেকে আলোর পルス সিমুলেশন"
            role="img"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              পルス গতি
            </span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.currentTarget.value))}
              className="flex-1 accent-signal mt-0.5 h-1.5 bg-white/[0.06] rounded-lg border border-white/10 cursor-pointer"
            />
            <span className="font-mono text-[11px] text-ink">{speed}</span>
          </div>
        </div>

        {/* গ্রাহক */}
        <div className="rounded-2xl border border-white/12 bg-[#0b1120] p-5">
          <p className="bangla mb-2 text-[12.5px] font-semibold text-laser">
            গ্রাহক (Receiver)
          </p>
          <p className="bangla mb-2 text-[12px] text-muted">প্রাপ্ত বাইনারি</p>
          <div className="font-mono text-[11px] leading-relaxed text-laser/80 break-all max-w-full mb-3">
            {bits.map((_, i) => (
              <span
                key={i}
                className={`inline-block w-5 h-5 rounded border text-[10px] leading-none text-center m-0.5 ${
                  received[i] !== null
                    ? received[i] === "1"
                      ? "border-signal bg-signal/25 text-signal"
                      : "border-signal/50 bg-white/[0.05] text-signal/60"
                    : "border-white/10 bg-white/[0.03] text-faint"
                }`}
              >
                {received[i] ?? "•"}
              </span>
            ))}
          </div>
          <p className="bangla mb-2 text-[12px] text-muted">পুনর্গঠিত লেখা</p>
          <div className="rounded border border-white/10 bg-white/[0.02] p-2.5 mb-3">
            <p className="bangla text-[13px] text-ink font-medium">
              {decoded || "—"}
            </p>
          </div>
          <p className={`bangla text-[12.5px] leading-relaxed mt-3 ${
            match === true
              ? "text-signal font-semibold"
              : match === false
                ? "text-[#f87171] font-semibold"
                : "text-muted"
          }`}>
            {match === true
              ? "ডাটা সফলভাবে পৌঁছেছে — প্রেরন ও প্রাপ্ত ডাটা একই।"
              : allReceived
                ? "প্রাপ্ত ডাটা প্রেরন ডাটার সাথে মেলেনি।"
                : decoded.length > 0
                  ? "আরও বিট আসছে…"
                  : "পルス অপেক্ষা করছে।"}
          </p>
        </div>
      </div>
    </section>
  );
}
