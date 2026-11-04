import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, LockKeyhole, Monitor, Pause, Play, RotateCcw, Server, SkipBack, SkipForward } from "lucide-react";
import { toBn } from "@/lib/format";
import "./protocol-journey.css";

type Step = { layer: string; message: string; description: string; direction: "out" | "in"; secure?: boolean };
const tcp: Step[] = [
  { layer: "TCP · সংযোগ", message: "SYN", description: "ব্রাউজার সার্ভারের কাছে TCP সংযোগ শুরু করার অনুরোধ পাঠায়।", direction: "out" },
  { layer: "TCP · সংযোগ", message: "SYN + ACK", description: "সার্ভার অনুরোধ গ্রহণ করে এবং সংযোগের জন্য প্রস্তুত বলে জানায়।", direction: "in" },
  { layer: "TCP · সংযোগ", message: "ACK", description: "ব্রাউজার নিশ্চিত করে। তিন ধাপের TCP handshake সম্পন্ন।", direction: "out" },
];
const tls: Step[] = [
  { layer: "TLS · handshake", message: "ClientHello", description: "ব্রাউজার TLS সংস্করণ ও key exchange-এর তথ্য পাঠায়।", direction: "out" },
  { layer: "TLS · handshake", message: "ServerHello + certificate", description: "সার্ভার উত্তর দেয় ও সার্টিফিকেট পাঠায়। ব্রাউজার সার্টিফিকেট ও ডোমেইন যাচাই করে।", direction: "in" },
  { layer: "TLS · handshake", message: "Finished", description: "উভয় পক্ষের handshake যাচাই শেষ হলে এনক্রিপ্টেড সংযোগ প্রস্তুত।", direction: "out", secure: true },
];
const http: Step[] = [
  { layer: "HTTP · অনুরোধ", message: "GET /home HTTP/1.1", description: "ব্রাউজার HTTP request পাঠিয়ে /home পেজটি চায়।", direction: "out" },
  { layer: "HTTP · উত্তর", message: "HTTP/1.1 200 OK", description: "সার্ভার সফল response ও পেজের ডেটা পাঠায়। ব্রাউজার পেজ দেখাতে পারে।", direction: "in" },
  { layer: "TCP · সংযোগ বন্ধ", message: "FIN / ACK", description: "কাজ শেষে দুই প্রান্ত সংযোগ বন্ধ করতে পারে। বাস্তবে সংযোগ পুনরায় ব্যবহারও হতে পারে।", direction: "out" },
];

export function ProtocolJourney() {
  const [mode, setMode] = useState<"http" | "https">("http");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const steps = mode === "https" ? [...tcp, ...tls, ...http.map((step) => ({ ...step, secure: step.layer.startsWith("HTTP") }))] : [...tcp, ...http];
  const step = steps[index];
  const duration = 3000 / speed;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= steps.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [playing, index, duration, steps.length]);

  function changeMode(next: "http" | "https") { setMode(next); setIndex(0); setPlaying(false); }
  function move(next: number) { setPlaying(false); setIndex(Math.max(0, Math.min(steps.length - 1, next))); }
  function togglePlay() { if (!playing && index === steps.length - 1) setIndex(0); setPlaying(!playing); }

  return (
    <div className="protocol-journey bangla">
      <div className="pj-top">
        <div><div className="pj-eyebrow"><span className="pj-live" /> INTERACTIVE NETWORK JOURNEY</div><h3>একটি সংযোগের গল্প</h3><p>ব্রাউজার থেকে সার্ভার — প্রতিটি বার্তার যাত্রা দেখো</p></div>
        <div className="pj-switch" aria-label="প্রোটোকল বেছে নাও">
          <button type="button" aria-pressed={mode === "http"} onClick={() => changeMode("http")}>HTTP <span>:80</span></button>
          <button type="button" aria-pressed={mode === "https"} onClick={() => changeMode("https")}><LockKeyhole size={13} /> HTTPS <span>:443</span></button>
        </div>
      </div>
      <div className="pj-address"><Globe size={15} /><span>{mode}://example.com/home</span><span className={mode === "https" ? "pj-secure" : "pj-open"}>{mode === "https" ? "TLS সুরক্ষিত" : "এনক্রিপশন নেই"}</span></div>
      <div className="pj-diagram">
        <div className="pj-endpoints"><div><span className="pj-icon"><Monitor size={21} /></span><span><strong>Client</strong><small>তোমার ব্রাউজার</small></span></div><span className="pj-middle">NETWORK</span><div><span className="pj-icon server"><Server size={21} /></span><span><strong>Server</strong><small>example.com</small></span></div></div>
        <div className="pj-timeline">
          {steps.map((item, i) => <button type="button" key={`${item.message}-${i}`} className={`pj-row ${i === index ? "active" : ""} ${i < index ? "done" : ""} ${item.direction}`} onClick={() => move(i)} aria-current={i === index ? "step" : undefined} aria-label={`ধাপ ${toBn(i + 1)}: ${item.message}`}>
            <span className="pj-row-number">{String(i + 1).padStart(2, "0")}</span><span className="pj-line"><span className="pj-track" /><span className="pj-message"><span>{item.layer}</span><strong>{item.secure && <LockKeyhole size={11} />}{item.message}</strong></span>{i === index && <span key={`${mode}-${index}`} className="pj-packet moving" style={{ animationDuration: `${duration * 0.75}ms`, animationPlayState: playing ? "running" : "paused" }} />}{item.direction === "out" ? <ArrowRight className="pj-arrow" size={15} /> : <ArrowLeft className="pj-arrow" size={15} />}</span>
          </button>)}
        </div>
      </div>
      <div className="pj-detail" aria-live="polite"><span className="pj-detail-number">{String(index + 1).padStart(2, "0")}</span><div><div className="pj-detail-label">{step.layer} <span> · ধাপ {toBn(index + 1)} / {toBn(steps.length)}</span></div><p>{step.description}</p></div></div>
      <div className="pj-controls"><div className="pj-buttons"><button type="button" className="pj-play" onClick={togglePlay}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "বিরতি" : index === steps.length - 1 ? "আবার চালাও" : "চালাও"}</button><button type="button" onClick={() => move(index - 1)} disabled={index === 0} aria-label="আগের ধাপ"><SkipBack size={16} /></button><button type="button" onClick={() => move(index + 1)} disabled={index === steps.length - 1} aria-label="পরের ধাপ"><SkipForward size={16} /></button><button type="button" onClick={() => move(0)} aria-label="শুরুতে ফিরে যাও"><RotateCcw size={15} /></button></div><label>গতি <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.5}>ধীরে</option><option value={1}>স্বাভাবিক</option><option value={2}>দ্রুত</option></select></label></div>
      <p className="pj-footnote">শিক্ষামূলক সিমুলেশন · HTTP/1.1 over TCP ও TLS 1.3-এর সরলীকৃত ধাপ। বাস্তবে বার্তা একসঙ্গে পাঠানো হতে পারে; HTTP/3 ভিন্ন পরিবহন ব্যবহার করে।</p>
    </div>
  );
}
