import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  AudioWaveform,
  Binary,
  Cable,
  MonitorSmartphone,
  Pause,
  Play,
  Radio,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, ChoiceGroup } from "./ui/primitives";

type ModulationScheme = "ask" | "fsk" | "psk" | "qpsk" | "qam";
type ChannelKind = "phone" | "cable" | "radio";

const SCHEMES: Record<
  ModulationScheme,
  {
    label: string;
    bitsPerSymbol: number;
    change: string;
    explanation: string;
    robustnessPenalty: number;
    mapping: { bits: string; signal: string }[];
  }
> = {
  ask: {
    label: "ASK · amplitude বদলায়",
    bitsPerSymbol: 1,
    change: "carrier wave-এর উচ্চতা (amplitude)",
    explanation: "Bit 1 হলে বড় ঢেউ, bit 0 হলে ছোট ঢেউ। সহজ, কিন্তু signal দুর্বল হলে amplitude বোঝা কঠিন হয়ে যায়।",
    robustnessPenalty: 17,
    mapping: [
      { bits: "0", signal: "ছোট amplitude" },
      { bits: "1", signal: "বড় amplitude" },
    ],
  },
  fsk: {
    label: "FSK · frequency বদলায়",
    bitsPerSymbol: 1,
    change: "carrier wave-এর frequency",
    explanation: "Bit 0-এর জন্য ধীর ঢেউ, bit 1-এর জন্য ঘন ঢেউ। পুরোনো dial-up modem-এর পরিচিত শব্দ অনেকটা এই ধারণা থেকেই আসে।",
    robustnessPenalty: 8,
    mapping: [
      { bits: "0", signal: "কম frequency" },
      { bits: "1", signal: "বেশি frequency" },
    ],
  },
  psk: {
    label: "BPSK · phase বদলায়",
    bitsPerSymbol: 1,
    change: "carrier wave-এর phase",
    explanation: "ঢেউ একই উচ্চতা ও গতিতে থাকে, তবে bit বদলালে ঢেউয়ের শুরুটা ১৮০° উল্টে যায়। Noise-এর বিরুদ্ধে তুলনামূলক শক্ত।",
    robustnessPenalty: 3,
    mapping: [
      { bits: "0", signal: "phase 180°" },
      { bits: "1", signal: "phase 0°" },
    ],
  },
  qpsk: {
    label: "QPSK · একসঙ্গে ২ bit",
    bitsPerSymbol: 2,
    change: "carrier wave-এর চারটি phase",
    explanation: "প্রতি symbol-এ দুটি bit। চারটি আলাদা phase মানে একই সময়ে দ্বিগুণ bit, কিন্তু demodulator-কে আরও কাছাকাছি অবস্থা আলাদা করতে হয়।",
    robustnessPenalty: 10,
    mapping: [
      { bits: "00", signal: "phase 225°" },
      { bits: "01", signal: "phase 135°" },
      { bits: "11", signal: "phase 45°" },
      { bits: "10", signal: "phase 315°" },
    ],
  },
  qam: {
    label: "16-QAM · একসঙ্গে ৪ bit",
    bitsPerSymbol: 4,
    change: "amplitude ও phase—দুটোই",
    explanation: "প্রতি symbol-এ চার bit, মোট ১৬টি আলাদা amplitude/phase অবস্থা। গতি বেশি, তবে noise বাড়লেই কাছাকাছি অবস্থা গুলিয়ে ভুল হওয়ার ঝুঁকি বাড়ে।",
    robustnessPenalty: 22,
    mapping: [
      { bits: "0000…1111", signal: "১৬টি I/Q অবস্থা" },
      { bits: "প্রতি symbol", signal: "৪ bit একসঙ্গে" },
    ],
  },
};

const CHANNELS: Record<ChannelKind, { label: string; note: string }> = {
  phone: { label: "টেলিফোন লাইন", note: "সীমিত voice-band; পুরোনো dial-up/DSL ধারণা বোঝার জন্য ভালো।" },
  cable: { label: "কেবল TV coax", note: "Cable modem RF carrier-এ QAM ব্যবহার করে অনেক বেশি bandwidth পায়।" },
  radio: { label: "মোবাইল radio", note: "বাতাসে multipath, দূরত্ব ও interference—তাই adaptive modulation দরকার হয়।" },
};

function reducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function hash01(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function groupSymbols(bits: string, size: number): string[] {
  const padded = bits.padEnd(Math.ceil(bits.length / size) * size, "0");
  return Array.from({ length: padded.length / size }, (_, index) => padded.slice(index * size, index * size + size));
}

function symbolWave(symbol: string, scheme: ModulationScheme, localT: number, globalIndex: number) {
  const baseCycles = 1.55;
  if (scheme === "ask") {
    const amp = symbol === "1" ? 1 : 0.28;
    return amp * Math.sin(globalIndex * Math.PI * 2 * baseCycles + localT * Math.PI * 2 * baseCycles);
  }
  if (scheme === "fsk") {
    const cycles = symbol === "1" ? 2.55 : 1.1;
    return Math.sin(localT * Math.PI * 2 * cycles + globalIndex * 0.65);
  }
  if (scheme === "psk") {
    const phase = symbol === "1" ? 0 : Math.PI;
    return Math.sin(localT * Math.PI * 2 * baseCycles + phase);
  }
  if (scheme === "qpsk") {
    const phases: Record<string, number> = { "11": Math.PI / 4, "01": (3 * Math.PI) / 4, "00": (5 * Math.PI) / 4, "10": (7 * Math.PI) / 4 };
    return Math.sin(localT * Math.PI * 2 * baseCycles + (phases[symbol] ?? 0));
  }
  const levels = [-1, -0.33, 0.33, 1];
  const i = levels[parseInt(symbol.slice(0, 2), 2)] ?? 0.33;
  const q = levels[parseInt(symbol.slice(2, 4), 2)] ?? 0.33;
  const amplitude = Math.min(1.12, Math.hypot(i, q));
  const phase = Math.atan2(q, i);
  return amplitude * Math.sin(localT * Math.PI * 2 * baseCycles + phase);
}

function makeWavePath(
  symbols: string[],
  scheme: ModulationScheme,
  x0: number,
  width: number,
  centerY: number,
  amplitude: number,
  options: { attenuation?: number; noise?: number; seedOffset?: number } = {},
) {
  const samplesPerSymbol = 34;
  const totalSamples = Math.max(2, symbols.length * samplesPerSymbol);
  const points: string[] = [];
  for (let sample = 0; sample <= totalSamples; sample += 1) {
    const symbolFloat = (sample / totalSamples) * symbols.length;
    const symbolIndex = Math.min(symbols.length - 1, Math.floor(symbolFloat));
    const localT = symbolFloat - symbolIndex;
    const clean = symbolWave(symbols[symbolIndex], scheme, localT, symbolIndex);
    const attenuationFactor = 1 - (options.attenuation ?? 0) / 145;
    const noisy = (options.noise ?? 0) > 0 ? (hash01(sample * 3 + (options.seedOffset ?? 0)) - 0.5) * 2 * ((options.noise ?? 0) / 100) * 0.62 : 0;
    const x = x0 + (sample / totalSamples) * width;
    const y = centerY - (clean * attenuationFactor + noisy) * amplitude;
    points.push(`${sample === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function digitalPath(bits: string, x0: number, width: number, centerY: number, amplitude: number) {
  if (!bits.length) return "";
  const step = width / bits.length;
  let path = `M ${x0} ${bits[0] === "1" ? centerY - amplitude : centerY + amplitude}`;
  bits.split("").forEach((bit, index) => {
    const y = bit === "1" ? centerY - amplitude : centerY + amplitude;
    const xStart = x0 + index * step;
    const xEnd = x0 + (index + 1) * step;
    path += ` L ${xStart} ${y} L ${xEnd} ${y}`;
  });
  return path;
}

export function ModemSimulation() {
  const reduced = useMemo(reducedMotion, []);
  const [bits, setBits] = useState("1011001011010010");
  const [scheme, setScheme] = useState<ModulationScheme>("psk");
  const [channel, setChannel] = useState<ChannelKind>("phone");
  const [noise, setNoise] = useState(16);
  const [attenuation, setAttenuation] = useState(18);
  const [reversed, setReversed] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const progressRef = useRef(0);

  const schemeInfo = SCHEMES[scheme];
  const symbols = useMemo(() => groupSymbols(bits || "0", schemeInfo.bitsPerSymbol), [bits, schemeInfo.bitsPerSymbol]);
  const done = started && symbolIndex >= symbols.length;
  const quality = Math.max(4, Math.min(99, 104 - noise * 0.72 - attenuation * 0.48 - schemeInfo.robustnessPenalty - (channel === "radio" ? 7 : 0)));

  const recoveredSymbols = useMemo(
    () =>
      symbols.map((symbol, index) => {
        const roll = hash01(index * 97 + scheme.length * 31 + bits.length * 17);
        if (roll < quality / 100) return symbol;
        const chars = symbol.split("");
        const flipAt = Math.floor(hash01(index * 57 + 9) * chars.length);
        chars[flipAt] = chars[flipAt] === "1" ? "0" : "1";
        return chars.join("");
      }),
    [bits.length, quality, scheme, symbols],
  );
  const recoveredBits = recoveredSymbols.join("").slice(0, bits.length);
  const revealedBitCount = done ? bits.length : Math.min(bits.length, symbolIndex * schemeInfo.bitsPerSymbol);
  const errorCount = bits.split("").filter((bit, index) => recoveredBits[index] !== bit).length;

  const reset = useCallback(() => {
    setSymbolIndex(0);
    progressRef.current = reduced ? 1 : 0;
    setProgress(progressRef.current);
    setPlaying(false);
    setStarted(false);
  }, [reduced]);

  const advanceSymbol = useCallback(() => {
    setSymbolIndex((value) => {
      const next = Math.min(symbols.length, value + 1);
      if (next >= symbols.length) setPlaying(false);
      return next;
    });
    progressRef.current = reduced ? 1 : 0;
    setProgress(progressRef.current);
  }, [reduced, symbols.length]);

  const advanceRef = useRef(advanceSymbol);
  advanceRef.current = advanceSymbol;

  useEffect(() => {
    if (!playing || !started || done) return;
    let frame = 0;
    let last = performance.now();
    const duration = 980 / speed;
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
  }, [done, playing, speed, started, symbolIndex]);

  const start = () => {
    setStarted(true);
    setSymbolIndex(0);
    progressRef.current = reduced ? 1 : 0;
    setProgress(progressRef.current);
    setPlaying(!reduced);
  };

  const nextSymbol = () => {
    if (!started) {
      setStarted(true);
      progressRef.current = 1;
      setProgress(1);
      return;
    }
    if (done) return;
    if (progressRef.current < 1) {
      progressRef.current = 1;
      setProgress(1);
      return;
    }
    advanceSymbol();
  };

  const updateBits = (value: string) => {
    const cleaned = value.replace(/[^01]/g, "").slice(0, 24);
    setBits(cleaned);
    reset();
  };

  const sender = reversed ? "ডিভাইস B" : "ডিভাইস A";
  const receiver = reversed ? "ডিভাইস A" : "ডিভাইস B";
  const currentSymbol = symbols[Math.min(symbolIndex, symbols.length - 1)] ?? "";
  const playheadX = 150 + ((Math.min(symbolIndex, symbols.length - 1) + (done ? 1 : progress)) / symbols.length) * 800;

  const status = !started
    ? {
        title: "Modulator তৈরি: bit-কে carrier wave-এর পরিবর্তনে বদলাবে",
        body: `এবারের পদ্ধতি ${schemeInfo.label}। Modulator ${schemeInfo.change} বদলে প্রতিটি symbol এনকোড করবে; অন্য প্রান্তের Demodulator সেই পরিবর্তন মেপে আবার bit বের করবে।`,
      }
    : done
      ? {
          title: errorCount ? `Demodulation শেষ—${errorCount}টি bit ভুল এসেছে` : "Demodulation শেষ—সব bit ঠিক ফিরেছে",
          body: errorCount
            ? "Noise/attenuation বেশি হওয়ায় কয়েকটি symbol কাছের ভুল অবস্থা হিসেবে ধরা পড়েছে। বাস্তব modem error-correction (FEC), equalizer ও প্রয়োজনে ধীর কিন্তু শক্ত modulation-এ নেমে এসে এই ভুল সামলায়।"
            : "প্রাপ্ত wave থেকে Demodulator প্রতিটি symbol-এর amplitude/frequency/phase মেপে আসল bit pattern ফিরিয়ে এনেছে। Noise স্লাইডার বাড়িয়ে আবার চালিয়ে দেখো কখন ভুল শুরু হয়।",
        }
      : {
          title: `Symbol ${symbolIndex + 1}/${symbols.length}: “${currentSymbol}” wave-এ যাচ্ছে`,
          body: `${sender}-এর modem এখন modulator হিসেবে কাজ করছে। “${currentSymbol}” bit-এর জন্য carrier-এর ${schemeInfo.change} নির্দিষ্ট অবস্থায় বদলেছে; ${receiver}-এর modem একই যন্ত্রের demodulator অংশ দিয়ে সেটি মাপছে।`,
        };

  const chain = [
    { icon: MonitorSmartphone, title: sender, sub: "Digital bits", active: !started || symbolIndex === 0 },
    { icon: AudioWaveform, title: "MODULATOR", sub: "bit → carrier বদল", active: started && !done },
    { icon: channel === "radio" ? Radio : Cable, title: CHANNELS[channel].label, sub: "analog/RF channel", active: started && !done },
    { icon: Binary, title: "DEMODULATOR", sub: "carrier মেপে bit", active: started },
    { icon: MonitorSmartphone, title: receiver, sub: "Recovered bits", active: done },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5" aria-label="Modulator থেকে demodulator পর্যন্ত ডাটার পথ">
        {chain.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={`${item.title}-${index}`} className={cn("relative rounded-2xl border p-3.5", item.active ? "border-signal/50 bg-signal/[0.08]" : "border-white/10 bg-white/[0.02]")}>
              <Icon size={19} className={item.active ? "text-signal" : "text-faint"} />
              <p className="bangla mt-2.5 text-[12px] font-semibold leading-snug text-white">{item.title}</p>
              <p className="bangla mt-1 text-[10px] leading-snug text-faint">{item.sub}</p>
              {index < chain.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-signal sm:block">→</span>}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/12 bg-[#070d18] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-signal">MODEM = MODULATOR + DEMODULATOR</p>
            <h3 className="bangla mt-1.5 text-[17px] font-semibold text-white">Bit → ঢেউ → আবার Bit</h3>
            <p className="bangla mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
              Modulation scheme, channel, noise ও signal ক্ষয় বদলে দেখো কোন পদ্ধতিতে কত bit একসঙ্গে যায়
              এবং কখন Demodulator ভুল করতে শুরু করে।
            </p>
          </div>
          <Button
            onClick={() => {
              setReversed((value) => !value);
              reset();
            }}
            icon={<ArrowLeftRight size={14} />}
          >
            দিক বদলাও: {sender} → {receiver}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr]">
          <label className="bangla block text-[12px] text-muted" htmlFor="modem-bits">
            পাঠানোর bit pattern (শুধু 0/1, সর্বোচ্চ ২৪টি)
            <input
              id="modem-bits"
              value={bits}
              onChange={(e) => updateBits(e.target.value)}
              inputMode="numeric"
              className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#0b1526] px-3 py-2.5 font-mono text-[13px] tracking-[0.12em] text-cyan-100 outline-none focus:border-signal/70"
              aria-describedby="modem-bits-help"
            />
            <span id="modem-bits-help" className="mt-1 block text-[10.5px] text-faint">প্রিসেট: </span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {[
                { label: "Hi এর bits", value: "0100100001101001" },
                { label: "1011 প্যাটার্ন", value: "1011001011010010" },
                { label: "OK এর bits", value: "0100111101001011" },
              ].map((preset) => (
                <button key={preset.label} type="button" onClick={() => updateBits(preset.value)} className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] text-muted hover:border-signal/50 hover:text-signal">
                  {preset.label}
                </button>
              ))}
            </span>
          </label>
          <ChoiceGroup
            label="Modulation পদ্ধতি"
            value={scheme}
            onChange={(value) => {
              setScheme(value as ModulationScheme);
              reset();
            }}
            options={Object.entries(SCHEMES).map(([id, item]) => ({ id, label: item.label }))}
            size="sm"
          />
          <ChoiceGroup
            label="Channel"
            value={channel}
            onChange={(value) => {
              setChannel(value as ChannelKind);
              reset();
            }}
            options={Object.entries(CHANNELS).map(([id, item]) => ({ id, label: item.label, hint: item.note }))}
            size="sm"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="bangla block text-[12px] text-muted" htmlFor="modem-noise">
            Channel noise / interference: <strong className="text-white">{noise}%</strong>
            <input id="modem-noise" type="range" min={0} max={80} step={2} value={noise} onChange={(e) => { setNoise(Number(e.target.value)); reset(); }} className="mt-2 w-full accent-[#f87171]" />
          </label>
          <label className="bangla block text-[12px] text-muted" htmlFor="modem-attenuation">
            Signal ক্ষয় (attenuation): <strong className="text-white">{attenuation}%</strong>
            <input id="modem-attenuation" type="range" min={0} max={75} step={3} value={attenuation} onChange={(e) => { setAttenuation(Number(e.target.value)); reset(); }} className="mt-2 w-full accent-[#fbbf24]" />
          </label>
          <ChoiceGroup label="গতি" value={String(speed)} onChange={(v) => setSpeed(Number(v))} options={[{ id: "0.5", label: "০.৫×" }, { id: "1", label: "১×" }, { id: "2", label: "২×" }]} size="sm" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={start} disabled={started && !done} icon={<Play size={14} />}>Modulation শুরু করো</Button>
          <Button onClick={() => setPlaying((v) => !v)} disabled={!started || done} icon={playing ? <Pause size={14} /> : <Play size={14} />}>{playing ? "থামাও" : "চালু করো"}</Button>
          <Button onClick={nextSymbol} disabled={done} icon={<SkipForward size={14} />}>পরের symbol</Button>
          <Button onClick={reset} icon={<RotateCcw size={14} />}>রিসেট</Button>
        </div>
      </div>

      <figure className="net-figure net-figure--wide" aria-label="Digital bit থেকে modulated wave এবং recovered bit-এর waveform সিমুলেশন">
        <svg viewBox="0 0 1000 500" role="img" aria-labelledby="modem-svg-title modem-svg-desc">
          <title id="modem-svg-title">Modulator digital bit-কে analog carrier wave-এ বদলাচ্ছে</title>
          <desc id="modem-svg-desc">উপরে digital bit waveform, মাঝখানে পরিষ্কার modulated wave, নিচে noise ও attenuation-এর পর প্রাপ্ত wave। হলুদ playhead বর্তমান symbol দেখাচ্ছে।</desc>
          {[
            { y: 86, label: "১ · Digital bits", sub: "কম্পিউটারের ভেতরে" },
            { y: 218, label: "২ · Modulated carrier", sub: `${schemeInfo.label}` },
            { y: 352, label: "৩ · Channel-শেষে প্রাপ্ত wave", sub: `noise ${noise}% · ক্ষয় ${attenuation}%` },
          ].map((row) => (
            <g key={row.label}>
              <text x={24} y={row.y - 30} fontSize={12} fontWeight={700} fill="#e9effc">{row.label}</text>
              <text x={24} y={row.y - 14} fontSize={9.5} fill="#697b98">{row.sub}</text>
              <line x1={150} y1={row.y} x2={950} y2={row.y} stroke="#2c425f" strokeDasharray="3 6" />
            </g>
          ))}

          {symbols.map((_, index) => {
            const x = 150 + (index / symbols.length) * 800;
            return <line key={index} x1={x} y1={48} x2={x} y2={392} stroke="#223856" strokeWidth={0.8} opacity={0.65} />;
          })}
          <line x1={950} y1={48} x2={950} y2={392} stroke="#223856" strokeWidth={0.8} />

          <path d={digitalPath(bits, 150, 800, 86, 27)} fill="none" stroke="#3ddbd9" strokeWidth={2.4} />
          <path d={makeWavePath(symbols, scheme, 150, 800, 218, 43)} fill="none" stroke="#a78bfa" strokeWidth={2.3} />
          <path
            d={makeWavePath(symbols, scheme, 150, 800, 352, 43, { attenuation, noise, seedOffset: 71 })}
            fill="none"
            stroke={quality < 55 ? "#f87171" : "#fbbf24"}
            strokeWidth={2.1}
            opacity={0.94}
          />

          {started && !done && (
            <g pointerEvents="none">
              <line x1={playheadX} y1={42} x2={playheadX} y2={398} stroke="#fbbf24" strokeWidth={2} />
              <rect x={playheadX - 42} y={16} width={84} height={22} rx={11} fill="#231806" stroke="#fbbf24" />
              <text x={playheadX} y={31} textAnchor="middle" className="net-mono" fontSize={8} fill="#fde68a">SYMBOL {symbolIndex + 1}</text>
            </g>
          )}

          {symbols.map((symbol, index) => {
            const x = 150 + ((index + 0.5) / symbols.length) * 800;
            const active = started && index === symbolIndex && !done;
            return (
              <g key={`${symbol}-${index}`}>
                <rect x={x - Math.max(18, symbol.length * 8)} y={416} width={Math.max(36, symbol.length * 16)} height={28} rx={8} fill={active ? "#42320a" : "#0a1730"} stroke={active ? "#fbbf24" : "#2c425f"} />
                <text x={x} y={434} textAnchor="middle" className="net-mono" fontSize={10} fill={active ? "#fde68a" : "#9fb2cf"}>{symbol}</text>
              </g>
            );
          })}
          <text x={150} y={468} fontSize={10.5} fill="#8b9bb9">Symbol grouping: প্রতি ঘরে {schemeInfo.bitsPerSymbol}টি bit · মোট {symbols.length}টি symbol</text>
          <text x={950} y={468} textAnchor="end" className="net-mono" fontSize={8.5} fill="#697b98">TIME →</text>
        </svg>
      </figure>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-4">
          <section id="modem-status" className="rounded-2xl border border-signal/25 bg-signal/[0.055] p-4" aria-live="polite">
            <h4 className="bangla text-[14px] font-semibold text-white">{status.title}</h4>
            <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{status.body}</p>
            <div className="mt-3">
              <div className="bangla flex justify-between text-[10.5px] text-faint"><span>আনুমানিক signal quality</span><span>{Math.round(quality)}%</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className={cn("h-full rounded-full", quality >= 70 ? "bg-emerald-400" : quality >= 45 ? "bg-warn" : "bg-[#f87171]")} style={{ width: `${quality}%` }} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.025] p-4" aria-label="আসল ও ফিরে পাওয়া bit তুলনা">
            <h4 className="bangla text-[13.5px] font-semibold text-white">Demodulator যা ফিরিয়ে দিল</h4>
            <div className="mt-3 space-y-3">
              {[
                { label: "পাঠানো bits", values: bits.split(""), compare: false },
                { label: "ফিরে পাওয়া bits", values: bits.split("").map((_, i) => (i < revealedBitCount ? recoveredBits[i] : "?")), compare: true },
              ].map((row) => (
                <div key={row.label}>
                  <p className="bangla font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">{row.label}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {row.values.map((bit, index) => {
                      const wrong = row.compare && index < revealedBitCount && bit !== bits[index];
                      return (
                        <span key={index} className={cn("grid h-8 w-8 place-items-center rounded-lg border font-mono text-[12px]", wrong ? "border-[#f87171]/70 bg-[#f87171]/15 text-[#fca5a5]" : row.compare && index < revealedBitCount ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-[#0a1528] text-ink")}>
                          {bit}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="bangla mt-3 text-[11.5px] text-faint">
              {done ? (errorCount ? `মোট ${errorCount}টি bit error। লাল ঘরগুলোই ভুল।` : "সব bit মিলেছে—কোনো error হয়নি।") : "Symbol এগোনোর সঙ্গে সঙ্গে Demodulator-এর সিদ্ধান্ত একে একে প্রকাশ পাবে।"}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-laser/25 bg-laser/[0.05] p-4" aria-label="বর্তমান modulation mapping">
            <h4 className="bangla text-[13.5px] font-semibold text-white">{schemeInfo.label}: bit থেকে signal</h4>
            <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{schemeInfo.explanation}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {schemeInfo.mapping.map((item) => (
                <div key={`${item.bits}-${item.signal}`} className="rounded-xl border border-white/[0.08] bg-[#071120] px-3 py-2.5">
                  <p className="font-mono text-[12px] text-cyan-100">{item.bits}</p>
                  <p className="bangla mt-1 text-[11px] text-muted">→ {item.signal}</p>
                </div>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "bit / symbol", value: `${schemeInfo.bitsPerSymbol}` },
                { label: "মোট symbol", value: `${symbols.length}` },
                { label: "সম্ভাব্য error", value: `${errorCount}` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-[#071120] px-2 py-2.5">
                  <dd className="text-[17px] font-semibold text-white">{stat.value}</dd>
                  <dt className="bangla mt-1 text-[9.5px] text-faint">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h4 className="bangla text-[13.5px] font-semibold text-white">দুই প্রান্তেই modem থাকে</h4>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              “Modem” একটি যন্ত্রে দুটো কাজ একত্র করে: পাঠানোর সময় modulator, গ্রহণের সময় demodulator।
              তাই {sender} থেকে {receiver}-এ গেলে প্রথম যন্ত্রটি modulate করে; উত্তর ফিরলে ভূমিকা উল্টে যায়।
              দিক বদলানোর বাটনে সেটাই দেখতে পাবে।
            </p>
            <p className="bangla mt-2 text-[12px] leading-relaxed text-faint">
              Channel নোট: {CHANNELS[channel].note}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
